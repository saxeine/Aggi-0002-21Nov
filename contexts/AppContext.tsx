import React, { createContext, useContext } from 'react';
import { useAppState, type AppState } from '../hooks/useAppState';

/**
 * Shared app state available to every routed view.
 *
 * The provider must be rendered inside the router, because navigation
 * (`viewMode` / `go`) is derived from the current location.
 */
const AppContext = createContext<AppState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp() must be used inside <AppProvider>');
  }
  return ctx;
};

export type { AppState };
