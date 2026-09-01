import type { ChangeEvent, JSX, ReactNode, RefObject } from "react"

type ProducerUploadInputsProps = {
  pdfInputRef: RefObject<HTMLInputElement | null>
  videoInputRef: RefObject<HTMLInputElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  onPdfUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onVideoUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void
}

type ProducerRoomLayoutProps = {
  children: ReactNode
}

const PRODUCER_FRAME_BACKGROUND_CLASS =
  "bg-[linear-gradient(180deg,rgba(8,12,28,0.96),rgba(4,6,17,0.99))]"

const PRODUCER_FRAME_TOP_EDGE_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent"

const PRODUCER_FRAME_BOTTOM_EDGE_CLASS =
  "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-100/[0.022] to-transparent"

const PRODUCER_BUTTON_MOTION_SCOPE_CLASS =
  "[&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-px [&_button:active]:translate-y-0"

export function ProducerUploadInputs({
  pdfInputRef,
  videoInputRef,
  imageInputRef,
  onPdfUpload,
  onVideoUpload,
  onImageUpload,
}: ProducerUploadInputsProps): JSX.Element {
  return (
    <>
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onPdfUpload}
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onVideoUpload}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageUpload}
      />
    </>
  )
}

export function ProducerRoomBackground(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#06101e_0%,#050b16_42%,#030711_100%)]" />
      <div className="absolute inset-x-[18%] top-[-18%] h-[360px] rounded-full bg-blue-500/[0.07] blur-[110px]" />
      <div className="absolute right-[-10%] top-[8%] h-[420px] w-[420px] rounded-full bg-indigo-500/[0.035] blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.012),transparent_28%,transparent_72%,rgba(95,131,201,0.016))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export function ProducerRoomContentStack({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="producer-room-shell producer-room--cms relative z-10 flex h-[100dvh] min-h-0 flex-col overflow-hidden p-0 font-[var(--font-instrument),var(--font-sans),sans-serif]">
      {children}
    </div>
  )
}

export function ProducerRoomWorkspaceFrame({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div
      className={`producer-workspace-frame relative m-3 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-white/[0.07] px-0 pb-0 pt-0 shadow-[0_18px_52px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.025)] ${PRODUCER_FRAME_BACKGROUND_CLASS}`}
    >
      <div className={PRODUCER_FRAME_TOP_EDGE_CLASS} />
      <div className={PRODUCER_FRAME_BOTTOM_EDGE_CLASS} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function ProducerRoomGrid({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-1 overflow-hidden ${PRODUCER_BUTTON_MOTION_SCOPE_CLASS}`}
    >
      {children}
    </div>
  )
}

export function ProducerRoomCenterColumn({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-stretch overflow-hidden">
      {children}
    </div>
  )
}
