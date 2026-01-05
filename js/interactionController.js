import { logger } from './logger.js';
import { ACTION_TYPES } from './constants.js';

export class InteractionController {
    constructor(game) {
        this.game = game;
    }

    handleCanvasClick(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.game.hexGrid.pixelToAxial(x, y);

        // Check if hex exists
        if (!this.game.hexGrid.hasHex(hex.q, hex.r)) {
            logger.verbose(`Click outside grid at ${hex.q},${hex.r}`);
            return;
        }

        logger.debug(`Grid clicked at ${hex.q},${hex.r}`);

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
            logger.debug(`Attempting move to ${hex.q},${hex.r}`);
            this.game.moveHero(hex.q, hex.r);
        } else {
            this.selectHex(hex.q, hex.r);
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.game.hexGrid || !this.game.ui.tooltipManager) return;

        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const axial = this.game.hexGrid.pixelToAxial(x, y);
        if (!axial) {
            this.game.ui.tooltipManager.hideTooltip();
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

            const hexCenter = this.game.hexGrid.axialToPixel(axial.q, axial.r);
            const screenX = rect.left + hexCenter.x;
            const screenY = rect.top + hexCenter.y;

            const fakeElement = {
                getBoundingClientRect: () => ({
                    left: screenX,
                    top: screenY,
                    right: screenX,
                    bottom: screenY,
                    width: 0,
                    height: 0
                })
            };

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

            // In Mage Knight, movement is only predicted for ADJACENT steps or
            // the current step. Let's show cost for the hex under cursor.
            if (distance === 1) {
                const isNight = this.game.timeManager.isNight();
                const cost = this.game.hexGrid.getMovementCost(axial.q, axial.r, isNight, this.game.hero.hasSkill('flight'));

                if (previewEl && previewValueEl) {
                    previewValueEl.textContent = cost;
                    previewEl.style.display = 'flex';

                    // Add warning color if not enough points
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

    selectHex(q, r) {
        this.game.hexGrid.selectHex(q, r);

        const enemy = this.game.enemies.find(e => e.position && e.position.q === q && e.position.r === r);

        if (enemy) {
            this.game.addLog(`Feind gefunden: ${enemy.name} (Rüstung: ${enemy.armor}, Angriff: ${enemy.attack})`, 'combat');

            const distance = this.game.hexGrid.distance(this.game.hero.position.q, this.game.hero.position.r, q, r);
            if (distance === 0) {
                this.game.initiateCombat(enemy);
            }
        }

        const hexData = this.game.hexGrid.getHex(q, r);
        if (hexData) {
            const terrainName = this.game.terrain.getName(hexData.terrain);
            this.game.addLog(`Hex ausgewählt: ${q},${r} - ${terrainName}`, 'info');
        }

        this.game.render();
    }

    handleCardClick(index, card) {
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
            this.game.playCardInCombat(index, card, false);
        } else {
            this.finishCardPlay(index, false, isNight);
        }
    }

    // New helper to finalize play (Basic or Strong)
    finishCardPlay(index, useStrong, isNight) {
        const card = this.game.hero.hand[index];
        logger.info(`Finalizing card play: ${card.name} (${useStrong ? 'Strong' : 'Basic'})`);
        if (this.game.combat) {
            const card = this.game.hero.hand[index];
            this.game.playCardInCombat(index, card, useStrong);
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

    showCardPlayModal(index, card, isNight) {
        const modal = document.getElementById('card-play-modal');
        const basicBtn = document.getElementById('play-basic-btn');
        const strongBtn = document.getElementById('play-strong-btn');
        const basicDesc = document.getElementById('basic-effect-desc');
        const strongDesc = document.getElementById('strong-effect-desc');
        const strongCost = document.getElementById('strong-cost-desc');
        const closeBtn = document.getElementById('card-play-close');

        if (!modal) return; // Should not happen

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

    handleCardRightClick(index, card) {
        if (card.isWound() || this.game.combat) {
            return;
        }

        const options = [ACTION_TYPES.MOVEMENT, ACTION_TYPES.ATTACK, ACTION_TYPES.BLOCK, ACTION_TYPES.INFLUENCE];
        const chosen = prompt(`${card.name} seitlich spielen für: \n1: +1 Bewegung\n2: +1 Angriff\n3: +1 Block\n4: +1 Einfluss\n\nWähle Option (1-4):`);

        const chosenNum = parseInt(chosen, 10);
        if (chosenNum >= 1 && chosenNum <= 4) {
            const effectType = options[chosenNum - 1];

            // Use ActionManager for Undo support
            const result = this.game.actionManager.playCardSideways(index, effectType);

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
        }
    }

    handleManaClick(index, color) {
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
