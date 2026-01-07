import { HeroManager } from '../game/HeroManager';
import { logger } from '../logger';

export class HeroSelectionModal {
    private ui: any;
    private modal: HTMLElement | null;
    private heroCardsGrid: HTMLElement | null;
    private selectedScenarioId: string | null = null;

    constructor(ui: any) {
        this.ui = ui;
        this.modal = document.getElementById('hero-selection-modal');
        this.heroCardsGrid = document.getElementById('hero-cards-grid');
        this.selectedScenarioId = null;

        this.init();
    }

    private init(): void {
        if (!this.modal) return;

        // Hide on click outside
        this.modal.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modal) this.hide();
        });
    }

    public show(scenarioId: string): void {
        this.selectedScenarioId = scenarioId;
        this.renderHeroes();
        if (this.modal) this.modal.classList.add('show');
        (logger as any).debug('Hero Selection Modal shown');
    }

    public hide(): void {
        if (this.modal) this.modal.classList.remove('show');
    }

    private renderHeroes(): void {
        if (!this.heroCardsGrid) return;

        const heroes = (HeroManager as any).getAllHeroes();
        this.heroCardsGrid.innerHTML = '';

        heroes.forEach((hero: any) => {
            const card = this.createHeroCard(hero);
            this.heroCardsGrid!.appendChild(card);
        });
    }

    private createHeroCard(hero: any): HTMLElement {
        const card = document.createElement('div');
        card.className = 'hero-card';
        card.style.setProperty('--hero-color', hero.color);

        card.innerHTML = `
            <div class="hero-card-inner">
                <div class="hero-portrait-container">
                    <img src="${hero.portrait.replace('.webp', '_medium.webp')}" alt="${hero.name}" class="hero-portrait" width="200" height="300" fetchpriority="high" onerror="this.src='assets/heroes/placeholder.png'">
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

    private confirmSelection(heroId: string): void {
        (logger as any).info(`Hero selected: ${heroId} for scenario: ${this.selectedScenarioId}`);
        this.ui.game.finishGameSetup(this.selectedScenarioId, heroId);
    }
}
