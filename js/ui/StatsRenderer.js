import { animator, animateCounter } from '../animator.js';
import { store, ACTIONS } from '../game/Store.js';

export class StatsRenderer {
    constructor(elements, ui) {
        this.elements = elements;
        this.ui = ui;
        this.setupSubscriptions();
    }

    setupSubscriptions() {
        if (!store) return;
        store.subscribe((state, action) => {
            if (action === ACTIONS.SET_HERO_STATS || action === ACTIONS.SET_HERO_RESOURCES) {
                this.updateFromStore(state.hero);
            } else if (action === ACTIONS.SET_LANGUAGE) {
                // Refresh anything that might be language dependent in this renderer
                this.updateFromStore(state.hero);
            }
        });
    }

    updateFromStore(heroState) {
        // Compatibility wrapper for existing updateHeroStats logic
        const mockHero = {
            getStats: () => heroState,
            healingPoints: heroState.healingPoints,
            portrait: heroState.portrait
        };
        this.updateHeroStats(mockHero);
    }

    // Show floating text animation
    showFloatingText(element, text, color = '#fff') {
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

    // Update hero stats display
    updateHeroStats(hero) {
        const stats = hero.getStats();
        if (this.elements.heroName) this.elements.heroName.textContent = stats.name;

        // Render Portrait
        if (this.elements.heroAvatar && hero.portrait) {
            let img = this.elements.heroAvatar.querySelector('img');
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
            const currentArmor = parseInt(this.elements.heroArmor.textContent) || 0;
            if (currentArmor !== stats.armor) {
                animateCounter(this.elements.heroArmor, currentArmor, stats.armor, 500, animator);
                const diff = stats.armor - currentArmor;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.heroArmor, `${diff > 0 ? '+' : ''}${diff} 🛡️`, diff > 0 ? 'var(--color-mana-green)' : 'var(--color-mana-red)');
                }
            }
        }

        if (this.elements.heroHandLimit) {
            const currentHand = parseInt(this.elements.heroHandLimit.textContent) || 0;
            if (currentHand !== stats.handLimit) {
                this.elements.heroHandLimit.textContent = stats.handLimit;
                const diff = stats.handLimit - currentHand;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.heroHandLimit, `${diff > 0 ? '+' : ''}${diff} 🎴`, 'var(--color-mana-blue)');
                }
            }
        }

        if (this.elements.heroWounds) {
            const currentWounds = parseInt(this.elements.heroWounds.textContent) || 0;
            if (currentWounds !== stats.wounds) {
                this.elements.heroWounds.textContent = stats.wounds;
                const diff = stats.wounds - currentWounds;
                if (diff > 0) {
                    this.showFloatingText(this.elements.heroWounds, `+${diff} 💔`, 'var(--color-mana-red)');
                }
            }
        }

        if (this.elements.fameValue) {
            const currentFame = parseInt(this.elements.fameValue.textContent) || 0;
            if (currentFame !== stats.fame) {
                animateCounter(this.elements.fameValue, currentFame, stats.fame, 1000, animator);
                const diff = stats.fame - currentFame;
                if (diff > 0) {
                    this.showFloatingText(this.elements.fameValue, `+${diff} ⭐`, 'var(--color-accent-gold)');
                }
            }
        }

        if (this.elements.reputationValue) {
            const currentRep = parseInt(this.elements.reputationValue.textContent) || 0;
            if (currentRep !== stats.reputation) {
                animateCounter(this.elements.reputationValue, currentRep, stats.reputation, 800, animator);
                const diff = stats.reputation - currentRep;
                if (diff !== 0) {
                    this.showFloatingText(this.elements.reputationValue, `${diff > 0 ? '+' : ''}${diff} 💬`, 'var(--color-text-primary)');
                }
            }
        }

        // Update healing button visibility
        if (this.elements.healBtn) {
            const hasWounds = stats.wounds > 0;
            const hasHealing = hero.healingPoints > 0;
            this.elements.healBtn.style.display = (hasWounds && hasHealing) ? 'block' : 'none';
            this.elements.healBtn.textContent = `Heilen (${hero.healingPoints})`;

            // Add click sound if not already added
            if (!this.elements.healBtn._soundAdded) {
                this.elements.healBtn.addEventListener('click', () => {
                    if (this.ui && this.ui.game && this.ui.game.sound) {
                        this.ui.game.sound.click();
                    }
                });
                this.elements.healBtn._soundAdded = true;
            }
        }

        // Render Skills
        // Note: StatsRenderer shouldn't necessarily do this if SkillRenderer exists.
        // But the data comes from 'hero'.
        // We will emit an event or accessing UI.skill_renderer if possible, OR
        // allow UI to handle the signal.
    }

    // Update movement points display
    updateMovementPoints(points) {
        if (this.elements.movementPoints) this.elements.movementPoints.textContent = points;
    }

    // Reset stats display (with null checks)
    reset() {
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
