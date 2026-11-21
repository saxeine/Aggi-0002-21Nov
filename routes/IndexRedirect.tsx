import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import RouteFallback from './RouteFallback';
import { VIEW_PATHS } from '../navigation';

/**
 * "/" used to be decided imperatively (library if sessions exist, else the
 * workspace). Doing it as a redirect keeps deep links such as /studio intact.
 */
const IndexRedirect: React.FC = () => {
  const { isStorageInitialized, sessions } = useApp();

  if (!isStorageInitialized) {
    return <RouteFallback />;
  }

  return <Navigate to={sessions.length > 0 ? VIEW_PATHS.library : VIEW_PATHS.workspace} replace />;
};

export default IndexRedirect;
