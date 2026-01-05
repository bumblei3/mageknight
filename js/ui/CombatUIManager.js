import { t } from '../i18n/index.js';
import { COMBAT_PHASES, ACTION_TYPES } from '../constants.js';

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
            this.elements.combatPanel.style.display = 'flex';
            this.elements.combatPanel.classList.add('active-combat');
            this.updateCombatInfo(enemies, phase, onEnemyClick);
        }
    }

    /**
     * Hide combat panel
     */
    hideCombatPanel() {
        if (this.elements.combatPanel) {
            this.elements.combatPanel.style.display = 'none';
            this.elements.combatPanel.classList.remove('active-combat');
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
        const colorClass = phase === COMBAT_PHASES.ATTACK ? 'attack-phase' : (phase === COMBAT_PHASES.RANGED ? 'ranged-phase' : 'block-phase');

        info.innerHTML = `
            <div class="combat-status ${colorClass}">
                <strong>${phaseLabel}</strong>
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
            info.insertBefore(totalsDiv, info.firstChild);
        }

        let html = '<div class="combat-totals-row">';

        if (phase === COMBAT_PHASES.BLOCK) {
            html += `<div class="total-stat block-stat">
                <div class="total-label">Total Block</div>
                <div class="total-value">${blockTotal}</div>
            </div>`;
        } else if (phase === COMBAT_PHASES.ATTACK) {
            html += `<div class="total-stat attack-stat">
                <div class="total-label">Total Attack</div>
                <div class="total-value">${attackTotal}</div>
            </div>`;
        } else if (phase === COMBAT_PHASES.RANGED) {
            const orchestrator = this.ui?.game?.combatOrchestrator;
            const rangedTotal = orchestrator?.combatRangedTotal ?? attackTotal;
            const siegeTotal = orchestrator?.combatSiegeTotal ?? 0;
            html += `
                <div class="total-stat ranged-stat">
                    <div class="total-label">Fernkampf</div>
                    <div class="total-value">${rangedTotal}</div>
                </div>
                <div class="total-stat siege-stat">
                    <div class="total-label">Belagerung</div>
                    <div class="total-value">${siegeTotal}</div>
                </div>
            `;
        }

        html += '</div>';

        // --- ADDTION: Prediction Summary ---
        const prediction = this.ui?.game?.combat?.getPredictedOutcome(attackTotal, blockTotal);
        if (prediction) {
            html += `
                <div class="combat-prediction">
                    <div class="prediction-details">
                        ${prediction.expectedWounds > 0 ?
        `<div class="prediction-danger">
                                💔 <span><strong>${prediction.expectedWounds}</strong> Wunden erwartet</span>
                                ${prediction.isPoisoned ? '<span class="poison-warning">+ GIFT!</span>' : ''}
                             </div>` :
        '<div class="prediction-safe">✅ Kein Schaden erwartet</div>'
}
                        ${prediction.enemiesDefeated.length > 0 ?
        `<div class="prediction-success">
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
            if (phase === COMBAT_PHASES.RANGED) {
                executeAttackBtn.textContent = 'Fernkampf beenden -> Blocken';
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASES.BLOCK) {
                executeAttackBtn.textContent = 'Blocken beenden -> Schaden';
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASES.ATTACK) {
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
            [COMBAT_PHASES.NOT_IN_COMBAT]: 'Kein Kampf',
            [COMBAT_PHASES.RANGED]: 'Fernkampf-Phase',
            [COMBAT_PHASES.BLOCK]: 'Block-Phase',
            [COMBAT_PHASES.DAMAGE]: 'Schadens-Phase',
            [COMBAT_PHASES.ATTACK]: 'Angriffs-Phase',
            [COMBAT_PHASES.COMPLETE]: 'Abgeschlossen'
        };
        return names[phase] || phase;
    }

    /**
     * Get hint text for combat phase
     */
    getPhaseHint(phase) {
        const hints = {
            [COMBAT_PHASES.RANGED]: 'Besiege Feinde mit Fernkampf- oder Belagerungswerten. Befestigte Feinde (🏰) ignorieren normalen Fernkampf!',
            [COMBAT_PHASES.BLOCK]: 'Blocke Feind-Angriffe. Ungeblockte Feinde verursachen Schaden.',
            [COMBAT_PHASES.ATTACK]: 'Besiege verbliebene Feinde mit normalen Angriffswerten.'
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
        }

        if ((phase === COMBAT_PHASES.RANGED || phase === COMBAT_PHASES.BLOCK) && onClick && !isBlocked) {
            el.style.cursor = 'crosshair';
            el.title = phase === COMBAT_PHASES.RANGED ? 'Klicken für Fernkampf-Angriff' : 'Klicken zum Blocken';
            el.addEventListener('click', () => onClick(enemy));
            el.addEventListener('mouseenter', () => el.style.boxShadow = phase === COMBAT_PHASES.RANGED ? '0 0 10px red' : '0 0 10px #3b82f6');
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
                <div class="boss-health-section">
                    <div class="boss-health-info">
                        <span class="boss-phase-name">👿 ${phaseName}</span>
                        <span class="boss-hp-value" style="color: ${healthColor}">${enemy.currentHealth}/${enemy.maxHealth} HP</span>
                    </div>
                    <div class="boss-health-bar">
                        <div class="boss-health-fill" style="width: ${healthPercent}%; background: linear-gradient(90deg, ${healthColor}, ${healthColor}aa);"></div>
                    </div>
                    ${enemy.enraged ? '<div class="boss-enraged-label">🔥 WÜTEND!</div>' : ''}
                </div>
            `;
        }

        const blockBadge = (phase === COMBAT_PHASES.BLOCK && !isBlocked) ?
            `<div class="block-badge">Benötigt: ${blockReq}</div>` : '';

        const fortifiedBadge = (phase === COMBAT_PHASES.RANGED && enemy.fortified && !isBlocked) ?
            '<div class="fortified-badge">BEFESTIGT</div>' : '';

        el.innerHTML = `
            <div class="enemy-icon" style="color: ${enemy.color}">
                ${isBlocked ? '🛡️' : enemy.icon}
            </div>
            <div class="enemy-details">
                <div class="enemy-name">
                    ${isBlocked ? '<span class="blocked-label">[GEBLOCKT]</span><br>' : ''}
                    ${enemy.name}
                </div>
                <div class="enemy-stats">
                    <div class="stat" title="Rüstung">🛡️ ${enemy.armor}</div>
                    <div class="stat" title="Angriff">
                        <span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="${attackType}">${typeIcon}</span> <span>${attackValue}</span>
                    </div>
                </div>
                ${bossHealthHTML}
                <div class="enemy-traits">
                    ${enemy.fortified ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="fortified">🏰</span>' : ''}
                    ${enemy.swift ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="swift">💨</span>' : ''}
                    ${enemy.poison ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="poison">🤢</span>' : ''}
                    ${enemy.vampiric ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="vampiric">🧛</span>' : ''}
                    ${enemy.brutal ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="brutal">👹</span>' : ''}
                    ${enemy.paralyze ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="paralyze">⚡</span>' : ''}
                    ${enemy.cumbersome ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="cumbersome">🏋️</span>' : ''}
                    ${enemy.assassin ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="assassin">🗡️</span>' : ''}
                    ${enemy.summoner ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="summoner">🦇</span>' : ''}
                    ${enemy.elusive ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="elusive">👤</span>' : ''}
                    ${enemy.isBoss ? '<span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="boss">👑</span>' : ''}
                </div>
            </div>
            ${blockBadge}
        `;

        // Attach tooltips to ability icons
        if (this.ui && this.ui.tooltipManager) {
            const abilityIcons = el.querySelectorAll('.ability-icon');
            abilityIcons.forEach(icon => {
                this.ui.tooltipManager.attachToElement(icon);
            });
        }

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
        container.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'combat-units-grid';

        units.forEach(unit => {
            const isReady = typeof unit.isReady === 'function' ? unit.isReady() : true;
            const unitCard = document.createElement('div');
            unitCard.className = `unit-combat-card ${isReady ? '' : 'not-ready'}`;

            const abilities = (typeof unit.getAbilities === 'function' ? unit.getAbilities() : []).filter(a => {
                if (phase === COMBAT_PHASES.BLOCK) return a.type === ACTION_TYPES.BLOCK;
                if (phase === COMBAT_PHASES.ATTACK) return a.type === ACTION_TYPES.ATTACK;
                if (phase === COMBAT_PHASES.RANGED) return a.type === ACTION_TYPES.RANGED || a.type === ACTION_TYPES.SIEGE;
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
