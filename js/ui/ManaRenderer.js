import { t } from '../i18n/index.js';
import { store, ACTIONS } from '../game/Store.js';

export class ManaRenderer {
    constructor(elements, tooltipManager) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
        this.setupSubscriptions();
    }

    setupSubscriptions() {
        if (!store) return;
        store.subscribe((state, action) => {
            if (action === ACTIONS.SET_HERO_RESOURCES ||
                action === ACTIONS.SET_HERO_INVENTORY ||
                action === ACTIONS.SET_DAY_NIGHT ||
                action === ACTIONS.SET_LANGUAGE) {

                const inventory = this.getInventoryFromState(state.hero);
                this.renderHeroMana(inventory);

                // If language changed, we might need to refresh the mana source too for tooltips
                // but we don't have enough info here to call renderManaSource exactly.
            }
        });
    }

    getInventoryFromState(heroState) {
        // Reconstruct inventory from crystals and tempMana
        const inventory = [...(heroState.tempMana || [])];
        if (heroState.crystals) {
            for (const [color, count] of Object.entries(heroState.crystals)) {
                for (let i = 0; i < count; i++) {
                    inventory.push(color);
                }
            }
        }
        return inventory;
    }

    // Render mana source
    renderManaSource(manaSource, onDieClick, isNight = false) {
        if (!this.elements || !this.elements.manaSource) return;
        this.elements.manaSource.innerHTML = '';

        const dice = manaSource.getAvailableDice(isNight);
        dice.forEach((die, index) => {
            const dieEl = document.createElement('div');
            dieEl.className = `mana-die ${die.color}`;
            if (!die.available) {
                dieEl.classList.add('used');
            }

            const icon = this.getManaIcon(die.color);
            dieEl.textContent = icon;

            if (die.available && onDieClick) {
                dieEl.addEventListener('click', () => onDieClick(index, die.color));
            }

            // Add tooltip
            const manaInfo = this.getManaTooltipInfo(die.color);
            let tooltipContent = '';
            if (this.tooltipManager && typeof this.tooltipManager.createStatTooltipHTML === 'function') {
                tooltipContent = this.tooltipManager.createStatTooltipHTML(manaInfo.title, manaInfo.desc);
            }
            this.tooltipManager.attachToElement(dieEl, tooltipContent);

            this.elements.manaSource.appendChild(dieEl);
        });
    }

    getManaTooltipInfo(color) {
        const titleKey = `mana.tooltips.${color}.title`;
        const descKey = `mana.tooltips.${color}.desc`;
        const title = t(titleKey);
        const desc = t(descKey);

        return {
            title: title === titleKey ? (t('mana.tooltips.default.title') || 'Mana') : title,
            desc: desc === descKey ? (t('mana.tooltips.default.desc') || '') : desc
        };
    }

    // Get mana icon
    getManaIcon(color) {
        const icons = {
            red: '🔥',
            blue: '💧',
            white: '✨',
            green: '🌿',
            gold: '⭐',
            black: '💀'
        };
        return icons[color] || '❓';
    }

    // Render hero's collected mana
    renderHeroMana(manaInventory) {
        // Create or get hero mana display element
        let heroManaEl = document.getElementById('hero-mana');

        if (!heroManaEl) {
            // Create it if it doesn't exist
            if (!this.elements || !this.elements.manaSource) return;
            const manaPanel = this.elements.manaSource.parentElement;
            const inventoryDiv = document.createElement('div');
            inventoryDiv.className = 'mana-inventory';
            inventoryDiv.innerHTML = `<h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">💎 ${t('mana.collected')}</h3><div id="hero-mana" class="hero-mana-display"></div>`;
            manaPanel.appendChild(inventoryDiv);
            heroManaEl = document.getElementById('hero-mana');
        }

        heroManaEl.innerHTML = '';

        if (!manaInventory || manaInventory.length === 0) {
            heroManaEl.innerHTML = `<div style="text-align: center; color: #6b7280; font-size: 0.85rem; padding: 0.5rem;">${t('mana.none')}</div>`;
            return;
        }

        manaInventory.forEach(color => {
            const manaEl = document.createElement('div');
            manaEl.className = `mana-die mini ${color}`;
            manaEl.textContent = this.getManaIcon(color);
            manaEl.title = color.toUpperCase();
            heroManaEl.appendChild(manaEl);
        });
    }

    // Reset mana display
    reset() {
        if (this.elements.manaSource) this.elements.manaSource.innerHTML = '';
        const heroManaEl = document.getElementById('hero-mana');
        if (heroManaEl) heroManaEl.innerHTML = '';
    }
}
