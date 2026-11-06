import type { Metadata, Viewport } from 'next'
import { Bagel_Fat_One, Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })
const bagel = Bagel_Fat_One({ subsets: ['latin'], weight: '400', variable: '--font-bagel' })

export const metadata: Metadata = {
  title: "Aly's Nook - a cozy little productivity corner",
  description:
    'A cozy productivity nook with a Pomodoro timer, ambient focus sounds mixer, to-do list, flashcards, video playlists, and a personal document shelf.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3e6d0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${bagel.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
