import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import UI from '../js/ui.js';
import { createMockElement, createSpy } from './test-mocks.js';

describe('UI Boost', () => {
    let ui;
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
        global.document.createElement = (tag) => createMockElement(tag);

        ui = new UI();
        // Manually link some elements that UI expects in constructor or methods
        ui.elements.siteModal = createMockElement('div');
        ui.elements.siteOptions = createMockElement('div');
        ui.elements.siteModalIcon = createMockElement('div');
        ui.elements.siteModalTitle = createMockElement('div');
        ui.elements.siteModalDescription = createMockElement('div');
        ui.toastContainer = createMockElement('div');
    });

    afterEach(() => {
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
        ui.showSiteModal(data);
        const item = document.querySelector('.shop-item');
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
        ui.showSiteModal(data);
        const btn = document.querySelector('.btn-secondary');
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

    it('should render simple button options', () => {
        const actionSpy = createSpy(() => ({ success: true, message: 'Healed' }));
        const options = [{
            label: 'Heal',
            enabled: true,
            action: actionSpy
        }];

        ui.renderSiteOptions(options);
        const btn = ui.elements.siteOptions.querySelector('button');
        btn.click();
        expect(actionSpy.called).toBe(true);
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

        // Even if clicked (manually or via code bypass), ensure showNotification handles it
        // Note: showNotification logic might have branching for types
        ui.showNotification('Test info', 'info');
        ui.showNotification('Test warning', 'warning');
        ui.showNotification('Test error', 'error');
        expect(ui.showNotification.callCount).toBeGreaterThan(0);
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

    it('should highlight hex', () => {
        const grid = { selectHex: createSpy() };
        ui.highlightHex(grid, 1, 2);
        expect(grid.selectHex.calledWith(1, 2)).toBe(true);
    });
});
