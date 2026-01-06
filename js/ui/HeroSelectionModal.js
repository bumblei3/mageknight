import { HeroManager } from '../game/HeroManager.js';
import { logger } from '../logger.js';

export class HeroSelectionModal {
    constructor(ui) {
        this.ui = ui;
        this.modal = document.getElementById('hero-selection-modal');
        this.heroCardsGrid = document.getElementById('hero-cards-grid');
        this.selectedScenarioId = null;

        this.init();
    }

    init() {
        if (!this.modal) return;

        // Hide on click outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    show(scenarioId) {
        this.selectedScenarioId = scenarioId;
        this.renderHeroes();
        this.modal.classList.add('show');
        logger.debug('Hero Selection Modal shown');
    }

    hide() {
        this.modal.classList.remove('show');
    }

    renderHeroes() {
        if (!this.heroCardsGrid) return;

        const heroes = HeroManager.getAllHeroes();
        this.heroCardsGrid.innerHTML = '';

        heroes.forEach(hero => {
            const card = this.createHeroCard(hero);
            this.heroCardsGrid.appendChild(card);
        });
    }

    createHeroCard(hero) {
        const card = document.createElement('div');
        card.className = 'hero-card';
        card.style.setProperty('--hero-color', hero.color);

        card.innerHTML = `
            <div class="hero-card-inner">
                <div class="hero-portrait-container">
                    <img src="${hero.portrait}" alt="${hero.name}" class="hero-portrait" width="200" height="300" loading="lazy" onerror="this.src='assets/heroes/placeholder.png'">
                    <div class="hero-tag">${hero.title}</div>
                </div>
                <div class="hero-info">
                    <h3>${hero.name}</h3>
                    <div class="hero-stats">
                        <span class="stat"><i class="stat-icon armor"></i> Rüstung: ${hero.stats.armor}</span>
                        <span class="stat"><i class="stat-icon hand"></i> Hand: ${hero.stats.handLimit}</span>
                    </div>
                    <p class="hero-description">${hero.description}</p>
                </div>
                <div class="hero-selection-overlay">
                    <button class="select-hero-btn">Wählen</button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.hide();
            this.confirmSelection(hero.id);
        });

        return card;
    }

    confirmSelection(heroId) {
        logger.info(`Hero selected: ${heroId} for scenario: ${this.selectedScenarioId}`);
        this.ui.game.finishGameSetup(this.selectedScenarioId, heroId);
    }
}
