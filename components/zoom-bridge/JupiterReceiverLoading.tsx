import "./jupiter-receiver-loading.css"

export default function JupiterReceiverLoading({ label = "Starting Zoom…" }: { label?: string }) {
  return (
    <div className="jupiter-receiver-loading" role="status">
      <span className="jupiter-receiver-globe" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
