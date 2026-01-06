import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManaRenderer } from '../js/ui/ManaRenderer.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';

describe('ManaRenderer Coverage', () => {
    let renderer;
    let elements;
    let tooltipManager;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <div id="mana-source"></div>
            <div id="hero-mana"></div>
        `;
        elements = {
            manaSource: document.getElementById('mana-source')
        };
        tooltipManager = {
            attachToElement: vi.fn(),
            createStatTooltipHTML: vi.fn(() => 'Tooltip'),
            hideTooltip: vi.fn()
        };
        renderer = new ManaRenderer(elements, tooltipManager);
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('should render mana source with diverse colors', () => {
        const manaSource = {
            getAvailableDice: () => [
                { color: 'red', available: true },
                { color: 'blue', available: false },
                { color: 'gold', available: true }
            ]
        };

        renderer.renderManaSource(manaSource, () => { }, false);

        const dice = elements.manaSource.children;
        expect(dice.length).toBe(3);
        expect(dice[0].className).toContain('red');
        expect(dice[1].className).toContain('used');
        expect(dice[2].textContent).toBe('⭐');
    });

    it('should handle die click', () => {
        let clicked = false;
        const manaSource = {
            getAvailableDice: () => [{ color: 'red', available: true }]
        };

        renderer.renderManaSource(manaSource, () => { clicked = true; }, false);
        elements.manaSource.firstChild.click();

        expect(clicked).toBe(true);
    });

    it('should render hero mana inventory (empty)', () => {
        renderer.renderHeroMana([]);
        const heroManaEl = document.getElementById('hero-mana');
        expect(heroManaEl.textContent).toContain('Kein Mana');
    });

    it('should render hero mana inventory (with items)', () => {
        renderer.renderHeroMana(['red', 'blue']);
        const heroManaEl = document.getElementById('hero-mana');
        expect(heroManaEl.children.length).toBe(2);
        expect(heroManaEl.firstChild.className).toContain('red');
    });

    it('should create hero mana element if missing', () => {
        // Fallback might create it, so we manually remove to test creation logic
        const existing = document.getElementById('hero-mana');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        renderer.renderHeroMana(['white']);

        const heroManaEl = document.getElementById('hero-mana');
        expect(heroManaEl).toBeDefined();
        expect(heroManaEl.children.length).toBe(1);
    });

    it('should reset displays', () => {
        renderer.renderHeroMana(['red']);
        renderer.renderManaSource({ getAvailableDice: () => [{ color: 'red' }] }, null);

        renderer.reset();

        expect(elements.manaSource.innerHTML).toBe('');
        expect(document.getElementById('hero-mana').innerHTML).toBe('');
    });

    it('should provide default icons/info for unknown colors', () => {
        expect(renderer.getManaIcon('unknown')).toBe('❓');
        const info = renderer.getManaTooltipInfo('unknown');
        expect(info.title).toBe('Mana');
    });
});
