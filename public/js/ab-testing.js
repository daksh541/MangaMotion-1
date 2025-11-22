// A/B Testing Configuration
const AB_TESTS = {
  hero_variants: {
    name: 'hero_variants',
    variants: [
      {
        id: 'control',
        weight: 1, // Relative weight for this variant
        // Default values will be used for the control
      },
      {
        id: 'benefit_focused',
        weight: 1,
        title: 'Transform Manga into Breathtaking Animations in Seconds',
        subtitle: 'Upload → AI Animates → Share Instantly. No experience needed!',
        ctaText: 'Start Animating for Free',
        ctaColor: 'from-pink-400 to-purple-600', // Gradient colors for CTA button
        showBadge: true,
        badgeText: 'AI-Powered Animation',
        showDemoVideo: true,
        showTrustBadges: false,
        showPricing: false
      },
      {
        id: 'trust_badges',
        weight: 1,
        title: 'Trusted by 10,000+ Manga Creators',
        subtitle: 'Join the community transforming manga into animations',
        ctaText: 'Join Now - Free Trial',
        ctaColor: 'from-blue-400 to-indigo-600',
        showBadge: true,
        badgeText: 'Trending Now',
        showDemoVideo: false,
        showTrustBadges: true,
        showPricing: false
      },
      {
        id: 'pricing_focused',
        weight: 1,
        title: 'Professional Manga Animation Starting at $9.99',
        subtitle: 'Start with our free plan, no credit card required',
        ctaText: 'View Plans',
        ctaColor: 'from-green-400 to-teal-600',
        showBadge: true,
        badgeText: 'Limited Time',
        showDemoVideo: false,
        showTrustBadges: true,
        showPricing: true
      }
    ]
  }
};

// Initialize A/B Tests
function initABTests() {
  // Set up each test
  Object.keys(AB_TESTS).forEach(testName => {
    const test = AB_TESTS[testName];
    const storedVariant = localStorage.getItem(`ab_test_${test.name}`);
    
    // If variant already assigned, use it
    if (storedVariant) {
      test.activeVariant = JSON.parse(storedVariant);
    } else {
      // Otherwise, assign a random variant based on weights
      test.activeVariant = getRandomVariant(test.variants);
      localStorage.setItem(`ab_test_${test.name}`, JSON.stringify(test.activeVariant));
    }
    
    // Apply the variant
    applyVariant(test.name, test.activeVariant);
    
    // Track the view
    trackView(test.name, test.activeVariant.id);
  });
}

// Get random variant based on weights
function getRandomVariant(variants) {
  const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const variant of variants) {
    random -= variant.weight || 1;
    if (random <= 0) return variant;
  }
  
  return variants[0]; // Fallback to first variant
}

// Apply variant to the page
function applyVariant(testName, variant) {
  if (testName === 'hero_variants') {
    applyHeroVariant(variant);
  }
}

// Apply hero variant changes
function applyHeroVariant(variant) {
  const heroSection = document.querySelector('.hero-variant-a');
  if (!heroSection) return;
  
  // Update title if provided
  const titleElement = heroSection.querySelector('.hero-title');
  if (titleElement && variant.title) {
    titleElement.innerHTML = variant.title
      .replace(/(\w+)/g, (match, word, index) => {
        if (index === 0) return match; // Keep first word as is
        return `<span class="text-transparent bg-clip-text bg-gradient-to-r ${variant.ctaColor}">${word}</span>`;
      });
  }
  
  // Update subtitle if provided
  const subtitleElement = heroSection.querySelector('.hero-subtitle');
  if (subtitleElement && variant.subtitle) {
    subtitleElement.textContent = variant.subtitle;
  }
  
  // Update CTA button
  const ctaButton = heroSection.querySelector('.primary-button');
  if (ctaButton && variant.ctaText) {
    ctaButton.innerHTML = `
      <i class="fas fa-rocket mr-2 group-hover:animate-bounce"></i>
      ${variant.ctaText}
      <span class="ml-2 text-xs opacity-80">No credit card required</span>
    `;
    
    // Update CTA button colors
    ctaButton.className = ctaButton.className.replace(
      /from-\w+-\d+ to-\w+-\d+/g, 
      variant.ctaColor || 'from-pink-300 to-purple-300'
    );
  }
  
  // Update badge
  const badgeElement = heroSection.querySelector('.hero-badge');
  if (badgeElement) {
    if (variant.showBadge === false) {
      badgeElement.style.display = 'none';
    } else if (variant.badgeText) {
      badgeElement.innerHTML = `
        <i class="fas fa-sparkles mr-2"></i>${variant.badgeText}
      `;
    }
  }
  
  // Add trust badges if needed
  if (variant.showTrustBadges) {
    const trustBadges = `
      <div class="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-300 animate-fade-in-delay-3">
        <div class="flex items-center">
          <i class="fas fa-star text-yellow-400 mr-2"></i>
          <span>4.8/5 from 1,200+ reviews</span>
        </div>
        <div class="flex items-center">
          <i class="fas fa-users text-blue-400 mr-2"></i>
          <span>10,000+ creators</span>
        </div>
        <div class="flex items-center">
          <i class="fas fa-shield-alt text-green-400 mr-2"></i>
          <span>Secure payments</span>
        </div>
      </div>
    `;
    
    const existingTrustBadges = heroSection.querySelector('.trust-badges');
    if (!existingTrustBadges) {
      const ctaButtons = heroSection.querySelector('.cta-buttons');
      if (ctaButtons) {
        const div = document.createElement('div');
        div.className = 'trust-badges';
        div.innerHTML = trustBadges;
        ctaButtons.parentNode.insertBefore(div, ctaButtons.nextSibling);
      }
    }
  }
  
  // Add pricing if needed
  if (variant.showPricing) {
    const pricing = `
      <div class="mt-8 p-4 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10 animate-fade-in-delay-3">
        <div class="flex flex-wrap justify-center gap-4">
          <div class="text-center px-4 py-2 bg-white/10 rounded">
            <div class="text-xs text-gray-400">Free</div>
            <div class="font-bold">$0<span class="text-sm font-normal">/mo</span></div>
          </div>
          <div class="text-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded">
            <div class="text-xs">Creator</div>
            <div class="font-bold">$9.99<span class="text-sm font-normal">/mo</span></div>
          </div>
          <div class="text-center px-4 py-2 bg-white/10 rounded">
            <div class="text-xs text-gray-400">Studio</div>
            <div class="font-bold">$29.99<span class="text-sm font-normal">/mo</span></div>
          </div>
        </div>
      </div>
    `;
    
    const existingPricing = heroSection.querySelector('.pricing-snippet');
    if (!existingPricing) {
      const ctaButtons = heroSection.querySelector('.cta-buttons');
      if (ctaButtons) {
        const div = document.createElement('div');
        div.className = 'pricing-snippet';
        div.innerHTML = pricing;
        ctaButtons.parentNode.insertBefore(div, ctaButtons.nextSibling);
      }
    }
  }
  
  // Track the variant being shown
  console.log(`Showing variant: ${variant.id}`);
}

// Track a view for a test variant
function trackView(testName, variantId) {
  // In a real implementation, you would send this to your analytics
  console.log(`[A/B Test] View: ${testName} - ${variantId}`);
  
  // Example: Send to Google Analytics
  if (window.gtag) {
    gtag('event', 'ab_test_view', {
      'test_name': testName,
      'variant': variantId
    });
  }
}

// Track a conversion for a test
function trackConversion(testName, action = 'click') {
  const variant = localStorage.getItem(`ab_test_${testName}`);
  if (!variant) return;
  
  const variantData = JSON.parse(variant);
  console.log(`[A/B Test] Conversion: ${testName} - ${variantData.id} - ${action}`);
  
  // In a real implementation, you would send this to your analytics
  if (window.gtag) {
    gtag('event', 'ab_test_conversion', {
      'test_name': testName,
      'variant': variantData.id,
      'action': action
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initABTests);

// Track CTA clicks
document.addEventListener('click', (e) => {
  const ctaButton = e.target.closest('.primary-button, .secondary-button');
  if (ctaButton) {
    trackConversion('hero_variants', ctaButton.classList.contains('primary-button') ? 'primary_cta' : 'secondary_cta');
  }
});

// Export for debugging
window.AB_TESTS = AB_TESTS;
window.trackConversion = trackConversion;
