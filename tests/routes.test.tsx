import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The real state machine needs Firebase/IndexedDB; the router itself does not.
const go = vi.fn();
vi.mock('../hooks/useAppState', () => ({
  useAppState: () => ({
    isStorageInitialized: true,
    sessions: [],
    activeSession: null,
    go,
    viewMode: 'library',
    theme: 'dark',
    isModalOpen: false,
    isSettingsOpen: false,
  }),
}));

import App from '../App';
import { LanguageProvider } from '../contexts/LanguageContext';

const renderAt = (path: string) =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </LanguageProvider>
  );

describe('app routing', () => {
  it('renders the library at /library', async () => {
    renderAt('/library');
    expect(await screen.findByText('New Session')).toBeTruthy();
  });

  it('redirects / to the workspace, which bounces to the library when no sessions exist', async () => {
    renderAt('/');
    expect(await screen.findByText('New Session')).toBeTruthy();
  });

  it('renders a not-found page for unknown routes', async () => {
    renderAt('/definitely-not-a-view');
    expect(await screen.findByText('Page not found')).toBeTruthy();
  });
});
