// Touch Controls Module for Mage Knight
// Handles touch events for mobile devices

export class TouchController {
    constructor(game) {
        this.game = game;
        this.touchStartTime = 0;
        this.touchStartPos = null;
        this.longPressTimer = null;
        this.longPressThreshold = 500; // ms
        this.isLongPress = false;
        this.swipeThreshold = 50; // pixels

        this.setupTouchEvents();
        this.setupViewportResize();
    }

    setupTouchEvents() {
        const canvas = this.game.canvas;

        // Touch start
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });

        // Touch end
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Touch move
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        // Touch cancel
        canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));

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
        const rect = this.game.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hex = this.game.hexGrid.pixelToAxial(x, y);
        if (this.game.hexGrid.hasHex(hex.q, hex.r)) {
            // Show tooltip similar to mouse move
            this.showHexTooltip(touch, hex);
        }
    }

    handleTouchCancel(e) {
        // Clear long press timer on cancel
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isLongPress = false;
    }

    handleTap(touch) {
        // Simulate click event
        const rect = this.game.canvas.getBoundingClientRect();
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
        const rect = this.game.canvas.getBoundingClientRect();
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
        }, { passive: false });

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
        });

        handContainer.addEventListener('touchcancel', () => {
            if (this.cardLongPressTimer) {
                clearTimeout(this.cardLongPressTimer);
                this.cardLongPressTimer = null;
            }
        });
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
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => this.handleResize());

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
            if (this.game.hero && typeof this.game.hero.getStats === 'function') {
                this.game.render();
            }

            console.log(`Canvas resized to ${width}x${height}`);
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
