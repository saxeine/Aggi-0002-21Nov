import React from 'react';
import { useApp } from '../contexts/AppContext';
import OfficeTools from '../components/OfficeTools';

/**
 * Office Tools route (/office_tools). Loaded on demand — ~2,600 lines of
 * office/document generators plus their own tool registry.
 */
const OfficeToolsRoute: React.FC = () => {
  const {
    activeSession,
    addCastMember,
    addMIPrOMPT,
    addPrompt,
    castLibrary,
    deleteCastMember,
    deleteMIPrOMPT,
    generatedAudio,
    go,
    handleLoadAudio,
    handleRegenerate,
    handleRemoveMedia,
    handleRenameMediaItem,
    handleSaveAudio,
    handleToolAction,
    isAnyToolLoading,
    isCastLibraryOpen,
    isLoading,
    miprompts,
    previewCode,
    prompts,
    removePrompt,
    selectedMIPrOMPT,
    sessions,
    setIsCastLibraryOpen,
    setPreviewCode,
    setSelectedMIPrOMPT,
    setTouchedRoles,
    setVoiceSettings,
    theme,
    touchedRoles,
    updateActiveSession,
    updateCastMember,
    updateMIPrOMPT,
    voiceSettings,
  } = useApp();

  return (
    <div className="h-full w-full relative" data-theme={theme}>
      <OfficeTools
        onBack={() => go('library')}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={setVoiceSettings}
        onRunTool={handleToolAction}
        isLoading={isAnyToolLoading}
        hasActiveSession={!!activeSession}
        session={activeSession}
        sessions={sessions}
        previewCode={previewCode}
        onClosePreview={() => setPreviewCode(null)}
        generatedAudio={generatedAudio}
        onSaveAudio={handleSaveAudio}
        onLoadAudio={handleLoadAudio}
        onRemoveMediaItem={handleRemoveMedia}
        onRenameMediaItem={handleRenameMediaItem}
        onRegenerate={handleRegenerate}
        prompts={prompts}
        onAddPrompt={addPrompt}
        onDeletePrompt={removePrompt}
        castLibrary={castLibrary}
        onAddCastMember={addCastMember}
        onUpdateCastMember={updateCastMember}
        onDeleteCastMember={deleteCastMember}
        isCastLibraryOpen={isCastLibraryOpen}
        setIsCastLibraryOpen={setIsCastLibraryOpen}
        touchedRoles={touchedRoles}
        setTouchedRoles={setTouchedRoles}
        miprompts={miprompts}
        onAddMIPrOMPT={addMIPrOMPT}
        onUpdateMIPrOMPT={updateMIPrOMPT}
        onDeleteMIPrOMPT={deleteMIPrOMPT}
        initialBuilderData={selectedMIPrOMPT}
        onClearInitialBuilderData={() => setSelectedMIPrOMPT(null)}
        onSaveArtifact={(item) => {
          if (activeSession) {
            updateActiveSession((s) => ({
              ...s,
              mediaItems: [item, ...s.mediaItems],
              selectedMediaIds: [...s.selectedMediaIds, item.id],
            }));
            alert(`"${item.name}" saved as a text source in the active workspace!`);
          }
        }}
      />
    </div>
  );
};

export default OfficeToolsRoute;
