import { describe, it, expect, vi } from 'vitest';
import { HexGridLogic } from '../js/hexgrid/HexGridLogic.js';
import { HexGridRenderer } from '../js/hexgrid/HexGridRenderer.js';

function makeLogic() {
    const logic = new HexGridLogic(40);
    // Seed a few hexes with coordinates + terrain
    logic.setHex(0, 0, { terrain: 'plains', revealed: true });
    logic.setHex(1, 0, { terrain: 'forest', revealed: true });
    logic.setHex(0, 1, { terrain: 'hills', revealed: false });
    return logic;
}

describe('HexGrid save/load round-trip preserves coordinates', () => {
    it('restores q/r on every hex after loadState', () => {
        const logic = makeLogic();
        const state = logic.getState();

        const reloaded = new HexGridLogic(40);
        reloaded.loadState(state);

        for (const [key, hex] of reloaded.hexes.entries()) {
            expect(typeof hex.q).toBe('number');
            expect(typeof hex.r).toBe('number');
            // Key format is "q,r" -> coordinates must match the key
            const [q, r] = key.split(',').map(Number);
            expect(hex.q).toBe(q);
            expect(hex.r).toBe(r);
        }
    });

    it('renderer.drawAllHexes does not warn on loaded hexes (no undefined coords)', () => {
        const logic = makeLogic();
        const state = logic.getState();

        const reloaded = new HexGridLogic(40);
        reloaded.loadState(state);

        // Stub a canvas + ctx so the renderer can construct and draw without a real canvas
        const canvas = document.createElement('canvas');
        const ctxStub = new Proxy({}, {
            get: (_t, prop) => {
                if (prop === 'canvas') return canvas;
                if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
                    return () => ({ addColorStop: () => {} });
                }
                if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
                if (prop === 'measureText') return () => ({ width: 0 });
                // Any other property access returns a no-op function (methods)
                return () => {};
            },
            set: () => true,
        });
        vi.spyOn(canvas, 'getContext').mockReturnValue(ctxStub);
        const renderer = new HexGridRenderer(canvas, reloaded);

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // render() reads logic.hexes and calls axialToPixel(q, r) for each
        renderer.render();
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
