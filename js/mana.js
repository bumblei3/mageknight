// Mana system for Mage Knight

export const MANA_COLORS = {
    RED: 'red',
    BLUE: 'blue',
    WHITE: 'white',
    GREEN: 'green',
    GOLD: 'gold',
    BLACK: 'black'
};

export class ManaSource {
    constructor(playerCount = 1) {
        this.playerCount = playerCount;
        this.dice = [];
        this.usedDice = new Set();
        this.initialize();
    }

    // Initialize mana source with dice
    initialize() {
        const diceCount = this.playerCount + 2; // Player count + 2
        this.dice = [];
        this.usedDice.clear();

        // Roll all dice
        for (let i = 0; i < diceCount; i++) {
            this.dice.push(this.rollDie());
        }

        // Ensure at least half are basic colors (not gold/black)
        this.ensureBasicColors();
    }

    // Roll a single die
    rollDie() {
        const colors = [
            MANA_COLORS.RED,
            MANA_COLORS.BLUE,
            MANA_COLORS.WHITE,
            MANA_COLORS.GREEN,
            MANA_COLORS.GOLD,
            MANA_COLORS.BLACK
        ];

        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Ensure at least half of dice show basic colors
    ensureBasicColors() {
        const basicColors = [MANA_COLORS.RED, MANA_COLORS.BLUE, MANA_COLORS.WHITE, MANA_COLORS.GREEN];
        const basicIndices = [];
        const nonBasicIndices = [];

        this.dice.forEach((color, idx) => {
            if (basicColors.includes(color)) {
                basicIndices.push(idx);
            } else {
                nonBasicIndices.push(idx);
            }
        });

        const requiredBasic = Math.ceil(this.dice.length / 2);
        let currentBasicCount = basicIndices.length;

        if (currentBasicCount < requiredBasic) {
            // Shuffle non-basic indices to pick randomly
            for (let i = nonBasicIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nonBasicIndices[i], nonBasicIndices[j]] = [nonBasicIndices[j], nonBasicIndices[i]];
            }

            // Replace only as many as needed
            while (currentBasicCount < requiredBasic && nonBasicIndices.length > 0) {
                const idx = nonBasicIndices.pop();
                this.dice[idx] = basicColors[Math.floor(Math.random() * basicColors.length)];
                currentBasicCount++;
            }
        }
    }

    // Take a die from the source
    takeDie(index, isNight = false) {
        if (this.isDieAvailable(index, isNight)) {
            this.usedDice.add(index);
            return this.dice[index];
        }
        return null;
    }

    // Check if a die is available
    isDieAvailable(index, isNight = false) {
        if (index < 0 || index >= this.dice.length || this.usedDice.has(index)) {
            return false;
        }

        const color = this.dice[index];
        // Gold is depleted at night
        if (isNight && color === MANA_COLORS.GOLD) return false;
        // Black is depleted during day
        if (!isNight && color === MANA_COLORS.BLACK) return false;

        return true;
    }

    // Return dice to source and re-roll
    returnDice() {
        // Re-roll all used dice
        this.usedDice.forEach(index => {
            this.dice[index] = this.rollDie();
        });

        this.usedDice.clear();
        this.ensureBasicColors();
    }

    // Get available dice
    getAvailableDice(isNight = false) {
        return this.dice.map((color, index) => ({
            index,
            color,
            available: this.isDieAvailable(index, isNight)
        }));
    }

    // Get dice by color
    getDiceByColor(color) {
        return this.dice
            .map((c, index) => ({ color: c, index }))
            .filter(d => d.color === color && !this.usedDice.has(d.index));
    }

    // Check if color is available
    hasColor(color) {
        return this.getDiceByColor(color).length > 0;
    }
}

// Crystal storage for players
export class CrystalStorage {
    constructor() {
        this.crystals = {
            [MANA_COLORS.RED]: 0,
            [MANA_COLORS.BLUE]: 0,
            [MANA_COLORS.WHITE]: 0,
            [MANA_COLORS.GREEN]: 0
        };
        this.maxPerColor = 3;
    }

    // Add a crystal
    addCrystal(color) {
        if (this.crystals[color] !== undefined && this.crystals[color] < this.maxPerColor) {
            this.crystals[color]++;
            return true;
        }
        return false;
    }

    // Use a crystal (convert to mana)
    useCrystal(color) {
        if (this.crystals[color] > 0) {
            this.crystals[color]--;
            return true;
        }
        return false;
    }

    // Get crystal count
    getCount(color) {
        return this.crystals[color] || 0;
    }

    // Check if color is available
    hasColor(color) {
        return this.getCount(color) > 0;
    }

    // Get all crystals
    getAll() {
        return { ...this.crystals };
    }
}

export default ManaSource;
