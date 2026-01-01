// Simple Sound Manager for Mage Knight
// Sound system disabled by user request

export class SoundManager {
    constructor() {
        this.enabled = false;
        this.volume = 0;
        this.audioContext = null;
    }

    toggle() { return false; }
    setVolume(_vol) { }
    playTone(_frequency, _duration, _type = 'sine') { }

    // Sound effects - all empty
    cardPlay() { }
    cardPlayStrong() { }
    move() { }
    attack() { }
    hit() { }
    block() { }
    victory() { }
    defeat() { }
    levelUp() { }
    error() { }
    notification() { }
    cardDraw() { }
    cardPlaySideways() { }
    manaUse() { }
    explore() { }
    achievement() { }
}

export default SoundManager;
