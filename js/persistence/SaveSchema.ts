/**
 * Save/Load Schema Definitions with Zod
 * Provides validation, type safety, and migration for game saves.
 */
import { z } from 'zod';

export const CURRENT_SAVE_VERSION = 1;

// ============================================
// Shared Types
// ============================================

const PositionSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
});

// ============================================
// Hero State
// ============================================

const HeroCrystalsSchema = z.record(z.string(), z.number().int().min(0));

const HeroSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const HeroStateSchema = z.object({
  name: z.string(),
  level: z.number().int().min(1).max(10),
  fame: z.number().int().min(0),
  reputation: z.number().int().min(0).default(0),
  armor: z.number().int().min(0).default(0),
  movementPoints: z.number().int().min(0).default(0),
  attackPoints: z.number().int().min(0).default(0),
  blockPoints: z.number().int().min(0).default(0),
  influencePoints: z.number().int().min(0).default(0),
  healingPoints: z.number().int().min(0).default(0),
  handLimit: z.number().int().min(0).default(5),
  commandLimit: z.number().int().min(0).default(0),
  position: PositionSchema,
  deck: z.array(z.string()).default([]),
  hand: z.array(z.string()).default([]),
  discard: z.array(z.string()).default([]),
  wounds: z.array(z.string()).default([]),
  crystals: HeroCrystalsSchema.default({}),
  skills: z.array(HeroSkillSchema).default([]),
  tempMana: z.array(z.string()).default([]),
  units: z.array(z.any()).default([]), // Unit state validated separately
});

export type HeroState = z.infer<typeof HeroStateSchema>;

// ============================================
// Enemy State
// ============================================

const EnemyStateSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  position: PositionSchema.nullable(),
  armor: z.number().int().min(0),
  attack: z.number().int().min(0),
  fame: z.number().int().min(0),
  icon: z.string().default(''),
  color: z.string().default('#888'),
  isBoss: z.boolean().default(false),
  // Optional traits
  fortified: z.boolean().optional(),
  swift: z.boolean().optional(),
  brutal: z.boolean().optional(),
  poison: z.boolean().optional(),
  petrify: z.boolean().optional(),
  elusive: z.boolean().optional(),
  defensive: z.boolean().optional(),
  vampiric: z.boolean().optional(),
  assassin: z.boolean().optional(),
  cumbersome: z.boolean().optional(),
  summoner: z.boolean().optional(),
  summoned: z.boolean().optional(),
  fireResist: z.boolean().optional(),
  iceResist: z.boolean().optional(),
  physicalResist: z.boolean().optional(),
  arcaneImmune: z.boolean().optional(),
});

export type EnemyState = z.infer<typeof EnemyStateSchema>;

// ============================================
// Combat State (simplified for save)
// ============================================

const CombatStateSchema = z.object({
  enemies: z.array(z.any()), // Complex, keep flexible
  phase: z.string().default('not_in_combat'),
  round: z.number().int().min(0).default(0),
  heroWounds: z.number().int().min(0).default(0),
}).nullable();

export type CombatState = z.infer<typeof CombatStateSchema>;

// ============================================
// Hex Grid State
// ============================================

const HexDataSchema = z.object({
  terrain: z.string(),
  revealed: z.boolean().default(false),
  site: z.any().nullable().optional(),
  enemies: z.array(z.any()).default([]),
});

const HexGridStateSchema = z.object({
  hexes: z.record(z.string(), HexDataSchema).default({}),
  hexSize: z.number().int().positive().default(40),
}).nullable();

export type HexGridState = z.infer<typeof HexGridStateSchema>;

// ============================================
// Time State
// ============================================

const TimeStateSchema = z.object({
  round: z.number().int().min(1).default(1),
  timeOfDay: z.enum(['day', 'night']).default('day'),
});

export type TimeState = z.infer<typeof TimeStateSchema>;

// ============================================
// Statistics State
// ============================================

const StatisticsStateSchema = z.record(z.string(), z.number());

// ============================================
// Achievements State
// ============================================

const AchievementsStateSchema = z.object({
  unlocked: z.array(z.string()).default([]),
});

// ============================================
// Turn State (simplified)
// ============================================

const TurnStateSchema = z.object({
  currentPlayer: z.string().optional(),
  actionsRemaining: z.number().int().optional(),
}).nullable();

// ============================================
// Full Save State Schema
// ============================================

export const SaveStateSchema = z.object({
  version: z.literal(CURRENT_SAVE_VERSION),
  hero: HeroStateSchema.nullable(),
  enemies: z.array(EnemyStateSchema).default([]),
  combat: CombatStateSchema,
  hexGrid: HexGridStateSchema,
  time: TimeStateSchema.default({ round: 1, timeOfDay: 'day' }),
  statistics: StatisticsStateSchema.default({}),
  achievements: AchievementsStateSchema.default({ unlocked: [] }),
  turn: TurnStateSchema,
  timestamp: z.number().int().positive(),
}).passthrough();

export type SaveState = z.infer<typeof SaveStateSchema>;

// ============================================
// Migration Functions
// ============================================

/**
 * Migrates a raw save object from any version to current version.
 * Throws on unrecoverable corruption.
 */
export function migrateSave(raw: unknown): SaveState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid save data: not an object');
  }

  const versioned = raw as Record<string, unknown>;
  const version = (versioned.version as number) ?? 0;

  // Already current version - just validate
  if (version === CURRENT_SAVE_VERSION) {
    return SaveStateSchema.parse(raw);
  }

  // v0 (pre-versioning) -> v1
  if (version === 0) {
    return migrateV0toV1(versioned);
  }

  throw new Error(`Unsupported save version: ${version}. Current: ${CURRENT_SAVE_VERSION}`);
}

/**
 * Migration from v0 (no version field) to v1.
 * Adds defaults for missing fields and validates structure.
 */
function migrateV0toV1(v0Save: Record<string, unknown>): SaveState {
  const migrated: Record<string, unknown> = {
    version: CURRENT_SAVE_VERSION,
    timestamp: v0Save.timestamp ?? Date.now(),
  };

  // Hero - ensure all required fields exist with defaults
  if (v0Save.hero && typeof v0Save.hero === 'object') {
    const hero = v0Save.hero as Record<string, unknown>;
    migrated.hero = {
      name: hero.name ?? 'Unknown Hero',
      level: Math.max(1, Math.min(10, (hero.level as number) ?? 1)),
      fame: Math.max(0, (hero.fame as number) ?? 0),
      reputation: Math.max(0, (hero.reputation as number) ?? 0),
      armor: Math.max(0, (hero.armor as number) ?? 0),
      movementPoints: Math.max(0, (hero.movementPoints as number) ?? 0),
      attackPoints: Math.max(0, (hero.attackPoints as number) ?? 0),
      blockPoints: Math.max(0, (hero.blockPoints as number) ?? 0),
      influencePoints: Math.max(0, (hero.influencePoints as number) ?? 0),
      healingPoints: Math.max(0, (hero.healingPoints as number) ?? 0),
      handLimit: Math.max(0, (hero.handLimit as number) ?? 5),
      commandLimit: Math.max(0, (hero.commandLimit as number) ?? 0),
      position: hero.position ?? { q: 0, r: 0 },
      deck: Array.isArray(hero.deck) ? hero.deck : [],
      hand: Array.isArray(hero.hand) ? hero.hand : [],
      discard: Array.isArray(hero.discard) ? hero.discard : [],
      wounds: Array.isArray(hero.wounds) ? hero.wounds : [],
      crystals: hero.crystals ?? {},
      skills: Array.isArray(hero.skills) ? hero.skills : [],
      tempMana: Array.isArray(hero.tempMana) ? hero.tempMana : [],
      units: Array.isArray(hero.units) ? hero.units : [],
    };
  } else {
    migrated.hero = null;
  }

  // Enemies - validate each
  if (Array.isArray(v0Save.enemies)) {
    migrated.enemies = v0Save.enemies.map((e: unknown) => {
      if (!e || typeof e !== 'object') return null;
      const enemy = e as Record<string, unknown>;
      return {
        id: enemy.id ?? `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: enemy.type ?? 'unknown',
        name: enemy.name ?? 'Unknown Enemy',
        position: enemy.position ?? null,
        armor: Math.max(0, (enemy.armor as number) ?? 0),
        attack: Math.max(0, (enemy.attack as number) ?? 0),
        fame: Math.max(0, (enemy.fame as number) ?? 0),
        icon: enemy.icon ?? '',
        color: enemy.color ?? '#888',
        isBoss: enemy.isBoss ?? false,
        fortified: enemy.fortified,
        swift: enemy.swift,
        brutal: enemy.brutal,
        poison: enemy.poison,
        petrify: enemy.petrify,
        elusive: enemy.elusive,
        defensive: enemy.defensive,
        vampiric: enemy.vampiric,
        assassin: enemy.assassin,
        cumbersome: enemy.cumbersome,
        summoner: enemy.summoner,
        summoned: enemy.summoned,
        fireResist: enemy.fireResist,
        iceResist: enemy.iceResist,
        physicalResist: enemy.physicalResist,
        arcaneImmune: enemy.arcaneImmune,
      };
    }).filter(Boolean);
  } else {
    migrated.enemies = [];
  }

  // Combat - keep as-is or null
  migrated.combat = v0Save.combat ?? null;

  // Hex Grid
  if (v0Save.hexGrid && typeof v0Save.hexGrid === 'object') {
    const hg = v0Save.hexGrid as Record<string, unknown>;
    migrated.hexGrid = {
      hexes: hg.hexes ?? {},
      hexSize: Math.max(1, (hg.hexSize as number) ?? 40),
    };
  } else {
    migrated.hexGrid = null;
  }

  // Time
  if (v0Save.time && typeof v0Save.time === 'object') {
    const time = v0Save.time as Record<string, unknown>;
    migrated.time = {
      round: Math.max(1, (time.round as number) ?? 1),
      timeOfDay: time.timeOfDay === 'night' ? 'night' : 'day',
    };
  } else {
    migrated.time = { round: 1, timeOfDay: 'day' };
  }

  // Statistics
  migrated.statistics = (v0Save.statistics as Record<string, number>) ?? {};

  // Achievements
  if (v0Save.achievements && typeof v0Save.achievements === 'object') {
    const ach = v0Save.achievements as Record<string, unknown>;
    migrated.achievements = {
      unlocked: Array.isArray(ach.unlocked) ? ach.unlocked : [],
    };
  } else {
    migrated.achievements = { unlocked: [] };
  }

  // Turn
  migrated.turn = v0Save.turn ?? null;

  // Final validation
  return SaveStateSchema.parse(migrated);
}

/**
 * Validates a save without migration (for testing save integrity)
 */
export function validateSave(raw: unknown): { success: true; data: SaveState } | { success: false; error: z.ZodError } {
  const result = SaveStateSchema.safeParse(raw);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}