# Fractionate Design System
## Style & Component Guide for Internal Tools

---

## Overview

This design system documents the visual language used across Fractionate's internal tools: **MEET**, **NEON**, **ProxyPilot**, and associated admin panels. The system emphasizes a dark, professional aesthetic with high contrast and clear visual hierarchy.

---

## 1. Color Palette

### Core Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0d0d0d` | Primary background |
| `--bg-surface` | `#161616` | Cards, panels, elevated surfaces |
| `--bg-surface-hover` | `#1a1a1a` | Surface hover states |
| `--border` | `#2a2a2a` | Default borders |
| `--border-focus` | `#3a3a3a` | Focus/hover borders |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#ffffff` | Primary text, headings |
| `--text-secondary` | `#a0a0a0` | Secondary text, labels |
| `--text-muted` | `#666666` | Placeholder, disabled text |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-primary` | `#ffffff` | Primary buttons, key actions |
| `--accent-cyan` | `#1f8cf9` | CTAs (MEET), links |
| `--accent-green` | `#22c55e` | Success states, ProxyPilot accent |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#22c55e` | Healthy, active, enabled |
| `--warning` | `#eab308` | Warnings, recommendations |
| `--error` | `#ef4444` | Errors, danger actions |
| `--info` | `#3b82f6` | Informational states |

### Background Tints (for badges/pills)

| State | Background | Text |
|-------|------------|------|
| Success | `rgba(34, 197, 94, 0.2)` | `#22c55e` |
| Warning | `rgba(234, 179, 8, 0.2)` | `#eab308` |
| Error | `rgba(239, 68, 68, 0.2)` | `#ef4444` |
| Info | `rgba(59, 130, 246, 0.2)` | `#3b82f6` |
| Neutral | `rgba(255, 255, 255, 0.1)` | `#ffffff` |

---

## 2. Typography

### Font Stack

```css
/* Primary (UI) */
font-family: Inter, system-ui, -apple-system, sans-serif;

/* Monospace (code, technical data) */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display` | 2.25rem (36px) | 700 | 1.2 | Hero text, branding |
| `h1` | 1.5rem (24px) | 600 | 1.3 | Page titles |
| `h2` | 1.25rem (20px) | 600 | 1.4 | Section headers |
| `h3` | 1.125rem (18px) | 500 | 1.4 | Card headers |
| `body` | 0.875rem (14px) | 400 | 1.5 | Default text |
| `small` | 0.75rem (12px) | 400 | 1.4 | Labels, captions |
| `micro` | 0.625rem (10px) | 500 | 1.2 | Badges, status |

### Branding Typography

- **MEET**: Bold italic, all caps, tracking normal
- **NEON**: Bold, all caps, tracking tight
- **ProxyPilot**: Regular weight with icon pairing

---

## 3. Spacing System

Based on 4px increments:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 0.25rem (4px) | Tight gaps, badge padding |
| `--space-2` | 0.5rem (8px) | Icon gaps, input padding |
| `--space-3` | 0.75rem (12px) | Card padding, button padding |
| `--space-4` | 1rem (16px) | Section gaps |
| `--space-6` | 1.5rem (24px) | Large gaps, modal padding |
| `--space-8` | 2rem (32px) | Page margins |

---

## 4. Border & Radius

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.25rem (4px) | Small badges, tags |
| `--radius-md` | 0.375rem (6px) | Buttons, inputs |
| `--radius-lg` | 0.5rem (8px) | Cards, panels |
| `--radius-xl` | 0.75rem (12px) | Modals, large cards |
| `--radius-full` | 9999px | Avatars, pills |

### Border Width

- Default: `1px solid var(--border)`
- Focus/Active: `1px solid var(--border-focus)` or `2px solid var(--accent)`

---

## 5. Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Card elevation */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Modal/dropdown */
--shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.6);

/* Deep shadow */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
```

---

## 6. Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: #ffffff;
  color: #0d0d0d;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-primary:hover {
  background: #e0e0e0;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: #161616;
  color: #ffffff;
  border: 1px solid #2a2a2a;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}
.btn-secondary:hover {
  background: #1a1a1a;
  border-color: #3a3a3a;
}
```

#### Accent/CTA Button (Cyan)
```css
.btn-accent {
  background: #1f8cf9;
  color: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}
.btn-accent:hover {
  background: #3a9dfa;
}
```

#### Danger Button
```css
.btn-danger {
  background: #ef4444;
  color: #ffffff;
}
.btn-danger:hover {
  background: #dc2626;
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: #a0a0a0;
}
.btn-ghost:hover {
  background: #161616;
  color: #ffffff;
}
```

---

### Form Inputs

```css
.input {
  width: 100%;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: #ffffff;
  font-size: 0.875rem;
}

.input::placeholder {
  color: #666666;
}

.input:focus {
  border-color: #3a3a3a;
  outline: none;
  box-shadow: 0 0 0 1px #3a3a3a;
}

.input-error {
  border-color: #ef4444;
}
```

---

### Cards

```css
.card {
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 0.5rem;
  padding: 1rem;
}

.card-elevated {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
```

---

### Badges / Status Pills

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.badge-warning {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.badge-error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.badge-info {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}
```

---

### Status Indicators

```css
.status-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  border: 2px solid #0d0d0d;
}

.status-online { background: #22c55e; }
.status-away { background: #eab308; }
.status-busy { background: #ef4444; }
.status-offline { background: #666666; }
```

---

### Toggle Switch

```css
.toggle {
  width: 2.75rem;
  height: 1.5rem;
  background: #2a2a2a;
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle[data-state="checked"] {
  background: #1f8cf9;
}

.toggle-thumb {
  width: 1.25rem;
  height: 1.25rem;
  background: #ffffff;
  border-radius: 9999px;
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  transition: transform 0.2s;
}

.toggle[data-state="checked"] .toggle-thumb {
  transform: translateX(1.25rem);
}
```

---

### Navigation Tabs

```css
.tabs {
  display: flex;
  gap: 0.25rem;
  background: transparent;
}

.tab {
  padding: 0.5rem 1rem;
  color: #a0a0a0;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
}

.tab:hover {
  color: #ffffff;
  background: #1a1a1a;
}

.tab-active {
  background: #1f8cf9;
  color: #ffffff;
}
```

---

### Sidebar Navigation

```css
.sidebar {
  width: 16rem;
  background: #161616;
  border-right: 1px solid #2a2a2a;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  margin: 0 0.5rem;
  color: #a0a0a0;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-item:hover,
.sidebar-item-active {
  background: #1a1a1a;
  color: #ffffff;
}

/* ProxyPilot variant - green accent */
.sidebar-item-active.accent-green {
  background: #22c55e;
  color: #0d0d0d;
}
```

---

### Tables

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 0.75rem 1rem;
  color: #a0a0a0;
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  border-bottom: 1px solid #2a2a2a;
}

.table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #2a2a2a;
  color: #ffffff;
}

.table tr:hover {
  background: #1a1a1a;
}
```

---

### Progress Bar

```css
.progress {
  width: 100%;
  height: 0.5rem;
  background: #2a2a2a;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1f8cf9, #22c55e);
  border-radius: 9999px;
  transition: width 0.3s ease;
}
```

---

### Dropdown Menu

```css
.dropdown {
  min-width: 180px;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 0.5rem;
  padding: 0.25rem 0;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  color: #a0a0a0;
  cursor: pointer;
  transition: all 0.15s;
}

.dropdown-item:hover {
  background: #1a1a1a;
  color: #ffffff;
}

.dropdown-separator {
  height: 1px;
  background: #2a2a2a;
  margin: 0.25rem 0;
}
```

---

### Modal / Dialog

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 0.75rem;
  max-width: 28rem;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #2a2a2a;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #2a2a2a;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
```

---

### Avatar

```css
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #1a1a1a;
  color: #ffffff;
  font-weight: 500;
  overflow: hidden;
}

.avatar-xs { width: 1.5rem; height: 1.5rem; font-size: 0.75rem; }
.avatar-sm { width: 2rem; height: 2rem; font-size: 0.875rem; }
.avatar-md { width: 2.5rem; height: 2.5rem; font-size: 1rem; }
.avatar-lg { width: 3rem; height: 3rem; font-size: 1.125rem; }
.avatar-xl { width: 4rem; height: 4rem; font-size: 1.25rem; }
```

---

## 7. Layout Patterns

### Page Shell with Sidebar

```
┌─────────────────────────────────────────────────┐
│ Logo/Brand                              Actions │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main Content Area                   │
│ Nav      │                                      │
│          │  ┌────────┐ ┌────────┐ ┌────────┐   │
│ - Item   │  │ Card   │ │ Card   │ │ Card   │   │
│ - Item   │  └────────┘ └────────┘ └────────┘   │
│ - Item   │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│ Footer / User Info                              │
└─────────────────────────────────────────────────┘
```

### Dashboard Grid

- Stats cards: Grid of 4 columns at desktop
- System health: Horizontal card row
- Tables: Full width with optional pagination
- Sidebar width: `16rem` (256px) or `20rem` (320px)

### Centered Form Layout (MEET style)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              BRAND                              │
│              Tagline                            │
│                                                 │
│         ┌───────────────────┐                   │
│         │                   │                   │
│         │   Form Card       │                   │
│         │                   │                   │
│         │   [ Input ]       │                   │
│         │   [ Button ]      │                   │
│         │   [ Button ]      │                   │
│         │                   │                   │
│         └───────────────────┘                   │
│                                                 │
│              Footer text                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 8. Iconography

### Recommended Icon Libraries

- **Lucide React** (primary choice)
- **Heroicons**
- **Phosphor Icons**

### Icon Sizing

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 14px | Inline, badges |
| `sm` | 16px | Buttons, nav items |
| `md` | 20px | Default |
| `lg` | 24px | Headers, emphasis |
| `xl` | 32px | Feature icons |

### Icon Colors

- Default: `currentColor` (inherits text color)
- Muted: `#666666`
- Active: `#ffffff`
- Accent: Match semantic colors

---

## 9. Animation & Transitions

### Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 0.1s | Micro-interactions |
| `--duration-normal` | 0.2s | Most transitions |
| `--duration-slow` | 0.3s | Modals, large movements |

### Easing

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

### Common Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale in (modals, dropdowns) */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide up (toasts) */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Mobile Considerations

- Sidebar collapses to hamburger menu below `lg`
- Cards stack vertically on mobile
- Touch targets minimum 44px × 44px

---

## 11. Application-Specific Variants

### MEET
- **Accent**: Cyan (`#1f8cf9`)
- **Branding**: Bold italic
- **Focus**: Video conferencing UI, minimal chrome

### NEON  
- **Accent**: White (`#ffffff`)
- **Branding**: Bold, industrial
- **Focus**: Dashboard density, data visualization

### ProxyPilot
- **Accent**: Green (`#22c55e`)
- **Branding**: Icon-forward
- **Focus**: Service management, status clarity

---

## 12. CSS Variables Template

```css
:root {
  /* Background */
  --bg: #0d0d0d;
  --bg-surface: #161616;
  --bg-surface-hover: #1a1a1a;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  
  /* Borders */
  --border: #2a2a2a;
  --border-focus: #3a3a3a;
  
  /* Semantic */
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Accent (customize per app) */
  --accent: #ffffff;
  --accent-cyan: #1f8cf9;
  --accent-green: #22c55e;
  
  /* Typography */
  --font-sans: Inter, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.6);
  
  /* Transitions */
  --duration-fast: 0.1s;
  --duration-normal: 0.2s;
  --duration-slow: 0.3s;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 13. Tailwind Configuration

If using Tailwind CSS, extend with these custom values:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        neon: {
          bg: '#0d0d0d',
          surface: '#161616',
          'surface-hover': '#1a1a1a',
          border: '#2a2a2a',
          'border-focus': '#3a3a3a',
          text: '#ffffff',
          'text-secondary': '#a0a0a0',
          'text-muted': '#666666',
          accent: '#ffffff',
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
      boxShadow: {
        'neon': '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
    },
  },
}
```

---

## Quick Reference

| Element | Background | Border | Text | Radius |
|---------|------------|--------|------|--------|
| Page | `#0d0d0d` | — | `#ffffff` | — |
| Card | `#161616` | `#2a2a2a` | `#ffffff` | `0.5rem` |
| Input | `#161616` | `#2a2a2a` | `#ffffff` | `0.375rem` |
| Button (Primary) | `#ffffff` | — | `#0d0d0d` | `0.375rem` |
| Button (Secondary) | `#161616` | `#2a2a2a` | `#ffffff` | `0.375rem` |
| Dropdown | `#161616` | `#2a2a2a` | `#a0a0a0` | `0.5rem` |
| Sidebar | `#161616` | `#2a2a2a` | `#a0a0a0` | — |

---

*Last updated: December 2025*  
*Fractionate LLC Internal Design System v1.0*
