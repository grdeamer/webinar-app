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
      <div className="absolute left-[-10%] top-[-18%] h-[520px] w-[520px] rounded-full bg-sky-300/18 blur-3xl animate-[producerShellDriftA_18s_ease-in-out_infinite]" />

      <div className="absolute right-[-12%] top-[8%] h-[520px] w-[520px] rounded-full bg-indigo-300/14 blur-3xl animate-[producerShellDriftB_22s_ease-in-out_infinite]" />

      <div className="absolute bottom-[-20%] left-[30%] h-[620px] w-[620px] rounded-full bg-amber-200/9 blur-3xl animate-[producerShellBloom_14s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_46%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.028)_42%,transparent_62%)] animate-[producerShellTransmission_10s_ease-in-out_infinite]" />

      <div className="absolute inset-0 opacity-[0.065] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.024)_0px,rgba(255,255,255,0.024)_1px,transparent_1px,transparent_8px)]" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-sky-100/16 to-transparent" />

      <style jsx global>{`
        @keyframes producerShellDriftA {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(38px, 24px, 0) scale(1.06);
          }
        }

        @keyframes producerShellDriftB {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-42px, 18px, 0) scale(1.08);
          }
        }

        @keyframes producerShellBloom {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }

          50% {
            opacity: 0.92;
            transform: scale(1.08);
          }
        }

        @keyframes producerShellTransmission {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          45% {
            opacity: 0.75;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}

export function ProducerRoomContentStack({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      {children}
    </div>
  )
}

export function ProducerRoomWorkspaceFrame({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.18),transparent_38%),radial-gradient(circle_at_100%_20%,rgba(196,181,253,0.13),transparent_36%),linear-gradient(180deg,rgba(14,24,48,0.98),rgba(7,13,29,1))] px-3 py-3 md:px-4 xl:px-5 xl:py-4 2xl:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,0.12)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.024)_0px,rgba(255,255,255,0.024)_1px,transparent_1px,transparent_28px)]" />
      {children}
    </div>
  )
}

export function ProducerRoomGrid({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="relative grid w-full items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)_320px] xl:grid-cols-[265px_minmax(0,1fr)_345px] 2xl:grid-cols-[285px_minmax(0,1fr)_375px] [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-0.5 [&_button:active]:translate-y-0">
      <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/[0.075] shadow-[0_28px_90px_rgba(0,0,0,0.16)]" />
      {children}
    </div>
  )
}

export function ProducerRoomCenterColumn({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return <div className="min-w-0">{children}</div>
}