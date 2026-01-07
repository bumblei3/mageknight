import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhaseManager } from '../../js/game/PhaseManager.js';
import { createMockElement, setupGlobalMocks } from '../test-mocks.js';

describe('PhaseManager Overlay', () => {
    let phaseManager;
    let mockGame;
    let mockTimeManager;
    let overlay;
    let message;

    beforeEach(() => {
        setupGlobalMocks();

        // Setup DOM elements
        overlay = createMockElement('div');
        overlay.id = 'day-night-overlay';

        message = createMockElement('div');
        message.id = 'day-night-message';

        document.body.appendChild(overlay);
        document.body.appendChild(message);

        // Mock Game & TimeManager
        mockTimeManager = {
            listeners: [],
            addListener: (cb) => mockTimeManager.listeners.push(cb),
            isDay: () => true,
            getState: () => ({ timeOfDay: 'day', round: 1 })
        };

        mockGame = {
            timeManager: mockTimeManager,
            hexGrid: { setTimeOfDay: vi.fn() },
            render: vi.fn(),
            setGameTimeout: vi.fn(), // Do not execute immediately
            addLog: vi.fn(),
            showToast: vi.fn(),
            enemyAI: { updateEnemies: vi.fn().mockResolvedValue([]) },
            statisticsManager: { increment: vi.fn() },
            checkAndShowAchievements: vi.fn(),
            turnManager: { endTurn: vi.fn() },
            gameState: 'playing'
        };

        phaseManager = new PhaseManager(mockGame);
    });

    it('should show overlay and update text when switching to night', () => {
        phaseManager.setupTimeListener();

        // Trigger listener with Night state
        const listener = mockTimeManager.listeners[0];
        listener({ timeOfDay: 'night', round: 1 });

        expect(message.textContent).toContain('Nacht');
        expect(overlay.classList.contains('active')).toBe(true);
    });

    it('should show overlay and update text when switching to day', () => {
        phaseManager.setupTimeListener();

        // Trigger listener with Day state
        const listener = mockTimeManager.listeners[0];
        listener({ timeOfDay: 'day', round: 2 });

        expect(message.textContent).toContain('Tag');
        expect(overlay.classList.contains('active')).toBe(true);
    });
});
