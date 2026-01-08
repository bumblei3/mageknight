
import { HexGrid } from '../hexgrid';
import { eventBus } from '../eventBus';
import { GAME_EVENTS } from '../constants';

export class VolkareController {
    private game: any; // Reference to main game
    public position: { q: number; r: number } | null = null;
    public target: { q: number; r: number } | null = null;
    public level: number = 1;
    public army: any[] = []; // Placeholder for Enemy units
    public isActive: boolean = false;

    constructor(game: any) {
        this.game = game;
    }

    spawn(startHex: { q: number, r: number }, targetHex: { q: number, r: number }) {
        this.position = startHex;
        this.target = targetHex;
        this.isActive = true;
        this.level = 10; // Boss level

        console.log(`💀 Volkare spawned at [${startHex.q},${startHex.r}] targeting Portal at [${targetHex.q},${targetHex.r}]`);

        eventBus.emit(GAME_EVENTS.LOG_ADDED, {
            message: "General Volkare has entered the realm!",
            type: 'warning'
        });

        // Trigger visual update
        this.notifyUpdate();
    }

    move() {
        if (!this.isActive || !this.position || !this.target || !this.game.hexGrid) return;

        console.log('💀 Volkare is thinking...');

        const path = this.game.hexGrid.findPath(this.position, this.target, false);

        // path[0] is start (usually, verifying logic), path[1] is next step
        // My implementation of findPath returns [start, next, ..., end] ? No, reconstruct was target -> prev -> start, then reversed.
        // So [0] is start (current pos), [1] is next step.

        if (path && path.length > 1) {
            const nextStep = path[1]; // Move 1 hex
            this.position = nextStep;

            console.log(`💀 Volkare moves to [${this.position!.q},${this.position!.r}]`);

            eventBus.emit(GAME_EVENTS.LOG_ADDED, {
                message: `Volkare marches to [${this.position!.q},${this.position!.r}]!`,
                type: 'bad'
            });

            this.notifyUpdate();
            this.checkWinCondition();
        } else {
            console.log('💀 Volkare is stuck or has arrived!');
            this.checkWinCondition();
        }
    }

    checkWinCondition() {
        if (!this.position || !this.target) return;

        // Check if reached Portal
        if (this.position.q === this.target.q && this.position.r === this.target.r) {
            console.log('💀 Volkare reached the Portal! GAME OVER!');
            eventBus.emit(GAME_EVENTS.LOG_ADDED, {
                message: "Volkare has conquered the Portal! All is lost.",
                type: 'critical'
            });
            // Trigger Game Over Modal/State here
        }

        // Check if Hero is on same hex -> Combat
        // This logic might be better in Hero movement or Interaction Controller
    }

    notifyUpdate() {
        // Emit event for 3D view to render Volkare
        eventBus.emit('VOLKARE_UPDATED', { position: this.position });
    }
}
