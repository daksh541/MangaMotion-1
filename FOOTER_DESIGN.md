# MangaMotion Footer Design System

## Design Philosophy
Modern, cinematic footer for an AI-powered anime product. Premium feel with glassmorphism, neon accents, and subtle micro-interactions.

---

## Color Palette

### Primary Colors
- **Background**: `#0F1419` (Deep navy/charcoal)
- **Glass Card BG**: `rgba(255, 255, 255, 0.05)` with 12px blur
- **Text Primary**: `#E8E8E8` (High contrast, 4.5:1 ratio)
- **Text Secondary**: `#A0A0A0` (Muted, 4.5:1 ratio)

### Neon Accents (Gradient)
- **Purple**: `#A855F7`
- **Blue**: `#3B82F6`
- **Pink**: `#EC4899`
- **Gradient**: `linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)`

### Shadows & Effects
- **Drop Shadow**: `0 20px 25px -5px rgba(0, 0, 0, 0.3)`
- **Inner Glow**: `inset 0 1px 0 rgba(255, 255, 255, 0.1)`
- **Noise Texture**: SVG noise overlay at 2-3% opacity

---

## Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Logo | Inter | 20px | 700 | #E8E8E8 |
| Tagline | Inter | 12px | 400 | #A0A0A0 |
| Column Heading | Inter | 14px | 700 | #E8E8E8 |
| Heading Accent (1st letter) | Inter | 14px | 700 | Neon gradient |
| Link | Inter | 13px | 400 | #A0A0A0 |
| Link Hover | Inter | 13px | 400 | #E8E8E8 |
| Copyright | Inter | 11px | 400 | #808080 |

---

## Layout Structure

### Variation A: Compact Dark
- **Brand Block**: Single-line logo + tagline (inline)
- **Cards**: Smaller padding (16px), tighter spacing
- **Social Icons**: 28px diameter
- **Overall Height**: ~380px (desktop)

### Variation B: Spacious Premium
- **Brand Block**: Stacked logo + tagline with icon thumbnail
- **Cards**: Generous padding (24px), spacious columns
- **Social Icons**: 36px diameter
- **Overall Height**: ~480px (desktop)

---

## Component Specifications

### 1. Footer Card (Glass Panel)
```
Background: rgba(255, 255, 255, 0.05)
Backdrop Filter: blur(12px)
Border: 1px solid rgba(255, 255, 255, 0.1)
Border Radius: 12px
Padding: 24px (Premium) / 16px (Compact)
Box Shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3)
Inner Glow: inset 0 1px 0 rgba(255, 255, 255, 0.1)
```

### 2. Social Icon
```
Size: 36px (Premium) / 28px (Compact)
Background: rgba(255, 255, 255, 0.08)
Border Radius: 50%
Border: 1px solid rgba(255, 255, 255, 0.1)
Hover State:
  - Background: rgba(168, 85, 247, 0.2)
  - Border: 1px solid rgba(168, 85, 247, 0.5)
  - Icon Color: #A855F7 (with glow)
  - Animation: 200ms ease-out
```

### 3. Subscribe Form
```
Container: Full-width glass card
Input:
  - Background: rgba(255, 255, 255, 0.03)
  - Border: 1px solid rgba(255, 255, 255, 0.1)
  - Border Radius: 8px
  - Padding: 12px 16px
  - Focus: Soft pulse animation + neon border
Button:
  - Background: linear-gradient(135deg, #A855F7, #3B82F6, #EC4899)
  - Border Radius: 8px
  - Padding: 12px 32px
  - Hover: Brightness +10%, shadow expand
  - Active: Scale 0.98
```

### 4. Links & Dividers
```
Link:
  - Color: #A0A0A0
  - Hover: Underline with neon fade (200ms)
  - Focus: Visible outline (2px solid #A855F7)
Divider:
  - Color: rgba(255, 255, 255, 0.1)
  - Accent Divider: linear-gradient(90deg, transparent, #A855F7, transparent)
```

---

## Micro-Interactions

### Social Icon Hover
- **Duration**: 200ms
- **Easing**: ease-out
- **Effects**: 
  - Background color shift to neon
  - Icon glow (box-shadow: 0 0 12px rgba(168, 85, 247, 0.6))
  - Subtle scale (1.05x)

### Link Underline Fade
- **Duration**: 300ms
- **Effect**: Underline appears with gradient fade from left to right
- **Color**: Neon gradient (purple → blue → pink)

### Email Input Focus
- **Duration**: 400ms
- **Effects**:
  - Border color: Neon gradient
  - Soft pulse animation (subtle scale 1.01 → 1.0)
  - Inner glow intensifies

### Button Hover
- **Duration**: 200ms
- **Effects**:
  - Brightness increase
  - Shadow expands (0 25px 40px -5px rgba(168, 85, 247, 0.3))
  - Cursor pointer

---

## Responsive Breakpoints

### Desktop (1024px+)
- Full 4-column layout in glass cards
- Horizontal social icons
- Subscribe form: email input + button side-by-side

### Tablet (768px - 1023px)
- 2-column layout (Product + Company | Support + Resources)
- Stacked subscribe form (email full-width, button below)

### Mobile (< 768px)
- Single column
- Accordion-style columns (expandable with chevron icon)
- Stacked subscribe form
- Larger tap areas (48px minimum)
- Social icons in horizontal scroll or grid (2x2)

---

## Accessibility Checklist

- [x] Text contrast: 4.5:1 for body text
- [x] Heading contrast: 4.3:1+ (acceptable for large text)
- [x] Focus visible: 2px solid outline on all interactive elements
- [x] Keyboard navigation: Tab order logical, no keyboard traps
- [x] ARIA labels: Form inputs, buttons, social links
- [x] Color not sole indicator: Hover states include underline, glow, etc.
- [x] Touch targets: 48px minimum on mobile
- [x] Semantic HTML: `<footer>`, `<nav>`, `<form>`, `<button>`

---

## Tailwind Class Suggestions

### Core Classes
```
Footer Container:
  bg-gradient-to-b from-[#0F1419] to-[#0a0d11]
  relative overflow-hidden

Glass Card:
  bg-white/5 backdrop-blur-[12px]
  border border-white/10
  rounded-xl shadow-2xl
  hover:bg-white/[0.08] transition-colors

Neon Text (Heading):
  text-white font-bold
  bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500
  bg-clip-text text-transparent (first letter only)

Social Icon:
  w-9 h-9 rounded-full
  bg-white/8 border border-white/10
  hover:bg-purple-500/20 hover:border-purple-500/50
  transition-all duration-200
  hover:shadow-[0_0_12px_rgba(168,85,247,0.6)]

Subscribe Button:
  bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500
  hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)]
  active:scale-[0.98]
  transition-all duration-200

Link Hover:
  text-gray-300 hover:text-white
  underline decoration-transparent hover:decoration-current
  decoration-wavy decoration-2 underline-offset-4
  transition-all duration-300
```

---

## Figma Frame Specs

### Frame 1: Desktop Variation A (Compact Dark)
- **Dimensions**: 1440 x 380px
- **Components**: 
  - Brand block (inline)
  - 4 glass cards (Product, Company, Support, Resources)
  - Social icons row
  - Subscribe form
  - Legal links + copyright

### Frame 2: Desktop Variation B (Spacious Premium)
- **Dimensions**: 1440 x 480px
- **Components**: 
  - Brand block (stacked with icon)
  - 4 larger glass cards
  - Social icons row
  - Subscribe form (larger)
  - Legal links + copyright

### Frame 3: Mobile (< 768px)
- **Dimensions**: 375 x 720px
- **Components**:
  - Brand block (full-width)
  - Accordion columns (expandable)
  - Social icons (2x2 grid)
  - Subscribe form (stacked)
  - Legal links

---

## Microcopy

- **Tagline**: "Transform manga into cinematic animation with AI."
- **Subscription Helper**: "No spam — unsubscribe anytime."
- **Column Headings**: Product, Company, Support, Resources
- **Sample Links**: 
  - Product: Features, Pricing, API Docs, Roadmap
  - Company: About, Blog, Careers, Press
  - Support: Help Center, Community, Contact, Status
  - Resources: Documentation, Tutorials, Templates, Changelog

---

## Animation Keyframes (CSS)

```css
@keyframes neon-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 16px rgba(168, 85, 247, 0.8); }
}

@keyframes pulse-soft {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.01); }
}

@keyframes underline-fade {
  0% { 
    background-position: -200% center;
    opacity: 0;
  }
  100% { 
    background-position: 200% center;
    opacity: 1;
  }
}
```

---

## Notes for Development

1. **Noise Texture**: Use SVG filter or CSS backdrop for subtle grain
2. **Performance**: Use `will-change: transform` on hover elements
3. **Dark Mode**: Already designed for dark mode; light mode variant can invert colors
4. **Accessibility**: Test with WAVE, Axe DevTools, and keyboard navigation
5. **Testing**: Verify on Chrome, Firefox, Safari, and mobile browsers
