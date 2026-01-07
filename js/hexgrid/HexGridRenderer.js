/**
 * HexGridRenderer - Rendering functions for hex grid
 * Handles all canvas drawing, textures, highlighting, and visual effects
 */
export class HexGridRenderer {
    constructor(canvas, logic) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.logic = logic; // Reference to HexGridLogic
        this.hexSize = logic.hexSize;
        this.selectedHex = null;
        this.highlightedHexes = new Set();
        this.animationFrame = 0;
        this.ambientLight = 1.0;
        this.heroPosition = null;
        this.visionRadius = 2;
        this.debugMode = false;
    }

    // ========== Coordinate Helpers (delegate to logic with canvas offset) ==========

    axialToPixel(q, r) {
        const offset = this.logic.axialToPixelOffset(q, r);
        return {
            x: offset.x + this.canvas.width / 2,
            y: offset.y + this.canvas.height / 2
        };
    }

    pixelToAxial(x, y) {
        const offsetX = x - this.canvas.width / 2;
        const offsetY = y - this.canvas.height / 2;
        return this.logic.pixelOffsetToAxial(offsetX, offsetY);
    }

    // ========== State ==========

    setTimeOfDay(isNight) {
        this.ambientLight = isNight ? 0.6 : 1.0;
    }

    highlightHexes(hexList) {
        this.highlightedHexes.clear();
        hexList.forEach(hex => {
            this.highlightedHexes.add(this.logic.getHexKey(hex.q, hex.r));
        });
    }

    clearHighlights() {
        this.highlightedHexes.clear();
    }

    selectHex(q, r) {
        this.selectedHex = { q, r };
    }

    clearSelection() {
        this.selectedHex = null;
    }

    // ========== Core Rendering ==========

    clear() {
        // Use width/height to clear if already matching, technically clearRect is fine but sometimes resetting width is faster?
        // Actually clearRect is standard. Let's just ensure we don't read width/height unnecessarily if we can cache it.
        // But for now clearRect is standard.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(hero = null, enemies = []) {
        this.animationFrame++;
        this.clear();

        if (hero) {
            this.heroPosition = hero.position;
        }

        // Draw all hexes
        for (const [key, hexData] of this.logic.hexes) {
            const isHighlighted = this.highlightedHexes.has(key);
            const isSelected = this.selectedHex &&
                this.selectedHex.q === hexData.q &&
                this.selectedHex.r === hexData.r;

            const fillColor = this.getTerrainColor(hexData.terrain);

            this.drawHex(hexData.q, hexData.r, {
                fillColor,
                highlight: isHighlighted || isSelected,
                revealed: hexData.revealed,
                terrain: hexData.terrain
            });

            if (!hexData.revealed) continue;

            if (hexData.terrain) {
                if (hexData.site) {
                    this.drawHexIcon(hexData.q, hexData.r, hexData.site.getIcon(), -10);
                } else {
                    this.drawHexIcon(hexData.q, hexData.r, this.getTerrainIcon(hexData.terrain), -10);
                }
            }

            if (this.debugMode) {
                this.drawHexText(hexData.q, hexData.r, `${hexData.q},${hexData.r}`, { fontSize: 10 });
            }
        }

        // Draw enemies
        enemies.forEach(enemy => {
            if (enemy.position) {
                this.drawEnemy(enemy.position.q, enemy.position.r, enemy);
            }
        });

        // Draw hero
        if (hero) {
            const pos = hero.displayPosition || hero.position;
            if (pos) {
                const pixel = this.axialToPixel(pos.q, pos.r);
                this.drawHeroAt(pixel.x, pixel.y);
            }
        }
    }

    // ========== Hex Drawing ==========

    drawHex(q, r, options = {}) {
        const pos = this.axialToPixel(q, r);
        const { fillColor = '#1a1a2e', strokeColor = '#374151', lineWidth = 2, highlight = false, revealed = true, terrain = null } = options;

        // Draw hex path
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const x = pos.x + this.hexSize * Math.cos(angle);
            const y = pos.y + this.hexSize * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        // Fill
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Apply lighting
        let effectiveLight = this.ambientLight;
        if (this.ambientLight < 1.0 && this.heroPosition) {
            const dist = this.logic.distance(q, r, this.heroPosition.q, this.heroPosition.r);
            if (dist <= this.visionRadius) {
                const t = dist / (this.visionRadius + 1);
                effectiveLight = 1.0 - t * (1.0 - this.ambientLight);
            }
        }

        if (effectiveLight < 1.0) {
            this.ctx.fillStyle = `rgba(0, 0, 20, ${1 - effectiveLight})`;
            this.ctx.fill();
        }

        // 3D gradient effect
        const gradient = this.ctx.createRadialGradient(
            pos.x, pos.y - this.hexSize * 0.3, 0,
            pos.x, pos.y, this.hexSize
        );
        const baseColor = this.applyLighting(fillColor, effectiveLight);
        gradient.addColorStop(0, this.lightenColor(baseColor, 20 * effectiveLight));
        gradient.addColorStop(0.6, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 20));

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Terrain texture
        if (revealed && terrain) {
            this.drawTerrainTexture(pos, terrain);
        }

        // Fog of War
        if (!revealed) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('?', pos.x, pos.y);
        }

        // Inner shadow
        this.ctx.save();
        this.ctx.clip();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 3;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Outer border
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        // Highlight
        if (highlight) {
            this.ctx.save();
            this.ctx.shadowColor = '#8b5cf6';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#8b5cf6';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.restore();
            this.ctx.globalAlpha = 0.3;
            this.ctx.strokeStyle = '#ec4899';
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }
    }

    drawHexText(q, r, text, options = {}) {
        const pos = this.axialToPixel(q, r);
        const { fontSize = 14, color = '#f9fafb', align = 'center' } = options;
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, pos.x, pos.y);
    }

    drawHexIcon(q, r, icon, offsetY = 0) {
        const pos = this.axialToPixel(q, r);
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icon, pos.x, pos.y + offsetY);
    }

    // ========== Entity Rendering ==========

    drawEnemy(q, r, enemy) {
        const pos = this.axialToPixel(q, r);
        const radius = 18;

        this.ctx.save();
        this.ctx.shadowColor = enemy.color || '#ef4444';
        this.ctx.shadowBlur = 10;

        const gradient = this.ctx.createRadialGradient(
            pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
            pos.x, pos.y, radius
        );
        const baseColor = enemy.color || '#ef4444';
        gradient.addColorStop(0, this.lightenColor(baseColor, 40));
        gradient.addColorStop(0.6, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 20));

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y + 10, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = this.lightenColor(baseColor, 60);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(enemy.icon || '👹', pos.x, pos.y + 10);

        if (enemy.armor) {
            const barWidth = 30, barHeight = 3;
            const barX = pos.x - barWidth / 2, barY = pos.y - 12;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.fillRect(barX, barY, barWidth * Math.min(1, enemy.armor / 10), barHeight);
        }
    }

    drawHeroAt(x, y) {
        this.ctx.save();
        const pulse = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
        const gradient = this.ctx.createRadialGradient(x, y, 5, x, y, 40 + pulse * 10);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 50, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 10 + pulse * 10;
        this.ctx.shadowColor = '#a855f7';
        this.ctx.font = '34px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🧙', x, y);
        this.ctx.restore();
    }

    // ========== Textures ==========

    drawTerrainTexture(pos, terrain) {
        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const x = pos.x + this.hexSize * Math.cos(angle);
            const y = pos.y + this.hexSize * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.clip();

        switch (terrain) {
        case 'water': this.drawWaterTexture(pos); break;
        case 'forest': this.drawForestTexture(pos); break;
        case 'mountains': this.drawMountainTexture(pos); break;
        case 'desert': this.drawDesertTexture(pos); break;
        case 'plains': this.drawPlainsTexture(pos); break;
        }
        this.ctx.restore();
    }

    drawWaterTexture(pos) {
        const wave = Math.sin(this.animationFrame * 0.05 + pos.x * 0.01) * 0.1;
        this.ctx.globalAlpha = 0.15 + wave * 0.1;
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.fillRect(pos.x - this.hexSize, pos.y - this.hexSize, this.hexSize * 2, this.hexSize * 2);
        this.ctx.globalAlpha = 1.0;
    }

    drawForestTexture(pos) {
        const seed = pos.x * 7 + pos.y * 13;
        this.ctx.globalAlpha = 0.15;
        for (let i = 0; i < 6; i++) {
            const offsetX = (((seed + i * 37) % 80) - 40) * 0.6;
            const offsetY = (((seed + i * 53) % 80) - 40) * 0.6;
            const treeSize = 4 + ((seed + i) % 4);
            this.ctx.fillStyle = '#166534';
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x + offsetX, pos.y + offsetY - treeSize);
            this.ctx.lineTo(pos.x + offsetX - treeSize, pos.y + offsetY);
            this.ctx.lineTo(pos.x + offsetX + treeSize, pos.y + offsetY);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawMountainTexture(pos) {
        const seed = pos.x * 11 + pos.y * 19;
        this.ctx.globalAlpha = 0.2;
        for (let i = 0; i < 3; i++) {
            const offsetX = (((seed + i * 23) % 60) - 30) * 0.5;
            const offsetY = (((seed + i * 17) % 40) - 20) * 0.4;
            const peakHeight = 8 + ((seed + i) % 6);
            const peakWidth = 6 + ((seed + i * 3) % 5);
            this.ctx.fillStyle = '#78716c';
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x + offsetX, pos.y + offsetY - peakHeight);
            this.ctx.lineTo(pos.x + offsetX - peakWidth, pos.y + offsetY + 4);
            this.ctx.lineTo(pos.x + offsetX + peakWidth, pos.y + offsetY + 4);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawDesertTexture(pos) {
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#f59e0b';
        const seed = pos.x * 11 + pos.y * 17;
        for (let i = 0; i < 8; i++) {
            const y = pos.y - this.hexSize / 2 + i * 5;
            const offset = Math.sin((seed + i) * 0.5) * 3;
            this.ctx.fillRect(pos.x - this.hexSize + offset, y, this.hexSize * 1.5, 1);
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawPlainsTexture(pos) {
        const seed = pos.x * 5 + pos.y * 11;
        this.ctx.globalAlpha = 0.12;
        this.ctx.strokeStyle = '#15803d';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 18; i++) {
            const x = pos.x + (((seed + i * 5) % 100) - 50) * 0.5;
            const y = pos.y + (((seed + i * 7) % 100) - 50) * 0.5;
            const height = 3 + ((seed + i) % 4);
            const sway = Math.sin((seed + i) * 0.3) * 2;
            for (let j = -1; j <= 1; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(x + j, y);
                this.ctx.quadraticCurveTo(x + j + sway * 0.5, y - height * 0.6, x + sway + j * 0.5, y - height);
                this.ctx.stroke();
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    // ========== Color Helpers ==========

    getTerrainColor(terrain) {
        const colors = { plains: '#4ade80', forest: '#22c55e', hills: '#a16207', mountains: '#78716c', desert: '#fbbf24', wasteland: '#6b7280', water: '#3b82f6' };
        return colors[terrain] || '#1a1a2e';
    }

    getTerrainIcon(terrain) {
        const icons = { plains: '🌾', forest: '🌲', hills: '⛰️', mountains: '🏔️', desert: '🏜️', wasteland: '☠️', water: '💧' };
        return icons[terrain] || '';
    }

    applyLighting(color, lightLevel) {
        const num = parseInt(color.replace('#', ''), 16);
        const R = Math.floor(((num >> 16) & 0xFF) * lightLevel);
        const G = Math.floor(((num >> 8) & 0xFF) * lightLevel);
        const B = Math.floor((num & 0xFF) * lightLevel);
        return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
}
