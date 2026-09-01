"use client"

import JupiterLogo from "@/components/brand/JupiterLogo"
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type JupiterNoticeTone = "default" | "danger" | "success" | "warning"

type JupiterNoticeOptions = {
  title?: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: JupiterNoticeTone
  defaultValue?: string
  placeholder?: string
}

type NoticeRequest = JupiterNoticeOptions & {
  id: number
  kind: "alert" | "confirm" | "prompt"
  resolve: (value: boolean | string | null) => void
}

type JupiterNoticeApi = {
  alert: (options: string | JupiterNoticeOptions) => Promise<void>
  confirm: (options: string | JupiterNoticeOptions) => Promise<boolean>
  prompt: (options: string | JupiterNoticeOptions) => Promise<string | null>
}

const JupiterNoticeContext = createContext<JupiterNoticeApi | null>(null)

function normalizeOptions(options: string | JupiterNoticeOptions): JupiterNoticeOptions {
  return typeof options === "string" ? { message: options } : options
}

function splitMessage(options: JupiterNoticeOptions): JupiterNoticeOptions {
  if (options.detail || !options.message.includes("\n")) return options
  const [message, ...detail] = options.message.split(/\n+/).filter(Boolean)
  return { ...options, message, detail: detail.join(" ") || undefined }
}

export function JupiterNotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<NoticeRequest[]>([])
  const [inputValues, setInputValues] = useState<Record<number, string>>({})
  const nextId = useRef(0)
  const current = queue[0] ?? null

  const enqueue = useCallback(
    (kind: NoticeRequest["kind"], options: string | JupiterNoticeOptions) =>
      new Promise<boolean | string | null>((resolve) => {
        const normalized = splitMessage(normalizeOptions(options))
        setQueue((existing) => [
          ...existing,
          { ...normalized, id: ++nextId.current, kind, resolve },
        ])
      }),
    [],
  )

  const closeCurrent = useCallback(
    (value: boolean | string | null) => {
      setQueue((existing) => {
        const [active, ...rest] = existing
        active?.resolve(value)
        return rest
      })
    },
    [],
  )

  useEffect(() => {
    if (!current) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeCurrent(current.kind === "confirm" ? false : null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeCurrent, current])

  const api = useMemo<JupiterNoticeApi>(
    () => ({
      alert: async (options) => {
        await enqueue("alert", options)
      },
      confirm: async (options) => (await enqueue("confirm", options)) === true,
      prompt: async (options) => {
        const result = await enqueue("prompt", options)
        return typeof result === "string" ? result : null
      },
    }),
    [enqueue],
  )

  const tone = current?.tone ?? "default"
  const isDanger = tone === "danger"
  const isSuccess = tone === "success"
  const isWarning = tone === "warning"
  const inputValue = current ? (inputValues[current.id] ?? current.defaultValue ?? "") : ""
  const title = current?.title ?? (current?.kind === "prompt" ? "Jupiter input" : current?.kind === "confirm" ? "Confirm action" : "Jupiter notice")

  return (
    <JupiterNoticeContext.Provider value={api}>
      {children}
      {current ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#01040b]/78 p-5 backdrop-blur-md" role="presentation">
          <div
            role={current.kind === "alert" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="jupiter-notice-title"
            aria-describedby="jupiter-notice-message"
            className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-white/[0.12] bg-[radial-gradient(circle_at_82%_0%,rgba(79,70,229,0.24),transparent_42%),linear-gradient(155deg,rgba(12,22,39,0.995),rgba(3,7,15,0.998))] shadow-[0_38px_120px_rgba(0,0,0,0.78),0_0_60px_rgba(59,130,246,0.10),inset_0_1px_0_rgba(255,255,255,0.055)]"
          >
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isDanger ? "via-red-300/80" : isWarning ? "via-amber-300/75" : isSuccess ? "via-emerald-300/75" : "via-blue-300/80"} to-transparent`} />
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-blue-300/[0.08] shadow-[0_0_80px_rgba(59,130,246,0.10)]" />

            <header className="flex items-center justify-between border-b border-white/[0.075] px-6 py-4">
              <JupiterLogo className="text-white" markClassName="h-7 w-7" wordmarkClassName="text-[11px] font-bold tracking-[0.22em]" />
              <button
                type="button"
                onClick={() => closeCurrent(current.kind === "confirm" ? false : null)}
                aria-label="Close Jupiter notice"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/42 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                <X size={16} />
              </button>
            </header>

            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border ${isDanger ? "border-red-300/20 bg-red-400/[0.11] text-red-200" : isWarning ? "border-amber-300/20 bg-amber-400/[0.10] text-amber-200" : isSuccess ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-200" : "border-blue-300/20 bg-blue-400/[0.10] text-blue-200"}`}>
                  {isDanger || isWarning ? <AlertTriangle size={21} /> : isSuccess ? <CheckCircle2 size={21} /> : current.kind === "prompt" ? <Sparkles size={20} /> : <Info size={21} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-200/45">Jupiter Mission Control</div>
                  <h2 id="jupiter-notice-title" className="mt-1.5 text-[24px] font-semibold tracking-[-0.035em] text-white/95">{title}</h2>
                  <p id="jupiter-notice-message" className="mt-2 text-[14px] leading-6 text-white/64">{current.message}</p>
                  {current.detail ? <p className="mt-2 text-[12px] leading-5 text-white/38">{current.detail}</p> : null}
                </div>
              </div>

              {current.kind === "prompt" ? (
                <input
                  autoFocus
                  value={inputValue}
                  placeholder={current.placeholder}
                  onChange={(event) => {
                    const value = event.target.value
                    setInputValues((existing) => ({ ...existing, [current.id]: value }))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      closeCurrent(inputValue)
                    }
                  }}
                  className="mt-5 h-12 w-full rounded-[13px] border border-blue-300/20 bg-black/25 px-4 text-[14px] text-white outline-none transition placeholder:text-white/22 focus:border-blue-300/55 focus:ring-4 focus:ring-blue-400/10"
                />
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-white/[0.075] bg-black/10 px-6 py-4">
              {current.kind !== "alert" ? (
                <button
                  type="button"
                  onClick={() => closeCurrent(current.kind === "confirm" ? false : null)}
                  className="min-w-[104px] rounded-[11px] border border-white/[0.10] bg-white/[0.025] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.11em] text-white/58 transition hover:bg-white/[0.06] hover:text-white/86"
                >
                  {current.cancelLabel ?? "Cancel"}
                </button>
              ) : null}
              <button
                type="button"
                autoFocus={current.kind !== "prompt"}
                onClick={() => closeCurrent(current.kind === "prompt" ? inputValue : true)}
                className={`min-w-[132px] rounded-[11px] border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.11em] transition ${isDanger ? "border-red-300/35 bg-red-500/18 text-red-100 hover:bg-red-500/28" : isSuccess ? "border-emerald-300/30 bg-emerald-400/16 text-emerald-100 hover:bg-emerald-400/24" : "border-blue-300/35 bg-blue-500/22 text-blue-50 shadow-[0_0_28px_rgba(59,130,246,0.12)] hover:bg-blue-500/32"}`}
              >
                {current.confirmLabel ?? (current.kind === "alert" ? "Got it" : current.kind === "prompt" ? "Continue" : "Confirm")}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </JupiterNoticeContext.Provider>
  )
}

export function useJupiterNotice(): JupiterNoticeApi {
  const context = useContext(JupiterNoticeContext)
  if (!context) throw new Error("useJupiterNotice must be used within JupiterNotificationProvider")
  return context
}
