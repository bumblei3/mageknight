// Hex Grid System using Axial Coordinates
// Reference: https://www.redblobgames.com/grids/hexagons/

/**
 * Hexagon Grid System
 * Handles coordinate systems (Axial/Pixel), rendering, and pathfinding on the map.
 * Based on: https://www.redblobgames.com/grids/hexagons/
 */
export class HexGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hexSize = 40;
        this.hexes = new Map(); // Store hex data by "q,r" key
        this.selectedHex = null;
        this.highlightedHexes = new Set();
        this.debugMode = false;
        this.animationFrame = 0; // For animated water/lava
        this.ambientLight = 1.0; // Global lighting (0.0-1.0)
        this.heroPosition = null; // Track hero position for vision
        this.visionRadius = 2; // Default vision radius
        this.terrainSystem = null; // Reference to terrain system for costs
    }

    setTerrainSystem(terrainSystem) {
        this.terrainSystem = terrainSystem;
    }

    // Axial to Pixel conversion
    /**
     * Converts axial (q, r) coordinates to screen pixel (x, y).
     * @param {number} q - Column
     * @param {number} r - Row
     * @returns {Object} {x, y} pixel coordinates
     */
    axialToPixel(q, r) {
        const x = this.hexSize * (3 / 2 * q);
        const y = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x: x + this.canvas.width / 2, y: y + this.canvas.height / 2 };
    }

    getScreenPos(q, r) { return this.axialToPixel(q, r); }

    // Pixel to Axial conversion
    /**
     * Converts screen pixel (x, y) to axial (q, r) coordinates.
     * @param {number} x - Screen X
     * @param {number} y - Screen Y
     * @returns {Object} {q, r} axial coordinates (rounded)
     */
    pixelToAxial(x, y) {
        x = x - this.canvas.width / 2;
        y = y - this.canvas.height / 2;

        const q = (2 / 3 * x) / this.hexSize;
        const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.hexSize;

        return this.roundAxial(q, r);
    }

    // Round floating point axial coordinates to nearest hex
    /**
     * Rounds floating point axial coordinates to the nearest valid hex.
     * @param {number} q
     * @param {number} r
     * @returns {Object} {q, r} integers
     */
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
    /**
     * Calculates the manhattan distance between two hexes.
     * @param {number} q1
     * @param {number} r1
     * @param {number} q2
     * @param {number} r2
     * @returns {number} Distance in hex steps
     */
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

    /**
     * Explore adjacent hexes from a center point.
     * Reveals hidden hexes and returns the newly revealed ones.
     * @param {Object} center - {q, r} center for exploration
     * @returns {Array} List of newly revealed hexes
     */
    exploreAdjacent(center) {
        const neighbors = this.getNeighbors(center.q, center.r);
        const newHexes = [];

        neighbors.forEach(n => {
            const key = this.getHexKey(n.q, n.r);
            if (this.hexes.has(key)) {
                const hex = this.hexes.get(key);
                if (!hex.revealed) {
                    hex.revealed = true;
                    this.hexes.set(key, hex);
                    newHexes.push(hex);
                }
            } else {
                // Generate new hex if map allows dynamic expansion (simplified)
                // For now, we assume hexes exist but are unrevealed/hidden?
                // Or we create them?
                // Based on map generation logic usually in MapManager.
                // If this method is responsible for 'revealing', it implies existence or creation.
                // Let's assume basic revealing of existing 'fogged' hexes for now.
                // If map is dynamic, MapManager usually handles generation.
                // But ActionManager called this.game.hexGrid.exploreAdjacent.
                // Let's stub creation for now if missing.
                const newHex = { q: n.q, r: n.r, revealed: true, terrain: this.getRandomTerrain() };
                this.hexes.set(key, newHex);
                newHexes.push(newHex);
            }
        });

        return newHexes;
    }

    getRandomTerrain() {
        const terrains = ['plains', 'forest', 'hills', 'mountains', 'desert', 'wasteland'];
        return terrains[Math.floor(Math.random() * terrains.length)];
    }

    /**
     * Calculates reachable hexes using BFS based on movement points.
     * @param {Object} startPos - {q, r}
     * @param {number} movementPoints
     * @param {boolean} isDay
     * @returns {Array} List of reachable {q, r}
     */
    getReachableHexes(startPos, movementPoints, isDay) {
        if (!startPos) return [];

        const reachable = [];
        const queue = [{ q: startPos.q, r: startPos.r, cost: 0 }];
        const visited = new Map();
        const startKey = this.getHexKey(startPos.q, startPos.r);
        visited.set(startKey, 0);

        while (queue.length > 0) {
            const current = queue.shift();

            // Current position is reachable
            if (current.q !== startPos.q || current.r !== startPos.r) {
                reachable.push({ q: current.q, r: current.r });
            }

            const neighbors = this.getNeighbors(current.q, current.r);
            for (const neighbor of neighbors) {
                if (!this.hasHex(neighbor.q, neighbor.r)) continue;

                const moveCost = this.getMovementCost(neighbor.q, neighbor.r, !isDay);
                const totalCost = current.cost + moveCost;

                if (totalCost <= movementPoints) {
                    const key = this.getHexKey(neighbor.q, neighbor.r);
                    if (!visited.has(key) || visited.get(key) > totalCost) {
                        visited.set(key, totalCost);
                        queue.push({ ...neighbor, cost: totalCost });
                    }
                }
            }
        }

        return reachable;
    }

    /**
     * Gets movement cost for a specific hex.
     * @param {number} q
     * @param {number} r
     * @param {boolean} isNight
     * @returns {number} Cost
     */
    getMovementCost(q, r, isNight = false) {
        const hex = this.getHex(q, r);
        if (!hex) return 999;

        if (this.terrainSystem) {
            return this.terrainSystem.getMovementCost(hex.terrain, isNight);
        }

        // Fallback to basic costs if terrain system not linked
        const costs = { plains: 2, forest: 3, hills: 3, mountains: 5, desert: 5, wasteland: 3, water: 999 };
        const cost = costs[hex.terrain] || 2;

        // Basic night modifier for forest/desert if no terrain system
        if (isNight) {
            if (hex.terrain === 'forest') return 5;
            if (hex.terrain === 'desert') return 3;
        }

        return cost;
    }

    /**
     * Gets state for persistence.
     */
    getState() {
        return {
            hexes: Array.from(this.hexes.entries()),
            selectedHex: this.selectedHex,
            ambientLight: this.ambientLight
        };
    }

    /**
     * Loads state from object.
     */
    loadState(state) {
        if (!state) return;
        if (state.hexes) {
            this.hexes = new Map(state.hexes);
        }
        this.selectedHex = state.selectedHex || null;
        this.ambientLight = state.ambientLight !== undefined ? state.ambientLight : 1.0;
    }

    setTimeOfDay(isNight) {
        this.ambientLight = isNight ? 0.6 : 1.0; // Darker at night
    }

    // Draw a single hexagon
    /**
     * Renders a single hexagon with optional styles and effects.
     * @param {number} q
     * @param {number} r
     * @param {Object} options - { fillColor, strokeColor, highlight, revealed, terrain }
     */
    drawHex(q, r, options = {}) {
        const pos = this.axialToPixel(q, r);
        const { fillColor = '#1a1a2e', strokeColor = '#374151', lineWidth = 2, highlight = false, revealed = true, terrain = null } = options;

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

        // Fill
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Apply Day/Night lighting with vision falloff
        let effectiveLight = this.ambientLight;
        if (this.ambientLight < 1.0 && this.heroPosition) {
            const dist = this.distance(q, r, this.heroPosition.q, this.heroPosition.r);
            if (dist <= this.visionRadius) {
                // Smooth falloff from 1.0 down to ambientLight
                const t = dist / (this.visionRadius + 1);
                effectiveLight = 1.0 - t * (1.0 - this.ambientLight);
            }
        }

        if (effectiveLight < 1.0) {
            this.ctx.fillStyle = `rgba(0, 0, 20, ${1 - effectiveLight})`;
            this.ctx.fill();
        }
        this.ctx.closePath();

        // Create radial gradient for 3D effect with ambient lighting
        const gradient = this.ctx.createRadialGradient(
            pos.x, pos.y - this.hexSize * 0.3, 0,
            pos.x, pos.y, this.hexSize
        );

        // Apply ambient lighting to colors
        const baseColor = this.applyLighting(fillColor, effectiveLight);
        gradient.addColorStop(0, this.lightenColor(baseColor, 20 * effectiveLight));
        gradient.addColorStop(0.6, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 20));

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add terrain-specific texture overlay
        if (revealed && terrain) {
            this.drawTerrainTexture(pos, terrain);
        }

        // Fog of War overlay
        if (!revealed) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fill();

            // Question mark for unrevealed
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('?', pos.x, pos.y);
        }

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

    // Apply lighting to color
    applyLighting(color, lightLevel) {
        const num = parseInt(color.replace('#', ''), 16);
        const factor = lightLevel;
        const R = Math.floor(((num >> 16) & 0xFF) * factor);
        const G = Math.floor(((num >> 8) & 0xFF) * factor);
        const B = Math.floor((num & 0xFF) * factor);
        return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    }

    // Draw terrain-specific texture overlay
    drawTerrainTexture(pos, terrain) {
        this.ctx.save();

        // Create clipping region for hex
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
        this.ctx.clip();

        switch (terrain) {
        case 'water':
            this.drawWaterTexture(pos);
            break;
        case 'forest':
            this.drawForestTexture(pos);
            break;
        case 'mountains':
            this.drawMountainTexture(pos);
            break;
        case 'desert':
            this.drawDesertTexture(pos);
            break;
        case 'plains':
            this.drawPlainsTexture(pos);
            break;
        }

        this.ctx.restore();
    }

    // Water animation effect
    drawWaterTexture(pos) {
        const wave = Math.sin(this.animationFrame * 0.05 + pos.x * 0.01) * 0.1;
        const wave2 = Math.cos(this.animationFrame * 0.03 + pos.y * 0.01) * 0.1;

        // Animated ripples
        this.ctx.globalAlpha = 0.15 + wave * 0.1;
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.fillRect(pos.x - this.hexSize, pos.y - this.hexSize, this.hexSize * 2, this.hexSize * 2);

        this.ctx.globalAlpha = 0.1 + wave2 * 0.1;
        this.ctx.fillStyle = '#93c5fd';
        this.ctx.fillRect(pos.x - this.hexSize / 2, pos.y - this.hexSize / 2, this.hexSize, this.hexSize);

        this.ctx.globalAlpha = 1.0;
    }

    // Forest texture with subtle dots
    drawForestTexture(pos) {
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = '#166534';

        // Randomized but consistent dots based on position
        const seed = pos.x * 7 + pos.y * 13;
        for (let i = 0; i < 15; i++) {
            const x = pos.x + (((seed + i * 3) % 100) - 50) * 0.5;
            const y = pos.y + (((seed + i * 7) % 100) - 50) * 0.5;
            this.ctx.fillRect(x, y, 2, 2);
        }

        this.ctx.globalAlpha = 1.0;
    }

    // Mountain texture with lines
    drawMountainTexture(pos) {
        this.ctx.globalAlpha = 0.12;
        this.ctx.strokeStyle = '#57534e';
        this.ctx.lineWidth = 1;

        // Diagonal lines for rocky appearance
        for (let i = -3; i <= 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x + i * 10 - this.hexSize, pos.y - this.hexSize);
            this.ctx.lineTo(pos.x + i * 10 + this.hexSize, pos.y + this.hexSize);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;
    }

    // Desert texture with sand pattern
    drawDesertTexture(pos) {
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#f59e0b';

        // Wavy sand lines
        const seed = pos.x * 11 + pos.y * 17;
        for (let i = 0; i < 8; i++) {
            const y = pos.y - this.hexSize / 2 + i * 5;
            const offset = Math.sin((seed + i) * 0.5) * 3;
            this.ctx.fillRect(pos.x - this.hexSize + offset, y, this.hexSize * 1.5, 1);
        }

        this.ctx.globalAlpha = 1.0;
    }

    // Plains texture with subtle grass
    drawPlainsTexture(pos) {
        this.ctx.globalAlpha = 0.06;
        this.ctx.strokeStyle = '#15803d';
        this.ctx.lineWidth = 1;

        // Vertical grass strokes
        const seed = pos.x * 5 + pos.y * 11;
        for (let i = 0; i < 12; i++) {
            const x = pos.x + (((seed + i * 5) % 100) - 50) * 0.4;
            const y = pos.y + (((seed + i * 7) % 100) - 50) * 0.4;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y - 3);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;
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
        const existing = this.hexes.get(key) || {};
        // Default revealed to false if not specified, preserve if existing
        const revealed = data.revealed !== undefined ? data.revealed : (existing.revealed || false);
        this.hexes.set(key, { q, r, ...data, revealed });
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
        this.animationFrame++; // Increment for animations
        this.clear();

        if (hero) {
            this.heroPosition = hero.position;
        }

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
                highlight: isHighlighted || isSelected,
                revealed: hexData.revealed,
                terrain: hexData.terrain
            });

            // If not revealed, skip drawing content
            if (!hexData.revealed) continue;

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

        // Draw enemies with enhanced visuals
        enemies.forEach(enemy => {
            if (enemy.position) {
                this.drawEnemy(enemy.position.q, enemy.position.r, enemy);
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

    // Draw enemy with circular 3D token
    drawEnemy(q, r, enemy) {
        const pos = this.axialToPixel(q, r);
        const radius = 18;

        // Outer glow based on enemy color
        this.ctx.save();
        this.ctx.shadowColor = enemy.color || '#ef4444';
        this.ctx.shadowBlur = 10;

        // Circle background with gradient
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

        // Border with sheen
        this.ctx.strokeStyle = this.lightenColor(baseColor, 60);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Enemy icon
        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(enemy.icon || '👹', pos.x, pos.y + 10);

        // HP/Armor indicator (small bar above)
        if (enemy.armor) {
            const barWidth = 30;
            const barHeight = 3;
            const barX = pos.x - barWidth / 2;
            const barY = pos.y - 12;

            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            // Armor bar
            const armorPercent = Math.min(1, enemy.armor / 10); // Assume max 10
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.fillRect(barX, barY, barWidth * armorPercent, barHeight);
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
