# MangaMotion Footer - Tailwind CSS Classes Reference

## Quick Copy-Paste Classes

### Background & Gradients
```tailwind
/* Main Footer Background */
bg-gradient-to-b from-[#0F1419] to-[#0a0d11]

/* Glass Panel Backgrounds */
bg-white/5          /* Light glass */
bg-white/6          /* Slightly darker glass */
bg-white/8          /* Hover glass state */
bg-white/3          /* Input background */

/* Gradient Accents */
bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500
```

### Borders & Outlines
```tailwind
/* Glass Panel Borders */
border border-white/10
border-white/20     /* Hover state */

/* Focus Rings */
focus:outline-none
focus:ring-2 focus:ring-purple-500/50
focus:ring-offset-2 focus:ring-offset-[#0F1419]

/* Rounded Corners */
rounded-xl          /* Cards: 12px */
rounded-lg          /* Inputs/Buttons: 8px */
rounded-full        /* Social icons */
```

### Text Styling
```tailwind
/* Text Colors */
text-white          /* Headings */
text-gray-400       /* Body text */
text-gray-500       /* Muted text */
text-gray-300       /* Hover state */
text-purple-400     /* Accent hover */
text-green-400      /* Success message */

/* Font Sizes */
text-xs             /* 12px - small text */
text-sm             /* 14px - body text */
text-xl             /* 20px - brand name */

/* Font Weights */
font-bold           /* 700 - headings */
font-semibold       /* 600 - button text */

/* Text Effects */
bg-clip-text text-transparent    /* For gradient text */
```

### Shadows & Glows
```tailwind
/* Card Shadows */
shadow-2xl          /* Default card shadow */

/* Custom Glow Shadows */
shadow-[0_0_20px_rgba(168,85,247,0.8)]      /* Strong purple glow */
shadow-[0_0_12px_rgba(168,85,247,0.6)]      /* Soft purple glow */
shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)]  /* Button hover glow */
```

### Backdrop Effects
```tailwind
/* Glassmorphism */
backdrop-blur-[12px]    /* 12px blur for glass effect */
```

### Spacing
```tailwind
/* Padding */
px-6 py-3           /* Input/Button padding */
px-4 py-3           /* Smaller padding */
px-8 py-12          /* Large section padding */
px-6 py-8           /* Compact section padding */
p-6                 /* Card padding */

/* Gaps */
gap-2               /* Small gap (8px) */
gap-3               /* Medium gap (12px) */
gap-4               /* Large gap (16px) */
gap-6               /* Extra large gap (24px) */

/* Margins */
mb-3                /* Bottom margin */
mt-3                /* Top margin */
```

### Transitions & Animations
```tailwind
/* Transitions */
transition-all duration-200       /* Quick transitions */
transition-all duration-300       /* Smooth transitions */
transition-colors duration-200    /* Color-only transitions */

/* Animations */
animate-pulse       /* Pulse effect (email input focus) */

/* Transform States */
hover:scale-105     /* Slight scale on hover */
hover:scale-110     /* More scale on hover */
active:scale-[0.98] /* Press effect */
```

### Display & Layout
```tailwind
/* Flexbox */
flex flex-col        /* Column layout */
flex flex-row        /* Row layout */
items-center         /* Vertical center */
justify-between      /* Space between */
justify-center       /* Center content */

/* Grid */
grid grid-cols-4    /* 4-column grid */
grid-cols-2         /* 2-column grid (tablet) */

/* Responsive */
sm:flex-row          /* Flex row on small screens */
md:hidden            /* Hide on medium+ screens */
```

### Visibility & Opacity
```tailwind
/* Opacity */
opacity-[0.02]      /* Noise texture opacity */

/* Pointer Events */
pointer-events-none /* For decorative elements */
```

## Component-Specific Classes

### Footer Card (Glass Panel)
```tailwind
bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6
hover:bg-white/8 transition-colors shadow-2xl 
hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.1)]
```

### Column Heading (with Neon First Letter)
```tailwind
text-sm font-bold text-white
/* First letter: */
bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent
```

### Link with Underline Animation
```tailwind
text-sm text-gray-400 hover:text-white transition-colors duration-200 relative group

/* Underline element: */
absolute bottom-0 left-0 w-0 h-0.5 
bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 
group-hover:w-full transition-all duration-300
```

### Social Icon
```tailwind
w-9 h-9 rounded-full bg-white/8 border border-white/10 
flex items-center justify-center text-gray-400
transition-all duration-300
focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419]

/* Hover state: */
text-purple-400 bg-purple-500/20 border-purple-500/50 
shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-110
```

### Email Input
```tailwind
flex-1 bg-white/3 border rounded-lg px-4 py-3 
text-white placeholder-gray-500 outline-none 
transition-all duration-300

/* Unfocused: */
border-white/10

/* Focused: */
border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] 
bg-white/6 animate-pulse
```

### Subscribe Button
```tailwind
px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 
text-white font-semibold rounded-lg 
hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)] 
active:scale-[0.98] transition-all duration-200 
flex items-center justify-center gap-2 whitespace-nowrap
```

### Mobile Accordion Button
```tailwind
w-full px-6 py-4 flex items-center justify-between 
hover:bg-white/5 transition-colors

/* Chevron icon: */
text-gray-400 transition-transform duration-300
/* When expanded: */
rotate-180
```

### Legal Links
```tailwind
text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 
focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-2 py-1
```

## Responsive Breakpoints

```tailwind
/* Mobile First Approach */
/* Default: Mobile (< 640px) */
sm:              /* 640px+ */
md:              /* 768px+ */
lg:              /* 1024px+ */
xl:              /* 1280px+ */

/* Examples */
flex flex-col sm:flex-row      /* Column on mobile, row on small+ */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  /* Responsive grid */
px-6 md:px-8                   /* Responsive padding */
text-sm md:text-base           /* Responsive text size */
```

## Dark Mode Support (if needed)

```tailwind
/* Add to tailwind.config.js for dark mode */
dark:bg-[#0F1419]
dark:text-white
dark:border-white/10
```

## Custom Color Tokens (for tailwind.config.js)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'manga-dark': '#0F1419',
        'manga-darker': '#0a0d11',
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

## Animation Timing Reference

```tailwind
/* Durations */
duration-200    /* 200ms - Quick interactions */
duration-300    /* 300ms - Smooth transitions */

/* Easing (default: ease-in-out) */
ease-in         /* Slow start, fast end */
ease-out        /* Fast start, slow end */
ease-in-out     /* Slow start and end */
linear          /* Constant speed */
```

## Accessibility Classes

```tailwind
/* Focus Visible */
focus:outline-none
focus:ring-2
focus:ring-purple-500/50
focus:ring-offset-2
focus:ring-offset-[#0F1419]

/* Screen Reader Only (if needed) */
sr-only

/* Disabled State */
disabled:opacity-50
disabled:cursor-not-allowed
```

## Performance Tips

1. **Use `transition-all`** for multi-property animations
2. **Prefer `transform`** over `width`/`height` for animations (GPU accelerated)
3. **Use `will-change`** sparingly for heavy animations
4. **Avoid `shadow-lg`** on hover if possible; use custom shadows
5. **Use `pointer-events-none`** on decorative elements

## Common Patterns

### Hover State Pattern
```tailwind
base-state hover:new-state transition-all duration-300
```

### Focus State Pattern
```tailwind
focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2
```

### Glass Panel Pattern
```tailwind
bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl
```

### Gradient Accent Pattern
```tailwind
bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500
```

### Responsive Padding Pattern
```tailwind
px-6 py-8 md:px-8 md:py-12
```
