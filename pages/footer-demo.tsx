import React, { useState } from 'react';
import Footer from '../components/Footer';

export default function FooterDemo() {
  const [variant, setVariant] = useState<'compact' | 'premium'>('premium');

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">MangaMotion Footer</h1>
              <p className="text-gray-400 text-sm mt-1">
                Modern, cinematic footer with glassmorphism & neon accents
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setVariant('compact')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  variant === 'compact'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setVariant('premium')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  variant === 'premium'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Premium
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-800 rounded-xl p-8 mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Glassmorphism panels with 12px blur effect</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Neon gradient accents (purple → blue → pink)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Smooth micro-interactions on hover</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Mobile accordion with expandable sections</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Accessible form with focus states</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>4.5:1 contrast ratio for readability</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Responsive design (desktop & mobile)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">✓</span>
              <span>Keyboard navigation support</span>
            </li>
          </ul>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Variant: {variant === 'compact' ? 'Compact Dark' : 'Spacious Premium'}</h2>
          <p className="text-gray-300 text-sm">
            {variant === 'compact'
              ? 'Single-line brand block, smaller cards, compact spacing. Perfect for minimalist designs.'
              : 'Stacked brand block with icon, larger cards, generous spacing. Premium feel with more breathing room.'}
          </p>
        </div>
      </div>

      {/* Footer Preview */}
      <Footer variant={variant} mobileAccordion={true} />

      {/* Code Reference */}
      <div className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-6">Implementation</h2>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
{`// Import the Footer component
import Footer from '@/components/Footer';

// Use with default (premium) variant
<Footer />

// Use compact variant
<Footer variant="compact" />

// Disable mobile accordion
<Footer variant="premium" mobileAccordion={false} />`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
