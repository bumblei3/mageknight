import { describe, it, expect } from 'vitest';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { SITE_TYPES } from '../js/sites.js';

// magic_glade + den now have proper handlers (MagicGladeHandler, DenHandler).
// Previously they were dead content with no handler, falling back to Dungeon.

describe('SiteInteractionManager — magic_glade + den handlers', () => {
  const makeGame = () => ({ hero: {}, addLog: () => {}, updateStats: () => {} });

  it('magic_glade and den are valid SITE_TYPES', () => {
    expect(SITE_TYPES.MAGIC_GLADE).toBe('magic_glade');
    expect(SITE_TYPES.DEN).toBe('den');
  });

  it('getHandler returns a handler for magic_glade and den', () => {
    const mgr = new SiteInteractionManager(makeGame());
    // @ts-ignore — exercising the private method via any-cast
    const getHandler = mgr.getHandler.bind(mgr);
    expect(getHandler('magic_glade')).not.toBeNull();
    expect(getHandler('den')).not.toBeNull();
  });

  it('getHandler returns null for unknown types', () => {
    const mgr = new SiteInteractionManager(makeGame());
    // @ts-ignore — exercising the private method via any-cast
    const getHandler = mgr.getHandler.bind(mgr);
    expect(getHandler('totally_unknown')).toBeNull();
  });

  it('known types still resolve to their real handler', () => {
    const mgr = new SiteInteractionManager(makeGame());
    const getHandler = mgr.getHandler.bind(mgr);
    expect(getHandler(SITE_TYPES.MINE)).not.toBeNull();
    expect(getHandler(SITE_TYPES.KEEP)).not.toBeNull();
    expect(getHandler(SITE_TYPES.LABYRINTH)).not.toBeNull();
  });

  it('visitSite yields options for magic_glade', () => {
    const mgr = new SiteInteractionManager(makeGame());
    const result = mgr.visitSite({ q: 0, r: 0 }, { type: 'magic_glade', name: 'Magischer Hain' });
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.type).toBe('magic_glade');
  });

  it('visitSite yields options for den', () => {
    const mgr = new SiteInteractionManager(makeGame());
    const result = mgr.visitSite({ q: 0, r: 0 }, { type: 'den', name: 'Hort' });
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.type).toBe('den');
  });
});
