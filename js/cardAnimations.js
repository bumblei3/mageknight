// Card Animation System for Mage Knight
// Premium card interactions with smooth, physics-based animations



/**
 * Animate a card being drawn from the deck
 * @param {HTMLElement} cardElement - The card DOM element
 * @param {number} index - Card index for staggered animation
 * @returns {Promise} Resolves when animation completes
 */
export function animateCardDraw(cardElement, index = 0) {
    return new Promise((resolve) => {
        // Set initial state
        cardElement.style.transform = 'translateX(-200px) translateY(100px) scale(0.5) rotate(-20deg)';
        cardElement.style.opacity = '0';

        // Delay based on index for staggered effect
        const delay = index * 80;

        setTimeout(() => {
            cardElement.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            cardElement.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
            cardElement.style.opacity = '1';

            setTimeout(resolve, 600);
        }, delay);
    });
}

/**
 * Animate a card being played to the play area
 * @param {HTMLElement} cardElement - The card DOM element
 * @param {HTMLElement} targetElement - The target play area element
 * @returns {Promise} Resolves when animation completes
 */
export function animateCardPlay(cardElement, targetElement) {
    return new Promise((resolve) => {
        const cardRect = cardElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        // Calculate arc trajectory
        const deltaX = targetRect.left - cardRect.left;
        const deltaY = targetRect.top - cardRect.top;

        // Clone for animation (original stays for reference)
        const clone = cardElement.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = `${cardRect.left}px`;
        clone.style.top = `${cardRect.top}px`;
        clone.style.width = `${cardRect.width}px`;
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);

        // Hide original
        cardElement.style.opacity = '0';

        // Animate clone
        let progress = 0;
        const duration = 500;
        const startTime = performance.now();

        function animate(currentTime) {
            progress = Math.min((currentTime - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            // Arc trajectory (parabola)
            const arcHeight = -100; // Negative for upward arc
            const x = deltaX * eased;
            const y = deltaY * eased + arcHeight * Math.sin(progress * Math.PI);

            clone.style.transform = `translate(${x}px, ${y}px) rotate(${progress * 360}deg) scale(${1 - progress * 0.3})`;
            clone.style.opacity = `${1 - progress * 0.5}`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                clone.remove();
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

/**
 * Animate a card being discarded
 * @param {HTMLElement} cardElement - The card DOM element
 * @returns {Promise} Resolves when animation completes
 */
export function animateCardDiscard(cardElement) {
    return new Promise((resolve) => {
        cardElement.style.transition = 'all 0.4s ease-out';
        cardElement.style.transform = 'translateY(50px) scale(0.8) rotate(10deg)';
        cardElement.style.opacity = '0';
        cardElement.style.filter = 'blur(2px)';

        setTimeout(() => {
            cardElement.remove();
            resolve();
        }, 400);
    });
}

/**
 * Animate 3D tilt based on mouse position
 * @param {HTMLElement} cardElement - The card DOM element
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 */
export function animate3DTilt(cardElement, mouseX, mouseY, cachedRect = null) {
    const rect = cachedRect || cardElement.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    // Calculate rotation based on distance from center
    const rotateX = (mouseY - cardCenterY) / 10;
    const rotateY = (cardCenterX - mouseX) / 10;

    // Smooth transition
    cardElement.style.transition = 'transform 0.1s ease-out';
    cardElement.style.transform = `
        perspective(1000px) 
        rotateX(${rotateX}deg) 
        rotateY(${rotateY}deg) 
        translateY(-12px) 
        scale(1.08)
    `;
}

/**
 * Reset 3D tilt
 * @param {HTMLElement} cardElement - The card DOM element
 */
export function reset3DTilt(cardElement) {
    cardElement.style.transition = 'transform 0.3s ease-out';
    cardElement.style.transform = '';
}

/**
 * Shake animation for invalid actions
 * @param {HTMLElement} cardElement - The card DOM element
 * @returns {Promise} Resolves when animation completes
 */
export function shakeCard(cardElement) {
    return new Promise((resolve) => {
        cardElement.classList.add('card-shake');

        setTimeout(() => {
            cardElement.classList.remove('card-shake');
            resolve();
        }, 500);
    });
}

/**
 * Flip animation for card reveal
 * @param {HTMLElement} cardElement - The card DOM element
 * @returns {Promise} Resolves when animation completes
 */
export function flipCard(cardElement) {
    return new Promise((resolve) => {
        cardElement.style.transition = 'transform 0.6s';
        cardElement.style.transformStyle = 'preserve-3d';

        // Flip to back
        cardElement.style.transform = 'rotateY(90deg)';

        setTimeout(() => {
            // Flip to front
            cardElement.style.transform = 'rotateY(0deg)';

            setTimeout(() => {
                cardElement.style.transformStyle = '';
                resolve();
            }, 300);
        }, 300);
    });
}

/**
 * Glow pulse effect for important cards
 * @param {HTMLElement} cardElement - The card DOM element
 */
export function pulseGlow(cardElement) {
    cardElement.classList.add('card-pulse-glow');
}

/**
 * Stop glow pulse effect
 * @param {HTMLElement} cardElement - The card DOM element
 */
export function stopPulseGlow(cardElement) {
    cardElement.classList.remove('card-pulse-glow');
}

/**
 * Highlight card briefly (e.g., when drawn)
 * @param {HTMLElement} cardElement - The card DOM element
 * @returns {Promise} Resolves when animation completes
 */
export function highlightCard(cardElement) {
    return new Promise((resolve) => {
        cardElement.classList.add('card-highlight');

        setTimeout(() => {
            cardElement.classList.remove('card-highlight');
            resolve();
        }, 1000);
    });
}

export default {
    animateCardDraw,
    animateCardPlay,
    animateCardDiscard,
    animate3DTilt,
    reset3DTilt,
    shakeCard,
    flipCard,
    pulseGlow,
    stopPulseGlow,
    highlightCard
};
