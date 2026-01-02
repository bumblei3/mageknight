import { SAMPLE_ARTIFACTS, Card } from '../card.js';
import { logger } from '../logger.js';
import { t } from '../i18n/index.js';

/**
 * Manages reward selection UI after combat victory at sites like Dungeons and Ruins.
 */
export class RewardManager {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('reward-modal');
        this.choicesContainer = document.getElementById('reward-choices');
        this.selectedCard = null;
        this.artifactsOffer = [];
    }

    /**
     * Shows the artifact selection modal with random choices.
     * @param {number} choiceCount Number of artifacts to offer (default 2)
     */
    showArtifactChoice(choiceCount = 2) {
        logger.info('Opening reward selection modal...');

        // Pick random artifacts that the hero doesn't have yet (optional check)
        // For simplicity, just pick random ones from SAMPLE_ARTIFACTS
        const shuffled = [...SAMPLE_ARTIFACTS].sort(() => 0.5 - Math.random());
        this.artifactsOffer = shuffled.slice(0, choiceCount);

        this.renderChoices();

        // Show Modal
        if (this.modal) {
            this.modal.classList.add('active');
        } else {
            logger.error('Reward modal not found in DOM!');
        }
    }

    /**
     * Renders the artifact choices in the modal.
     */
    renderChoices() {
        if (!this.choicesContainer) return;
        this.choicesContainer.innerHTML = '';

        this.artifactsOffer.forEach(artifactData => {
            const card = new Card(artifactData);
            const el = document.createElement('div');
            el.className = 'choice-item reward-card';

            // Re-using some card styles but specialized for reward view
            el.innerHTML = `
                <div class="reward-card-inner">
                    <div class="card-header" style="background-color: var(--color-mana-${card.color})">
                        <span class="card-name">${card.name}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-desc">${card.description}</div>
                    </div>
                    <div class="card-footer">
                        <span class="card-type">${t('ui.labels.artifact')}</span>
                    </div>
                </div>
                <div class="selection-overlay">Wählen</div>
            `;

            el.onclick = () => this.selectArtifact(card);
            this.choicesContainer.appendChild(el);
        });
    }

    /**
     * Handles selecting an artifact and adding it to the hero's deck.
     * @param {Card} card The selected artifact card
     */
    selectArtifact(card) {
        this.game.hero.addCardToDeck(card);
        this.game.addLog(t('combat.rewardClaimed', { card: card.name }), 'success');

        // Close modal
        if (this.modal) {
            this.modal.classList.remove('active');
        }

        // Update UI
        this.game.updateStats();
        this.game.render();

        // Visual effect
        if (this.game.particleSystem) {
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.buffEffect(heroPixel.x, heroPixel.y, 'gold');
        }
    }
}
