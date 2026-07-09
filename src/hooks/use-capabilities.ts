'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  resolveCapabilities,
  canSee,
  canDo,
  type CapabilityBundle,
  type Entity,
  type Action,
} from '@/lib/capabilities';

export interface UseCapabilitiesResult extends CapabilityBundle {
  canSee: (entity: Entity) => boolean;
  canDo: (action: Action) => boolean;
}

/** Reactive capability bundle resolved from the active persona's roles. */
export function useCapabilities(): UseCapabilitiesResult {
  const roles = useAuthStore((s) => s.roles);

  return useMemo(() => {
    const bundle = resolveCapabilities(roles);
    return {
      ...bundle,
      canSee: (entity: Entity) => canSee(bundle, entity),
      canDo: (action: Action) => canDo(bundle, action),
    };
  }, [roles]);
}
