type JupiterLogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  showWordmark?: boolean
}

export default function JupiterLogo({
  className = "",
  markClassName = "h-8 w-8",
  wordmarkClassName = "text-lg font-semibold tracking-[0.18em]",
  showWordmark = true,
}: JupiterLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        className={markClassName}
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="14"
          ry="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="text-indigo-400"
          transform="rotate(-20 16 16)"
        />
        <circle cx="12.5" cy="13" r="2" fill="currentColor" />
      </svg>
      {showWordmark ? <span className={wordmarkClassName}>JUPITER</span> : null}
    </span>
  )
}
