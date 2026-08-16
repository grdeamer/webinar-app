import "./globals.css"
import { Geist, Instrument_Sans, Inter } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
})

export const metadata: Metadata = {
  title: "Jupiter.events",
  description:
    "Host events with gravity. Run webinars, summits, and live broadcasts on a platform built to scale.",
  icons: {
    icon: [{ url: "/jupiter-planet.svg", type: "image/svg+xml" }],
    shortcut: "/jupiter-planet.svg",
    apple: "/jupiter-planet.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030714",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, inter.variable, instrumentSans.variable)}>
      <body className="jupiter-space-site min-h-dvh text-white antialiased">
        {children}
      </body>
    </html>
  )
}
