import type { SVGProps } from "react"

// Licensed Streamline Sharp Line assets for Jupiter. See design-assets/streamline-sharp/manifest.json.
// Do not extract or redistribute as an icon library.
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export function SharpDashboard({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><g><path stroke="currentColor" d="M2 2h8v11H2z"></path><path stroke="currentColor" d="M14 2h8v5h-8z"></path><path stroke="currentColor" d="M2 17h8v5H2z"></path><path stroke="currentColor" d="M14 11h8v11h-8z"></path></g></svg>
}

export function SharpCalendar({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><path stroke="currentColor" d="M21 5.5H3v16h18zm-18 4h18m-14-7v3m11-3v3"></path></svg>
}

export function SharpCloud({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><path stroke="currentColor" d="M1 14a6 6 0 0 0 6 6h11a5 5 0 0 0 0-10A6 6 0 0 0 6.328 8.037 6 6 0 0 0 1 14Z"></path></svg>
}

export function SharpUsers({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><path stroke="currentColor" d="M8.5 14.866c-4.667 0-7 2-7 2v3.25h14v-3.25s-2.333-2-7-2Zm9 .128c3.333.443 5 1.871 5 1.871v3.25H18M5.001 8.742a3.499 3.499 0 1 0 6.998 0 3.499 3.499 0 1 0-6.998 0m8.803-3.062a3.5 3.5 0 0 1 4.17 5.536 3.5 3.5 0 0 1-4.17.587"></path></svg>
}

export function SharpBroadcast({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><g stroke="currentColor"><path d="M15 21h8V3H1v4"></path><path d="M12 22c0-6.627-5.373-12-12-12m4 12a4 4 0 0 0-4-4"></path><path d="M8 22a8 8 0 0 0-8-8"></path></g></svg>
}

export function SharpActivity({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><g stroke="currentColor"><path d="M2 18h20V4H2zm10 0v4m-5 0h10"></path><path d="M5 11h3.5l2 3 3-6 2 3h4"></path></g></svg>
}

export function SharpCode({ size=20, ...props }:IconProps) {
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} aria-hidden="true" {...props}><g stroke="currentColor"><path d="m10 2 4 4-4 4M6 2 2 6l4 4"></path><path d="M2 12v10h20V2h-6"></path></g></svg>
}
