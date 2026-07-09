#!/usr/bin/env bun
/**
 * build-address-chunks.ts — Phase 2 address picklist chunk generator
 *
 * Reads SF picklist options and labels, then emits:
 *   src/frontend/public/picklists/address/<provincePrefix>.json  (77 files)
 *   src/frontend/public/picklists/address/_provinces.json        (index)
 *
 * Hierarchy is encoded in externalCode numeric prefix:
 *   Province:    2-digit prefix   e.g. "76เพชรบุรี"
 *   District:    4-digit prefix   e.g. "7601เมืองเพชรบุรี"  (first 2 = province)
 *   SubDistrict: 6-digit prefix   e.g. "760101ท่าราบ"        (first 4 = district)
 *   PostalCode:  9-digit          = district(4) + zip(5)    e.g. "800880160"
 *
 * Postal codes live at district level. Districts with multiple zip codes store
 * them all in postalCodes[]. The UI shows a zip select when >1 option exists.
 *
 * DATA QUALITY ISSUES FOUND:
 *   - 1 subdistrict with 5-digit prefix: "10250ทับช้าง" → treated as district 1025
 *   - 16 provinces missing EN label → labelEn falls back to Thai extracted from externalCode
 *   - Some districts/subdistricts may also lack EN labels → same Thai fallback applies
 *
 * Run: bun scripts/build-address-chunks.ts
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SF_DIR = resolve('/Users/tachongrak/stark/projects/hr-platform-replacement/sf-extract/qas-fields-2026-04-25')
const OUT_DIR = resolve(__dirname, '../src/frontend/public/picklists/address')

// ── Types ──────────────────────────────────────────────────────────────────

interface RawOption {
  id: string
  externalCode: string
  pickListId: string
  status: string
}

interface RawLabel {
  optionId: string
  locale: string
  label: string
}

interface SubDistrict {
  code: string    // full externalCode, e.g. "760101ท่าราบ"
  labelEn: string
  labelTh: string
}

interface District {
  code: string      // full externalCode, e.g. "7601เมืองเพชรบุรี"
  labelEn: string
  labelTh: string
  postalCodes: string[]   // 5-digit Thai zip codes; 1+ per district
  subDistricts: SubDistrict[]
}

interface ProvinceChunk {
  province: {
    code: string    // full externalCode, e.g. "76เพชรบุรี"
    labelEn: string
    labelTh: string
  }
  districts: District[]
}

// ── Load data ──────────────────────────────────────────────────────────────

console.log('Loading SF picklist options...')
const linkedFile = JSON.parse(readFileSync(resolve(SF_DIR, 'sf-qas-picklist-options-LINKED-2026-04-26.json'), 'utf8'))
const allOpts: RawOption[] = linkedFile.options

console.log('Loading SF picklist labels...')
const labelsFile = JSON.parse(readFileSync(resolve(SF_DIR, 'sf-qas-picklist-labels-FULL-2026-04-25.json'), 'utf8'))
const allLabels: RawLabel[] = labelsFile.labels

// ── Build label map: optionId → { labelEn, labelTh } ─────────────────────

interface LabelEntry { labelEn?: string; labelTh?: string }
const labelMap = new Map<string, LabelEntry>()

for (const l of allLabels) {
  // Label format: "English\Thai" (backslash separator, when both exist)
  if (!l.label) continue
  const parts = l.label.split('\\')
  const enPart = parts[0].trim()
  const thPart = parts[1]?.trim() ?? ''

  if (!labelMap.has(l.optionId)) labelMap.set(l.optionId, {})
  const entry = labelMap.get(l.optionId)!

  if (l.locale === 'en_GB') {
    entry.labelEn = enPart || undefined
    if (thPart && !entry.labelTh) entry.labelTh = thPart
  } else if (l.locale === 'th_TH') {
    // th_TH label is the same combined string; only grab Thai part if not already set
    if (!entry.labelTh) {
      entry.labelTh = thPart || enPart  // fallback to only part if no separator
    }
  }
}

// ── Helper: extract numeric prefix from externalCode ──────────────────────

function numericPrefix(externalCode: string, len: number): string {
  const m = externalCode.match(/^(\d+)/)
  if (!m) return ''
  return m[1].slice(0, len)
}

function extractThaiFromCode(externalCode: string): string {
  return externalCode.replace(/^\d+/, '').trim()
}

function getLabels(id: string, externalCode: string): { labelEn: string; labelTh: string } {
  const entry = labelMap.get(id)
  const thFallback = extractThaiFromCode(externalCode)
  return {
    labelEn: entry?.labelEn ?? thFallback,  // fallback to Thai text if no EN
    labelTh: entry?.labelTh ?? thFallback,
  }
}

// ── Separate picklist options by type ─────────────────────────────────────

const provinces  = allOpts.filter(o => o.pickListId === 'zProvince'    && o.status === 'ACTIVE')
const districts  = allOpts.filter(o => o.pickListId === 'zDistrict'    && o.status === 'ACTIVE')
const subdists   = allOpts.filter(o => o.pickListId === 'zSubDistrict' && o.status === 'ACTIVE')
const postalOpts = allOpts.filter(o => o.pickListId === 'zPostalCode'  && o.status === 'ACTIVE')

console.log(`Options loaded: ${provinces.length} provinces, ${districts.length} districts, ${subdists.length} sub-districts, ${postalOpts.length} postal codes`)

// ── Build postal code lookup: districtPrefix(4) → zip codes ──────────────

const districtPostalMap = new Map<string, Set<string>>()
let postalDataQualityIssues = 0
for (const pc of postalOpts) {
  const digits = pc.externalCode.match(/^\d+/)?.[0] ?? ''
  if (digits.length !== 9) {
    console.warn(`  [DQ] Unexpected postal code format: ${pc.externalCode}`)
    postalDataQualityIssues++
    continue
  }
  const distCode = digits.slice(0, 4)
  const zip = digits.slice(4)  // last 5 digits = Thai zip code
  if (!districtPostalMap.has(distCode)) districtPostalMap.set(distCode, new Set())
  districtPostalMap.get(distCode)!.add(zip)
}

// ── Build subdist lookup: districtPrefix(4) → SubDistrict[] ──────────────

const districtSubdistMap = new Map<string, SubDistrict[]>()
let sdDataQualityIssues = 0
for (const sd of subdists) {
  const digits = sd.externalCode.match(/^\d+/)?.[0] ?? ''
  // Handle 5-digit anomaly (e.g. "10250ทับช้าง"): treat first 4 as district
  const distCode = digits.slice(0, 4)
  if (digits.length < 5) {
    console.warn(`  [DQ] SubDistrict with very short prefix: ${sd.externalCode}`)
    sdDataQualityIssues++
    continue
  }
  if (digits.length === 5) {
    console.warn(`  [DQ] SubDistrict with 5-digit prefix (expected 6): ${sd.externalCode} → linked to district ${distCode}`)
    sdDataQualityIssues++
  }

  if (!districtSubdistMap.has(distCode)) districtSubdistMap.set(distCode, [])
  const lbl = getLabels(sd.id, sd.externalCode)
  districtSubdistMap.get(distCode)!.push({
    code: sd.externalCode,
    labelEn: lbl.labelEn,
    labelTh: lbl.labelTh,
  })
}

// ── Build district lookup: provincePrefix(2) → District[] ────────────────

const provinceDistrictMap = new Map<string, District[]>()
let distDataQualityIssues = 0
for (const d of districts) {
  const digits = d.externalCode.match(/^\d+/)?.[0] ?? ''
  if (digits.length !== 4) {
    console.warn(`  [DQ] District with unexpected prefix length: ${d.externalCode}`)
    distDataQualityIssues++
    continue
  }
  const provCode = digits.slice(0, 2)

  if (!provinceDistrictMap.has(provCode)) provinceDistrictMap.set(provCode, [])
  const lbl = getLabels(d.id, d.externalCode)
  const postalSet = districtPostalMap.get(digits) ?? new Set()
  provinceDistrictMap.get(provCode)!.push({
    code: d.externalCode,
    labelEn: lbl.labelEn,
    labelTh: lbl.labelTh,
    postalCodes: [...postalSet].sort(),
    subDistricts: districtSubdistMap.get(digits) ?? [],
  })
}

// ── Emit chunks + index ──────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })

const provinceIndex: Array<{ code: string; labelEn: string; labelTh: string }> = []
const chunkSizes: number[] = []
let totalDistricts = 0
let totalSubDistricts = 0
let missingProvLabel = 0

provinces.sort((a, b) => {
  const aNum = parseInt(a.externalCode.match(/^\d+/)?.[0] ?? '0', 10)
  const bNum = parseInt(b.externalCode.match(/^\d+/)?.[0] ?? '0', 10)
  return aNum - bNum
})

for (const prov of provinces) {
  const digits = prov.externalCode.match(/^\d+/)?.[0] ?? ''
  if (digits.length !== 2) {
    console.warn(`  [DQ] Province with unexpected prefix: ${prov.externalCode}`)
    continue
  }

  const lbl = getLabels(prov.id, prov.externalCode)
  if (!labelMap.get(prov.id)?.labelEn) missingProvLabel++

  const provDists = provinceDistrictMap.get(digits) ?? []
  const chunk: ProvinceChunk = {
    province: {
      code: prov.externalCode,
      labelEn: lbl.labelEn,
      labelTh: lbl.labelTh,
    },
    districts: provDists,
  }

  const json = JSON.stringify(chunk)
  const outPath = resolve(OUT_DIR, `${digits}.json`)
  writeFileSync(outPath, json, 'utf8')

  const sizeKb = Buffer.byteLength(json) / 1024
  chunkSizes.push(sizeKb)

  const sdCount = provDists.reduce((sum, d) => sum + d.subDistricts.length, 0)
  totalDistricts += provDists.length
  totalSubDistricts += sdCount

  provinceIndex.push({ code: prov.externalCode, labelEn: lbl.labelEn, labelTh: lbl.labelTh })
}

// Emit province index
writeFileSync(resolve(OUT_DIR, '_provinces.json'), JSON.stringify(provinceIndex), 'utf8')

// ── Summary ───────────────────────────────────────────────────────────────

chunkSizes.sort((a, b) => a - b)
const avgKb = chunkSizes.reduce((s, k) => s + k, 0) / chunkSizes.length
const maxKb = chunkSizes[chunkSizes.length - 1]

console.log('\n=== Build Summary ===')
console.log(`Provinces: ${provinces.length}`)
console.log(`Districts: ${totalDistricts} (expected: ${districts.length})`)
console.log(`SubDistricts: ${totalSubDistricts} (expected: ${subdists.length})`)
console.log(`Postal codes: ${postalOpts.length} raw → ${districtPostalMap.size} distinct districts with zips`)
console.log(`Avg chunk size: ${avgKb.toFixed(1)} KB`)
console.log(`Max chunk size: ${maxKb.toFixed(1)} KB`)
console.log(`_provinces.json: ${(Buffer.byteLength(JSON.stringify(provinceIndex)) / 1024).toFixed(1)} KB`)
console.log(`\nData quality issues:`)
console.log(`  Provinces missing EN label (using Thai fallback): ${missingProvLabel}`)
console.log(`  SubDistricts with anomalous prefix: ${sdDataQualityIssues}`)
console.log(`  Districts with anomalous prefix: ${distDataQualityIssues}`)
console.log(`  Postal codes with unexpected format: ${postalDataQualityIssues}`)
console.log(`\nOutput: ${OUT_DIR}`)
