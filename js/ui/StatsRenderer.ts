import { animator, animateCounter } from '../animator';
import { store, ACTIONS } from '../game/Store';
import { UIElements } from '../ui';

export class StatsRenderer {
    private elements: UIElements;
    private ui: any;

    constructor(elements: UIElements, ui: any) {
        this.elements = elements;
        this.ui = ui;
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        if (!store) return;
        (store as any).subscribe((state: any, action: string) => {
            if (action === (ACTIONS as any).SET_HERO_STATS || action === (ACTIONS as any).SET_HERO_RESOURCES) {
                this.updateFromStore(state.hero);
            } else if (action === (ACTIONS as any).SET_LANGUAGE) {
                // Refresh anything that might be language dependent in this renderer
                this.updateFromStore(state.hero);
            }
        });
    }

    private updateFromStore(heroState: any): void {
        // Compatibility wrapper for existing updateHeroStats logic
        const mockHero = {
            getStats: () => heroState,
            healingPoints: heroState.healingPoints,
            portrait: heroState.portrait
        };
        this.updateHeroStats(mockHero);
    }

    /**
     * Show floating text animation
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to display
     * @param {string} color - Text color
     */
    public showFloatingText(element: HTMLElement | null, text: string, color: string = '#fff'): void {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const floatEl = document.createElement('div');
        floatEl.className = 'floating-text';
        floatEl.textContent = text;
        floatEl.style.color = color;
        floatEl.style.left = `${rect.left + rect.width / 2}px`;
        floatEl.style.top = `${rect.top}px`;

        document.body.appendChild(floatEl);

        // Remove after animation
        floatEl.addEventListener('animationend', () => {
            floatEl.remove();
        });
    }

    /**
     * Update hero stats display
     * @param {any} hero - Hero object or mock
     */
    public updateHeroStats(hero: any): void {
        const stats = hero.getStats() || {};
        if (this.elements.heroName) this.elements.heroName.textContent = stats.name || '';

        // Render Portrait
        if (this.elements.heroAvatar && hero.portrait) {
            let img = this.elements.heroAvatar.querySelector('img') as HTMLImageElement;
            if (!img) {
                img = document.createElement('img');
                img.className = 'hero-avatar-img';
                img.width = 48;
                img.height = 48;
                this.elements.heroAvatar.appendChild(img);
            }
            const thumbPath = hero.portrait.replace(/\.(png|jpg|jpeg|webp)$/, '_thumb.webp');
            if (img.src !== thumbPath) {
                img.src = thumbPath;
                img.alt = stats.name;
            }
        }

        // Animate numeric values (with null checks)
        if (this.elements.heroArmor) {
            const currentArmor = parseInt(this.elements.heroArmor.textContent || '0') || 0;
            const targetArmor = (stats.armor !== undefined) ? stats.armor : currentArmor;
            if (currentArmor !== targetArmor) {
                animateCounter(this.elements.heroArmor, currentArmor, targetArmor, 500, animator);
                const diff = targetArmor - currentArmor;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.heroArmor as HTMLElement, `${diff > 0 ? '+' : ''}${diff} 🛡️`, diff > 0 ? 'var(--color-mana-green)' : 'var(--color-mana-red)');
                }
            }
        }

        if (this.elements.heroHandLimit) {
            const currentHand = parseInt(this.elements.heroHandLimit.textContent || '0') || 0;
            const targetHand = (stats.handLimit !== undefined) ? stats.handLimit : currentHand;
            if (currentHand !== targetHand) {
                this.elements.heroHandLimit.textContent = targetHand.toString();
                const diff = targetHand - currentHand;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.heroHandLimit as HTMLElement, `${diff > 0 ? '+' : ''}${diff} 🎴`, 'var(--color-mana-blue)');
                }
            }
        }

        if (this.elements.heroWounds) {
            const currentWounds = parseInt(this.elements.heroWounds.textContent || '0') || 0;
            const targetWounds = (stats.wounds !== undefined) ? stats.wounds : currentWounds;
            if (currentWounds !== targetWounds) {
                this.elements.heroWounds.textContent = targetWounds.toString();
                const diff = targetWounds - currentWounds;
                if (diff > 0) {
                    this.showFloatingText(this.elements.heroWounds as HTMLElement, `+${diff} 💔`, 'var(--color-mana-red)');
                }
            }
        }

        if (this.elements.fameValue) {
            const currentFame = parseInt(this.elements.fameValue.textContent || '0') || 0;
            const targetFame = (stats.fame !== undefined) ? stats.fame : currentFame;
            if (currentFame !== targetFame) {
                animateCounter(this.elements.fameValue, currentFame, targetFame, 1000, animator);
                const diff = targetFame - currentFame;
                if (diff > 0) {
                    this.showFloatingText(this.elements.fameValue as HTMLElement, `+${diff} ⭐`, 'var(--color-accent-gold)');
                }
            }
        }

        if (this.elements.reputationValue) {
            const currentRep = parseInt(this.elements.reputationValue.textContent || '0') || 0;
            const targetRep = (stats.reputation !== undefined) ? stats.reputation : currentRep;
            if (currentRep !== targetRep) {
                animateCounter(this.elements.reputationValue, currentRep, targetRep, 800, animator);
                const diff = targetRep - currentRep;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.reputationValue as HTMLElement, `${diff > 0 ? '+' : ''}${diff} 💬`, 'var(--color-text-primary)');
                }
            }
        }

        // Update healing button visibility
        if (this.elements.healBtn) {
            const hasWounds = (stats.wounds || 0) > 0;
            const hasHealing = (hero.healingPoints || 0) > 0;
            this.elements.healBtn.style.display = (hasWounds && hasHealing) ? 'block' : 'none';
            this.elements.healBtn.textContent = `Heilen (${hero.healingPoints || 0})`;

            // Add click sound if not already added
            if (!(this.elements.healBtn as any)._soundAdded) {
                this.elements.healBtn.addEventListener('click', () => {
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound.click();
                    }
                });
                (this.elements.healBtn as any)._soundAdded = true;
            }
        }
    }

    /**
     * Update movement points display
     * @param {number} points - Movement points
     */
    public updateMovementPoints(points: number): void {
        const val = (points !== undefined && points !== null) ? points : 0;
        if (this.elements.movementPoints) this.elements.movementPoints.textContent = val.toString();
    }

    /**
     * Reset stats display (with null checks)
     */
    public reset(): void {
        if (this.elements.fameValue) this.elements.fameValue.textContent = '0';
        if (this.elements.reputationValue) this.elements.reputationValue.textContent = '0';
        if (this.elements.movementPoints) this.elements.movementPoints.textContent = '0';
        if (this.elements.heroArmor) this.elements.heroArmor.textContent = '2'; // Default
        if (this.elements.heroHandLimit) this.elements.heroHandLimit.textContent = '5'; // Default
        if (this.elements.heroWounds) this.elements.heroWounds.textContent = '0';
        if (this.elements.healBtn) this.elements.healBtn.style.display = 'none';
        if (this.elements.heroName) this.elements.heroName.textContent = '';
    }
}
