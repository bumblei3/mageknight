export default class TouchController {
    private game: any;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    public longPressTimer: any = null;
    public isLongPress: boolean = false;

    constructor(game: any) {
        this.game = game;
        this.setupTouchListeners();
    }

    setupTouchListeners() {
        const board = document.getElementById('game-board');
        if (!board) return;

        board.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        board.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        board.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        board.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
    }

    handleTouchStart(e: any) {
        if (e.touches && e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    handleTouchMove(e: any) {
        e.preventDefault?.();

        if (!e.touches || e.touches.length === 0) return;

        const touch = e.touches[0];
        const canvas = this.game.canvas;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect?.() || { left: 0, top: 0 };
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (this.game.hexGrid?.pixelToAxial && this.game.hexGrid?.hasHex) {
            const hex = this.game.hexGrid.pixelToAxial(x, y);
            if (this.game.hexGrid.hasHex(hex.q, hex.r)) {
                const enemy = this.game.enemies?.find((en: any) =>
                    en.position?.q === hex.q && en.position?.r === hex.r);
                if (enemy && this.game.ui?.tooltipManager?.showEnemyTooltip) {
                    this.game.ui.tooltipManager.showEnemyTooltip(enemy, touch.clientX, touch.clientY);
                } else if (this.game.hexGrid.getHex && this.game.ui?.tooltipManager?.showTerrainTooltip) {
                    const hexData = this.game.hexGrid.getHex(hex.q, hex.r);
                    if (hexData?.terrain) {
                        this.game.ui.tooltipManager.showTerrainTooltip(hexData.terrain, touch.clientX, touch.clientY);
                    }
                }
            }
        }
    }

    handleTouchEnd(e: TouchEvent) {
        // Simple tap detection
    }

    handleTouchCancel(e: any) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isLongPress = false;
    }

    handleSwipe(deltaX: number, deltaY: number) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY < 0) {
                this.game.addLog?.('Swipe hoch', 'info');
            } else {
                this.game.addLog?.('Swipe runter', 'info');
            }
        } else {
            if (deltaX > 0) {
                this.game.addLog?.('Swipe rechts', 'info');
            } else {
                this.game.addLog?.('Swipe links', 'info');
            }
        }
    }

    handleCardLongPress(cardIndex: number) {
        if (this.game.hero?.hand && cardIndex < this.game.hero.hand.length) {
            this.game.handleCardRightClick?.(cardIndex);
        }
    }

    static isTouchDevice() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0));
    }

    destroy() {
        // Remove listeners
    }
}

export { TouchController };
