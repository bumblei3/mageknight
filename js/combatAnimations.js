// Combat Animation System for Mage Knight
// Dramatic combat visualizations for impactful battles

import { animator } from './animator.js';
import ParticleSystem from './particles.js';

/**
 * Trigger screen shake effect
 * @param {number} intensity - Shake intensity (1-10)
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Resolves when shake completes
 */
export function triggerScreenShake(intensity = 5, duration = 300) {
    return new Promise((resolve) => {
        const container = document.querySelector('.game-container');
        if (!container) {
            resolve();
            return;
        }

        const startTime = performance.now();
        let animationFrame;

        function shake(currentTime) {
            const progress = (currentTime - startTime) / duration;

            if (progress >= 1) {
                // Reset
                container.style.transform = '';
                cancelAnimationFrame(animationFrame);
                resolve();
                return;
            }

            // Decrease intensity over time
            const currentIntensity = intensity * (1 - progress);
            const x = (Math.random() - 0.5) * currentIntensity * 2;
            const y = (Math.random() - 0.5) * currentIntensity * 2;
            const rotate = (Math.random() - 0.5) * currentIntensity * 0.5;

            container.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;

            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                animationFrame = window.requestAnimationFrame(shake);
            }
        }

        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            animationFrame = window.requestAnimationFrame(shake);
        } else {
            // Fallback for environment without RAF (e.g. some tests)
            // Resolve immediately or assume it works
            resolve();
        }
    });
}

/**
 * Animate health bar change
 * @param {HTMLElement} element - Health bar element
 * @param {number} from - Starting value
 * @param {number} to - Ending value
 * @param {number} max - Maximum value
 * @returns {Promise} Resolves when animation completes
 */
export function animateHealthBar(element, from, to, max) {
    return new Promise((resolve) => {
        if (!element) {
            resolve();
            return;
        }

        const fromPercent = (from / max) * 100;
        const toPercent = (to / max) * 100;

        animator.animate({
            from: fromPercent,
            to: toPercent,
            duration: 500,
            easing: 'easeOutQuad',
            onUpdate: (value) => {
                element.style.width = `${value}%`;

                // Color based on health percentage
                if (value > 60) {
                    element.style.background = 'linear-gradient(90deg, #10b981, #059669)';
                } else if (value > 30) {
                    element.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
                } else {
                    element.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                }
            },
            onComplete: resolve
        });

        // Flash effect on damage
        if (to < from) {
            element.style.animation = 'healthFlash 0.3s ease-in-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 300);
        }
    });
}

/**
 * Show victory splash screen
 * @returns {Promise} Resolves when animation completes
 */
export function showVictorySplash() {
    return new Promise((resolve) => {
        const splash = document.createElement('div');
        splash.className = 'victory-splash';
        splash.innerHTML = `
            <div class="victory-content">
                <div class="victory-icon">🏆</div>
                <h1 class="victory-title">SIEG!</h1>
                <p class="victory-subtitle">Feind besiegt!</p>
            </div>
        `;

        document.body.appendChild(splash);

        // Trigger confetti
        triggerConfetti();

        // Auto-remove after 2 seconds
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.remove();
                resolve();
            }, 500);
        }, 2000);
    });
}

/**
 * Show defeat overlay
 * @returns {Promise} Resolves when animation completes
 */
export function showDefeatOverlay() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'defeat-overlay';
        overlay.innerHTML = `
            <div class="defeat-content">
                <div class="defeat-icon">💔</div>
                <h1 class="defeat-title">VERLETZT</h1>
                <p class="defeat-subtitle">Du wurdest getroffen...</p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Auto-remove after 1.5 seconds
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 500);
        }, 1500);
    });
}

/**
 * Animate attack impact at position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} color - Impact color
 * @param {ParticleSystem} particleSystem - Particle system instance
 */
export function animateImpact(x, y, color = '#ef4444', particleSystem) {
    // Create impact flash
    const flash = document.createElement('div');
    flash.className = 'combat-impact-flash';
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    flash.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
    document.body.appendChild(flash);

    setTimeout(() => flash.remove(), 500);

    // Trigger particles if available
    if (particleSystem) {
        particleSystem.impactEffect(x, y, color);
    }

    // Screen shake
    triggerScreenShake(3, 200);
}

/**
 * Animate successful block
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {ParticleSystem} particleSystem - Particle system instance
 */
export function animateBlock(x, y, particleSystem) {
    // Create shield effect
    const shield = document.createElement('div');
    shield.className = 'combat-block-effect';
    shield.style.left = `${x}px`;
    shield.style.top = `${y}px`;
    shield.innerHTML = '🛡️';
    document.body.appendChild(shield);

    setTimeout(() => shield.remove(), 800);

    // Particles
    if (particleSystem) {
        particleSystem.burst(x, y, 20, {
            color: '#3b82f6',
            size: 3,
            speed: 2,
            decay: 0.02,
            type: 'star'
        });
    }
}

/**
 * Trigger confetti celebration
 */
function triggerConfetti() {
    const canvas = document.getElementById('game-board');
    if (!canvas) return;

    const particleSystem = new ParticleSystem(canvas);

    // Multiple bursts of confetti
    const colors = ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            colors.forEach(color => {
                particleSystem.explosion(
                    centerX + (Math.random() - 0.5) * 200,
                    centerY + (Math.random() - 0.5) * 100,
                    color,
                    15
                );
            });
        }, i * 200);
    }
}

/**
 * Pulse effect on element
 * @param {HTMLElement} element - Element to pulse
 * @param {string} color - Pulse color
 */
export function pulseElement(element, color = '#8b5cf6') {
    if (!element) return;

    element.style.animation = 'elementPulse 0.5s ease-in-out';
    element.style.setProperty('--pulse-color', color);

    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

/**
 * Flash damage number
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} damage - Damage amount
 * @param {string} color - Text color
 */
export function flashDamageNumber(x, y, damage, color = '#ef4444') {
    const numberEl = document.createElement('div');
    numberEl.className = 'damage-number';
    numberEl.textContent = `-${damage}`;
    numberEl.style.left = `${x}px`;
    numberEl.style.top = `${y}px`;
    numberEl.style.color = color;

    document.body.appendChild(numberEl);

    setTimeout(() => numberEl.remove(), 1000);
}

/**
 * Show enemy defeated explosion
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {ParticleSystem} particleSystem - Particle system instance
 */
export function enemyDefeatedExplosion(x, y, particleSystem) {
    if (particleSystem) {
        particleSystem.explosion(x, y, '#fbbf24', 40);

        // Secondary explosion
        setTimeout(() => {
            particleSystem.explosion(x, y, '#ec4899', 30);
        }, 150);
    }

    // Screen shake
    triggerScreenShake(7, 400);
}

export default {
    triggerScreenShake,
    animateHealthBar,
    showVictorySplash,
    showDefeatOverlay,
    animateImpact,
    animateBlock,
    pulseElement,
    flashDamageNumber,
    enemyDefeatedExplosion
};
