import { t } from '../i18n/index';
import { store, ACTIONS } from '../game/Store';
import { UIElements } from '../ui';
import { TooltipManager } from './TooltipManager';
import { ManaSource, DieState } from '../mana';

export class ManaRenderer {
    private elements: UIElements;
    private tooltipManager: TooltipManager;
    private ui: any;

    constructor(elements: UIElements, tooltipManager: TooltipManager, ui: any) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
        this.ui = ui;
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_HERO_RESOURCES ||
                action === (ACTIONS as any).SET_HERO_INVENTORY ||
                action === (ACTIONS as any).SET_DAY_NIGHT ||
                action === (ACTIONS as any).SET_LANGUAGE) {

                const inventory = this.getInventoryFromState(state.hero);
                this.renderHeroMana(inventory);
            }
        });
    }

    private getInventoryFromState(heroState: any): string[] {
        // Reconstruct inventory from crystals and tempMana
        const inventory: string[] = [...(heroState.tempMana || [])];
        if (heroState.crystals) {
            for (const [color, count] of Object.entries(heroState.crystals)) {
                for (let i = 0; i < (count as number); i++) {
                    inventory.push(color);
                }
            }
        }
        return inventory;
    }

    /**
     * Render mana source
     * @param {ManaSource} manaSource - Mana source object
     * @param {Function} onDieClick - Callback for die click
     * @param {boolean} isNight - Whether it is night
     */
    public renderManaSource(manaSource: ManaSource, onDieClick: (index: number, color: string) => void, isNight: boolean = false): void {
        if (!this.elements || !this.elements.manaSource) return;
        this.elements.manaSource.innerHTML = '';

        const dice = manaSource.getAvailableDice(isNight);
        dice.forEach((die: DieState, index: number) => {
            const dieEl = document.createElement('div');
            dieEl.className = `mana-die ${die.color}`;
            if (!die.available) {
                dieEl.classList.add('used');
            }

            const icon = this.getManaIcon(die.color);
            dieEl.textContent = icon;

            if (die.available && onDieClick) {
                dieEl.addEventListener('click', () => {
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound.click();
                    }
                    onDieClick(index, die.color);
                });
            }

            // Add tooltip
            const manaInfo = this.getManaTooltipInfo(die.color);
            let tooltipContent = '';
            if (this.tooltipManager && typeof this.tooltipManager.createStatTooltipHTML === 'function') {
                tooltipContent = this.tooltipManager.createStatTooltipHTML(manaInfo.title, manaInfo.desc);
            }
            this.tooltipManager.attachToElement(dieEl, tooltipContent);

            this.elements.manaSource!.appendChild(dieEl);
        });
    }

    public getManaTooltipInfo(color: string): { title: string; desc: string } {
        const titleKey = `mana.tooltips.${color}.title`;
        const descKey = `mana.tooltips.${color}.desc`;
        const title = (t as any)(titleKey);
        const desc = (t as any)(descKey);

        return {
            title: title === titleKey ? ((t as any)('mana.tooltips.default.title') || 'Mana') : title,
            desc: desc === descKey ? ((t as any)('mana.tooltips.default.desc') || '') : desc
        };
    }

    /**
     * Get mana icon
     * @param {string} color - Mana color
     */
    public getManaIcon(color: string): string {
        const icons: Record<string, string> = {
            red: '🔥',
            blue: '💧',
            white: '✨',
            green: '🌿',
            gold: '⭐',
            black: '💀'
        };
        return icons[color] || '❓';
    }

    /**
     * Render hero's collected mana
     * @param {string[]} manaInventory - List of mana colors
     */
    public renderHeroMana(manaInventory: string[]): void {
        // Create or get hero mana display element
        let heroManaEl = document.getElementById('hero-mana');

        if (!heroManaEl) {
            // Create it if it doesn't exist
            if (!this.elements || !this.elements.manaSource) return;
            const manaPanel = this.elements.manaSource.parentElement;
            if (!manaPanel) return;

            const inventoryDiv = document.createElement('div');
            inventoryDiv.className = 'mana-inventory';
            inventoryDiv.innerHTML = `<h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">💎 ${(t as any)('mana.collected')}</h3><div id="hero-mana" class="hero-mana-display"></div>`;
            manaPanel.appendChild(inventoryDiv);
            heroManaEl = document.getElementById('hero-mana');
        }

        if (!heroManaEl) return;
        heroManaEl.innerHTML = '';

        if (!manaInventory || manaInventory.length === 0) {
            heroManaEl.innerHTML = `<div style="text-align: center; color: #6b7280; font-size: 0.85rem; padding: 0.5rem;">${(t as any)('mana.none')}</div>`;
            return;
        }

        manaInventory.forEach(color => {
            const manaEl = document.createElement('div');
            manaEl.className = `mana-die mini ${color}`;
            manaEl.textContent = this.getManaIcon(color);
            manaEl.title = color.toUpperCase();
            heroManaEl!.appendChild(manaEl);
        });
    }

    /**
     * Reset mana display
     */
    public reset(): void {
        if (this.elements.manaSource) this.elements.manaSource.innerHTML = '';
        const heroManaEl = document.getElementById('hero-mana');
        if (heroManaEl) heroManaEl.innerHTML = '';
    }
}
