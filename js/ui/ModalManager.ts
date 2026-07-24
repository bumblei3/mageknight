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
     * Render options for the current site interaction.
     * First enabled simple action is primary; others under secondary list.
     */
    public renderSiteOptions(options: any[]): void {
        const container = this.elements.siteOptions;
        if (!container) return;

        container.innerHTML = '';
        container.classList.add('site-options--intuition');

        const list = Array.isArray(options) ? [...options] : [];
        // Prefer first enabled non-shop option as primary CTA
        const primaryIdx = list.findIndex(
            (opt) => opt && opt.enabled !== false && !opt.subItems && typeof opt.action === 'function'
        );
        const primary = primaryIdx >= 0 ? list[primaryIdx] : null;
        const rest = list.filter((_, i) => i !== primaryIdx);

        if (primary) {
            const primaryWrap = document.createElement('div');
            primaryWrap.className = 'site-option-primary';

            const hint = document.createElement('div');
            hint.className = 'site-option-primary-hint';
            hint.textContent = 'Empfohlen';
            primaryWrap.appendChild(hint);

            const btn = document.createElement('button');
            btn.className = 'btn btn-primary site-primary-btn';
            btn.type = 'button';
            btn.textContent = primary.label || 'Ausführen';
            btn.disabled = primary.enabled === false;
            btn.addEventListener('click', () => this.runSiteAction(primary.action));
            primaryWrap.appendChild(btn);

            container.appendChild(primaryWrap);
        }

        if (rest.length === 0) return;

        const more = document.createElement('details');
        more.className = 'site-options-more';
        // Open when no primary or only one extra — keep shops visible
        const hasShop = rest.some((o) => o?.subItems?.length);
        more.open = !primary || rest.length <= 2 || hasShop;

        const summary = document.createElement('summary');
        summary.className = 'site-options-more-summary';
        summary.textContent = primary
            ? `Weitere Aktionen (${rest.length})`
            : 'Aktionen';
        more.appendChild(summary);

        const moreBody = document.createElement('div');
        moreBody.className = 'site-options-more-body';

        rest.forEach((opt) => {
            moreBody.appendChild(this.buildSiteOptionGroup(opt));
        });

        more.appendChild(moreBody);
        container.appendChild(more);
    }

    private buildSiteOptionGroup(opt: any): HTMLElement {
        const group = document.createElement('div');
        group.className = 'site-option-group';

        const title = document.createElement('span');
        title.className = 'site-option-title';
        title.textContent = opt.label;
        group.appendChild(title);

        if (opt.subItems) {
            const grid = document.createElement('div');
            grid.className = 'shop-grid';

            (opt.subItems as any[]).forEach((item) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'shop-item';
                if (item.enabled === false) itemEl.classList.add('shop-item--disabled');

                if (item.type === 'unit') {
                    itemEl.innerHTML = `
                        <div class="shop-item-icon">${item.data.icon}</div>
                        <div class="shop-item-name">${item.data.name}</div>
                        <div class="shop-item-cost">${item.cost} Einfluss</div>
                        <div class="shop-item-stats">🛡️ ${item.data.armor}</div>
                    `;
                } else if (item.type === 'card') {
                    const cardIcon =
                        item.data.color === 'red' ? '⚔️' : item.data.color === 'green' ? '👣' : '✨';
                    itemEl.innerHTML = `
                        <div class="shop-item-icon">${cardIcon}</div>
                        <div class="shop-item-name">${item.data.name}</div>
                        <div class="shop-item-cost">${item.cost} Einfluss</div>
                    `;
                } else {
                    itemEl.innerHTML = `<div class="shop-item-name">${item.label || item.data?.name || 'Aktion'}</div>`;
                }

                if (item.enabled === false && item.reason) {
                    itemEl.title = item.reason;
                }

                itemEl.addEventListener('click', () => {
                    if (item.enabled === false) {
                        this.ui.showNotification?.(item.reason || 'Nicht verfügbar', 'error');
                        return;
                    }
                    this.runSiteAction(item.action);
                });

                grid.appendChild(itemEl);
            });

            group.appendChild(grid);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.type = 'button';
            btn.textContent = opt.label || 'Ausführen';
            btn.disabled = opt.enabled === false;
            if (opt.enabled === false && opt.reason) btn.title = opt.reason;
            btn.addEventListener('click', () => this.runSiteAction(opt.action));
            group.appendChild(btn);
        }

        return group;
    }

    private runSiteAction(action?: () => any): void {
        if (typeof action !== 'function') return;
        if (this.ui.game?.sound) this.ui.game.sound.click();
        const result = action();
        if (result?.success) {
            this.ui.showNotification(result.message, 'success');
            this.hideSiteModal();
        } else {
            this.ui.showNotification(result?.message || 'Fehlgeschlagen', 'error');
        }
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

    /**
     * Show game-over defeat overlay.
     */
    public showDefeatOverlay(enemyName: string, message?: string): void {
        const el = this.elements;
        if (!el.gameOverDefeatModal) return;

        const msgEl = el.gameOverDefeatMessage;
        if (msgEl) {
            msgEl.textContent = message || `Dein Held wurde von ${enemyName} besiegt.`;
        }

        const statsEl = el.gameOverDefeatStats;
        if (statsEl && this.ui.game) {
            const h = this.ui.game.hero;
            const stats = [
                `Stufe: ${h?.level ?? '?'}`,
                `HP: ${h?.currentHealth ?? h?.maxHealth ?? '?'} / ${h?.maxHealth ?? '?'}`,
                `Rüstung: ${h?.armor ?? '?'}`,
            ].filter(Boolean).join(' · ');
            statsEl.textContent = stats;
        }

        el.gameOverDefeatModal.classList.add('active');
    }

    /**
     * Show victory overlay after scenario completion.
     */
    public showVictoryOverlay(message = '', stats?: { totalEnemies?: number; totalSites?: number }): void {
        const el = this.elements;
        if (!el.gameOverVictoryModal) return;

        const msgEl = el.gameOverVictoryMessage;
        if (msgEl) {
            msgEl.textContent = message;
        }

        const statsEl = el.gameOverVictoryStats;
        if (statsEl && this.ui.game && stats) {
            const h = this.ui.game.hero;
            const parts = [
                `Stufe: ${h?.level ?? '?'}`,
                `HP: ${h?.currentHealth ?? h?.maxHealth ?? '?'} / ${h?.maxHealth ?? '?'}`,
                `Rüstung: ${h?.armor ?? '?'}`,
            ];
            if (stats.totalEnemies !== undefined) parts.push(`Feinde besiegt: ${stats.totalEnemies}`);
            if (stats.totalSites !== undefined) parts.push(`Orte erobert: ${stats.totalSites}`);
            statsEl.textContent = parts.join(' · ');
        }

        el.gameOverVictoryModal.classList.add('active');
    }

    /**
     * Hide both game-over overlays.
     */
    public hideGameOverOverlays(): void {
        const el = this.elements;
        el.gameOverDefeatModal?.classList.remove('active');
        el.gameOverVictoryModal?.classList.remove('active');
    }
}
