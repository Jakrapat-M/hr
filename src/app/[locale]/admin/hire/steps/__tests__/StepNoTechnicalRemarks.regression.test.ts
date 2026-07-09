import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FORBIDDEN_REMARKS = [
  /\bSF(?:\s|:|\))/,
  /\bEmpJob\./,
  /\bEmpCompensation\./,
  /\bPaymentInformation/,
  /\bPerPersonal\./,
  /\bcustomString\d+\b/,
  /\bgenericString\d+\b/,
  /\bgenericNumber\d+\b/,
]

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory() && entry === '__tests__') return []
    if (stat.isDirectory()) return walkFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

function stripSourceComments(source: string) {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenStrings)
  return []
}

describe('hire form visible copy', () => {
  it('does not expose SF technical remarks in hire routes or hire translations', () => {
    const hireDir = join(process.cwd(), 'src/app/[locale]/admin/hire')
    const sourceCopy = walkFiles(hireDir)
      .map((path) => stripSourceComments(readFileSync(path, 'utf8')))
      .join('\n')

    const enHireForm = JSON.parse(readFileSync(join(process.cwd(), 'messages/en.json'), 'utf8')).hireForm
    const thHireForm = JSON.parse(readFileSync(join(process.cwd(), 'messages/th.json'), 'utf8')).hireForm
    const translatedCopy = [...flattenStrings(enHireForm), ...flattenStrings(thHireForm)].join('\n')

    for (const pattern of FORBIDDEN_REMARKS) {
      expect(sourceCopy, `${pattern} found in hire route visible copy`).not.toMatch(pattern)
      expect(translatedCopy, `${pattern} found in hireForm translations`).not.toMatch(pattern)
    }
  })
})
