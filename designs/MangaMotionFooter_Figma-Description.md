# MangaMotion Footer - Figma Frame Description

## Visual Style
- Background: Deep navy/charcoal (#0a0f1a) with subtle noise texture overlay
- Accent colors: Neon gradient purple → blue → pink (#9b59b6 → #3498db → #e91e63)
- Glassmorphism panels with 12px blur, translucent white (rgba(255,255,255,0.05))
- Soft drop-shadow and inner glow for depth
- Fonts: Sans-serif, bold for headings, medium for links, small muted for tagline and copyright

## Layout

### Top row:
- Brand block (logo + tagline)
  - Logo left aligned, tagline on right or below (variant dependent)
  - Tagline text: "Transform manga into cinematic animation with AI." (small, muted)
- Social icons (rounded, small)
  - Neon gradient icons on dark bg
  - Glow effect on hover (animated)
- Spacing: Compact in variation A, spacious in variation B

### Middle row:
- Four columns inside glassmorphism cards
  - Columns: Product, Company, Support, Resources
  - Each column:
    - Heading: bold sans-serif, neon accent on first letter
    - 4-6 links, left-aligned, neon underline fade on hover (animated)
  - Cards have soft translucency and blur, with neat spacing
  - Variation B includes icon thumbnails next to column headings

### Bottom row:
- Subscription form
  - Email input (left)
    - Glass panel with pulse animation on focus
    - Keyboard focus outline visible
    - Placeholder: "Your email"
  - CTA button (right)
    - Gradient border (neon purple → blue → pink)
    - Text: "Subscribe"
- Legal links: Privacy, Terms, Cookie (small, spaced)
- Copyright: small, muted text aligned right

## Accessibility:
- Text contrast min 4.5:1 for body, headings readable
- Keyboard focus outlines on links and inputs
- Mobile: columns collapse into accordion with tap areas and chevrons
- Microcopy:
  - Subscription helper text: "No spam — unsubscribe anytime."

## Components:
1. footer-card
   - Glassmorphism card container with blur, drop shadow, inner glow
2. social-icon
   - Rounded icon with neon gradient fill, glow animation on hover
3. subscribe-form
   - Email input with pulse focus, gradient CTA button
4. legal-links
   - Inline links with spacing, neon underline fade on hover

## Variations:
- (A) Compact dark: single-line brand, smaller glass cards, minimal spacing
- (B) Spacious premium: larger cards, icon thumbnails for columns, more padding and breathing space

---

## Tailwind CSS Class Suggestions for Key Elements

### Root footer container:
`bg-[#0a0f1a] relative noise-texture p-6 md:p-12 text-[#d1d5db]`

### Glassmorphism card (footer-card):
`bg-white bg-opacity-5 backdrop-blur-[12px] rounded-xl shadow-lg shadow-[#6b23ae33] border border-[#6b23ae44] p-6`

### Neon gradient accent (text/icons/borders):
`bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-transparent bg-clip-text`

### Brand tagline (small muted):
`text-sm text-gray-400 italic`

### Social icons:
`w-8 h-8 rounded-full p-1 cursor-pointer transition duration-300 hover:drop-shadow-[0_0_8px_rgba(155,89,182,0.8)]`

### Column heading:
`font-bold text-lg relative before:first-letter:text-purple-500 before:absolute before:left-0 before:-top-1`

### Links:
`text-gray-300 block mt-2 cursor-pointer hover:underline hover:decoration-gradient-to-r hover:decoration-purple-500 hover:underline-offset-2`

### Subscription input:
`bg-white bg-opacity-10 rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 animate-pulse-on-focus`

### Subscribe button CTA:
`border-2 border-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white rounded-lg px-6 py-2 font-bold hover:shadow-neon-glow transition`

### Accordion mobile:
`md:hidden cursor-pointer flex justify-between items-center p-4 bg-white bg-opacity-5 rounded-md focus:outline-purple-500`

---

This structure and class suggestions cover both visual and interactive aspects requested, ensuring accessibility and responsiveness.

Next: I will create component layout details and describe Figma frame structure for desktop and mobile views with annotations.
