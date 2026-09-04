import "./globals.css"
import { Geist, Instrument_Sans, Inter, Space_Grotesk } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { cn } from "@/lib/utils";
import { JupiterNotificationProvider } from "@/components/ui/JupiterNotificationProvider"

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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jupiter.events"),
  applicationName: "Jupiter",
  title: {
    default: "Jupiter — Virtual events should feel bigger",
    template: "%s | Jupiter",
  },
  description:
    "Create, produce, and direct branded virtual events from one live production platform. Your event, written in the stars. This is Jupiter.",
  icons: {
    icon: [{ url: "/jupiter-planet.svg", type: "image/svg+xml" }],
    shortcut: "/jupiter-planet.svg",
    apple: "/jupiter-planet.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jupiter",
  },
  formatDetection: {
    telephone: false,
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
    <html lang="en" className={cn("font-sans", geist.variable, inter.variable, instrumentSans.variable, spaceGrotesk.variable)}>
      <body className="jupiter-space-site min-h-dvh text-white antialiased">
        <JupiterNotificationProvider>{children}</JupiterNotificationProvider>
      </body>
    </html>
  )
}
