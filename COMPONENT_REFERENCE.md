# MangaMotion Footer - Component Reference Guide

## Quick Component Usage

### Basic Usage
```tsx
import Footer from '@/components/Footer';

export default function App() {
  return <Footer />;
}
```

### With Variant Selection
```tsx
import Footer from '@/components/Footer';

export default function App() {
  return (
    <>
      {/* Premium variant (default) */}
      <Footer variant="premium" />
      
      {/* Compact variant */}
      <Footer variant="compact" />
    </>
  );
}
```

### With Mobile Accordion Control
```tsx
import Footer from '@/components/Footer';

export default function App() {
  return (
    <>
      {/* With mobile accordion (default) */}
      <Footer mobileAccordion={true} />
      
      {/* Without mobile accordion */}
      <Footer mobileAccordion={false} />
    </>
  );
}
```

---

## Component Props Reference

### FooterProps Interface
```typescript
interface FooterProps {
  /**
   * Design variant
   * @default 'premium'
   */
  variant?: 'compact' | 'premium';
  
  /**
   * Enable mobile accordion
   * @default true
   */
  mobileAccordion?: boolean;
}
```

### Prop Combinations
```tsx
// All default (premium + accordion)
<Footer />

// Compact dark
<Footer variant="compact" />

// Premium without accordion
<Footer variant="premium" mobileAccordion={false} />

// Compact without accordion
<Footer variant="compact" mobileAccordion={false} />
```

---

## Customization Code Snippets

### Change Brand Information

**Location**: `components/Footer.tsx`, lines 47-53

```tsx
// Current
<h1 className="text-xl font-bold text-white">MangaMotion</h1>
<p className="text-xs text-gray-400 leading-relaxed max-w-xs">
  Transform manga into cinematic animation with AI.
</p>

// Change to your brand
<h1 className="text-xl font-bold text-white">Your Brand Name</h1>
<p className="text-xs text-gray-400 leading-relaxed max-w-xs">
  Your custom tagline here.
</p>
```

### Change Column Links

**Location**: `components/Footer.tsx`, lines 35-45

```tsx
// Current
const columns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'API Docs', 'Roadmap', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Community', 'Status', 'Documentation', 'FAQ'],
  },
  {
    title: 'Resources',
    links: ['Tutorials', 'Templates', 'Case Studies', 'Webinars', 'Guides'],
  },
];

// Change to your links
const columns = [
  {
    title: 'Product',
    links: ['Your Link 1', 'Your Link 2', 'Your Link 3'],
  },
  // Add more columns...
];
```

### Change Social Links

**Location**: `components/Footer.tsx`, lines 25-31

```tsx
// Current
const socialLinks = [
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

// Change to your social links
const socialLinks = [
  { icon: Github, href: 'https://github.com/yourprofile', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com/yourprofile', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/yourcompany', label: 'LinkedIn' },
  { icon: Instagram, href: 'https://instagram.com/yourprofile', label: 'Instagram' },
];
```

### Change Legal Links

**Location**: `components/Footer.tsx`, lines 47-51

```tsx
// Current
const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
];

// Change to your legal links
const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'GDPR', href: '/gdpr' },
];
```

### Change Copyright Text

**Location**: `components/Footer.tsx`, line 238

```tsx
// Current
<p className="text-xs text-gray-500">
  © 2024 MangaMotion. All rights reserved.
</p>

// Change to your copyright
<p className="text-xs text-gray-500">
  © 2024 Your Company. All rights reserved.
</p>
```

---

## Styling Customization

### Change Neon Colors

**Location**: `tailwind.config.js`, lines 14-17

```javascript
// Current
colors: {
  'neon-purple': '#A855F7',
  'neon-blue': '#3B82F6',
  'neon-pink': '#EC4899',
},

// Change to your colors
colors: {
  'neon-purple': '#FF00FF',  // Magenta
  'neon-blue': '#00FFFF',    // Cyan
  'neon-pink': '#FF1493',    // Deep Pink
},
```

### Change Background Color

**Location**: `tailwind.config.js`, lines 11-13

```javascript
// Current
colors: {
  'dark-bg': '#0F1419',
  'dark-bg-alt': '#0a0d11',
},

// Change to your background
colors: {
  'dark-bg': '#1a1a2e',      // Darker blue
  'dark-bg-alt': '#16213e',  // Even darker
},
```

### Change Glass Blur Amount

**Location**: `components/Footer.tsx`, search for `backdrop-blur-[12px]`

```tsx
// Current (12px blur)
<div className="backdrop-blur-[12px]">

// Less blur (8px)
<div className="backdrop-blur-[8px]">

// More blur (20px)
<div className="backdrop-blur-[20px]">
```

### Change Glass Opacity

**Location**: `components/Footer.tsx`, search for `bg-white/5`

```tsx
// Current (5% opacity)
<div className="bg-white/5">

// More transparent (3%)
<div className="bg-white/3">

// More opaque (8%)
<div className="bg-white/8">
```

### Change Border Radius

**Location**: `components/Footer.tsx`, search for `rounded-xl`

```tsx
// Current (12px)
<div className="rounded-xl">

// Smaller (8px)
<div className="rounded-lg">

// Larger (16px)
<div className="rounded-2xl">
```

### Change Padding

**Location**: `components/Footer.tsx`, search for `p-6` or `p-8`

```tsx
// Current (24px for p-6, 32px for p-8)
<div className="p-6">
<div className="p-8">

// Smaller (16px)
<div className="p-4">

// Larger (40px)
<div className="p-10">
```

---

## Animation Customization

### Change Social Icon Hover Duration

**Location**: `components/Footer.tsx`, line 245

```tsx
// Current (200ms)
transition-all duration-200

// Slower (300ms)
transition-all duration-300

// Faster (100ms)
transition-all duration-100
```

### Change Link Underline Animation

**Location**: `styles/globals.css`, lines 61-72

```css
/* Current (300ms) */
.link-underline::after {
  transition-all duration-300;
}

/* Change to 500ms */
.link-underline::after {
  transition-all duration-500;
}
```

### Change Input Focus Animation

**Location**: `components/Footer.tsx`, line 183

```tsx
// Current (300ms)
transition-all duration-300

// Change to 500ms
transition-all duration-500
```

### Change Button Hover Animation

**Location**: `components/Footer.tsx`, line 207

```tsx
// Current (200ms)
transition-all duration-200

// Change to 300ms
transition-all duration-300
```

---

## Form Customization

### Change Email Placeholder

**Location**: `components/Footer.tsx`, line 177

```tsx
// Current
placeholder="your@email.com"

// Change to your placeholder
placeholder="Enter your email"
```

### Change Subscribe Button Text

**Location**: `components/Footer.tsx`, line 206

```tsx
// Current
Subscribe

// Change to your text
Get Updates
```

### Change Helper Text

**Location**: `components/Footer.tsx`, line 214

```tsx
// Current
✓ No spam — unsubscribe anytime.

// Change to your text
✓ We respect your privacy. Unsubscribe at any time.
```

### Change Success Message

**Location**: `components/Footer.tsx`, line 216

```tsx
// Current
Thanks for subscribing!

// Change to your message
Welcome! Check your email for confirmation.
```

---

## Responsive Customization

### Change Mobile Breakpoint

**Location**: `tailwind.config.js` (add to theme.screens)

```javascript
// Default breakpoints
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
},

// Custom breakpoints
screens: {
  'sm': '640px',
  'md': '800px',    // Changed from 768px
  'lg': '1100px',   // Changed from 1024px
  'xl': '1400px',   // Changed from 1280px
},
```

### Change Mobile Accordion Behavior

**Location**: `components/Footer.tsx`, line 61

```tsx
// Current (always show accordion on mobile)
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// Change to 800px
const isMobile = typeof window !== 'undefined' && window.innerWidth < 800;
```

---

## Accessibility Customization

### Change Focus Ring Color

**Location**: `styles/globals.css`, line 28

```css
/* Current (purple) */
@apply focus:outline-none focus:ring-2 focus:ring-purple-500/50;

/* Change to blue */
@apply focus:outline-none focus:ring-2 focus:ring-blue-500/50;
```

### Change Focus Ring Offset

**Location**: `components/Footer.tsx`, search for `focus:ring-offset-2`

```tsx
// Current (2px offset)
focus:ring-offset-2

// No offset
focus:ring-offset-0

// Larger offset (4px)
focus:ring-offset-4
```

### Add Skip Link

**Location**: Add to your layout (before Footer)

```tsx
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Integration Examples

### Next.js Integration

```tsx
// pages/index.tsx
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <main id="main">
        {/* Your content */}
      </main>
      <Footer variant="premium" />
    </>
  );
}
```

### React Router Integration

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your routes */}
      </Routes>
      <Footer variant="premium" />
    </BrowserRouter>
  );
}
```

### Gatsby Integration

```tsx
// src/components/layout.tsx
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <>
      <main>{children}</main>
      <Footer variant="premium" />
    </>
  );
}
```

### Remix Integration

```tsx
// app/root.tsx
import Footer from '~/components/Footer';

export default function Root() {
  return (
    <html>
      <body>
        <Outlet />
        <Footer variant="premium" />
      </body>
    </html>
  );
}
```

---

## Testing Code Snippets

### Unit Test Example (Jest + React Testing Library)

```tsx
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer Component', () => {
  it('renders footer with premium variant', () => {
    render(<Footer variant="premium" />);
    expect(screen.getByText('MangaMotion')).toBeInTheDocument();
  });

  it('renders footer with compact variant', () => {
    render(<Footer variant="compact" />);
    expect(screen.getByText('MangaMotion')).toBeInTheDocument();
  });

  it('renders email input', () => {
    render(<Footer />);
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('renders subscribe button', () => {
    render(<Footer />);
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('renders social links', () => {
    render(<Footer />);
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
  });
});
```

### E2E Test Example (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Footer Component', () => {
  test('should render footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should submit email form', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Subscribe")');
    await expect(page.locator('text=Thanks for subscribing')).toBeVisible();
  });

  test('should expand accordion on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const accordion = page.locator('button:has-text("Product")');
    await accordion.click();
    await expect(page.locator('text=Features')).toBeVisible();
  });

  test('should have proper focus states', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus');
    await expect(focused).toHaveCSS('outline-width', '2px');
  });
});
```

---

## Performance Optimization Snippets

### Code Splitting

```tsx
import dynamic from 'next/dynamic';

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div>Loading footer...</div>,
});

export default function App() {
  return <Footer />;
}
```

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const Footer = lazy(() => import('@/components/Footer'));

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Footer />
    </Suspense>
  );
}
```

### Memoization

```tsx
import { memo } from 'react';
import Footer from '@/components/Footer';

const MemoizedFooter = memo(Footer);

export default function App() {
  return <MemoizedFooter variant="premium" />;
}
```

---

## Troubleshooting Code Snippets

### Debug Styles Not Applying

```tsx
// Add temporary debugging class
<div className="bg-red-500 p-4">
  {/* If this shows red, Tailwind is working */}
</div>

// Check Tailwind config
console.log('Tailwind config:', require('./tailwind.config.js'));
```

### Debug Focus States

```tsx
// Add visible focus indicator for testing
<button className="focus:ring-4 focus:ring-red-500">
  Test Button
</button>
```

### Debug Animations

```tsx
// Slow down animations for testing
<style>
  * {
    animation-duration: 5s !important;
    transition-duration: 5s !important;
  }
</style>
```

### Debug Mobile Responsive

```tsx
// Add viewport indicator
<div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs z-50">
  <div className="block md:hidden">Mobile</div>
  <div className="hidden md:block lg:hidden">Tablet</div>
  <div className="hidden lg:block">Desktop</div>
</div>
```

---

## Common Customization Patterns

### Add Dark/Light Mode Toggle

```tsx
import { useState } from 'react';
import Footer from '@/components/Footer';

export default function App() {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <button onClick={() => setIsDark(!isDark)}>
        Toggle Theme
      </button>
      <Footer variant="premium" />
    </div>
  );
}
```

### Add Newsletter Integration

```tsx
// Modify handleSubscribe in Footer.tsx
const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  if (email) {
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  }
};
```

### Add Analytics Tracking

```tsx
// Add to Footer.tsx
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName);
  }
};

// Use in handlers
const handleSubscribe = (e: React.FormEvent) => {
  trackEvent('footer_subscribe');
  // ... rest of handler
};
```

---

## Version Compatibility

### React Versions
- ✅ React 16.8+ (Hooks support required)
- ✅ React 17.x
- ✅ React 18.x (Recommended)

### TypeScript Versions
- ✅ TypeScript 4.5+
- ✅ TypeScript 5.x (Recommended)

### Tailwind Versions
- ✅ Tailwind CSS 3.x
- ✅ Tailwind CSS 4.x (Recommended)

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Additional Resources

### Component Files
- Main Component: `components/Footer.tsx`
- Demo Page: `pages/footer-demo.tsx`

### Configuration Files
- Tailwind Config: `tailwind.config.js`
- PostCSS Config: `postcss.config.js`
- Global Styles: `styles/globals.css`

### Documentation
- Design System: `FOOTER_DESIGN.md`
- Tailwind Guide: `TAILWIND_CONFIG.md`
- Visual Specs: `VISUAL_SPEC.md`
- Implementation: `IMPLEMENTATION_GUIDE.md`
- README: `FOOTER_README.md`
- Summary: `FOOTER_SUMMARY.md`

---

**Last Updated**: 2024  
**Component Version**: 1.0.0  
**Status**: Production Ready ✅
