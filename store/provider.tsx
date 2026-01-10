'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './index';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // Use useRef to ensure store is only created once on the client
  const storeRef = useRef(store);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
