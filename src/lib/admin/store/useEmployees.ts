// useEmployees.ts — Zustand store สำหรับ Employee List (S2)
//
// SSoT สำหรับ 1K mock employees + search filter + in-memory patch.
// S3 (Employee Profile) consumes getById(id).
// S5 (Edit form — Wave 2) consumes updateEmployee(id, patch).
//
// ห้าม persist ไปยัง localStorage — mock data is ephemeral.
// ห้าม real API calls ในไฟล์นี้.

import { create } from 'zustand'
import { MOCK_EMPLOYEES, type MockEmployee } from '@/mocks/employees'

// ──────────────────────────────────────────────
// State interface
// ──────────────────────────────────────────────

export interface EmployeesState {
  all: MockEmployee[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  getById: (id: string) => MockEmployee | undefined
  getFiltered: () => MockEmployee[]
  // S5 Wave 2 contract — in-memory patch stub.
  // S5 Edit form will call: updateEmployee(id, { status: 'active', ... })
  updateEmployee: (id: string, patch: Partial<MockEmployee>) => void
  // Bulk-import contract (Module Import/Export, 2026-05) — the import wizard
  // "commit" step calls this with partial rows parsed from a CSV. Each partial
  // must carry employee_id; missing fields are filled with mock defaults so the
  // list/table renders without a real backend. Existing ids are patched
  // (incremental upsert), new ids are prepended.
  importEmployees: (rows: Array<Partial<MockEmployee> & { employee_id: string }>) => void
}

// Defaults applied to imported rows so a partial CSV row becomes a renderable
// MockEmployee. MOCKUP only — never a real persistence layer.
function fillEmployeeDefaults(
  row: Partial<MockEmployee> & { employee_id: string },
): MockEmployee {
  return {
    first_name_th: '',
    last_name_th: '',
    first_name_en: '',
    last_name_en: '',
    employee_class: 'PERMANENT',
    hire_date: new Date().toISOString().slice(0, 10),
    company: 'CEN',
    org_unit: '',
    position_title: '',
    probation_status: 'in_probation',
    status: 'active',
    ...(row as Partial<MockEmployee>),
  } as MockEmployee
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useEmployees = create<EmployeesState>()((set, get) => ({
  all: MOCK_EMPLOYEES,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),

  getById: (id) => get().all.find((e) => e.employee_id === id),

  getFiltered: () => {
    const { all, searchQuery } = get()
    const q = searchQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (e) =>
        e.first_name_th.toLowerCase().includes(q) ||
        e.last_name_th.toLowerCase().includes(q) ||
        e.first_name_en.toLowerCase().includes(q) ||
        e.last_name_en.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().startsWith(q),
    )
  },

  // S5 Wave 2 consumer: call with (id, patch) to update in-memory record.
  // Real API integration will replace this action body — interface stays stable.
  updateEmployee: (id, patch) =>
    set((state) => ({
      all: state.all.map((e) =>
        e.employee_id === id ? { ...e, ...patch } : e,
      ),
    })),

  importEmployees: (rows) =>
    set((state) => {
      const byId = new Map(state.all.map((e) => [e.employee_id, e]))
      for (const row of rows) {
        const existing = byId.get(row.employee_id)
        byId.set(
          row.employee_id,
          existing ? { ...existing, ...row } : fillEmployeeDefaults(row),
        )
      }
      // Newly-added ids (not in original list) go first so they're visible.
      const originalIds = new Set(state.all.map((e) => e.employee_id))
      const added = rows
        .filter((r) => !originalIds.has(r.employee_id))
        .map((r) => byId.get(r.employee_id)!)
      const rest = state.all.map((e) => byId.get(e.employee_id)!)
      return { all: [...added, ...rest] }
    }),
}))
