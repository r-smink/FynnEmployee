import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FynnEmployee - AI Store Workforce',
  description: 'AI-powered Etsy store with autonomous agent employees',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
