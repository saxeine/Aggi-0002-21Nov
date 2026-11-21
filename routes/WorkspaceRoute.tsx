import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { VIEW_PATHS } from '../navigation';
import MediaPanel from '../components/MediaPanel';
import ChatPanel from '../components/ChatPanel';
import ArtifactPreview from '../components/ArtifactPreview';
import MediaViewer from '../components/MediaViewer';
import MindMapViewer from '../components/MindMapViewer';
import MindMapPopup from '../components/MindMapPopup';
import type { Message } from '../types';
import { getMaggiStore } from '../services/maggi/store';

/**
 * Workspace route — the main window (sources sidebar + chat + preview).
 * This is the view the app boots into for existing sessions, so it stays
 * in the initial bundle while every heavier tool view is lazy-loaded.
 */
const WorkspaceRoute: React.FC = () => {
  const {
    activeSession,
    activeSessionId,
    activeSettingsTab,
    activeSideTab,
    addCharacter,
    addMIPrOMPT,
    addPrompt,
    backgroundTemplateImage,
    characters,
    clearSessionHistory,
    deleteCharacter,
    focusedMediaItem,
    generateSuggestionsForSession,
    go,
    handleAddText,
    handleDeleteSession,
    handleDownloadSession,
    handleExportSession,
    handleFocusMedia,
    handleGenerateReport,
    handleLoadAudio,
    handleMindMapNodeDoubleClick,
    handleOpenAudio,
    handleOpenCreateSessionModal,
    handleRefillSearch,
    handleRefreshMindMap,
    handleRenameMediaItem,
    handleSaveArtifactToSession,
    handleSaveAsSource,
    handleSearchWeb,
    handleSeekMedia,
    handleSend,
    handleToggleMindMap,
    handleToolAction,
    input,
    isFullWidthPreview,
    isLoading,
    isMainPanelCollapsed,
    isMindMapLoading,
    isMindMapOpen,
    isPreviewMinimized,
    isSettingsOpen,
    isSidebarVisible,
    isSourcesPanelOpen,
    isSuggestionsLoading,
    lastUsedBuilder,
    mindMapPopup,
    onAddLink,
    onCombineMedia,
    onFileUpload,
    onRemoveMedia,
    onToggleAllMedia,
    onToggleMedia,
    previewCode,
    prompts,
    removePrompt,
    renameSession,
    sessions,
    setActiveSessionId,
    setActiveSideTab,
    setFocusedMediaItem,
    setInput,
    setIsFullWidthPreview,
    setIsMainPanelCollapsed,
    setIsPreviewMinimized,
    setIsSettingsOpen,
    setIsSidebarVisible,
    setIsSourcesPanelOpen,
    setMindMapPopup,
    setPreviewCode,
    setSettings,
    setTheme,
    setTouchedRoles,
    setVoiceSettings,
    settings,
    theme,
    toggleSettings,
    toolLoadingState,
    touchedRoles,
    triggerSuggestion,
    updateActiveSession,
    updateCharacter,
    updateSessionDescription,
    viewMode,
    voiceSettings,
  } = useApp();

  if (!activeSession) {
    // A deep link to /workspace with nothing stored yet should land on the
    // library (where a session can be created) instead of a dead end.
    if (sessions.length === 0) {
      return <Navigate to={VIEW_PATHS.library} replace />;
    }
    return (
      <div className="bg-app-bg h-full text-app-text p-10 flex items-center justify-center">
        Loading Session...
      </div>
    );
  }

  const isPreviewActive = previewCode || focusedMediaItem;
  
  const chatPanelClasses = `flex flex-col h-full transition-all duration-500 ease-in-out ${
      (!isMindMapOpen && isPreviewActive)
          ? (isPreviewMinimized 
                ? 'w-full opacity-100' 
                : (isFullWidthPreview ? 'w-0 opacity-0 overflow-hidden border-0' : 'w-1/2 border-r border-app-border opacity-100')
            )
          : 'w-full opacity-100'
  }`;

  const previewPanelClasses = `
      bg-app-bg border-l border-app-border transition-all duration-500 ease-in-out
      ${isMindMapOpen 
          ? 'fixed top-0 right-0 bottom-0 w-[50%] z-40 shadow-2xl' 
          : (isPreviewMinimized 
              ? 'fixed bottom-4 right-4 w-0 h-0 opacity-0 pointer-events-none overflow-hidden' 
              : (isFullWidthPreview ? 'w-full h-full' : 'w-1/2 h-full')
            )
      }
  `;

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col" data-theme={theme}>
      {theme === 'olive' && backgroundTemplateImage && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out blur-sm opacity-40 scale-105"
          style={{ backgroundImage: `url(data:${backgroundTemplateImage.mimeType};base64,${backgroundTemplateImage.data})` }}
        />
      )}
      
      <div className="absolute inset-0 z-0 bg-app-bg transition-colors duration-300" />

      {isMindMapOpen && (
          <div className="absolute inset-0 z-0 animate-fade-in">
              {activeSession.mindMapData ? (
                <MindMapViewer 
                    data={activeSession.mindMapData} 
                    onClose={handleToggleMindMap} 
                    onNodeDoubleClick={handleMindMapNodeDoubleClick}
                    onRefresh={handleRefreshMindMap}
                    sources={activeSession.mediaItems}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-app-dim bg-app-bg/90">
                     <div className="animate-spin h-10 w-10 border-4 border-app-text border-t-transparent rounded-full mb-4"></div>
                     <p className="animate-pulse">Synthesizing Context Graph...</p>
                </div>
              )}
          </div>
      )}
      
      {isMindMapOpen && isMainPanelCollapsed && (
        <button
          onClick={() => { setIsMainPanelCollapsed(false); setIsSourcesPanelOpen(false); }}
          className="fixed left-0 top-[40%] transform -translate-y-1/2 z-50 bg-transparent text-app-text hover:bg-app-panel/20 rounded-r-lg p-1 transition-all"
          title="Open Chat & Sessions"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
           </svg>
        </button>
      )}

      {isMindMapOpen && !isSourcesPanelOpen && isMainPanelCollapsed && (
         <button
            onClick={() => setIsSourcesPanelOpen(true)}
            className="fixed left-0 top-[45%] transform -translate-y-1/2 z-50 bg-transparent text-cyan-500 hover:bg-app-panel/20 rounded-r-lg p-1 transition-all"
            title="Open Sources Only"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </button>
      )}

      <div 
          className={`
            relative z-30 flex flex-col md:flex-row h-full transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isMindMapOpen ? 'absolute top-0 bottom-0 shadow-2xl border-r border-app-border bg-app-bg/95 backdrop-blur-md' : 'w-full'}
            ${isMindMapOpen ? (isMainPanelCollapsed ? '-translate-x-full' : 'translate-x-0') : ''}
          `}
          style={{ width: '100%' }} 
      >
        {isMindMapOpen && (
             <button 
                onClick={() => setIsMainPanelCollapsed(true)}
                className={`absolute left-4 top-4 w-10 h-10 bg-app-panel border border-app-border rounded-full flex items-center justify-center text-app-text hover:text-blue-400 z-50 shadow-lg`}
                title="Back to Mind Map"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
             </button>
        )}

        <div className={`transition-all duration-500 ease-in-out overflow-hidden flex shrink-0 ${isSidebarVisible ? 'w-full md:w-80' : 'w-0'}`}>
          <MediaPanel 
            activeTab={activeSideTab}
            onTabChange={setActiveSideTab}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitchSession={setActiveSessionId}
            onCreateSession={handleOpenCreateSessionModal}
            onDeleteSession={handleDeleteSession}
            onRenameSession={renameSession}
            onExportSession={handleExportSession}
            activeMediaItems={activeSession.mediaItems} 
            selectedMediaIds={activeSession.selectedMediaIds || []}
            onToggleMedia={onToggleMedia}
            onToggleAllMedia={onToggleAllMedia}
            onFileUpload={onFileUpload}
            onAddLink={onAddLink}
            onAddText={handleAddText}
            onSearchWeb={handleSearchWeb}
            onRefillSearch={handleRefillSearch}
            onRemove={onRemoveMedia}
            onRenameMediaItem={handleRenameMediaItem} // Pass the new handler
            onCombineMedia={onCombineMedia}
            onViewMedia={handleFocusMedia}
            onLoadAudio={handleLoadAudio}
            currentTheme={theme}
            onSetTheme={setTheme}
            settings={settings}
            onUpdateSettings={setSettings}
            onRunTool={handleToolAction}
            toolLoadingState={toolLoadingState}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={setVoiceSettings}
            touchedRoles={touchedRoles}
            setTouchedRoles={setTouchedRoles}
            onGoHome={() => go('library')}
            isSettingsOpen={isSettingsOpen}
            activeSettingsTab={activeSettingsTab}
            onToggleSettings={toggleSettings}
            viewMode={viewMode}
            characters={characters}
            onAddCharacter={addCharacter}
            onUpdateCharacter={updateCharacter}
            onDeleteCharacter={deleteCharacter}
          />
        </div>
        
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row min-w-0">
           <div className={chatPanelClasses}>
              <ChatPanel 
                sessionName={activeSession.name}
                history={activeSession.history}
                isLoading={isLoading}
                input={input}
                setInput={setInput}
                onSend={() => handleSend()}
                suggestions={activeSession.suggestions}
                onSuggestionClick={triggerSuggestion}
                isSuggestionsLoading={isSuggestionsLoading}
                onSeekMedia={handleSeekMedia}
                onPreviewArtifact={(code) => { setPreviewCode(code); setFocusedMediaItem(null); setIsPreviewMinimized(false); if(isMindMapOpen) setIsMainPanelCollapsed(true); setIsFullWidthPreview(false); }}
                onSaveAsSource={handleSaveAsSource}
                onGenerateReport={handleGenerateReport}
                onOpenAudio={handleOpenAudio}
                onClearHistory={() => clearSessionHistory(activeSession.id)}
                onDeleteSession={() => handleDeleteSession(activeSession.id)}
                onDownloadSession={handleDownloadSession}
                onRunTool={handleToolAction}
                toolLoadingState={toolLoadingState}
                prompts={prompts}
                onAddPrompt={addPrompt}
                onDeletePrompt={removePrompt}
                onToggleMindMap={handleToggleMindMap}
                isMindMapLoading={isMindMapLoading}
                activeMediaItems={activeSession.mediaItems.filter(item => activeSession.selectedMediaIds.includes(item.id))}
                isSidebarVisible={isSidebarVisible}
                setIsSidebarVisible={setIsSidebarVisible}
                onRefreshSuggestions={() => generateSuggestionsForSession(activeSession.id, activeSession.mediaItems.filter(item => activeSession.selectedMediaIds.includes(item.id)))}
                sessionDescription={activeSession.description}
                onUpdateDescription={(desc) => updateSessionDescription(activeSession.id, desc)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSaveToMaggi={async (msg: Message, queryText: string) => {
                  const store = getMaggiStore();
                  await store.saveQuery({
                    query: queryText,
                    answer: msg.content,
                    citations: msg.citations,
                    workspaceName: activeSession.name,
                    usage: msg.maggiMeta
                      ? {
                        model: msg.maggiMeta.model,
                        provider: msg.maggiMeta.provider,
                        routedVia: msg.maggiMeta.routedVia,
                      }
                      : undefined,
                  });
                }}
                onEditMessage={(id, newContent) => {
                  updateActiveSession((s) => ({
                    ...s,
                    history: s.history.map(m => m.id === id ? { ...m, content: newContent } : m)
                  }));
                }}
              />
           </div>
           
           {isPreviewActive && (
             <div className={previewPanelClasses}>
                {previewCode ? (
                   <ArtifactPreview 
                      code={previewCode} 
                      theme={theme} 
                      onClose={() => { setPreviewCode(null); setIsFullWidthPreview(false); }} 
                      onMinimize={() => setIsPreviewMinimized(true)}
                      onToggleFullWidth={() => setIsFullWidthPreview(prev => !prev)}
                      isFullWidth={isFullWidthPreview}
                      onSaveToSession={handleSaveArtifactToSession}
                      onSaveToMIPrOMPT={(title) => {
                          const type = lastUsedBuilder || 'prB';
                          addMIPrOMPT(type, previewCode, title);
                          alert(`Successfully saved to mIPrOMPT Library as a ${type === 'prB' ? 'Prompt' : type === 'txS' ? 'Summarizer Output' : 'Content'}!`);
                      }}
                   />
                ) : focusedMediaItem ? (
                   <MediaViewer item={focusedMediaItem} onClose={() => { setFocusedMediaItem(null); setIsFullWidthPreview(false); }} />
                ) : null}
             </div>
           )}
        </div>
      </div>
      
      {!isMindMapOpen && previewCode && isPreviewMinimized && (
          <div className="absolute bottom-6 right-6 z-50 animate-fade-in">
              <button 
                  onClick={() => setIsPreviewMinimized(false)}
                  className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-full shadow-2xl text-app-text hover:bg-app-panel transition-all group"
              >
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="text-sm font-bold pr-1">Playing Audio...</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </button>
          </div>
      )}

      {isMindMapOpen && (
          <div 
             className={`
                absolute top-0 bottom-0 left-0 z-20 w-80 bg-app-panel border-r border-app-border shadow-2xl transition-transform duration-300 ease-out
                ${isSourcesPanelOpen ? 'translate-x-0' : '-translate-x-full'}
             `}
          >
             <div className="relative h-full flex flex-col">
                <button 
                  onClick={() => setIsSourcesPanelOpen(false)}
                  className="absolute -right-6 top-[60%] transform -translate-y-1/2 w-6 h-10 bg-transparent text-cyan-500 rounded-r-lg flex items-center justify-center hover:bg-app-panel/20 border-y border-r border-app-border/30 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>

                <MediaPanel 
                   activeTab="sources"
                   onTabChange={() => {}}
                   sessions={sessions}
                   activeSessionId={activeSessionId}
                   onSwitchSession={setActiveSessionId}
                   onCreateSession={handleOpenCreateSessionModal}
                   onDeleteSession={handleDeleteSession}
                   onRenameSession={renameSession}
                   onExportSession={handleExportSession}
                   activeMediaItems={activeSession.mediaItems} 
                   selectedMediaIds={activeSession.selectedMediaIds || []}
                   onToggleMedia={onToggleMedia}
                   onToggleAllMedia={onToggleAllMedia}
                   onFileUpload={onFileUpload}
                   onAddLink={onAddLink}
                   onAddText={handleAddText}
                   onSearchWeb={handleSearchWeb}
                   onRefillSearch={handleRefillSearch}
                   onRemove={onRemoveMedia}
                   onRenameMediaItem={handleRenameMediaItem} // Pass the new handler
                   onViewMedia={handleFocusMedia}
                   currentTheme={theme}
                   onSetTheme={setTheme}
                   settings={settings}
                   onUpdateSettings={setSettings}
                   onRunTool={handleToolAction}
                   toolLoadingState={toolLoadingState}
                   onlySourcesView={true}
                   onLoadAudio={handleLoadAudio}
                   voiceSettings={voiceSettings}
                   onUpdateVoiceSettings={setVoiceSettings}
                   onGoHome={() => go('library')}
                   isSettingsOpen={isSettingsOpen}
                   activeSettingsTab={activeSettingsTab}
                   onToggleSettings={toggleSettings}
                   viewMode={viewMode}
                   characters={characters}
                   onAddCharacter={addCharacter}
                   onUpdateCharacter={updateCharacter}
                   onDeleteCharacter={deleteCharacter}
                />
             </div>
          </div>
      )}
      
      {mindMapPopup && (
        <MindMapPopup 
           title={mindMapPopup.title}
           content={mindMapPopup.content}
           isLoading={mindMapPopup.isLoading}
           onClose={() => setMindMapPopup(null)}
        />
      )}
    </div>
  );
};

export default WorkspaceRoute;
