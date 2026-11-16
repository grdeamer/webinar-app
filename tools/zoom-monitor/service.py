#!/usr/bin/env python3
"""One receive-only Zoom web client, controlled over a private Unix socket.

Visual returns only: a bounded latest JPEG in memory, no audio capture, recording,
credentials on disk, browser traces, database writes or public listening socket.
"""
import asyncio
import contextlib
import json
import os
from pathlib import Path
import re
import signal
import time

from protocol import MAX_FRAME, MAX_SECONDS, classify, parse_request


def network_total():
    total = 0
    for line in Path('/proc/net/dev').read_text().splitlines()[2:]:
        name, values = line.split(':', 1)
        if name.strip() != 'lo':
            counters = values.split()
            total += int(counters[0]) + int(counters[8])
    return total


class Monitor:
    def __init__(self):
        self.id = None
        self.task = None
        self.state = 'stopped'
        self.frame = None
        self.frame_at = None
        self.deadline = 0
        self.viewer_deadline = 0
        self.lock = asyncio.Lock()

    async def stop(self):
        task, self.task = self.task, None
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        self.frame = None
        self.frame_at = None
        self.state = 'stopped'

    def status(self):
        return {'state': self.state, 'frameAgeMs': None if self.frame_at is None else
                round((time.monotonic() - self.frame_at) * 1000),
                'remainingSeconds': max(0, int(self.deadline - time.monotonic())),
                'recording': False, 'audio': False}

    async def request(self, data):
        async with self.lock:
            if data['action'] == 'start':
                if self.id == data['sessionId']:
                    return self.status()  # Reconnecting never rejoins or extends a deadline.
                if self.task and not self.task.done():
                    return {'error': 'Another monitor is active. Stop it before starting another.'}
                await self.stop()
                self.id = data['sessionId']
                self.deadline = time.monotonic() + MAX_SECONDS
                self.viewer_deadline = time.monotonic() + 30
                self.state = 'starting'
                self.task = asyncio.create_task(self.run(data['target']))
                return self.status()
            if self.id != data['sessionId']:
                return {'error': 'Monitor session is unavailable'}
            if data['action'] == 'stop':
                await self.stop()
            if data['action'] == 'frame':
                self.viewer_deadline = time.monotonic() + 30
                if self.frame_at is None or time.monotonic() - self.frame_at > 5:
                    return {**self.status(), 'error': 'No fresh return frame'}
                return self.frame
            return self.status()

    async def run(self, target):
        browser = None
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as driver:
                # Run as an unprivileged account with Chromium's sandbox enabled.
                browser = await driver.chromium.launch(headless=True, chromium_sandbox=True)
                context = await browser.new_context(viewport={'width': 1280, 'height': 720},
                                                    permissions=[], accept_downloads=False)
                # Deny camera/microphone acquisition, including later permission prompts.
                await context.add_init_script('''
                    if (navigator.mediaDevices) {
                      navigator.mediaDevices.getUserMedia = () => Promise.reject(
                        new DOMException('Receive-only monitor', 'NotAllowedError'));
                      navigator.mediaDevices.getDisplayMedia = () => Promise.reject(
                        new DOMException('Receive-only monitor', 'NotAllowedError'));
                    }
                ''')
                page = await context.new_page()
                page.set_default_timeout(2000)
                await page.goto(target, wait_until='domcontentloaded', timeout=45000)
                self.state = 'joining'
                attempted_join = False
                network_start = network_total()
                while time.monotonic() < min(self.deadline, self.viewer_deadline):
                    transferred = network_total() - network_start
                    if transferred < 0 or transferred > 1_500_000_000:
                        raise ValueError('Monitor traffic bound reached')
                    text = (await page.locator('body').inner_text(timeout=3000))[:30000]
                    leave = await page.get_by_role('button', name=re.compile(r'^Leave(?: Meeting)?$', re.I)).count() > 0
                    self.state = classify(text, leave)
                    # Do not accept terms, solve verification, sign in, or retry rejected joins.
                    if self.state == 'joining' and not attempted_join:
                        name = page.get_by_role('textbox', name=re.compile(r'(your name|display name|name)', re.I))
                        if await name.count() == 1 and await name.is_visible():
                            await name.fill('Jupiter Monitor')
                            join = page.get_by_role('button', name='Join', exact=True)
                            if await join.count() == 1 and await join.is_enabled():
                                await join.click()
                                attempted_join = True
                    picture = await page.screenshot(type='jpeg', quality=55, timeout=5000)
                    if len(picture) > MAX_FRAME:
                        raise ValueError('Return frame exceeds memory bound')
                    self.frame, self.frame_at = picture, time.monotonic()
                    if self.state == 'ended':
                        break
                    await asyncio.sleep(.5)
                if self.state != 'ended':
                    self.state = 'expired'
                await asyncio.wait_for(browser.close(), timeout=5)
                browser = None
        except asyncio.CancelledError:
            raise
        except Exception:
            # Never log exceptions containing meeting URLs, page contents or passcodes.
            self.state = 'failed'
        finally:
            if browser:
                with contextlib.suppress(Exception):
                    await asyncio.wait_for(browser.close(), timeout=5)
            self.frame = None
            self.frame_at = None


async def serve_client(reader, writer, monitor):
    try:
        raw = await asyncio.wait_for(reader.readline(), timeout=5)
        if len(raw) > 4096 or not raw.endswith(b'\n'):
            raise ValueError('Invalid request size')
        request = parse_request(json.loads(raw))
        response = await monitor.request(request)
        if isinstance(response, bytes):
            writer.write(json.dumps({**monitor.status(), 'jpegBytes': len(response)}).encode() + b'\n' + response)
        else:
            writer.write(json.dumps(response).encode() + b'\n')
        await asyncio.wait_for(writer.drain(), timeout=5)
    except Exception:
        writer.write(b'{"error":"Monitor request failed"}\n')
        with contextlib.suppress(Exception):
            await writer.drain()
    finally:
        writer.close()
        with contextlib.suppress(Exception):
            await writer.wait_closed()


async def main():
    os.umask(0o077)
    root = Path('/run/jupiter-zoom-monitor')
    root.mkdir(mode=0o700, exist_ok=True)
    socket = root / 'control.sock'
    if socket.is_symlink():
        raise RuntimeError('Invalid monitor socket')
    socket.unlink(missing_ok=True)
    monitor = Monitor()
    server = await asyncio.start_unix_server(lambda r, w: serve_client(r, w, monitor),
                                            path=socket, limit=8192)
    socket.chmod(0o600)
    stopped = asyncio.Event()
    loop = asyncio.get_running_loop()
    for name in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(name, stopped.set)
    async with server:
        await stopped.wait()
    await monitor.stop()
    socket.unlink(missing_ok=True)


if __name__ == '__main__':
    asyncio.run(main())
