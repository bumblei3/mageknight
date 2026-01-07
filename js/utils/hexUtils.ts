/**
 * Pure hex coordinate utilities.
 * These are stateless and can be used in both Main Thread and Web Workers.
 */

export interface HexCoord {
    q: number;
    r: number;
}

export const HEX_DIRECTIONS: HexCoord[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function getHexKey(q: number, r: number): string {
    return `${q},${r}`;
}

export function getNeighbors(q: number, r: number): HexCoord[] {
    return HEX_DIRECTIONS.map(dir => ({ q: q + dir.q, r: r + dir.r }));
}

export function distance(q1: number, r1: number, q2: number, r2: number): number {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function getHexesInRange(q: number, r: number, range: number): HexCoord[] {
    const results: HexCoord[] = [];
    for (let dq = -range; dq <= range; dq++) {
        for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
            results.push({ q: q + dq, r: r + dr });
        }
    }
    return results;
}

export function roundAxial(q: number, r: number): HexCoord {
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
