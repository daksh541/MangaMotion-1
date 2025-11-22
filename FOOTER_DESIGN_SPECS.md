# MangaMotion Footer Design Specifications

## Overview
A modern, cinematic footer for an AI-powered anime product with glassmorphism panels, neon gradient accents, and smooth micro-interactions.

---

## Visual Style Guide

### Color Palette
- **Background**: Deep navy/charcoal gradient
  - Primary: `#0F1419` (from)
  - Secondary: `#0a0d11` (to)
- **Neon Gradient**: Purple → Blue → Pink
  - Purple: `#A855F7` (rgb: 168, 85, 247)
  - Blue: `#3B82F6` (rgb: 59, 130, 246)
  - Pink: `#EC4899` (rgb: 236, 72, 153)
- **Text**: 
  - Primary: `#FFFFFF` (white, headings)
  - Secondary: `#D1D5DB` (gray-300, body text)
  - Tertiary: `#9CA3AF` (gray-400, muted)
  - Quaternary: `#6B7280` (gray-500, legal text)
- **Glass**: `rgba(255, 255, 255, 0.05)` with `backdrop-blur-[12px]`
- **Borders**: `rgba(255, 255, 255, 0.1)` (white/10)

### Typography
- **Font Family**: Sans-serif (system default or custom: Inter, Poppins)
- **Headings**: Bold, 14px (0.875rem), neon first letter
- **Body Text**: Regular, 14px (0.875rem), gray-400
- **Small Text**: Regular, 12px (0.75rem), gray-500
- **Tagline**: Regular, 12px (0.75rem), gray-400, muted

### Effects
- **Glassmorphism**: `backdrop-blur-[12px]` + `border-white/10` + `bg-white/5`
- **Drop Shadow**: `shadow-2xl` (0 25px 40px -5px rgba(0,0,0,0.1))
- **Glow Shadow**: `shadow-[0_0_20px_rgba(168,85,247,0.8)]` (neon purple)
- **Noise Texture**: Subtle SVG fractal noise overlay at 2% opacity
- **Inner Glow**: Achieved via border color + shadow combination

---

## Layout Structure

### Desktop (1024px+)

#### Row 1: Brand Block
- **Height**: 80-96px (compact: 64px)
- **Padding**: 32px horizontal, 48px vertical (compact: 24px/32px)
- **Border**: Bottom border `border-white/10`
- **Content**:
  - Logo: 32px × 32px gradient square with "M" (compact: 24px)
  - Brand Name: "MangaMotion" (20px bold, white)
  - Tagline: "Transform manga into cinematic animation with AI." (12px, gray-400)
  - Layout: Flex column (compact: flex row with gap-3)

#### Row 2: Four Column Grid
- **Grid**: 4 equal columns with 24px gap
- **Padding**: 32px horizontal, 48px vertical (compact: 24px/32px)
- **Border**: Bottom border `border-white/10`
- **Column Card**:
  - Background: `bg-white/5 backdrop-blur-[12px]`
  - Border: `border border-white/10`
  - Padding: 24px
  - Border Radius: 12px (rounded-xl)
  - Hover: `bg-white/8` + shadow glow
  - **Heading**: 14px bold, first letter neon gradient
  - **Links**: 14px, gray-400, with underline animation on hover
  - **Link Spacing**: 12px vertical gap
  - **Link Count**: 4-6 per column

**Columns**:
1. **Product**: Features, Pricing, API Docs, Roadmap, Changelog
2. **Company**: About, Blog, Careers, Press, Contact
3. **Support**: Help Center, Community, Status, Documentation, FAQ
4. **Resources**: Tutorials, Templates, Case Studies, Webinars, Guides

#### Row 3: Subscribe & Social
- **Padding**: 32px horizontal, 48px vertical (compact: 24px/32px)
- **Border**: Bottom border `border-white/10`
- **Subscribe Form**:
  - Card: `bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6`
  - Label: "Stay Updated" (14px bold, white)
  - Input: 
    - Placeholder: "your@email.com"
    - Unfocused: `border-white/10`
    - Focused: `border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse`
    - Padding: 12px 16px
    - Border Radius: 8px (rounded-lg)
  - Button:
    - Text: "Subscribe"
    - Background: Gradient `from-purple-500 via-blue-500 to-pink-500`
    - Padding: 12px 24px
    - Border Radius: 8px
    - Hover: Shadow glow `shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)]`
    - Active: `scale-[0.98]`
    - Icon: Send (16px)
  - Helper Text: "✓ No spam — unsubscribe anytime." (12px, gray-500)
  - Success Message: "Thanks for subscribing!" (12px, green-400, animate-pulse)
- **Social Icons**:
  - Label: "Follow us" (14px, gray-400)
  - Icons: GitHub, Twitter, LinkedIn, Instagram
  - Size: 36px × 36px (compact: 28px)
  - Background: `bg-white/8 border border-white/10 rounded-full`
  - Hover: 
    - Background: `bg-purple-500/20`
    - Border: `border-purple-500/50`
    - Glow: `shadow-[0_0_20px_rgba(168,85,247,0.8)]`
    - Scale: `scale-110`
    - Color: `text-purple-400`
  - Focus: `focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2`

#### Row 4: Legal & Copyright
- **Padding**: 32px horizontal, 32px vertical (compact: 24px/24px)
- **Layout**: Flex row, space-between on desktop, column on mobile
- **Copyright**: "© 2024 MangaMotion. All rights reserved." (12px, gray-500)
- **Legal Links**: Privacy Policy, Terms of Service, Cookie Policy
  - Spacing: 24px horizontal gap
  - Hover: `text-gray-300`
  - Focus: `focus:ring-2 focus:ring-purple-500/50`

---

### Mobile (< 768px)

#### Accordion Columns
- **Card**: `bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl`
- **Header**: 
  - Padding: 16px 24px
  - Flex: space-between
  - Heading: 14px bold, first letter neon
  - Chevron: 18px, rotates 180° when expanded
- **Content**: 
  - Padding: 16px 24px (bottom)
  - Border-top: `border-white/5`
  - Links: 14px, gray-400, 12px vertical gap
- **Spacing**: 12px gap between cards
- **Padding**: 24px horizontal, 24px vertical

#### Responsive Adjustments
- Subscribe form: Flex column (input full width, button below)
- Social icons: Centered
- Legal links: Centered, stacked vertically with 12px gap

---

## Component Specifications

### Footer-Card (Glassmorphism Panel)
```
Base Classes: bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl
Hover: bg-white/8 transition-colors shadow-2xl hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.1)]
Padding: 24px (p-6)
```

### Social-Icon
```
Base Classes: w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-gray-400
Hover: text-purple-400 bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-110
Focus: focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419]
Transition: transition-all duration-300
```

### Subscribe-Form
```
Container: bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6
Input: bg-white/3 border rounded-lg px-4 py-3 text-white placeholder-gray-500
Input Focus: border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] bg-white/6 animate-pulse
Button: bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 px-6 py-3 rounded-lg
Button Hover: shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)]
Button Active: active:scale-[0.98]
```

### Link-Underline (Hover Animation)
```
Base: relative group
Link: text-gray-400 hover:text-white transition-colors duration-200
Underline: absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 group-hover:w-full transition-all duration-300
```

---

## Accessibility Features

### Contrast Ratios
- **Body Text** (gray-400 on #0F1419): 4.5:1 ✓ (WCAG AA)
- **Headings** (white on #0F1419): 21:1 ✓ (WCAG AAA)
- **Links** (gray-400 on #0F1419): 4.5:1 ✓ (WCAG AA)

### Keyboard Navigation
- All interactive elements (links, buttons, inputs) have visible focus states
- Focus ring: `focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2`
- Tab order: Natural flow (top to bottom, left to right)

### ARIA Labels
- Email input: `aria-label="Email address"`
- Subscribe button: `aria-label="Subscribe to newsletter"`
- Social icons: `aria-label="[Platform Name]"`
- Accordion buttons: `aria-expanded={boolean}`

### Semantic HTML
- `<footer>` wrapper
- `<form>` for subscription
- `<h3>` for column headings
- `<ul>` and `<li>` for link lists
- `<a>` for all links

---

## Animation & Micro-Interactions

### Hover Effects
1. **Column Cards**: Subtle background shift + shadow glow
2. **Links**: Gradient underline expands from left to right
3. **Social Icons**: Glow intensifies, scale increases, color shifts to purple
4. **Subscribe Button**: Shadow expands on hover
5. **Email Input**: Glow pulse on focus

### Transitions
- **Duration**: 200ms (quick), 300ms (smooth)
- **Easing**: `ease-in-out` (default)
- **Properties**: `transition-all` for multi-property animations

### Animations
- **Pulse**: Email input on focus (`animate-pulse`)
- **Success Message**: Green text pulse (`animate-pulse`)

---

## Design Variations

### Variation A: Compact Dark
- **Brand Block**: Single-line layout (logo + name inline, tagline below)
- **Padding**: 24px horizontal, 32px vertical throughout
- **Icon Sizes**: 28px (social), 24px (logo)
- **Font Sizes**: Slightly smaller (12px body, 13px headings)
- **Use Case**: Minimal footprint, dense information

### Variation B: Spacious Premium
- **Brand Block**: Larger, more breathing room
- **Padding**: 32px horizontal, 48px vertical throughout
- **Icon Sizes**: 36px (social), 32px (logo)
- **Font Sizes**: Standard (14px body, 14px headings)
- **Card Spacing**: 24px gap (vs. 18px compact)
- **Use Case**: Premium feel, luxury brand positioning

---

## Tailwind CSS Class Reference

### Background & Glass
```
bg-gradient-to-b from-[#0F1419] to-[#0a0d11]
bg-white/5 bg-white/8 bg-white/6 bg-white/3
backdrop-blur-[12px]
border border-white/10 border-white/20
rounded-xl rounded-lg rounded-full
```

### Text
```
text-white text-gray-400 text-gray-500 text-gray-300
text-xs text-sm
font-bold font-semibold
```

### Shadows & Glows
```
shadow-2xl
shadow-[0_25px_40px_-5px_rgba(168,85,247,0.1)]
shadow-[0_0_20px_rgba(168,85,247,0.8)]
shadow-[0_0_12px_rgba(168,85,247,0.6)]
```

### Gradients
```
bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500
bg-clip-text text-transparent
```

### Transitions & Animations
```
transition-all transition-colors duration-200 duration-300
hover:scale-105 hover:scale-110 active:scale-[0.98]
animate-pulse
```

### Spacing
```
px-6 px-4 px-8 px-2
py-3 py-4 py-6 py-8 py-12
gap-2 gap-3 gap-4 gap-6
```

### Focus States
```
focus:outline-none
focus:ring-2 focus:ring-purple-500/50
focus:ring-offset-2 focus:ring-offset-[#0F1419]
```

---

## Implementation Notes

### React Component Props
```typescript
interface FooterProps {
  variant?: 'compact' | 'premium';  // Default: 'premium'
  mobileAccordion?: boolean;         // Default: true
}
```

### State Management
- `email`: Email input value
- `subscribed`: Success state (auto-reset after 3s)
- `expandedSection`: Mobile accordion state
- `focusedInput`: Email input focus state
- `hoveredSocial`: Social icon hover tracking

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS backdrop-filter support required
- CSS custom properties (CSS variables) for colors

### Performance Considerations
- Noise texture: SVG data URI (minimal file size)
- Animations: GPU-accelerated (transform, opacity)
- No external image dependencies
- Lazy-load social icons if needed

---

## Figma Frame Setup

### Desktop Frame (1440px × 600px)
- **Background**: Gradient from #0F1419 to #0a0d11
- **Components**:
  - Brand Block (full width, 96px height)
  - 4-Column Grid (full width, 240px height)
  - Subscribe & Social (full width, 180px height)
  - Legal Footer (full width, 84px height)

### Mobile Frame (375px × 1200px)
- **Background**: Same gradient
- **Components**:
  - Brand Block (full width, 80px height)
  - Accordion Columns (full width, 4 × 80px = 320px height)
  - Subscribe Form (full width, 160px height)
  - Social Icons (full width, 60px height)
  - Legal Footer (full width, 80px height)

### Component Library
- **footer-card**: Reusable glass panel
- **social-icon**: Icon with hover glow
- **subscribe-form**: Email input + button
- **link-group**: Column with heading + links
- **accordion-item**: Mobile expandable section

---

## Usage Example

```tsx
import Footer from '@/components/Footer';

export default function App() {
  return (
    <div>
      {/* Page content */}
      <Footer variant="premium" mobileAccordion={true} />
    </div>
  );
}
```

---

## Future Enhancements

1. **Dark/Light Mode Toggle**: Add theme switcher
2. **Localization**: Multi-language support for links
3. **Newsletter Integration**: Connect to email service (Mailchimp, ConvertKit)
4. **Analytics**: Track social clicks, newsletter signups
5. **Dynamic Links**: CMS-driven content
6. **Video Background**: Optional animated background
7. **Newsletter Archive**: Link to past newsletters
8. **Testimonials**: Customer quotes in footer
