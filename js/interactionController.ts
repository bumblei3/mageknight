import { logger } from './logger';
import { MageKnightGame } from './game';
import { HexData } from './hexgrid/HexGridLogic';
import { Card } from './card/CardFactory';
import { Enemy } from './enemy';

export class InteractionController {
    private game: MageKnightGame;
    private cachedRect: DOMRect | null;
    private updateRectBound: () => void;

    constructor(game: MageKnightGame) {
        this.game = game;
        this.cachedRect = null;

        // Cache rect on resize/scroll to avoid layout thrashing on every frame
        this.updateRectBound = this.updateRect.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.updateRectBound);
            window.addEventListener('scroll', this.updateRectBound);
            // Initial cache
            setTimeout(this.updateRectBound, 100);
        }
    }

    updateRect(): void {
        if (this.game && this.game.canvas) {
            this.cachedRect = this.game.canvas.getBoundingClientRect();
        }
    }

    handleCanvasClick(e: MouseEvent): void {
        const rect = this.game.canvas.getBoundingClientRect();

        // Scale coordinates to internal canvas resolution
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const hex = this.game.hexGrid.pixelToAxial(x, y);
        if (!hex) {
            logger.warn(`Could not resolve hex at screen: ${x},${y}`);
            return;
        }

        logger.debug(`Grid clicked at screen: ${x},${y} -> grid: ${hex.q},${hex.r}`);

        // Check if hex exists
        if (!this.game.hexGrid.hasHex(hex.q, hex.r)) {
            logger.verbose(`Click outside grid at ${hex.q},${hex.r}`);
            return;
        }

        // Always show selection feedback
        this.selectHex(hex.q, hex.r);

        // Debug Teleport
        if (this.game.debugTeleport) {
            this.game.hero.position = { q: hex.q, r: hex.r };
            this.game.hero.displayPosition = { q: hex.q, r: hex.r };
            this.game.render();
            this.game.addLog(`Debug: Teleported to ${hex.q},${hex.r}`, 'info');
            this.game.debugTeleport = false;
            return;
        }

        if (this.game.movementMode) {
            logger.info(`Attempting move to ${hex.q},${hex.r}`);
            this.game.moveHero(hex.q, hex.r);
        }
    }

    handleCanvasMouseMove(e: MouseEvent): void {
        if (!this.game.hexGrid || !this.game.ui.tooltipManager) return;

        if (!this.cachedRect) this.updateRect();
        const rect = this.cachedRect || this.game.canvas.getBoundingClientRect();

        // Scale coordinates to internal canvas resolution (CRITICAL FIX)
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const axial = this.game.hexGrid?.pixelToAxial(x, y);
        if (!axial) {
            this.game.ui.tooltipManager?.hideTooltip();
            return;
        }

        const hex = this.game.hexGrid.getHex(axial.q, axial.r);

        if (hex && hex.revealed) {
            // Priority: Enemy > Site > Terrain
            const enemy = this.game.enemies.find(e =>
                !e.isDefeated() &&
                e.position &&
                e.position.q === axial.q &&
                e.position.r === axial.r
            );

            // Calculate screen position for tooltip (Map back from internal to screen pixels)
            const hexCenter = this.game.hexGrid.axialToPixel(axial.q, axial.r);
            const screenX = rect.left + (hexCenter.x / scaleX);
            const screenY = rect.top + (hexCenter.y / scaleY);

            const fakeElement = {
                getBoundingClientRect: () => ({
                    left: screenX,
                    top: screenY,
                    right: screenX,
                    bottom: screenY,
                    width: 0,
                    height: 0,
                    x: screenX,
                    y: screenY,
                    toJSON: () => { }
                } as DOMRect)
            } as HTMLElement;

            if (enemy) {
                const content = this.game.ui.tooltipManager.createEnemyTooltipHTML(enemy);
                this.game.ui.tooltipManager.showTooltip(fakeElement, content);
            } else if (hex.site) {
                const content = this.game.ui.tooltipManager.createSiteTooltipHTML(hex.site);
                this.game.ui.tooltipManager.showTooltip(fakeElement, content);
            } else if (hex.terrain) {
                const content = this.game.ui.tooltipManager.createTerrainTooltipHTML(hex.terrain);
                this.game.ui.tooltipManager.showTooltip(fakeElement, content);
            } else {
                this.game.ui.tooltipManager.hideTooltip();
            }
        } else {
            this.game.ui.tooltipManager.hideTooltip();
        }

        // --- NEW: Movement Preview Logic ---
        const previewEl = document.getElementById('movement-preview');
        const previewValueEl = document.getElementById('movement-preview-value');

        if (this.game.movementMode && hex && hex.revealed) {
            const distance = this.game.hexGrid.distance(
                this.game.hero.position.q,
                this.game.hero.position.r,
                axial.q, axial.r
            );

            if (distance === 1) {
                const isNight = this.game.timeManager.isNight();
                const cost = this.game.hexGrid.getMovementCost(axial.q, axial.r, isNight, this.game.hero.hasSkill('flight'));

                if (previewEl && previewValueEl) {
                    previewValueEl.textContent = cost.toString();
                    previewEl.style.display = 'flex';

                    if (this.game.hero.movementPoints < cost) {
                        previewValueEl.style.color = '#ef4444';
                    } else {
                        previewValueEl.style.color = 'var(--color-accent-secondary)';
                    }
                }
            } else if (previewEl) {
                previewEl.style.display = 'none';
            }
        } else if (previewEl) {
            previewEl.style.display = 'none';
        }
    }

    selectHex(q: number, r: number): void {
        this.game.hexGrid.selectHex(q, r);

        const enemy = this.game.enemies.find(e => e.position && e.position.q === q && e.position.r === r);

        if (enemy) {
            this.game.addLog(`Feind gefunden: ${enemy.name} (Rüstung: ${enemy.armor}, Angriff: ${enemy.attack})`, 'combat');

            const distance = this.game.hexGrid.distance(this.game.hero.position.q, this.game.hero.position.r, q, r);
            if (distance === 0) {
                this.game.combatOrchestrator.initiateCombat(enemy);
            }
        }

        const hexData = this.game.hexGrid.getHex(q, r);
        if (hexData) {
            const terrainName = this.game.terrain.getName(hexData.terrain);
            this.game.addLog(`Hex ausgewählt: ${q},${r} - ${terrainName}`, 'info');
        }

        this.game.render();
    }

    handleCardClick(index: number, card: Card): void {
        if (card.isWound()) {
            this.game.sound.error();
            this.game.addLog('Verletzungen können nicht gespielt werden.', 'warning');
            return;
        }

        // --- MANA AMPLIFICATION CHECK ---
        const isNight = this.game.timeManager.isNight();
        const canAffordStrong = this.game.hero.canAffordMana(card, isNight);
        const hasStrongEffect = Object.keys(card.strongEffect || {}).length > 0;

        // If card has strong effect AND player can afford it, SHOW MODAL
        if (hasStrongEffect && canAffordStrong) {
            this.showCardPlayModal(index, card, isNight);
            return;
        }

        // Otherwise finish play
        if (this.game.combat) {
            this.game.combatOrchestrator.playCardInCombat(index, card, false);
        } else {
            this.finishCardPlay(index, false, isNight);
        }
    }

    handleCardDrop(index: number, x: number, y: number): void {
        const axial = this.game.hexGrid.pixelToAxial(x, y);
        const card = this.game.hero.hand[index];
        if (!card || !axial) return;

        logger.info(`Card dropped at ${axial.q},${axial.r}: ${card.name}`);

        // For now, dragging to a hex just plays the card normally
        // Future improvement: if it's a movement card, move to that hex immediately if possible
        this.handleCardClick(index, card);
    }

    // New helper to finalize play (Basic or Strong)
    finishCardPlay(index: number, useStrong: boolean, isNight: boolean): void {
        const card = this.game.hero.hand[index];
        logger.info(`Finalizing card play: ${card.name} (${useStrong ? 'Strong' : 'Basic'})`);
        if (this.game.combat) {
            this.game.combatOrchestrator.playCardInCombat(index, card, useStrong);
            return;
        }

        // Use ActionManager for Undo support
        const result = this.game.actionManager.playCard(index, useStrong, isNight);

        if (result) {
            this.game.sound.cardPlay();
            this.game.addLog(`${result.card.name} gespielt ${useStrong ? '(Verstärkt)' : ''}: ${this.game.ui.formatEffect(result.effect)}`, 'info');
            this.game.ui.addPlayedCard(result.card, result.effect);
            this.game.ui.showPlayArea();

            if (this.game.particleSystem) {
                const rect = this.game.ui.elements.playedCards.getBoundingClientRect();
                const x = rect.right - 50;
                const y = rect.top + 75;
                this.game.particleSystem.playCardEffect(x, y, result.card.color);
            }

            if (result.effect.movement && result.effect.movement > 0) {
                this.game.enterMovementMode();
            }

            this.game.renderHand();
            this.game.updateStats();
        }
    }

    showCardPlayModal(index: number, card: Card, isNight: boolean): void {
        const modal = document.getElementById('card-play-modal');
        const basicBtn = document.getElementById('play-basic-btn');
        const strongBtn = document.getElementById('play-strong-btn') as HTMLButtonElement | null;
        const basicDesc = document.getElementById('basic-effect-desc');
        const strongDesc = document.getElementById('strong-effect-desc');
        const strongCost = document.getElementById('strong-cost-desc');
        const closeBtn = document.getElementById('card-play-close');

        if (!modal || !basicBtn || !strongBtn || !basicDesc || !strongDesc || !strongCost || !closeBtn) return;

        // Populate Content
        basicDesc.textContent = this.game.ui.formatEffect(card.basicEffect);
        strongDesc.textContent = this.game.ui.formatEffect(card.strongEffect);
        strongCost.textContent = `-1 ${card.color.charAt(0).toUpperCase() + card.color.slice(1)} Mana`;

        // Check affordability again just for UI state
        const canAfford = this.game.hero.canAffordMana(card, isNight);
        strongBtn.disabled = !canAfford;

        // Event Handlers
        const close = () => {
            modal.style.display = 'none';
            cleanup();
        };

        const playBasic = () => {
            this.finishCardPlay(index, false, isNight);
            close();
        };

        const playStrong = () => {
            this.finishCardPlay(index, true, isNight);
            close();
        };

        // Remove previous listeners (not efficient but safe for simple usage)
        const cleanup = () => {
            basicBtn.removeEventListener('click', playBasic);
            strongBtn.removeEventListener('click', playStrong);
            closeBtn.removeEventListener('click', close);
            modal.onclick = null;
        };

        basicBtn.addEventListener('click', playBasic);
        strongBtn.addEventListener('click', playStrong);
        closeBtn.addEventListener('click', close);

        modal.onclick = (e) => {
            if (e.target === modal) close();
        };

        modal.style.display = 'flex';
    }

    handleCardRightClick(index: number, card: Card): void {
        logger.debug(`handleCardRightClick called for index ${index}, card ${card.name}`);
        if (card.isWound() || this.game.combat) {
            logger.debug(`handleCardRightClick early return: isWound=${card.isWound()}, combat=${!!this.game.combat}`);
            return;
        }

        // --- NEW SIDEWAYS MODAL ---
        const modal = document.getElementById('sideways-modal');
        const cancelBtn = document.getElementById('sideways-cancel');
        const closeBtn = document.getElementById('sideways-close');

        if (!modal || !cancelBtn || !closeBtn) {
            logger.error(`Sideways modal elements missing: modal=${!!modal}, cancelBtn=${!!cancelBtn}, closeBtn=${!!closeBtn}`);
            return;
        }

        // Populate Preview (Optional visual enhancement)
        const previewContainer = document.getElementById('sideways-card-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            // We can clone the card visual or create a simple preview
            const cardEl = this.game.ui.createCardElement(card);
            cardEl.style.transform = 'scale(0.8)';
            cardEl.style.position = 'static';
            previewContainer.appendChild(cardEl);
        }

        const cleanup = () => {
            modal.style.display = 'none';
            modal.classList.remove('show');
            // Remove event listeners
            document.querySelectorAll('.sideways-options button').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                if (btn.parentNode) btn.parentNode.replaceChild(newBtn, btn);
            });
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
        };

        const handleChoice = (type: string) => {
            // Use ActionManager for Undo support
            const result = this.game.actionManager.playCardSideways(index, type);

            if (result) {
                this.game.sound.cardPlaySideways();

                if (this.game.particleSystem) {
                    const rect = this.game.ui.elements.handCards.getBoundingClientRect();
                    const x = rect.left + (rect.width / 2);
                    const y = rect.top + 50;
                    this.game.particleSystem.playCardEffect(x, y, result.card.color);
                }

                this.game.addLog(`${result.card.name} seitlich gespielt: ${this.game.ui.formatEffect(result.effect)}`, 'info');
                this.game.renderHand();
                this.game.updateStats();

                if (result.effect.movement) {
                    this.game.enterMovementMode();
                }
            }
            cleanup();
        };

        // Bind buttons
        document.querySelectorAll('.sideways-options button').forEach(btn => {
            (btn as HTMLElement).onclick = () => {
                const type = (btn as HTMLElement).dataset.type || ''; // movement, attack, block, influence
                handleChoice(type);
            };
        });

        cancelBtn.onclick = cleanup;
        closeBtn.onclick = cleanup;

        modal.onclick = (e) => {
            if (e.target === modal) cleanup();
        };

        modal.style.display = 'flex';
        // Add timeout for fade-in class if we use CSS transitions
        setTimeout(() => modal.classList.add('show'), 10);
    }

    handleManaClick(index: number, color: string): void {
        // Use ActionManager for Undo support
        const mana = this.game.actionManager.takeMana(index, color);

        if (mana) {
            this.game.addLog(`Mana genommen: ${color}`, 'info');

            // Particle Effect
            if (this.game.particleSystem) {
                const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                this.game.particleSystem.manaEffect(heroPixel.x, heroPixel.y, color);
            }

            // Update UI
            this.game.renderMana();
            if (this.game.ui.updateHeroMana) this.game.ui.updateHeroMana(this.game.hero);
        }
    }
}
