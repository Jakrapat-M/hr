// socialDomain.ts — Social Account Domain picklist (STA-82 A1)
// BA: Personal Information > Social Accounts.
import type { PicklistDefinition } from './types'

export const SOCIAL_DOMAIN_OPTIONS: PicklistDefinition = [
  { id: 'LINE', labelTh: 'LINE', labelEn: 'LINE' },
  { id: 'FACEBOOK', labelTh: 'Facebook', labelEn: 'Facebook' },
  { id: 'INSTAGRAM', labelTh: 'Instagram', labelEn: 'Instagram' },
  { id: 'X_TWITTER', labelTh: 'X (Twitter)', labelEn: 'X (Twitter)' },
  { id: 'LINKEDIN', labelTh: 'LinkedIn', labelEn: 'LinkedIn' },
  { id: 'WHATSAPP', labelTh: 'WhatsApp', labelEn: 'WhatsApp' },
  { id: 'WECHAT', labelTh: 'WeChat', labelEn: 'WeChat' },
  { id: 'TELEGRAM', labelTh: 'Telegram', labelEn: 'Telegram' },
  { id: 'OTHER', labelTh: 'อื่น ๆ', labelEn: 'Other' },
] as const
