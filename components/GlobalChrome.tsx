import React, { Suspense, lazy } from 'react';
import { useApp } from '../contexts/AppContext';

// Only pulled in the first time a modal is opened.
const SessionModal = lazy(() => import('./SessionModal'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));

/**
 * Modals that belong to the app shell rather than a single view.
 * Both used to be duplicated in every view branch of App.tsx.
 */
const GlobalChrome: React.FC = () => {
  const {
    theme,
    setTheme,
    settings,
    setSettings,
    voiceSettings,
    setVoiceSettings,
    castLibrary,
    addCastMember,
    updateCastMember,
    deleteCastMember,
    resetLibrary,
    touchedRoles,
    setTouchedRoles,
    isSettingsOpen,
    setIsSettingsOpen,
    activeSettingsTab,
    go,
    isModalOpen,
    setIsModalOpen,
    handleCreateSession,
    newSessionDefaultName,
    sessions,
  } = useApp();

  return (
    <>
      {isModalOpen && (
        <Suspense fallback={null}>
          <SessionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreate={handleCreateSession}
            defaultValue={newSessionDefaultName}
            sessions={sessions}
          />
        </Suspense>
      )}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentTheme={theme}
            onSetTheme={setTheme}
            settings={settings}
            onUpdateSettings={setSettings}
            initialTab={activeSettingsTab}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={setVoiceSettings}
            onTouchRole={(role) => setTouchedRoles((prev) => (prev.includes(role) ? prev : [...prev, role]))}
            castLibrary={castLibrary}
            onAddCastMember={addCastMember}
            onUpdateCastMember={updateCastMember}
            onDeleteCastMember={deleteCastMember}
            onResetLibrary={resetLibrary}
            onOpenMaggi={() => {
              setIsSettingsOpen(false);
              go('maggi');
            }}
          />
        </Suspense>
      )}
    </>
  );
};

export default GlobalChrome;
