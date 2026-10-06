# Jupiter Send for Mac - 0.1.0 prototype

Apple Silicon, macOS 15 or newer. A native SwiftUI app with a bundled FFmpeg encoder, camera/capture-device and audio selection, local picture preview, RMS meter, frozen in-memory snapshot, software H.264 or VideoToolbox and encrypted SRT output. No browser camera selection or recording implementation. It sends a program to Jupiter Io; it is not a Zoom meeting client and does not configure AWS firewall rules.

## Use

1. Quit OBS capture or stop its stream before moving the same capture device to Jupiter Send. Avoid two encoders fighting over the device or receiver.
2. Connect the ATEM/capture and audio device. Open Jupiter Send; select sources and a supported 1080p or 720p capture format.
3. Start local preview. Grant macOS camera/microphone permission yourself. Refresh devices if necessary. Observe picture and meter; local preview does not send program images to cloud services.
4. In Jupiter Io, start receiving and Copy connection. Paste into the secure connection field. Optionally Save in Keychain. The app does not save the SRT URL in plain-text preferences.
5. Confirm the Mac's public IP is allowed in the Lightsail UDP ingest firewall. Click Send to Jupiter Io. Moving from preview to sending briefly restarts capture.
6. Confirm receiving status in Jupiter Io and actual picture/audio in destination Zoom. A running encoder process is not proof that Zoom attendees see the program.
7. Stop before exiting or switching devices. Freezing a local snapshot holds one NSImage in memory and neither saves nor uploads it.

The sender currently requires manual restart after a failed connection. It does not automatically control satellite profiles. Capture resolution/fps must be supported by the physical device. Device names/indexes may change when devices are connected; refresh and reselect. The 'device name' field is a local label and does not rename a satellite.

## Build

`FFMPEG_BINARY=/path/to/ffmpeg ./build.sh`

The bundled binary for the local prototype comes from npm `ffmpeg-for-homebridge@2.2.2` (Homebridge project) and must support avfoundation, SRT, AAC, MJPEG and h264_videotoolbox. Build creates `dist/Jupiter Send.app`. FFmpeg is GPL software; review its license and corresponding-source obligations before redistributing this binary to customers. Keep the original dependency provenance and notices. Public distribution also requires an Apple Developer ID signature and notarization; the prototype uses local ad-hoc signing only.

## Storage and privacy

Camera/audio permissions are required. Capture, encoded data, preview JPEG buffers and frozen frames are in memory. FFmpeg uses pipes and `/dev/null`, without a recording file output. Optional SRT URL is stored in the macOS Keychain; pasted data also exists in the clipboard. FFmpeg receives the connection as a process argument, so local process inspection/crash tooling must be considered. Diagnostics are parsed in memory for meter values and discarded, not written by this app. macOS/provider diagnostics are outside this app's retention guarantees.

## Validation boundary

Compiled on Apple Silicon; encoder capability and synthetic SRT transport checks performed. Physical capture and live end-to-end sending require operator permission, a free capture device, and an open destination. This prototype is not notarized or a hardened production release.
