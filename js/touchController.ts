import { eventBus } from './eventBus';
import { GAME_EVENTS } from './constants';

export default class TouchController {
    private game: any;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private longPressTimer: any = null;
    public isLongPress: boolean = false;

    // Pinch zoom state
    private initialDistance: number = 0;
    private initialScale: number = 1;
    private currentScale: number = 1;
    private isPinching: boolean = false;
    private pinchCenter: { x: number; y: number } = { x: 0, y: 0 };

    // Pan state
    private isPanning: boolean = false;
    private panStartX: number = 0;
    private panStartY: number = 0;
    private panOffsetX: number = 0;
    private panOffsetY: number = 0;

    // Card drag state
    private draggedCardIndex: number | null = null;
    private draggedCardElement: HTMLElement | null = null;
    private dragGhost: HTMLElement | null = null;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private validDropZones: HTMLElement[] = [];

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

        // Check for pinch zoom (2 fingers)
        if (e.touches.length === 2) {
            this.isPinching = true;
            this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            this.initialScale = this.currentScale;
            this.pinchCenter = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
            return;
        }

        // Check for pan (2 fingers but moved, or single finger on empty space)
        if (e.touches.length >= 2 || (e.touches.length === 1 && !this.isOverDraggableCard(e.touches[0]))) {
            this.isPanning = true;
            this.panStartX = e.touches[0].clientX - this.panOffsetX;
            this.panStartY = e.touches[0].clientY - this.panOffsetY;
            return;
        }

        // Check for card drag start (single finger on card)
        const touch = e.touches[0];
        const cardEl = this.findCardElement(touch.target as Element);
        if (cardEl && !this.isWoundCard(cardEl)) {
            this.draggedCardIndex = parseInt(cardEl.dataset.index || '-1');
            this.draggedCardElement = cardEl;
            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;
            
            // Create drag ghost
            this.createDragGhost(cardEl, touch.clientX, touch.clientY);
            
            // Find valid drop zones (empty hexes, enemies, etc.)
            this.findValidDropZones();
            
            // Disable pan while dragging card
            this.isPanning = false;
        }
    }

    handleTouchMove(e: any) {
        e.preventDefault?.();

        if (!e.touches || e.touches.length === 0) return;

        // Pinch zoom
        if (this.isPinching && e.touches.length === 2) {
            const distance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = Math.max(0.5, Math.min(2.5, this.initialScale * (distance / this.initialDistance)));
            this.applyZoom(scale, this.pinchCenter);
            return;
        }

        // Pan
        if (this.isPanning && !this.draggedCardElement) {
            this.panOffsetX = e.touches[0].clientX - this.panStartX;
            this.panOffsetY = e.touches[0].clientY - this.panStartY;
            this.applyPan();
            return;
        }

        // Card drag
        if (this.draggedCardElement && this.dragGhost) {
            const touch = e.touches[0];
            this.updateDragGhost(touch.clientX, touch.clientY);
            this.checkDropZone(touch.clientX, touch.clientY);
            return;
        }

        // Tooltip hover (single finger move)
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

                const fakeElement = {
                    getBoundingClientRect: () => ({
                        left: touch.clientX,
                        top: touch.clientY,
                        right: touch.clientX,
                        bottom: touch.clientY,
                        width: 0,
                        height: 0,
                        x: touch.clientX,
                        y: touch.clientY,
                        toJSON: () => { }
                    } as DOMRect)
                } as HTMLElement;

                if (enemy && this.game.ui?.tooltipManager?.showEnemyTooltip) {
                    this.game.ui.tooltipManager.showEnemyTooltip(fakeElement, enemy);
                } else {
                    const hexData = this.game.hexGrid.getHex(hex.q, hex.r);
                    if (hexData?.site && this.game.ui?.tooltipManager?.showSiteTooltip) {
                        this.game.ui.tooltipManager.showSiteTooltip(fakeElement, hexData.site);
                    } else if (hexData?.terrain && this.game.ui?.tooltipManager?.showTerrainTooltip) {
                        this.game.ui.tooltipManager.showTerrainTooltip(fakeElement, hexData.terrain, this.game);
                    } else {
                        this.game.ui.tooltipManager?.hideTooltip();
                    }
                }
            }
        }
    }

    handleTouchEnd(e: TouchEvent) {
        // Card drop
        if (this.draggedCardElement && this.dragGhost) {
            const touch = e.changedTouches[0];
            const dropZone = this.findDropZoneAt(touch.clientX, touch.clientY);
            if (dropZone) {
                this.handleCardDrop(dropZone);
            }
            this.cleanupDrag();
            return;
        }

        // Pinch end
        if (this.isPinching) {
            this.isPinching = false;
        }

        // Pan end
        this.isPanning = false;
    }

    handleTouchCancel(e: any) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isLongPress = false;
        
        if (this.draggedCardElement && this.dragGhost) {
            this.cleanupDrag();
        }
        this.isPinching = false;
        this.isPanning = false;
    }

    private getDistance(touch1: Touch, touch2: Touch): number {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private applyZoom(scale: number, center: { x: number; y: number }) {
        this.currentScale = scale;
        const canvas = this.game.canvas;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const offsetX = (center.x - rect.left) * (1 - scale);
        const offsetY = (center.y - rect.top) * (1 - scale);

        canvas.style.transform = `scale(${scale}) translate(${this.panOffsetX / scale}px, ${this.panOffsetY / scale}px)`;
        canvas.style.transformOrigin = `${center.x - rect.left}px ${center.y - rect.top}px`;
    }

    private applyPan() {
        const canvas = this.game.canvas;
        if (!canvas) return;

        canvas.style.transform = `scale(${this.currentScale}) translate(${this.panOffsetX}px, ${this.panOffsetY}px)`;
    }

    private isOverDraggableCard(target: any): boolean {
        if (!target || typeof target !== 'object' || !('classList' in target)) {
            return false;
        }
        const cardEl = this.findCardElement(target as Element);
        return cardEl !== null && !this.isWoundCard(cardEl);
    }

    private findCardElement(target: Element): HTMLElement | null {
        let el = target as HTMLElement;
        while (el && el !== document.body) {
            if (el.classList.contains('card') && el.dataset.index) {
                return el;
            }
            el = el.parentElement as HTMLElement;
        }
        return null;
    }

    private isWoundCard(cardEl: HTMLElement): boolean {
        return cardEl.classList.contains('wound-card');
    }

    private createDragGhost(cardEl: HTMLElement, x: number, y: number) {
        this.dragGhost = cardEl.cloneNode(true) as HTMLElement;
        this.dragGhost.classList.add('card-drag-ghost');
        this.dragGhost.style.position = 'fixed';
        this.dragGhost.style.pointerEvents = 'none';
        this.dragGhost.style.zIndex = '9999';
        this.dragGhost.style.opacity = '0.8';
        this.dragGhost.style.transform = `translate(${x - this.getCardWidth(cardEl) / 2}px, ${y - this.getCardHeight(cardEl) / 2}px)`;
        document.body.appendChild(this.dragGhost);
        
        // Hide original card
        cardEl.style.opacity = '0.3';
    }

    private getCardWidth(cardEl: HTMLElement): number {
        return cardEl.getBoundingClientRect().width;
    }

    private getCardHeight(cardEl: HTMLElement): number {
        return cardEl.getBoundingClientRect().height;
    }

    private updateDragGhost(x: number, y: number) {
        if (!this.dragGhost) return;
        this.dragGhost.style.transform = `translate(${x - this.getCardWidth(this.draggedCardElement!) / 2}px, ${y - this.getCardHeight(this.draggedCardElement!) / 2}px)`;
    }

    private findValidDropZones() {
        // Find all valid drop targets on the map
        this.validDropZones = [];
        const board = document.getElementById('game-board');
        if (!board) return;

        // If we have reachable hexes, those are valid drop zones for movement
        if (this.game.reachableHexes && this.game.reachableHexes.length > 0) {
            this.game.reachableHexes.forEach((hex: any) => {
                const pixel = this.game.hexGrid.axialToPixel(hex.q, hex.r);
                const canvas = this.game.canvas;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const dropZone = this.createDropZoneElement(pixel.x + rect.left, pixel.y + rect.top, { type: 'move', hex });
                this.validDropZones.push(dropZone);
            });
        }

        // Enemies are valid drop zones for attack
        if (this.game.enemies) {
            this.game.enemies.forEach((enemy: any) => {
                if (enemy.position && !enemy.isDefeated?.()) {
                    const pixel = this.game.hexGrid.axialToPixel(enemy.position.q, enemy.position.r);
                    const canvas = this.game.canvas;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const dropZone = this.createDropZoneElement(pixel.x + rect.left, pixel.y + rect.top, { type: 'attack', enemy });
                    this.validDropZones.push(dropZone);
                }
            });
        }
    }

    private createDropZoneElement(x: number, y: number, data: any): HTMLElement {
        const el = document.createElement('div');
        el.className = 'touch-drop-zone';
        el.style.position = 'fixed';
        el.style.left = `${x - 30}px`;
        el.style.top = `${y - 30}px`;
        el.style.width = '60px';
        el.style.height = '60px';
        el.style.borderRadius = '50%';
        el.style.border = '2px dashed #fbbf24';
        el.style.background = 'rgba(251, 191, 36, 0.2)';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '1000';
        (el as any).dataset.dropData = JSON.stringify(data);
        document.body.appendChild(el);
        return el;
    }

    private checkDropZone(x: number, y: number) {
        // Highlight nearest drop zone
        let nearest: HTMLElement | null = null;
        let minDist = Infinity;

        this.validDropZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const zoneX = rect.left + rect.width / 2;
            const zoneY = rect.top + rect.height / 2;
            const dist = Math.sqrt((zoneX - x) ** 2 + (zoneY - y) ** 2);
            if (dist < minDist && dist < 50) {
                minDist = dist;
                nearest = zone;
            }
        });

        // Update visual feedback
        this.validDropZones.forEach(zone => {
            zone.style.borderColor = zone === nearest ? '#10b981' : '#fbbf24';
            zone.style.background = zone === nearest ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.2)';
        });
    }

    private findDropZoneAt(x: number, y: number): any {
        let nearest: HTMLElement | null = null;
        let minDist = Infinity;

        this.validDropZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const zoneX = rect.left + rect.width / 2;
            const zoneY = rect.top + rect.height / 2;
            const dist = Math.sqrt((zoneX - x) ** 2 + (zoneY - y) ** 2);
            if (dist < minDist && dist < 50) {
                minDist = dist;
                nearest = zone;
            }
        });

        if (nearest) {
            try {
                return JSON.parse((nearest as any).dataset.dropData || '{}');
            } catch {
                return null;
            }
        }
        return null;
    }

    private handleCardDrop(dropData: any) {
        if (!this.draggedCardElement || this.draggedCardIndex === null) return;

        if (dropData.type === 'move' && dropData.hex) {
            // Move hero to hex
            this.game.hero.movementPoints = this.game.hero.movementPoints || 0;
            this.game.moveHero(dropData.hex.q, dropData.hex.r);
        } else if (dropData.type === 'attack' && dropData.enemy) {
            // Start combat with enemy
            const enemyIndex = this.game.enemies.findIndex((e: any) => e === dropData.enemy);
            if (enemyIndex >= 0) {
                this.game.initiateCombat(enemyIndex);
            }
        }

        eventBus.emit(GAME_EVENTS.CARD_PLAYED, { 
            cardIndex: this.draggedCardIndex,
            dropData 
        });
    }

    private cleanupDrag() {
        // Remove drag ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        // Restore original card
        if (this.draggedCardElement) {
            this.draggedCardElement.style.opacity = '1';
            this.draggedCardElement = null;
        }

        // Remove drop zones
        this.validDropZones.forEach(zone => zone.remove());
        this.validDropZones = [];

        this.draggedCardIndex = null;
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
        this.cleanupDrag();
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
}

export { TouchController };