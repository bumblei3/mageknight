// Combat system for Mage Knight (simplified)

export const COMBAT_PHASE = {
    NOT_IN_COMBAT: 'not_in_combat',
    BLOCK: 'block',
    DAMAGE: 'damage',
    ATTACK: 'attack',
    COMPLETE: 'complete'
};

export class Combat {
    constructor(hero, enemies) {
        this.hero = hero;
        this.enemies = Array.isArray(enemies) ? enemies : [enemies];
        this.phase = COMBAT_PHASE.NOT_IN_COMBAT;
        this.defeatedEnemies = [];
        this.blockedEnemies = new Set();
        this.totalDamage = 0;
        this.woundsReceived = 0;

        // Unit contribution tracking
        this.unitAttackPoints = 0;
        this.unitBlockPoints = 0;
        this.activatedUnits = new Set();
    }

    // Start combat
    start() {
        this.phase = COMBAT_PHASE.BLOCK;
        return {
            phase: this.phase,
            enemies: this.enemies,
            message: `Kampf begonnen gegen ${this.enemies.length} Feinde!`
        };
    }

    // Block phase - player plays blocks against enemy attacks
    blockPhase() {
        if (this.phase !== COMBAT_PHASE.BLOCK) {
            return { error: 'Nicht in der Block-Phase' };
        }

        // Calculate total enemy attack (unblocked enemies only)
        this.totalDamage = 0;

        this.enemies.forEach(enemy => {
            if (!this.blockedEnemies.has(enemy.id)) {
                this.totalDamage += enemy.getEffectiveAttack();
            }
        });

        return {
            totalDamage: this.totalDamage,
            blockedEnemies: Array.from(this.blockedEnemies),
            message: `Gesamtschaden: ${this.totalDamage}`
        };
    }

    // Attempt to block an enemy (includes unit contributions)
    blockEnemy(enemy, blockValue) {
        if (this.phase !== COMBAT_PHASE.BLOCK) {
            return { success: false, error: 'Nicht in der Block-Phase' };
        }

        const blockRequired = enemy.getBlockRequirement();
        const totalBlock = blockValue + this.unitBlockPoints;

        if (totalBlock >= blockRequired) {
            this.blockedEnemies.add(enemy.id);
            return {
                success: true,
                blocked: true,
                totalBlock: totalBlock,
                unitContribution: this.unitBlockPoints,
                message: `${enemy.name} erfolgreich geblockt! ${enemy.swift ? '(Flink: Doppelter Block nötig)' : ''}`
            };
        }

        return {
            success: true,
            blocked: false,
            totalBlock: totalBlock,
            message: `Block zu schwach (${totalBlock} vs ${blockRequired})`
        };
    }

    // End block phase and move to damage phase
    endBlockPhase() {
        if (this.phase !== COMBAT_PHASE.BLOCK) {
            return { error: 'Nicht in der Block-Phase' };
        }

        this.phase = COMBAT_PHASE.DAMAGE;
        return this.damagePhase();
    }

    // Damage phase - calculate and assign damage
    damagePhase() {
        if (this.phase !== COMBAT_PHASE.DAMAGE) {
            return { error: 'Nicht in der Schadens-Phase' };
        }

        // Recalculate damage from unblocked enemies
        this.totalDamage = 0;
        const unblockedEnemies = [];

        this.enemies.forEach(enemy => {
            if (!this.blockedEnemies.has(enemy.id)) {
                this.totalDamage += enemy.getEffectiveAttack();
                unblockedEnemies.push(enemy);
            }
        });

        // Calculate wounds (damage / hero armor, rounded up)
        this.woundsReceived = Math.ceil(this.totalDamage / this.hero.armor);

        // Apply wounds to hero
        for (let i = 0; i < this.woundsReceived; i++) {
            this.hero.takeWound();
        }

        this.phase = COMBAT_PHASE.ATTACK;

        return {
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived,
            unblockedEnemies,
            message: `${this.woundsReceived} Verletzungen erhalten!`,
            nextPhase: COMBAT_PHASE.ATTACK
        };
    }

    // Attack phase - player attacks enemies
    attackPhase() {
        if (this.phase !== COMBAT_PHASE.ATTACK) {
            return { error: 'Nicht in der Angriffs-Phase' };
        }

        return {
            enemies: this.enemies,
            defeatedEnemies: this.defeatedEnemies,
            message: 'Greife Feinde an!'
        };
    }

    // Activate a unit to contribute to combat
    activateUnit(unit) {
        if (!unit.isReady()) {
            return { success: false, message: 'Einheit nicht bereit' };
        }

        if (this.activatedUnits.has(unit.type)) {
            return { success: false, message: 'Einheit bereits aktiviert' };
        }

        // Activate the unit
        unit.activate();
        this.activatedUnits.add(unit.type);

        // Apply unit abilities based on phase
        const abilities = unit.getAbilities();
        let applied = [];

        abilities.forEach(ability => {
            if (this.phase === COMBAT_PHASE.BLOCK && ability.type === 'block') {
                this.unitBlockPoints += ability.value;
                applied.push(`+${ability.value} Block`);
            } else if (this.phase === COMBAT_PHASE.ATTACK && ability.type === 'attack') {
                this.unitAttackPoints += ability.value;
                applied.push(`+${ability.value} Angriff`);
            }
        });

        return {
            success: true,
            unit: unit,
            applied: applied.join(', '),
            message: `${unit.getName()} aktiviert: ${applied.join(', ')}`
        };
    }

    // Attempt to defeat enemies with attack (includes unit contributions)
    attackEnemies(attackValue, attackElement = 'physical', targetEnemies = null) {
        if (this.phase !== COMBAT_PHASE.ATTACK) {
            return { error: 'Nicht in der Angriffs-Phase' };
        }

        const targets = targetEnemies || this.enemies;

        // Calculate effective armor based on resistances
        const totalArmor = targets.reduce((sum, enemy) => {
            const multiplier = enemy.getResistanceMultiplier(attackElement);
            // If resistant, armor is effectively doubled (or damage halved, same result for threshold)
            // Mage Knight rules: Resistance halves damage. 
            // Here we compare Total Attack vs Armor. 
            // So if resistant, we need 2x Attack to kill.
            // Let's implement it as: Effective Armor = Armor / Multiplier
            // e.g. Multiplier 0.5 -> Effective Armor = Armor * 2
            return sum + (enemy.armor / multiplier);
        }, 0);

        const totalAttack = attackValue + this.unitAttackPoints;

        if (totalAttack >= totalArmor) {
            // Defeat all targeted enemies
            targets.forEach(enemy => {
                this.defeatedEnemies.push(enemy);
                this.hero.gainFame(enemy.fame);
            });

            // Remove defeated enemies from active list
            this.enemies = this.enemies.filter(e => !targets.includes(e));

            return {
                success: true,
                defeated: targets,
                fameGained: targets.reduce((sum, e) => sum + e.fame, 0),
                totalAttack: totalAttack,
                unitContribution: this.unitAttackPoints,
                message: `${targets.length} Feinde besiegt! (Angriff: ${totalAttack})`
            };
        }

        return {
            success: false,
            totalAttack: totalAttack,
            message: `Angriff zu schwach (${totalAttack} vs ${totalArmor} Effektive Rüstung)`
        };
    }

    // Combo System - detects and applies bonuses for card combinations
    detectCombo(playedCards) {
        if (!playedCards || playedCards.length < 2) {
            return null;
        }

        // Filter out wound cards
        const validCards = playedCards.filter(c => !c.isWound());
        if (validCards.length < 2) return null;

        const colors = validCards.map(c => c.color);

        // Check for Mono-Color Combo (3+ same color)
        if (this.isMonoColor(colors) && colors.length >= 3) {
            const multiplier = 1 + (colors.length * 0.15); // 15% per card
            return {
                type: 'mono_color',
                color: colors[0],
                multiplier: multiplier,
                message: `${this.getColorName(colors[0]).toUpperCase()} COMBO! x${multiplier.toFixed(2)} Bonus!`
            };
        }

        // Check for Rainbow Combo (all 4 colors)
        if (this.hasAllColors(colors)) {
            return {
                type: 'rainbow',
                multiplier: 2.0,
                message: '🌈 RAINBOW COMBO! Effekt verdoppelt!'
            };
        }

        // Check for Element Synergy (3+ cards with same element)
        const elements = validCards.map(c => c.basicEffect?.element).filter(e => e);
        if (elements.length >= 3 && this.isMonoElement(elements)) {
            return {
                type: 'element_synergy',
                element: elements[0],
                multiplier: 1.5,
                message: `${elements[0].toUpperCase()} SYNERGY! +50% Elementarschaden!`
            };
        }

        return null;
    }

    // Check if all cards are the same color
    isMonoColor(colors) {
        if (colors.length === 0) return false;
        const firstColor = colors[0];
        return colors.every(c => c === firstColor);
    }

    // Check if cards contain all 4 colors
    hasAllColors(colors) {
        const uniqueColors = new Set(colors.filter(c => c !== null));
        return uniqueColors.size >= 4;
    }

    // Check if all elements are the same
    isMonoElement(elements) {
        if (elements.length === 0) return false;
        const firstElement = elements[0];
        return elements.every(e => e === firstElement);
    }

    // Get color name for display
    getColorName(color) {
        const names = {
            'red': 'Rot',
            'blue': 'Blau',
            'green': 'Grün',
            'white': 'Weiß'
        };
        return names[color] || color;
    }

    // Calculate critical hit chance
    calculateCriticalHit(baseAttack, critChance = 0.15) {
        if (Math.random() < critChance) {
            return {
                isCrit: true,
                damage: Math.floor(baseAttack * 1.5),
                multiplier: 1.5,
                message: '💥 KRITISCHER TREFFER!'
            };
        }
        return {
            isCrit: false,
            damage: baseAttack,
            multiplier: 1.0
        };
    }

    // Apply combo bonus to attack value
    applyComboBonus(baseValue, combo) {
        if (!combo) return baseValue;
        return Math.floor(baseValue * combo.multiplier);
    }

    // End combat
    endCombat() {

        this.phase = COMBAT_PHASE.COMPLETE;

        const allDefeated = this.enemies.length === 0;
        const result = {
            victory: allDefeated,
            defeatedEnemies: this.defeatedEnemies,
            remainingEnemies: this.enemies,
            woundsReceived: this.woundsReceived,
            fameGained: this.defeatedEnemies.reduce((sum, e) => sum + e.fame, 0),
            message: allDefeated ? 'Sieg!' : 'Kampf beendet.'
        };

        return result;
    }

    // Check if combat is complete
    isComplete() {
        return this.phase === COMBAT_PHASE.COMPLETE;
    }

    // Get current combat state
    getState() {
        return {
            phase: this.phase,
            enemies: this.enemies,
            defeatedEnemies: this.defeatedEnemies,
            blockedEnemies: Array.from(this.blockedEnemies),
            totalDamage: this.totalDamage,
            woundsReceived: this.woundsReceived
        };
    }
}

export default Combat;
