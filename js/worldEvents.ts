export const EVENT_TYPES = {
    AMBUSH: 'ambush',
    OPPORTUNITY: 'opportunity',
    WEATHER: 'weather'
};

export class WorldEventManager {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Checks if an event should be triggered for the given terrain.
     */
    checkForEvent(terrainType: string): any | null {
        // Simple random check, customizable by terrain danger
        const roll = Math.random();
        let threshold = 0.1; // 10% base chance

        if (terrainType === 'wasteland' || terrainType === 'swamp') {
            threshold = 0.2;
        } else if (terrainType === 'desert') {
            threshold = 0.15;
        }

        if (roll < threshold) {
            return this.generateEvent(terrainType);
        }
        return null;
    }

    /**
     * Generates a random event object based on terrain.
     */
    generateEvent(terrainType: string): any {
        const isDangerous = ['wasteland', 'swamp', 'desert'].includes(terrainType);

        if (isDangerous && Math.random() > 0.5) {
            return {
                type: EVENT_TYPES.AMBUSH,
                text: 'Ein Hinterhalt! Eine Gruppe Orks greift an.',
                options: [
                    { action: 'fight', label: 'Kämpfen', value: 'orc_skirmisher' },
                    { action: 'flee', label: 'Fliehen (Wunde nehmen)', value: 1 }
                ]
            };
        }

        // Beneficial / Neutral event
        const benefits = [
            { action: 'heal', label: 'Heilquelle finden', value: 1, text: 'Du findest eine heilende Quelle.' },
            { action: 'mana', label: 'Manakristall finden', value: 'gold', text: 'Du entdeckst einen goldenen Manakristall.' },
            { action: 'motivation', label: 'Inspiration finden', value: 1, text: 'Die Landschaft inspiriert dich.' }
        ];

        const pick = benefits[Math.floor(Math.random() * benefits.length)];
        return {
            type: EVENT_TYPES.OPPORTUNITY,
            text: pick.text,
            options: [pick]
        };
    }

    triggerEvent(eventType: string, data?: any): void {
        console.log(`World Event Triggered: ${eventType}`, data);
        if (this.game.showToast) {
            this.game.showToast(`Ereignis: ${eventType}`, 'info');
        }
    }

    resolveEventOption(event: any, optionIndex: number): void {
        const option = event.options[optionIndex];
        if (!option) return;

        switch (option.action) {
            case 'heal':
                if (this.game.hero) {
                    this.game.hero.healWound(false);
                    this.game.addLog('Durch Event geheilt.', 'success');
                }
                break;
            case 'mana':
                if (this.game.manaSource) {
                    this.game.manaSource.addCrystalToInventory(option.value);
                    this.game.addLog(`Kristall erhalten: ${option.value}`, 'success');
                    this.game.renderMana(); // If available
                }
                break;
            case 'fight':
                // logic to spawn enemy or start combat
                break;
            case 'flee':
                // take wound
                break;
        }
    }

    /**
     * Returns a random event without terrain specificity.
     */
    getRandomEvent(): any {
        return this.generateEvent('plains');
    }

    // Called by MapManager potentially
    onTileRevealed(q: number, r: number, tileData: any) {
        // Logic for spawning enemies or sites on reveal
    }
}
