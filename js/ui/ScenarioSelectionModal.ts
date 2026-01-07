import { logger } from '../logger';

export class ScenarioSelectionModal {
    private ui: any;
    private modal: HTMLElement | null;
    private closeBtn: HTMLElement | null;
    private cancelBtn: HTMLElement | null;
    private cardsGrid: HTMLElement | null;

    constructor(ui: any) {
        this.ui = ui;
        this.modal = document.getElementById('scenario-selection-modal');
        this.closeBtn = document.getElementById('scenario-selection-close');
        this.cancelBtn = document.getElementById('scenario-cancel-btn');
        this.cardsGrid = document.getElementById('scenario-cards-grid');

        this.init();
    }

    private init(): void {
        if (!this.modal) return;

        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.hide());
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.hide());

        // Hide when clicking outside
        this.modal.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) this.hide();
        });
    }

    public show(): void {
        if (!this.modal) return;
        this.renderScenarios();
        this.modal.classList.add('show');
        (logger as any).debug('Scenario Selection Modal shown');
    }

    public hide(): void {
        if (!this.modal) return;
        this.modal.classList.remove('show');
    }

    private renderScenarios(): void {
        if (!this.cardsGrid) return;
        const scenarios = this.ui.game.scenarioManager.scenarios;
        this.cardsGrid.innerHTML = '';

        Object.values(scenarios).forEach((scenario: any) => {
            const card = this.createScenarioCard(scenario);
            this.cardsGrid!.appendChild(card);
        });
    }

    private createScenarioCard(scenario: any): HTMLElement {
        const card = document.createElement('div');
        card.className = 'scenario-card';

        const difficulty = this.getDifficultyLabel(scenario.id);
        const imagePath = `assets/scenarios/${scenario.id}_medium.webp`;

        card.innerHTML = `
            <div class="scenario-difficulty ${difficulty.toLowerCase()}">${difficulty}</div>
            <div class="scenario-image-container">
                <img src="${imagePath}" alt="${scenario.name}" class="scenario-image" width="300" height="160" fetchpriority="high" onerror="this.src='assets/scenarios/placeholder.png'">
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

    private getDifficultyLabel(scenarioId: string): string {
        const difficulties: Record<string, string> = {
            'mines_freedom': 'Medium',
            'mining_expedition': 'Easy',
            'druid_nights': 'Hard'
        };
        return difficulties[scenarioId] || 'Medium';
    }

    private confirmSelection(scenarioId: string): void {
        this.ui.game.selectScenario(scenarioId);
    }
}
