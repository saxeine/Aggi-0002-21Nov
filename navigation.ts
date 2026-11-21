/**
 * Route table for the Aggi workspace.
 *
 * Every top-level view has its own URL so that it can be deep-linked,
 * bookmarked and lazily loaded. `ViewId` keeps the old `viewMode` naming
 * so that components which only care about which section is active
 * (e.g. the sidebar highlight) keep working unchanged.
 */

export const VIEW_IDS = [
  'library',
  'workspace',
  'studio',
  'office_tools',
  'media',
  'miprompt',
  'finance',
  'maggi',
  'sxa_board',
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export const VIEW_PATHS: Record<ViewId, string> = {
  library: '/library',
  workspace: '/workspace',
  studio: '/studio',
  office_tools: '/office_tools',
  media: '/media',
  miprompt: '/miprompt',
  finance: '/finance',
  maggi: '/maggi',
  sxa_board: '/sxa_board',
};

/** Maps a location pathname back to a view id (defaults to the library). */
export const viewFromPath = (pathname: string): ViewId => {
  const segment = pathname.split('/').filter(Boolean)[0];
  return (VIEW_IDS as readonly string[]).includes(segment ?? '')
    ? (segment as ViewId)
    : 'library';
};
