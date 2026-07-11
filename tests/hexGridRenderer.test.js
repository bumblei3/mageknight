import { describe, it, expect, beforeEach } from 'vitest';
import { HexGridRenderer } from '../js/hexgrid/HexGridRenderer.js';
import { HexGridLogic } from '../js/hexgrid/HexGridLogic.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { SITE_TYPES } from '../js/sites.js';

function makeCtx() {
    const noop = () => {};
    return {
        beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
        fill: noop, stroke: noop, arc: noop, fillRect: noop, fillText: noop,
        clearRect: noop, rect: noop,
        save: noop, restore: noop, clip: noop, setLineDash: noop,
        quadraticCurveTo: noop, rect: noop, translate: noop, rotate: noop,
        scale: noop, createRadialGradient: () => ({ addColorStop: noop }),
        createLinearGradient: () => ({ addColorStop: noop }),
        measureText: () => ({ width: 10 }),
        fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
        textAlign: '', textBaseline: '', globalAlpha: 1,
        shadowColor: '', shadowBlur: 0, shadowOffsetY: 0,
    };
}

function makeCanvas(w = 800, h = 600) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext = () => makeCtx();
    return canvas;
}

describe('HexGridRenderer', () => {
    let canvas;
    let grid;
    let renderer;

    beforeEach(() => {
        canvas = makeCanvas();
        grid = new HexGridLogic(40);
        renderer = new HexGridRenderer(canvas, grid);
    });

    describe('constructor', () => {
        it('initializes state', () => {
            expect(renderer.hexSize).toBe(grid.hexSize);
            expect(renderer.selectedHex).toBeNull();
            expect(renderer.highlightedHexes).toBeInstanceOf(Set);
            expect(renderer.ambientLight).toBe(1.0);
            expect(renderer.visionRadius).toBe(2);
        });
    });

    describe('coordinate helpers', () => {
        it('axialToPixel returns center for invalid coords', () => {
            const p = renderer.axialToPixel(NaN, 3);
            expect(p.x).toBe(400);
            expect(p.y).toBe(300);
        });

        it('axialToPixel returns valid offset for finite coords', () => {
            const p = renderer.axialToPixel(0, 0);
            expect(p.x).toBeCloseTo(400);
            expect(p.y).toBeCloseTo(300);
        });

        it('pixelToAxial round-trips', () => {
            const p = renderer.axialToPixel(2, -1);
            const a = renderer.pixelToAxial(p.x, p.y);
            expect(a.q).toBe(2);
            expect(a.r).toBe(-1);
        });
    });

    describe('state setters', () => {
        it('setTimeOfDay adjusts ambient light', () => {
            renderer.setTimeOfDay(true);
            expect(renderer.ambientLight).toBe(0.6);
            renderer.setTimeOfDay(false);
            expect(renderer.ambientLight).toBe(1.0);
        });

        it('highlightHexes / clearHighlights manage the set', () => {
            renderer.highlightHexes([{ q: 0, r: 0 }, { q: 1, r: 0 }]);
            expect(renderer.highlightedHexes.size).toBe(2);
            renderer.clearHighlights();
            expect(renderer.highlightedHexes.size).toBe(0);
        });

        it('selectHex / clearSelection', () => {
            renderer.selectHex(3, 4);
            expect(renderer.selectedHex).toEqual({ q: 3, r: 4 });
            renderer.clearSelection();
            expect(renderer.selectedHex).toBeNull();
        });

        it('clear calls clearRect', () => {
            expect(() => renderer.clear()).not.toThrow();
        });
    });

    describe('color helpers', () => {
        it('getTerrainColor returns default for unknown', () => {
            expect(renderer.getTerrainColor('nonsense')).toBe('#1a1a2e');
            expect(renderer.getTerrainColor()).toBe('#1a1a2e');
        });

        it('getTerrainColor returns visual color for known terrain', () => {
            const col = renderer.getTerrainColor(TERRAIN_TYPES.PLAINS);
            expect(typeof col).toBe('string');
            expect(col.startsWith('#')).toBe(true);
        });

        it('getTerrainIcon returns empty for unknown', () => {
            expect(renderer.getTerrainIcon('nonsense')).toBe('');
            expect(renderer.getTerrainIcon()).toBe('');
        });

        it('getTerrainIcon returns icon for known terrain', () => {
            expect(typeof renderer.getTerrainIcon(TERRAIN_TYPES.FOREST)).toBe('string');
        });

        it('applyLighting scales an rgb hex color', () => {
            const lit = renderer.applyLighting('#ffffff', 0.5);
            expect(lit).toBe('#7f7f7f');
        });

        it('lightenColor brightens', () => {
            const c = renderer.lightenColor('#000000', 20);
            expect(c).toBe('#333333');
        });

        it('lightenColor clamps to white', () => {
            const c = renderer.lightenColor('#ffffff', 20);
            expect(c).toBe('#ffffff');
        });

        it('darkenColor darkens', () => {
            const c = renderer.darkenColor('#ffffff', 20);
            expect(c).toBe('#cccccc');
        });
    });

    describe('drawing primitives', () => {
        it('drawHexText renders without error', () => {
            expect(() => renderer.drawHexText(0, 0, 'x', { fontSize: 12 })).not.toThrow();
        });

        it('drawHexIcon renders without error', () => {
            expect(() => renderer.drawHexIcon(0, 0, '🔥')).not.toThrow();
        });

        it('drawEnemy renders and optional armor bar', () => {
            expect(() => renderer.drawEnemy(0, 0, { color: '#f00', icon: '👹' })).not.toThrow();
            expect(() => renderer.drawEnemy(0, 0, { color: '#f00', icon: '👹', armor: 4 })).not.toThrow();
        });

        it('drawHeroAt renders without error', () => {
            expect(() => renderer.drawHeroAt(400, 300)).not.toThrow();
        });

        it('drawHex renders with highlight/terrain/revealed', () => {
            expect(() => renderer.drawHex(0, 0, {
                fillColor: '#222', highlight: true, revealed: true, terrain: TERRAIN_TYPES.PLAINS,
            })).not.toThrow();
        });

        it('drawHex renders unrevealed (fog) branch', () => {
            expect(() => renderer.drawHex(0, 0, { revealed: false })).not.toThrow();
        });
    });

    describe('terrain textures', () => {
        const terrains = ['water', 'forest', 'mountains', 'desert', 'plains', 'hills', 'wasteland'];
        terrains.forEach(t => {
            it(`drawTerrainTexture handles ${t}`, () => {
                const pos = renderer.axialToPixel(0, 0);
                expect(() => renderer.drawTerrainTexture(pos, t)).not.toThrow();
            });
        });
    });

    describe('render', () => {
        it('renders without hero/enemies', () => {
            expect(() => renderer.render()).not.toThrow();
        });

        it('renders hero at position', () => {
            expect(() => renderer.render({ position: { q: 0, r: 0 } })).not.toThrow();
        });

        it('renders hero using displayPosition when present', () => {
            expect(() => renderer.render({ position: { q: 5, r: 5 }, displayPosition: { q: 0, r: 0 } })).not.toThrow();
        });

        it('renders enemies with and without position', () => {
            const enemies = [
                { position: { q: 0, r: 0 }, color: '#f00', icon: '👹', armor: 3 },
                { name: 'floating' }, // no position -> skipped
            ];
            expect(() => renderer.render({ position: { q: 0, r: 0 } }, enemies)).not.toThrow();
        });

        it('renders revealed hex sites with icon', () => {
            // Mark a hex revealed with a site
            const hex = grid.getHex(0, 0);
            if (hex) {
                hex.revealed = true;
                hex.terrain = TERRAIN_TYPES.PLAINS;
                hex.site = { type: SITE_TYPES.RUINS, getIcon: () => '🏛️', getName: () => 'Ruins' };
            }
            expect(() => renderer.render({ position: { q: 0, r: 0 } })).not.toThrow();
        });

        it('renders with night lighting and within vision radius', () => {
            renderer.setTimeOfDay(true);
            // hero at origin -> nearby hexes within visionRadius hit the lighting branch
            expect(() => renderer.render({ position: { q: 0, r: 0 } })).not.toThrow();
        });

        it('renders debug coordinates when debugMode on', () => {
            renderer.debugMode = true;
            const hex = grid.getHex(0, 0);
            if (hex) { hex.revealed = true; hex.terrain = TERRAIN_TYPES.PLAINS; }
            expect(() => renderer.render({ position: { q: 0, r: 0 } })).not.toThrow();
        });
    });
});
