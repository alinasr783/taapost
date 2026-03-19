import type { ReactNode } from 'react'
import type { SiteSettings } from './siteSettingsModel'
import { SiteSettingsContext } from './siteSettingsContext'

export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: ReactNode }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}
