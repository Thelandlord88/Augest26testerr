# Design Tokens

Source of truth: `src/styles/input.css` (CSS custom properties). These drive theming, dark mode, accessibility, and component styling.

| Token | Purpose |
|-------|---------|
| `--color-brand-accent` | Primary accent brand color (links, focus, interactive states) |
| `--color-brand-navy` | Brand deep navy (hero, headings) |
| `--color-bg-base` | Light mode background base |
| `--color-fg-base` | Light mode foreground/base text |
| `--color-bg-base-dark` | Dark mode background base |
| `--color-fg-base-dark` | Dark mode foreground/base text |
| `--color-link-accent` | Primary link color in light mode prose |
| `--color-link-accent-alt` | Link color used for dark mode prose |
| `--color-card-border` | Card border color (light) |
| `--color-card-border-dark` | Card border color (dark) |
| `--shadow-card-hover` | Elevated card shadow on hover/focus |
| `--radius-pill` | Fully rounded pill radius (buttons, pills) |
| `--radius-card` | Standard card corner radius |
| `--space-card` | Internal card padding |
| `--ease-swoop` | Default easing curve for transitions |

## Usage Guidelines

1. Always use tokens instead of raw hex values in new components to ensure future theming (e.g., brand color changes) cascades uniformly.
2. Prefer semantic mapping (e.g., `var(--color-brand-accent)`) over embedding Tailwind utilities when the style is intrinsic to the component rather than a one-off variant.
3. For new accent or status colors, add them as `--color-status-*` tokens and document here.
4. Maintain WCAG AA contrast. Run `npm run contrast:audit` after adding tokens.
5. When adding spacing tokens, keep naming consistent: `--space-*` in `rem` units.

## Auditing

Scripts:
* `npm run contrast:audit` – Contrast ratios on key foreground/background token pairs.
* `npm run css:size` – Current bundle size relative to performance budget.

## Future Improvements

* Introduce light/dark adaptive palettes via prefers-color-scheme dynamic tokens.
* Export tokens to JSON (style-dictionary) for potential cross-platform use.
* Add motion tokens (`--motion-duration-fast`, etc.) and respect reduced-motion automatically.
