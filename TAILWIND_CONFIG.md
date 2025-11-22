# Tailwind CSS Configuration for MangaMotion Footer

## Setup Instructions

### 1. Install Dependencies

```bash
npm install -D tailwindcss postcss autoprefixer
npm install react react-dom
npm install lucide-react
```

### 2. Initialize Tailwind

```bash
npx tailwindcss init -p
```

### 3. Configure `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy/charcoal background
        'dark-bg': '#0F1419',
        'dark-bg-alt': '#0a0d11',
        
        // Neon accents
        'neon-purple': '#A855F7',
        'neon-blue': '#3B82F6',
        'neon-pink': '#EC4899',
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        'glass-hover': '0 25px 40px -5px rgba(168, 85, 247, 0.1)',
        'neon-glow': '0 0 12px rgba(168, 85, 247, 0.6)',
        'neon-glow-sm': '0 0 8px rgba(168, 85, 247, 0.4)',
      },
      keyframes: {
        'neon-glow': {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 16px rgba(168, 85, 247, 0.8)',
          },
        },
        'pulse-soft': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.01)',
          },
        },
        'underline-fade': {
          '0%': {
            backgroundPosition: '-200% center',
            opacity: '0',
          },
          '100%': {
            backgroundPosition: '200% center',
            opacity: '1',
          },
        },
      },
      animation: {
        'neon-glow': 'neon-glow 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 400ms ease-in-out',
        'underline-fade': 'underline-fade 300ms ease-out forwards',
      },
      backgroundImage: {
        'neon-gradient': 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)',
        'neon-gradient-h': 'linear-gradient(90deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)',
      },
    },
  },
  plugins: [],
};
```

### 4. Configure `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 5. Add Tailwind Directives to Global CSS

Create or update `styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom noise texture */
@layer utilities {
  .noise-texture {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' result='noise'/%3E%3C/filter%3E%3Crect width='400' height='400' fill='white' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    background-size: 200px 200px;
  }

  /* Smooth transitions */
  .transition-smooth {
    @apply transition-all duration-300 ease-out;
  }

  /* Focus visible states */
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419];
  }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.5);
}
```

---

## Tailwind Class Reference for Footer Components

### Footer Container
```html
<footer class="w-full overflow-hidden bg-gradient-to-b from-[#0F1419] to-[#0a0d11]">
```

### Glass Card (Reusable)
```html
<div class="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6 shadow-2xl hover:bg-white/[0.08] hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.1)] transition-all duration-200">
```

### Neon Gradient Text (First Letter)
```html
<span class="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
  P
</span>
roduct
```

### Social Icon Button
```html
<a class="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-200 hover:shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419]">
  <Icon size={20} />
</a>
```

### Subscribe Button
```html
<button class="px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all duration-200">
  Subscribe
</button>
```

### Email Input with Focus State
```html
<input class="flex-1 bg-white/3 border rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none transition-all duration-300 border-white/10 focus:border-purple-500/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.3)] focus:bg-white/5" />
```

### Link with Underline Hover
```html
<a class="text-gray-400 hover:text-white transition-colors duration-200 relative group">
  Link Text
  <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 group-hover:w-full transition-all duration-300" />
</a>
```

### Column Heading
```html
<h3 class="text-sm font-bold text-white">
  <span class="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
    P
  </span>
  roduct
</h3>
```

### Mobile Accordion Button
```html
<button class="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
  <h3 class="text-sm font-bold text-white">Section Title</h3>
  <ChevronDown class="text-gray-400 transition-transform duration-300 group-aria-expanded:rotate-180" />
</button>
```

---

## Color Palette Reference

### Background Colors
- **Primary BG**: `#0F1419` (Deep navy/charcoal)
- **Secondary BG**: `#0a0d11` (Darker variant)
- **Glass Card**: `rgba(255, 255, 255, 0.05)` with `backdrop-blur-[12px]`
- **Glass Card Hover**: `rgba(255, 255, 255, 0.08)`

### Text Colors
- **Primary Text**: `#E8E8E8` (High contrast, 4.5:1)
- **Secondary Text**: `#A0A0A0` (Muted, 4.5:1)
- **Tertiary Text**: `#808080` (Copyright, 3.5:1)

### Neon Accents
- **Purple**: `#A855F7` (Tailwind: `purple-500`)
- **Blue**: `#3B82F6` (Tailwind: `blue-500`)
- **Pink**: `#EC4899` (Tailwind: `pink-500`)
- **Gradient**: `linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)`

### Border & Overlay Colors
- **Border**: `rgba(255, 255, 255, 0.1)` (Tailwind: `border-white/10`)
- **Subtle Border**: `rgba(255, 255, 255, 0.05)` (Tailwind: `border-white/5`)
- **Overlay**: `rgba(255, 255, 255, 0.03)` (Tailwind: `bg-white/3`)

---

## Responsive Breakpoints

The footer uses Tailwind's default breakpoints:

```
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
```

### Mobile-First Approach

```html
<!-- Stack on mobile, grid on desktop -->
<div class="flex flex-col md:flex-row gap-4">
  <!-- Content -->
</div>

<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">
  <!-- Desktop-only content -->
</div>

<!-- Show on mobile, hide on desktop -->
<div class="md:hidden">
  <!-- Mobile-only content -->
</div>
```

---

## Animation Usage

### Neon Glow (Infinite)
```html
<div class="animate-neon-glow">
  Glowing element
</div>
```

### Pulse Soft (One-time)
```html
<input class="focus:animate-pulse-soft" />
```

### Underline Fade (Link Hover)
```html
<a class="group">
  Link
  <span class="group-hover:animate-underline-fade" />
</a>
```

---

## Accessibility Classes

### Focus Ring (All Interactive Elements)
```html
<button class="focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419]">
  Click me
</button>
```

### Skip Link (Optional)
```html
<a href="#main" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### ARIA Labels
```html
<button aria-label="Subscribe to newsletter" aria-expanded="false">
  Subscribe
</button>
```

---

## Performance Optimization

### 1. Use `will-change` for Hover Effects
```html
<a class="hover:will-change-transform hover:scale-105">
  Link
</a>
```

### 2. Lazy Load Images
```html
<img src="..." loading="lazy" alt="..." />
```

### 3. Minimize Repaints
- Use `transform` instead of `top`/`left`
- Use `opacity` instead of `visibility`
- Batch animations with `transition-all`

### 4. CSS Containment
```css
.footer-card {
  contain: layout style paint;
}
```

---

## Browser Support

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 15+)
- **Edge**: ✅ Full support

### Fallbacks for Older Browsers

For browsers that don't support `backdrop-filter`:
```css
@supports not (backdrop-filter: blur(12px)) {
  .glass-card {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
```

---

## Testing Checklist

- [ ] Contrast ratios meet WCAG AA (4.5:1 for body text)
- [ ] Focus states visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Mobile layout responsive at 375px, 768px, 1024px
- [ ] Animations smooth (60fps) on low-end devices
- [ ] No layout shifts (CLS < 0.1)
- [ ] Touch targets at least 48px on mobile
- [ ] Color not sole indicator of state (use icons, text, etc.)
- [ ] Tested with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Tested in dark mode and light mode (if applicable)

---

## Customization Guide

### Change Primary Neon Color
Replace all instances of `purple-500` with your preferred color:
```javascript
// In tailwind.config.js
'neon-primary': '#FF00FF', // Your color
```

### Adjust Glass Blur Amount
```html
<!-- More blur -->
<div class="backdrop-blur-[20px]">

<!-- Less blur -->
<div class="backdrop-blur-[8px]">
```

### Modify Animation Speed
```javascript
// In tailwind.config.js
animation: {
  'neon-glow': 'neon-glow 3s ease-in-out infinite', // Slower
}
```

### Change Background Gradient
```html
<footer class="bg-gradient-to-b from-[#1a1f2e] to-[#0f1419]">
```

---

## Troubleshooting

### Styles Not Applying
1. Check that file paths in `content` array match your project structure
2. Restart dev server after modifying `tailwind.config.js`
3. Clear `.next` or `dist` folder and rebuild

### Blur Effect Not Working
- Ensure `backdrop-filter` is supported in target browsers
- Add fallback background color
- Check for `overflow: hidden` on parent elements

### Focus Ring Not Visible
- Ensure sufficient contrast between ring color and background
- Verify `focus-visible` is supported (use polyfill if needed)
- Test with keyboard navigation (Tab key)

### Animations Janky
- Reduce number of simultaneous animations
- Use `transform` and `opacity` instead of `top`/`left`
- Enable GPU acceleration with `will-change`
- Test on low-end devices

---

## Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind UI Components](https://tailwindui.com/)
- [Glassmorphism Guide](https://glassmorphism.com/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)
