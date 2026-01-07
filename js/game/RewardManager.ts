import { SAMPLE_ARTIFACTS, SAMPLE_SPELLS, SAMPLE_ADVANCED_ACTIONS, Card } from '../card';
import { logger } from '../logger';
import { t } from '../i18n/index';

/**
 * Manages reward selection UI after combat victory at sites like Dungeons and Ruins.
 */
export class RewardManager {
    private game: any;
    private modal: HTMLElement | null;
    private choicesContainer: HTMLElement | null;
    private selectedReward: any | null = null;
    private artifactsOffer: any[] = [];

    constructor(game: any) {
        this.game = game;
        this.modal = document.getElementById('reward-modal');
        this.choicesContainer = document.getElementById('reward-choices');
        this.selectedReward = null;
        this.artifactsOffer = [];
    }

    /**
     * Shows the spell selection modal with random choices.
     * @param {number} choiceCount Number of spells to offer (default 2)
     */
    showSpellChoice(choiceCount: number = 2): void {
        logger.info('Opening spell reward selection modal...');

        const shuffled = [...SAMPLE_SPELLS].sort(() => 0.5 - Math.random());
        this.artifactsOffer = shuffled.slice(0, choiceCount);

        this.renderChoices(true); // Pass flag for spell specific rendering

        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    /**
     * Shows the artifact selection modal with random choices.
     * @param {number} choiceCount Number of artifacts to offer (default 2)
     */
    showArtifactChoice(choiceCount: number = 2): void {
        logger.info('Opening reward selection modal...');
        const shuffled = [...SAMPLE_ARTIFACTS].sort(() => 0.5 - Math.random());
        this.artifactsOffer = shuffled.slice(0, choiceCount);
        this.renderChoices(false);
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    /**
     * Renders the reward choices in the modal.
     * @param {boolean} isSpell Whether we are rendering spells
     */
    renderChoices(isSpell: boolean = false): void {
        if (!this.choicesContainer) return;
        this.choicesContainer.innerHTML = '';

        this.artifactsOffer.forEach(cardData => {
            const card = new Card(cardData);
            const el = document.createElement('div');
            el.className = 'choice-item reward-card';

            el.innerHTML = `
                <div class="reward-card-inner" data-type="${isSpell ? 'spell' : 'artifact'}">
                    <div class="card-header" style="background-color: var(--color-mana-${card.color})">
                        <span class="card-name">${card.name}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-desc">${(card as any).getFormattedText ? (card as any).getFormattedText() : card.description}</div>
                    </div>
                    <div class="card-footer">
                        <span class="card-type">${isSpell ? t('cards.types.spell') : t('ui.labels.artifact')}</span>
                    </div>
                </div>
                <div class="selection-overlay">Wählen</div>
            `;

            el.onclick = () => this.selectReward(card, isSpell);
            this.choicesContainer?.appendChild(el);
        });
    }

    /**
     * Handles selecting a reward and adding it to the hero's deck.
     * @param {Card} card The selected card
     * @param {boolean} isSpell
     */
    selectReward(card: Card, isSpell: boolean = false): void {
        if (this.game.hero) {
            this.game.hero.addCardToDeck(card);
        }
        this.game.addLog(t('combat.rewardClaimed', { card: card.name }), 'success');

        if (this.modal) {
            this.modal.classList.remove('active');
        }

        this.game.updateStats();
        this.game.render();

        if (this.game.particleSystem && this.game.hexGrid && this.game.hero) {
            const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
            this.game.particleSystem.buffEffect(heroPixel.x, heroPixel.y, isSpell ? card.color : 'gold');
        }
    }

    /**
     * Deprecated selectArtifact, mapped to selectReward
     */
    selectArtifact(card: Card): void {
        this.selectReward(card, false);
    }

    /**
     * Returns a random selection of Advanced Actions.
     * @param {number} count
     * @returns {Array} Array of card data objects
     */
    getAdvancedActionOffer(count: number = 3): any[] {
        const shuffled = [...SAMPLE_ADVANCED_ACTIONS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}
