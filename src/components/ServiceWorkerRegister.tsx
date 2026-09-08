'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[Minto PWA] Service Worker registered:', reg.scope))
        .catch((err) => console.warn('[Minto PWA] Service Worker failed:', err));
    }
  }, []);

  return null;
}
