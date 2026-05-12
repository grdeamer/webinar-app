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
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute left-[-10%] top-[-18%] h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />

      <div className="absolute right-[-12%] top-[8%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="absolute bottom-[-20%] left-[30%] h-[620px] w-[620px] rounded-full bg-red-500/8 blur-3xl" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_42%)]" />
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
    <div className="flex-1 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_100%_20%,rgba(168,85,247,0.08),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(1,3,10,1))] px-3 py-3 md:px-4 xl:px-5 xl:py-4 2xl:px-6">
      {children}
    </div>
  )
}

export function ProducerRoomGrid({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return (
    <div className="grid w-full items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)_320px] xl:grid-cols-[265px_minmax(0,1fr)_345px] 2xl:grid-cols-[285px_minmax(0,1fr)_375px] [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-0.5 [&_button:active]:translate-y-0">
      {children}
    </div>
  )
}

export function ProducerRoomCenterColumn({
  children,
}: ProducerRoomLayoutProps): JSX.Element {
  return <div className="min-w-0">{children}</div>
}