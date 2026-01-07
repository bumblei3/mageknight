// Animation System for Mage Knight
// Provides easing functions, tweening, and animation management

export interface AnimationOptions {
    from: number;
    to: number;
    duration: number;
    onUpdate?: (value: number, progress: number) => void;
    onComplete?: () => void;
    easing?: string;
}

export type EasingFunction = (t: number) => number;

export class Animator {
    private activeAnimations: Map<number, number>;
    private animationId: number;
    public easingFunctions: Record<string, EasingFunction>;

    constructor() {
        this.activeAnimations = new Map();
        this.animationId = 0;

        // Easing functions
        this.easingFunctions = {
            linear: (t: number) => t,

            easeInQuad: (t: number) => t * t,
            easeOutQuad: (t: number) => t * (2 - t),
            easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

            easeInCubic: (t: number) => t * t * t,
            easeOutCubic: (t: number) => (--t) * t * t + 1,
            easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

            easeInQuart: (t: number) => t * t * t * t,
            easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
            easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

            easeInElastic: (t: number) => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
            },

            easeOutElastic: (t: number) => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },

            easeInOutElastic: (t: number) => {
                const c5 = (2 * Math.PI) / 4.5;
                return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
                    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
                    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
            },

            easeOutBounce: (t: number) => {
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

            easeInBounce: (t: number) => 1 - this.easingFunctions.easeOutBounce(1 - t),

            easeInOutBounce: (t: number) => t < 0.5
                ? (1 - this.easingFunctions.easeOutBounce(1 - 2 * t)) / 2
                : (1 + this.easingFunctions.easeOutBounce(2 * t - 1)) / 2,

            easeInBack: (t: number) => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            },

            easeOutBack: (t: number) => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },

            easeInOutBack: (t: number) => {
                const c1 = 1.70158;
                const c2 = c1 * 1.525;
                return t < 0.5
                    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
            }
        };
    }

    /**
     * Animate a value from start to end over duration
     * @param {AnimationOptions} options - Animation options
     * @returns {number} Animation ID (for cancellation)
     */
    animate(options: AnimationOptions): number {
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

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentValue = from + (to - from) * easedProgress;

            if (onUpdate) {
                onUpdate(currentValue, progress);
            }

            if (progress >= 1) {
                if (onComplete) {
                    onComplete();
                }
                this.activeAnimations.delete(id);
                return;
            }

            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                const rafId = window.requestAnimationFrame(animate);
                this.activeAnimations.set(id, rafId);
            } else {
                // Fallback for non-browser environments
                const rafId = setTimeout(() => animate(Date.now() + 16), 16) as unknown as number;
                this.activeAnimations.set(id, rafId);
            }
        };

        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            const rafId = window.requestAnimationFrame(animate);
            this.activeAnimations.set(id, rafId);
        } else {
            const rafId = setTimeout(() => animate(Date.now() + 16), 16) as unknown as number;
            this.activeAnimations.set(id, rafId);
        }

        return id;
    }

    /**
     * Animate hero movement between hexes
     * @param {any} hero - The hero object with displayPosition
     * @param {any} oldPos - Starting axial pos {q, r}
     * @param {any} newPos - Ending axial pos {q, r}
     * @returns {Promise<void>} Resolves when animation complete
     */
    async animateHeroMove(hero: any, oldPos: any, newPos: any): Promise<void> {
        if (!hero || !hero.displayPosition) return;

        return new Promise(resolve => {
            this.animate({
                from: 0,
                to: 1,
                duration: 400,
                easing: 'easeInOutCubic',
                onUpdate: (progress) => {
                    hero.displayPosition.q = oldPos.q + (newPos.q - oldPos.q) * progress;
                    hero.displayPosition.r = oldPos.r + (newPos.r - oldPos.r) * progress;
                },
                onComplete: () => {
                    hero.displayPosition.q = newPos.q;
                    hero.displayPosition.r = newPos.r;
                    resolve();
                }
            });
        });
    }

    /**
     * Animate multiple properties of an object
     * @param {any} target - Target object
     * @param {Record<string, number>} properties - Properties to animate {prop: endValue}
     * @param {number} duration - Duration in milliseconds
     * @param {any} options - Additional options
     */
    animateProperties(target: any, properties: Record<string, number>, duration: number, options: any = {}): number {
        const startValues: Record<string, number> = {};

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
     * @param {Function[]} animations - Array of animation functions
     * @returns {Promise<void>} Resolves when all animations complete
     */
    async sequence(animations: ((resolve: () => void) => void)[]): Promise<void> {
        for (const animFn of animations) {
            await new Promise<void>(resolve => {
                animFn(resolve);
            });
        }
    }

    /**
     * Run multiple animations in parallel
     * @param {Function[]} animations - Array of animation functions
     * @returns {Promise<void>} Resolves when all animations complete
     */
    async parallel(animations: ((resolve: () => void) => void)[]): Promise<void> {
        const promises = animations.map(animFn => {
            return new Promise<void>(resolve => {
                animFn(resolve);
            });
        });
        await Promise.all(promises);
    }

    /**
     * Cancel an active animation
     * @param {number} id - Animation ID
     */
    cancel(id: number): void {
        const rafId = this.activeAnimations.get(id);
        if (rafId) {
            try {
                if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
                    window.cancelAnimationFrame(rafId);
                } else {
                    clearTimeout(rafId);
                }
            } catch (_e) {
                // Fallback if cancelAnimationFrame fails
                clearTimeout(rafId);
            }
            this.activeAnimations.delete(id);
        }
    }

    /**
     * Cancel all active animations
     */
    cancelAll(): void {
        this.activeAnimations.forEach(rafId => {
            try {
                if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
                    window.cancelAnimationFrame(rafId);
                } else {
                    clearTimeout(rafId);
                }
            } catch (_e) {
                clearTimeout(rafId);
            }
        });
        this.activeAnimations.clear();
    }
}

/**
 * Number counter animation helper
 * @param {HTMLElement} element - DOM element to update
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {number} duration - Duration in milliseconds
 * @param {Animator} animator - Animator instance
 */
export function animateCounter(element: HTMLElement, from: number, to: number, duration: number, animator: Animator): void {
    animator.animate({
        from,
        to,
        duration,
        easing: 'easeOutQuad',
        onUpdate: (value) => {
            element.textContent = Math.round(value).toString();
        }
    });
}

/**
 * Shake animation for elements
 * @param {HTMLElement} element - Element to shake
 * @param {number} intensity - Shake intensity in pixels
 * @param {number} duration - Duration in milliseconds
 */
export function shake(element: HTMLElement, intensity: number = 10, duration: number = 500): void {
    const startTime = performance.now();
    const originalTransform = element.style.transform || '';

    const animate = (currentTime: number) => {
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
