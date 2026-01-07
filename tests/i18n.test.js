import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '../js/i18n/i18n.js';
import { registerLanguage, setLanguage, getLanguage, getAvailableLanguages, t, initI18n, translateDocument, updateElement } from '../js/i18n/i18n.js';

describe('i18n System', () => {
    const deDict = {
        greeting: 'Hallo',
        nested: {
            message: 'Inhalt'
        },
        withParams: 'Hallo {name}!',
        buttons: {
            submit: 'Absenden'
        }
    };

    const enDict = {
        greeting: 'Hello',
        withParams: 'Hello {name}!'
    };

    beforeEach(() => {
        // Reset state
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn()
        });
        vi.stubGlobal('navigator', {
            language: 'de-DE'
        });
        vi.stubGlobal('document', {
            querySelectorAll: vi.fn().mockReturnValue([]),
            title: ''
        });

        registerLanguage('de', deDict);
        registerLanguage('en', enDict);
        setLanguage('de');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('registerLanguage and getAvailableLanguages', () => {
        it('should register and return available languages', () => {
            expect(getAvailableLanguages()).toContain('de');
            expect(getAvailableLanguages()).toContain('en');
        });
    });

    describe('setLanguage and getLanguage', () => {
        it('should change language and persist to localStorage', () => {
            setLanguage('en');
            expect(getLanguage()).toBe('en');
            expect(localStorage.setItem).toHaveBeenCalledWith('mageknightLang', 'en');
        });

        it('should return false for unknown language', () => {
            const result = setLanguage('fr');
            expect(result).toBe(false);
            expect(getLanguage()).toBe('de');
        });

        it('should dispatch languageChanged event', () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            setLanguage('en');
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'languageChanged' }));
        });
    });

    describe('t (translate)', () => {
        it('should translate simple keys', () => {
            expect(t('greeting')).toBe('Hallo');
            setLanguage('en');
            expect(t('greeting')).toBe('Hello');
        });

        it('should support dot notation', () => {
            expect(t('nested.message')).toBe('Inhalt');
        });

        it('should handle interpolation', () => {
            expect(t('withParams', { name: 'World' })).toBe('Hallo World!');
        });

        it('should fallback to German if key not found', () => {
            setLanguage('en');
            expect(t('nested.message')).toBe('Inhalt'); // Fallback to de
        });

        it('should return key if translation missing entirely', () => {
            expect(t('missing.key')).toBe('missing.key');
        });
    });

    describe('initI18n', () => {
        it('should use language from localStorage if available', () => {
            localStorage.getItem.mockReturnValue('en');
            initI18n();
            expect(getLanguage()).toBe('en');
        });

        it('should use browser language as secondary fallback', () => {
            localStorage.getItem.mockReturnValue(null);
            vi.stubGlobal('navigator', { language: 'en-US' });
            initI18n();
            expect(getLanguage()).toBe('en');
        });

        it('should default to German', () => {
            localStorage.getItem.mockReturnValue(null);
            vi.stubGlobal('navigator', { language: 'fr-FR' });
            initI18n();
            expect(getLanguage()).toBe('de');
        });
    });

    describe('DOM manipulation', () => {
        it('should update element textContent', () => {
            const el = {
                getAttribute: vi.fn().mockImplementation(attr => {
                    if (attr === 'data-i18n') return 'greeting';
                }),
                hasAttribute: vi.fn().mockReturnValue(false),
                textContent: '',
                tagName: 'DIV'
            };

            updateElement(el);
            expect(el.textContent).toBe('Hallo');
        });

        it('should update input placeholder', () => {
            const el = {
                getAttribute: vi.fn().mockReturnValue('greeting'),
                hasAttribute: vi.fn().mockReturnValue(true),
                setAttribute: vi.fn(),
                tagName: 'INPUT'
            };

            updateElement(el);
            expect(el.setAttribute).toHaveBeenCalledWith('placeholder', 'Hallo');
        });

        it('should translate document title', () => {
            const titleEl = {
                getAttribute: vi.fn().mockReturnValue('greeting')
            };
            vi.stubGlobal('document', {
                querySelectorAll: vi.fn().mockReturnValue([]),
                querySelector: vi.fn().mockReturnValue(titleEl),
                title: ''
            });

            translateDocument();
            expect(document.title).toBe('Hallo');
        });
    });
});
