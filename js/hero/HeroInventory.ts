/**
 * HeroInventory - Manages hero's mana, crystals, and artifacts
 */
import { MANA_COLORS } from '../mana';
import { createDeck, SAMPLE_ARTIFACTS } from '../card';

export interface Crystals {
    red: number;
    blue: number;
    white: number;
    green: number;
    [key: string]: number;
}

export class HeroInventory {
    public crystals: Crystals;
    public tempMana: string[] = [];

    constructor() {
        this.crystals = {
            red: 0,
            blue: 0,
            white: 0,
            green: 0
        };
    }

    // ========== Crystal Management (max 3 per color) ==========

    public addCrystal(color: keyof Crystals): boolean {
        if (this.crystals[color] !== undefined && this.crystals[color] < 3) {
            this.crystals[color]++;
            return true;
        }
        return false;
    }

    public useCrystal(color: keyof Crystals): boolean {
        if (this.crystals[color] > 0) {
            this.crystals[color]--;
            return true;
        }
        return false;
    }

    public getCrystals(): Crystals {
        return { ...this.crystals };
    }

    // ========== Mana Management ==========

    public takeManaFromSource(color: string): boolean {
        if (!Object.values(MANA_COLORS).includes(color as any)) {
            return false;
        }
        this.tempMana.push(color);
        return true;
    }

    public hasMana(requiredColor: string, isNight: boolean = false): boolean {
        if (!requiredColor) return false;
        return this.tempMana.some(m =>
            m === requiredColor || (!isNight && m === (MANA_COLORS as any).GOLD)
        );
    }

    public canAffordMana(card: any, isNight: boolean = false): boolean {
        if (!card.manaCost || card.manaCost === 0) return true;
        return this.hasMana(card.color, isNight);
    }

    public spendMana(requiredColor: string, isNight: boolean = false): boolean {
        if (!requiredColor) return false;

        let index = this.tempMana.indexOf(requiredColor);

        // Gold wildcard (day only)
        if (index === -1 && !isNight) {
            index = this.tempMana.indexOf((MANA_COLORS as any).GOLD);
        }

        if (index !== -1) {
            this.tempMana.splice(index, 1);
            return true;
        }
        return false;
    }

    public clearTempMana(): void {
        this.tempMana = [];
    }

    public getManaInventory(): Record<string, number> {
        const inventory: Record<string, number> = {};
        this.tempMana.forEach(color => {
            inventory[color] = (inventory[color] || 0) + 1;
        });
        return inventory;
    }

    // ========== Artifacts ==========

    public awardRandomArtifact(discardPile: any[]): any {
        const randomArt = SAMPLE_ARTIFACTS[Math.floor(Math.random() * SAMPLE_ARTIFACTS.length)];
        const card = createDeck([randomArt])[0];
        discardPile.push(card);
        return card;
    }

    // ========== State Persistence ==========

    public getState(): { crystals: Crystals, tempMana: string[] } {
        return {
            crystals: { ...this.crystals },
            tempMana: [...this.tempMana]
        };
    }

    public loadState(state: any): void {
        if (!state) return;
        if (state.crystals) this.crystals = { ...state.crystals };
        if (state.tempMana) this.tempMana = [...state.tempMana];
    }

    public reset(): void {
        this.crystals = { red: 0, blue: 0, white: 0, green: 0 };
        this.tempMana = [];
    }
}
