
import { t } from '../i18n/index';
import { Card } from '../card';

export interface ComboResult {
    type: string;
    color?: string | null;
    element?: string;
    multiplier: number;
    message: string;
}

export interface CriticalHitResult {
    isCrit: boolean;
    damage: number;
    multiplier: number;
    message?: string;
}

export class CombatCombos {
    // Detects and applies bonuses for card combinations
    static detectCombo(playedCards: Card[]): ComboResult | null {
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
            // Safe alignment since isMonoColor guarantees at least one color if not empty
            const color = colors[0];
            return {
                type: 'mono_color',
                color: color,
                multiplier: multiplier,
                message: `${this.getColorName(color!).toUpperCase()} COMBO! x${multiplier.toFixed(2)} Bonus!`
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
        const elements = validCards
            .map(c => (c.basicEffect as any)?.element)
            .filter(e => e) as string[];

        if (elements.length >= 3 && this.isMonoElement(elements)) {
            const element = elements[0];
            return {
                type: 'element_synergy',
                element: element,
                multiplier: 1.5,
                message: `${element.toUpperCase()} SYNERGY! +50% Elementarschaden!`
            };
        }

        return null;
    }

    // Check if all cards are the same color
    static isMonoColor(colors: (string | null)[]): boolean {
        if (colors.length === 0) return false;
        const firstColor = colors[0];
        // Ensure firstColor is not null for valid combo checks, if relevant
        // But logic allows nulls, though usually colors are non-null for valid cards
        return colors.every(c => c === firstColor);
    }

    // Check if cards contain all 4 colors
    static hasAllColors(colors: (string | null)[]): boolean {
        const uniqueColors = new Set(colors.filter(c => c !== null));
        return uniqueColors.size >= 4;
    }

    // Check if all elements are the same
    static isMonoElement(elements: string[]): boolean {
        if (elements.length === 0) return false;
        const firstElement = elements[0];
        return elements.every(e => e === firstElement);
    }

    // Get color name for display
    static getColorName(color: string): string {
        return t(`cards.colors.${color}`) || color;
    }

    // Calculate critical hit chance
    static calculateCriticalHit(baseAttack: number, critChance: number = 0.15): CriticalHitResult {
        if (Math.random() < critChance) {
            return {
                isCrit: true,
                damage: Math.floor(baseAttack * 1.5),
                multiplier: 1.5,
                message: t('combat.critHit')
            };
        }
        return {
            isCrit: false,
            damage: baseAttack,
            multiplier: 1.0
        };
    }

    // Apply combo bonus to attack value
    static applyComboBonus(baseValue: number, combo: ComboResult | null): number {
        if (!combo) return baseValue;
        return Math.floor(baseValue * combo.multiplier);
    }
}
