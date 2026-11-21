import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { VIEW_PATHS } from '../navigation';

const NotFoundRoute: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-app-bg text-app-text p-10">
      <h1 className="text-2xl font-bold">{t('nav.notFound')}</h1>
      <Link
        to={VIEW_PATHS.library}
        className="px-4 py-2 rounded-lg border border-app-border bg-app-panel hover:bg-app-card text-sm font-semibold transition-colors"
      >
        {t('nav.backToLibrary')}
      </Link>
    </div>
  );
};

export default NotFoundRoute;
