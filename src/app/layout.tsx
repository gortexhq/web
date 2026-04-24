import type { Metadata } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/chrome/AppShell'

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex',
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Gortex — Code intelligence',
  description: 'Knowledge graph and analysis dashboard for understanding code, dependencies, processes, and contracts across repositories.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ink" data-density="comfortable" className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
      {/* suppressHydrationWarning: some browser extensions (Grammarly, etc.)
          add attributes to <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
