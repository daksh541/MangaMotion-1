import React, { useState } from 'react';
import {
  Mail,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  ChevronDown,
  Send,
} from 'lucide-react';

interface FooterProps {
  variant?: 'compact' | 'premium';
  mobileAccordion?: boolean;
}

const Footer: React.FC<FooterProps> = ({ variant = 'premium', mobileAccordion = true }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const socialLinks = [
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ];

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

  const legalLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ];

  const isCompact = variant === 'compact';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <footer className="relative w-full overflow-hidden bg-gradient-to-b from-[#0F1419] to-[#0a0d11]">
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/%3E%3C/filter%3E%3Crect width="400" height="400" fill="white" filter="url(%23noiseFilter)"/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10">
        {/* Top Row: Brand Block */}
        <div className={`${isCompact ? 'px-6 py-8' : 'px-8 py-12'} border-b border-white/10`}>
          <div className={isCompact ? 'flex items-center gap-3' : 'flex flex-col gap-2'}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-bold text-white">MangaMotion</h1>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Transform manga into cinematic animation with AI.
            </p>
          </div>
        </div>

        {/* Middle Row: Columns */}
        {isMobile && mobileAccordion ? (
          // Mobile Accordion View
          <div className="px-6 py-6 space-y-3">
            {columns.map((column) => (
              <div
                key={column.title}
                className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.08] transition-colors"
              >
                <button
                  onClick={() => toggleSection(column.title)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  aria-expanded={expandedSection === column.title}
                >
                  <h3 className="text-sm font-bold text-white">
                    <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                      {column.title[0]}
                    </span>
                    {column.title.slice(1)}
                  </h3>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${
                      expandedSection === column.title ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedSection === column.title && (
                  <div className="px-6 pb-4 pt-2 space-y-3 border-t border-white/5">
                    {column.links.map((link) => (
                      <a
                        key={link}
                        href="#"
                        className="block text-sm text-gray-400 hover:text-white transition-colors duration-200 hover:underline hover:decoration-purple-500 hover:underline-offset-4"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Desktop Grid View
          <div
            className={`grid grid-cols-4 gap-6 ${isCompact ? 'px-6 py-8' : 'px-8 py-12'} border-b border-white/10`}
          >
            {columns.map((column) => (
              <div
                key={column.title}
                className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-colors shadow-2xl hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.1)]"
              >
                <h3 className="text-sm font-bold text-white mb-4">
                  <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                    {column.title[0]}
                  </span>
                  {column.title.slice(1)}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 relative group"
                      >
                        {link}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 group-hover:w-full transition-all duration-300" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Subscribe & Social Row */}
        <div
          className={`${isCompact ? 'px-6 py-8' : 'px-8 py-12'} border-b border-white/10 space-y-6`}
        >
          {/* Subscribe Form */}
          <form onSubmit={handleSubscribe} className="max-w-2xl">
            <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-colors shadow-2xl">
              <label htmlFor="email" className="block text-sm font-semibold text-white mb-3">
                Stay Updated
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput(true)}
                  onBlur={() => setFocusedInput(false)}
                  placeholder="your@email.com"
                  required
                  className={`flex-1 bg-white/3 border rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none transition-all duration-300 ${
                    focusedInput
                      ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] bg-white/6 animate-pulse'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-[0_25px_40px_-5px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                  aria-label="Subscribe to newsletter"
                >
                  <Send size={16} />
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ✓ No spam — unsubscribe anytime.
              </p>
              {subscribed && (
                <p className="text-xs text-green-400 mt-2 animate-pulse">
                  Thanks for subscribing!
                </p>
              )}
            </div>
          </form>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Follow us</span>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  onMouseEnter={() => setHoveredSocial(label)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  className={`rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-[#0F1419] ${
                    isCompact ? 'w-7 h-7' : 'w-9 h-9'
                  } ${
                    hoveredSocial === label
                      ? 'text-purple-400 bg-purple-500/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-110'
                      : 'hover:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:scale-105'
                  }`}
                >
                  <Icon size={isCompact ? 16 : 20} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Legal & Copyright */}
        <div className={`${isCompact ? 'px-6 py-6' : 'px-8 py-8'} flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <p className="text-xs text-gray-500">
            © 2024 MangaMotion. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {legalLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-2 py-1"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
    </footer>
  );
};

export default Footer;
