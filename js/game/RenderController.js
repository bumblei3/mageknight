import { t } from '../i18n/index.js';

export class RenderController {
    constructor(game) {
        this.game = game;
    }

    renderHand() {
        if (this.game.ui) {
            this.game.ui.renderHandCards(
                this.game.hero.hand,
                (index, card) => this.game.interactionController.handleCardClick(index, card),
                (index, card) => this.game.interactionController.handleCardRightClick(index, card)
            );
        }
    }

    renderMana() {
        if (this.game.ui) {
            this.game.ui.renderManaSource(
                this.game.manaSource,
                (index, color) => this.game.interactionController.handleManaClick(index, color),
                this.game.timeManager.isNight()
            );
        }
    }

    renderAchievements(category) {
        const list = document.getElementById('achievements-list');
        const progressBar = document.getElementById('achievements-progress-bar');
        const progressText = document.getElementById('achievements-progress-text');

        if (!list) return;

        list.innerHTML = '';

        // Update Progress
        const progress = this.game.achievementManager.getProgress();
        if (progressBar) progressBar.style.width = `${progress.percentage}% `;
        if (progressText) progressText.textContent = t('ui.labels.unlocked', { count: progress.unlocked, total: progress.total, percent: progress.percentage });

        // Filter and Render
        const allAchievements = Object.values(this.game.achievementManager.achievements);
        const filtered = category === 'all'
            ? allAchievements
            : allAchievements.filter(a => a.category === category);

        filtered.forEach(ach => {
            const isUnlocked = this.game.achievementManager.isUnlocked(ach.id);
            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;

            let dateStr = '';
            // Timestamp logic omitted as in game.js

            card.innerHTML = `
                <div class="achievement-icon">${ach.icon || '🏆'}</div>
                <div class="achievement-info">
                    <h3>${ach.name}</h3>
                    <p>${ach.description}</p>
                    ${dateStr}
                </div>
            `;
            list.appendChild(card);
        });
    }

    renderStatistics(category) {
        const grid = document.getElementById('statistics-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const stats = this.game.statisticsManager.getAll();

        const createStatCard = (label, value) => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <span class="value">${value}</span>
                <span class="label">${label}</span>
            `;
            grid.appendChild(card);
        };

        if (category === 'global') {
            createStatCard(t('ui.stats.gamesPlayed'), stats.gamesPlayed || 0);
            createStatCard(t('ui.stats.wins'), stats.gamesWon || 0);
            createStatCard(t('ui.stats.losses'), stats.gamesLost || 0);
            createStatCard(t('ui.stats.enemiesDefeated'), stats.enemiesDefeated || 0);
            createStatCard(t('ui.stats.highestLevel'), stats.highestLevel || 1);
            createStatCard(t('ui.stats.perfectCombats'), stats.perfectCombats || 0);
        } else {
            createStatCard(t('ui.labels.round'), this.game.turnNumber || 1);
            createStatCard(t('ui.labels.fame'), this.game.hero.fame || 0);
            createStatCard(t('ui.labels.wounds'), this.game.hero.wounds || 0);
            createStatCard(t('ui.labels.deckSize'), this.game.hero.deck.length + this.game.hero.hand.length + this.game.hero.discard.length);
            createStatCard(t('ui.labels.units'), this.game.hero.units.length);
        }
    }

    updatePhaseIndicator() {
        const phaseText = document.querySelector('.phase-text');
        const phaseHint = document.getElementById('phase-hint');

        if (!phaseText || !phaseHint) return; // Guard

        // Hints
        const hints = {
            block: t('ui.hints.block'),
            damage: t('ui.hints.damage'),
            attack: t('ui.hints.attack'),
            end: t('ui.hints.end')
        };

        const phaseNames = {
            block: t('ui.phases.block'),
            damage: t('ui.phases.damage'),
            attack: t('ui.phases.attack'),
            end: t('combat.combatEnded')
        };

        if (this.game.combat) {
            // Combat Phases
            phaseText.textContent = phaseNames[this.game.combat.phase] || t('ui.phases.combat');
            phaseHint.textContent = hints[this.game.combat.phase] || '';
        } else if (this.game.movementMode) {
            // Movement Mode
            phaseText.textContent = t('ui.labels.movement');
            phaseHint.textContent = t('ui.hints.movement', { points: this.game.hero.movementPoints });
        } else {
            // Standard
            phaseText.textContent = t('ui.phases.exploration');
            phaseHint.textContent = t('ui.hints.exploration');
        }
    }

    /**
     * Orchestrates the update of all HUD stats and contextual buttons.
     */
    updateStats() {
        if (!this.game.ui) return;

        this.game.ui.updateHeroStats(this.game.hero);
        this.game.ui.updateMovementPoints(this.game.hero.movementPoints);
        this.game.ui.renderUnits(this.game.hero.units);

        // Update Explore button
        const canExplore = this.game.mapManager.canExplore(this.game.hero.position.q, this.game.hero.position.r);
        const hasPoints = this.game.hero.movementPoints >= 2;

        if (this.game.ui.elements.exploreBtn) {
            this.game.ui.setButtonEnabled(this.game.ui.elements.exploreBtn, canExplore && hasPoints && !this.game.combat);
            this.game.ui.elements.exploreBtn.title = this._getExploreTitle(canExplore, hasPoints);
        }

        // Update Visit Button
        const currentHex = this.game.hexGrid.getHex(this.game.hero.position.q, this.game.hero.position.r);
        const visitBtn = document.getElementById('visit-btn');
        if (visitBtn) {
            const hasSite = currentHex && currentHex.site;
            this.game.ui.setButtonEnabled(visitBtn, hasSite && !this.game.combat);
            if (hasSite) {
                visitBtn.textContent = `Besuche ${currentHex.site.getName()} `;
                visitBtn.style.display = 'inline-block';
            } else {
                visitBtn.style.display = 'none';
            }
        }
    }

    /**
     * Returns the localized title for the explore button based on state.
     * @private
     */
    _getExploreTitle(canExplore, hasPoints) {
        if (canExplore && hasPoints) return 'Erkunden (2 Bewegungspunkte)';
        if (!canExplore) return 'Kein unbekanntes Gebiet angrenzend';
        return 'Nicht genug Bewegungspunkte (2 benötigt)';
    }
}
