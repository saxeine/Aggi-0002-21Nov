import React from 'react';
import { useApp } from '../contexts/AppContext';
import SxaBoardApp from '../src/media_suite/SxaBoardTool/App';

/**
 * SXA Board route (/sxa_board). Loaded on demand — the storyboard tool has
 * its own canvas, PDF export and asset pipeline.
 */
const SxaBoardRoute: React.FC = () => {
  const {
    activeSession,
    go,
    updateActiveSession,
  } = useApp();

  return (
    <SxaBoardApp
      onBack={() => go('library')}
      activeSession={activeSession}
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
    />
  );
};

export default SxaBoardRoute;
