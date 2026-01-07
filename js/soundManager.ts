/**
 * Sound Manager for Mage Knight
 * Uses Web Audio API for procedural sound generation (no audio files needed)
 */

export class SoundManager {
    private ctx: AudioContext | null;
    public enabled: boolean;
    private masterVolume: number;
    private timeouts: Set<number>;

    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.masterVolume = 1.0;
        this.timeouts = new Set();
        this.init();
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    init(): void {
        if (this.ctx && this.ctx.state !== 'closed') return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.enabled = true; // Enable sound if context is successfully created
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    /**
     * Toggle sound on/off
     */
    toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(vol: number): void {
        this.masterVolume = Math.max(0, Math.min(1, vol));
    }

    /**
     * Play a single tone
     */
    playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1): void {
        if (!this.enabled || !this.ctx || this.ctx.state === 'closed') return;

        try {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            gainNode.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            oscillator.start();
            oscillator.stop(this.ctx.currentTime + duration);
        } catch (e: any) {
            console.warn('Failed to play tone:', e.message);
        }
    }

    /**
     * Play a chord (multiple frequencies)
     */
    playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine'): void {
        frequencies.forEach((freq, i) => {
            const t = setTimeout(() => this.playTone(freq, duration, type), i * 30) as unknown as number;
            this.timeouts.add(t);
            // Cleanup timeout from set? Not strictly necessary for one-offs but good practice if tracking
            setTimeout(() => this.timeouts.delete(t), i * 30 + duration * 1000 + 100);
        });
    }

    /**
     * Play noise burst (for impact sounds)
     */
    playNoise(duration: number, filterFreq: number = 1000): void {
        if (!this.enabled || !this.ctx) {
            this.init();
            if (!this.ctx) return;
        }

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        if (this.ctx.createBiquadFilter) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            noise.connect(filter);
            filter.connect(gainNode);
        } else {
            noise.connect(gainNode);
        }
        gainNode.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }

    // ============ SOUND EFFECTS ============

    /** Card drawn from deck */
    cardDraw(): void {
        this.playTone(800, 0.08, 'sine');
        setTimeout(() => this.playTone(1000, 0.05, 'sine'), 40);
    }

    /** Card played (basic effect) */
    cardPlay(): void {
        this.playTone(400, 0.1, 'triangle');
        this.playTone(600, 0.15, 'triangle');
    }

    /** Card played with strong/powered effect */
    cardPlayStrong(): void {
        this.playChord([400, 500, 600], 0.2, 'sawtooth');
        setTimeout(() => this.playTone(800, 0.15, 'sine'), 100);
    }

    /** Card played sideways */
    cardPlaySideways(): void {
        this.playTone(300, 0.15, 'triangle');
    }

    /** Hero movement */
    move(): void {
        this.playTone(200, 0.08, 'sine');
        const t = setTimeout(() => {
            this.playTone(250, 0.06, 'sine');
            this.timeouts.delete(t);
        }, 50) as unknown as number;
        this.timeouts.add(t);
    }

    /** Attack sound */
    attack(): void {
        this.playNoise(0.15, 800);
        this.playTone(150, 0.2, 'sawtooth');
    }

    /** Hit/damage received */
    hit(): void {
        this.playNoise(0.1, 600);
        this.playTone(100, 0.15, 'square');
        const t = setTimeout(() => {
            this.playTone(80, 0.1, 'square');
            this.timeouts.delete(t);
        }, 80) as unknown as number;
        this.timeouts.add(t);
    }

    /** Block successful */
    block(): void {
        this.playTone(300, 0.1, 'triangle');
        this.playTone(400, 0.1, 'triangle');
        this.playNoise(0.05, 2000);
    }

    /** Victory fanfare */
    victory(): void {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const t = setTimeout(() => {
                this.playTone(freq, 0.3, 'sine');
                this.timeouts.delete(t);
            }, i * 150) as unknown as number;
            this.timeouts.add(t);
        });
    }

    destroy(): void {
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts.clear();
        if (this.ctx && this.ctx.state !== 'closed') {
            try { this.ctx.close(); } catch (_e) { /* Ignore close errors */ }
        }
    }

    /** Defeat sound */
    defeat(): void {
        const notes = [300, 250, 200, 150];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.4, 'sawtooth'), i * 200);
        });
    }

    /** Level up celebration */
    levelUp(): void {
        this.playChord([523, 659, 784], 0.3, 'sine');
        setTimeout(() => this.playChord([587, 740, 880], 0.4, 'sine'), 200);
    }

    /** Error/invalid action */
    error(): void {
        this.playTone(200, 0.15, 'square');
        setTimeout(() => this.playTone(150, 0.2, 'square'), 100);
    }

    /** Notification sound */
    notification(): void {
        this.playTone(880, 0.1, 'sine');
        setTimeout(() => this.playTone(1100, 0.15, 'sine'), 80);
    }

    /** Mana crystal used */
    manaUse(): void {
        this.playTone(600, 0.1, 'sine');
        this.playTone(900, 0.15, 'sine');
    }

    /** Exploration/reveal */
    explore(): void {
        this.playTone(400, 0.1, 'triangle');
        setTimeout(() => this.playTone(500, 0.1, 'triangle'), 60);
        setTimeout(() => this.playTone(600, 0.15, 'triangle'), 120);
    }

    /** Achievement unlocked */
    achievement(): void {
        const notes = [659, 784, 880, 1047, 1175];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 100);
        });
    }

    /** UI button click */
    click(): void {
        this.playTone(600, 0.05, 'sine');
    }

    /** UI hover */
    hover(): void {
        this.playTone(800, 0.03, 'sine');
    }

    /** Combat start */
    combatStart(): void {
        this.playNoise(0.2, 400);
        this.playTone(200, 0.3, 'sawtooth');
        setTimeout(() => this.playTone(250, 0.2, 'sawtooth'), 150);
    }

    /** Enemy defeated */
    enemyDefeated(): void {
        this.playChord([400, 500, 600], 0.2, 'triangle');
    }

    /** Heal effect */
    heal(): void {
        this.playChord([523, 659, 784], 0.25, 'sine');
    }

    /** Skill activation */
    skillUse(): void {
        this.playTone(700, 0.1, 'sine');
        setTimeout(() => this.playTone(900, 0.15, 'sine'), 50);
        setTimeout(() => this.playTone(1100, 0.2, 'sine'), 100);
    }
}

export default SoundManager;
