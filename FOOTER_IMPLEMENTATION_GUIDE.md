# MangaMotion Footer - Implementation Guide

## Quick Start

### 1. Import the Footer Component
```tsx
import Footer from '@/components/Footer';

export default function App() {
  return (
    <div>
      {/* Your page content */}
      <Footer variant="premium" mobileAccordion={true} />
    </div>
  );
}
```

### 2. Props Configuration
```typescript
interface FooterProps {
  variant?: 'compact' | 'premium';  // Default: 'premium'
  mobileAccordion?: boolean;         // Default: true
}
```

### 3. Usage Examples

#### Premium Variation (Default)
```tsx
<Footer />
// or explicitly:
<Footer variant="premium" mobileAccordion={true} />
```

#### Compact Variation
```tsx
<Footer variant="compact" mobileAccordion={true} />
```

#### Without Mobile Accordion
```tsx
<Footer variant="premium" mobileAccordion={false} />
```

---

## File Structure

```
components/
├── Footer.tsx                    # Main component
├── Footer.module.css            # Optional: Scoped styles

docs/
├── FOOTER_DESIGN_SPECS.md       # Complete design specifications
├── FIGMA_DESIGN_GUIDE.md        # Figma setup instructions
├── FOOTER_VISUAL_MOCKUPS.md     # Visual mockups & layouts
├── TAILWIND_CLASSES_REFERENCE.md # Tailwind class guide
└── FOOTER_IMPLEMENTATION_GUIDE.md # This file
```

---

## Customization Guide

### Changing Colors

#### Update Brand Logo Gradient
```tsx
// In Footer.tsx, line 88
<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500">
```

#### Update Accent Colors
Replace all instances of:
- `from-purple-500` → Your primary color
- `via-blue-500` → Your secondary color
- `to-pink-500` → Your tertiary color

#### Update Background
```tsx
// Line 72
className="relative w-full overflow-hidden bg-gradient-to-b from-[#0F1419] to-[#0a0d11]"
```

### Changing Content

#### Update Brand Name & Tagline
```tsx
// Lines 91-94
<h1 className="text-xl font-bold text-white">MangaMotion</h1>
<p className="text-xs text-gray-400 leading-relaxed max-w-xs">
  Transform manga into cinematic animation with AI.
</p>
```

#### Update Column Links
```tsx
// Lines 43-60
const columns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'API Docs', 'Roadmap', 'Changelog'],
  },
  // ... more columns
];
```

#### Update Social Links
```tsx
// Lines 36-41
const socialLinks = [
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  // ... more links
];
```

#### Update Legal Links
```tsx
// Lines 62-66
const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
];
```

### Changing Spacing

#### Compact Variant Padding
```tsx
// Line 85 - Adjust padding values
className={`${isCompact ? 'px-6 py-8' : 'px-8 py-12'} border-b border-white/10`}
```

#### Column Gap
```tsx
// Line 145 - Adjust gap size
className={`grid grid-cols-4 gap-6 ...`}
```

### Changing Animations

#### Email Input Pulse Duration
```tsx
// Line 199 - Change animate-pulse to custom animation
className={`... animate-pulse`}
```

#### Transition Duration
```tsx
// Line 235 - Change duration
className={`... transition-all duration-300`}
```

---

## Integration with Existing Projects

### Next.js
```tsx
// app/layout.tsx
import Footer from '@/components/Footer';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

### React SPA
```tsx
// App.tsx
import Footer from './components/Footer';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">{/* content */}</main>
      <Footer />
    </div>
  );
}
```

### Remix
```tsx
// root.tsx
import Footer from '~/components/Footer';

export default function Root() {
  return (
    <html>
      <body>
        <Outlet />
        <Footer />
      </body>
    </html>
  );
}
```

---

## Newsletter Integration

### Connect to Email Service

#### Mailchimp
```tsx
const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  } catch (error) {
    console.error('Subscription error:', error);
  }
};
```

#### Backend API (Node.js/Express)
```javascript
// api/subscribe.js
import mailchimp from '@mailchimp/mailchimp_marketing';

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email } = req.body;
    try {
      await mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID, {
        email_address: email,
        status: 'pending',
      });
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

---

## Accessibility Checklist

- [ ] All text meets 4.5:1 contrast ratio (WCAG AA)
- [ ] Focus states visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] ARIA labels present on form inputs
- [ ] Screen reader compatible
- [ ] Mobile touch targets ≥ 44px
- [ ] Color not sole means of conveying information
- [ ] Animations respect `prefers-reduced-motion`

### Add Reduced Motion Support
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animationClass = prefersReducedMotion ? '' : 'animate-pulse';
```

---

## Performance Optimization

### 1. Lazy Load Social Icons
```tsx
import dynamic from 'next/dynamic';

const SocialIcon = dynamic(() => import('./SocialIcon'), {
  loading: () => <div className="w-9 h-9 bg-white/5 rounded-full" />,
});
```

### 2. Memoize Footer Component
```tsx
export default memo(Footer);
```

### 3. Optimize Images (if adding images)
```tsx
import Image from 'next/image';

<Image
  src="/logo.svg"
  alt="MangaMotion"
  width={32}
  height={32}
  priority
/>
```

---

## Testing

### Unit Tests (Jest)
```typescript
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer', () => {
  it('renders brand name', () => {
    render(<Footer />);
    expect(screen.getByText('MangaMotion')).toBeInTheDocument();
  });

  it('renders all column headings', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('renders social icons', () => {
    render(<Footer />);
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
  });

  it('submits email form', async () => {
    render(<Footer />);
    const input = screen.getByPlaceholderText('your@email.com');
    const button = screen.getByText('Subscribe');
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);
    
    expect(await screen.findByText('Thanks for subscribing!')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Footer', () => {
  test('social icon hover shows glow', async ({ page }) => {
    await page.goto('/');
    const socialIcon = page.locator('a[aria-label="GitHub"]');
    
    await socialIcon.hover();
    const shadow = await socialIcon.evaluate(el => 
      window.getComputedStyle(el).boxShadow
    );
    
    expect(shadow).toContain('rgba(168, 85, 247');
  });

  test('email input focus shows pulse', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type="email"]');
    
    await input.focus();
    const className = await input.getAttribute('class');
    
    expect(className).toContain('animate-pulse');
  });

  test('accordion expands on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const productButton = page.locator('button:has-text("Product")');
    await productButton.click();
    
    const features = page.locator('text=Features');
    await expect(features).toBeVisible();
  });
});
```

---

## Troubleshooting

### Issue: Glassmorphism not visible
**Solution**: Ensure `backdrop-blur-[12px]` is supported in your browser. Add fallback:
```css
@supports (backdrop-filter: blur(12px)) {
  .glass-panel {
    backdrop-filter: blur(12px);
  }
}
```

### Issue: Neon gradient not showing
**Solution**: Verify Tailwind CSS is properly configured with gradient colors. Check `tailwind.config.js`.

### Issue: Mobile accordion not working
**Solution**: Ensure `mobileAccordion={true}` prop is passed and window width detection is working.

### Issue: Email subscription not submitting
**Solution**: Check browser console for errors. Verify form validation and API endpoint.

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✓ | Full support |
| Firefox | ✓ | Full support |
| Safari | ✓ | Full support (iOS 13+) |
| Edge | ✓ | Full support |
| IE 11 | ✗ | Not supported (no backdrop-filter) |

---

## Deployment Checklist

- [ ] All links point to correct URLs
- [ ] Newsletter API endpoint configured
- [ ] Social media links updated
- [ ] Legal links point to actual pages
- [ ] Copyright year updated
- [ ] No console errors
- [ ] Mobile responsive tested
- [ ] Accessibility audit passed
- [ ] Performance metrics acceptable
- [ ] Analytics tracking added (if needed)

---

## Future Enhancements

1. **Dark/Light Mode Toggle**
   - Add theme context provider
   - Store preference in localStorage

2. **Newsletter Archive**
   - Link to past newsletters
   - Searchable archive

3. **Dynamic Content**
   - CMS integration for links
   - Multilingual support

4. **Advanced Analytics**
   - Track link clicks
   - Newsletter signup conversion
   - Social engagement metrics

5. **Video Background**
   - Optional animated background
   - Parallax effect

6. **Testimonials Section**
   - Customer quotes carousel
   - Star ratings

7. **Newsletter Preview**
   - Show latest newsletter
   - Subscribe modal

---

## Support & Resources

- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev
- **Lucide Icons**: https://lucide.dev
- **Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial release with compact & premium variants |

---

## License

This component is part of the MangaMotion project. Use as needed for your project.
