import React from 'react';
import { useApp } from '../contexts/AppContext';
import { MediaSuiteView } from '../components/MediaSuiteView';

/**
 * Media Suite route (/media). Loaded on demand — pulls in the media tools
 * plus the nested SXA Board / FilmStrip / AniComposer / MagicLayers apps.
 */
const MediaRoute: React.FC = () => {
  const {
    activeSession,
    addMIPrOMPT,
    deleteMIPrOMPT,
    go,
    handleToolAction,
    importCSV,
    isAnyToolLoading,
    isLoading,
    miprompts,
    sessions,
    theme,
    updateActiveSession,
    updateMIPrOMPT,
  } = useApp();

  return (
    <div className="h-full w-full relative" data-theme={theme}>
      <MediaSuiteView
        onBack={() => go('library')}
        session={activeSession}
        sessions={sessions}
        onSaveArtifact={(item) => {
          if (activeSession) {
            updateActiveSession((s) => ({
              ...s,
              mediaItems: [item, ...s.mediaItems],
              selectedMediaIds: [...s.selectedMediaIds, item.id],
            }));
            const sourceTypeName = item.type === 'pdf' ? 'PDF source' : 'text source';
            alert(`"${item.name}" saved as a ${sourceTypeName} in the active workspace!`);
          }
        }}
        onRunTool={handleToolAction}
        miprompts={miprompts}
        onAddMIPrOMPT={addMIPrOMPT}
        onUpdateMIPrOMPT={updateMIPrOMPT}
        onDeleteMIPrOMPT={deleteMIPrOMPT}
        onImportCSV={importCSV}
        currentTheme={theme}
        isLoading={isAnyToolLoading}
      />
    </div>
  );
};

export default MediaRoute;
