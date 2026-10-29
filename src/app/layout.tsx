import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'FynnEmployee - AI Store Workforce',
  description: 'AI-gestuurde Etsy-winkel met autonome agent-medewerkers',
}

// Apply the stored theme before first paint (dark is the default)
const themeScript = `try{if(localStorage.getItem('fynn-theme')!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
