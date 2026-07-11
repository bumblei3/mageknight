import { describe, it, expect, vi } from 'vitest';
import { EnvironmentEffects } from '../js/particles/EnvironmentEffects.js';

function makeEngine() {
    return {
        addParticle: vi.fn(),
        burst: vi.fn(),
    };
}

describe('EnvironmentEffects', () => {
    let engine;
    let fx;

    beforeEach(() => {
        engine = makeEngine();
        fx = new EnvironmentEffects(engine);
    });

    it('trailEffect adds a particle with default color', () => {
        fx.trailEffect(10, 20);
        expect(engine.addParticle).toHaveBeenCalledWith(10, 20, expect.objectContaining({ color: '#8b5cf6' }));
    });

    it('trailEffect honors custom color', () => {
        fx.trailEffect(1, 2, '#ff0000');
        expect(engine.addParticle).toHaveBeenCalledWith(1, 2, expect.objectContaining({ color: '#ff0000' }));
    });

    it('dustCloudEffect bursts gray dust', () => {
        fx.dustCloudEffect(5, 5);
        expect(engine.burst).toHaveBeenCalledWith(5, 5, 5, expect.objectContaining({ color: '#a8a29e' }));
    });

    it('explosion bursts with default params', () => {
        fx.explosion(3, 4);
        expect(engine.burst).toHaveBeenCalledWith(3, 4, 30, expect.objectContaining({ color: '#ec4899' }));
    });

    it('explosion honors custom color and count', () => {
        fx.explosion(3, 4, '#00ff00', 12);
        expect(engine.burst).toHaveBeenCalledWith(3, 4, 12, expect.objectContaining({ color: '#00ff00' }));
    });

    it('levelUpEffect does a multi-stage explosion and ring', () => {
        vi.useFakeTimers();
        fx.levelUpEffect(50, 50);
        // Center + white flash (scheduled via setTimeout) + ring particles
        expect(engine.burst).toHaveBeenCalledTimes(1); // immediate gold center
        expect(engine.addParticle).toHaveBeenCalledTimes(36); // ring
        // Advance the 100ms timer -> white flash burst
        vi.advanceTimersByTime(100);
        expect(engine.burst).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it('discoveryEffect bursts star particles', () => {
        fx.discoveryEffect(7, 7);
        expect(engine.burst).toHaveBeenCalledWith(7, 7, 20, expect.objectContaining({ type: 'star' }));
    });

    it('victoryRainEffect spawns confetti', () => {
        fx.victoryRainEffect(800, 600);
        expect(engine.addParticle).toHaveBeenCalledTimes(5);
    });

    it('defeatSmokeEffect adds dark smoke', () => {
        fx.defeatSmokeEffect(9, 9);
        expect(engine.addParticle).toHaveBeenCalledWith(
            expect.any(Number), 9, expect.objectContaining({ color: '#57534e' })
        );
    });
});
