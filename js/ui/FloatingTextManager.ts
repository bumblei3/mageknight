/**
 * Manages floating text visual feedback (damage numbers, healing, etc.)
 */
export class FloatingTextManager {
    private container: HTMLElement;

    constructor(gameContainer?: HTMLElement) {
        this.container = document.createElement('div');
        this.container.id = 'floating-text-layer';
        this.container.style.pointerEvents = 'none'; // Ensure click-through even if CSS fails
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
        this.container.style.zIndex = '9000';

        // Append to specific container if provided, otherwise body or game board wrapper
        if (gameContainer) {
            // Need to ensure the container has relative positioning
            const style = window.getComputedStyle(gameContainer);
            if (style.position === 'static') {
                gameContainer.style.position = 'relative';
            }
            gameContainer.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
    }

    /**
     * Spawns a floating text element.
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {string} text - The text content
     * @param {string} type - 'damage', 'heal', 'xp', 'mana', 'crit', 'block'
     */
    public spawn(x: number, y: number, text: string, type: string = 'info'): void {
        const el = document.createElement('div');
        el.className = `floating-text ft-${type}`;
        el.textContent = text;

        // Randomize position slightly to prevent overlapping perfect stacks
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 10;

        el.style.left = `${x + offsetX}px`;
        el.style.top = `${y + offsetY}px`;

        this.container.appendChild(el);

        // Auto-remove after animation
        // Animation length matches CSS (approx 1.5s - 2s)
        setTimeout(() => {
            if (this.container.contains(el)) {
                this.container.removeChild(el);
            }
        }, 2000);
    }

    /**
     * Spawns text over a specific hex coordinate.
     * Requires the HexGrid from the game to convert coordinates.
     * @param {any} hexGrid - The game hexGrid instance
     * @param {any} hex - {q, r} object
     * @param {string} text
     * @param {string} type
     */
    public spawnOnHex(hexGrid: any, hex: any, text: string, type: string): void {
        if (!hexGrid || !hex) return;

        const pixel = hexGrid.hexToPixel(hex);

        // Adjust for canvas offset?
        // Assuming hexToPixel returns canvas-relative coords.
        // We need to verify if the container is overlaying properly.
        // For now, assume container overlays the canvas perfectly.

        // Center text on hex (roughly)
        // Hex center is roughly 0,0 relative to hex origin in CSS if we had that,
        // but here we get absolute pixels usually.

        // Assuming pixel is {x, y} relative to container
        this.spawn(pixel.x, pixel.y - 20, text, type);
    }

    public clear(): void {
        this.container.innerHTML = '';
    }
}
