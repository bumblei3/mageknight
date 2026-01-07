import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { GAME_EVENTS } from '../../js/constants.js';
import { eventBus } from '../../js/eventBus.js';

// Mock dependencies
vi.mock('../../js/particles.js');
vi.mock('../../js/particles/WeatherSystem.js');

describe('Visual Event Hooks', () => {
    let game;
    let particleSpy;

    beforeEach(() => {
        game = new MageKnightGame();
        // Manually mock the particle system methods we are testing
        game.particleSystem = {
            dustCloudEffect: vi.fn(),
            trailEffect: vi.fn(),
            shieldBlockEffect: vi.fn(),
            createFloatingText: vi.fn(),
            damageSplatter: vi.fn(),
            createDamageNumber: vi.fn(),
            triggerShake: vi.fn(),
            registerSystem: vi.fn()
        };

        // Re-setup listeners because we just replaced the particle system
        // Note: In real app, listeners bind to 'this.particleSystem' passed at setup time.
        // We might need to manually trigger the listener callback to verify it calls OUR mock.
        // OR, easier: spy on eventBus emission, which we know triggers the listener.

        // Spy on event bus
        vi.spyOn(eventBus, 'emit');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should emit HERO_MOVE_STEP when hero moves', async () => {
        // Setup hero position
        game.hero.position = { q: 0, r: 0 };
        game.hero.movementPoints = 10;
        game.movementMode = true;

        // Mock HexGrid
        game.hexGrid.distance = () => 1;
        game.hexGrid.getMovementCost = () => 2;
        game.animator.animateHeroMove = vi.fn().mockResolvedValue();

        await game.actionManager.moveHero(0, 1);

        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.HERO_MOVE_STEP, expect.anything());
    });

    it('should emit COMBAT_BLOCK when blocking', () => {
        // Mock combat
        game.initiateCombat({ name: 'Orc', armor: 3, attack: 4, position: { q: 2, r: 2 } });
        game.combat.phase = 'block';

        // Mock block function
        game.combat.blockEnemy = vi.fn().mockReturnValue({ success: true, blocked: true, totalBlock: 4 });

        // Trigger handleEnemyClick (which calls blockEnemy)
        game.combatOrchestrator.handleEnemyClick(game.combat.enemies[0]);

        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.COMBAT_BLOCK, expect.anything());
    });
});
