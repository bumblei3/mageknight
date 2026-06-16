/**
 * UI Components Index
 * Unified exports for all reusable components
 */

// Button
export { createButton, setButtonState, ButtonPatterns } from './Button';
export type { ButtonProps } from './Button';

// Card
export { createCard, showCardPreview, hideCardPreview, injectCardPreviewStyles } from './Card';
export type { CardProps, CardData } from './Card';

// PhaseIndicator
export { createPhaseIndicator, updatePhaseIndicator, renderPhaseIndicator } from './PhaseIndicator';
export type { PhaseIndicatorProps } from './PhaseIndicator';

// Re-export CSS injection helpers
export function injectAllComponentStyles(): void {
    // Styles are imported via CSS imports in the component files
    // This function exists for explicit initialization if needed
    console.log('[UI Components] All component styles registered');
}