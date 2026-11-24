/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_UNSPLASH_ACCESS_KEY?: string
  readonly VITE_API_URL?: string
  /** Aliases legacy: solo para instalaciones viejas. */
  readonly VITE_AURL_SUPABASE?: string
  readonly VITE_URL_ANON?: string
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}
