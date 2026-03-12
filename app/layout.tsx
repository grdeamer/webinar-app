import "./globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata = {
  title: "Jupiter.events",
  description:
    "Host events with gravity. Run webinars, summits, and live broadcasts on a platform built to scale.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
