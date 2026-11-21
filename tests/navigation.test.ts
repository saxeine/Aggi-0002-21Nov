import { describe, it, expect } from 'vitest';
import { VIEW_IDS, VIEW_PATHS, viewFromPath } from '../navigation';

describe('view routes', () => {
  it('gives every view a unique, absolute path', () => {
    const paths = VIEW_IDS.map((id) => VIEW_PATHS[id]);
    expect(new Set(paths).size).toBe(VIEW_IDS.length);
    for (const path of paths) {
      expect(path.startsWith('/')).toBe(true);
      expect(path).toBe(path.toLowerCase());
    }
  });

  it('round-trips a path back to its view id', () => {
    for (const id of VIEW_IDS) {
      expect(viewFromPath(VIEW_PATHS[id])).toBe(id);
    }
  });

  it('resolves nested paths to their top-level view', () => {
    expect(viewFromPath('/studio/podcast')).toBe('studio');
    expect(viewFromPath('/media/sxa_board')).toBe('media');
  });

  it('falls back to the library for unknown or empty paths', () => {
    expect(viewFromPath('/')).toBe('library');
    expect(viewFromPath('')).toBe('library');
    expect(viewFromPath('/does-not-exist')).toBe('library');
    expect(viewFromPath('/library/../../etc')).toBe('library');
  });

  it('keeps the historical view ids used across the app', () => {
    expect([...VIEW_IDS]).toEqual([
      'library',
      'workspace',
      'studio',
      'office_tools',
      'media',
      'miprompt',
      'finance',
      'maggi',
      'sxa_board',
    ]);
  });
});
