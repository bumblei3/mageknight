/**
 * Internationalization (i18n) System for Mage Knight
 * Provides translation support for multiple languages.
 */
import { store, ACTIONS } from '../game/Store';

export interface TranslationDictionary {
    [key: string]: any; // Allow nested objects or strings
}

// Current language (default: German)
let currentLanguage = 'de';

// Translation dictionaries
const translations: Record<string, TranslationDictionary> = {};

/**
 * Load a language module
 * @param {string} lang - Language code (e.g., 'de', 'en')
 * @param {TranslationDictionary} dict - Translation dictionary
 */
export function registerLanguage(lang: string, dict: TranslationDictionary): void {
    translations[lang] = dict;
}

/**
 * Set the current language
 * @param {string} lang - Language code
 */
export function setLanguage(lang: string): boolean {
    if (translations[lang]) {
        currentLanguage = lang;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('mageknightLang', lang);
        }

        if (store) {
            (store as any).dispatch(ACTIONS.SET_LANGUAGE, lang);
        }

        // Dispatch event for UI refresh
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
        }
        return true;
    }
    return false;
}

/**
 * Get current language
 * @returns {string} Current language code
 */
export function getLanguage(): string {
    return currentLanguage;
}

/**
 * Get available languages
 * @returns {string[]} Array of language codes
 */
export function getAvailableLanguages(): string[] {
    return Object.keys(translations);
}

/**
 * Translate a key to the current language
 * @param {string} key - Translation key (dot notation supported, e.g., 'ui.buttons.endTurn')
 * @param {Record<string, any>} params - Optional parameters for interpolation
 * @returns {string} Translated string or key if not found
 */
export function t(key: string, params: Record<string, any> = {}): string {
    const dict = translations[currentLanguage];
    if (!dict) return key;

    // Support dot notation
    const value = key.split('.').reduce((obj, k) => obj?.[k], dict);

    if (value === undefined) {
        // Fallback to German if key not found in current language
        const fallbackDict = translations['de'];
        if (fallbackDict) {
            const fallback = key.split('.').reduce((obj, k) => obj?.[k], fallbackDict);
            if (fallback !== undefined && typeof fallback === 'string') {
                return interpolate(fallback, params);
            }
        }
        return key;
    }

    if (typeof value !== 'string') return key;

    return interpolate(value, params);
}

/**
 * Interpolate parameters into a string
 * @param {string} str - String with {param} placeholders
 * @param {Record<string, any>} params - Parameters to interpolate
 * @returns {string} Interpolated string
 */
function interpolate(str: string, params: Record<string, any>): string {
    return str.replace(/\{(\w+)\}/g, (_, key) => params[key] !== undefined ? String(params[key]) : `{${key}}`);
}

/**
 * Initialize i18n from localStorage or browser language
 */
export function initI18n(): void {
    // Check localStorage first
    const savedLang = typeof localStorage !== 'undefined'
        ? localStorage.getItem('mageknightLang')
        : null;

    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        return;
    }

    // Detect browser language
    if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && translations[browserLang]) {
            currentLanguage = browserLang;
            return;
        }
    }

    // Default to German
    currentLanguage = 'de';
}

/**
 * Update a single element with translations based on data-i18n attribute
 * @param {HTMLElement} element - The element to translate
 */
export function updateElement(element: HTMLElement): void {
    const key = element.getAttribute('data-i18n');
    if (!key) return;

    const translation = t(key);

    // Check if it's an input or button with a title attribute that needs translation
    if (element.hasAttribute('title')) {
        const titleKey = element.getAttribute('data-i18n-title');
        if (titleKey) {
            element.setAttribute('title', t(titleKey));
        }
    }

    // Default to setting text content
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (element.hasAttribute('placeholder')) {
            element.setAttribute('placeholder', translation);
        }
    } else {
        element.textContent = translation;
    }
}

/**
 * Automatically translate all elements with data-i18n attributes in the document
 */
export function translateDocument(): void {
    const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
    elements.forEach(updateElement);

    // Update document title if applicable
    const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
    if (titleKey) {
        document.title = t(titleKey);
    }
}

export default { t, setLanguage, getLanguage, registerLanguage, getAvailableLanguages, initI18n, translateDocument, updateElement };
