// Touch Controls Module for Mage Knight
// Handles touch events for mobile devices

export class TouchController {
    constructor(game) {
        this.game = game;
        this.abortController = new AbortController();
        this.touchStartTime = 0;
        this.touchStartPos = null;
        this.longPressTimer = null;
        this.cardLongPressTimer = null;
        this.longPressThreshold = 500; // ms
        this.isLongPress = false;
        this.swipeThreshold = 50; // pixels

        // Bind resize handler for cleanup
        this.resizeHandler = this.handleResize.bind(this);

        this.setupTouchEvents();
        this.setupViewportResize();

        this.canvasRect = null;
        this.updateRect = this.updateRect.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', this.updateRect);
            setTimeout(this.updateRect, 100);
        }
    }

    destroy() {
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        if (this.cardLongPressTimer) clearTimeout(this.cardLongPressTimer);
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }

        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('orientationchange', this.resizeHandler);

        this.abortController.abort();
    }

    setupTouchEvents() {
        const canvas = this.game.canvas;
        const signal = this.abortController.signal;

        // Touch start
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false, signal });

        // Touch end
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false, signal });

        // Touch move
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false, signal });

        // Touch cancel
        canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { signal });

        // Card touch events
        this.setupCardTouchEvents();
    }

    handleTouchStart(e) {
        e.preventDefault();

        const touch = e.touches[0];
        this.touchStartTime = Date.now();
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.isLongPress = false;

        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            this.isLongPress = true;
            this.handleLongPress(touch);
        }, this.longPressThreshold);
    }

    handleTouchEnd(e) {
        e.preventDefault();

        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        const touch = e.changedTouches[0];
        const touchDuration = Date.now() - this.touchStartTime;

        // Safety check
        if (!this.touchStartPos) return;

        // If it was a long press, don't process as normal click
        if (this.isLongPress) {
            this.isLongPress = false;
            return;
        }

        // Check if it was a swipe
        const deltaX = touch.clientX - this.touchStartPos.x;
        const deltaY = touch.clientY - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.swipeThreshold) {
            this.handleSwipe(deltaX, deltaY);
            return;
        }

        // Normal tap
        if (touchDuration < this.longPressThreshold) {
            this.handleTap(touch);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();

        // If touch moved, cancel long press
        if (this.longPressTimer) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartPos.x;
            const deltaY = touch.clientY - this.touchStartPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Cancel if moved more than 10px
            if (distance > 10) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }

        // Show tooltip on touch move (for hex/enemy hover)
        const touch = e.touches[0];
        if (!this.canvasRect) this.updateRect();
        const rect = this.canvasRect || this.game.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hex = this.game.hexGrid.pixelToAxial(x, y);
        if (this.game.hexGrid.hasHex(hex.q, hex.r)) {
            // Show tooltip similar to mouse move
            this.showHexTooltip(touch, hex);
        }
    }

    handleTouchCancel(_e) {
        // Clear long press timer on cancel
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isLongPress = false;
    }

    handleTap(touch) {
        // Simulate click event
        if (!this.canvasRect) this.updateRect();
        const rect = this.canvasRect || this.game.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hex = this.game.hexGrid.pixelToAxial(x, y);

        if (!this.game.hexGrid.hasHex(hex.q, hex.r)) {
            return;
        }

        if (this.game.movementMode) {
            this.game.moveHero(hex.q, hex.r);
        } else {
            this.game.selectHex(hex.q, hex.r);
        }

        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    handleLongPress(touch) {
        // Long press = right click alternative
        if (!this.canvasRect) this.updateRect();
        const rect = this.canvasRect || this.game.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hex = this.game.hexGrid.pixelToAxial(x, y);

        if (!this.game.hexGrid.hasHex(hex.q, hex.r)) {
            return;
        }

        // Show context menu or info
        this.game.addLog(`Langes Drücken auf Hex ${hex.q},${hex.r}`, 'info');

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]); // Pattern for long press
        }

        // Could show a context menu here
        this.showHexContextMenu(hex);
    }

    handleSwipe(deltaX, deltaY) {
        // Determine swipe direction
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0) {
                // Swipe right - maybe cycle cards?
                this.game.addLog('Swipe rechts', 'info');
            } else {
                // Swipe left
                this.game.addLog('Swipe links', 'info');
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                // Swipe down - could show/hide panels
                this.game.addLog('Swipe runter', 'info');
            } else {
                // Swipe up
                this.game.addLog('Swipe hoch', 'info');
            }
        }
    }

    showHexTooltip(touch, hex) {
        // Check for enemy
        const enemy = this.game.enemies.find(e => e.position.q === hex.q && e.position.r === hex.r);
        if (enemy) {
            const dummyEl = {
                getBoundingClientRect: () => ({
                    left: touch.clientX,
                    top: touch.clientY,
                    width: 0,
                    height: 0,
                    right: touch.clientX,
                    bottom: touch.clientY
                })
            };
            this.game.ui.tooltipManager.showEnemyTooltip(dummyEl, enemy);
            return;
        }

        // Show terrain tooltip
        const hexData = this.game.hexGrid.getHex(hex.q, hex.r);
        if (hexData) {
            const dummyEl = {
                getBoundingClientRect: () => ({
                    left: touch.clientX,
                    top: touch.clientY,
                    width: 0,
                    height: 0,
                    right: touch.clientX,
                    bottom: touch.clientY
                })
            };
            this.game.ui.tooltipManager.showTerrainTooltip(dummyEl, hexData.terrain, {});
        }
    }

    showHexContextMenu(hex) {
        // Simple context menu for mobile
        const hexData = this.game.hexGrid.getHex(hex.q, hex.r);
        if (!hexData) return;

        const terrainName = this.game.terrain.getName(hexData.terrain);
        const enemy = this.game.enemies.find(e => e.position.q === hex.q && e.position.r === hex.r);

        let message = `Hex ${hex.q},${hex.r}\nTerrain: ${terrainName}`;
        if (enemy) {
            message += `\n\nFeind: ${enemy.name}\nRüstung: ${enemy.armor}\nAngriff: ${enemy.attack}`;
        }

        // Could use a custom modal instead of alert for better UX
        alert(message);
    }

    setupCardTouchEvents() {
        // Delegate touch events for cards
        const handContainer = document.getElementById('hand-cards');
        if (!handContainer) return;

        const signal = this.abortController.signal;

        handContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.card')) {
                e.preventDefault();
                const card = e.target.closest('.card');
                const index = parseInt(card.dataset.index);

                // Start long press timer for right-click alternative
                this.cardLongPressTimer = setTimeout(() => {
                    this.handleCardLongPress(index);
                }, this.longPressThreshold);
            }
        }, { passive: false, signal });

        handContainer.addEventListener('touchend', (e) => {
            if (e.target.closest('.card')) {
                e.preventDefault();

                if (this.cardLongPressTimer) {
                    clearTimeout(this.cardLongPressTimer);
                    this.cardLongPressTimer = null;

                    // Normal tap on card
                    const card = e.target.closest('.card');
                    const index = parseInt(card.dataset.index);
                    this.handleCardTap(index);
                }

                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        }, { signal });

        handContainer.addEventListener('touchcancel', () => {
            if (this.cardLongPressTimer) {
                clearTimeout(this.cardLongPressTimer);
                this.cardLongPressTimer = null;
            }
        }, { signal });
    }

    handleCardTap(index) {
        const card = this.game.hero.hand[index];
        if (card) {
            this.game.handleCardClick(index, card);
        }
    }

    handleCardLongPress(index) {
        const card = this.game.hero.hand[index];
        if (card) {
            this.game.handleCardRightClick(index, card);
        }

        // Haptic feedback for long press
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
    }

    setupViewportResize() {
        // Handle viewport changes (e.g., screen rotation)
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('orientationchange', this.resizeHandler);

        // Initial resize
        this.handleResize();
    }

    handleResize() {
        // Debounce resize
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.resizeTimer = setTimeout(() => {
            this.resizeCanvas();
        }, 100);
    }

    resizeCanvas() {
        if (!this.game.canvas || !this.game.canvas.parentElement) return;

        // Check for context before proceeding
        if (typeof this.game.canvas.getContext !== 'function') return;
        const ctx = this.game.canvas.getContext('2d');
        if (!ctx) return;

        const container = this.game.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Calculate new canvas size based on container
        const width = rect.width;
        const height = rect.height;

        if (width > 0 && height > 0) {
            this.game.canvas.width = width;
            this.game.canvas.height = height;

            // Also resize particle canvas
            if (this.game.particleCanvas) {
                this.game.particleCanvas.width = width;
                this.game.particleCanvas.height = height;
            }

            // Re-render
            if (this.game.hero && typeof this.game.hero.getStats === 'function' && this.game.render) {
                try {
                    this.game.render();
                } catch (e) {
                    console.warn('Render failed during resize:', e.message);
                }
            }

            console.log(`Canvas resized to ${width}x${height}`);
        }

        // Update cached rect
        this.updateRect();
    }

    updateRect() {
        if (this.game && this.game.canvas) {
            this.canvasRect = this.game.canvas.getBoundingClientRect();
        }
    }



    // Utility: Check if device is touch-enabled
    static isTouchDevice() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    }

    // Utility: Get device pixel ratio for crisp rendering
    static getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }
}

export default TouchController;
