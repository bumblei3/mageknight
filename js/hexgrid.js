// Hex Grid System using Axial Coordinates
// Reference: https://www.redblobgames.com/grids/hexagons/

export class HexGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hexSize = 40;
        this.hexes = new Map(); // Store hex data by "q,r" key
        this.selectedHex = null;
        this.highlightedHexes = new Set();
        this.debugMode = false;
    }

    // Axial to Pixel conversion
    axialToPixel(q, r) {
        const x = this.hexSize * (3 / 2 * q);
        const y = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x: x + this.canvas.width / 2, y: y + this.canvas.height / 2 };
    }

    // Pixel to Axial conversion
    pixelToAxial(x, y) {
        x = x - this.canvas.width / 2;
        y = y - this.canvas.height / 2;

        const q = (2 / 3 * x) / this.hexSize;
        const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.hexSize;

        return this.roundAxial(q, r);
    }

    // Round floating point axial coordinates to nearest hex
    roundAxial(q, r) {
        const s = -q - r;

        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const q_diff = Math.abs(rq - q);
        const r_diff = Math.abs(rr - r);
        const s_diff = Math.abs(rs - s);

        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }

        return { q: rq, r: rr };
    }

    // Get hex neighbors
    getNeighbors(q, r) {
        const directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];

        return directions.map(dir => ({
            q: q + dir.q,
            r: r + dir.r
        }));
    }

    // Calculate distance between two hexes
    distance(q1, r1, q2, r2) {
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    // Get hexes within range
    getHexesInRange(q, r, range) {
        const results = [];
        for (let dq = -range; dq <= range; dq++) {
            for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
                results.push({ q: q + dq, r: r + dr });
            }
        }
        return results;
    }

    // Draw a single hexagon
    drawHex(q, r, options = {}) {
        const pos = this.axialToPixel(q, r);
        const { fillColor = '#1a1a2e', strokeColor = '#374151', lineWidth = 2, highlight = false } = options;

        // Draw hex path
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const x = pos.x + this.hexSize * Math.cos(angle);
            const y = pos.y + this.hexSize * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();

        // Create radial gradient for 3D effect
        const gradient = this.ctx.createRadialGradient(
            pos.x, pos.y - this.hexSize * 0.3, 0,
            pos.x, pos.y, this.hexSize
        );

        // Parse fill color and create gradient
        const baseColor = fillColor;
        gradient.addColorStop(0, this.lightenColor(baseColor, 20));
        gradient.addColorStop(0.6, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 20));

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add inner shadow for depth
        this.ctx.save();
        this.ctx.clip();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 3;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Draw outer border
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        // Highlight effect
        if (highlight) {
            // Glow effect
            this.ctx.save();
            this.ctx.shadowColor = '#8b5cf6';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = '#8b5cf6';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.restore();

            // Animated pulse (simulated with opacity)
            this.ctx.globalAlpha = 0.3;
            this.ctx.strokeStyle = '#ec4899';
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }
    }

    // Helper function to lighten color
    lightenColor(color, percent) {
        // Simple lightening - assumes hex color
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    // Helper function to darken color
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    // Draw text in hex center
    drawHexText(q, r, text, options = {}) {
        const pos = this.axialToPixel(q, r);
        const { fontSize = 14, color = '#f9fafb', align = 'center' } = options;

        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, pos.x, pos.y);
    }

    // Draw icon/emoji in hex
    drawHexIcon(q, r, icon, offsetY = 0) {
        const pos = this.axialToPixel(q, r);
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icon, pos.x, pos.y + offsetY);
    }

    // Create a hex key for the map
    getHexKey(q, r) {
        return `${q},${r}`;
    }

    // Add hex data to the grid
    setHex(q, r, data) {
        const key = this.getHexKey(q, r);
        this.hexes.set(key, { q, r, ...data });
    }

    // Get hex data
    getHex(q, r) {
        const key = this.getHexKey(q, r);
        return this.hexes.get(key);
    }

    // Check if hex exists
    hasHex(q, r) {
        const key = this.getHexKey(q, r);
        return this.hexes.has(key);
    }

    // Clear the canvas
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Render the entire grid
    render(hero = null, enemies = []) {
        this.clear();

        // Draw all hexes
        for (const [key, hexData] of this.hexes) {
            const isHighlighted = this.highlightedHexes.has(key);
            const isSelected = this.selectedHex &&
                this.selectedHex.q === hexData.q &&
                this.selectedHex.r === hexData.r;

            // Determine hex color based on terrain
            let fillColor = this.getTerrainColor(hexData.terrain);

            this.drawHex(hexData.q, hexData.r, {
                fillColor,
                highlight: isHighlighted || isSelected
            });

            // Draw terrain icon
            if (hexData.terrain) {
                // If there is a site, draw site icon instead or in addition?
                // Let's draw site icon prominent, terrain icon smaller or background?
                // For now: Site icon replaces terrain icon if present
                if (hexData.site) {
                    this.drawHexIcon(hexData.q, hexData.r, hexData.site.getIcon(), -10);
                    // Draw site name small below
                    // this.drawHexText(hexData.q, hexData.r, hexData.site.getName(), { fontSize: 10, color: '#fff', align: 'center' });
                } else {
                    this.drawHexIcon(hexData.q, hexData.r, this.getTerrainIcon(hexData.terrain), -10);
                }
            }

            // Draw coordinates (for debugging)
            if (this.debugMode) {
                this.drawHexText(hexData.q, hexData.r, `${hexData.q},${hexData.r}`, { fontSize: 10, color: '#fff', align: 'center', offsetY: 15 });
            }
        }

        // Draw enemies
        enemies.forEach(enemy => {
            if (enemy.position) {
                this.drawHexIcon(enemy.position.q, enemy.position.r, enemy.icon || '👹', 10);
            }
        });

        // Draw hero
        if (hero) {
            const pos = hero.displayPosition || hero.position;
            if (pos) {
                // Use float coordinates for smooth movement
                const pixel = this.axialToPixel(pos.q, pos.r);
                this.drawHeroAt(pixel.x, pixel.y);
            }
        }
    }

    drawHeroAt(x, y) {
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🧙', x, y);
    }

    // Get terrain color
    getTerrainColor(terrain) {
        const colors = {
            plains: '#4ade80',
            forest: '#22c55e',
            hills: '#a16207',
            mountains: '#78716c',
            desert: '#fbbf24',
            wasteland: '#6b7280',
            water: '#3b82f6'
        };
        return colors[terrain] || '#1a1a2e';
    }

    // Get terrain icon
    getTerrainIcon(terrain) {
        const icons = {
            plains: '🌾',
            forest: '🌲',
            hills: '⛰️',
            mountains: '🏔️',
            desert: '🏜️',
            wasteland: '☠️',
            water: '💧'
        };
        return icons[terrain] || '';
    }

    // Highlight hexes (for movement range, etc.)
    highlightHexes(hexList) {
        this.highlightedHexes.clear();
        hexList.forEach(hex => {
            const key = this.getHexKey(hex.q, hex.r);
            this.highlightedHexes.add(key);
        });
    }

    // Clear highlights
    clearHighlights() {
        this.highlightedHexes.clear();
    }

    // Select a hex
    selectHex(q, r) {
        this.selectedHex = { q, r };
    }

    // Clear selection
    clearSelection() {
        this.selectedHex = null;
    }
}
