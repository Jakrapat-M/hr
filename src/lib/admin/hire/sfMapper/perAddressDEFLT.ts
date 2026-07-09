// SF entity: PerAddressDEFLT — Default address (mailing)
// API verb: UPSERT
// Phase: 2 (address picklist cascade)
// Source: plan v2 §2.7, CREATE-VS-UPSERT.md
//
// SF field mapping (verified against sf-qas-ec-fields-FULL-2026-04-25.json):
//   personIdExternal — Person ID External (required)
//   startDate        — Event Date (required)
//   addressType      — Address Type (required) — 'mailing' for hire
//   country          — country (required, ISO3)
//   customString1    — Province (required, SF zProvince externalCode)
//   customString2    — District (required, SF zDistrict externalCode)
//   customString3    — Sub-District (required, SF zSubDistrict externalCode)
//   customString4    — Postal Code (required, 5-digit zip string)
//   customString12   — Province duplicate (required, same as CS1 per SF schema pair)
//   customString13   — District duplicate (required, same as CS2 per SF schema pair)
//   address5         — Town (optional, House No.)
//   address4         — Governorate (optional, Village)
//   address11        — Bed Number (optional, Moo)
//   address7         — Camp (optional, Soi)
//   state            — State (optional, free-text province fallback for non-THA)
//   county           — District (optional, free-text district fallback for non-THA)
//   city             — District (optional, free-text sub-district fallback for non-THA)
//   zipCode          — sys_EC-PY_PostalCode (optional, free-text zip fallback for non-THA)
//
// Single-record only (mailing). Multi-record deferred to Phase 6+.
import type { PortletMapper, MapperResult } from './types'
import { toSfDate } from './derivedRules'

interface ThaiAddressFields {
  houseNo?: string
  village?: string
  moo?: string
  soi?: string
  // Phase 2 picklist fields (SF externalCodes)
  province?: string
  district?: string
  subdistrict?: string
  zipCode?: string
  country?: string
}

interface PerAddressDEFLTPayload extends Record<string, unknown> {
  personIdExternal: string
  startDate: string
  addressType: 'mailing'
  country: string
  customString1: string   // Province picklist externalCode (zProvince)
  customString2: string   // District picklist externalCode (zDistrict)
  customString3: string   // Sub-District picklist externalCode (zSubDistrict)
  customString4: string   // Postal Code (5-digit zip string)
  customString12: string  // Province duplicate (SF schema pair of CS1)
  customString13: string  // District duplicate (SF schema pair of CS2)
  address5?: string       // House No.
  address4?: string       // Village
  address11?: string      // Moo
  address7?: string       // Soi
  // Free-text fallbacks for non-THA country
  state?: string
  county?: string
  city?: string
  zipCode?: string
}

export const PerAddressDEFLTMapper: PortletMapper = {
  entity: 'PerAddressDEFLT',
  verb: 'UPSERT',
  build(input): MapperResult {
    const personIdExternal = (input.identity?.employeeId ?? '').trim()
    const startDate = toSfDate(input.identity?.hireDate) ?? ''

    // Address is stored in contact.address (cast — FormData type uses `as any` guard in StepContact)
    const addr = ((input.contact as Record<string, unknown>)?.address ?? {}) as ThaiAddressFields
    const isThai = (addr.country || 'THA').toUpperCase() === 'THA'

    const province = addr.province || ''
    const district = addr.district || ''

    const payload: PerAddressDEFLTPayload = {
      personIdExternal,
      startDate,
      addressType: 'mailing',
      country: addr.country || 'THA',
      customString1:  isThai ? province  : '',
      customString2:  isThai ? district  : '',
      customString3:  isThai ? (addr.subdistrict || '') : '',
      customString4:  isThai ? (addr.zipCode     || '') : '',
      customString12: isThai ? province  : '',   // duplicate pair — same value as CS1
      customString13: isThai ? district  : '',   // duplicate pair — same value as CS2
      ...(addr.houseNo  ? { address5:  addr.houseNo  } : {}),
      ...(addr.village  ? { address4:  addr.village  } : {}),
      ...(addr.moo      ? { address11: addr.moo      } : {}),
      ...(addr.soi      ? { address7:  addr.soi      } : {}),
      // Non-THA: free-text fallback fields instead of picklist externalCodes
      ...(!isThai ? {
        state:   addr.province    || undefined,
        county:  addr.district    || undefined,
        city:    addr.subdistrict || undefined,
        zipCode: addr.zipCode     || undefined,
      } : {}),
    }

    return {
      verb: 'UPSERT',
      payload,
      notes: [
        'Single-record (mailing only); multi-record (mailing+home) deferred to Phase 6+',
        isThai
          ? 'THA path: customString1-4 + CS12/13 = zProvince/zDistrict/zSubDistrict/zPostalCode externalCodes'
          : 'Non-THA path: state/county/city/zipCode free-text fallback; customString1-4 empty',
        'customString12 mirrors CS1 (Province); customString13 mirrors CS2 (District) — SF schema required pair',
      ],
    }
  },
}
