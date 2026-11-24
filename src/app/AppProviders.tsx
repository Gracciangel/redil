import type { ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { PWAProvider } from '@/pwa/PWAProvider'
import { SettingsProvider } from '@/lib/settings'
import { SyncManager } from '@/components/SyncManager'
import { appTheme } from '@/theme'
import { AuthProvider } from './AuthProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <PWAProvider>
          <SettingsProvider>
            <AuthProvider>
              <SyncManager />
              {children}
            </AuthProvider>
          </SettingsProvider>
        </PWAProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}