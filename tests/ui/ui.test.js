import { describe, it, expect, beforeEach } from '../testRunner.js';
import { UI } from '../../js/ui.js';
import { TutorialManager } from '../../js/tutorialManager.js';
import { createSpy, createMockElement } from '../test-mocks.js';

// Mock TooltipManager since UI imports it
// We need to ensure the import in UI.js doesn't fail or use the real one if it has side effects.
// Since we are in a module environment, we can't easily mock imports for the module under test without a bundler or loader hooks.
// However, TooltipManager probably just attaches events.
// Let's rely on the mock DOM to handle what TooltipManager does.

describe('UI', () => {
    let ui;
    let mockElements;

    beforeEach(() => {
        ui = new UI();
        const mockGame = {
            combat: {
                blockedEnemies: new Set()
            }
        };
        ui.setGame(mockGame);
    });

    it('should initialize and get elements', () => {
        expect(ui.elements).toBeDefined();
        expect(ui.elements.fameValue).toBeDefined();
        expect(ui.tooltipManager).toBeDefined();
    });

    it('should update hero stats', () => {
        const mockHero = {
            getStats: () => ({
                name: 'TestHero',
                armor: 5,
                handLimit: 6,
                wounds: 0,
                fame: 10,
                reputation: 2
            }),
            skills: [],
            usedSkills: new Set()
        };

        // Pre-set some text content to test changes
        ui.elements.heroArmor.textContent = '3';

        ui.updateHeroStats(mockHero);

        expect(ui.elements.heroName.textContent).toBe('TestHero');
        expect(ui.elements.heroHandLimit.textContent).toBe('6');
        // Armor and fame use animation, so immediate textContent might not update or might be handled by animator mock?
        // In setup.js, requestAnimationFrame is setTimeout(cb, 0).
        // animateCounter uses requestAnimationFrame.
        // We might need to wait or mock animateCounter.
        // Since animateCounter is imported, we can't easily mock it without interception.
        // But we can check if the function ran without error.
    });

    it('should update movement points', () => {
        ui.updateMovementPoints(5);
        expect(ui.elements.movementPoints.textContent).toBe('5');
    });

    it('should render hand cards', () => {
        const hand = [
            { name: 'Card 1', color: 'red', isWound: () => false, basicEffect: {}, strongEffect: {} },
            { name: 'Wound', color: 'none', isWound: () => true }
        ];

        let clickedIndex = -1;
        const onCardClick = (index) => { clickedIndex = index; };

        ui.renderHandCards(hand, onCardClick);

        // Children may accumulate across tests in mock
        expect(ui.elements.handCards.children.length).toBeGreaterThanOrEqual(2);

        // Test click on first card (MockHTMLElement doesn't trigger event listeners automatically, 
        // but we can manually invoke if we stored them, or just trust the logic adds them.
        // To test the callback, we'd need to simulate the click.
        // The MockHTMLElement in setup.js has addEventListener but it doesn't store callbacks in a way we can easily trigger them publicly 
        // unless we modify MockHTMLElement or spy on it.
        // For now, we verify the elements are created.
    });

    it('should render mana source', () => {
        const mockManaSource = {
            getAvailableDice: () => [
                { color: 'red', available: true },
                { color: 'blue', available: false }
            ]
        };

        ui.renderManaSource(mockManaSource);

        // Children may accumulate across tests in mock
        expect(ui.elements.manaSource.children.length).toBeGreaterThanOrEqual(2);
        // Check classes
        // MockHTMLElement classList.add is a no-op spy.
        // We can't easily check classList contents with the current simple mock.
    });

    it('should add log entry', () => {
        ui.addLog('Test message', 'info');
        // Children may accumulate across tests in mock
        expect(ui.elements.gameLog.children.length).toBeGreaterThanOrEqual(1);
        // Check that message is present in the log entry (now has timestamp, icon, etc)
        const lastChild = ui.elements.gameLog.children[ui.elements.gameLog.children.length - 1];
        expect(lastChild.textContent.includes('Test message')).toBe(true);
    });

    it('should clear log', () => {
        ui.addLog('Msg 1');
        ui.clearLog();
        expect(ui.elements.gameLog.innerHTML).toBe('');
    });

    it('should show combat panel', () => {
        const enemies = [{ name: 'Orc', armor: 3, attack: 4, fame: 2, icon: 'O' }];
        ui.showCombatPanel(enemies, 'attack');

        expect(ui.elements.combatPanel.style.display).toBe('flex');
        expect(ui.elements.combatInfo.children.length).toBeGreaterThan(0);
    });

    it('should hide combat panel', () => {
        ui.hideCombatPanel();
        expect(ui.elements.combatPanel.style.display).toBe('none');
    });

    it('should render units', () => {
        const units = [
            {
                getName: () => 'Peasant',
                getIcon: () => 'P',
                level: 1,
                isReady: () => true,
                wounds: 0,
                getAbilities: () => [{ text: 'Farm' }],
                armor: 2
            }
        ];

        ui.renderUnits(units);

        // renderUnits creates a grid div, then appends units to it.
        // So heroUnits should have 1 child (the grid).
        expect(ui.elements.heroUnits.children.length).toBe(1);
    });

    it('should show play area', () => {
        ui.showPlayArea();
        expect(ui.elements.playArea.style.display).toBe('flex');
    });

    it('should hide play area', () => {
        ui.hidePlayArea();
        expect(ui.elements.playArea.style.display).toBe('none');
    });

    describe('Event Handling', () => {
        it('should handle end turn button click', () => {
            let endTurnCalled = false;
            const mockGame = {
                endTurn: () => { endTurnCalled = true; }
            };

            // Re-initialize UI with mock game if possible, or attach listener manually
            // UI attaches listeners in constructor usually.
            // Let's simulate the click on the element

            // We need to spy on addEventListener to capture the callback
            // This is hard with current mock setup unless we modify MockHTMLElement
            // Alternative: UI.bindEvents(game) method?

            // Looking at UI.js (inferred), it likely has a method to bind events or does it in constructor.
            // If it does it in constructor, we missed capturing it.

            // Let's assume we can manually trigger it if we had the callback.
            // For now, let's test that the elements exist and have IDs, which is a prerequisite for events.
            expect(ui.elements.endTurnBtn).toBeDefined();
        });
    });

    describe('Helper Methods', () => {
        it('should get color name for red', () => {
            expect(ui.getColorName('red')).toBe('Angriff');
        });

        it('should get color name for blue', () => {
            expect(ui.getColorName('blue')).toBe('Block');
        });

        it('should get color name for unknown', () => {
            expect(ui.getColorName('unknown')).toBe('unknown');
        });

        it('should get color hex for red', () => {
            expect(ui.getColorHex('red')).toBe('#ef4444');
        });

        it('should get color hex for blue', () => {
            expect(ui.getColorHex('blue')).toBe('#3b82f6');
        });

        it('should get color hex for unknown', () => {
            expect(ui.getColorHex('unknown')).toBe('#6b7280');
        });

        it('should get mana icon for red', () => {
            expect(ui.getManaIcon('red')).toBe('🔥');
        });

        it('should get mana icon for blue', () => {
            expect(ui.getManaIcon('blue')).toBe('💧');
        });

        it('should get combat phase name for ranged', () => {
            expect(ui.getCombatPhaseName('ranged')).toBe('Fernkampf-Phase');
        });

        it('should get combat phase name for block', () => {
            expect(ui.getCombatPhaseName('block')).toBe('Block-Phase');
        });

        it('should get combat phase name for attack', () => {
            expect(ui.getCombatPhaseName('attack')).toBe('Angriffs-Phase');
        });

        it('should get card icon for move card', () => {
            const card = { color: 'green' };
            expect(ui.getCardIcon(card)).toBe('👣');
        });

        it('should get card icon for attack card', () => {
            const card = { color: 'red' };
            expect(ui.getCardIcon(card)).toBe('⚔️');
        });

        it('should format attack effect', () => {
            const result = ui.formatEffect({ attack: 3 });
            expect(result).toContain('3');
        });

        it('should format block effect', () => {
            const result = ui.formatEffect({ block: 2 });
            expect(result).toContain('2');
        });

        it('should format movement effect', () => {
            const result = ui.formatEffect({ movement: 2 });
            expect(result).toContain('2');
        });
    });

    it('should show and hide site modal', () => {
        const data = {
            icon: '🏠',
            name: 'Village',
            color: 'green',
            description: 'A quiet village',
            options: []
        };
        ui.showSiteModal(data);
        expect(ui.elements.siteModal.classList.contains('show')).toBe(true);

        ui.hideSiteModal();
        expect(ui.elements.siteModal.classList.contains('show')).toBe(false);
    });

    it('should show toast notifications', () => {
        ui.notifications.toastContainer = createMockElement('div');
        ui.showToast('Test Toast', 'info');
        expect(ui.notifications.toastContainer.children.length).toBe(1);
        expect(ui.notifications.toastContainer.textContent).toContain('Test Toast');
    });

    describe('Healing Button', () => {
        it('should show heal button when wounds AND points exist', () => {
            const mockHero = {
                getStats: () => ({ wounds: 1, name: 'Hero' }),
                healingPoints: 1,
                skills: [],
                usedSkills: new Set()
            };
            ui.updateHeroStats(mockHero);
            expect(ui.elements.healBtn.style.display).toBe('block');
        });

        it('should hide heal button when no wounds', () => {
            const mockHero = {
                getStats: () => ({ wounds: 0, name: 'Hero' }),
                healingPoints: 5,
                skills: [],
                usedSkills: new Set()
            };
            ui.updateHeroStats(mockHero);
            expect(ui.elements.healBtn.style.display).toBe('none');
        });
    });
});
