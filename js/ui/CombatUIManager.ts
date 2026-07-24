import { COMBAT_PHASES, ACTION_TYPES } from '../constants';
import { UIElements } from '../ui';
import { t } from '../i18n/index';
import { createPhaseIndicator, updatePhaseIndicator, renderPhaseIndicator } from './components';

export class CombatUIManager {
    private elements: UIElements;
    private ui: any;

    constructor(elements: UIElements, ui: any) {
        this.elements = elements;
        this.ui = ui; // Reference to main UI
    }

    /**
     * Show combat panel
     * @param {any[]} enemies - List of enemy objects
     * @param {string} phase - Current combat phase
     * @param {Function} onEnemyClick - Callback for enemy click
     */
    public showCombatPanel(enemies: any[], phase: string, onEnemyClick: (enemy: any) => void): void {
        if (this.elements.combatPanel) {
            this.elements.combatPanel.style.display = 'flex';
            this.elements.combatPanel.classList.add('active-combat');
            this.updateCombatInfo(enemies, phase, onEnemyClick);
        }
    }

    /**
     * Hide combat panel
     */
    public hideCombatPanel(): void {
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
    public reset(): void {
        this.hideCombatPanel();
    }

    /**
     * Update combat info with current enemies and phase
     * @param {any[]} enemies - List of enemy objects
     * @param {string} phase - Current combat phase
     * @param {Function} onEnemyClick - Callback for enemy click
     */
    public updateCombatInfo(enemies: any[], phase: string, onEnemyClick: (enemy: any) => void): void {
        const info = this.elements.combatInfo;
        if (!info) return;

        // Use new PhaseIndicator component for phase display
        const phaseContainer = document.createElement('div');
        phaseContainer.id = 'combat-phase-container';
        info.innerHTML = '';
        info.appendChild(phaseContainer);

        renderPhaseIndicator(phaseContainer, {
            phase,
            inCombat: true,
            onPhaseChange: (targetPhase: string) => {
                const combat = this.ui?.game?.combat;
                if (!combat) return;

                if (phase === COMBAT_PHASES.RANGED && targetPhase === COMBAT_PHASES.BLOCK) {
                    combat.endRangedPhase();
                } else if (phase === COMBAT_PHASES.BLOCK && targetPhase === COMBAT_PHASES.DAMAGE) {
                    combat.endBlockPhase();
                } else if (phase === COMBAT_PHASES.DAMAGE && targetPhase === COMBAT_PHASES.ATTACK) {
                    combat.phase = COMBAT_PHASES.ATTACK;
                    combat.attackPhase();
                } else if (phase === COMBAT_PHASES.ATTACK && targetPhase === COMBAT_PHASES.NOT_IN_COMBAT) {
                    // End combat
                    const attackValue = this.ui?.game?.combatOrchestrator?.combatAttackTotal ?? 0;
                    const attackElement = 'physical';
                    combat.attackEnemies(attackValue, attackElement);
                    combat.endCombat();
                }
            },
            showActions: true,
            labels: {
                ranged: t('ui.phases.ranged'),
                block: t('ui.phases.block'),
                attack: t('ui.phases.attack'),
                endCombat: t('combat.uiActions.endCombat'),
                endRanged: t('combat.uiActions.endRanged'),
                endBlock: t('combat.uiActions.endBlock'),
                executeAttack: t('combat.uiActions.executeAttack')
            }
        });

        // Render enemies
        enemies.forEach((enemy) => {
            const enemyDiv = this.renderEnemy(enemy, phase, onEnemyClick);
            info.appendChild(enemyDiv);
        });
    }

    /**
     * Update combat totals (accumulated attack/block)
     * @param {number} attackTotal - Total attack points
     * @param {number} blockTotal - Total block points
     * @param {string} phase - Current combat phase
     */
    public updateCombatTotals(attackTotal: number, blockTotal: number, phase: string): void {
        const info = this.elements.combatInfo;
        if (!info) return;

        let totalsDiv = document.getElementById('combat-totals');
        if (!totalsDiv) {
            totalsDiv = document.createElement('div');
            totalsDiv.id = 'combat-totals';
            info.insertBefore(totalsDiv, info.firstChild);
        }

        const combat = this.ui?.game?.combat;
        let blockNeeded = 0;
        if (combat && phase === COMBAT_PHASES.BLOCK) {
            (combat.enemies || []).forEach((e: any) => {
                if (combat.blockedEnemies?.has(e.id)) return;
                blockNeeded +=
                    typeof e.getBlockRequirement === 'function' ? e.getBlockRequirement() : e.attack || 0;
            });
        }

        let html = '<div class="combat-totals-row">';

        if (phase === COMBAT_PHASES.BLOCK) {
            const enough = blockNeeded > 0 && blockTotal >= blockNeeded;
            html += `<div class="total-stat block-stat ${enough ? 'total-stat--ok' : ''}">
                <div class="total-label">${t('combat.ui.totalBlock') || 'Block'}</div>
                <div class="total-value">${blockTotal}${blockNeeded > 0 ? `<span class="total-need">/${blockNeeded}</span>` : ''}</div>
            </div>`;
        } else if (phase === COMBAT_PHASES.ATTACK) {
            html += `<div class="total-stat attack-stat">
                <div class="total-label">${t('combat.ui.totalAttack') || 'Angriff'}</div>
                <div class="total-value">${attackTotal}</div>
            </div>`;
        } else if (phase === COMBAT_PHASES.RANGED) {
            const orchestrator = this.ui?.game?.combatOrchestrator;
            const rangedTotal = orchestrator?.combatRangedTotal ?? attackTotal;
            const siegeTotal = orchestrator?.combatSiegeTotal ?? 0;
            html += `
                <div class="total-stat ranged-stat">
                    <div class="total-label">${t('combat.ui.ranged') || 'Fernkampf'}</div>
                    <div class="total-value">${rangedTotal}</div>
                </div>
                <div class="total-stat siege-stat">
                    <div class="total-label">${t('combat.ui.siege') || 'Belagerung'}</div>
                    <div class="total-value">${siegeTotal}</div>
                </div>
            `;
        }

        html += '</div>';

        // Live outcome predictor — answer "what happens if I end this phase?"
        const prediction = combat?.getPredictedOutcome?.(attackTotal, blockTotal);
        if (prediction) {
            const woundsLine =
                prediction.expectedWounds > 0
                    ? `<div class="prediction-danger">
                        💔 <span><strong>${prediction.expectedWounds}</strong> ${
                          t('combat.ui.woundsExpected') || 'Wunden erwartet'
                      }</span>
                        ${
                            prediction.isPoisoned
                                ? `<span class="poison-warning">${t('combat.ui.poison') || '+ GIFT!'}</span>`
                                : ''
                        }
                     </div>`
                    : phase === COMBAT_PHASES.BLOCK || phase === COMBAT_PHASES.RANGED
                      ? `<div class="prediction-safe">✅ ${t('combat.ui.noDamage') || 'Kein Schaden erwartet'}</div>`
                      : '';

            const defeatLine =
                prediction.enemiesDefeated?.length > 0
                    ? `<div class="prediction-success">
                        ⚔️ <strong>${t('combat.ui.defeatable') || 'Besiegbar'}:</strong> ${prediction.enemiesDefeated.join(', ')}
                     </div>`
                    : phase === COMBAT_PHASES.ATTACK && attackTotal > 0
                      ? `<div class="prediction-warning">⚠️ ${
                            t('combat.ui.notEnoughAttack') || 'Noch nicht genug Angriff für einen Kill'
                        }</div>`
                      : '';

            const assassinLine = prediction.assassinRestriction
                ? `<div class="prediction-warning">
                    🗡️ <strong>${t('combat.ui.assassin') || 'Attentäter!'}</strong> ${
                      t('combat.ui.assassinHint') || 'Schaden muss der Held nehmen.'
                  }
                 </div>`
                : '';

            const efficiencyLine =
                prediction.elementalEfficiencyWarnings?.length > 0 ||
                prediction.blockEfficiencyWarnings?.length > 0
                    ? (() => {
                          const elemWarn = (prediction.elementalEfficiencyWarnings || [])
                              .map((w: string) => `<span class="efficiency-warning">⚡ ${w}</span>`)
                              .join('');
                          const blockWarn = (prediction.blockEfficiencyWarnings || [])
                              .map((w: string) => `<span class="efficiency-warning">🛡️ ${w}</span>`)
                              .join('');
                          return `<div class="prediction-efficiency">${elemWarn}${blockWarn}</div>`;
                      })()
                    : '';

            if (woundsLine || defeatLine || assassinLine || efficiencyLine) {
                html += `
                <div class="combat-prediction" role="status" aria-live="polite">
                    <div class="prediction-heading">${t('combat.ui.prediction') || 'Vorschau'}</div>
                    <div class="prediction-details">
                        ${woundsLine}
                        ${defeatLine}
                        ${assassinLine}
                        ${efficiencyLine}
                    </div>
                </div>
            `;
            }
        }

        totalsDiv!.innerHTML = html;

        // Execute Attack Button logic
        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) {
            let text = '';
            if (phase === COMBAT_PHASES.RANGED) {
                text = t('combat.uiActions.endRanged');
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASES.BLOCK) {
                text = t('combat.uiActions.endBlock');
                executeAttackBtn.style.display = 'block';
            } else if (phase === COMBAT_PHASES.DAMAGE) {
                text = t('combat.uiActions.acceptDamage');
                executeAttackBtn.style.display = 'block';
                executeAttackBtn.classList.add('damage-phase-btn'); // Optional styling hook
            } else if (phase === COMBAT_PHASES.ATTACK) {
                // Check if attack is sufficient to defeat at least one enemy (simplified check for UI)
                const enemies = this.ui?.game?.combat?.enemies || [];
                const totalArmor = enemies.reduce((sum: number, e: any) => sum + (e.armor || 0), 0);
                const canDefeat = attackTotal >= totalArmor && totalArmor > 0;

                text = canDefeat ? t('combat.uiActions.executeAttack') : t('combat.uiActions.endCombat');
                executeAttackBtn.style.display = 'block';
                executeAttackBtn.classList.remove('damage-phase-btn');
            } else {
                executeAttackBtn.style.display = 'none';
            }

            if (text) {
                executeAttackBtn.textContent = text;
                executeAttackBtn.setAttribute('aria-label', text);
            }
        }
    }

    /** Whether a trait should be highlighted as "matters now" in the current phase */
    private isTraitRelevantInPhase(traitKey: string, phase: string): boolean {
        const p = String(phase || '').toLowerCase();
        const map: Record<string, string[]> = {
            fortified: [COMBAT_PHASES.RANGED, 'ranged'],
            swift: [COMBAT_PHASES.BLOCK, 'block'],
            brutal: [COMBAT_PHASES.BLOCK, COMBAT_PHASES.DAMAGE, 'block', 'damage'],
            poison: [COMBAT_PHASES.BLOCK, COMBAT_PHASES.DAMAGE, 'block', 'damage'],
            assassin: [COMBAT_PHASES.DAMAGE, 'damage'],
            cumbersome: [COMBAT_PHASES.BLOCK, 'block'],
            paralyze: [COMBAT_PHASES.DAMAGE, 'damage'],
            vampiric: [COMBAT_PHASES.DAMAGE, 'damage'],
            elusive: [COMBAT_PHASES.ATTACK, COMBAT_PHASES.BLOCK, 'attack', 'block'],
            summoner: [COMBAT_PHASES.RANGED, COMBAT_PHASES.BLOCK, 'ranged', 'block']
        };
        return (map[traitKey] || []).includes(p);
    }

    /**
     * Get German combat phase name
     * @param {string} phase - Combat phase
     * @returns {string} Name
     */
    public getCombatPhaseName(phase: string): string {
        const names: Record<string, string> = {
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
     * @param {string} phase - Combat phase
     * @returns {string} Hint
     */
    public getPhaseHint(phase: string): string {
        const hints: Record<string, string> = {
            [COMBAT_PHASES.RANGED]:
                'Besiege Feinde mit Fernkampf- oder Belagerungswerten. Befestigte Feinde (🏰) ignorieren normalen Fernkampf!',
            [COMBAT_PHASES.BLOCK]: 'Blocke Feind-Angriffe. Ungeblockte Feinde verursachen Schaden.',
            [COMBAT_PHASES.ATTACK]: 'Besiege verbliebene Feinde mit normalen Angriffswerten.'
        };
        return hints[phase] || '';
    }

    /**
     * Render a single enemy card
     * @param {any} enemy - Enemy object
     * @param {string} phase - Current combat phase
     * @param {Function} onClick - Callback for click
     * @returns {HTMLElement} Enemy element
     */
    public renderEnemy(enemy: any, phase: string, onClick?: (enemy: any) => void): HTMLElement {
        const el = document.createElement('div');
        el.className = 'enemy-card';

        // Defensive check for game/combat reference
        const combat = this.ui?.game?.combat;
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
            el.addEventListener(
                'mouseenter',
                () => (el.style.boxShadow = phase === COMBAT_PHASES.RANGED ? '0 0 10px red' : '0 0 10px #3b82f6')
            );
            el.addEventListener(
                'mouseleave',
                () => (el.style.boxShadow = enemy.isBoss ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none')
            );
        }

        // Get Attack Info
        const attackValue = typeof enemy.getEffectiveAttack === 'function' ? enemy.getEffectiveAttack() : enemy.attack;
        const attackType = enemy.attackType || 'physical';
        const blockReq = typeof enemy.getBlockRequirement === 'function' ? enemy.getBlockRequirement() : attackValue;

        const typeIcons: Record<string, string> = {
            physical: '⚔️',
            fire: '🔥',
            ice: '❄️',
            cold_fire: '🔥❄️'
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

        const blockBadge =
            phase === COMBAT_PHASES.BLOCK && !isBlocked
                ? `<div class="block-badge">${t('combat.ui.needsBlock') || 'Benötigt'}: ${blockReq}</div>`
                : '';

        const phaseNorm = String(phase || '').toLowerCase();
        const traitChip = (key: string, icon: string, active: boolean, shortLabel: string) => {
            if (!active) return '';
            const phaseRelevant = this.isTraitRelevantInPhase(key, phaseNorm);
            return `<span class="trait-chip${phaseRelevant ? ' trait-chip--active' : ''}" data-tooltip-type="ability" data-tooltip-key="${key}" title="">
                <span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="${key}">${icon}</span>
                <span class="trait-chip-label">${shortLabel}</span>
            </span>`;
        };

        el.innerHTML = `
            <div class="enemy-icon" style="color: ${enemy.color}">
                ${isBlocked ? '🛡️' : enemy.icon}
            </div>
            <div class="enemy-details">
                <div class="enemy-name">
                    ${isBlocked ? `<span class="blocked-label">[${t('combat.ui.blocked') || 'GEBLOCKT'}]</span><br>` : ''}
                    ${enemy.name}
                </div>
                <div class="enemy-stats">
                    <div class="stat" title="${t('ui.labels.armor') || 'Rüstung'}">🛡️ ${enemy.armor}</div>
                    <div class="stat" title="${t('combat.ui.attack') || 'Angriff'}">
                        <span class="ability-icon" data-tooltip-type="ability" data-tooltip-key="${attackType}">${typeIcon}</span> <span>${attackValue}</span>
                    </div>
                </div>
                ${bossHealthHTML}
                <div class="enemy-traits">
                    ${traitChip('fortified', '🏰', !!enemy.fortified, t('combat.traits.fortifiedShort') || 'nur Belagerung')}
                    ${traitChip('swift', '💨', !!enemy.swift, t('combat.traits.swiftShort') || '2× Block')}
                    ${traitChip('poison', '🤢', !!enemy.poison, t('combat.traits.poisonShort') || 'Gift-Wunden')}
                    ${traitChip('vampiric', '🧛', !!enemy.vampiric, t('combat.traits.vampiricShort') || '+Rüstung')}
                    ${traitChip('brutal', '👹', !!enemy.brutal, t('combat.traits.brutalShort') || '2× Schaden')}
                    ${traitChip('paralyze', '⚡', !!enemy.paralyze, t('combat.traits.paralyzeShort') || 'Lähmung')}
                    ${traitChip('cumbersome', '🏋️', !!enemy.cumbersome, t('combat.traits.cumbersomeShort') || 'MP senkt Block')}
                    ${traitChip('assassin', '🗡️', !!enemy.assassin, t('combat.traits.assassinShort') || 'nur Held')}
                    ${traitChip('summoner', '🦇', !!enemy.summoner, t('combat.traits.summonerShort') || 'ruft herbei')}
                    ${traitChip('elusive', '👤', !!enemy.elusive, t('combat.traits.elusiveShort') || 'hohe Rüstung')}
                    ${traitChip('boss', '👑', !!enemy.isBoss, t('combat.traits.bossShort') || 'Boss')}
                </div>
            </div>
            ${blockBadge}
        `;

        // Attach tooltips to ability icons
        if (this.ui && this.ui.tooltipManager) {
            const abilityIcons = el.querySelectorAll('.ability-icon');
            abilityIcons.forEach((icon) => {
                this.ui.tooltipManager.attachToElement(icon as HTMLElement);
            });

            // Rich, whole-card enemy tooltip (hover + keyboard focus) so players
            // can inspect armor/attack/abilities without a separate click.
            const tm = this.ui.tooltipManager;
            el.setAttribute('tabindex', '0');
            const ariaName = enemy.isBoss ? `Boss ${enemy.name}` : enemy.name;
            el.setAttribute(
                'aria-label',
                `${ariaName}, Rüstung ${enemy.armor}, Angriff ${attackValue}` +
                    (enemy.fortified ? ', befestigt' : '') +
                    (enemy.poison ? ', Gift' : '')
            );

            const showCard = () => tm.showEnemyTooltip(el, enemy);
            const hideCard = () => tm.hideTooltip(100);
            el.addEventListener('mouseenter', showCard);
            el.addEventListener('mouseleave', hideCard);
            el.addEventListener('focus', showCard);
            el.addEventListener('blur', hideCard);
        }

        return el;
    }

    /**
     * Render units available for combat action
     * @param {any[]} units - List of unit objects
     * @param {string} phase - Current combat phase
     * @param {Function} onUnitActivate - Callback for unit activation
     */
    public renderUnitsInCombat(units: any[], phase: string, onUnitActivate: (unit: any) => void): void {
        const container = this.elements.combatUnits;
        if (!container) return;

        container.innerHTML = '';
        if (!units || units.length === 0) return;

        const title = document.createElement('h3');
        title.textContent = '🎖️ Deine Einheiten';
        container.appendChild(title);

        // Check for Assassin restriction (used in hint + unit cards)
        const combat = this.ui?.game?.combat;
        const hasAssassinRestriction =
            phase === COMBAT_PHASES.DAMAGE &&
            combat &&
            combat.unblockedEnemies &&
            combat.unblockedEnemies.some((e: any) => e.assassin && !e.damageAssigned);

        // Add Context Hint for Damage Phase
        if (phase === COMBAT_PHASES.DAMAGE) {
            const hint = document.createElement('div');
            hint.className = 'damage-assignment-hint';
            if (hasAssassinRestriction) {
                hint.innerHTML =
                    '<small>🗡️ <strong>Attentäter im Kampf!</strong> Schaden kann NICHT auf Einheiten zugewiesen werden. Der Held muss den Schaden nehmen.</small>';
                hint.style.color = '#ef4444';
                hint.style.fontWeight = 'bold';
            } else {
                hint.innerHTML = '<small>Klicke auf eine Einheit, um Schaden zuzuweisen (Schützt den Helden).</small>';
                hint.style.color = '#ef4444';
            }
            hint.style.marginBottom = '10px';
            container.appendChild(hint);
        }

        const grid = document.createElement('div');
        grid.className = 'combat-units-grid';

        units.forEach((unit) => {
            const isReady = typeof unit.isReady === 'function' ? unit.isReady() : true;
            let canAct = false;
            let actionText = '';

            // Logic for Phase Actions
            if (phase === COMBAT_PHASES.BLOCK) {
                const abilities = (typeof unit.getAbilities === 'function' ? unit.getAbilities() : []).filter(
                    (a: any) => a.type === ACTION_TYPES.BLOCK
                );
                canAct = isReady && abilities.length > 0;
                actionText = abilities
                    .map((a: any) => {
                        const elementIcon = this.getElementIcon(a.element);
                        return `${elementIcon} ${a.text}`;
                    })
                    .join(', ');
            } else if (phase === COMBAT_PHASES.ATTACK) {
                const abilities = (typeof unit.getAbilities === 'function' ? unit.getAbilities() : []).filter(
                    (a: any) => a.type === ACTION_TYPES.ATTACK
                );
                canAct = isReady && abilities.length > 0;
                actionText = abilities
                    .map((a: any) => {
                        const elementIcon = this.getElementIcon(a.element);
                        return `${elementIcon} ${a.text}`;
                    })
                    .join(', ');
            } else if (phase === COMBAT_PHASES.RANGED) {
                const abilities = (typeof unit.getAbilities === 'function' ? unit.getAbilities() : []).filter(
                    (a: any) => a.type === ACTION_TYPES.RANGED || a.type === ACTION_TYPES.SIEGE
                );
                canAct = isReady && abilities.length > 0;
                actionText = abilities
                    .map((a: any) => {
                        const elementIcon = this.getElementIcon(a.element);
                        return `${elementIcon} ${a.text}`;
                    })
                    .join(', ');
            } else if (phase === COMBAT_PHASES.DAMAGE) {
                if (hasAssassinRestriction) {
                    canAct = false;
                    actionText = '🗡️ Attentäter! Schaden muss vom Helden genommen werden';
                } else {
                    canAct = isReady;
                    actionText = 'Schaden nehmen (-1 Wunde)';
                }
            }

            const unitCard = document.createElement('div');
            // Visual style for damage assignment target: clearer indication
            const extraClass = phase === COMBAT_PHASES.DAMAGE && canAct ? 'damage-target' : '';
            unitCard.className = `unit-combat-card ${canAct ? '' : 'not-ready'} ${extraClass}`;

            // Helper to get ability text if not set above (fallback)
            if (!actionText && canAct && phase !== COMBAT_PHASES.DAMAGE) {
                actionText = 'Aktion verfügbar';
            } else if (!actionText) {
                actionText = 'Keine Aktion';
            }

            unitCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <span style="font-size: 1.2rem;">${unit.getIcon()}</span>
                        <strong>${unit.getName()}</strong>
                    </div>
                    <div style="font-size: 0.85rem; color: ${canAct ? '#10b981' : '#6b7280'};">
                        ${actionText}
                    </div>
                </div>
            `;

            if (phase === COMBAT_PHASES.DAMAGE && canAct) {
                // Style adjustment for damage phase
                unitCard.style.borderColor = '#ef4444';
                const strongEl = unitCard.querySelector('strong');
                if (strongEl) strongEl.style.color = '#ef4444';
            } else if (phase === COMBAT_PHASES.DAMAGE && hasAssassinRestriction) {
                // Attach tooltip explaining Assassin restriction for disabled units
                if (this.ui && this.ui.tooltipManager) {
                    const tooltipHTML = `
                        <div style="min-width: 220px;">
                            <div style="font-weight: bold; color: #ef4444; margin-bottom: 0.5rem;">🗡️ Attentäter-Effekt</div>
                            <div>Dieser Feind hat die Eigenschaft <strong>Attentäter</strong>.</div>
                            <div style="margin-top: 0.25rem;">Schaden <strong>kann nicht</strong> auf Einheiten zugewiesen werden.</div>
                            <div style="margin-top: 0.25rem; font-size: 0.85rem; color: #9ca3af;">Alle Wunden müssen vom Helden genommen werden.</div>
                        </div>
                    `;
                    this.ui.tooltipManager.attachToElement(unitCard as HTMLElement, tooltipHTML);
                }
            }

            if (canAct && onUnitActivate) {
                unitCard.addEventListener('click', () => {
                    onUnitActivate(unit);
                });

                // Hover Effects
                const hoverColor =
                    phase === COMBAT_PHASES.DAMAGE ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)';
                const hoverBorder =
                    phase === COMBAT_PHASES.DAMAGE ? 'rgba(239, 68, 68, 0.6)' : 'rgba(139, 92, 246, 0.6)';

                unitCard.addEventListener('mouseenter', () => {
                    unitCard.style.background = hoverColor;
                    unitCard.style.borderColor = hoverBorder;
                });
                unitCard.addEventListener('mouseleave', () => {
                    unitCard.style.background = phase === COMBAT_PHASES.DAMAGE ? 'none' : 'rgba(139, 92, 246, 0.1)';
                    unitCard.style.borderColor = phase === COMBAT_PHASES.DAMAGE ? '#ef4444' : 'rgba(139, 92, 246, 0.3)';
                });
            }

            grid.appendChild(unitCard);
        });

        // Attach tooltips to unit cards
        if (this.ui && this.ui.tooltipManager) {
            const unitCards = container.querySelectorAll('.unit-combat-card');
            unitCards.forEach((card, index) => {
                const unit = units[index];
                if (unit && typeof unit.getAbilities === 'function') {
                    const tooltipHTML = this.ui.tooltipManager.createUnitTooltipHTML(unit);
                    this.ui.tooltipManager.attachToElement(card as HTMLElement, tooltipHTML);
                }
            });
        }

        container.appendChild(grid);
    }

    // Helper method to get element icon
    private getElementIcon(element?: string): string {
        const icons: Record<string, string> = {
            fire: '🔥',
            ice: '❄️',
            cold_fire: '🔥❄️',
            physical: '⚔️',
            holy: '✨'
        };
        return icons[element || 'physical'] || '⚔️';
    }
}
