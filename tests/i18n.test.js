import { describe, it, expect, beforeEach } from 'vitest';
import {
    t, setLanguage, getLanguage, registerLanguage,
    getAvailableLanguages, initI18n, updateElement, translateDocument,
} from '../js/i18n/i18n.js';

function setNavigatorLang(value) {
    Object.defineProperty(navigator, 'language', { value, configurable: true });
}

describe('i18n', () => {
    beforeEach(() => {
        // Register controlled languages (note: index.js is NOT imported here,
        // so de/en are not pre-registered — we register our own minimal ones)
        registerLanguage('de', {
            fallbackkey: 'FB',
            plain: 'Einfach-de',
        });
        registerLanguage('en', { plain: 'Plain-en' });
        registerLanguage('zz', {
            greeting: 'Hallo {name}',
            nested: { deep: 'Tief {x}' },
            plain: 'Einfach',
            notString: { obj: 'value' },
        });
        registerLanguage('zz2', { only: 'Nur zz2' });
        localStorage.removeItem('mageknightLang');
        setNavigatorLang('de-DE');
        setLanguage('zz');
    });

    describe('registerLanguage / getAvailableLanguages', () => {
        it('registers and lists languages', () => {
            const langs = getAvailableLanguages();
            expect(langs).toContain('de');
            expect(langs).toContain('en');
            expect(langs).toContain('zz');
        });
    });

    describe('setLanguage / getLanguage', () => {
        it('switches current language when registered', () => {
            expect(setLanguage('en')).toBe(true);
            expect(getLanguage()).toBe('en');
        });

        it('returns false for unknown language', () => {
            expect(setLanguage('nonexistent')).toBe(false);
            expect(getLanguage()).toBe('zz'); // unchanged from beforeEach
        });

        it('persists to localStorage', () => {
            setLanguage('zz2');
            expect(localStorage.getItem('mageknightLang')).toBe('zz2');
        });
    });

    describe('t()', () => {
        it('returns translated string for a flat key', () => {
            setLanguage('zz');
            expect(t('plain')).toBe('Einfach');
        });

        it('supports dot notation for nested keys', () => {
            setLanguage('zz');
            expect(t('nested.deep')).toBe('Tief {x}');
        });

        it('interpolates parameters', () => {
            setLanguage('zz');
            expect(t('greeting', { name: 'Welt' })).toBe('Hallo Welt');
        });

        it('leaves unresolved placeholders when param missing', () => {
            setLanguage('zz');
            expect(t('greeting')).toBe('Hallo {name}');
        });

        it('returns raw key when dict has no such key', () => {
            setLanguage('zz');
            expect(t('totally.unknown.key')).toBe('totally.unknown.key');
        });

        it('falls back to German when key missing in current language', () => {
            setLanguage('zz'); // zz has no 'fallbackkey'; de does
            expect(t('fallbackkey')).toBe('FB');
        });

        it('returns raw key when neither current nor German has it', () => {
            setLanguage('zz');
            expect(t('zz.only.missing')).toBe('zz.only.missing');
        });

        it('returns raw key when value is not a string', () => {
            setLanguage('zz');
            expect(t('notString')).toBe('notString');
        });
    });

    describe('initI18n', () => {
        it('uses saved language from localStorage', () => {
            localStorage.setItem('mageknightLang', 'en');
            initI18n();
            expect(getLanguage()).toBe('en');
        });

        it('detects browser language when no saved lang', () => {
            localStorage.removeItem('mageknightLang');
            setNavigatorLang('en-US');
            initI18n();
            expect(getLanguage()).toBe('en');
        });

        it('ignores unknown browser language and defaults to German', () => {
            localStorage.removeItem('mageknightLang');
            setNavigatorLang('fr-FR');
            initI18n();
            expect(getLanguage()).toBe('de');
        });
    });

    describe('updateElement', () => {
        it('does nothing without data-i18n attribute', () => {
            const el = document.createElement('div');
            expect(() => updateElement(el)).not.toThrow();
        });

        it('sets textContent for a normal element', () => {
            setLanguage('zz');
            const el = document.createElement('span');
            el.setAttribute('data-i18n', 'plain');
            updateElement(el);
            expect(el.textContent).toBe('Einfach');
        });

        it('sets placeholder for input elements', () => {
            setLanguage('zz');
            const el = document.createElement('input');
            el.setAttribute('data-i18n', 'plain');
            el.setAttribute('placeholder', 'old');
            updateElement(el);
            expect(el.getAttribute('placeholder')).toBe('Einfach');
        });

        it('sets placeholder for textarea elements', () => {
            setLanguage('zz');
            const el = document.createElement('textarea');
            el.setAttribute('data-i18n', 'plain');
            el.setAttribute('placeholder', 'old');
            updateElement(el);
            expect(el.getAttribute('placeholder')).toBe('Einfach');
        });

        it('updates an existing title when data-i18n-title present', () => {
            setLanguage('zz');
            const el = document.createElement('button');
            el.setAttribute('data-i18n', 'plain');
            el.setAttribute('title', 'old-title');
            el.setAttribute('data-i18n-title', 'greeting');
            updateElement(el);
            expect(el.textContent).toBe('Einfach');
            expect(el.getAttribute('title')).toBe('Hallo {name}');
        });

        it('does not translate title when no data-i18n-title', () => {
            setLanguage('zz');
            const el = document.createElement('button');
            el.setAttribute('data-i18n', 'plain');
            el.setAttribute('title', 'keepme');
            updateElement(el);
            expect(el.getAttribute('title')).toBe('keepme');
        });
    });

    describe('translateDocument', () => {
        it('translates all data-i18n elements and the document title', () => {
            setLanguage('zz');
            document.body.innerHTML = `
                <span data-i18n="plain"></span>
                <div data-i18n="nested.deep"></div>
                <title data-i18n="plain"></title>
            `;
            translateDocument();
            const spans = document.querySelectorAll('[data-i18n]');
            expect(spans[0].textContent).toBe('Einfach');
            expect(spans[1].textContent).toBe('Tief {x}');
            expect(document.title).toBe('Einfach');
        });
    });
});
