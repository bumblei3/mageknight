/**
 * AI Web Worker
 * Offloads heavy pathfinding and decision logic from the main thread.
 */

import * as HexUtils from '../utils/hexUtils.js';

self.onmessage = function (e) {
    const { action, payload } = e.data;

    if (action === 'calculateMoves') {
        const { enemies, heroPos, hexes, difficulty } = payload;
        const results = calculateMoves(enemies, heroPos, hexes, difficulty);
        self.postMessage({ action: 'movesCalculated', payload: results });
    }
};

function calculateMoves(enemies, heroPos, hexesMap, _difficulty) {
    const moveLog = [];
    const newPositions = [];

    // Convert hexesMap (Object or Array of entries) back to a usable form if needed
    // Assuming hexesMap is an object like { "q,r": { terrain: '...' } }

    enemies.forEach(enemy => {
        if (enemy.isDefeated) return;

        // Simplified canMove check (assume Orcs, Draconum, etc. roam)
        const roamingTypes = ['orc', 'draconum', 'elemental', 'robber'];
        if (roamingTypes.includes(enemy.type)) {
            const move = getBestMove(enemy, heroPos, enemies, hexesMap);
            if (move) {
                newPositions.push({ id: enemy.id, position: move });
                moveLog.push(`${enemy.name} bewegt sich.`);
            }
        }
    });

    return { newPositions, moveLog };
}

function getBestMove(enemy, heroPos, allEnemies, hexesMap) {
    if (!enemy.position) return null;

    const currentQ = enemy.position.q;
    const currentR = enemy.position.r;
    const neighbors = HexUtils.getNeighbors(currentQ, currentR);

    // Filter valid moves
    const validMoves = neighbors.filter(n => {
        const key = HexUtils.getHexKey(n.q, n.r);
        const hex = hexesMap[key];

        // Must have hex
        if (!hex) return false;

        // Avoid Water/Mountains
        if (hex.terrain === 'water' || hex.terrain === 'mountains') return false;

        // Avoid other enemies
        const isOccupied = allEnemies.some(e =>
            e.id !== enemy.id &&
            !e.isDefeated &&
            e.position &&
            e.position.q === n.q &&
            e.position.r === n.r
        );
        if (isOccupied) return false;

        // Avoid Hero collision
        if (heroPos.q === n.q && heroPos.r === n.r) return false;

        return true;
    });

    if (validMoves.length === 0) return null;

    // Behavior: Aggressive (move towards hero) or Passive (random)
    const distToHero = HexUtils.distance(currentQ, currentR, heroPos.q, heroPos.r);
    const isAggro = distToHero <= 3;

    if (isAggro) {
        // Move closer
        validMoves.sort((a, b) => {
            const da = HexUtils.distance(a.q, a.r, heroPos.q, heroPos.r);
            const db = HexUtils.distance(b.q, b.r, heroPos.q, heroPos.r);
            return da - db;
        });
        return validMoves[0];
    } else {
        // Random wander
        if (Math.random() < 0.2) return null;
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
}
