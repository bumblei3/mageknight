import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherSystem } from '../../js/particles/WeatherSystem.js';

describe('WeatherSystem', () => {
    let mockEngine;
    let mockCanvas;
    let weatherSystem;

    beforeEach(() => {
        mockEngine = {
            addParticle: vi.fn(),
            update: vi.fn()
        };
        mockCanvas = { width: 800, height: 600 };
        weatherSystem = new WeatherSystem(mockEngine, mockCanvas);
    });

    it('should initialize with clear weather', () => {
        expect(weatherSystem.currentWeather).toBe('clear');
        expect(weatherSystem.active).toBe(false);
    });

    it('should set weather correctly', () => {
        weatherSystem.setWeather('rain', 0.8);
        expect(weatherSystem.currentWeather).toBe('rain');
        expect(weatherSystem.intensity).toBe(0.8);
        expect(weatherSystem.active).toBe(true);
    });

    it('should spawn particles when active', () => {
        weatherSystem.setWeather('rain', 1.0);
        weatherSystem.update(0.016);
        expect(mockEngine.addParticle).toHaveBeenCalled();
    });

    it('should not spawn particles when clear', () => {
        weatherSystem.setWeather('clear');
        weatherSystem.update(0.016);
        expect(mockEngine.addParticle).not.toHaveBeenCalled();
    });
});
