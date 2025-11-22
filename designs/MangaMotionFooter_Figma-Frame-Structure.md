# MangaMotion Footer - Figma Frame Structure

## Desktop Layout

### Root Frame: Footer (Full Width)
- Background: Deep navy/charcoal with subtle noise overlay
- Padding: 48px vertical, responsive horizontal padding

### Top Row (Brand + Social Icons)
- Layout: Flex row, space-between alignment
- Left: Brand block (Logo + tagline text)
  - Logo: Positioned top or left, compact for compact variant
  - Tagline: "Transform manga into cinematic animation with AI." (small, muted)
- Right: Social icons group
  - Rounded icons with neon gradient stroke/glow on hover

### Middle Row (4 Columns in Glassmorphism Cards)
- Four glass-cards aligned horizontally with space gap
- Each card: translucent with blur (12px), subtle drop shadow, rounded corners
- Column content:
  - Heading: Bold, neon accent first letter
  - 4-6 links per column, left-aligned, neon underline on hover
- Spacious premium variation includes icon thumbnails beside headings

### Bottom Row (Subscription Form + Legal Links)
- Subscription form:
  - Email input on left with pulse effect on focus
  - Gradient neon border "Subscribe" button on right
  - Subscription helper text below input: "No spam — unsubscribe anytime."
- Legal links aligned horizontally left or center: Privacy, Terms, Cookie
- Copyright on the right: small muted text

---

## Mobile Layout (Accordion for Columns)
- Top row: Brand above social icons stacked vertically
- Columns collapsed into accordion panels
  - Tap areas with subtle chevrons for expand/collapse
- Subscription form and legal links stacked
- Maintain spacing and accessibility outlines

---

## Components

### footer-card
- Rectangle with 12px blur backdrop, slight inner glow, drop shadow
- Rounded corners (12px)

### social-icon
- Circle with neon gradient fill/stroke
- Glow on hover (animated)

### subscribe-form
- Input with glassmorphism background and pulse animation on focus
- Button with neon gradient border and glow on hover

### legal-links
- Inline text links spaced with neon underline fade on hover

---

## Variations

### A: Compact Dark
- Smaller cards, single-line brand tagline
- Tight spacing
- Simple social icons without thumbnails

### B: Spacious Premium
- Larger cards with padding
- Icon thumbnails next to column headings
- Larger brand block with tagline below
- More generous spacing and larger social icons

---

This structure details the layout, components, and responsive behavior for Figma frame creation.
Next Step: Create the actual Figma frames in design tool and export or share files.

---
