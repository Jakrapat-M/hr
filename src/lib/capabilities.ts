// lib/capabilities.ts — field-level RBAC layer on top of rbac.ts.
//
// Source of truth: extracted-context-2026-05-02/01-sf-system-baseline.md §3
// (75 entities × 4 personas = 300 OData probes against the live SF system).
//
// rbac.ts handles MODULE-level access. This file handles FIELD-level + action
// capability bundles needed for the Approver shell (Manager/SPD/HRBP look the
// same but see different fields and own different actions).

import type { Role } from './rbac';

/** Entities that have differential RBAC across personas in SF. */
export type Entity =
  | 'BenefitEmployeeClaim'
  | 'EmpEmployment'
  | 'EmpJob'
  | 'EmpCompensation'
  | 'PerPerson'
  | 'PerPersonal'
  | 'PerNationalId'
  | 'Background' // Background_Certificates, Background_PreferredNextMove, etc.
  | 'Foundation' // FOCompany, FODepartment, FOEventReason — universal-read
  | 'WfRequest'; // workflow request inbox

/** Coarse visibility tier per entity. Use `hiddenFields` for finer control. */
export type Visibility = 'full' | 'partial' | 'hidden';

/** Capability actions an actor can perform in the Approver/Admin shells. */
export type Action =
  | 'view'
  | 'edit'
  | 'approve'
  | 'bulkApprove'
  | 'reroute'
  | 'override'
  | 'talentSearch'
  | 'editFoundation'
  | 'systemConfig';

/** Where the actor's queue/list pulls data from. */
export type QueueScope = 'self' | 'team' | 'company' | 'enterprise';

export interface CapabilityBundle {
  entities: Record<Entity, Visibility>;
  actions: Record<Action, boolean>;
  queueScope: QueueScope;
}

const ZERO_ENTITIES: Record<Entity, Visibility> = {
  BenefitEmployeeClaim: 'hidden',
  EmpEmployment: 'hidden',
  EmpJob: 'hidden',
  EmpCompensation: 'hidden',
  PerPerson: 'hidden',
  PerPersonal: 'hidden',
  PerNationalId: 'hidden',
  Background: 'hidden',
  Foundation: 'hidden',
  WfRequest: 'hidden',
};

const ZERO_ACTIONS: Record<Action, boolean> = {
  view: false,
  edit: false,
  approve: false,
  bulkApprove: false,
  reroute: false,
  override: false,
  talentSearch: false,
  editFoundation: false,
  systemConfig: false,
};

// IMPORTANT: `entities` here governs CROSS-EMPLOYEE (approver/admin) visibility.
// Self-scoped data (e.g. own claims, own profile) is filtered via queueScope +
// query scoping, NOT via this gate. Employees therefore have all entities hidden
// in the cross-context layer — they can still see their OWN data through scoped
// queries. This separation lets us merge Manager+Employee roles without giving
// Manager visibility on others' BenefitEmployeeClaim through role inheritance.
const EMPLOYEE: CapabilityBundle = {
  entities: {
    ...ZERO_ENTITIES,
    Foundation: 'full', // universal read — orgs, departments, picklists
  },
  actions: { ...ZERO_ACTIONS, view: true },
  queueScope: 'self',
};

// Manager: hard-blocked from 10 sensitive entities incl. BenefitEmployeeClaim.
// Per SF probe data — Manager sees 0 fields on BenefitEmployeeClaim,
// EmpCompensation, PerNationalId, PerPerson, all Background_*.
const MANAGER: CapabilityBundle = {
  entities: {
    ...ZERO_ENTITIES,
    EmpEmployment: 'partial', // direct reports
    EmpJob: 'partial',
    Foundation: 'full',
    WfRequest: 'partial', // team queue
    PerPersonal: 'partial', // limited to non-PII
  },
  actions: {
    ...ZERO_ACTIONS,
    view: true,
    approve: true, // single-claim approve, non-BE workflows only
  },
  queueScope: 'team',
};

// SPD: 17-entity restricted subset of HR Admin. No Background/Talent.
const SPD: CapabilityBundle = {
  entities: {
    ...ZERO_ENTITIES,
    BenefitEmployeeClaim: 'partial', // 38f
    EmpEmployment: 'partial',
    EmpJob: 'partial', // 83/135 fields
    EmpCompensation: 'partial',
    PerPerson: 'full',
    PerPersonal: 'full',
    PerNationalId: 'partial',
    Foundation: 'full',
    WfRequest: 'full',
    // Background remains hidden for SPD
  },
  actions: {
    ...ZERO_ACTIONS,
    view: true,
    edit: true,
    approve: true,
    bulkApprove: true,
    reroute: true,
    override: true,
  },
  // Two-axis scope model (do NOT add a 'bu' member to QueueScope):
  //   1) queueScope = coarse approver-queue tier. SPD's `company` = all-employees
  //      superset (final approver reads the whole company queue).
  //   2) data-row scope (which employee ROWS the persona sees) is a separate axis
  //      in scope-filter.ts: pickScopeMode(['spd']) === 'all'.
  queueScope: 'company',
};

// HRBP: full HR-Admin parity on EmpEmployment, EmpJob, PerPersonal,
// Background_PreferredNextMove. Adds Talent Search.
const HRBP: CapabilityBundle = {
  entities: {
    ...ZERO_ENTITIES,
    BenefitEmployeeClaim: 'partial', // 38f (vs HR Admin 47f)
    EmpEmployment: 'full',
    EmpJob: 'full',
    EmpCompensation: 'full',
    PerPerson: 'full',
    PerPersonal: 'full',
    PerNationalId: 'full',
    Background: 'full',
    Foundation: 'full',
    WfRequest: 'full',
  },
  actions: {
    ...ZERO_ACTIONS,
    view: true,
    edit: true,
    approve: true,
    bulkApprove: true,
    reroute: true,
    override: true,
    talentSearch: true,
  },
  // Two-axis scope model (do NOT add a 'bu' member to QueueScope):
  //   1) queueScope = coarse approver-queue tier. HRBP's `company` = coarse read
  //      of the company approver queue.
  //   2) data-row scope (which employee ROWS the persona sees) is a separate axis
  //      in scope-filter.ts: pickScopeMode(['hrbp']) === 'bu' (BU-limited rows).
  queueScope: 'company',
};

const HR_ADMIN: CapabilityBundle = {
  entities: {
    BenefitEmployeeClaim: 'full',
    EmpEmployment: 'full',
    EmpJob: 'full',
    EmpCompensation: 'full',
    PerPerson: 'full',
    PerPersonal: 'full',
    PerNationalId: 'full',
    Background: 'full',
    Foundation: 'full',
    WfRequest: 'full',
  },
  actions: {
    ...ZERO_ACTIONS,
    view: true,
    edit: true,
    approve: true,
    bulkApprove: true,
    reroute: true,
    override: true,
    editFoundation: true,
  },
  queueScope: 'enterprise',
};

// HRIS Admin (hr_manager role here) = HR Admin + system config.
// Owns Admin Centre, Data Model, Picklist Centre, Workflow Config, RBAC editor.
const HRIS_ADMIN: CapabilityBundle = {
  entities: HR_ADMIN.entities,
  actions: { ...HR_ADMIN.actions, systemConfig: true },
  queueScope: 'enterprise',
};

const BUNDLES: Record<Role, CapabilityBundle> = {
  employee: EMPLOYEE,
  manager: MANAGER,
  spd: SPD,
  hrbp: HRBP,
  hr_admin: HR_ADMIN,
  hr_manager: HRIS_ADMIN,
};

const VISIBILITY_RANK: Record<Visibility, number> = {
  hidden: 0,
  partial: 1,
  full: 2,
};

/** Merge two visibility tiers — higher wins. */
function mergeVisibility(a: Visibility, b: Visibility): Visibility {
  return VISIBILITY_RANK[a] >= VISIBILITY_RANK[b] ? a : b;
}

/** Resolve the effective capability bundle for a user with N roles. */
export function resolveCapabilities(roles: Role[]): CapabilityBundle {
  if (roles.length === 0) {
    return {
      entities: { ...ZERO_ENTITIES },
      actions: { ...ZERO_ACTIONS },
      queueScope: 'self',
    };
  }

  const merged: CapabilityBundle = {
    entities: { ...ZERO_ENTITIES },
    actions: { ...ZERO_ACTIONS },
    queueScope: 'self',
  };

  const scopeRank: QueueScope[] = ['self', 'team', 'company', 'enterprise'];

  for (const role of roles) {
    const bundle = BUNDLES[role];
    if (!bundle) continue;

    for (const entity of Object.keys(bundle.entities) as Entity[]) {
      merged.entities[entity] = mergeVisibility(
        merged.entities[entity],
        bundle.entities[entity],
      );
    }
    for (const action of Object.keys(bundle.actions) as Action[]) {
      merged.actions[action] = merged.actions[action] || bundle.actions[action];
    }
    if (scopeRank.indexOf(bundle.queueScope) > scopeRank.indexOf(merged.queueScope)) {
      merged.queueScope = bundle.queueScope;
    }
  }

  return merged;
}

/** Convenience checks. */
export function canSee(caps: CapabilityBundle, entity: Entity): boolean {
  return caps.entities[entity] !== 'hidden';
}

export function canDo(caps: CapabilityBundle, action: Action): boolean {
  return caps.actions[action] === true;
}
