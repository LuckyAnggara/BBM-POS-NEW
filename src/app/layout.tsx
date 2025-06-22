import type { Metadata } from 'next'
import './globals.css'
import { BranchProvider } from '@/contexts/branch-context'
import { AuthProvider } from '@/contexts/auth-context' // Import AuthProvider
import { ThemeProvider } from '@/contexts/theme-context'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Berkah Baja Makmur',
  description: 'Manage your branches efficiently',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='true'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Inter&display=swap'
          rel='stylesheet'
        />
      </head>
      <body className='font-body antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* Wrap BranchProvider with AuthProvider */}
            <BranchProvider>{children}</BranchProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster richColors duration={2000} closeButton={true} />
      </body>
    </html>
  )
}
