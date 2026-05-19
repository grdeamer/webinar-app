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
      <div className="absolute left-[-10%] top-[-18%] h-[460px] w-[460px] rounded-full bg-sky-200/[0.085] blur-3xl animate-[producerShellDriftA_26s_ease-in-out_infinite]" />

      <div className="absolute right-[-12%] top-[8%] h-[460px] w-[460px] rounded-full bg-indigo-200/[0.07] blur-3xl animate-[producerShellDriftB_30s_ease-in-out_infinite]" />

      <div className="absolute bottom-[-20%] left-[30%] h-[520px] w-[520px] rounded-full bg-amber-100/[0.035] blur-3xl animate-[producerShellBloom_22s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.055),transparent_54%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.008)_42%,transparent_62%)] animate-[producerShellTransmission_22s_ease-in-out_infinite]" />

      <div className="absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.014)_0px,rgba(255,255,255,0.014)_1px,transparent_1px,transparent_10px)]" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />

      <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-sky-100/10 to-transparent" />

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
    <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.09),transparent_42%),radial-gradient(circle_at_100%_20%,rgba(196,181,253,0.065),transparent_40%),linear-gradient(180deg,rgba(30,42,68,0.985),rgba(19,28,50,1))] px-3 py-3 md:px-4 xl:px-4 xl:py-3 2xl:px-5">
      <div className="pointer-events-none absolute inset-0 opacity-[0.012] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.016)_0px,rgba(255,255,255,0.016)_1px,transparent_1px,transparent_28px)]" />
      {children}
    </div>
  )
}

export function ProducerRoomGrid({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="relative grid w-full items-start gap-3 lg:grid-cols-[248px_minmax(0,1fr)_318px] xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[278px_minmax(0,1fr)_368px] [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-px [&_button:active]:translate-y-0">
      <div className="pointer-events-none absolute inset-0 rounded-[30px] border border-white/[0.04] shadow-[0_12px_34px_rgba(0,0,0,0.06)]" />
      {children}
    </div>
  )
}

export function ProducerRoomCenterColumn({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return <div className="min-w-0">{children}</div>
}