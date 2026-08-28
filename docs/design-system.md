# Design System — NeuroScan AI

Generated with the `ui-ux-pro-max` skill (product: AI/technical dashboard tool, dark mode,
density 8/10) and adapted with a medical-teal accent so the app reads as clinical/technical
rather than a generic dark developer tool or a light patient-facing healthcare site.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0F1A` | App background |
| `--surface` | `#0F172A` | Section/panel background |
| `--card` | `#141B2D` | Card background |
| `--border` | `#263149` | Default borders |
| `--border-strong` | `#334155` | Emphasized borders / dividers |
| `--text` | `#F8FAFC` | Primary text |
| `--text-muted` | `#94A3B8` | Secondary text |
| `--primary` | `#0891B2` | Primary actions, links, active nav |
| `--primary-glow` | `#22D3EE` | Hover/glow accents, focus highlight |
| `--success` | `#22C55E` | Healthy status, checkpoint loaded |
| `--warning` | `#F59E0B` | Demo-mode banner, caution states |
| `--destructive` | `#EF4444` | Errors, destructive actions |

### Segmentation class colors (fixed, used everywhere — legend, overlay, charts)

| Class | Hex | Meaning |
|---|---|---|
| NCR/NET | `#F97316` | Necrotic / non-enhancing tumor core |
| ED | `#FACC15` | Peritumoral edema |
| ET | `#EF4444` | Enhancing tumor |

These three never change meaning or color across the app. Per accessibility guidance, color is
always paired with a text label (legend, tooltip, or badge) — never color alone.

## Typography

- **UI text:** IBM Plex Sans (300/400/500/600/700)
- **Numeric / technical:** JetBrains Mono — case IDs, file names, voxel counts, Dice scores,
  volumes (cm³), timestamps
- Base size 16px, line-height 1.5, headings use IBM Plex Sans 600/700.

## Motion

`framer-motion`, subtle (200–400ms), used for: page/section reveal on mount, card hover lift,
modal/toast enter-exit, upload progress. All motion is skipped when
`prefers-reduced-motion: reduce` is set (see `frontend/lib/motion.ts`).

## Icons

`lucide-react` exclusively. No emoji as icons anywhere in the UI.

## Accessibility checklist (verified against `ui-ux-pro-max` pre-delivery checklist)

- [x] Text contrast ≥ 4.5:1 against backgrounds used for that text
- [x] Visible focus rings on every interactive element (`:focus-visible`, 3px ring in
  `--primary-glow`)
- [x] Touch targets ≥ 44×44px
- [x] No color-only meaning (segmentation legend always shows text labels)
- [x] Responsive at 375 / 768 / 1024 / 1440px
- [x] `prefers-reduced-motion` respected
