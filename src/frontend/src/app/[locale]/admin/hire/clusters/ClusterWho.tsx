'use client'

// ClusterWho.tsx — Cluster 1 of 3 (Identity + Biographical = "ข้อมูลส่วนบุคคล")
// Matches WIZARD_STEPS Step 1 promise: "ระบุตัวตน • ชื่อ • บัตรประชาชน • ประวัติ"
// StepIdentity      = BA Identity rows 1-19 (รหัสพนักงานระบบกำหนด)
// StepBiographical  = BA Personal Info rows 2-17 (12 mandatory)
// DEF-02/03/05: onValidChange from each step wires Zod refine results into store
import { useCallback } from 'react'
import StepIdentity from '../steps/StepIdentity'
import StepBiographical from '../steps/StepBiographical'
import StepContact from '../steps/StepContact'
import StepEmergencyContacts from '../steps/StepEmergencyContacts'
import StepGlobalInfo from '../steps/StepGlobalInfo'
import StepWorkPermit from '../steps/StepWorkPermit'
import StepDependents from '../steps/StepDependents'
import { SectionHeader } from '@/components/admin/wizard/SectionHeader'
import { Fingerprint, User2, Phone, AlertCircle, Globe, FileText, Users } from 'lucide-react'
import { useHireWizard } from '@/lib/admin/store/useHireWizard'

export default function ClusterWho() {
  const setStepValidity = useHireWizard((s) => s.setStepValidity)
  // Stable callbacks — required, otherwise child useEffect deps change every render and loop
  const onIdentityValid = useCallback((v: boolean) => setStepValidity('identity', v), [setStepValidity])
  const onBiographicalValid = useCallback((v: boolean) => setStepValidity('biographical', v), [setStepValidity])
  const onEmergencyContactsValid = useCallback((v: boolean) => setStepValidity('emergencyContacts', v), [setStepValidity])
  const onGlobalInfoValid = useCallback((v: boolean) => setStepValidity('globalInfo', v), [setStepValidity])
  const onWorkPermitValid = useCallback((v: boolean) => setStepValidity('workPermit', v), [setStepValidity])
  const onDependentsValid = useCallback((v: boolean) => setStepValidity('dependents', v), [setStepValidity])

  return (
    <div className="space-y-5">
      <div className="humi-card">
        <SectionHeader
          icon={Fingerprint}
          eyebrow="ระบุตัวตน"
          title="ข้อมูลระบุตัวตน"
          sub="วันที่เริ่มงาน บริษัท ชื่อ วันเกิด บัตรประชาชน"
        />
        <div className="humi-step-section">
          <StepIdentity onValidChange={onIdentityValid} />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={User2}
          eyebrow="ประวัติส่วนตัว"
          title="ข้อมูลส่วนตัว"
          sub="ชื่อท้องถิ่น ชื่อเล่น เพศ สัญชาติ กรุ๊ปเลือด สถานภาพสมรส"
        />
        <div className="humi-step-section">
          <StepBiographical onValidChange={onBiographicalValid} />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={Phone}
          eyebrow="ข้อมูลติดต่อ"
          title="ข้อมูลการติดต่อ"
          sub="เบอร์โทร อีเมล บุคคลที่เกี่ยวข้อง"
        />
        <div className="humi-step-section">
          <StepContact />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={AlertCircle}
          eyebrow="ผู้ติดต่อฉุกเฉิน"
          title="ผู้ติดต่อฉุกเฉิน / Emergency Contacts"
          sub="ชื่อ ความสัมพันธ์ เบอร์โทร ที่อยู่ (ถ้ามี)"
        />
        <div className="humi-step-section">
          <StepEmergencyContacts onValidChange={onEmergencyContactsValid} />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={Globe}
          eyebrow="ข้อมูลทั่วไป"
          title="ข้อมูลทั่วไป / Global Information"
          sub="ศาสนา จำนวนบุตร สถานะความพิการ เลขบัตรคู่สมรส ข้อมูลเพิ่มเติม"
        />
        <div className="humi-step-section">
          <StepGlobalInfo onValidChange={onGlobalInfoValid} />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={FileText}
          eyebrow="ใบอนุญาตทำงาน"
          title="ใบอนุญาตทำงาน / Work Permit"
          sub="ประเภทเอกสาร เลขที่ ประเทศ วันออก วันหมดอายุ (สำหรับชาวต่างชาติเท่านั้น)"
        />
        <div className="humi-step-section">
          <StepWorkPermit onValidChange={onWorkPermitValid} />
        </div>
      </div>

      <div className="humi-card">
        <SectionHeader
          icon={Users}
          eyebrow="บุคคลในอุปการะ"
          title="บุคคลในอุปการะ / Dependents"
          sub="คู่สมรส บุตร บิดามารดา (ถ้ามี) — สูงสุด 10 คน"
        />
        <div className="humi-step-section">
          <StepDependents onValidChange={onDependentsValid} />
        </div>
      </div>

      <p className="humi-required-note">
        <span className="humi-asterisk">*</span>
        ช่องที่บังคับกรอก
      </p>
    </div>
  )
}
