// Enemy system for Mage Knight

import { ENEMY_TYPES, BOSS_PHASES, ENEMY_DEFINITIONS, BOSS_DEFINITIONS, EnemyDefinition } from './constants.js';
import { t } from './i18n/index.js';

export { ENEMY_TYPES, BOSS_PHASES, ENEMY_DEFINITIONS, BOSS_DEFINITIONS };

export interface Position {
    q: number;
    r: number;
}

export interface EnemyData {
    id?: string;
    type: string;
    name?: string;
    position?: Position | null;
    armor?: number;
    attack?: number;
    fame?: number;
    fortified?: boolean;
    swift?: boolean;
    brutal?: boolean;
    poison?: boolean;
    petrify?: boolean;
    elusive?: boolean;
    vampiric?: boolean;
    assassin?: boolean;
    cumbersome?: boolean;
    summoner?: boolean;
    summoned?: boolean;
    lowerArmor?: number;
    fireResist?: boolean;
    iceResist?: boolean;
    physicalResist?: boolean;
    icon?: string;
    color?: string;
    attackType?: string;
}

export interface EnemyState {
    id: string;
    type: string;
    name: string;
    position: Position | null;
    armor: number;
    attack: number;
    fame: number;
    icon: string;
    color: string;
    isBoss?: boolean;
}

export type AttackElement = 'physical' | 'fire' | 'ice' | 'cold_fire' | 'holy';

export class Enemy {
    id: string;
    type: string;
    name: string;
    position: Position | null;
    armor: number;
    attack: number;
    fame: number;
    fortified: boolean;
    swift: boolean;
    brutal: boolean;
    poison: boolean;
    petrify: boolean;
    elusive: boolean;
    vampiric: boolean;
    assassin: boolean;
    cumbersome: boolean;
    summoner: boolean;
    summoned: boolean;
    lowerArmor: number;
    armorBonus: number;
    fireResist: boolean;
    iceResist: boolean;
    physicalResist: boolean;
    icon: string;
    color: string;
    attackType: string;
    isBoss?: boolean;

    constructor(data: EnemyData) {
        this.id = data.id || `enemy_${Date.now()}`;
        this.type = data.type;
        this.name = data.name || (data.type ? t(`enemies.${data.type}`) : 'Enemy');
        this.position = data.position || null;

        // Combat stats
        this.armor = data.armor || 0;
        this.attack = data.attack || 0;
        this.fame = data.fame || 0;

        // Abilities
        this.fortified = data.fortified || false;
        this.swift = data.swift || false;
        this.brutal = data.brutal || false;
        this.poison = data.poison || false;
        this.petrify = data.petrify || false;
        this.elusive = data.elusive || false;
        this.vampiric = data.vampiric || false;
        this.assassin = data.assassin || false;
        this.cumbersome = data.cumbersome || false;
        this.summoner = data.summoner || false;
        this.summoned = data.summoned || false;

        this.lowerArmor = data.lowerArmor || Math.floor((data.armor || 1) / 2);
        this.armorBonus = 0;

        // Resistances
        this.fireResist = data.fireResist || false;
        this.iceResist = data.iceResist || false;
        this.physicalResist = data.physicalResist || false;

        // Visual
        this.icon = data.icon || '👹';
        this.color = data.color || '#ef4444';

        // Attack Type
        this.attackType = data.attackType || 'physical';
    }

    // Calculate damage multiplier based on attack element
    getResistanceMultiplier(attackElement: AttackElement): number {
        if (attackElement === 'fire' && this.fireResist) return 0.5;
        if (attackElement === 'ice' && this.iceResist) return 0.5;
        if (attackElement === 'physical' && this.physicalResist) return 0.5;
        return 1.0;
    }

    // Get effective armor (dynamic)
    getCurrentArmor(isBlocked = false, isAttackPhase = false): number {
        let base = this.armor;
        if (this.elusive && isAttackPhase && isBlocked) {
            base = this.lowerArmor;
        }
        return base + this.armorBonus;
    }

    // Get effective attack value (doubled if brutal)
    getEffectiveAttack(): number {
        return this.brutal ? this.attack * 2 : this.attack;
    }

    // Get effective block requirement (doubled if swift)
    getBlockRequirement(): number {
        let req = this.attack;
        if (this.swift) req *= 2;
        return req;
    }

    // Check if enemy is defeated
    isDefeated(attackValue?: number, isBlocked = false, isAttackPhase = false): boolean {
        if (attackValue !== undefined) {
            return attackValue >= this.getCurrentArmor(isBlocked, isAttackPhase);
        }
        return false;
    }

    // Gets state for persistence
    getState(): EnemyState {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            position: this.position ? { ...this.position } : null,
            armor: this.armor,
            attack: this.attack,
            fame: this.fame,
            icon: this.icon,
            color: this.color,
            isBoss: this.isBoss || false
        };
    }

    // Loads state from object
    loadState(state: Partial<EnemyState>): void {
        if (!state) return;
        this.position = state.position ? { ...state.position } : null;
    }

    // Clone enemy
    clone(): Enemy {
        return new Enemy({
            type: this.type,
            name: this.name,
            armor: this.armor,
            attack: this.attack,
            fame: this.fame,
            fortified: this.fortified,
            swift: this.swift,
            brutal: this.brutal,
            poison: this.poison,
            petrify: this.petrify,
            fireResist: this.fireResist,
            iceResist: this.iceResist,
            physicalResist: this.physicalResist,
            icon: this.icon,
            color: this.color
        });
    }
}

// ============ BOSS ENEMY ============

export interface BossPhase {
    threshold: number;
    name: string;
    triggered: boolean;
}

export interface PhaseTransition {
    phase: string;
    ability: string | null;
    message?: string;
}

export interface DamageResult {
    damage: number;
    previousHealth: number;
    currentHealth: number;
    healthPercent: number;
    transitions: PhaseTransition[];
    defeated: boolean;
}

export interface PhaseAbilityResult {
    type: string;
    message: string;
    enemyType?: string;
    count?: number;
    amount?: number;
}

export interface BossEnemyData extends EnemyData {
    maxHealth?: number;
    currentHealth?: number;
    phases?: BossPhase[];
    enrageThreshold?: number;
    enrageMultiplier?: number;
    phaseAbilities?: Record<number | string, string | null>;
    summonType?: string;
    summonCount?: number;
}

export interface BossEnemyState extends EnemyState {
    maxHealth: number;
    currentHealth: number;
    phase: number;
    summonType: string;
    summonCount: number;
}

export class BossEnemy extends Enemy {
    override isBoss: boolean = true;
    maxHealth: number;
    currentHealth: number;
    phases: BossPhase[];
    currentPhase: number | string;
    enraged: boolean;
    enrageThreshold: number;
    enrageMultiplier: number;
    phaseAbilities: Record<number | string, string | null>;
    summonType: string;
    summonCount: number;

    constructor(data: BossEnemyData) {
        super(data);

        this.isBoss = true;
        this.maxHealth = data.maxHealth || 30;
        this.currentHealth = data.currentHealth || this.maxHealth;
        this.phases = data.phases || [
            { threshold: 0.66, name: t('ui.phases.phase1') || 'Phase 1', triggered: false },
            { threshold: 0.33, name: t('ui.phases.phase2') || 'Phase 2', triggered: false },
            { threshold: 0, name: t('ui.phases.enraged') || 'Enraged', triggered: false }
        ];
        this.currentPhase = BOSS_PHASES.PHASE_1;
        this.enraged = false;
        this.enrageThreshold = data.enrageThreshold || 0.25;
        this.enrageMultiplier = data.enrageMultiplier || 1.5;
        this.phaseAbilities = data.phaseAbilities || {
            [BOSS_PHASES.PHASE_1]: null,
            [BOSS_PHASES.PHASE_2]: 'summon',
            [BOSS_PHASES.PHASE_3]: 'heal',
            [BOSS_PHASES.ENRAGED]: 'double_attack'
        };
        this.summonType = data.summonType || 'weakling';
        this.summonCount = data.summonCount || 2;
    }

    // Take damage and check phase transitions
    takeDamage(amount: number): DamageResult {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        const healthPercent = this.currentHealth / this.maxHealth;
        const transitions: PhaseTransition[] = [];

        for (const phase of this.phases) {
            if (!phase.triggered && healthPercent <= phase.threshold) {
                phase.triggered = true;
                transitions.push({
                    phase: phase.name,
                    ability: this.getPhaseAbility(phase.name)
                });
            }
        }

        if (!this.enraged && healthPercent <= this.enrageThreshold) {
            this.enraged = true;
            this.currentPhase = BOSS_PHASES.ENRAGED;
            transitions.push({
                phase: t('ui.phases.enraged') || 'Enraged',
                ability: 'enrage',
                message: t('combat.boss.enraged', { name: this.name })
            });
        }

        return {
            damage: amount,
            previousHealth,
            currentHealth: this.currentHealth,
            healthPercent,
            transitions,
            defeated: this.currentHealth <= 0
        };
    }

    // Get ability for phase
    getPhaseAbility(phaseName: string): string | null {
        if (this.phaseAbilities[phaseName]) {
            return this.phaseAbilities[phaseName];
        }
        if (phaseName === 'Phase 2') return this.phaseAbilities[BOSS_PHASES.PHASE_2];
        if (phaseName === 'Phase 3') return this.phaseAbilities[BOSS_PHASES.PHASE_3];
        if (phaseName === 'Enraged') return this.phaseAbilities[BOSS_PHASES.ENRAGED];
        return null;
    }

    // Get effective attack (with enrage modifier)
    override getEffectiveAttack(): number {
        let attack = super.getEffectiveAttack();
        if (this.enraged) {
            attack = Math.floor(attack * this.enrageMultiplier);
        }
        return attack;
    }

    // Check if boss is defeated (health-based)
    override isDefeated(_attackValue?: number): boolean {
        return this.currentHealth <= 0;
    }

    // Gets state for persistence
    override getState(): BossEnemyState {
        const state = super.getState();
        return {
            ...state,
            maxHealth: this.maxHealth,
            currentHealth: this.currentHealth,
            phase: this.currentPhase as number,
            summonType: this.summonType,
            summonCount: this.summonCount
        };
    }

    // Loads state from object
    override loadState(state: Partial<BossEnemyState>): void {
        super.loadState(state);
        if (state.currentHealth !== undefined) this.currentHealth = state.currentHealth;
        if (state.phase !== undefined) this.currentPhase = state.phase;
    }

    getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }

    getPhaseName(): string {
        if (this.enraged) return t('ui.phases.enraged') || 'Wütend';
        const healthPercent = this.getHealthPercent();
        if (healthPercent > 0.66) return t('ui.phases.phase1') || 'Phase 1';
        if (healthPercent > 0.33) return t('ui.phases.phase2') || 'Phase 2';
        return t('ui.phases.phase3') || 'Phase 3';
    }

    executePhaseAbility(abilityName: string): PhaseAbilityResult | null {
        switch (abilityName) {
            case 'summon':
                return {
                    type: 'summon',
                    enemyType: this.summonType,
                    count: this.summonCount,
                    message: t('combat.boss.summons', { name: this.name, count: this.summonCount, enemy: t(`enemies.${this.summonType}`) })
                };
            case 'heal': {
                const healAmount = Math.floor(this.maxHealth * 0.1);
                this.currentHealth = Math.min(this.maxHealth, this.currentHealth + healAmount);
                return {
                    type: 'heal',
                    amount: healAmount,
                    message: t('combat.boss.heals', { name: this.name, amount: healAmount })
                };
            }
            case 'enrage':
            case 'double_attack':
                return {
                    type: 'buff',
                    message: t('combat.boss.doubleAttack', { name: this.name })
                };
            default:
                return null;
        }
    }
}

// Create an enemy from a definition
export function createEnemy(enemyKey: string, position: Position | null = null): Enemy | null {
    const def = ENEMY_DEFINITIONS[enemyKey];
    if (!def) {
        console.error(`Unknown enemy type: ${enemyKey}`);
        return null;
    }

    return new Enemy({
        ...def,
        name: t(`enemies.${enemyKey}`) !== `enemies.${enemyKey}` ? t(`enemies.${enemyKey}`) : def.name,
        type: enemyKey,
        position
    });
}

// Create a list of enemies
export function createEnemies(enemyList: { type: string; position: Position }[]): (Enemy | null)[] {
    return enemyList.map(({ type, position }) => createEnemy(type, position));
}

// Create a boss from a definition
export function createBoss(bossKey: string, position: Position | null = null): BossEnemy | null {
    const def = BOSS_DEFINITIONS[bossKey];
    if (!def) {
        console.error(`Unknown boss type: ${bossKey}`);
        return null;
    }

    return new BossEnemy({
        ...def,
        name: t(`enemies.${bossKey}`) !== `enemies.${bossKey}` ? t(`enemies.${bossKey}`) : def.name,
        type: bossKey,
        position
    });
}

export default Enemy;
