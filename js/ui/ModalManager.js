/**
 * Manages game modals (Site Interactions, Level Up, etc.).
 */
export class ModalManager {
    constructor(elements, ui) {
        this.elements = elements;
        this.ui = ui; // Reference to main UI for notifications/animations
    }

    /**
     * Show site interaction modal
     */
    showSiteModal(interactionData) {
        if (!this.elements.siteModal) {
            console.warn('Site modal element not found');
            return;
        }

        // Ensure we handle the 'show' class correctly
        this.elements.siteModal.classList.remove('active');

        this.elements.siteModalIcon.textContent = interactionData.icon;
        this.elements.siteModalTitle.textContent = interactionData.name;
        this.elements.siteModalTitle.style.color = interactionData.color;
        this.elements.siteModalDescription.textContent = interactionData.description;

        this.renderSiteOptions(interactionData.options);
        this.elements.siteModal.classList.add('show');
    }

    /**
     * Hide site interaction modal
     */
    hideSiteModal() {
        if (this.elements.siteModal) {
            this.elements.siteModal.classList.remove('show');
        }
    }

    /**
     * Render options for the current site interaction
     */
    renderSiteOptions(options) {
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

                opt.subItems.forEach(item => {
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
     */
    showLevelUpModal(newLevel, choices, onConfirm) {
        const el = this.elements;
        if (!el.newLevelDisplay || !el.levelUpModal || !el.skillChoices || !el.cardChoices || !el.confirmLevelUpBtn) {
            console.warn('Level up modal elements not found');
            return;
        }

        el.newLevelDisplay.textContent = String(newLevel);
        el.levelUpModal.style.display = 'block';

        let selectedSkill = null;
        let selectedCard = null;

        const updateConfirmButton = () => {
            el.confirmLevelUpBtn.disabled = !selectedSkill || !selectedCard;
        };

        // Render Skills
        el.skillChoices.innerHTML = '';
        choices.skills.forEach(skill => {
            const skillEl = document.createElement('div');
            skillEl.className = 'skill-choice';
            skillEl.innerHTML = `
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
            `;

            skillEl.addEventListener('click', () => {
                Array.from(el.skillChoices.children).forEach(c => c.classList.remove('selected'));
                skillEl.classList.add('selected');
                selectedSkill = skill;
                updateConfirmButton();
            });

            el.skillChoices.appendChild(skillEl);
        });

        // Render Cards
        el.cardChoices.innerHTML = '';
        choices.cards.forEach((card, index) => {
            const cardEl = this.ui.createCardElement(card, index);
            cardEl.classList.add('card-choice');

            cardEl.addEventListener('click', () => {
                Array.from(el.cardChoices.children).forEach(c => c.classList.remove('selected'));
                cardEl.classList.add('selected');
                selectedCard = card;
                updateConfirmButton();
            });

            el.cardChoices.appendChild(cardEl);
        });

        // Setup confirm button
        const newBtn = el.confirmLevelUpBtn.cloneNode(true);
        el.confirmLevelUpBtn.replaceWith(newBtn);
        el.confirmLevelUpBtn = newBtn;

        el.confirmLevelUpBtn.disabled = true;
        el.confirmLevelUpBtn.addEventListener('click', () => {
            el.levelUpModal.style.display = 'none';
            if (onConfirm) {
                onConfirm({ skill: selectedSkill, card: selectedCard });
            }
        });
    }

    /**
     * Show world event modal
     */
    showEventModal(eventData) {
        if (!eventData || !this.elements.eventModal) return;

        const el = this.elements;
        const game = this.ui.game;

        el.eventTitle.textContent = eventData.title;
        el.eventDescription.textContent = eventData.description;
        el.eventOptions.innerHTML = '';

        eventData.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary event-option';

            if (option.action === 'fight') btn.classList.add('btn-danger');

            btn.innerHTML = `<span class="option-label">${option.label}</span>`;

            btn.addEventListener('click', () => {
                el.eventModal.classList.remove('active');

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
                        game.initiateCombat(enemy);
                    } else if (result.message) {
                        this.ui.showToast(result.message, 'error');
                    }
                }
            });
            el.eventOptions.appendChild(btn);
        });

        el.eventModal.classList.add('active');
    }
}
