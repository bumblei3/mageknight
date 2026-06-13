/**
 * Event data type definitions for Mage Knight
 * Provides proper typing for event bus data payloads
 */

import { Enemy } from './enemy';
import { Hero } from './hero';

/**
 * Generic event data
 */
export interface EventData {
    message?: string;
    type?: string;
    details?: unknown;
    timestamp?: number;
}

/**
 * Toast event data
 */
export interface ToastData {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Notification event data
 */
export interface NotificationData {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Hero move step event data
 */
export interface HeroMoveStepData {
    from: { q: number; r: number };
    to: { q: number; r: number };
}

/**
 * Combat block event data
 */
export interface CombatBlockData {
    enemyPos: { q: number; r: number };
    blocked: boolean;
}

/**
 * Combat damage event data
 */
export interface CombatDamageData {
    targetPos: { q: number; r: number };
    amount: number;
    targetType: 'hero' | 'enemy';
}

/**
 * Combat start event data
 */
export interface CombatStartedData {
    enemies: Enemy[];
}

/**
 * Combat end event data
 */
export interface CombatEndedData {
    victory: boolean;
    enemy: Enemy | null;
}

/**
 * Card played event data
 */
export interface CardPlayedData {
    combat: boolean;
}

/**
 * Hero stats updated event data
 */
export interface HeroStatsUpdatedData {
    // Stats object
    [key: string]: unknown;
}

/**
 * Mana source updated event data
 */
export interface ManaSourceUpdatedData {
    // Mana source data
    [key: string]: unknown;
}

/**
 * Turn ended event data
 */
export interface TurnEndedData {
    // Turn data
    [key: string]: unknown;
}

/**
 * Hero moved event data
 */
export interface HeroMovedData {
    position: { q: number; r: number };
}

/**
 * Achievement unlocked event data
 */
export interface AchievementUnlockedData {
    achievement: {
        id: string;
        name: string;
        description: string;
        category: string;
        icon: string;
        reward: Record<string, unknown>;
    };
}

/**
 * Notification show event data
 */
export interface NotificationShowData {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Time changed event data
 */
export interface TimeChangedData {
    timeOfDay: 'day' | 'night';
    round: number;
}

/**
 * Card played event data
 */
export interface CardPlayedDetailData {
    card: import('./card').Card;
    effect: import('./card').CardEffect;
    combat?: boolean;
}

/**
 * Turn started event data
 */
export interface TurnStartedData {
    round: number;
    timeOfDay: 'day' | 'night';
}

/**
 * Visual feedback data
 */
export interface VisualEffectData {
    x: number;
    y: number;
    color?: string;
    amount?: number;
}

/**
 * Particle system event data
 */
export interface ParticleEventData {
    x: number;
    y: number;
    type: string;
    color?: string;
}

/**
 * Type guard to check if data is a specific event type
 */
export function isCombatDamageData(data: unknown): data is CombatDamageData {
    return typeof data === 'object' && data !== null && 'amount' in data && 'targetType' in data;
}

export function isCombatBlockData(data: unknown): data is CombatBlockData {
    return typeof data === 'object' && data !== null && 'enemyPos' in data && 'blocked' in data;
}

export function isHeroMoveStepData(data: unknown): data is HeroMoveStepData {
    return typeof data === 'object' && data !== null && 'from' in data && 'to' in data;
}

// Re-export for convenience
export type EventCallback = (data?: unknown) => void;