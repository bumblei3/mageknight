/**
 * i18n Index - Initialize and export translation system
 */

import { registerLanguage, initI18n, t, setLanguage, getLanguage, getAvailableLanguages } from './i18n.js';
import de from './de.js';
import en from './en.js';

// Register all languages
registerLanguage('de', de);
registerLanguage('en', en);

// Initialize from localStorage or browser settings
initI18n();

// Export everything
export { t, setLanguage, getLanguage, getAvailableLanguages };
export default { t, setLanguage, getLanguage, getAvailableLanguages };
