/**
 * Every literal `t('...')` key used in the app must exist in the dictionaries.
 *
 * `t()` returns the key itself when it is missing, so a typo or a newly used
 * key silently ships as raw text in the UI (game log lines like
 * "game.turnEnded", phase hints, damage-phase buttons). 18 keys were in that
 * state before this suite existed.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import de from '../../js/i18n/de';
import en from '../../js/i18n/en';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const jsRoot = path.join(repoRoot, 'js');

function collectJsFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'vendor' || entry.name === 'dist') return [];
            return collectJsFiles(full);
        }
        return entry.name.endsWith('.ts') ? [full] : [];
    });
}

/** Literal keys passed to t(): t('a.b'), t("a.b"). Dynamic keys are skipped. */
function usedLiteralKeys() {
    const keys = new Map();
    const pattern = /\bt\(\s*['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"]/g;

    for (const file of collectJsFiles(jsRoot)) {
        const source = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = pattern.exec(source)) !== null) {
            const key = match[1];
            if (!keys.has(key)) keys.set(key, path.relative(repoRoot, file));
        }
    }
    return keys;
}

function hasKey(dictionary, key) {
    return key
        .split('.')
        .reduce((node, part) => (node == null ? undefined : node[part]), dictionary) !== undefined;
}

describe('i18n coverage', () => {
    const used = usedLiteralKeys();

    it('finds the keys the app actually uses', () => {
        expect(used.size).toBeGreaterThan(150);
    });

    it('has a German translation for every literal t() key', () => {
        const missing = [...used.entries()]
            .filter(([key]) => !hasKey(de, key))
            .map(([key, file]) => `${key} (${file})`);

        expect(missing).toEqual([]);
    });

    it('has an English translation for every literal t() key', () => {
        const missing = [...used.entries()]
            .filter(([key]) => !hasKey(en, key))
            .map(([key, file]) => `${key} (${file})`);

        expect(missing).toEqual([]);
    });
});
