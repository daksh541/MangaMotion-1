# MangaMotion Footer - Figma Design Guide

## Figma Frame Setup Instructions

### Frame 1: Desktop - Variation B (Premium)
**Dimensions**: 1440px × 600px
**Background**: Linear gradient (top to bottom)
- Start: `#0F1419`
- End: `#0a0d11`

#### Layer Structure
```
Desktop Premium (1440 × 600)
├── Background Gradient
├── Noise Texture (SVG overlay, 2% opacity)
├── Row 1: Brand Block (1440 × 96)
│   ├── Border Bottom (white, 10% opacity)
│   ├── Logo (32 × 32, gradient M)
│   ├── "MangaMotion" (20px bold, white)
│   └── Tagline (12px, gray-400)
├── Row 2: Columns (1440 × 240)
│   ├── Border Bottom (white, 10% opacity)
│   ├── Column 1: Product (glass card)
│   ├── Column 2: Company (glass card)
│   ├── Column 3: Support (glass card)
│   └── Column 4: Resources (glass card)
├── Row 3: Subscribe & Social (1440 × 180)
│   ├── Border Bottom (white, 10% opacity)
│   ├── Subscribe Form (glass card)
│   └── Social Icons (4 × rounded buttons)
├── Row 4: Legal (1440 × 84)
│   ├── Copyright Text
│   └── Legal Links
└── Gradient Accent Line (bottom, purple glow)
```

### Frame 2: Desktop - Variation A (Compact)
**Dimensions**: 1440px × 480px
**Background**: Same gradient
**Key Differences**:
- All padding reduced to 24px/32px
- Logo: 24px
- Icons: 28px
- Tighter spacing throughout
- More condensed typography

### Frame 3: Mobile - Variation B (Premium)
**Dimensions**: 375px × 1200px
**Background**: Same gradient

#### Layer Structure
```
Mobile Premium (375 × 1200)
├── Background Gradient
├── Noise Texture
├── Row 1: Brand Block (375 × 80)
├── Row 2: Accordion Columns (375 × 320)
│   ├── Product (expanded state shown)
│   ├── Company (collapsed)
│   ├── Support (collapsed)
│   └── Resources (collapsed)
├── Row 3: Subscribe Form (375 × 160)
├── Row 4: Social Icons (375 × 60)
├── Row 5: Legal Links (375 × 80)
└── Gradient Accent Line
```

### Frame 4: Component Library
**Dimensions**: 1440 × 1600px
**Background**: Dark gray (#1F2937)

#### Components to Create
1. **footer-card (Component)**
   - Size: 300 × 200px
   - States: Default, Hover
   - Properties: Padding, Corner Radius, Shadow

2. **social-icon (Component)**
   - Size: 36 × 36px
   - States: Default, Hover, Focus
   - Properties: Icon, Size, Color

3. **subscribe-form (Component)**
   - Size: 600 × 120px
   - States: Default, Input Focused, Success
   - Properties: Label, Placeholder, Button Text

4. **link-group (Component)**
   - Size: 300 × 180px
   - Properties: Heading, Link Count
   - States: Default, Hover

5. **accordion-item (Component)**
   - Size: 375 × 80px
   - States: Collapsed, Expanded
   - Properties: Title, Chevron Rotation

---

## Design Token Specifications

### Colors
Create a color library in Figma:

| Token Name | Hex | RGB | Usage |
|---|---|---|---|
| `bg-primary` | #0F1419 | 15, 20, 25 | Main background |
| `bg-secondary` | #0a0d11 | 10, 13, 17 | Gradient end |
| `glass-light` | #FFFFFF (5%) | - | Glass panels |
| `glass-dark` | #FFFFFF (3%) | - | Input backgrounds |
| `border-light` | #FFFFFF (10%) | - | Borders |
| `text-primary` | #FFFFFF | 255, 255, 255 | Headings |
| `text-secondary` | #D1D5DB | 209, 213, 219 | Body text |
| `text-tertiary` | #9CA3AF | 156, 163, 175 | Muted text |
| `text-quaternary` | #6B7280 | 107, 114, 128 | Legal text |
| `accent-purple` | #A855F7 | 168, 85, 247 | Primary accent |
| `accent-blue` | #3B82F6 | 59, 130, 246 | Secondary accent |
| `accent-pink` | #EC4899 | 236, 72, 153 | Tertiary accent |
| `success-green` | #4ADE80 | 74, 222, 128 | Success state |

### Typography
Create text styles in Figma:

| Style Name | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `heading-lg` | Inter/Poppins | 20px | Bold (700) | 28px | -0.5px |
| `heading-md` | Inter/Poppins | 14px | Bold (700) | 20px | 0px |
| `body-md` | Inter/Poppins | 14px | Regular (400) | 20px | 0px |
| `body-sm` | Inter/Poppins | 12px | Regular (400) | 18px | 0px |
| `caption` | Inter/Poppins | 12px | Regular (400) | 16px | 0px |

### Effects
Create shadow styles:

| Effect Name | Shadow | Blur | Spread | Color |
|---|---|---|---|---|
| `shadow-card` | 0 25px 40px | - | -5px | rgba(0,0,0,0.1) |
| `shadow-glow-purple` | 0 0 20px | - | - | rgba(168,85,247,0.8) |
| `shadow-glow-sm` | 0 0 12px | - | - | rgba(168,85,247,0.6) |

---

## Interactive States & Interactions

### Column Card Hover
```
Before: bg-white/5, border-white/10, shadow-sm
After: bg-white/8, border-white/10, shadow-glow-purple
Transition: 200ms ease-in-out
Properties: Background color, Shadow
```

### Link Underline Animation
```
Before: No underline, text-gray-400
After: Gradient underline (left to right), text-white
Transition: 300ms ease-in-out
Properties: Width (0% → 100%), Color
```

### Social Icon Hover
```
Before: bg-white/8, text-gray-400, scale 100%
After: bg-purple-500/20, text-purple-400, scale 110%, shadow-glow-purple
Transition: 300ms ease-in-out
Properties: Background, Text color, Scale, Shadow
```

### Email Input Focus
```
Before: border-white/10, bg-white/3
After: border-purple-500/60, bg-white/6, shadow-glow-sm, pulse animation
Transition: 300ms ease-in-out
Properties: Border color, Background, Shadow, Opacity (pulse)
```

### Subscribe Button Hover
```
Before: Gradient background, minimal shadow
After: Gradient background, shadow-glow-purple, scale 100%
Transition: 200ms ease-in-out
Properties: Shadow
Active: scale-98%
```

---

## Responsive Breakpoints

### Desktop (1024px+)
- Full 4-column grid
- All elements visible
- Hover states active

### Tablet (768px - 1023px)
- 2-column grid (Product/Company, Support/Resources)
- Adjusted padding
- Touch-friendly tap areas (44px minimum)

### Mobile (< 768px)
- Accordion layout
- Single column
- Full-width inputs
- Stacked legal links
- Larger touch targets (48px minimum)

---

## Accessibility Annotations

### Contrast Checks
- Add contrast checker annotations to text elements
- Verify 4.5:1 ratio for body text
- Verify 3:1 ratio for UI components

### Focus States
- Add visible focus ring annotations (2px purple)
- Document focus order (top-left to bottom-right)
- Include keyboard navigation notes

### ARIA Labels
- Annotate all interactive elements
- Document form field relationships
- Include screen reader text notes

---

## Export Settings

### For Web
- **Format**: PNG (for preview), SVG (for icons)
- **Scale**: 1x, 2x
- **Compression**: Optimized

### For Development
- **CSS Export**: Generate Tailwind classes
- **Spacing**: Export spacing tokens
- **Colors**: Export color palette
- **Typography**: Export font stack and sizes

### Handoff Notes
- Use Figma's "Inspect" panel for developers
- Include measurement annotations
- Document all interactive states
- Provide design tokens export

---

## Animation Specifications

### Micro-interactions Timeline

#### 1. Column Card Hover (200ms)
```
0ms: Start
100ms: Background color transition
150ms: Shadow expansion
200ms: Complete
```

#### 2. Link Underline (300ms)
```
0ms: Start (width: 0%)
150ms: Halfway (width: 50%)
300ms: Complete (width: 100%)
```

#### 3. Social Icon Hover (300ms)
```
0ms: Start
100ms: Color change
150ms: Scale increase
200ms: Shadow glow
300ms: Complete
```

#### 4. Email Input Focus (300ms)
```
0ms: Start
100ms: Border color change
150ms: Shadow appear + pulse begin
300ms: Complete (pulse continues)
```

---

## Variation Comparison Matrix

| Aspect | Compact (A) | Premium (B) |
|---|---|---|
| **Padding** | 24px/32px | 32px/48px |
| **Logo Size** | 24px | 32px |
| **Social Icons** | 28px | 36px |
| **Card Gap** | 18px | 24px |
| **Font Size (Body)** | 13px | 14px |
| **Font Size (Heading)** | 13px | 14px |
| **Total Height (Desktop)** | 480px | 600px |
| **Use Case** | Minimal, Dense | Premium, Spacious |
| **Brand Tone** | Modern, Tech | Luxury, Premium |

---

## Design System Integration

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'manga-dark': '#0F1419',
        'manga-darker': '#0a0d11',
        'manga-glass': 'rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.8)',
        'glow-sm': '0 0 12px rgba(168, 85, 247, 0.6)',
      },
    },
  },
};
```

### CSS Variables (Alternative)
```css
:root {
  --color-bg-primary: #0F1419;
  --color-bg-secondary: #0a0d11;
  --color-accent-purple: #A855F7;
  --color-accent-blue: #3B82F6;
  --color-accent-pink: #EC4899;
  --shadow-glow: 0 0 20px rgba(168, 85, 247, 0.8);
  --blur-glass: 12px;
}
```

---

## Quality Checklist

- [ ] All text meets WCAG AA contrast requirements
- [ ] Focus states visible on all interactive elements
- [ ] Animations smooth and performant (60fps)
- [ ] Responsive design tested on all breakpoints
- [ ] Touch targets minimum 44px on mobile
- [ ] Color palette accessible for colorblind users
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatible
- [ ] No layout shift on state changes
- [ ] Hover states disabled on touch devices

---

## Developer Handoff Checklist

- [ ] Figma file shared with development team
- [ ] All components created and organized
- [ ] Design tokens exported
- [ ] Spacing and sizing documented
- [ ] Animation timings specified
- [ ] Responsive breakpoints defined
- [ ] Accessibility requirements listed
- [ ] Color palette with hex codes provided
- [ ] Typography scale defined
- [ ] Interactive states documented
