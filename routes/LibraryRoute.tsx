import React from 'react';
import { useApp } from '../contexts/AppContext';
import LibraryView from '../components/LibraryView';

/**
 * Library route (/library) — the home screen.
 * Kept in the initial bundle: it is the first paint for returning users.
 */
const LibraryRoute: React.FC = () => {
  const {
    combineSessions,
    go,
    handleDeleteSession,
    handleOpenCreateSessionModal,
    handleSelectSession,
    renameSession,
    reorderSessions,
    sessions,
    theme,
    toggleSettings,
  } = useApp();

  return (
    <div className="h-full w-full relative" data-theme={theme}>
      <LibraryView
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onCreateSession={handleOpenCreateSessionModal}
        onDeleteSession={handleDeleteSession}
        onRenameSession={renameSession}
        onReorderSession={reorderSessions}
        onCombineSessions={(ids, name, description) => {
          const newSession = combineSessions(ids, name, description);
          if (newSession) {
            go('studio');
          }
        }}
        onOpenSettings={() => toggleSettings('ai')}
        onOpenStudio={() => go('studio')}
        onOpenOfficeTools={() => go('office_tools')}
        onOpenMedia={() => go('media')}
        onOpenMIPrOMPT={() => go('miprompt')}
        onOpenFinance={() => go('finance')}
        onOpenMaggi={() => go('maggi')}
      />
    </div>
  );
};

export default LibraryRoute;
