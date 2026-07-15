import { describe, it, expect } from 'vitest';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { SITE_TYPES } from '../js/sites.js';

// Gap C (CONTENT_GAP_REPORT.md): magic_glade + den were defined in SITE_TYPES
// but never placed by any scenario and have no handler. They were silently
// falling back to the Dungeon (ExplorationHandler) on click — misleading.
// Test-first: prove the dead types, then the fix removes them + the misleading fallback.

describe('SiteInteractionManager — dead site types (Gap C)', () => {
  const makeGame = () => ({ hero: {}, addLog: () => {}, updateStats: () => {} });

  it('magic_glade and den are NOT valid SITE_TYPES after cleanup', () => {
    // After the fix these enum keys must be removed (dead content).
    expect(SITE_TYPES.MAGIC_GLADE).toBeUndefined();
    expect(SITE_TYPES.DEN).toBeUndefined();
  });

  it('getHandler returns null (not a misleading Dungeon fallback) for unknown types', () => {
    const mgr = new SiteInteractionManager(makeGame());
    // @ts-ignore — exercising the private method via any-cast
    const getHandler = mgr.getHandler.bind(mgr);
    expect(getHandler('magic_glade')).toBeNull();
    expect(getHandler('den')).toBeNull();
    expect(getHandler('totally_unknown')).toBeNull();
  });

  it('known types still resolve to their real handler', () => {
    const mgr = new SiteInteractionManager(makeGame());
    const getHandler = mgr.getHandler.bind(mgr);
    expect(getHandler(SITE_TYPES.MINE)).not.toBeNull();
    expect(getHandler(SITE_TYPES.KEEP)).not.toBeNull();
    expect(getHandler(SITE_TYPES.LABYRINTH)).not.toBeNull();
  });

  it('visitSite yields empty options for an unknown site type (no fake Dungeon menu)', () => {
    const mgr = new SiteInteractionManager(makeGame());
    const result = mgr.visitSite({ q: 0, r: 0 }, { type: 'magic_glade', name: 'Magische Lichtung' });
    expect(result.options).toEqual([]);
    expect(result.type).toBe('magic_glade');
  });
});
