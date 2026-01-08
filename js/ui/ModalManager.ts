import { UIElements } from '../ui';

/**
 * Manages game modals (Site Interactions, Level Up, etc.).
 */
export class ModalManager {
    private elements: UIElements;
    private ui: any;

    constructor(elements: UIElements, ui: any) {
        this.elements = elements;
        this.ui = ui; // Reference to main UI for notifications/animations
    }

    /**
     * Show site interaction modal
     * @param {any} interactionData - Data for the interaction
     */
    public showSiteModal(interactionData: any): void {
        if (!this.elements.siteModal) {
            console.warn('Site modal element not found');
            return;
        }

        // Ensure we handle the 'show' class correctly
        this.elements.siteModal.classList.remove('active');

        if (this.elements.siteModalIcon) this.elements.siteModalIcon.textContent = interactionData.icon;
        if (this.elements.siteModalTitle) {
            this.elements.siteModalTitle.textContent = interactionData.name;
            this.elements.siteModalTitle.style.color = interactionData.color;
        }
        if (this.elements.siteModalDescription) this.elements.siteModalDescription.textContent = interactionData.description;

        this.renderSiteOptions(interactionData.options);
        this.elements.siteModal.classList.add('show');
    }

    /**
     * Hide site interaction modal
     */
    public hideSiteModal(): void {
        if (this.elements.siteModal) {
            this.elements.siteModal.classList.remove('show');
        }
    }

    /**
     * Render options for the current site interaction
     * @param {any[]} options - List of options
     */
    public renderSiteOptions(options: any[]): void {
        const container = this.elements.siteOptions;
        if (!container) return;

        container.innerHTML = '';

        options.forEach(opt => {
            const group = document.createElement('div');
            group.className = 'site-option-group';

            const title = document.createElement('span');
            title.className = 'site-option-title';
            title.textContent = opt.label;
            group.appendChild(title);

            if (opt.subItems) {
                const grid = document.createElement('div');
                grid.className = 'shop-grid';

                (opt.subItems as any[]).forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'shop-item';

                    if (item.type === 'unit') {
                        itemEl.innerHTML = `
                            <div class="shop-item-icon">${item.data.icon}</div>
                            <div class="shop-item-name">${item.data.name}</div>
                            <div class="shop-item-cost">${item.cost} Einfluss</div>
                            <div class="shop-item-stats">🛡️ ${item.data.armor}</div>
                        `;
                    } else if (item.type === 'card') {
                        const cardIcon = item.data.color === 'red' ? '⚔️' : item.data.color === 'green' ? '👣' : '✨';
                        itemEl.innerHTML = `
                            <div class="shop-item-icon">${cardIcon}</div>
                            <div class="shop-item-name">${item.data.name}</div>
                            <div class="shop-item-cost">${item.cost} Einfluss</div>
                        `;
                    }

                    itemEl.addEventListener('click', () => {
                        if (this.ui.game && this.ui.game.sound) this.ui.game.sound.click();
                        const result = item.action();
                        if (result.success) {
                            this.ui.showNotification(result.message, 'success');
                            this.hideSiteModal();
                        } else {
                            this.ui.showNotification(result.message, 'error');
                        }
                    });

                    grid.appendChild(itemEl);
                });

                group.appendChild(grid);
            } else {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.textContent = 'Ausführen';
                btn.disabled = !opt.enabled;

                btn.addEventListener('click', () => {
                    if (this.ui.game && this.ui.game.sound) this.ui.game.sound.click();
                    const result = opt.action();
                    if (result.success) {
                        this.ui.showNotification(result.message, 'success');
                        this.hideSiteModal();
                    } else {
                        this.ui.showNotification(result.message, 'error');
                    }
                });

                group.appendChild(btn);
            }

            container.appendChild(group);
        });
    }

    /**
     * Show level up modal
     * @param {number} newLevel - The new level
     * @param {any} choices - The choices available
     * @param {Function} onConfirm - Callback on confirm
     */
    public showLevelUpModal(newLevel: number, choices: any, onConfirm: (selection: any) => void): void {
        const el = this.elements;
        if (!el.newLevelDisplay || !el.levelUpModal || !el.skillChoices || !el.cardChoices || !el.confirmLevelUpBtn) {
            console.warn('Level up modal elements not found');
            return;
        }

        el.newLevelDisplay.textContent = String(newLevel);
        el.levelUpModal.style.display = 'block';

        let selectedSkill: any = null;
        let selectedCard: any = null;

        const updateConfirmButton = () => {
            if (el.confirmLevelUpBtn) {
                (el.confirmLevelUpBtn as HTMLButtonElement).disabled = !selectedSkill || !selectedCard;
            }
        };

        // Render Skills
        el.skillChoices.innerHTML = '';
        (choices.skills as any[]).forEach(skill => {
            const skillEl = document.createElement('div');
            skillEl.className = 'skill-choice';
            skillEl.innerHTML = `
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
            `;

            skillEl.addEventListener('click', () => {
                if (this.ui.game && this.ui.game.sound) this.ui.game.sound.click();
                Array.from(el.skillChoices!.children).forEach(c => c.classList.remove('selected'));
                skillEl.classList.add('selected');
                selectedSkill = skill;
                updateConfirmButton();
            });

            el.skillChoices!.appendChild(skillEl);
        });

        // Render Cards
        el.cardChoices.innerHTML = '';
        (choices.cards as any[]).forEach((card, index) => {
            const cardEl = this.ui.createCardElement(card, index);
            cardEl.classList.add('card-choice');

            cardEl.addEventListener('click', () => {
                if (this.ui.game && this.ui.game.sound) this.ui.game.sound.click();
                Array.from(el.cardChoices!.children).forEach(c => c.classList.remove('selected'));
                cardEl.classList.add('selected');
                selectedCard = card;
                updateConfirmButton();
            });

            el.cardChoices!.appendChild(cardEl);
        });

        // Setup confirm button
        const newBtn = el.confirmLevelUpBtn.cloneNode(true) as HTMLButtonElement;
        el.confirmLevelUpBtn.replaceWith(newBtn);
        el.confirmLevelUpBtn = newBtn;

        (el.confirmLevelUpBtn as HTMLButtonElement).disabled = true;
        el.confirmLevelUpBtn.addEventListener('click', () => {
            if (this.ui.game && this.ui.game.sound) this.ui.game.sound.levelUp();
            if (el.levelUpModal) el.levelUpModal.style.display = 'none';
            if (onConfirm) {
                onConfirm({ skill: selectedSkill, card: selectedCard });
            }
        });
    }

    /**
     * Show world event modal
     * @param {any} eventData - Data for the event
     */
    public showEventModal(eventData: any): void {
        if (!eventData || !this.elements.eventModal) return;

        const el = this.elements;
        const game = this.ui.game;

        if (el.eventTitle) el.eventTitle.textContent = eventData.title;
        if (el.eventDescription) el.eventDescription.textContent = eventData.description;
        if (el.eventOptions) {
            el.eventOptions.innerHTML = '';

            (eventData.options as any[]).forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary event-option';

                if (option.action === 'fight') btn.classList.add('btn-danger');

                btn.innerHTML = `<span class="option-label">${option.label}</span>`;

                btn.addEventListener('click', () => {
                    if (this.ui.game && this.ui.game.sound) this.ui.game.sound.click();
                    el.eventModal!.classList.remove('active');
                    // Execute resolution logic
                    const result = game.mapManager.worldEvents.resolveEventOption(eventData, index);

                    if (result) {
                        if (result.success) {
                            this.ui.showToast(result.message, 'success');
                        } else if (result.action === 'fight') {
                            // Ambush logic
                            const currentHex = game.hexGrid.getHex(game.hero.position.q, game.hero.position.r);
                            const enemy = game.enemyAI.generateEnemy(currentHex.terrain, game.hero.level);
                            enemy.position = { ...game.hero.position };
                            game.enemies.push(enemy);
                            game.combatOrchestrator.initiateCombat(enemy);
                        } else if (result.message) {
                            this.ui.showToast(result.message, 'error');
                        }
                    }
                });
                el.eventOptions!.appendChild(btn);
            });
        }

        el.eventModal!.classList.add('active');
    }
}
