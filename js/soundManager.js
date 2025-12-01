// Simple Sound Manager for Mage Knight
// Provides audio feedback without external files using Web Audio API

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.3; // 30% volume by default
        this.audioContext = null;

        // Try to initialize AudioContext
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
            this.enabled = false;
        }

        // Load enabled state from localStorage
        const saved = localStorage.getItem('sound_enabled');
        if (saved !== null) {
            this.enabled = saved === 'true';
        }
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('sound_enabled', this.enabled.toString());
        return this.enabled;
    }

    // Set volume (0-1)
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    // Play a simple beep tone
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Sound effects
    cardPlay() {
        this.playTone(440, 0.1, 'sine'); // A4 note
    }

    cardPlayStrong() {
        this.playTone(554, 0.15, 'square'); // C#5 note, stronger
    }

    move() {
        this.playTone(330, 0.08, 'triangle'); // E4 note
    }

    attack() {
        // Two-tone attack sound
        this.playTone(200, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.15, 'sawtooth'), 50);
    }

    hit() {
        this.playTone(100, 0.2, 'square'); // Low harsh tone
    }

    block() {
        this.playTone(600, 0.12, 'triangle'); // Higher defensive tone
    }

    victory() {
        // Victory jingle
        [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 100);
        });
    }

    defeat() {
        // Descending tones
        [880, 659, 554, 440].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine'), i * 80);
        });
    }

    levelUp() {
        // Ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 100);
        });
    }

    error() {
        this.playTone(200, 0.3, 'sawtooth'); // Buzzer sound
    }

    notification() {
        this.playTone(800, 0.1, 'sine');
        setTimeout(() => this.playTone(1000, 0.1, 'sine'), 100);
    }
}

export default SoundManager;
