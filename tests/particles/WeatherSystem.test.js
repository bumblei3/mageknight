import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherSystem } from '../../js/particles/WeatherSystem.js';

describe('WeatherSystem', () => {
    let system;
    let mockEngine;
    let mockCanvas;

    beforeEach(() => {
        mockEngine = {
            addParticle: vi.fn(),
            burst: vi.fn()
        };
        mockCanvas = {
            width: 800,
            height: 600
        };
        system = new WeatherSystem(mockEngine, mockCanvas);
    });

    describe('setWeather', () => {
        it('should update current weather and intensity', () => {
            system.setWeather('rain', 0.8);
            expect(system.currentWeather).toBe('rain');
            expect(system.intensity).toBe(0.8);
            expect(system.active).toBe(true);
        });

        it('should set active to false when weather is clear', () => {
            system.setWeather('clear');
            expect(system.active).toBe(false);
        });
    });

    describe('update and spawnParticles', () => {
        it('should not spawn particles if active is false', () => {
            system.active = false;
            system.update(16);
            expect(mockEngine.addParticle).not.toHaveBeenCalled();
        });

        it('should spawn rain particles', () => {
            system.setWeather('rain', 2.0);
            system.update(16);

            // spawnCount = Math.ceil(2.0 * 2) = 4
            expect(mockEngine.addParticle).toHaveBeenCalledTimes(4);
            const call = mockEngine.addParticle.mock.calls[0];
            expect(call[2].type).toBe('rain');
            expect(call[2].color).toBe('#a5b4fc');
        });

        it('should spawn snow particles', () => {
            system.setWeather('snow', 2.0);
            system.update(16);

            // Math.ceil(spawnCount / 2) = Math.ceil(4 / 2) = 2
            expect(mockEngine.addParticle).toHaveBeenCalledTimes(2);
            expect(mockEngine.addParticle.mock.calls[0][2].type).toBe('snow');
        });

        it('should spawn ash particles sparsely', () => {
            system.setWeather('ash', 1.0);

            // Mock Math.random to always allow ash (roll <= 0.5)
            vi.spyOn(Math, 'random').mockReturnValue(0.1);

            system.update(16);
            expect(mockEngine.addParticle).toHaveBeenCalled();
            expect(mockEngine.addParticle.mock.calls[0][2].type).toBe('ash');

            vi.restoreAllMocks();
        });

        it('should not spawn ash if random roll > 0.5', () => {
            system.setWeather('ash', 1.0);
            vi.spyOn(Math, 'random').mockReturnValue(0.6);
            system.update(16);
            expect(mockEngine.addParticle).not.toHaveBeenCalled();
            vi.restoreAllMocks();
        });
    });

    describe('createSplash', () => {
        it('should trigger engine burst', () => {
            system.createSplash(100, 200, '#ffffff', 5);
            expect(mockEngine.burst).toHaveBeenCalledWith(100, 200, 5, expect.objectContaining({
                color: '#ffffff'
            }));
        });
    });

    describe('onGroundHit callbacks', () => {
        it('should trigger createSplash for rain', () => {
            system.setWeather('rain', 1.0);
            system.update(16);

            const particleConfig = mockEngine.addParticle.mock.calls[0][2];
            expect(particleConfig.onGroundHit).toBeDefined();

            particleConfig.onGroundHit(10, 20);
            expect(mockEngine.burst).toHaveBeenCalledWith(10, 20, 3, expect.anything());
        });

        it('should trigger createSplash for snow', () => {
            system.setWeather('snow', 1.0);
            system.update(16);

            const particleConfig = mockEngine.addParticle.mock.calls[0][2];
            particleConfig.onGroundHit(10, 20);
            expect(mockEngine.burst).toHaveBeenCalledWith(10, 20, 2, expect.anything());
        });
    });
});
