'use client'

import { STA181_SECTIONS, type Sta181FieldValues } from '../_lib/sta181Fields'

interface Sta181ExtendedFieldsProps {
  readonly values: Sta181FieldValues
  readonly onChange: (key: string, value: string) => void
}

export function Sta181ExtendedFields({ values, onChange }: Sta181ExtendedFieldsProps) {
  return (
    <section aria-labelledby="sta181-extended-fields" className="space-y-8">
      <div className="border-t border-[color:var(--color-hairline-soft)] pt-8">
        <h2 id="sta181-extended-fields" className="font-display text-lg font-semibold text-ink">
          ฟิลด์ข้อมูลพนักงานเพิ่มเติม
        </h2>
        <p className="mt-1 text-small text-ink-muted">
          ตรวจสอบและแก้ไขข้อมูลส่วนบุคคล งาน ค่าตอบแทน และประวัติพนักงาน
        </p>
      </div>

      {STA181_SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`sta181-${section.id}`}
          className="border-t border-[color:var(--color-hairline-soft)] pt-6"
        >
          <div className="mb-4">
            <div className="humi-eyebrow">{section.process}</div>
            <h3 id={`sta181-${section.id}`} className="mt-1 text-base font-semibold text-ink">
              {section.section}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {section.fields.map((field) => {
              const value = values[field.key] ?? ''
              return (
                <fieldset key={field.key}>
                  <label htmlFor={field.key} className="humi-label">
                    {field.label}
                  </label>
                  <input
                    id={field.key}
                    type={field.kind ?? 'text'}
                    value={value}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    className="humi-input w-full max-w-sm"
                  />
                </fieldset>
              )
            })}
          </div>
        </section>
      ))}
    </section>
  )
}
