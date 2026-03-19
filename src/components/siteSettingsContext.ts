import { createContext } from 'react'
import type { SiteSettings } from './siteSettingsModel'
import { defaultSiteSettings } from './siteSettingsModel'

export const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings)
