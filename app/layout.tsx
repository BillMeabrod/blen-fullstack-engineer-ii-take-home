import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import Nav from "@/components/nav"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Task Tracker with AI",
  description: "BLEN Full-Stack Take-Home",
}

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body suppressHydrationWarning style={{ background: 'var(--bg)', color: 'var(--text-1)', minHeight: '100vh' }}>
        <Nav />
        {children}
      </body>
    </html>
  )
}
