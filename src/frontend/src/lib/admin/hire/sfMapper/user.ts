// SF entity: User — SF user account (CREATE on hire)
// API verb: CREATE
// Phase: 1 (mapper foundation)
// Source: plan v2 §2.14, errata round 3, CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const UserMapper: PortletMapper = {
  entity: 'User',
  verb: 'CREATE',
  build(_input) {
    return pending(
      [
        '6 mandatory: cust_firstNameTH, cust_lastNameTH, cust_prefixTH, cust_workingLocation, status, userId — all DERIVED from PerPersonal/EmpJob',
        '8 denormalized: cust_religion, cust_disability, nickname, nicknamelocal, etc.',
        'Religion writes to BOTH User.cust_religion AND PerGlobalInfoTHA.genericString5 (denormalization per errata round 3)',
        'Username DERIVED via deriveUsername (Q5: from primary email)',
      ],
      1,
    )
  },
}
