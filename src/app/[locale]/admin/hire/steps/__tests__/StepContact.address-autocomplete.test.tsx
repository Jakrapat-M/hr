// StepContact.address-autocomplete.test.tsx — Phase 2 address picklist cascade tests
// Replaces old free-text autocomplete tests (pre-Phase 2).
// The address section now uses AddressPicklist (province → district → subdistrict → postal).
// fetch is mocked for province index + chunk loading.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StepContact from '@/app/[locale]/admin/hire/steps/StepContact'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'
import { clearAddressCache } from '@/lib/admin/hire/picklists/address'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const th: Record<string, string> = {
      phoneSection: 'เบอร์ติดต่อ',
      emailSection: 'อีเมล',
      addressSection: 'ที่อยู่ที่พักอาศัย',
      phoneType: 'ประเภทเบอร์โทร',
      countryCode: 'รหัสประเทศ',
      phoneNumber: 'เบอร์โทร',
      extension: 'ต่อ',
      isPrimary: 'หลัก',
      addPhone: '+ เพิ่มเบอร์โทร',
      emailType: 'ประเภทอีเมล',
      emailAddress: 'อีเมล',
      addEmail: '+ เพิ่มอีเมล',
      houseNo: 'บ้านเลขที่',
      village: 'หมู่บ้าน',
      moo: 'หมู่ที่',
      soi: 'ซอย',
      subdistrict: 'แขวง / ตำบล',
      district: 'เขต / อำเภอ',
      province: 'จังหวัด',
      zipCode: 'รหัสไปรษณีย์',
      country: 'ประเทศ',
      relationsSection: 'บุคคลที่เกี่ยวข้อง',
      addRelation: '+ เพิ่ม',
      remove: 'ลบ',
      relationshipType: 'ประเภทความสัมพันธ์',
      personName: 'ชื่อ',
      countryCodePlaceholder: '+66',
      phonePlaceholder: '0XX-XXX-XXXX',
      extensionPlaceholder: 'ต่อ',
      emailPlaceholder: 'example@email.com',
      houseNoPlaceholder: 'เช่น 155',
      villagePlaceholder: 'เช่น หมู่บ้านตะวันนา',
      mooPlaceholder: 'เช่น 5',
      soiPlaceholder: 'เช่น สนามบินน้ำ',
      subdistrictPlaceholder: 'เช่น บางกระสอ',
      districtPlaceholder: 'เช่น นนทบุรี',
      provincePlaceholder: 'เช่น 12 (นนทบุรี)',
      zipCodePlaceholder: 'เช่น 11000',
      countryPlaceholder: 'THA',
      relationshipTypePlaceholder: 'เช่น ผู้จัดการ / หัวหน้างาน',
      personNamePlaceholder: 'ชื่อ-นามสกุล',
    }
    return th[key] ?? key
  },
  useLocale: () => 'th',
}))

// ── Minimal mock data matching the real chunk format ───────────────────────

const MOCK_PROVINCES = [
  { code: '11นนทบุรี', labelEn: 'Nonthaburi', labelTh: 'นนทบุรี' },
  { code: '10กรุงเทพมหานคร', labelEn: 'Bangkok', labelTh: 'กรุงเทพมหานคร' },
]

const MOCK_CHUNK_11 = {
  province: { code: '11นนทบุรี', labelEn: 'Nonthaburi', labelTh: 'นนทบุรี' },
  districts: [
    {
      code: '1101เมืองนนทบุรี',
      labelEn: 'Mueang Nonthaburi',
      labelTh: 'เมืองนนทบุรี',
      postalCodes: ['11000'],
      subDistricts: [
        { code: '110101สวนใหญ่', labelEn: 'Suan Yai', labelTh: 'สวนใหญ่' },
        { code: '110102ตลาดขวัญ', labelEn: 'Talat Khwan', labelTh: 'ตลาดขวัญ' },
      ],
    },
  ],
}

// Mock fetch to return appropriate data based on URL
function setupFetchMock() {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('_provinces.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_PROVINCES),
      })
    }
    if (url.includes('/11.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_CHUNK_11),
      })
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('not found')) })
  }))
}

beforeEach(() => {
  localStorage.clear()
  clearAddressCache()
  act(() => {
    useHireWizard.getState().reset()
  })
  setupFetchMock()
})

describe('StepContact address picklist (Phase 2)', () => {
  it('renders the address section with country input and province combobox button', async () => {
    render(<StepContact />)

    // Country input should be present
    expect(screen.getByLabelText(/^ประเทศ$/)).toBeTruthy()

    // Province combobox button (aria-label="จังหวัด")
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /จังหวัด/ })).toBeTruthy()
    })
  })

  it('loads province list on mount and shows province options when opened', async () => {
    render(<StepContact />)

    // Wait for provinces to load (fetch called on mount)
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('_provinces.json')
    ))

    // Open province dropdown
    const provinceBtn = screen.getByRole('button', { name: /จังหวัด/ })
    act(() => { fireEvent.click(provinceBtn) })

    await waitFor(() => {
      expect(screen.getByText('นนทบุรี')).toBeTruthy()
      expect(screen.getByText('กรุงเทพมหานคร')).toBeTruthy()
    })
  })

  it('selects province, loads chunk, and then enables district dropdown', async () => {
    render(<StepContact />)

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('_provinces.json')
    ))

    // Open and select province
    const provinceBtn = screen.getByRole('button', { name: /จังหวัด/ })
    act(() => { fireEvent.click(provinceBtn) })

    await waitFor(() => screen.getByText('นนทบุรี'))
    act(() => { fireEvent.click(screen.getByText('นนทบุรี')) })

    // Chunk should be fetched for province prefix '11'
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/11.json')
    ))

    // District button should now be enabled and show district name
    await waitFor(() => {
      const distBtn = screen.getByRole('button', { name: /เขต\/อำเภอ/ })
      expect(distBtn).not.toBeDisabled()
    })
  })

  it('auto-fills single postal code when district with 1 zip is selected', async () => {
    render(<StepContact />)

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('_provinces.json')
    ))

    // Select province นนทบุรี
    const provinceBtn = screen.getByRole('button', { name: /จังหวัด/ })
    act(() => { fireEvent.click(provinceBtn) })
    await waitFor(() => screen.getByText('นนทบุรี'))
    act(() => { fireEvent.click(screen.getByText('นนทบุรี')) })

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/11.json')
    ))

    // Select district เมืองนนทบุรี
    await waitFor(() => {
      const distBtn = screen.getByRole('button', { name: /เขต\/อำเภอ/ })
      expect(distBtn).not.toBeDisabled()
      act(() => { fireEvent.click(distBtn) })
    })

    await waitFor(() => screen.getByText('เมืองนนทบุรี'))
    act(() => { fireEvent.click(screen.getByText('เมืองนนทบุรี')) })

    // Postal code auto-filled (read-only input with single zip 11000)
    await waitFor(() => {
      const postalInput = screen.getByLabelText(/รหัสไปรษณีย์/) as HTMLInputElement
      expect(postalInput.value).toBe('11000')
    })
  })
})
