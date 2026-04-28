// address.ts — Lazy-loaded Thai address picklist helpers
// Phase 2: Province→District→SubDistrict cascade backed by static JSON chunks in /public/picklists/address/
//
// Chunk file layout:
//   /picklists/address/_provinces.json         — 77-entry province index (~7 KB, loaded once)
//   /picklists/address/<provincePrefix>.json   — per-province chunk (~avg 11 KB, max 33 KB)
//
// Hierarchy is encoded in SF externalCode numeric prefix:
//   Province:    2-digit prefix   e.g. "76เพชรบุรี"
//   District:    4-digit prefix   e.g. "7601เมืองเพชรบุรี"
//   SubDistrict: 6-digit prefix   e.g. "760101ท่าราบ"
//
// Postal codes live at district level (district can have 1 or more zip codes).
// When district has exactly 1 zip, the UI auto-fills and locks; when >1, the user picks.

export interface Province {
  code: string      // full SF externalCode, e.g. "76เพชรบุรี"
  labelEn: string
  labelTh: string
}

export interface SubDistrict {
  code: string      // full SF externalCode, e.g. "760101ท่าราบ"
  labelEn: string
  labelTh: string
}

export interface District {
  code: string      // full SF externalCode, e.g. "7601เมืองเพชรบุรี"
  labelEn: string
  labelTh: string
  postalCodes: string[]   // 5-digit Thai zip codes; usually 1, up to ~4 for Bangkok
  subDistricts: SubDistrict[]
}

export interface ProvinceChunk {
  province: Province
  districts: District[]
}

// ── Province 2-digit prefix extraction helper ─────────────────────────────
export function provincePrefix(code: string): string {
  return code.match(/^(\d+)/)?.[1].slice(0, 2) ?? ''
}

// ── Caches ────────────────────────────────────────────────────────────────

const chunkCache = new Map<string, Promise<ProvinceChunk>>()
let provincesCache: Promise<Province[]> | null = null

// ── Public API ────────────────────────────────────────────────────────────

/** Load the province index (77 entries). Cached after first call. */
export async function loadProvinces(): Promise<Province[]> {
  if (!provincesCache) {
    provincesCache = fetch('/picklists/address/_provinces.json').then((r) => {
      if (!r.ok) throw new Error(`Province index fetch failed: ${r.status}`)
      return r.json() as Promise<Province[]>
    })
  }
  return provincesCache
}

/** Load the full chunk for a given province externalCode. Cached per province. */
export async function loadProvinceChunk(provinceCode: string): Promise<ProvinceChunk> {
  const prefix = provincePrefix(provinceCode)
  if (!prefix) return Promise.reject(new Error(`Invalid province code: ${provinceCode}`))

  if (!chunkCache.has(prefix)) {
    chunkCache.set(
      prefix,
      fetch(`/picklists/address/${prefix}.json`).then((r) => {
        if (!r.ok) throw new Error(`Province chunk ${prefix} not found: ${r.status}`)
        return r.json() as Promise<ProvinceChunk>
      }),
    )
  }
  return chunkCache.get(prefix)!
}

/** Clear all caches — useful in tests. */
export function clearAddressCache(): void {
  chunkCache.clear()
  provincesCache = null
}
