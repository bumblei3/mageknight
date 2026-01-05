
import { t } from '../i18n/index.js';

export class CombatCombos {
    // Detects and applies bonuses for card combinations
    static detectCombo(playedCards) {
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
    static isMonoColor(colors) {
        if (colors.length === 0) return false;
        const firstColor = colors[0];
        return colors.every(c => c === firstColor);
    }

    // Check if cards contain all 4 colors
    static hasAllColors(colors) {
        const uniqueColors = new Set(colors.filter(c => c !== null));
        return uniqueColors.size >= 4;
    }

    // Check if all elements are the same
    static isMonoElement(elements) {
        if (elements.length === 0) return false;
        const firstElement = elements[0];
        return elements.every(e => e === firstElement);
    }

    // Get color name for display
    static getColorName(color) {
        return t(`cards.colors.${color}`) || color;
    }

    // Calculate critical hit chance
    static calculateCriticalHit(baseAttack, critChance = 0.15) {
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
    static applyComboBonus(baseValue, combo) {
        if (!combo) return baseValue;
        return Math.floor(baseValue * combo.multiplier);
    }
}
