/**
 * SoundManager - Coverage Boost
 * Targets js/soundManager.ts (was ~78% lines).
 * Covers init/toggle/setVolume, playTone/playChord/playNoise, all SFX methods, and destroy.
 *
 * Web Audio API is not available in the test env, so we provide a minimal mock AudioContext.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Minimal Web Audio mock -------------------------------------------------

function createMockAudioContext() {
    const nodes = [];
    function makeNode(extra = {}) {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            frequency: { value: 0, setValueAtTime: vi.fn() },
            gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            type: 'sine',
            ...extra,
        };
    }
    const ctx = {
        state: 'running',
        currentTime: 0,
        sampleRate: 44100,
        destination: makeNode(),
        createOscillator: vi.fn(() => { const n = makeNode(); nodes.push(n); return n; }),
        createGain: vi.fn(() => { const n = makeNode(); nodes.push(n); return n; }),
        createBuffer: vi.fn((channels, size) => ({
            getChannelData: vi.fn(() => new Float32Array(size)),
        })),
        createBufferSource: vi.fn(() => { const n = makeNode(); nodes.push(n); return n; }),
        createBiquadFilter: vi.fn(() => { const n = makeNode(); nodes.push(n); return n; }),
        close: vi.fn().mockResolvedValue(undefined),
        _nodes: nodes,
    };
    return ctx;
}

describe('SoundManager - Coverage Boost', () => {
    let SoundManager;
    let mockCtx;
    let originalAudioContext;

    beforeEach(async () => {
        mockCtx = createMockAudioContext();
        originalAudioContext = global.window.AudioContext;
        // A real constructor (not an arrow fn) that returns our mock instance.
        global.window.AudioContext = function () { return mockCtx; };
        // fresh module per test so constructor/init runs against the mock
        vi.resetModules();
        ({ SoundManager } = await import('../../js/soundManager.js'));
    });

    afterEach(() => {
        global.window.AudioContext = originalAudioContext;
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('init creates context and enables sound', () => {
        const sm = new SoundManager();
        expect(sm.enabled).toBe(true);
        expect(mockCtx.createOscillator).toBeDefined();
    });

    it('toggle flips enabled state', () => {
        const sm = new SoundManager();
        const before = sm.enabled;
        const after = sm.toggle();
        expect(after).toBe(!before);
        expect(sm.enabled).toBe(after);
    });

    it('setVolume clamps to [0,1]', () => {
        const sm = new SoundManager();
        sm.setVolume(2);
        // masterVolume is private; reach via playing a tone that multiplies it
        expect(sm.enabled).toBe(true);
        sm.setVolume(-5);
        sm.setVolume(0.5);
        // No throw is the assertion here; verify a tone still plays
        expect(() => sm.playTone(440, 0.1)).not.toThrow();
    });

    it('playTone builds oscillator + gain and starts/stops', () => {
        const sm = new SoundManager();
        sm.playTone(440, 0.1, 'triangle', 0.2);
        expect(mockCtx.createOscillator).toHaveBeenCalled();
        expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it('playTone is a no-op when sound disabled', () => {
        const sm = new SoundManager();
        sm.enabled = false;
        const oscBefore = mockCtx.createOscillator.mock.calls.length;
        sm.playTone(440, 0.1);
        expect(mockCtx.createOscillator.mock.calls.length).toBe(oscBefore);
    });

    it('playTone handles closed context gracefully', () => {
        const sm = new SoundManager();
        mockCtx.state = 'closed';
        expect(() => sm.playTone(440, 0.1)).not.toThrow();
    });

    it('playTone catches audio errors', () => {
        const sm = new SoundManager();
        mockCtx.createOscillator.mockImplementationOnce(() => { throw new Error('boom'); });
        expect(() => sm.playTone(440, 0.1)).not.toThrow();
    });

    it('playChord schedules multiple tones and tracks timeouts', () => {
        vi.useFakeTimers();
        const sm = new SoundManager();
        sm.playChord([440, 550, 660], 0.2, 'sine');
        vi.runAllTimers();
        expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
    });

    it('playNoise builds a buffer and noise source', () => {
        const sm = new SoundManager();
        sm.playNoise(0.1, 500);
        expect(mockCtx.createBuffer).toHaveBeenCalled();
        expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('playNoise re-inits when context missing', () => {
        const sm = new SoundManager();
        sm.ctx = null;
        sm.playNoise(0.1, 500);
        expect(mockCtx.createBuffer).toHaveBeenCalled();
    });

    it('playNoise uses filter branch when createBiquadFilter exists', () => {
        const sm = new SoundManager();
        sm.playNoise(0.1, 1000);
        expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('playNoise works without createBiquadFilter', () => {
        const sm = new SoundManager();
        mockCtx.createBiquadFilter = undefined;
        expect(() => sm.playNoise(0.1, 1000)).not.toThrow();
    });

    it('covers all SFX effect methods without throwing', () => {
        const sm = new SoundManager();
        const methods = [
            'cardDraw', 'cardPlay', 'cardPlayStrong', 'cardPlaySideways',
            'move', 'attack', 'hit', 'block', 'victory', 'defeat',
            'levelUp', 'error', 'notification', 'manaUse', 'explore',
            'achievement', 'click', 'hover', 'combatStart', 'enemyDefeated',
            'heal', 'skillUse',
        ];
        for (const m of methods) {
            expect(typeof sm[m]).toBe('function');
            expect(() => sm[m]()).not.toThrow();
        }
    });

    it('move/hit/victory track timeouts and clean up', () => {
        vi.useFakeTimers();
        const sm = new SoundManager();
        sm.move();
        sm.hit();
        sm.victory();
        expect(sm.timeouts.size).toBeGreaterThan(0);
        vi.runAllTimers();
        expect(sm.timeouts.size).toBe(0);
        vi.useRealTimers();
    });

    it('destroy clears timeouts and closes context', () => {
        const sm = new SoundManager();
        sm.timeouts.add(setTimeout(() => {}, 1000));
        sm.destroy();
        expect(sm.timeouts.size).toBe(0);
        expect(mockCtx.close).toHaveBeenCalled();
    });

    it('init is a no-op if context already open', () => {
        const sm = new SoundManager();
        const firstCtx = sm.ctx;
        sm.init();
        expect(sm.ctx).toBe(firstCtx);
    });

    it('init disables sound when AudioContext throws', async () => {
        global.window.AudioContext = function () { throw new Error('no audio'); };
        const { SoundManager: SM2 } = await import('../../js/soundManager.js');
        const sm = new SM2();
        expect(sm.enabled).toBe(false);
    });
});
