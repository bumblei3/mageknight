import { logger } from '../logger.js';

export class ScenarioSelectionModal {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('scenario-selection-modal');
        this.closeBtn = document.getElementById('scenario-selection-close');
        this.cancelBtn = document.getElementById('scenario-cancel-btn');
        this.cardsGrid = document.getElementById('scenario-cards-grid');

        this.init();
    }

    init() {
        if (!this.modal) return;

        this.closeBtn.addEventListener('click', () => this.hide());
        this.cancelBtn.addEventListener('click', () => this.hide());

        // Hide when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    show() {
        this.renderScenarios();
        this.modal.classList.add('show');
        logger.debug('Scenario Selection Modal shown');
    }

    hide() {
        this.modal.classList.remove('show');
    }

    renderScenarios() {
        const scenarios = this.game.scenarioManager.scenarios;
        this.cardsGrid.innerHTML = '';

        Object.values(scenarios).forEach(scenario => {
            const card = this.createScenarioCard(scenario);
            this.cardsGrid.appendChild(card);
        });
    }

    createScenarioCard(scenario) {
        const card = document.createElement('div');
        card.className = 'scenario-card';

        const difficulty = this.getDifficultyLabel(scenario.id);
        const imagePath = `assets/scenarios/${scenario.id}.png`;

        card.innerHTML = `
            <div class="scenario-difficulty ${difficulty.toLowerCase()}">${difficulty}</div>
            <div class="scenario-image-container">
                <img src="${imagePath}" alt="${scenario.name}" class="scenario-image" onerror="this.src='assets/scenarios/placeholder.png'">
            </div>
            <div class="scenario-card-content">
                <h3>${scenario.name}</h3>
                <p class="description">${scenario.description}</p>
                <div class="scenario-objectives">
                    ${this.game.scenarioManager.getObjectivesTextForScenario(scenario)}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.hide();
            this.confirmSelection(scenario.id);
        });

        return card;
    }

    getDifficultyLabel(scenarioId) {
        const difficulties = {
            'mines_freedom': 'Medium',
            'mining_expedition': 'Easy',
            'druid_nights': 'Hard'
        };
        return difficulties[scenarioId] || 'Medium';
    }

    confirmSelection(scenarioId) {
        this.game.startNewGame(scenarioId);
    }
}
