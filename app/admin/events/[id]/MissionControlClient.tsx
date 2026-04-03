"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

type LiveStateLike = {
  mode?: string | null
  destination_type?: string | null
  destination_session_id?: string | null
  transition_type?: string | null
  transition_duration_ms?: number | null
}

export default function MissionControlClient({
  liveState,
  goGeneralSession,
  goOffAir,
}: {
  liveState: LiveStateLike | null
  goGeneralSession: (formData: FormData) => Promise<void>
  goOffAir: (formData: FormData) => Promise<void>
}) {
  const [generalOpen, setGeneralOpen] = useState(false)
  const [offAirOpen, setOffAirOpen] = useState(false)

  const [generalDuration, setGeneralDuration] = useState(3000)
  const [offAirDuration, setOffAirDuration] = useState(2600)

  return (
    <div className="space-y-6 p-6 text-white">
      <h1 className="text-2xl font-bold">Mission Control</h1>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/50">Current Mode</div>
        <div className="text-lg font-semibold">{liveState?.mode || "Not set"}</div>

        {liveState?.destination_type ? (
          <div className="mt-2 text-sm text-white/60">
            Destination: {liveState.destination_type}
          </div>
        ) : null}

        {liveState?.destination_session_id ? (
          <div className="mt-1 text-sm text-white/60">
            Session ID: {liveState.destination_session_id}
          </div>
        ) : null}

        {liveState?.transition_type ? (
          <div className="mt-1 text-sm text-white/60">
            Transition: {liveState.transition_type}
          </div>
        ) : null}

        {typeof liveState?.transition_duration_ms === "number" ? (
          <div className="mt-1 text-sm text-white/60">
            Duration: {liveState.transition_duration_ms}ms
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Dialog open={generalOpen} onOpenChange={setGeneralOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-500">
              Go General Session
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>General Session Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Configure the audience transition before sending everyone to the keynote.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                await goGeneralSession(formData)
                setGeneralOpen(false)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  defaultValue="fade"
                >
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="zoom">Zoom</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{generalDuration}ms</span>
                </div>

                <Slider
                  value={[generalDuration]}
                  onValueChange={(value) => setGeneralDuration(value[0] ?? 3000)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={generalDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  placeholder="Headline"
                  defaultValue="Now Entering General Session"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  placeholder="Message"
                  defaultValue="The keynote is beginning now."
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setGeneralOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 text-white hover:bg-green-500">
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-3 font-medium opacity-60"
        >
          Send to Session
        </button>

        <button
          type="button"
          className="rounded-xl bg-purple-600 px-4 py-3 font-medium opacity-60"
        >
          Send to Breakout
        </button>

        <Dialog open={offAirOpen} onOpenChange={setOffAirOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-gray-700 px-4 py-3 font-medium text-white hover:bg-gray-600">
              Off Air
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Off Air Transition</DialogTitle>
              <DialogDescription className="text-white/60">
                Configure the transition that returns attendees to the event home page.
              </DialogDescription>
            </DialogHeader>

            <form
              action={async (formData) => {
                await goOffAir(formData)
                setOffAirOpen(false)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm text-white/70">Transition Type</label>
                <select
                  name="transitionType"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  defaultValue="dip_to_black"
                >
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="zoom">Zoom</option>
                  <option value="dip_to_black">Dip to Black</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Duration</span>
                  <span>{offAirDuration}ms</span>
                </div>

                <Slider
                  value={[offAirDuration]}
                  onValueChange={(value) => setOffAirDuration(value[0] ?? 2600)}
                  min={800}
                  max={6000}
                  step={100}
                />

                <input type="hidden" name="transitionDuration" value={offAirDuration} />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Headline</label>
                <input
                  name="headline"
                  placeholder="Headline"
                  defaultValue="We’ll Be Right Back"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  name="message"
                  placeholder="Message"
                  defaultValue="Returning attendees to the event home page."
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setOffAirOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gray-700 text-white hover:bg-gray-600">
                  Apply Transition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
        <pre>{JSON.stringify(liveState, null, 2)}</pre>
      </div>
    </div>
  )
}