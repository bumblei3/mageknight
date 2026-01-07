/**
 * i18n Index - Initialize and export translation system
 */

import { registerLanguage, initI18n, t, setLanguage, getLanguage, getAvailableLanguages } from './i18n';
import de from './de';
import en from './en';

// Register all languages
registerLanguage('de', de);
registerLanguage('en', en);

// Initialize from localStorage or browser settings
initI18n();

// Export everything
export { t, setLanguage, getLanguage, getAvailableLanguages };
export default { t, setLanguage, getLanguage, getAvailableLanguages };
