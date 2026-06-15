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
  "bg-[linear-gradient(180deg,rgba(4,7,13,0.998),rgba(2,4,9,1))]"

const PRODUCER_FRAME_GRID_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.004] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.014)_0px,rgba(255,255,255,0.014)_1px,transparent_1px,transparent_42px)]"

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
      <div className="absolute left-[-12%] top-[-20%] h-[460px] w-[460px] rounded-full bg-sky-200/[0.038] blur-3xl animate-[producerShellDriftA_34s_ease-in-out_infinite]" />

      <div className="absolute right-[-14%] top-[6%] h-[460px] w-[460px] rounded-full bg-indigo-200/[0.032] blur-3xl animate-[producerShellDriftB_38s_ease-in-out_infinite]" />

      <div className="absolute bottom-[-22%] left-[32%] h-[480px] w-[480px] rounded-full bg-amber-100/[0.012] blur-3xl animate-[producerShellBloom_32s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.024),transparent_56%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.004)_42%,transparent_62%)] animate-[producerShellTransmission_36s_ease-in-out_infinite]" />

      <div className="absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.010)_0px,rgba(255,255,255,0.010)_1px,transparent_1px,transparent_14px)]" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="absolute bottom-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-sky-100/6 to-transparent" />

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
            opacity: 0.55;
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
            opacity: 0.36;
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
    <div className="relative z-10 flex h-[100dvh] min-h-0 flex-col overflow-hidden p-0">
      {children}
    </div>
  )
}

export function ProducerRoomWorkspaceFrame({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0 pt-0 ${PRODUCER_FRAME_BACKGROUND_CLASS}`}
    >
      <div className={PRODUCER_FRAME_GRID_TEXTURE_CLASS} />
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