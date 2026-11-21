import React from 'react';
import { useApp } from '../contexts/AppContext';
import MIPrOMPTLibraryView from '../components/MIPrOMPTLibraryView';

/**
 * mIPrOMPT library route (/miprompt). Loaded on demand.
 * Selecting a prompt seeds the Studio builder and navigates to /studio.
 */
const MIPrOMPTRoute: React.FC = () => {
  const {
    addMIPrOMPT,
    deleteMIPrOMPT,
    go,
    importCSV,
    miprompts,
    setSelectedMIPrOMPT,
    theme,
    updateMIPrOMPT,
  } = useApp();

  return (
    <div className="h-full w-full relative" data-theme={theme}>
      <MIPrOMPTLibraryView
        miprompts={miprompts}
        onAdd={addMIPrOMPT}
        onUpdate={updateMIPrOMPT}
        onDelete={deleteMIPrOMPT}
        onImport={importCSV}
        onSelectPrompt={(item) => {
          setSelectedMIPrOMPT({ type: item.type, content: item.content });
          go('studio');
        }}
      />
      <button
        onClick={() => go('library')}
        className="absolute top-8 left-8 p-3 bg-app-panel text-app-text rounded-full shadow-lg hover:bg-app-card border border-app-border z-50 transition-transform hover:scale-105"
        title="Back to Library"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
    </div>
  );
};

export default MIPrOMPTRoute;
