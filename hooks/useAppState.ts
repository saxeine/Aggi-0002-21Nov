/**
 * useAppState — the shared application state machine.
 *
 * This used to be the top half of a ~1,600 line App.tsx. It owns sessions,
 * media, AI, voice/settings and tool execution, and exposes them through
 * AppContext so that each routed view can pull only what it needs.
 *
 * Navigation lives here too: `viewMode` is derived from the URL, and `go()`
 * replaces the old `setViewMode()` calls with real router navigation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MediaItem, Message, VoiceSettings, PromptTemplate, CastMember, MIPrOMPTItem } from '../types';
import { useThemeEngine } from './useThemeEngine';
import { useSessionManager } from './useSessionManager';
import { useAI } from './useAI';
import { usePromptLibrary } from './usePromptLibrary';
import { useMIPrOMPTLibrary } from './useMIPrOMPTLibrary';
import { useCastLibrary } from './useCastLibrary';
import { useCharacterLibrary } from './useCharacterLibrary';
import { generateResponse, generateSpeech, searchWeb, chunkText, base64ToText, translateText } from '../services/gemini';
import { generateUnifiedAIResponse } from '../services/unifiedAi';
import { buildToolPrompt } from '../utils/toolPrompts';
import { buildAudioPlayerHtml, buildAudioNoticeHtml, buildPodcastDocumentHtml, buildErrorHtml } from '../utils/podcastHtml';
import type { PodcastRole } from '../utils/podcastGating';
import { loadAudioBlobFromIDB } from '../services/storage';
import { saveGlobalHistorySafely } from '../services/historyStorage';
import { savePodcastToHistory } from '../utils/podcastHistory';
import { getMaggiStore } from '../services/maggi/store';
import { DEFAULT_GEMINI_MODEL } from '../constants/geminiModels';
import { ViewId, VIEW_PATHS, viewFromPath } from '../navigation';

export const useAppState = () => {
  const { theme, setTheme, settings, setSettings } = useThemeEngine();
  const { castLibrary, addCastMember, updateCastMember, deleteCastMember, resetLibrary } = useCastLibrary();
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacterLibrary();
  const { miprompts, addMIPrOMPT, updateMIPrOMPT, deleteMIPrOMPT, importCSV } = useMIPrOMPTLibrary();
  
  const { 
    sessions, 
    setSessions,
    activeSessionId, 
    setActiveSessionId, 
    activeSession, 
    createNewSession, 
    deleteSession, 
    renameSession, 
    updateSessionDescription,
    combineSessions,
    reorderSessions,
    clearSessionHistory,
    updateActiveSession,
    updateSessionById,
    handleExportSession,
    processUploadedFiles,
    addTextItem,
    handleAddLink,
    batchAddLinks,
    handleRemoveMedia,
    handleToggleMedia,
    handleToggleAllMedia,
    combineMediaItems,
    addHtmlItem,
    isStorageInitialized
  } = useSessionManager();

  // Layout State
  // Navigation is owned by react-router; `viewMode` is derived from the URL.
  const navigate = useNavigate();
  const location = useLocation();
  const viewMode: ViewId = viewFromPath(location.pathname);
  const go = useCallback((view: ViewId, options?: { replace?: boolean }) => {
    const path = VIEW_PATHS[view];
    if (location.pathname !== path) {
      navigate(path, { replace: options?.replace });
    }
  }, [navigate, location.pathname]);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [lastUsedBuilder, setLastUsedBuilder] = useState<MIPrOMPTItem['type'] | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [focusedMediaItem, setFocusedMediaItem] = useState<MediaItem | null>(null);
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isFullWidthPreview, setIsFullWidthPreview] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'visual' | 'cast'>('ai');

  const toggleSettings = (tab: 'ai' | 'visual' | 'cast' = 'ai') => {
    setActiveSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Sidebar State
  const [activeSideTab, setActiveSideTab] = useState<'sessions' | 'sources' | 'tools' | 'audio'>('sources');

  // Drawer States
  const [isMainPanelCollapsed, setIsMainPanelCollapsed] = useState(false); 
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false); 
  
  // Tool Loading State
  const [toolLoadingState, setToolLoadingState] = useState<Record<string, boolean>>({});

  // Voice Settings State
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
      host: 'Kore',
      hostLabel: 'Narrator Bot',
      hostBio: 'A clear, authoritative, and friendly voice, perfect for hosting and guiding the listener through complex topics.',
      hostAvatar: 'https://picsum.photos/seed/narrator/60/60',
      hostMemberId: 'sys-host-1',
      expert: 'Zephyr',
      expertLabel: 'Dr. Insight',
      expertBio: 'A knowledgeable and articulate voice, ideal for explaining intricate details and offering expert opinions.',
      expertAvatar: 'https://picsum.photos/seed/expert/60/60',
      expertMemberId: 'sys-expert-1',
      guest: 'Puck',
      guestLabel: 'Curious Listener',
      guestBio: 'An engaging and inquisitive voice, representing the audience and asking clarifying questions.',
      guestAvatar: 'https://picsum.photos/seed/listener/60/60',
      guestMemberId: 'sys-guest-1',
      length: 'Short (1-2 min)',
      language: 'English'
  });

  // Explicitly configured podcast speaker roles; starts empty so users must
  // configure speaker(s) (or press Use Default) before generating a podcast.
  const [touchedRoles, setTouchedRoles] = useState<PodcastRole[]>([]);

  const [selectedMIPrOMPT, setSelectedMIPrOMPT] = useState<{type: 'prB' | 'ctB' | 'txS', content: string} | null>(null);

  // MindMap Popup State
  const [mindMapPopup, setMindMapPopup] = useState<{ title: string, content: string | null, isLoading: boolean } | null>(null);

  const backgroundTemplateImage = activeSession?.mediaItems.find(item => item.type === 'image');

  // Auto-Preview Callback for Maps
  const handleAutoPreview = (code: string) => {
      setPreviewCode(code);
      setFocusedMediaItem(null);
      setIsPreviewMinimized(false);
      setIsFullWidthPreview(false);
      if (isMindMapOpen) setIsMainPanelCollapsed(true);
  };

  const {
    input,
    setInput,
    isLoading,
    isSuggestionsLoading,
    handleSend,
    triggerSuggestion,
    generateSuggestionsForSession,
    autoTagMediaItems,
    generateMindMap,
    isMindMapLoading
  } = useAI(activeSession, updateActiveSession, updateSessionById, settings, handleAutoPreview);
  
  const { prompts, addPrompt, removePrompt } = usePromptLibrary();

  const [isCastLibraryOpen, setIsCastLibraryOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionDefaultName, setNewSessionDefaultName] = useState('Session 001');

  const handleOpenCreateSessionModal = () => {
      const nextNum = sessions.length + 1;
      const paddedNum = nextNum.toString().padStart(3, '0');
      setNewSessionDefaultName(`Session ${paddedNum}`);
      setIsModalOpen(true);
  };

  const handleCreateSession = (name: string, description?: string) => {
      createNewSession(name, description);
      setInput('');
      setPreviewCode(null);
      setFocusedMediaItem(null);
      setIsMindMapOpen(false);
      setIsModalOpen(false);
      go('workspace'); 
  };

  const handleDeleteSession = (id: string) => {
      deleteSession(id);
      if (activeSessionId === id) {
          setPreviewCode(null);
          setFocusedMediaItem(null);
          setIsMindMapOpen(false);
      }
  };

  const handleDownloadSession = () => {
      if (!activeSession) return;
      
      let txt = `Session: ${activeSession.name}\n`;
      txt += `Created: ${new Date(activeSession.createdAt).toLocaleString()}\n\n`;
      txt += `--- SOURCES (${activeSession.mediaItems.length}) ---\n`;
      activeSession.mediaItems.forEach(item => {
          txt += `\n[${item.type.toUpperCase()}] ${item.name}\n`;
          if (item.type === 'text') {
              try {
                  const decoded = new TextDecoder().decode(Uint8Array.from(atob(item.data), c => c.charCodeAt(0)));
                  txt += `${decoded}\n`;
              } catch(err){}
          } else {
              txt += `(Binary or Base64 data hidden)\n`;
          }
      });
      txt += `\n--- HISTORY ---\n`;
      activeSession.history.forEach(msg => {
          txt += `\n[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString()}\n`;
          txt += `${msg.content}\n`;
      });
      
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeName = activeSession.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `session_${safeName}_${new Date().toISOString().slice(0,10)}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleSelectSession = (id: string) => {
      setActiveSessionId(id);
      go('workspace');
  };

  const onFileUpload = async (files: File[]) => {
      const result = await processUploadedFiles(files);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onAddLink = (url: string) => {
      const result = handleAddLink(url);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleAddText = (title: string, content: string) => {
      const result = addTextItem(title, content);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleSearchWeb = async (query: string) => {
      const results = await searchWeb(query);
      if (results && results.length > 0) {
          const result = batchAddLinks(results);
          if (result) {
              generateSuggestionsForSession(result.targetId, result.combinedMedia);
              if (settings.autoTagSources && result.newItems) {
                  autoTagMediaItems(result.targetId, result.newItems);
              }
              if (isMindMapOpen && activeSession) {
                  updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
                  setTimeout(() => generateMindMap(), 100);
              }
          }
      } else {
          alert("No search results found or API search limit reached.");
      }
  };

  const handleRefillSearch = async (query: string) => {
      if (!activeSession) return;
      const activeIds = activeSession.selectedMediaIds;
      const unselectedLinks = activeSession.mediaItems.filter(item => item.type === 'link' && !activeIds.includes(item.id));
      const keptLinks = activeSession.mediaItems.filter(item => item.type === 'link' && activeIds.includes(item.id));
      if (unselectedLinks.length > 0) {
          unselectedLinks.forEach(item => {
              handleRemoveMedia(item.id);
          });
      }
      const excludeUrls = keptLinks.map(item => item.data);
      const results = await searchWeb(query, excludeUrls);
      if (results && results.length > 0) {
          const result = batchAddLinks(results);
          if (result) {
              generateSuggestionsForSession(result.targetId, result.combinedMedia);
              if (settings.autoTagSources && result.newItems) {
                  autoTagMediaItems(result.targetId, result.newItems);
              }
              if (isMindMapOpen) {
                  updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
                  setTimeout(() => generateMindMap(), 100);
              }
          }
      } else {
          alert("Could not find new unique resources for this topic.");
      }
  };


  const onRemoveMedia = (id: string) => {
      const result = handleRemoveMedia(id);
      
      // Also remove from global history
      try {
          const savedGlobal = localStorage.getItem('global_podcast_history');
          if (savedGlobal) {
              const globalHistory = JSON.parse(savedGlobal);
              const updated = globalHistory.filter((item: any) => item.id !== id);
              saveGlobalHistorySafely(updated);
          }
      } catch (err) {
          console.error("Failed to remove from global podcast history:", err);
      }

      if (focusedMediaItem?.id === id) setFocusedMediaItem(null);

      if (result) {
          generateSuggestionsForSession(result.targetId, result.updatedMedia);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleRenameMediaItem = (id: string, newName: string) => {
    if (activeSession) {
      updateActiveSession(s => ({
        ...s,
        mediaItems: s.mediaItems.map(item =>
          item.id === id ? { ...item, name: newName } : item
        )
      }));
      // Re-generate suggestions as media item name might affect prompts/context
      generateSuggestionsForSession(activeSession.id, activeSession.mediaItems.map(item => 
          item.id === id ? { ...item, name: newName } : item
      ));
      if (isMindMapOpen && activeSession) {
          updateSessionById(activeSession.id, s => ({ ...s, mindMapData: undefined }));
          setTimeout(() => generateMindMap(), 100);
      }
    }

    // Also rename in global history
    try {
        const savedGlobal = localStorage.getItem('global_podcast_history');
        if (savedGlobal) {
            const globalHistory = JSON.parse(savedGlobal);
            const updated = globalHistory.map((item: any) => 
                item.id === id ? { ...item, name: newName } : item
            );
            saveGlobalHistorySafely(updated);
        }
    } catch (err) {
        console.error("Failed to rename in global podcast history:", err);
    }
  };

  const onToggleMedia = (id: string) => {
      const result = handleToggleMedia(id);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.activeItems);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onToggleAllMedia = (selectAll: boolean) => {
      const result = handleToggleAllMedia(selectAll);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.activeItems);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onCombineMedia = (ids: string[], name: string) => {
      const result = combineMediaItems(ids, name);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleSeekMedia = (timeString: string) => {
    const parts = timeString.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    const performSeek = () => {
      const focusedMediaEl = document.querySelector('.active-media-viewer') as HTMLMediaElement;
      if (focusedMediaEl) {
          focusedMediaEl.currentTime = seconds;
          focusedMediaEl.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      const allMedia = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      
      // Also check inside iframes (like ArtifactPreview)
      const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            const iframeMedia = Array.from(iframe.contentDocument.querySelectorAll('video, audio')) as HTMLMediaElement[];
            allMedia.push(...iframeMedia);
          }
        } catch (e) {
          // Ignore cross-origin errors if any
        }
      });

      const playingMedia = allMedia.find(el => !el.paused && !el.ended);
      if (playingMedia) {
          playingMedia.currentTime = seconds;
          playingMedia.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      if (allMedia.length > 0) {
          const firstMedia = allMedia[0];
          firstMedia.currentTime = seconds;
          firstMedia.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      return false;
    };

    if (!performSeek()) {
      // If no media element is found, try to find a media item in the session and focus it
      const mediaItem = activeSession?.mediaItems.find(item => item.type === 'video' || item.type === 'audio');
      if (mediaItem) {
        setFocusedMediaItem(mediaItem);
        setPreviewCode(null);
        setIsPreviewMinimized(false);
        if (isMindMapOpen) setIsMainPanelCollapsed(true);
        
        // Wait for render then seek
        setTimeout(() => {
          performSeek();
        }, 100);
      }
    }
  };

  const handleFocusMedia = (item: MediaItem) => {
    if (focusedMediaItem?.id === item.id) {
      setFocusedMediaItem(null);
      setIsFullWidthPreview(false);
    } else {
      setFocusedMediaItem(item);
      setPreviewCode(null);
      setIsFullWidthPreview(false); 
    }
  };

  const handleGenerateReport = () => {
    handleSend("Please analyze the currently selected media sources and generate a comprehensive, structured report. Include an Executive Summary, Key Findings, Detailed Analysis of the content, and Conclusions.");
  };

  const handleToolAction = async (toolId: string, payload?: any) => {
     const isPodcastFormatTool = toolId === 'podcast_1' || toolId === 'podcast_2' || toolId === 'podcast_3';
     if (isPodcastFormatTool && !touchedRoles.includes('host')) {
       setActiveSideTab('audio');
       return;
     }
     if (!activeSession && (!payload || !payload.isIndependent)) return;
     setPreviewCode(null);
     setGeneratedAudio(null);
     setIsPreviewMinimized(false);
     setToolLoadingState(prev => ({ ...prev, [toolId]: true }));
     
     if (toolId === 'prompt_builder') setLastUsedBuilder('prB');
     else if (toolId === 'content_builder') setLastUsedBuilder('ctB');
     else if (toolId === 'text_summarizer') setLastUsedBuilder('txS');
     else setLastUsedBuilder(null);
     
     let activeMediaItems: MediaItem[] = [];
     
     // Resolve independent tool sessions
     if (payload?.isIndependent && payload?.builderSessionId) {
         const targetSession = sessions.find(s => s.id === payload.builderSessionId);
         if (targetSession) {
             activeMediaItems = targetSession.mediaItems; // use all media items from the selected session or specific? Just use all if not active session since we don't have selected media IDs directly for non-active
         }
     } else if (activeSession && (!payload?.isIndependent || (payload?.isIndependent && !payload.builderSessionId && payload.includeSessionData))) {
          // fallback to active session usage
         activeMediaItems = activeSession.mediaItems.filter(item => 
             activeSession.selectedMediaIds.includes(item.id)
         );
     }
     
     if ((toolId === 'youtube_transcript' || toolId === 'text_summarizer') && payload?.mediaItem) {
         activeMediaItems = [payload.mediaItem];
     } else if (activeMediaItems.length === 0 && (!payload || !payload.isIndependent) && (!payload?.builderSessionId) && (!payload?.includeSessionData) && toolId !== 'crypto_analyst') {
         alert("Please select at least one source to generate content.");
         setToolLoadingState(prev => ({ ...prev, [toolId]: false }));
         return;
     }

     if (payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData) {
         activeMediaItems = []; // Ensure no session data is used unless requested
     }

     if (payload?.customInput) {
         activeMediaItems = [
             ...activeMediaItems,
             {
                 id: `custom-input-${Date.now()}`,
                 type: 'text',
                 name: 'Custom Content / Topic Input',
                 mimeType: 'text/plain',
                 data: btoa(unescape(encodeURIComponent(payload.customInput)))
             }
         ];
     }
     const { prompt, isPodcast } = buildToolPrompt(toolId, payload, voiceSettings);

     try {
        const model = settings.model || DEFAULT_GEMINI_MODEL;
        const cacheName = (toolId === 'youtube_transcript' || toolId === 'text_summarizer') ? undefined : activeSession?.geminiCacheName;
        
        let code = "";
        
        // Special handling for Text Summarizer & Translator to handle large documents via chunking
        if (toolId === 'text_summarizer') {
            const action = payload?.action || 'summarize';
            const lang = payload?.lang || 'swedish';
            
            if (action === 'translate' || action === 'summarize_translate') {
                // Extract full text for translation
                let fullText = "";
                for (const item of activeMediaItems) {
                    if (item.type === 'text' || item.type === 'document' || item.type === 'sql') {
                        fullText += (fullText ? '\n\n' : '') + base64ToText(item.data);
                    }
                }
                
                if (settings.provider !== 'gemini') {
                    const unifiedPrompt = action === 'summarize_translate'
                      ? `Summarize the provided sources concisely and then translate that summary cleanly into ${lang}. Return ONLY the translated text.`
                      : `Translate the following text cleanly into ${lang}. Return ONLY the translated text.\n\n${fullText}`;
                    code = await generateUnifiedAIResponse(unifiedPrompt, activeMediaItems);
                } else if (action === 'summarize_translate') {
                    // 1. Summarize the whole document first
                    const summaryPrompt = `Provide a comprehensive summary of the provided text. Return ONLY the summary content.`;
                    const summaryResult = await generateResponse(summaryPrompt, [], activeMediaItems, model, cacheName);
                    // 2. Translate the summary (usually small enough for one go, but translateText handles chunks anyway)
                    code = await translateText(summaryResult.text, lang, model);
                } else {
                    // Just translate the whole document in chunks
                    code = await translateText(fullText, lang, model);
                }
                
                // Wrap the translated result in the expected HTML format
                code = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Translation Result</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 2rem; }
        .content-container { max-width: 800px; margin: 0 auto; background: rgba(30, 41, 59, 0.5); padding: 2rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); }
        h1 { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; line-height: 1.7; }
    </style>
</head>
<body>
    <div class="content-container">
        <h1>${action === 'summarize_translate' ? 'Summary & Translation' : 'Translation'} (${lang})</h1>
        <div class="prose prose-invert max-w-none">
            ${code.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
        </div>
    </div>
</body>
</html>`;
            } else if (settings.provider !== 'gemini') {
                code = await generateUnifiedAIResponse(prompt, activeMediaItems);
            } else {
                // Default summarization (one-shot)
                const result = await generateResponse(prompt, [], activeMediaItems, model, cacheName);
                code = result.text;
            }
        } else if (settings.provider !== 'gemini') {
            code = await generateUnifiedAIResponse(prompt, activeMediaItems);
        } else {
            const result = await generateResponse(prompt, [], activeMediaItems, model, cacheName, toolId === 'crypto_analyst');
            code = result.text;
        }
        if (isPodcast) {
            code = code.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
            const rawText = code.replace(/<[^>]*>?/gm, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
            const speechText = rawText.substring(0, 4000);
            const fallbackSpeakers = toolId === 'podcast_2' ? 2 : toolId === 'podcast_3' ? 3 : 1;
            const payloadSpeakerCount = Number(payload?.speakerCount);
            const speakers = Number.isFinite(payloadSpeakerCount) && payloadSpeakerCount >= 1 ? payloadSpeakerCount : fallbackSpeakers;

            // Audio is Gemini TTS only. FreeLLMAPI (MAGGI), Ollama and Custom AI
            // produce text, so report this clearly instead of failing silently.
            const providerLabel = settings.provider === 'maggi' ? 'FreeLLMAPI (MAGGI)'
                : settings.provider === 'ollama' ? 'Ollama'
                : settings.provider === 'custom' ? 'Custom AI'
                : 'Gemini';
            let audioBase64: string | null = null;
            let audioNote = '';
            if (settings.provider === 'gemini') {
                try {
                    audioBase64 = await generateSpeech(speechText, speakers, voiceSettings);
                } catch (speechErr) {
                    console.warn('Audio generation failed:', speechErr);
                }
                if (!audioBase64) {
                    audioNote = 'Audio generation failed with the Gemini engine. Your transcript is ready below — you can retry audio from the player.';
                }
            } else {
                audioNote = `Audio (TTS) is not available with the ${providerLabel} brain — it produces text only. Your transcript is ready below; switch Settings → AI Engine to Gemini to generate audio.`;
            }
            if (audioBase64) {
                setGeneratedAudio(audioBase64);
            }

            // Format the script with color-coded blocks
            const audioPlayerHtml = buildAudioPlayerHtml(audioBase64);
            const audioNoticeHtml = (!audioBase64 && audioNote) ? buildAudioNoticeHtml(audioNote) : '';

            code = buildPodcastDocumentHtml({
                script: code,
                voiceSettings,
                audioBase64,
                audioNoticeHtml,
                audioPlayerHtml,
            });

            // Auto save generations to a history library for later retrieval, use, edit/delete.
            // The transcript is saved even when audio is unavailable (e.g. a FreeLLMAPI brain).
            {
                let formatLabel = "Report Podcast";
                if (toolId === 'podcast_2') formatLabel = "Dialogue Podcast";
                if (toolId === 'podcast_3') formatLabel = "Roundtable Podcast";
                if (toolId === 'podcast_creator') formatLabel = "Interactive Podcast";
                // Host-only report (multiple speakers configured) — always a single-host report.
                if (payload?.hostOnly) formatLabel = "Report Podcast";

                const timestamp = new Date().toLocaleString();
                const filename = audioBase64 ? `${formatLabel} - ${timestamp}` : `Transcript — ${formatLabel} - ${timestamp}`;

                const newMediaItem: MediaItem = {
                    id: `audio-${Date.now()}`,
                    type: 'audio',
                    name: filename,
                    mimeType: 'audio/wav',
                    data: audioBase64 || '',
                    scriptHtml: code
                };

                if (audioBase64 && activeSession) {
                    updateActiveSession(s => ({
                        ...s,
                        mediaItems: [newMediaItem, ...s.mediaItems],
                        selectedMediaIds: [...s.selectedMediaIds, newMediaItem.id]
                    }));
                }

                // Always save to global history library
                savePodcastToHistory(newMediaItem);
            }

            setIsFullWidthPreview(true);
        } else {
             // Robust code cleaning for Markdown artifacts
             code = code.replace(/```[hH][tT][mM][lL]\s?([\s\S]*?)```/g, '$1')
                        .replace(/```\s?([\s\S]*?)```/g, '$1')
                        .trim();
             
             setIsFullWidthPreview(toolId === 'crypto_analyst' || toolId === 'content_builder'); 
        }
        setPreviewCode(code);
        setFocusedMediaItem(null); 
        setIsPreviewMinimized(false); 
        if (isMindMapOpen) setIsMainPanelCollapsed(true);
     } catch (e: any) {
         const msg = e?.message || String(e);
         console.warn("Tool generation notice:", msg);
         const errorHtml = buildErrorHtml(msg);
         setPreviewCode(errorHtml);
         setFocusedMediaItem(null);
         setIsPreviewMinimized(false);
     } finally {
         setToolLoadingState(prev => ({ ...prev, [toolId]: false }));
     }
  };

  const handleOpenAudio = () => {
      setActiveSideTab('audio');
      if (isMindMapOpen && isMainPanelCollapsed) {
          setIsMainPanelCollapsed(false);
      }
  };

  const handleSaveAsSource = (content: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const title = `AI Answer ${timestamp}`;
    const result = addTextItem(title, content);
    if (result) {
      generateSuggestionsForSession(result.targetId, result.combinedMedia);
      if (settings.autoTagSources && result.newItems) {
          autoTagMediaItems(result.targetId, result.newItems);
      }
    }
  };

  const handleSaveArtifactToSession = (code: string, title: string) => {
    const result = addHtmlItem(title, code);
    if (result) {
      generateSuggestionsForSession(result.targetId, result.combinedMedia);
      if (settings.autoTagSources && result.newItems) {
          autoTagMediaItems(result.targetId, result.newItems);
      }
      console.info(`"${title}" saved to session sources.`);
    }
  };

  const handleToggleMindMap = async () => {
      if (!isMindMapOpen) {
          setIsMindMapOpen(true);
          setIsMainPanelCollapsed(true); 
          setIsSourcesPanelOpen(false);  
          setFocusedMediaItem(null);
          setPreviewCode(null);
          if (!activeSession?.mindMapData) {
              await generateMindMap();
          }
      } else {
          setIsMindMapOpen(false);
          setIsMainPanelCollapsed(false);
          setIsSourcesPanelOpen(false);
      }
  };

  const handleRefreshMindMap = () => {
    if (!activeSession) return;
    updateActiveSession(s => ({ ...s, mindMapData: undefined }));
    setTimeout(() => generateMindMap(), 100);
  };

  const handleMindMapNodeDoubleClick = async (label: string) => {
      setIsMainPanelCollapsed(true);
      setMindMapPopup({ title: label, content: null, isLoading: true });
      try {
          const activeMediaItems = activeSession?.mediaItems.filter(item => 
              activeSession.selectedMediaIds.includes(item.id)
          ) || [];
          const prompt = `Tell me more about "${label}" and its context based on the sources. Provide a detailed summary and analysis.`;
          const model = settings.model || DEFAULT_GEMINI_MODEL;
          const result = await generateResponse(prompt, [], activeMediaItems, model, activeSession?.geminiCacheName);
          setMindMapPopup({ title: label, content: result.text, isLoading: false });
      } catch (e) {
          console.error("MindMap node detail failed", e);
          setMindMapPopup({ title: label, content: "Failed to generate details. Please check API connection.", isLoading: false });
      }
  };

  const handleSaveAudio = async (audioData: string, filename: string) => {
      // Add to session media items
      const newMediaItem: MediaItem = {
          id: `audio-${Date.now()}`,
          type: 'audio',
          name: `${filename}.wav`,
          mimeType: 'audio/wav',
          data: audioData
      };

      if (activeSession) {
          const updatedSessions = sessions.map(s => {
              if (s.id === activeSession.id) {
                  return {
                      ...s,
                      mediaItems: [...s.mediaItems, newMediaItem],
                      selectedMediaIds: [...s.selectedMediaIds, newMediaItem.id]
                  };
              }
              return s;
          });

          setSessions(updatedSessions);
          setActiveSessionId(activeSession.id);
      }

      // Save to global history
      savePodcastToHistory(newMediaItem);

      alert("Audio added to history library!");
  };

  const handleLoadAudio = async (item: MediaItem) => {
      if (item.type !== 'audio') return;
      
      let audioData = item.data;
      let scriptCode = item.scriptHtml;

      // If data is stripped from lightweight history in localStorage, recover it
      if (!audioData) {
          const foundInSession = activeSession?.mediaItems.find(m => m.id === item.id) 
              || sessions.flatMap(s => s.mediaItems).find(m => m.id === item.id);
          if (foundInSession?.data) {
              audioData = foundInSession.data;
              if (!scriptCode && foundInSession.scriptHtml) {
                  scriptCode = foundInSession.scriptHtml;
              }
          } else {
              const cachedBlob = await loadAudioBlobFromIDB(item.id);
              if (cachedBlob?.data) {
                  audioData = cachedBlob.data;
                  if (!scriptCode && cachedBlob.scriptHtml) {
                      scriptCode = cachedBlob.scriptHtml;
                  }
              }
          }
      }

      setPreviewCode(scriptCode || '<!-- Audio Only Mode -->');
      
      if (audioData) {
          setGeneratedAudio(audioData);
      } else if ((item as any).file) {
          const file = (item as any).file as File;
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              const base64 = result.split(',')[1];
              setGeneratedAudio(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRegenerate = async (newScript: string) => {
      setToolLoadingState(prev => ({ ...prev, 'regenerate': true }));
      setGeneratedAudio(null);
      try {
          // 1. Generate Audio
          let speakers = 1;
          if (newScript.includes('Expert:') || newScript.includes(`${voiceSettings.expertLabel}:`)) speakers = 2;
          if (newScript.includes('Guest:') || newScript.includes(`${voiceSettings.guestLabel}:`)) speakers = 3;
          
          const providerLabel = settings.provider === 'maggi' ? 'FreeLLMAPI (MAGGI)'
              : settings.provider === 'ollama' ? 'Ollama'
              : settings.provider === 'custom' ? 'Custom AI'
              : 'Gemini';
          let audioBase64: string | null = null;
          let audioNote = '';
          if (settings.provider === 'gemini') {
              const speechText = newScript.substring(0, 4000);
              try {
                  audioBase64 = await generateSpeech(speechText, speakers, voiceSettings);
              } catch (speechErr) {
                  console.warn('Audio regeneration failed:', speechErr);
              }
              if (audioBase64) {
                  setGeneratedAudio(audioBase64);
              } else {
                  audioNote = 'Audio generation failed with the Gemini engine. Your transcript is ready below — you can retry audio from the player.';
              }
          } else {
              audioNote = `Audio (TTS) is not available with the ${providerLabel} brain — it produces text only. Your transcript is ready below; switch Settings → AI Engine to Gemini to generate audio.`;
          }

          // 2. Update Preview Code (HTML)
          const code = buildPodcastDocumentHtml({
              script: newScript,
              voiceSettings,
              audioBase64,
              audioNoticeHtml: (!audioBase64 && audioNote) ? buildAudioNoticeHtml(audioNote) : '',
              audioPlayerHtml: buildAudioPlayerHtml(audioBase64),
          });
          setPreviewCode(code);

      } catch (e) {
          console.error("Regeneration failed", e);
          alert("Failed to regenerate audio.");
      } finally {
          setToolLoadingState(prev => ({ ...prev, 'regenerate': false }));
      }
  };

  // Derived: true while any tool is running anywhere in the app.
  const isAnyToolLoading = Object.values(toolLoadingState).some(Boolean);

  return {
    // navigation
    viewMode,
    go,
    // theme & settings
    theme,
    setTheme,
    settings,
    setSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    toggleSettings,
    // sessions
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    createNewSession,
    deleteSession,
    renameSession,
    updateSessionDescription,
    combineSessions,
    reorderSessions,
    clearSessionHistory,
    updateActiveSession,
    updateSessionById,
    handleExportSession,
    processUploadedFiles,
    addTextItem,
    handleAddLink,
    batchAddLinks,
    handleRemoveMedia,
    handleToggleMedia,
    handleToggleAllMedia,
    combineMediaItems,
    addHtmlItem,
    isStorageInitialized,
    // libraries
    castLibrary,
    addCastMember,
    updateCastMember,
    deleteCastMember,
    resetLibrary,
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    miprompts,
    addMIPrOMPT,
    updateMIPrOMPT,
    deleteMIPrOMPT,
    importCSV,
    prompts,
    addPrompt,
    removePrompt,
    // AI
    input,
    setInput,
    isLoading,
    isSuggestionsLoading,
    handleSend,
    triggerSuggestion,
    generateSuggestionsForSession,
    autoTagMediaItems,
    generateMindMap,
    isMindMapLoading,
    // preview / media focus
    previewCode,
    setPreviewCode,
    lastUsedBuilder,
    setLastUsedBuilder,
    generatedAudio,
    setGeneratedAudio,
    focusedMediaItem,
    setFocusedMediaItem,
    isFullWidthPreview,
    setIsFullWidthPreview,
    isPreviewMinimized,
    setIsPreviewMinimized,
    // layout
    isMindMapOpen,
    setIsMindMapOpen,
    isSidebarVisible,
    setIsSidebarVisible,
    activeSideTab,
    setActiveSideTab,
    isMainPanelCollapsed,
    setIsMainPanelCollapsed,
    isSourcesPanelOpen,
    setIsSourcesPanelOpen,
    backgroundTemplateImage,
    // voice / podcast
    voiceSettings,
    setVoiceSettings,
    touchedRoles,
    setTouchedRoles,
    isCastLibraryOpen,
    setIsCastLibraryOpen,
    // mIPrOMPT builder
    selectedMIPrOMPT,
    setSelectedMIPrOMPT,
    // mind map popup
    mindMapPopup,
    setMindMapPopup,
    // modals
    isModalOpen,
    setIsModalOpen,
    newSessionDefaultName,
    // tool execution
    toolLoadingState,
    setToolLoadingState,
    isAnyToolLoading,
    // handlers
    handleAutoPreview,
    handleOpenCreateSessionModal,
    handleCreateSession,
    handleDeleteSession,
    handleDownloadSession,
    handleSelectSession,
    onFileUpload,
    onAddLink,
    handleAddText,
    handleSearchWeb,
    handleRefillSearch,
    onRemoveMedia,
    handleRenameMediaItem,
    onToggleMedia,
    onToggleAllMedia,
    onCombineMedia,
    handleSeekMedia,
    handleFocusMedia,
    handleGenerateReport,
    handleToolAction,
    handleOpenAudio,
    handleSaveAsSource,
    handleSaveArtifactToSession,
    handleToggleMindMap,
    handleRefreshMindMap,
    handleMindMapNodeDoubleClick,
    handleSaveAudio,
    handleLoadAudio,
    handleRegenerate,
  };
};

export type AppState = ReturnType<typeof useAppState>;
