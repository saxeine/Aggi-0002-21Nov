import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import GlobalChrome from './components/GlobalChrome';
import LibraryRoute from './routes/LibraryRoute';
import IndexRedirect from './routes/IndexRedirect';
import NotFoundRoute from './routes/NotFoundRoute';
import RouteFallback from './routes/RouteFallback';
import { VIEW_PATHS } from './navigation';

/**
 * Heavy views are split into their own chunks. Each route module owns the
 * view plus its tool set, so opening /library never downloads the Studio,
 * Office, Media, Finance, Maggi or SXA Board bundles.
 */
const WorkspaceRoute = lazy(() => import('./routes/WorkspaceRoute'));
const StudioRoute = lazy(() => import('./routes/StudioRoute'));
const OfficeToolsRoute = lazy(() => import('./routes/OfficeToolsRoute'));
const MediaRoute = lazy(() => import('./routes/MediaRoute'));
const MIPrOMPTRoute = lazy(() => import('./routes/MIPrOMPTRoute'));
const FinanceRoute = lazy(() => import('./routes/FinanceRoute'));
const MaggiRoute = lazy(() => import('./routes/MaggiRoute'));
const SxaBoardRoute = lazy(() => import('./routes/SxaBoardRoute'));

/**
 * Holds the UI until persisted sessions/settings have been restored, so a
 * deep link never paints an "empty" workspace first.
 */
const StorageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isStorageInitialized } = useApp();
  if (!isStorageInitialized) return <RouteFallback />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <AppProvider>
    <StorageGate>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path={VIEW_PATHS.library} element={<LibraryRoute />} />
          <Route path={VIEW_PATHS.workspace} element={<WorkspaceRoute />} />
          <Route path={VIEW_PATHS.studio} element={<StudioRoute />} />
          <Route path={VIEW_PATHS.office_tools} element={<OfficeToolsRoute />} />
          <Route path={VIEW_PATHS.media} element={<MediaRoute />} />
          <Route path={VIEW_PATHS.miprompt} element={<MIPrOMPTRoute />} />
          <Route path={VIEW_PATHS.finance} element={<FinanceRoute />} />
          <Route path={VIEW_PATHS.maggi} element={<MaggiRoute />} />
          <Route path={VIEW_PATHS.sxa_board} element={<SxaBoardRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </Suspense>
    </StorageGate>
    <GlobalChrome />
  </AppProvider>
);

export default App;
