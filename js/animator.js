// Animation System for Mage Knight
// Provides easing functions, tweening, and animation management

export class Animator {
    constructor() {
        this.activeAnimations = new Map();
        this.animationId = 0;
    }

    /**
     * Animate a value from start to end over duration
     * @param {Object} options - Animation options
     * @param {number} options.from - Start value
     * @param {number} options.to - End value
     * @param {number} options.duration - Duration in milliseconds
     * @param {function} options.onUpdate - Callback with current value
     * @param {function} options.onComplete - Callback when animation completes
     * @param {string} options.easing - Easing function name
     * @returns {number} Animation ID (for cancellation)
     */
    animate(options) {
        const {
            from,
            to,
            duration,
            onUpdate,
            onComplete,
            easing = 'easeInOutQuad'
        } = options;

        const id = this.animationId++;
        const startTime = performance.now();
        const easingFn = this.easingFunctions[easing] || this.easingFunctions.linear;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentValue = from + (to - from) * easedProgress;

            if (onUpdate) {
                onUpdate(currentValue, progress);
            }

            if (progress < 1) {
                const rafId = requestAnimationFrame(animate);
                this.activeAnimations.set(id, rafId);
            } else {
                this.activeAnimations.delete(id);
                if (onComplete) {
                    onComplete();
                }
            }
        };

        const rafId = requestAnimationFrame(animate);
        this.activeAnimations.set(id, rafId);

        return id;
    }

    /**
     * Animate hero movement between hexes
     * @param {Object} oldPos - Starting axial pos {q, r}
     * @param {Object} newPos - Ending axial pos {q, r}
     * @param {Object} screenPos - Target screen position {x, y}
     * @returns {Promise} Resolves when animation complete
     */
    async animateHeroMove(_oldPos, _newPos, _screenPos) {
        return new Promise(resolve => {
            // Simplified animation: just a small delay or dummy Tween
            // In a real implementation we might tween a displayPosition property on the hero
            // For now, assume we just wait a bit to simulate travel
            this.animate({
                from: 0,
                to: 1,
                duration: 300,
                onUpdate: (_progress) => {
                    // Could update a visual marker here
                },
                onComplete: resolve
            });
        });
    }

    /**
     * Animate multiple properties of an object
     * @param {Object} target - Target object
     * @param {Object} properties - Properties to animate {prop: endValue}
     * @param {number} duration - Duration in milliseconds
     * @param {Object} options - Additional options
     */
    animateProperties(target, properties, duration, options = {}) {
        const startValues = {};

        // Store initial values
        for (const prop in properties) {
            startValues[prop] = target[prop];
        }

        return this.animate({
            from: 0,
            to: 1,
            duration,
            easing: options.easing || 'easeInOutQuad',
            onUpdate: (progress) => {
                for (const prop in properties) {
                    const start = startValues[prop];
                    const end = properties[prop];
                    target[prop] = start + (end - start) * progress;
                }
                if (options.onUpdate) {
                    options.onUpdate(progress);
                }
            },
            onComplete: options.onComplete
        });
    }

    /**
     * Chain multiple animations in sequence
     * @param {Array} animations - Array of animation functions
     * @returns {Promise} Resolves when all animations complete
     */
    async sequence(animations) {
        for (const animFn of animations) {
            await new Promise(resolve => {
                animFn(resolve);
            });
        }
    }

    /**
     * Run multiple animations in parallel
     * @param {Array} animations - Array of animation functions
     * @returns {Promise} Resolves when all animations complete
     */
    async parallel(animations) {
        const promises = animations.map(animFn => {
            return new Promise(resolve => {
                animFn(resolve);
            });
        });
        await Promise.all(promises);
    }

    /**
     * Cancel an active animation
     * @param {number} id - Animation ID
     */
    cancel(id) {
        const rafId = this.activeAnimations.get(id);
        if (rafId) {
            cancelAnimationFrame(rafId);
            this.activeAnimations.delete(id);
        }
    }

    /**
     * Cancel all active animations
     */
    cancelAll() {
        this.activeAnimations.forEach(rafId => {
            cancelAnimationFrame(rafId);
        });
        this.activeAnimations.clear();
    }

    /**
     * Easing functions
     */
    easingFunctions = {
        linear: t => t,

        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

        easeInQuart: t => t * t * t * t,
        easeOutQuart: t => 1 - (--t) * t * t * t,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

        easeInElastic: t => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        },

        easeOutElastic: t => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },

        easeInOutElastic: t => {
            const c5 = (2 * Math.PI) / 4.5;
            return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
                ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
                : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
        },

        easeOutBounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        },

        easeInBounce: t => 1 - this.easingFunctions.easeOutBounce(1 - t),

        easeInOutBounce: t => t < 0.5
            ? (1 - this.easingFunctions.easeOutBounce(1 - 2 * t)) / 2
            : (1 + this.easingFunctions.easeOutBounce(2 * t - 1)) / 2,

        easeInBack: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        },

        easeOutBack: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },

        easeInOutBack: t => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
        }
    };
}

/**
 * Number counter animation helper
 * @param {HTMLElement} element - DOM element to update
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {number} duration - Duration in milliseconds
 * @param {Animator} animator - Animator instance
 */
export function animateCounter(element, from, to, duration, animator) {
    animator.animate({
        from,
        to,
        duration,
        easing: 'easeOutQuad',
        onUpdate: (value) => {
            element.textContent = Math.round(value);
        }
    });
}

/**
 * Shake animation for elements
 * @param {HTMLElement} element - Element to shake
 * @param {number} intensity - Shake intensity in pixels
 * @param {number} duration - Duration in milliseconds
 */
export function shake(element, intensity = 10, duration = 500) {
    const startTime = performance.now();
    const originalTransform = element.style.transform || '';

    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
            const decay = 1 - progress;
            const x = (Math.random() - 0.5) * intensity * decay * 2;
            const y = (Math.random() - 0.5) * intensity * decay * 2;
            element.style.transform = `${originalTransform} translate(${x}px, ${y}px)`;
            requestAnimationFrame(animate);
        } else {
            element.style.transform = originalTransform;
        }
    };

    requestAnimationFrame(animate);
}

// Singleton instance
export const animator = new Animator();

export default animator;
