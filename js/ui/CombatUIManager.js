/**
 * Manages combat-related UI components.
 */
export class CombatUIManager {
    constructor(elements, ui) {
        this.elements = elements;
        this.ui = ui; // Reference to main UI
    }

    /**
     * Show combat panel
     */
    showCombatPanel(enemies, phase, onEnemyClick) {
        if (this.elements.combatPanel) {
            this.elements.combatPanel.style.display = 'block';
            this.updateCombatInfo(enemies, phase, onEnemyClick);
        }
    }

    /**
     * Hide combat panel
     */
    hideCombatPanel() {
        if (this.elements.combatPanel) {
            this.elements.combatPanel.style.display = 'none';
        }
        if (this.elements.combatInfo) this.elements.combatInfo.innerHTML = '';
        if (this.elements.combatUnits) this.elements.combatUnits.innerHTML = '';
    }

    /**
     * Reset combat UI
     */
    reset() {
        this.hideCombatPanel();
    }

    /**
     * Update combat info with current enemies and phase
     */
    updateCombatInfo(enemies, phase, onEnemyClick) {
        const info = this.elements.combatInfo;
        if (!info) return;

        const phaseLabel = this.getCombatPhaseName(phase);
        const statusColor = phase === 'attack' ? '#ef4444' : (phase === 'ranged' ? '#10b981' : '#3b82f6');

        info.innerHTML = `
            <div class="combat-status" style="border-left: 4px solid ${statusColor}; padding: 0.5rem; background: rgba(0,0,0,0.2); margin-bottom: 0.5rem;">
                <strong>${phaseLabel}</strong><br>
                <small>${this.getPhaseHint(phase)}</small>
            </div>
        `;

        enemies.forEach(enemy => {
            const enemyDiv = this.renderEnemy(enemy, phase, onEnemyClick);
            info.appendChild(enemyDiv);
        });
    }

    /**
     * Update combat totals (accumulated attack/block)
     */
    updateCombatTotals(attackTotal, blockTotal, phase) {
        const info = this.elements.combatInfo;
        if (!info) return;

        let totalsDiv = document.getElementById('combat-totals');
        if (!totalsDiv) {
            totalsDiv = document.createElement('div');
            totalsDiv.id = 'combat-totals';
            totalsDiv.style.cssText = 'margin: 1rem 0; padding: 0.75rem; background: rgba(255,255,255,0.1); border-radius: 8px;';
            info.insertBefore(totalsDiv, info.firstChild);
        }

        const COMBAT_PHASE = { BLOCK: 'block', ATTACK: 'attack', RANGED: 'ranged' };
        let html = '<div style="display: flex; gap: 1rem; justify-content: space-around;">';

        if (phase === COMBAT_PHASE.BLOCK) {
            html += `<div style="text-align: center;">
                <div style="font-size: 0.9em; opacity: 0.8;">Total Block</div>
                <div style="font-size: 1.5em; font-weight: bold; color: #4a9eff;">${blockTotal}</div>
            </div>`;
        } else if (phase === COMBAT_PHASE.ATTACK) {
            html += `<div style="text-align: center;">
                <div style="font-size: 0.9em; opacity: 0.8;">Total Attack</div>
                <div style="font-size: 1.5em; font-weight: bold; color: #ff4a4a;">${attackTotal}</div>
            </div>`;
        } else if (phase === COMBAT_PHASE.RANGED) {
            const orchestrator = this.ui?.game?.combatOrchestrator;
            const rangedTotal = orchestrator?.combatRangedTotal ?? attackTotal;
            const siegeTotal = orchestrator?.combatSiegeTotal ?? 0;
            html += `
                <div style="text-align: center;">
                    <div style="font-size: 0.9em; opacity: 0.8;">Fernkampf</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #fbbf24;">${rangedTotal}</div>
                </div>
                <div style="text-align: center; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 1rem;">
                    <div style="font-size: 0.9em; opacity: 0.8;">Belagerung</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #f59e0b;">${siegeTotal}</div>
                </div>
            `;
        }

        html += '</div>';

        // --- ADDTION: Prediction Summary ---
        const prediction = this.ui?.game?.combat?.getPredictedOutcome(attackTotal, blockTotal);
        if (prediction) {
            html += `
                <div class="combat-prediction" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        ${prediction.expectedWounds > 0 ?
                    `<div style="color: #ef4444; display: flex; align-items: center; gap: 0.5rem;">
                                💔 <span><strong>${prediction.expectedWounds}</strong> Wunden erwartet</span>
                                ${prediction.isPoisoned ? `<span style="color: #10b981; font-size: 0.7rem; background: rgba(16,185,129,0.1); padding: 0 4px; border-radius: 4px;">+ GIFT!</span>` : ''}
                             </div>` :
                    `<div style="color: #10b981;">✅ Kein Schaden erwartet</div>`
                }
                        ${prediction.enemiesDefeated.length > 0 ?
                    `<div style="color: #fbbf24; margin-top: 0.25rem;">
                                ⚔️ <strong>Besiegbar:</strong> ${prediction.enemiesDefeated.join(', ')}
                             </div>` : ''
                }
                    </div>
                </div>
            `;
        }

        totalsDiv.innerHTML = html;

        // Execute Attack Button logic
        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) {
            if (phase === COMBAT_PHASE.RANGED) {
                executeAttackBtn.textContent = 'Fernkampf beenden -> Blocken';
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASE.BLOCK) {
                executeAttackBtn.textContent = 'Blocken beenden -> Schaden';
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASE.ATTACK) {
                executeAttackBtn.textContent = 'Angriff ausführen';
                executeAttackBtn.style.display = 'block';
            } else {
                executeAttackBtn.style.display = 'none';
            }
        }
    }

    /**
     * Get German combat phase name
     */
    getCombatPhaseName(phase) {
        const names = {
            not_in_combat: 'Kein Kampf',
            ranged: 'Fernkampf-Phase',
            block: 'Block-Phase',
            damage: 'Schadens-Phase',
            attack: 'Angriffs-Phase',
            complete: 'Abgeschlossen'
        };
        return names[phase] || phase;
    }

    /**
     * Get hint text for combat phase
     */
    getPhaseHint(phase) {
        const hints = {
            'ranged': 'Besiege Feinde mit Fernkampf- oder Belagerungswerten. Befestigte Feinde (🏰) ignorieren normalen Fernkampf!',
            'block': 'Blocke Feind-Angriffe. Ungeblockte Feinde verursachen Schaden.',
            'attack': 'Besiege verbliebene Feinde mit normalen Angriffswerten.'
        };
        return hints[phase] || '';
    }

    /**
     * Render a single enemy card
     */
    renderEnemy(enemy, phase, onClick) {
        const el = document.createElement('div');
        el.className = 'enemy-card';

        // Defensive check for game/combat reference
        const combat = this.game?.combat;
        const isBlocked = combat?.blockedEnemies?.has(enemy.id) || false;
        if (isBlocked) {
            el.classList.add('blocked-enemy');
            el.style.opacity = '0.6';
        }

        if (enemy.isBoss) {
            el.classList.add('boss-card');
            el.style.border = '2px solid #fbbf24';
            el.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0,0,0,0.3))';
        }

        if ((phase === 'ranged' || phase === 'block') && onClick && !isBlocked) {
            el.style.cursor = 'crosshair';
            el.title = phase === 'ranged' ? 'Klicken für Fernkampf-Angriff' : 'Klicken zum Blocken';
            el.addEventListener('click', () => onClick(enemy));
            el.addEventListener('mouseenter', () => el.style.boxShadow = phase === 'ranged' ? '0 0 10px red' : '0 0 10px #3b82f6');
            el.addEventListener('mouseleave', () => el.style.boxShadow = enemy.isBoss ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none');
        }

        // Get Attack Info
        const attackValue = typeof enemy.getEffectiveAttack === 'function' ? enemy.getEffectiveAttack() : enemy.attack;
        const attackType = enemy.attackType || 'physical';
        const blockReq = typeof enemy.getBlockRequirement === 'function' ? enemy.getBlockRequirement() : attackValue;

        const typeIcons = {
            'physical': '⚔️',
            'fire': '🔥',
            'ice': '❄️',
            'cold_fire': '🔥❄️'
        };
        const typeIcon = typeIcons[attackType] || '⚔️';

        let bossHealthHTML = '';
        if (enemy.isBoss) {
            const healthPercent = (typeof enemy.getHealthPercent === 'function' ? enemy.getHealthPercent() : 1) * 100;
            const healthColor = healthPercent > 60 ? '#10b981' : healthPercent > 30 ? '#fbbf24' : '#ef4444';
            const phaseName = typeof enemy.getPhaseName === 'function' ? enemy.getPhaseName() : 'Boss';

            bossHealthHTML = `
                <div class="boss-health-section" style="margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        <span style="color: #fbbf24;">👿 ${phaseName}</span>
                        <span style="color: ${healthColor}">${enemy.currentHealth}/${enemy.maxHealth} HP</span>
                    </div>
                    <div class="boss-health-bar" style="width: 100%; height: 8px; background: rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden;">
                        <div class="boss-health-fill" style="width: ${healthPercent}%; height: 100%; background: linear-gradient(90deg, ${healthColor}, ${healthColor}aa); transition: width 0.3s ease;"></div>
                    </div>
                    ${enemy.enraged ? '<div style="color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;">🔥 WÜTEND!</div>' : ''}
                </div>
            `;
        }

        const blockBadge = (phase === 'block' && !isBlocked) ?
            `<div class="block-badge" style="position: absolute; bottom: 5px; right: 5px; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">Benötigt: ${blockReq}</div>` : '';

        const fortifiedBadge = (phase === 'ranged' && enemy.fortified && !isBlocked) ?
            `<div class="fortified-badge" style="position: absolute; top: 5px; right: 5px; background: #92400e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; border: 1px solid #fbbf24;">BEFESTIGT</div>` : '';

        el.innerHTML = `
            ${fortifiedBadge}
            <div class="enemy-icon" style="color: ${enemy.color}; ${enemy.isBoss ? 'font-size: 2rem;' : ''}">
                ${isBlocked ? '🛡️' : enemy.icon}
            </div>
            <div class="enemy-name" style="${enemy.isBoss ? 'font-size: 1.1rem; color: #fbbf24;' : ''}">
                ${isBlocked ? `<span style="color: #10b981; font-size: 0.8rem;">[GEBLOCKT]</span><br>` : ''}
                ${enemy.name}
            </div>
            <div class="enemy-stats">
                <div class="stat" title="Rüstung">🛡️ ${enemy.armor}</div>
                <div class="stat" title="Angriff" style="display: flex; align-items: center; gap: 2px;">
                    ${typeIcon} <span>${attackValue}</span>
                </div>
            </div>
            ${bossHealthHTML}
            <div class="enemy-traits">
                ${enemy.fortified ? '<span title="Befestigt">🏰</span>' : ''}
                ${enemy.swift ? '<span title="Flink">💨</span>' : ''}
                ${enemy.poison ? '<span title="Giftig">🤢</span>' : ''}
                ${enemy.isBoss ? '<span title="Boss">👑</span>' : ''}
            </div>
            ${blockBadge}
        `;
        return el;
    }

    /**
     * Render units available for combat action
     */
    renderUnitsInCombat(units, phase, onUnitActivate) {
        const container = this.elements.combatUnits;
        if (!container) return;

        container.innerHTML = '';
        if (!units || units.length === 0) return;

        const title = document.createElement('h3');
        title.textContent = '🎖️ Deine Einheiten';
        title.style.cssText = 'font-size: 0.9rem; margin-bottom: 0.5rem;';
        container.appendChild(title);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 0.5rem;';

        units.forEach(unit => {
            const isReady = typeof unit.isReady === 'function' ? unit.isReady() : true;
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-combat-card';
            unitCard.style.cssText = `
                padding: 0.5rem;
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 4px;
                cursor: ${isReady ? 'pointer' : 'not-allowed'};
                opacity: ${isReady ? '1' : '0.5'};
                filter: ${isReady ? 'none' : 'grayscale(0.5)'};
            `;

            const abilities = (typeof unit.getAbilities === 'function' ? unit.getAbilities() : []).filter(a => {
                if (phase === 'block') return a.type === 'block';
                if (phase === 'attack') return a.type === 'attack';
                return false;
            });

            const hasRelevantAbility = abilities.length > 0;

            unitCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <span style="font-size: 1.2rem;">${unit.getIcon()}</span>
                        <strong>${unit.getName()}</strong>
                    </div>
                    <div style="font-size: 0.85rem; color: ${hasRelevantAbility ? '#10b981' : '#6b7280'};">
                        ${abilities.map(a => a.text).join(', ') || 'Keine passende Fähigkeit'}
                    </div>
                </div>
            `;

            if (isReady && hasRelevantAbility && onUnitActivate) {
                unitCard.addEventListener('click', () => onUnitActivate(unit));
                unitCard.addEventListener('mouseenter', () => {
                    unitCard.style.background = 'rgba(139, 92, 246, 0.2)';
                    unitCard.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                });
                unitCard.addEventListener('mouseleave', () => {
                    unitCard.style.background = 'rgba(139, 92, 246, 0.1)';
                    unitCard.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                });
            }

            grid.appendChild(unitCard);
        });

        container.appendChild(grid);
    }
}
