import React from 'react';
import { useApp } from '../contexts/AppContext';
import MaggiView from '../components/MaggiView';

/**
 * Maggi route (/maggi). Loaded on demand — Maggi ships its own retrieval
 * store, chat UI and provider settings.
 */
const MaggiRoute: React.FC = () => {
  const {
    activeSession,
    addTextItem,
    go,
    settings,
    theme,
  } = useApp();

  return (
    <div className="h-full w-full relative" data-theme={theme}>
      <MaggiView
        onBack={() => go('library')}
        workspaceName={activeSession?.name}
        workspaceItems={(activeSession?.mediaItems ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          mimeType: m.mimeType,
          data: m.data,
        }))}
        onSaveToSession={(title, content) => {
          addTextItem(title, content);
        }}
      />
    </div>
  );
};

export default MaggiRoute;
