import { logger } from '../logger.js';

export class ScenarioSelectionModal {
    constructor(ui) {
        this.ui = ui;
        this.modal = document.getElementById('scenario-selection-modal');
        this.closeBtn = document.getElementById('scenario-selection-close');
        this.cancelBtn = document.getElementById('scenario-cancel-btn');
        this.cardsGrid = document.getElementById('scenario-cards-grid');

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.hide());
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.hide());

        // Hide when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    show() {
        if (!this.modal) return;
        this.renderScenarios();
        this.modal.classList.add('show');
        logger.debug('Scenario Selection Modal shown');
    }

    hide() {
        if (!this.modal) return;
        this.modal.classList.remove('show');
    }

    renderScenarios() {
        if (!this.cardsGrid) return;
        const scenarios = this.ui.game.scenarioManager.scenarios;
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
                <img src="${imagePath}" alt="${scenario.name}" class="scenario-image" width="300" height="160" loading="lazy" onerror="this.src='assets/scenarios/placeholder.png'">
            </div>
            <div class="scenario-card-content">
                <h3>${scenario.name}</h3>
                <p class="description">${scenario.description}</p>
                <div class="scenario-objectives">
                    ${this.ui.game.scenarioManager.getObjectivesTextForScenario(scenario)}
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
        this.ui.game.selectScenario(scenarioId);
    }
}
