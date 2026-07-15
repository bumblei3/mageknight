/**
 * LevelUpManager - Coverage Boost
 * Targets js/game/LevelUpManager.ts (was ~64% branch / 83% lines).
 * Covers handleLevelUp guards + happy paths and confirmSelection branches.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelUpManager } from '../../js/game/LevelUpManager.js';

function makeGame(overrides = {}) {
    return {
        addLog: vi.fn(),
        updateStats: vi.fn(),
        hero: {
            id: 'goldyx',
            skills: [],
            levelUp: vi.fn(),
            addSkill: vi.fn(),
            addCardToDeck: vi.fn(),
        },
        ...overrides,
    };
}

describe('LevelUpManager - Coverage Boost', () => {
    let manager;
    let game;

    beforeEach(() => {
        game = makeGame();
        game.isTestEnvironment = true; // avoid the skillModal.show() await path
        manager = new LevelUpManager(game);
    });

    describe('handleLevelUp guards', () => {
        it('returns early when not leveled up', async () => {
            await manager.handleLevelUp({ leveledUp: false });
            expect(game.addLog).not.toHaveBeenCalled();
        });

        it('returns early when newLevel is undefined', async () => {
            await manager.handleLevelUp({ leveledUp: true, newLevel: undefined });
            expect(game.addLog).not.toHaveBeenCalled();
        });

        it('logs level-up and skips particle effect when none exists', async () => {
            // No game.particleSystem -> branch not taken
            await manager.handleLevelUp({ leveledUp: true, newLevel: 3 });
            expect(game.addLog).toHaveBeenCalledWith('⭐ Level 3 erreicht!', 'success');
        });

        it('triggers particle effect when particleSystem exists', async () => {
            const levelUpEffect = vi.fn();
            game.particleSystem = { levelUpEffect };
            await manager.handleLevelUp({ leveledUp: true, newLevel: 2 });
            expect(levelUpEffect).toHaveBeenCalled();
        });

        it('uses empty card offer when rewardManager missing', async () => {
            // No game.rewardManager -> cardOffer = []
            await manager.handleLevelUp({ leveledUp: true, newLevel: 4 });
            expect(game.addLog).toHaveBeenCalledWith('⭐ Level 4 erreicht!', 'success');
        });

        it('uses rewardManager.getAdvancedActionOffer when present', async () => {
            const getAdvancedActionOffer = vi.fn(() => [{ id: 'c1', name: 'Charge' }]);
            game.rewardManager = { getAdvancedActionOffer };
            await manager.handleLevelUp({ leveledUp: true, newLevel: 5 });
            expect(getAdvancedActionOffer).toHaveBeenCalledWith(3);
        });

        it('in test environment returns after updating confirm button', async () => {
            const updateConfirmButton = vi.spyOn(manager, 'updateConfirmButton');
            await manager.handleLevelUp({ leveledUp: true, newLevel: 6 });
            expect(updateConfirmButton).toHaveBeenCalled();
        });
    });

    describe('confirmSelection', () => {
        it('applies hero levelUp even with no selections', () => {
            manager.confirmSelection();
            expect(game.hero.levelUp).toHaveBeenCalled();
            expect(game.addLog).not.toHaveBeenCalledWith(expect.stringContaining('gelernt'), 'success');
        });

        it('applies a provided skill selection', () => {
            const skill = { id: 's1', name: 'Flight' };
            manager.confirmSelection({ skill });
            expect(game.hero.addSkill).toHaveBeenCalledWith(skill);
            expect(game.addLog).toHaveBeenCalledWith('Skill gelernt: Flight', 'success');
        });

        it('applies a provided card selection', () => {
            const card = { id: 'c1', name: 'Fireball' };
            manager.confirmSelection({ card });
            expect(game.hero.addCardToDeck).toHaveBeenCalledWith(card);
            expect(game.addLog).toHaveBeenCalledWith('Karte gelernt: Fireball', 'success');
        });

        it('uses internal state when no argument given', () => {
            const skill = { id: 's2', name: 'Healing' };
            const card = { id: 'c2', name: 'Rage' };
            manager.selectedSkill = skill;
            manager.selectedCard = card;
            manager.confirmSelection();
            expect(game.hero.addSkill).toHaveBeenCalledWith(skill);
            expect(game.hero.addCardToDeck).toHaveBeenCalledWith(card);
            // internal state reset
            expect(manager.selectedSkill).toBeNull();
            expect(manager.selectedCard).toBeNull();
            expect(game.hero.levelUp).toHaveBeenCalledTimes(1);
        });

        it('falls back to internal state when argument partial', () => {
            const skill = { id: 's3', name: 'Motivation' };
            const card = { id: 'c3', name: 'Dash' };
            manager.selectedCard = card;
            manager.confirmSelection({ skill });
            expect(game.hero.addSkill).toHaveBeenCalledWith(skill);
            expect(game.hero.addCardToDeck).toHaveBeenCalledWith(card);
        });
    });

    describe('updateConfirmButton', () => {
        it('does nothing when confirmBtn is null', () => {
            expect(() => manager.updateConfirmButton()).not.toThrow();
        });

        it('enables button only when both selections present', () => {
            const btn = { disabled: true };
            manager.confirmBtn = btn;
            manager.updateConfirmButton();
            expect(btn.disabled).toBe(true); // nothing selected
            manager.selectedSkill = { id: 's' };
            manager.selectedCard = { id: 'c' };
            manager.updateConfirmButton();
            expect(btn.disabled).toBe(false);
            manager.selectedSkill = null;
            manager.updateConfirmButton();
            expect(btn.disabled).toBe(true);
        });
    });
});
