# Mage Knight UX Redesign Plan

## Aktuelles Problem

7000+ Zeilen CSS mit massiven Duplikationen:
- Legacy-CSS (`css/cards.css` 548 Zeilen) vs TS-Komponenten (`js/ui/components/Card.css` 395 Zeilen)
- 18 CSS-Dateien, viele mit überschneidenden Verantwortlichkeiten
- Inkonsistente Design Tokens (Farben, Spacing, Schatten verteilt über mehrere Dateien)
- Glassmorphism-Overkill: `backdrop-filter: blur(16px) saturate(180%)` auf fast jedem Element
- Keine klare Trennung zwischen Layout, Komponenten und Theming

## Ziel

Ein konsistentes, wartbares und performantes UI-System mit:
- Zentralen Design Tokens
- Klare Komponenten-Hierarchie
- Reduzierte CSS-Größe (Ziel: <3000 Zeilen)
- Bessere Accessibility
- Responsive Design

## Phase 1: Design Tokens & Grundlage (1-2 Tage)

### 1.1 Zentrale Design Token-Datei
Erstelle `css/tokens.css` mit allen Design-Entscheidungen:

```css
:root {
  /* === Colors === */
  /* Primary Palette */
  --color-bg-base: #050510;
  --color-bg-surface: #0f172a;
  --color-bg-elevated: #1e293b;
  --color-bg-overlay: rgba(15, 23, 42, 0.95);

  /* Accent Colors */
  --color-accent-gold: #fbbf24;
  --color-accent-purple: #a855f7;
  --color-accent-cyan: #22d3ee;
  --color-accent-red: #ef4444;
  --color-accent-green: #10b981;
  --color-accent-blue: #3b82f6;

  /* Text Colors */
  --color-text-primary: #ffffff;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-text-inverse: #0f172a;

  /* Mana Colors */
  --color-mana-red: #ef4444;
  --color-mana-blue: #3b82f6;
  --color-mana-green: #10b981;
  --color-mana-white: #f9fafb;
  --color-mana-gold: #fbbf24;
  --color-mana-black: #374151;

  /* === Typography === */
  --font-display: 'Cinzel', serif;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* === Spacing === */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-8: 3rem;

  /* === Border Radius === */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* === Shadows === */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(251, 191, 36, 0.3);

  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;

  /* === Z-Index Scale === */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-overlay: 30;
  --z-modal: 40;
  --z-toast: 50;
}
```

### 1.2 CSS Reset & Base Styles
Erstelle `css/base.css` mit modernem CSS Reset:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  background: var(--color-bg-base);
  color: var(--color-text-primary);
  line-height: 1.5;
  overflow: hidden;
}

/* Focus visible for accessibility */
:focus-visible {
  outline: 2px solid var(--color-accent-gold);
  outline-offset: 2px;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-text-muted);
  border-radius: var(--radius-full);
}
```

## Phase 2: Komponenten-System (2-3 Tage)

### 2.1 Button-Komponente
Ersetze alle Button-Styles durch eine einheitliche Komponente:

```css
/* Button Base */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button Variants */
.btn-primary {
  background: var(--color-accent-gold);
  color: var(--color-text-inverse);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: var(--shadow-glow);
}

.btn-secondary {
  background: var(--color-bg-elevated);
  border-color: var(--color-text-muted);
  color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-accent-gold);
}

.btn-danger {
  background: var(--color-accent-red);
  color: var(--color-text-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-bg-elevated);
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}

.btn-lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
}

/* Icon Button */
.btn-icon {
  padding: var(--space-2);
  border-radius: var(--radius-full);
}
```

### 2.2 Card-Komponente
Vereinheitliche die Karten-Stile:

```css
/* Card Base */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-text-muted);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-accent-gold);
}

/* Card Color Accents */
.card-red { border-top: 3px solid var(--color-mana-red); }
.card-blue { border-top: 3px solid var(--color-mana-blue); }
.card-green { border-top: 3px solid var(--color-mana-green); }
.card-white { border-top: 3px solid var(--color-mana-white); }
.card-gold { border-top: 3px solid var(--color-mana-gold); }

/* Card States */
.card-played {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.card-selected {
  border-color: var(--color-accent-gold);
  box-shadow: var(--shadow-glow);
}

.card-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Card Content */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-bg-surface);
}

.card-body {
  flex: 1;
  padding: var(--space-3);
}

.card-footer {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-bg-surface);
}
```

### 2.3 Panel-Komponente
Einheitliche Panels/Sidebars:

```css
.panel {
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-text-muted);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-bg-surface);
}

.panel-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.panel-collapsed .panel-body {
  display: none;
}
```

## Phase 3: Layout-System (1-2 Tage)

### 3.1 HUD Layout
Ersetzt das aktuelle Grid durch ein klareres System:

```css
/* HUD Layer */
.hud {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template:
    "header header header" auto
    "left center right" 1fr
    "footer footer footer" auto;
  grid-template-columns: 320px 1fr 360px;
  grid-template-rows: auto 1fr auto;
  gap: var(--space-3);
  padding: var(--space-3);
  pointer-events: none;
}

.hud > * {
  pointer-events: auto;
}

/* Header */
.hud-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-overlay);
  border-radius: var(--radius-lg);
}

/* Sidebars */
.hud-left {
  grid-area: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
}

.hud-right {
  grid-area: right;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
}

/* Center (Game Board) */
.hud-center {
  grid-area: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Footer (Cards) */
.hud-footer {
  grid-area: footer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
```

### 3.2 Responsive Breakpoints

```css */
/* Tablet */
@media (max-width: 1024px) {
  .hud {
    grid-template-columns: 280px 1fr 300px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .hud {
    grid-template:
      "header" auto
      "center" 1fr
      "footer" auto;
    grid-template-columns: 1fr;
  }

  .hud-left,
  .hud-right {
    display: none;
  }

  /* Show sidebars as overlays on mobile */
  .hud-left.visible,
  .hud-right.visible {
    display: flex;
    position: fixed;
    top: 0;
    bottom: 0;
    width: 80%;
    max-width: 320px;
    z-index: var(--z-overlay);
    background: var(--color-bg-base);
  }

  .hud-left.visible {
    left: 0;
  }

  .hud-right.visible {
    right: 0;
  }
}
```

## Phase 4: Animationen & Micro-Interactions (1-2 Tage)

### 4.1 Einheitliche Animationen

```css */
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Glow Pulse */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 5px var(--color-accent-gold); }
  50% { box-shadow: 0 0 20px var(--color-accent-gold); }
}

/* Card Draw */
@keyframes cardDraw {
  from {
    opacity: 0;
    transform: translateY(30px) rotateX(-10deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0);
  }
}

/* Combat Shake */
@keyframes combatShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Utility Classes */
.animate-fade { animation: fadeIn var(--transition-base); }
.animate-slide { animation: slideUp var(--transition-base); }
.animate-scale { animation: scaleIn var(--transition-fast); }
.animate-glow { animation: glowPulse 2s infinite; }
```

### 4.2 Reduced Motion Support

```css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Phase 5: Accessibility (1 Tag)

### 5.1 ARIA Labels & Roles

```css */
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent-gold);
  color: var(--color-text-inverse);
  z-index: 9999;
}

.skip-link:focus {
  top: var(--space-2);
}
```

### 5.2 High Contrast Mode

```css */
@media (prefers-contrast: high) {
  :root {
    --color-text-primary: #ffffff;
    --color-text-secondary: #e0e0e0;
    --color-bg-base: #000000;
    --color-bg-surface: #1a1a1a;
    --color-accent-gold: #ffcc00;
  }

  .card,
  .panel,
  .btn {
    border-width: 2px;
  }
}
```

## Phase 6: Performance (1 Tag)

### 6.1 CSS Optimierung

- Entferne unbenutzte CSS-Regeln (PurgeCSS)
- Kritische CSS inline im `<head>`
- Lazy-loading für nicht-kritische Stylesheets
- Reduziere `backdrop-filter` Nutzung (GPU-intensiv)

### 6.2 Bundle-Größe

- Aktuell: ~7000 Zeilen CSS
- Ziel: ~2500 Zeilen (65% Reduktion)
- Entferne Duplikationen zwischen Legacy und TS-Komponenten

## Implementierungs-Reihenfolge

1. **Phase 1**: Design Tokens + Base Styles (Foundation)
2. **Phase 2**: Komponenten-System (Buttons, Cards, Panels)
3. **Phase 3**: Layout-System (HUD, Responsive)
4. **Phase 4**: Animationen (Micro-interactions)
5. **Phase 5**: Accessibility (ARIA, High Contrast)
6. **Phase 6**: Performance (CSS Cleanup)

## Geschätzter Aufwand

- **Gesamt**: 8-10 Tage
- **Pro Phase**: 1-2 Tage
- **Risiko**: Mittel (Legacy-Code muss parallel laufen)
- **Teststrategie**: Visuelle Regression Tests nach jeder Phase

## Erwartete Verbesserungen

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| CSS Zeilen | ~7000 | ~2500 |
| Design Tokens | Verstreut | Zentral |
| Komponenten | Inkonsistent | Einheitlich |
| Accessibility | Minimal | WCAG 2.1 AA |
| Animationen | Unkontrolliert | Einheitlich |
| Mobile Support | Fehlend | Vollständig |
| Bundle Größe | ~150KB | ~80KB |