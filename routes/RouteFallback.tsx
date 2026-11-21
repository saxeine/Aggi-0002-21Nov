import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Suspense fallback shown while a lazily-loaded view chunk is fetched.
 * Kept tiny and theme-aware so the transition never flashes white.
 */
const RouteFallback: React.FC<{ label?: string }> = ({ label }) => {
  const { t } = useLanguage();
  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center gap-4 bg-app-bg text-app-text"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-app-text border-t-transparent" />
      <p className="text-sm font-semibold tracking-wide text-app-muted">
        {label ?? t('nav.loading')}
      </p>
    </div>
  );
};

export default RouteFallback;
