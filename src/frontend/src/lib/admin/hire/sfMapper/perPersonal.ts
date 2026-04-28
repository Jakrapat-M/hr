// SF entity: PerPersonal — Personal Information
// API verb: UPSERT
// Phase: 1 (mapper foundation)
// Source: plan v2 §2.3, errata Round 2
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerPersonalMapper: PortletMapper = {
  entity: 'PerPersonal',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '9 mandatory: salutation/customString1/firstName/lastName/customString2/customString3/nationality/startDate/secondLastName',
        'customString5=Military Status (REMAP from biographical.militaryStatus per errata round 2)',
        'customString6=Blood Type (REMAP from biographical.bloodType)',
        'customString14=Foreigner DERIVED via deriveForeignerFlag(biographical.nationality)',
        'DO NOT write customString13 (it is sys_EC-PY_MiddlennameEN)',
      ],
      1,
    )
  },
}
