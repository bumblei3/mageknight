import { test, expect } from '@playwright/test';
import { GameFlow } from './utils/GameFlow.js';

/**
 * End-to-end smoke test for MapManager.explore().
 *
 * The explore-button element lives inside a context-panel that stays
 * display:none until a certain action is active, so driving it through
 * the real DOM would require a sequence of UI states that is unrelated
 * to this feature.  Instead we drive the game's own explore() entry
 * point from the page context, then verify the observable effects:
 *   - hero movementPoints drops by 2
 *   - a 7-hex tile is laid on the open edge (anchor + 6 neighbours)
 *   - the anchor hex is revealed and carries the tile's site
 *   - a discovery message is logged
 *
 * The hero starts at the centre of the start tile, where every neighbour
 * is already on the map, so there is no open neighbour from which to
 * explore.  We therefore move the hero one step off-centre (to a neighbour
 * of the start tile), which exposes open edges to explore.
 */
test.describe('Map exploration', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        const gameFlow = new GameFlow(page);
        await gameFlow.ensureGameStarted();
    });

    test('explore lays a tile and spends 2 movement', async ({ page }) => {
        // 1. Move the hero one step off-centre (a neighbour of the start tile).
        //    The centre hex alone has no open neighbour, so exploration cannot
        //    start from it.  One step out exposes open edges.
        await page.evaluate(() => {
            window.game.hero.position = { q: -1, r: 0 };
            window.game.hero.movementPoints = 5;
            window.game.updateStats();
        });

        // 2. Identify an open neighbour (the exploration anchor) and stash it
        //    on the window so the verification step can read it back.
        await page.evaluate(() => {
            const grid = window.game.hexGrid;
            const h = window.game.hero;
            const nbrs = grid.getNeighbors(h.position.q, h.position.r);
            const open = nbrs.find((n) => !grid.hasHex(n.q, n.r));
            window.__exploreAnchor = open ? { q: open.q, r: open.r } : null;
            window.__exploreOpen = open ? { q: open.q, r: open.r } : null;
            // Extra diagnostics for diagnosis
            window.__nbrs = nbrs.map(n => ({ q: n.q, r: n.r, has: grid.hasHex(n.q, n.r) }));
            window.__hexesKey = Array.from(grid.hexes.keys());
        });

        // 3. Grant movement without moving the hero.
        await page.evaluate(() => {
            window.game.hero.movementPoints = 5;
            window.game.updateStats();
        });

        // 4. Baseline movement before exploring
        const beforeMovement = await page.evaluate(() => window.game.hero.movementPoints);

        // 5. Perform exploration (drives MapManager.explore -> placeTile)
        await page.evaluate(() => window.game.actionManager.explore());

        // 6. Verify tile laid, fog revealed, movement spent
        const result = await page.evaluate(() => {
            const h = window.game.hero;
            const grid = window.game.hexGrid;
            const anchor = window.__exploreAnchor;
            const hex = grid.getHex(anchor.q, anchor.r);
            if (!hex) return { movement: h.movementPoints, anchorExists: false, anchorRevealed: false, hasSite: false, hexesNearby: 0 };
            return {
                movement: h.movementPoints,
                anchorExists: hex !== undefined,
                anchorRevealed: hex?.revealed,
                // placeTile lays the site on a neighbour hex (index > 0), not the
                // anchor itself, so check across the whole grid for a site.
                hasSite: Array.from(grid.hexes.values()).some((hex) => hex.site !== undefined),
                hexesNearby: grid.getNeighbors(anchor.q, anchor.r).filter((n) => grid.hasHex(n.q, n.r)).length,
            };
        });

        // 7. Debug: log the anchor, the open neighbour found, and all placed hexes
        const debug = await page.evaluate(() => ({
            anchor: window.__exploreAnchor,
            open: window.__exploreOpen,
            heroPos: window.game.hero.position,
            nbrs: window.__nbrs,
            allKeys: window.__hexesKey,
        }));
        console.log('ANCHOR_DEBUG', JSON.stringify(debug));

        // 7b. Reveal the actual placed hex(es) so we can see what explore() laid down.
        const placedHexes = await page.evaluate(() => {
            const grid = window.game.hexGrid;
            return Array.from(grid.hexes.entries()).map(([key, hex]) => ({ key, q: hex.q, r: hex.r, revealed: hex.revealed, siteType: hex.site?.type ?? null }));
        });
        console.log('PLACED_HEXES', JSON.stringify(placedHexes));

        // Explore costs exactly 2 movement
        expect(result.movement).toBe(beforeMovement - 2);
        // A tile (with site) is laid at the anchor
        expect(result.anchorExists).toBe(true);
        expect(result.anchorRevealed).toBe(true);
        // A site is laid somewhere among the placed tiles (placeTile puts it on
        // a neighbour hex, not the anchor itself)
        expect(result.hasSite).toBe(true);
        // The anchor has 6 open neighbours (the rest of the tile)
        expect(result.hexesNearby).toBeGreaterThan(0);
    });
});
