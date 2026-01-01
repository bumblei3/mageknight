/**
 * Internationalization (i18n) System for Mage Knight
 * Provides translation support for multiple languages.
 */

// Current language (default: German)
let currentLanguage = 'de';

// Translation dictionaries
const translations = {};

/**
 * Load a language module
 * @param {string} lang - Language code (e.g., 'de', 'en')
 * @param {Object} dict - Translation dictionary
 */
export function registerLanguage(lang, dict) {
    translations[lang] = dict;
}

/**
 * Set the current language
 * @param {string} lang - Language code
 */
export function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('mageknightLang', lang);
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
export function getLanguage() {
    return currentLanguage;
}

/**
 * Get available languages
 * @returns {Array} Array of language codes
 */
export function getAvailableLanguages() {
    return Object.keys(translations);
}

/**
 * Translate a key to the current language
 * @param {string} key - Translation key (dot notation supported, e.g., 'ui.buttons.endTurn')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated string or key if not found
 */
export function t(key, params = {}) {
    const dict = translations[currentLanguage];
    if (!dict) return key;

    // Support dot notation
    const value = key.split('.').reduce((obj, k) => obj?.[k], dict);

    if (value === undefined) {
        // Fallback to German if key not found in current language
        const fallback = key.split('.').reduce((obj, k) => obj?.[k], translations['de']);
        if (fallback !== undefined) {
            return interpolate(fallback, params);
        }
        return key;
    }

    return interpolate(value, params);
}

/**
 * Interpolate parameters into a string
 * @param {string} str - String with {param} placeholders
 * @param {Object} params - Parameters to interpolate
 * @returns {string} Interpolated string
 */
function interpolate(str, params) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

/**
 * Initialize i18n from localStorage or browser language
 */
export function initI18n() {
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

export default { t, setLanguage, getLanguage, registerLanguage, getAvailableLanguages, initI18n };
