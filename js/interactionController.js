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
            return;
        }

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
        if (this.game.combat) {
            this.game.playCardInCombat(index, card);
            return;
        }

        if (card.isWound()) {
            this.game.sound.error();
            this.game.addLog('Verletzungen können nicht gespielt werden.', 'warning');
            return;
        }

        const result = this.game.hero.playCard(index, false, this.game.timeManager.isNight());
        if (result) {
            this.game.sound.cardPlay();
            this.game.addLog(`${result.card.name} gespielt: ${this.game.ui.formatEffect(result.effect)}`, 'info');
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

    handleCardRightClick(index, card) {
        if (card.isWound() || this.game.combat) {
            return;
        }

        const options = ['movement', 'attack', 'block', 'influence'];
        const chosen = prompt(`${card.name} seitlich spielen für: \n1: +1 Bewegung\n2: +1 Angriff\n3: +1 Block\n4: +1 Einfluss\n\nWähle Option (1-4):`);

        const chosenNum = parseInt(chosen, 10);
        if (chosenNum >= 1 && chosenNum <= 4) {
            const effectType = options[chosenNum - 1];
            const result = this.game.hero.playCardSideways(index, effectType);
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
        const mana = this.game.manaSource.takeDie(index, this.game.timeManager.isNight());
        if (mana) {
            // Add to hero's mana inventory
            this.game.hero.takeManaFromSource(mana);

            this.game.addLog(`Mana genommen: ${color}`, 'info');

            // Particle Effect
            if (this.game.particleSystem) {
                const heroPixel = this.game.hexGrid.axialToPixel(this.game.hero.position.q, this.game.hero.position.r);
                this.game.particleSystem.manaEffect(heroPixel.x, heroPixel.y, color);
            }

            // Update UI
            this.game.renderMana();
            // this.game.updateHeroMana(); // Assuming RenderController or UI handles this. game.js had updateHeroMana().
            if (this.game.ui.updateHeroMana) this.game.ui.updateHeroMana(this.game.hero);
        }
    }
}
