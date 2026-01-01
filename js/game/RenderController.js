
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
        if (progressText) progressText.textContent = `${progress.unlocked}/${progress.total} Freigeschaltet (${progress.percentage}%)`;

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
            createStatCard('Spiele gespielt', stats.gamesPlayed || 0);
            createStatCard('Siege', stats.gamesWon || 0);
            createStatCard('Niederlagen', stats.gamesLost || 0);
            createStatCard('Feinde besiegt (Total)', stats.enemiesDefeated || 0);
            createStatCard('Höchstes Level', stats.highestLevel || 1);
            createStatCard('Perfekte Kämpfe', stats.perfectCombats || 0);
        } else {
            createStatCard('Runde', this.game.turnNumber || 1);
            createStatCard('Ruhm', this.game.hero.fame || 0);
            createStatCard('Verletzungen', this.game.hero.wounds || 0);
            createStatCard('Deck Größe', this.game.hero.deck.length + this.game.hero.hand.length + this.game.hero.discard.length);
            createStatCard('Einheiten', this.game.hero.units.length);
        }
    }

    updatePhaseIndicator() {
        const phaseText = document.querySelector('.phase-text');
        const phaseHint = document.getElementById('phase-hint');

        if (!phaseText || !phaseHint) return; // Guard

        // Hints
        const hints = {
            block: '🛡️ Wähle Verteidigungskarten',
            damage: '🩹 Schaden zuweisen',
            attack: '⚔️ Spiele Angriffskarten',
            end: '🏁 Kampf endet'
        };

        const phaseNames = {
            block: 'Block-Phase',
            damage: 'Schadens-Phase',
            attack: 'Angriffs-Phase',
            end: 'Kampf Ende'
        };

        if (this.game.combat) {
            // Combat Phases
            phaseText.textContent = phaseNames[this.game.combat.phase] || 'Kampf';
            phaseHint.textContent = hints[this.game.combat.phase] || '';
        } else if (this.game.movementMode) {
            // Movement Mode
            phaseText.textContent = 'Bewegung';
            phaseHint.textContent = `👣 ${this.game.hero.movementPoints} Punkte - Klicke auf ein Feld`;
        } else {
            // Standard
            phaseText.textContent = 'Erkundung';
            phaseHint.textContent = '🎴 Spiele Karten oder bewege dich (1-5)';
        }
    }
}
