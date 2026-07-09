// storeBrandFormat.ts — Store Brand/Format picklist (STA-82 A1)
// BA: Organization Extras. Describes the physical store format (size + concept).
import type { PicklistDefinition } from './types'

export const STORE_BRAND_FORMAT_OPTIONS: PicklistDefinition = [
  { id: 'HYPERMARKET', labelTh: 'Hypermarket', labelEn: 'Hypermarket' },
  { id: 'SUPERMARKET', labelTh: 'Supermarket', labelEn: 'Supermarket' },
  { id: 'CONVENIENCE', labelTh: 'ร้านสะดวกซื้อ', labelEn: 'Convenience' },
  { id: 'PREMIUM_GROCERY', labelTh: 'Premium Grocery', labelEn: 'Premium Grocery' },
  { id: 'FOOD_HALL', labelTh: 'Food Hall', labelEn: 'Food Hall' },
  { id: 'DEPT_STORE', labelTh: 'ห้างสรรพสินค้า', labelEn: 'Department Store' },
  { id: 'WAREHOUSE_DC', labelTh: 'คลังสินค้า/ศูนย์กระจาย', labelEn: 'Warehouse / DC' },
  { id: 'HQ_OFFICE', labelTh: 'สำนักงาน', labelEn: 'Office' },
] as const
