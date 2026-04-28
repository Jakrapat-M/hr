'use client'

// AddressPicklist.tsx — Cascading Thai address picklist (Phase 2)
// Province → District → SubDistrict → PostalCode
//
// - Province list is eagerly loaded from /picklists/address/_provinces.json
// - District/SubDistrict/PostalCode data is lazy-loaded per province chunk
// - Postal code: auto-fills when district has exactly 1 zip; shows select when multiple
// - Non-THA country: hides picklists and lets parent render free-text fallback
//
// Performance notes:
//   - Province index: ~7 KB, loaded once on mount
//   - Per-province chunks: avg ~11 KB, max ~33 KB (Bangkok), loaded on province select
//   - Combobox filter: renders max 100 rows at a time to keep large lists fast
//   - Perf budget goal: ≤500ms first interaction on slow 3G (chunk ≤100 KB guaranteed)

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import {
  loadProvinces,
  loadProvinceChunk,
  type Province,
  type District,
  type SubDistrict,
} from '@/lib/admin/hire/picklists/address'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AddressPicklistValue {
  province: string      // SF externalCode, e.g. "76เพชรบุรี"
  district: string      // SF externalCode, e.g. "7601เมืองเพชรบุรี"
  subDistrict: string   // SF externalCode, e.g. "760101ท่าราบ"
  postalCode: string    // 5-digit Thai zip, e.g. "76100"
}

export const EMPTY_ADDRESS_PICKLIST: AddressPicklistValue = {
  province: '',
  district: '',
  subDistrict: '',
  postalCode: '',
}

interface AddressPicklistProps {
  value: AddressPicklistValue
  onChange: (next: AddressPicklistValue) => void
  disabled?: boolean
}

// ── Combobox: searchable select for large lists ────────────────────────────

interface ComboboxOption {
  value: string
  labelTh: string
  labelEn: string
}

interface ComboboxProps {
  id: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  loading?: boolean
  'aria-label'?: string
}

const MAX_VISIBLE = 100

function Combobox({ id, options, value, onChange, placeholder, disabled, loading, 'aria-label': ariaLabel }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Derive display text from current value
  const selectedOpt = options.find((o) => o.value === value)
  const displayText = selectedOpt ? `${selectedOpt.labelTh}` : ''

  // Filtered options (max MAX_VISIBLE)
  const filtered = filter.trim()
    ? options
        .filter(
          (o) =>
            o.labelTh.includes(filter) ||
            o.labelEn.toLowerCase().includes(filter.toLowerCase()) ||
            o.value.includes(filter),
        )
        .slice(0, MAX_VISIBLE)
    : options.slice(0, MAX_VISIBLE)

  function openDropdown() {
    if (disabled || loading) return
    setFilter('')
    setHighlighted(0)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value)
    setOpen(false)
    setFilter('')
  }

  function handleInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) selectOption(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setFilter('')
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[highlighted] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted, open])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || loading}
        onClick={openDropdown}
        className="humi-input w-full text-left flex items-center justify-between gap-2 disabled:cursor-not-allowed"
      >
        <span className={displayText ? 'text-ink' : 'text-ink-soft'}>
          {loading ? 'กำลังโหลด...' : (displayText || placeholder)}
        </span>
        <span className="shrink-0 text-ink-soft text-xs" aria-hidden="true">
          {loading ? '⏳' : '▾'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-hairline bg-canvas shadow-md">
          {/* Search input */}
          <div className="border-b border-hairline p-2">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setHighlighted(0) }}
              onKeyDown={handleInputKey}
              placeholder="ค้นหา..."
              className="humi-input w-full text-sm"
              aria-label="ค้นหาตัวเลือก"
            />
          </div>
          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">ไม่พบผลลัพธ์</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    i === highlighted ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-canvas-soft'
                  } ${opt.value === value ? 'font-medium' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => selectOption(opt)}
                >
                  <span>{opt.labelTh}</span>
                  {opt.labelEn && opt.labelEn !== opt.labelTh && (
                    <span className="ml-1.5 text-ink-soft text-xs">{opt.labelEn}</span>
                  )}
                </li>
              ))
            )}
            {options.length > MAX_VISIBLE && filter.trim() === '' && (
              <li className="px-3 py-1.5 text-xs text-ink-soft border-t border-hairline">
                แสดง {MAX_VISIBLE} จาก {options.length} — พิมพ์เพื่อค้นหา
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AddressPicklist({ value, onChange, disabled }: AddressPicklistProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [chunkLoading, setChunkLoading] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)

  // Load province index on mount
  useEffect(() => {
    loadProvinces()
      .then(setProvinces)
      .catch((err) => console.error('[AddressPicklist] Failed to load provinces:', err))
  }, [])

  // Load province chunk when province changes
  useEffect(() => {
    if (!value.province) {
      setDistricts([])
      return
    }
    setChunkLoading(true)
    setChunkError(null)
    loadProvinceChunk(value.province)
      .then((chunk) => {
        setDistricts(chunk.districts)
        setChunkLoading(false)
      })
      .catch((err) => {
        console.error('[AddressPicklist] Chunk load failed:', err)
        setChunkError('โหลดข้อมูลไม่สำเร็จ')
        setChunkLoading(false)
      })
  }, [value.province])

  // Derive current district object for sub-district and postal code lookups
  const currentDistrict = districts.find((d) => d.code === value.district) ?? null
  const subDistricts: SubDistrict[] = currentDistrict?.subDistricts ?? []
  const postalOptions: string[] = currentDistrict?.postalCodes ?? []

  // ── Change handlers ────────────────────────────────────────────────────

  const handleProvinceChange = useCallback(
    (code: string) => {
      onChange({ province: code, district: '', subDistrict: '', postalCode: '' })
    },
    [onChange],
  )

  const handleDistrictChange = useCallback(
    (code: string) => {
      const dist = districts.find((d) => d.code === code)
      const autoPostal = dist?.postalCodes.length === 1 ? dist.postalCodes[0] : ''
      onChange({ ...value, district: code, subDistrict: '', postalCode: autoPostal })
    },
    [onChange, value, districts],
  )

  const handleSubDistrictChange = useCallback(
    (code: string) => {
      onChange({ ...value, subDistrict: code })
    },
    [onChange, value],
  )

  const handlePostalChange = useCallback(
    (postal: string) => {
      onChange({ ...value, postalCode: postal })
    },
    [onChange, value],
  )

  // ── Build option arrays for Combobox ───────────────────────────────────

  const provinceOptions: ComboboxOption[] = provinces.map((p) => ({
    value: p.code,
    labelTh: p.labelTh,
    labelEn: p.labelEn,
  }))

  const districtOptions: ComboboxOption[] = districts.map((d) => ({
    value: d.code,
    labelTh: d.labelTh,
    labelEn: d.labelEn,
  }))

  const subDistrictOptions: ComboboxOption[] = subDistricts.map((sd) => ({
    value: sd.code,
    labelTh: sd.labelTh,
    labelEn: sd.labelEn,
  }))

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
      {/* จังหวัด */}
      <fieldset>
        <label htmlFor="addr-province" className="humi-label">
          จังหวัด<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </label>
        <Combobox
          id="addr-province"
          aria-label="จังหวัด"
          options={provinceOptions}
          value={value.province}
          onChange={handleProvinceChange}
          placeholder="เลือกจังหวัด"
          disabled={disabled}
        />
      </fieldset>

      {/* เขต/อำเภอ */}
      <fieldset>
        <label htmlFor="addr-district" className="humi-label">
          เขต/อำเภอ<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </label>
        {chunkError ? (
          <p className="text-sm text-error">{chunkError} — กรุณาพิมพ์เขต/อำเภอด้วยตนเอง</p>
        ) : (
          <Combobox
            id="addr-district"
            aria-label="เขต/อำเภอ"
            options={districtOptions}
            value={value.district}
            onChange={handleDistrictChange}
            placeholder={value.province ? 'เลือกเขต/อำเภอ' : 'เลือกจังหวัดก่อน'}
            disabled={disabled || !value.province}
            loading={chunkLoading}
          />
        )}
      </fieldset>

      {/* แขวง/ตำบล */}
      <fieldset>
        <label htmlFor="addr-subdistrict" className="humi-label">
          แขวง/ตำบล<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </label>
        <Combobox
          id="addr-subdistrict"
          aria-label="แขวง/ตำบล"
          options={subDistrictOptions}
          value={value.subDistrict}
          onChange={handleSubDistrictChange}
          placeholder={value.district ? 'เลือกแขวง/ตำบล' : 'เลือกเขต/อำเภอก่อน'}
          disabled={disabled || !value.district}
        />
      </fieldset>

      {/* รหัสไปรษณีย์ */}
      <fieldset>
        <label htmlFor="addr-postal" className="humi-label">
          รหัสไปรษณีย์<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
        </label>
        {postalOptions.length > 1 ? (
          <select
            id="addr-postal"
            aria-label="รหัสไปรษณีย์"
            value={value.postalCode}
            onChange={(e) => handlePostalChange(e.target.value)}
            disabled={disabled || !value.district}
            className="humi-select w-full"
          >
            <option value="">เลือกรหัสไปรษณีย์</option>
            {postalOptions.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        ) : (
          <input
            id="addr-postal"
            type="text"
            inputMode="numeric"
            aria-label="รหัสไปรษณีย์"
            value={value.postalCode}
            onChange={(e) => handlePostalChange(e.target.value)}
            placeholder="รหัสไปรษณีย์"
            readOnly={postalOptions.length === 1}
            disabled={disabled}
            className="humi-input w-full read-only:bg-canvas-soft read-only:text-ink-soft"
          />
        )}
      </fieldset>
    </div>
  )
}
