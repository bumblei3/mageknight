import { describe, it, expect, beforeEach } from './testRunner.js';
import { HandRenderer } from '../js/ui/HandRenderer.js';
import { ManaRenderer } from '../js/ui/ManaRenderer.js';
import { StatsRenderer } from '../js/ui/StatsRenderer.js';
import { createMockElement } from './test-mocks.js';

/**
 * Tests for UI Renderer components.
 */

describe('HandRenderer', () => {
    let handRenderer;
    let mockElements;
    let mockTooltipManager;

    beforeEach(() => {
        mockElements = {
            handCards: createMockElement('div'),
            playArea: createMockElement('div'),
            playedCards: createMockElement('div')
        };

        mockTooltipManager = {
            showCardTooltip: () => { },
            hideTooltip: () => { },
            attachToElement: () => { }
        };

        handRenderer = new HandRenderer(mockElements, mockTooltipManager);
    });

    describe('Helper Methods', () => {
        it('should get correct icon for red cards', () => {
            expect(handRenderer.getCardIcon({ color: 'red' })).toBe('⚔️');
        });

        it('should get correct icon for blue cards', () => {
            expect(handRenderer.getCardIcon({ color: 'blue' })).toBe('🛡️');
        });

        it('should get correct icon for green cards', () => {
            expect(handRenderer.getCardIcon({ color: 'green' })).toBe('👣');
        });

        it('should get correct icon for white cards', () => {
            expect(handRenderer.getCardIcon({ color: 'white' })).toBe('💬');
        });

        it('should get correct color name for red', () => {
            expect(handRenderer.getColorName('red')).toBe('Angriff');
        });

        it('should get correct color name for blue', () => {
            expect(handRenderer.getColorName('blue')).toBe('Block');
        });

        it('should get correct color name for green', () => {
            expect(handRenderer.getColorName('green')).toBe('Bewegung');
        });

        it('should get correct color name for white', () => {
            expect(handRenderer.getColorName('white')).toBe('Einfluss');
        });

        it('should return unknown color name as-is', () => {
            expect(handRenderer.getColorName('purple')).toBe('purple');
        });

        it('should format movement effect', () => {
            expect(handRenderer.formatEffect({ movement: 2 })).toContain('2');
            expect(handRenderer.formatEffect({ movement: 2 })).toContain('👣');
        });

        it('should format attack effect', () => {
            expect(handRenderer.formatEffect({ attack: 3 })).toContain('3');
            expect(handRenderer.formatEffect({ attack: 3 })).toContain('⚔️');
        });

        it('should format block effect', () => {
            expect(handRenderer.formatEffect({ block: 4 })).toContain('4');
            expect(handRenderer.formatEffect({ block: 4 })).toContain('🛡️');
        });

        it('should format influence effect', () => {
            expect(handRenderer.formatEffect({ influence: 2 })).toContain('2');
            expect(handRenderer.formatEffect({ influence: 2 })).toContain('💬');
        });

        it('should format healing effect', () => {
            expect(handRenderer.formatEffect({ healing: 1 })).toContain('1');
            expect(handRenderer.formatEffect({ healing: 1 })).toContain('❤️');
        });

        it('should return "Keine" for empty effect', () => {
            expect(handRenderer.formatEffect({})).toBe('Keine');
        });

        it('should get correct hex for red', () => {
            expect(handRenderer.getColorHex('red')).toBe('#ef4444');
        });

        it('should get correct hex for blue', () => {
            expect(handRenderer.getColorHex('blue')).toBe('#3b82f6');
        });

        it('should get correct hex for green', () => {
            expect(handRenderer.getColorHex('green')).toBe('#10b981');
        });

        it('should get default hex for unknown', () => {
            expect(handRenderer.getColorHex('unknown')).toBe('#6b7280');
        });
    });

    describe('Play Area', () => {
        it('should show play area', () => {
            handRenderer.showPlayArea();
            expect(mockElements.playArea.style.display).toBe('flex');
        });

        it('should hide play area and clear played cards', () => {
            mockElements.playArea.style.display = 'flex';
            mockElements.playedCards.innerHTML = '<div>Card</div>';
            handRenderer.hidePlayArea();
            expect(mockElements.playArea.style.display).toBe('none');
            expect(mockElements.playedCards.innerHTML).toBe('');
        });
    });

    describe('Card Rendering', () => {
        it('should create card element with correct data attributes', () => {
            const card = {
                name: 'Test Card',
                color: 'red',
                isWound: () => false,
                basicEffect: { attack: 2 },
                strongEffect: { attack: 4 }
            };
            const cardEl = handRenderer.createCardElement(card, 0);
            expect(String(cardEl.dataset.index)).toBe('0');
            expect(cardEl.dataset.color).toBe('red');
            expect(cardEl.classList.contains('card')).toBe(true);
        });

        it('should create wound card with wound-card class', () => {
            const woundCard = {
                name: 'Wound',
                color: 'none',
                isWound: () => true
            };
            const cardEl = handRenderer.createCardElement(woundCard, 0);
            expect(cardEl.classList.contains('wound-card')).toBe(true);
        });

        it('should render hand cards and clear container first', () => {
            mockElements.handCards.innerHTML = '<div>Old Card</div>';
            const hand = [
                { name: 'Card 1', color: 'green', isWound: () => false, basicEffect: { movement: 2 }, strongEffect: {} }
            ];
            handRenderer.renderHandCards(hand, () => { }, () => { });
            // After render, container should have 1 child (the new card)
            expect(mockElements.handCards.children.length).toBe(1);
        });
    });
});

describe('ManaRenderer', () => {
    let manaRenderer;
    let mockElements;
    let mockTooltipManager;

    beforeEach(() => {
        mockElements = {
            manaSource: createMockElement('div')
        };

        mockTooltipManager = {
            createStatTooltipHTML: (title, desc) => `<b>${title}</b><p>${desc}</p>`,
            attachToElement: () => { }
        };

        manaRenderer = new ManaRenderer(mockElements, mockTooltipManager);
    });

    describe('Mana Icons', () => {
        it('should return fire icon for red mana', () => {
            expect(manaRenderer.getManaIcon('red')).toBe('🔥');
        });

        it('should return water icon for blue mana', () => {
            expect(manaRenderer.getManaIcon('blue')).toBe('💧');
        });

        it('should return sparkle icon for white mana', () => {
            expect(manaRenderer.getManaIcon('white')).toBe('✨');
        });

        it('should return leaf icon for green mana', () => {
            expect(manaRenderer.getManaIcon('green')).toBe('🌿');
        });

        it('should return star icon for gold mana', () => {
            expect(manaRenderer.getManaIcon('gold')).toBe('⭐');
        });

        it('should return skull icon for black mana', () => {
            expect(manaRenderer.getManaIcon('black')).toBe('💀');
        });

        it('should return question mark for unknown mana', () => {
            expect(manaRenderer.getManaIcon('unknown')).toBe('❓');
        });
    });

    describe('Mana Tooltip Info', () => {
        it('should return correct info for red mana', () => {
            const info = manaRenderer.getManaTooltipInfo('red');
            expect(info.title).toBe('Rotes Mana');
            expect(info.desc).toContain('Angriff');
        });

        it('should return correct info for blue mana', () => {
            const info = manaRenderer.getManaTooltipInfo('blue');
            expect(info.title).toBe('Blaues Mana');
            expect(info.desc).toContain('Eis');
        });

        it('should return correct info for gold mana', () => {
            const info = manaRenderer.getManaTooltipInfo('gold');
            expect(info.title).toBe('Goldenes Mana');
            expect(info.desc).toContain('Joker');
        });

        it('should return default info for unknown mana', () => {
            const info = manaRenderer.getManaTooltipInfo('unknown');
            expect(info.title).toBe('Mana');
        });
    });

    describe('Mana Source Rendering', () => {
        it('should render mana dice', () => {
            const mockManaSource = {
                getAvailableDice: () => [
                    { color: 'red', available: true },
                    { color: 'blue', available: false }
                ]
            };
            manaRenderer.renderManaSource(mockManaSource, null, false);
            expect(mockElements.manaSource.children.length).toBe(2);
        });

        it('should clear mana source before rendering', () => {
            mockElements.manaSource.innerHTML = '<div>Old Die</div>';
            const mockManaSource = {
                getAvailableDice: () => [{ color: 'red', available: true }]
            };
            manaRenderer.renderManaSource(mockManaSource, null, false);
            expect(mockElements.manaSource.children.length).toBe(1);
        });
    });

    describe('Reset', () => {
        it('should clear mana source on reset', () => {
            mockElements.manaSource.innerHTML = '<div>Die</div>';
            manaRenderer.reset();
            expect(mockElements.manaSource.innerHTML).toBe('');
        });
    });
});

describe('StatsRenderer', () => {
    let statsRenderer;
    let mockElements;

    beforeEach(() => {
        mockElements = {
            heroName: createMockElement('span'),
            heroArmor: createMockElement('span'),
            heroHandLimit: createMockElement('span'),
            heroWounds: createMockElement('span'),
            fameValue: createMockElement('span'),
            reputationValue: createMockElement('span'),
            movementPoints: createMockElement('span'),
            healBtn: createMockElement('button')
        };

        // Set initial values
        mockElements.heroArmor.textContent = '2';
        mockElements.heroHandLimit.textContent = '5';
        mockElements.heroWounds.textContent = '0';
        mockElements.fameValue.textContent = '0';
        mockElements.reputationValue.textContent = '0';

        statsRenderer = new StatsRenderer(mockElements);
    });

    describe('Movement Points', () => {
        it('should update movement points', () => {
            statsRenderer.updateMovementPoints(5);
            expect(mockElements.movementPoints.textContent).toBe('5');
        });

        it('should update movement points to zero', () => {
            statsRenderer.updateMovementPoints(0);
            expect(mockElements.movementPoints.textContent).toBe('0');
        });
    });

    describe('Hero Stats', () => {
        it('should update hero name', () => {
            const hero = {
                getStats: () => ({ name: 'Goldyx', armor: 2, handLimit: 5, wounds: 0, fame: 0, reputation: 0 }),
                healingPoints: 0
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.heroName.textContent).toBe('Goldyx');
        });

        it('should update hand limit', () => {
            const hero = {
                getStats: () => ({ name: 'Hero', armor: 2, handLimit: 7, wounds: 0, fame: 0, reputation: 0 }),
                healingPoints: 0
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.heroHandLimit.textContent).toBe('7');
        });

        it('should update wounds', () => {
            const hero = {
                getStats: () => ({ name: 'Hero', armor: 2, handLimit: 5, wounds: 2, fame: 0, reputation: 0 }),
                healingPoints: 0
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.heroWounds.textContent).toBe('2');
        });

        it('should show heal button when wounds and healing points exist', () => {
            const hero = {
                getStats: () => ({ name: 'Hero', armor: 2, handLimit: 5, wounds: 1, fame: 0, reputation: 0 }),
                healingPoints: 3
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.healBtn.style.display).toBe('block');
        });

        it('should hide heal button when no wounds', () => {
            const hero = {
                getStats: () => ({ name: 'Hero', armor: 2, handLimit: 5, wounds: 0, fame: 0, reputation: 0 }),
                healingPoints: 3
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.healBtn.style.display).toBe('none');
        });

        it('should hide heal button when no healing points', () => {
            const hero = {
                getStats: () => ({ name: 'Hero', armor: 2, handLimit: 5, wounds: 2, fame: 0, reputation: 0 }),
                healingPoints: 0
            };
            statsRenderer.updateHeroStats(hero);
            expect(mockElements.healBtn.style.display).toBe('none');
        });
    });

    describe('Reset', () => {
        it('should reset all stats to defaults', () => {
            mockElements.fameValue.textContent = '100';
            mockElements.movementPoints.textContent = '5';
            mockElements.heroWounds.textContent = '3';

            statsRenderer.reset();

            expect(mockElements.fameValue.textContent).toBe('0');
            expect(mockElements.reputationValue.textContent).toBe('0');
            expect(mockElements.movementPoints.textContent).toBe('0');
            expect(mockElements.heroArmor.textContent).toBe('2');
            expect(mockElements.heroHandLimit.textContent).toBe('5');
            expect(mockElements.heroWounds.textContent).toBe('0');
            expect(mockElements.healBtn.style.display).toBe('none');
        });
    });
});
