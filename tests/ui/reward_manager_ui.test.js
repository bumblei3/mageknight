import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardManager } from '../../js/game/RewardManager.js';
import { Card } from '../../js/card.js';

describe('RewardManager UI', () => {
    let game;
    let rewardManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="reward-modal" class="modal">
                <div id="reward-choices"></div>
            </div>
        `;

        game = {
            hero: {
                addCardToDeck: vi.fn(),
                position: { q: 0, r: 0 }
            },
            addLog: vi.fn(),
            updateStats: vi.fn(),
            render: vi.fn(),
            hexGrid: {
                axialToPixel: () => ({ x: 100, y: 100 })
            },
            particleSystem: {
                buffEffect: vi.fn()
            }
        };

        rewardManager = new RewardManager(game);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should render artifact choices and handle selection', () => {
        rewardManager.showArtifactChoice(2);

        expect(rewardManager.modal.classList.contains('active')).toBe(true);
        const choices = rewardManager.choicesContainer.querySelectorAll('.choice-item');
        expect(choices.length).toBe(2);

        // Click first choice
        choices[0].click();

        expect(game.hero.addCardToDeck).toHaveBeenCalled();
        expect(rewardManager.modal.classList.contains('active')).toBe(false);
        expect(game.addLog).toHaveBeenCalledWith(expect.stringMatching(/beansprucht|claimed/), 'success');
        expect(game.particleSystem.buffEffect).toHaveBeenCalledWith(100, 100, 'gold');
    });

    it('should render spell choices and handle selection', () => {
        rewardManager.showSpellChoice(1);

        const choices = rewardManager.choicesContainer.querySelectorAll('.choice-item');
        expect(choices.length).toBe(1);

        const inner = choices[0].querySelector('.reward-card-inner');
        expect(inner.dataset.type).toBe('spell');

        choices[0].click();
        expect(game.hero.addCardToDeck).toHaveBeenCalled();
        // Since spells have colors, we expect buffEffect with card color
        expect(game.particleSystem.buffEffect).toHaveBeenCalled();
    });

    it('should gracefully handle missing DOM elements', () => {
        document.body.innerHTML = '';
        const brokenManager = new RewardManager(game);

        // Should not throw
        brokenManager.showArtifactChoice();
        expect(brokenManager.modal).toBeNull();
    });
});
