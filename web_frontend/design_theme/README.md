# Barista Design Theme

A warm, coffee-inspired design system for the Barista web application.

---

## Color Palette

### Primary Brand Colors

| Token | Light Mode | Hex | Description |
|-------|-----------|-----|-------------|
| `--color-primary` | Saddle Brown | `#8b4513` | Main brand color |
| `--color-primary-hover` | Dark Coffee | `#6d360f` | Hover state |
| `--color-primary-light` | Light Coffee | `#a65e2e` | Lighter variant |
| `--color-primary-10` | 10% opacity | `rgba(139, 69, 19, 0.1)` | Subtle backgrounds |
| `--color-primary-20` | 20% opacity | `rgba(139, 69, 19, 0.2)` | Medium backgrounds |

### Background Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-bg` | `#f8f7f6` (Cream white) | `#211811` (Dark coffee) |
| `--color-bg-secondary` | `#fdfbf7` (Warm white) | `#2a1e16` |
| `--color-bg-tertiary` | `#f3ece8` (Warm beige) | `#3a2c20` |

### Surface Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-surface` | `#ffffff` | `#2c241b` |
| `--color-surface-hover` | `#fdf8f5` | `#3a2e26` |
| `--color-surface-elevated` | `#ffffff` | `#322a1f` |

### Text Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-text` | `#1b130e` (Espresso brown) | `#f3ece8` (Light cream) |
| `--color-text-secondary` | `#956d50` (Warm brown) | `#b08d74` |
| `--color-text-muted` | `#6b5e55` | `#9c9590` |
| `--color-text-inverted` | `#ffffff` | `#ffffff` |

### Border Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-border` | `#e5e0dc` | `#4a3e36` |
| `--color-border-light` | `#f3ece8` | `#3a2e26` |

### Semantic Colors

| Type | Color | Background | Text |
|------|-------|------------|------|
| Success | `#16a34a` | `#f0fdf4` | `#166534` |
| Warning | `#ca8a04` | `#fefce8` | `#854d0e` |
| Error | `#dc2626` | `#fef2f2` | `#991b1b` |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-gold` | `#b8860b` | Loyalty points, rewards |
| `--color-caramel` | `#d4a574` | Decorative accents |

### Food Type Indicators

| Type | Color |
|------|-------|
| Vegetarian | `#16a34a` (Green) |
| Non-Vegetarian | `#dc2626` (Red) |

---

## Typography

### Font Family

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-display: 'Inter', system-ui, -apple-system, sans-serif;
```

**Primary Font:** Inter (Google Fonts)

### Font Sizes

| Token | Size | Pixels |
|-------|------|--------|
| `--font-size-xs` | `0.75rem` | 12px |
| `--font-size-sm` | `0.875rem` | 14px |
| `--font-size-base` | `1rem` | 16px |
| `--font-size-lg` | `1.125rem` | 18px |
| `--font-size-xl` | `1.25rem` | 20px |
| `--font-size-2xl` | `1.5rem` | 24px |
| `--font-size-3xl` | `1.875rem` | 30px |
| `--font-size-4xl` | `2.25rem` | 36px |

### Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |
| `--font-weight-black` | 900 |

### Line Heights

| Token | Value |
|-------|-------|
| `--line-height-tight` | 1.25 |
| `--line-height-normal` | 1.5 |
| `--line-height-relaxed` | 1.625 |

---

## Spacing

| Token | Size | Pixels |
|-------|------|--------|
| `--spacing-1` | `0.25rem` | 4px |
| `--spacing-2` | `0.5rem` | 8px |
| `--spacing-3` | `0.75rem` | 12px |
| `--spacing-4` | `1rem` | 16px |
| `--spacing-5` | `1.25rem` | 20px |
| `--spacing-6` | `1.5rem` | 24px |
| `--spacing-8` | `2rem` | 32px |
| `--spacing-10` | `2.5rem` | 40px |
| `--spacing-12` | `3rem` | 48px |
| `--spacing-16` | `4rem` | 64px |

---

## Border Radius

| Token | Size | Pixels |
|-------|------|--------|
| `--radius-sm` | `0.25rem` | 4px |
| `--radius-md` | `0.5rem` | 8px |
| `--radius-lg` | `0.75rem` | 12px |
| `--radius-xl` | `1rem` | 16px |
| `--radius-2xl` | `1.5rem` | 24px |
| `--radius-full` | `9999px` | Circular |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Medium elevation |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | High elevation |
| `--shadow-soft` | `0 4px 20px -2px rgba(139, 69, 19, 0.05)` | Cards (coffee-tinted) |
| `--shadow-soft-hover` | `0 10px 25px -5px rgba(139, 69, 19, 0.15)` | Card hover state |
| `--shadow-primary` | `0 4px 14px 0 rgba(139, 69, 19, 0.25)` | Primary buttons |

---

## Transitions

| Token | Value |
|-------|-------|
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `200ms ease` |
| `--transition-slow` | `300ms ease` |
| `--transition-slower` | `500ms ease` |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | 10 | Dropdown menus |
| `--z-sticky` | 20 | Sticky elements |
| `--z-fixed` | 30 | Fixed elements |
| `--z-modal-backdrop` | 40 | Modal overlay |
| `--z-modal` | 50 | Modal content |
| `--z-popover` | 60 | Popovers |
| `--z-tooltip` | 70 | Tooltips |

---

## Icons

**Icon System:** Material Symbols Outlined

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
```

### Icon Styles

```css
/* Outlined (default) */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Filled */
.material-symbols-outlined.icon-filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

---

## Animations

### Keyframes

| Animation | Description |
|-----------|-------------|
| `fadeIn` | Opacity 0 to 1 |
| `slideUp` | Slide up with fade |
| `scaleIn` | Scale from 0.95 to 1 with fade |
| `shimmer` | Loading skeleton effect |
| `pulse-soft` | Subtle pulse effect |

### Utility Classes

| Class | Animation |
|-------|-----------|
| `.animate-fade-in` | 200ms fade in |
| `.animate-slide-up` | 300ms slide up |
| `.animate-scale-in` | 200ms scale in |
| `.animate-shimmer` | Continuous shimmer |

---

## Component Styles

### Buttons

#### Primary Button
```css
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.5rem;
  border-radius: 0.75rem;
  box-shadow: var(--shadow-primary);
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: var(--color-primary-10);
  color: var(--color-primary);
  /* Hover: fills with primary color */
}
```

#### Ghost Button
```css
.btn-ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
  /* Hover: subtle background */
}
```

### Cards

```css
.card {
  background-color: var(--color-surface);
  border-radius: 1rem;
  box-shadow: var(--shadow-soft);
  /* Hover: elevates with border tint */
}

.card-flat {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
}
```

### Inputs

```css
.input {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.625rem 1rem;
  /* Focus: primary color border with ring */
}
```

### Food Indicators (FSSAI Style)

```css
/* Vegetarian: Green square with circle */
.food-indicator-veg {
  border-color: var(--color-veg);
  /* Circle inside */
}

/* Non-Vegetarian: Red square with triangle */
.food-indicator-nonveg {
  border-color: var(--color-nonveg);
  /* Triangle inside */
}
```

---

## Dark Mode

Dark mode is enabled by adding the `.dark` class to the root element. All color variables automatically update to their dark mode values.

Key differences in dark mode:
- Backgrounds shift to deep coffee browns (`#211811`, `#2a1e16`)
- Surfaces become dark brown (`#2c241b`)
- Text inverts to light cream (`#f3ece8`)
- Borders become subtle dark accents

---

## File Structure

```
web_frontend/
├── src/
│   ├── app/
│   │   └── globals.css      # Main theme with Tailwind integration
│   └── styles/
│       └── theme.css        # CSS variables reference
```

---

## Usage

### In CSS
```css
.element {
  background: var(--color-primary);
  color: var(--color-text);
  border-radius: var(--radius-lg);
}
```

### In Tailwind
```jsx
<div className="bg-primary text-foreground rounded-lg" />
<button className="bg-primary hover:bg-primary-hover" />
```

---

## Theme Customization

To create a custom theme, modify the CSS variables in `:root` in `globals.css`:

```css
:root {
  /* Change primary color */
  --color-primary: #your-color;
  --color-primary-hover: #your-darker-color;

  /* Update backgrounds */
  --color-bg: #your-background;
  /* ... */
}
```
