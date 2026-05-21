'use client';

import { useEffect } from 'react';
import { useProgressStore } from '@/stores/progress-store';

export function StoreHydration() {
  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);
  return null;
}
