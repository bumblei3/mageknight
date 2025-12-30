import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import UI from '../js/ui.js';
import { createMockElement, createSpy } from './test-mocks.js';

describe('UI Boost', () => {
    let ui, game;
    let originalCreateElement, originalGetElementById;

    beforeEach(() => {
        originalCreateElement = global.document.createElement;
        originalGetElementById = global.document.getElementById;

        const elements = {};
        global.document.getElementById = (id) => {
            if (!elements[id]) {
                elements[id] = createMockElement('div');
                elements[id].id = id;
            }
            return elements[id];
        };
        // Pre-initialize elements that UI expects in constructor
        document.getElementById('hand-cards');
        document.getElementById('played-cards');
        document.getElementById('unit-cards');
        document.getElementById('hero-units');
        document.getElementById('toast-container');
        document.getElementById('site-modal');
        document.getElementById('site-options');
        document.getElementById('site-modal-icon');
        document.getElementById('site-modal-title');
        document.getElementById('site-modal-description');

        global.document.createElement = (tag) => createMockElement(tag);

        game = {
            addLog: createSpy(),
            showToast: createSpy(),
            sound: { cardPlay: createSpy(), diceRoll: createSpy(), success: createSpy() },
            hero: { position: { q: 0, r: 0 }, hand: [{ name: 'Test Card' }] },
            render: createSpy(),
            updateStats: createSpy(),
            endTurn: createSpy(),
            turnNumber: 0
        };
        ui = new UI();
        // Manually attach game to ui for tests that rely on it (legacy support)
        ui.game = game;
        // Do not mock addLog/showToast globally as some tests need the real ones
        // ui.addLog = createSpy();
        // ui.showToast = createSpy();
        // Manually link some elements that UI expects in constructor or methods
        ui.elements.siteModalIcon = createMockElement('div');
        ui.elements.siteModalTitle = createMockElement('div');
        ui.elements.siteModalDescription = createMockElement('div');
        ui.toastContainer = createMockElement('div');
    });

    afterEach(() => {
        ui.destroy();
        global.document.createElement = originalCreateElement;
        global.document.getElementById = originalGetElementById;
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
        expect(ui.elements.siteModal.classList.contains('active')).toBe(true);

        ui.hideSiteModal();
        expect(ui.elements.siteModal.classList.contains('active')).toBe(false);
    });

    it('should handle shop sub-items with card type and failure', () => {
        const data = {
            icon: '🏢', name: 'Mage Tower', color: 'blue',
            options: [{
                title: 'Lernen',
                subItems: [
                    { type: 'card', data: { name: 'Fireball', color: 'red' }, cost: 5, action: () => ({ success: false, message: 'Not enough influence' }) }
                ]
            }]
        };
        ui.showNotification = createSpy();
        ui.showSiteModal(data);
        const item = ui.elements.siteOptions.querySelector('.shop-item');
        expect(item.innerHTML).toContain('Fireball');

        item.click();
        expect(ui.showNotification.calledWith('Not enough influence', 'error')).toBe(true);
    });

    it('should handle site modal button action with failure', () => {
        const data = {
            icon: '🏢', name: 'Mage Tower', color: 'blue',
            options: [{
                title: 'Attack',
                enabled: true,
                action: () => ({ success: false, message: 'Attack failed' })
            }]
        };
        ui.showNotification = createSpy();
        ui.showSiteModal(data);
        const btn = ui.elements.siteOptions.querySelector('.btn-secondary');
        btn.click();
        expect(ui.showNotification.calledWith('Attack failed', 'error')).toBe(true);
    });

    it('should render site options with subItems', () => {
        const actionSpy = createSpy(() => ({ success: true, message: 'Done' }));
        const options = [{
            label: 'Recruit',
            subItems: [
                { type: 'unit', data: { name: 'Soldier', icon: '👤', cost: 3, armor: 3 }, action: actionSpy }
            ]
        }];

        ui.renderSiteOptions(options);
        const grid = ui.elements.siteOptions.querySelector('.shop-grid');
        expect(grid).toBeDefined();

        const item = grid.querySelector('.shop-item');
        item.click();
        expect(actionSpy.called).toBe(true);
    });

    it('should handle subItems with specialized success/failure branches', () => {
        const data = {
            icon: '🏢', name: 'Mage Tower', color: 'blue',
            options: [{
                title: 'Lernen',
                subItems: [
                    { type: 'card', data: { name: 'Fireball', color: 'red' }, cost: 5, action: () => ({ success: true, message: 'Lernt Fireball' }) },
                    { type: 'card', data: { name: 'Heal', color: 'green' }, cost: 5, action: () => ({ success: false, message: 'Fehlgeschlagen' }) },
                    { type: 'unit', data: { name: 'Guard', armor: 5 }, cost: 10, action: () => ({ success: true, message: 'Guard rekrutiert' }) }
                ]
            }]
        };
        ui.showSiteModal(data);
        const items = ui.elements.siteOptions.querySelectorAll('.shop-item');

        ui.addLog = createSpy(); // Spy specifically for this test
        // Success case (card red)
        items[0].click();
        expect(ui.addLog.calledWith('Lernt Fireball', 'success')).toBe(true);

        // Failure case (card green)
        items[1].click();
        expect(ui.addLog.calledWith('Fehlgeschlagen', 'error')).toBe(true);

        // Turn 0: End Turn
        ui.game.endTurn();
        expect(ui.game.turnNumber).toBe(0); // Initial turn number is 0, endTurn doesn't change it in this mock

        // Success case (unit)
        items[2].click();
        expect(ui.addLog.calledWith('Guard rekrutiert', 'success')).toBe(true);
    });

    it('should handle site modal button action with success', () => {
        const actionSpy = createSpy(() => ({ success: true, message: 'Sieg!' }));
        const data = {
            icon: '🏢', name: 'Battle', color: 'red',
            options: [{
                label: 'Sieg!', enabled: true, action: actionSpy
            }]
        };
        ui.showNotification = createSpy();
        ui.showSiteModal(data);
        const btn = ui.elements.siteOptions.querySelector('button');
        btn.click();
        expect(ui.showNotification.calledWith('Sieg!', 'success')).toBe(true);
        expect(ui.elements.siteModal.classList.contains('active')).toBe(false);
    });

    it('should handle subItems with unknown type', () => {
        const options = [{
            label: 'Mystery',
            subItems: [
                { type: 'unknown', data: { name: '???' }, cost: 0, action: () => { } }
            ]
        }];
        ui.renderSiteOptions(options);
        const grid = ui.elements.siteOptions.querySelector('.shop-grid');
        const item = grid.querySelector('.shop-item');
        // Unknown type should result in empty/default rendering in shop-item
        expect(item.innerHTML).toBe('');
    });

    it('should handle disabled options and notification types', () => {
        const options = [{
            label: 'Locked',
            enabled: false,
            action: () => ({ success: false, message: 'Locked!' })
        }];
        ui.renderSiteOptions(options);
        const btn = ui.elements.siteOptions.querySelector('button');
        expect(btn.disabled).toBe(true);

        ui.addLog = createSpy();
        ui.showNotification('Test info', 'info');
        ui.showNotification('Test warning', 'warning');
        ui.showNotification('Test error', 'error');
        // Check that addLog was called (since showNotification calls it)
        expect(ui.addLog.called).toBe(true);
    });

    it('should render units with different statuses', () => {
        const units = [
            {
                getName: () => 'Peasants', getIcon: () => '👨‍🌾', level: 1, armor: 3, wounds: 0,
                isReady: () => true, getAbilities: () => [{ text: '2 Influence' }], resistances: []
            },
            {
                getName: () => 'Thugs', getIcon: () => '🔨', level: 1, armor: 3, wounds: 1,
                isReady: () => true, getAbilities: () => [{ text: '2 Attack' }], resistances: ['physical']
            },
            {
                getName: () => 'Guards', getIcon: () => '🛡️', level: 2, armor: 5, wounds: 0,
                isReady: () => false, getAbilities: () => [{ text: '4 Block' }], resistances: []
            }
        ];
        ui.renderUnits(units);
        const cardEls = ui.elements.heroUnits.querySelectorAll('.unit-card');
        expect(cardEls.length).toBe(3);

        // Check states
        expect(cardEls[1].innerHTML).toContain('💔 1 Wounds');
        expect(cardEls[1].innerHTML).toContain('🔰 physical');
        expect(cardEls[2].style.opacity).toBe('0.6');
    });

    it('should handle empty unit list', () => {
        ui.renderUnits([]);
        expect(ui.elements.heroUnits.innerHTML).toContain('Keine Einheiten');

        ui.renderUnits(null);
        expect(ui.elements.heroUnits.innerHTML).toContain('Keine Einheiten');
    });

    it('should handle addPlayedCard with formatting', () => {
        const card = {
            name: 'Fireball',
            color: 'red',
            isWound: () => false,
            basicEffect: { value: 5 },
            strongEffect: { value: 10 }
        };
        const effect = { type: 'attack', value: 5 };
        ui.formatEffect = (eff) => `${eff.value} Damage`;

        ui.addPlayedCard(card, effect);
        expect(ui.elements.playedCards.children.length).toBe(1);
        expect(ui.elements.playedCards.innerHTML).toContain('5 Damage');
    });

    it('should show all toast types', () => {
        const types = ['info', 'success', 'error', 'warning', 'combat', 'unknown'];
        types.forEach(type => {
            ui.showToast(`Test ${type}`, type);
        });
        expect(ui.toastContainer.children.length).toBe(types.length);
        // Ensure some iconic symbols are present in any of the toasts
        const allText = Array.from(ui.toastContainer.children).map(t => t.textContent).join(' ');
        expect(allText).toContain('✅');
        expect(allText).toContain('❌');
        expect(allText).toContain('⚔️');
    });

    it('should handle toast removal animation', (done) => {
        ui.showToast('Animating...', 'info');
        const toast = ui.toastContainer.children[0];

        // Wait for the timeout (we might need to mock setTimeout or just wait)
        // In the test context, we can trigger the animationend event manually if we want to be fast
        setTimeout(() => {
            expect(toast.classList.contains('hiding')).toBe(true);
            toast.dispatchEvent({ type: 'animationend' });
            // Note: The toast.remove() call will remove it from the parent
            // But our MockHTMLElement.remove() needs to be linked
            expect(ui.toastContainer.children.length).toBe(0);
            done();
        }, 3100);
    });

    it('should highlight hex', () => {
        const grid = { selectHex: createSpy() };
        ui.highlightHex(grid, 1, 2);
        expect(grid.selectHex.calledWith(1, 2)).toBe(true);
    });
});
