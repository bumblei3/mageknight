import { describe, it, expect, beforeEach } from 'vitest';
import { UI } from '../../js/ui.js';
import { Card } from '../../js/card.js';
import { createSpy } from '../test-mocks.js';

describe('UI Hand Rendering', () => {
    let ui;
    let mockHandContainer;

    beforeEach(() => {
        // Mock the specific container we care about
        // In JSDOM this returns a real HTMLDivElement
        mockHandContainer = document.createElement('div');

        ui = new UI();
        // Manually inject our mock container into the ui instance
        ui.elements.handCards = mockHandContainer;

        // Mock TooltipManager to avoid errors during mouse events
        ui.tooltipManager = {
            showCardTooltip: () => { },
            hideTooltip: () => { }
        };
    });

    it('should overflow hand cards correctly', () => {
        const mockHand = [
            new Card({ id: 1, name: 'Card 1', type: 'action', color: 'red' }),
            new Card({ id: 2, name: 'Card 2', type: 'movement', color: 'green' })
        ];

        // correct method signature: renderHandCards(hand, onCardClick, onCardRightClick)
        ui.renderHandCards(mockHand, () => { }, () => { });

        expect(ui.elements.handCards.children.length).toBe(2);
    });

    it('should render correct card types', () => {
        const mockHand = [
            new Card({ id: 1, name: 'Attack', type: 'action', color: 'red' })
        ];

        ui.renderHandCards(mockHand, () => { }, () => { });

        const cardEl = ui.elements.handCards.children[0];
        expect(cardEl).toBeDefined();
    });

    it('should trigger callback when card is clicked', () => {
        const mockHand = [new Card({ id: 1, name: 'Test', type: 'action', color: 'red' })];
        const clickSpy = createSpy();

        ui.renderHandCards(mockHand, clickSpy, () => { });

        const cardEl = ui.elements.handCards.children[0];

        // Simulate click
        // Simulate pointer events (as HandRenderer uses pointerup)
        cardEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
        cardEl.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }));
        cardEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0, button: 0 }));

        expect(clickSpy.callCount).toBeGreaterThan(0);
        // Verify arguments passed to callback: index, card
        expect(clickSpy.calls[0][0]).toBe(0); // Index
        expect(clickSpy.calls[0][1]).toBe(mockHand[0]); // Card
    });

    it('should NOT trigger callback if dragged (moved too much)', () => {
        const mockHand = [new Card({ id: 1, name: 'Test', type: 'action', color: 'red' })];
        const clickSpy = createSpy();

        ui.renderHandCards(mockHand, clickSpy, () => { });

        const cardEl = ui.elements.handCards.children[0];

        // Simulate move beyond threshold (5px)
        cardEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
        cardEl.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 20, clientY: 20 })); // 14px distance
        cardEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));

        expect(clickSpy.callCount).toBe(0);
    });
});
