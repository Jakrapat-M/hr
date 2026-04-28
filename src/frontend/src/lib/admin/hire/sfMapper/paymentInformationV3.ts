// SF entity: PaymentInformationV3 — Bank/payment details
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.12, CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const PaymentInformationV3Mapper: PortletMapper = {
  entity: 'PaymentInformationV3',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'Bank Country/Region, Currency, Payment Method, Pay Type, Bank, Account Number, Bank Code per BA spec',
        'Q1 reopened to FULL per strict BA parity',
      ],
      5,
    )
  },
}
