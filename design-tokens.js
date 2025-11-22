// MangaMotion AI Design Tokens
// Complete design system with colors, typography, spacing, and effects

const DesignTokens = {
    // Color Palette
    colors: {
        // Theme colors (light/dark)
        themes: {
            light: {
                background: '#FFFFFF',
                surface: '#F8FAFC',
                textPrimary: '#1E293B',
                textSecondary: '#64748B',
                border: '#E2E8F0',
                cardBg: '#FFFFFF',
                cardBorder: '#E2E8F0',
                navBg: 'rgba(255, 255, 255, 0.8)',
                navBorder: 'rgba(0, 0, 0, 0.05)',
                heroOverlay: 'rgba(255, 255, 255, 0.8)',
                shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            },
            dark: {
                background: '#0F1724',
                surface: '#0B1220',
                textPrimary: '#E6EEF6',
                textSecondary: '#94A3B8',
                border: '#2D3748',
                cardBg: '#1E293B',
                cardBorder: 'rgba(255, 255, 255, 0.1)',
                navBg: 'rgba(11, 18, 32, 0.9)',
                navBorder: 'rgba(255, 255, 255, 0.1)',
                heroOverlay: 'rgba(3, 6, 23, 0.6)',
                shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
            }
        },
        
        // Primary Accents
        primary: '#FF3366', // vibrant magenta
        secondary: '#1F8FFF', // cool azure
        
        // Status Colors
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        
        // Gradients
        gradientPrimary: 'linear-gradient(135deg, #FF3366 0%, #1F8FFF 100%)',
        gradientSurface: 'linear-gradient(135deg, rgba(255, 51, 102, 0.2) 0%, rgba(31, 143, 255, 0.2) 100%)',
        
        // Shadows
        shadowHeavy: '0 8px 24px rgba(3, 6, 23, 0.6)',
        shadowCard: '0 2px 8px rgba(2, 6, 23, 0.4)',
        shadowGlow: '0 0 20px rgba(255, 51, 102, 0.3)'
    },
    
    // Typography
    typography: {
        fontFamily: {
            primary: "'Inter', sans-serif",
            mono: "'JetBrains Mono', monospace"
        },
        
        fontSize: {
            h1: '48px',
            h2: '36px', 
            h3: '28px',
            body: '16px',
            small: '14px',
            caption: '12px'
        },
        
        fontWeight: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
            black: 900
        },
        
        lineHeight: {
            tight: 1.1,
            normal: 1.4,
            relaxed: 1.6
        }
    },
    
    // Spacing
    spacing: {
        unit: 8,
        xs: '4px',
        sm: '8px', 
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px'
    },
    
    // Layout
    layout: {
        sidebarWidth: '320px',
        inspectorWidth: '360px',
        minCanvasWidth: '720px',
        maxContentWidth: '1400px',
        headerHeight: '64px'
    },
    
    // Borders
    borders: {
        radius: {
            sm: '4px',
            md: '8px',
            lg: '12px',
            pill: '9999px'
        },
        width: {
            thin: '1px',
            medium: '2px',
            thick: '3px'
        }
    },
    
    // Effects
    effects: {
        transition: {
            fast: '0.15s ease',
            normal: '0.3s ease',
            slow: '0.5s ease'
        },
        
        backdropBlur: 'blur(10px)',
        
        animations: {
            float: 'float 6s ease-in-out infinite',
            pulse: 'pulse 2s infinite',
            glow: 'pulse-glow 2s ease-in-out infinite alternate'
        }
    },
    
    // Component-specific tokens
    components: {
        button: {
            height: '44px',
            padding: '0 24px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '14px'
        },
        
        card: {
            padding: '24px',
            borderRadius: '8px',
            background: '#0B1220',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        
        input: {
            height: '44px',
            padding: '0 16px',
            borderRadius: '8px',
            background: '#0B1220',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        },
        
        panel: {
            thumbnailSize: '80px',
            borderRadius: '8px',
            activeBorder: '2px solid #FF3366'
        }
    }
};

// Utility functions for applying design tokens
const applyDesignTokens = {
    // Apply color tokens to CSS custom properties
    applyColors: () => {
        const root = document.documentElement;
        Object.entries(DesignTokens.colors).forEach(([key, value]) => {
            if (typeof value === 'string') {
                root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
            }
        });
    },
    
    // Generate button styles with enhanced interactions
    button: (variant = 'primary', size = 'md', isFullWidth = false) => {
        const baseStyles = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '2.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontWeight: 500,
            fontSize: '1rem',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: 'none',
            textDecoration: 'none',
            outline: 'none',
            position: 'relative',
            overflow: 'hidden',
            '&:active': {
                transform: 'translateY(1px)'
            },
            '&:disabled': {
                opacity: 0.7,
                cursor: 'not-allowed',
                transform: 'none !important',
                boxShadow: 'none !important'
            },
            '& .icon': {
                transition: 'transform 0.2s ease-in-out',
                marginRight: '0.5rem'
            },
            '&:hover .icon': {
                transform: 'translateX(2px)'
            },
            '&:active .icon': {
                transform: 'scale(0.95)'
            },
            '&.loading': {
                pointerEvents: 'none',
                opacity: 0.8,
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: '1.25rem',
                    height: '1.25rem',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                },
                '& > *:not(.loading-spinner)': {
                    visibility: 'hidden'
                }
            },
            '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
            }
        };
        
        const sizeStyles = {
            sm: {
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                minHeight: '2rem'
            },
            md: {
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                minHeight: '2.5rem'
            },
            lg: {
                padding: '0.75rem 1.5rem',
                fontSize: '1.125rem',
                minHeight: '3rem'
            },
            xl: {
                padding: '1rem 2rem',
                fontSize: '1.25rem',
                minHeight: '3.5rem'
            }
        };
        
        const variantStyles = {
            primary: {
                backgroundColor: '#FF3366',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#ff1a52',
                    boxShadow: '0 4px 12px rgba(255, 51, 102, 0.3)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 6px rgba(255, 51, 102, 0.2)'
                },
                '&:disabled': {
                    backgroundColor: '#ffb3c6',
                    color: '#fff'
                }
            },
            secondary: {
                backgroundColor: '#1F8FFF',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#0077e6',
                    boxShadow: '0 4px 12px rgba(31, 143, 255, 0.3)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 6px rgba(31, 143, 255, 0.2)'
                }
            },
            outline: {
                backgroundColor: 'transparent',
                border: '2px solid #FF3366',
                color: '#FF3366',
                '&:hover': {
                    backgroundColor: 'rgba(255, 51, 102, 0.1)',
                    boxShadow: '0 4px 12px rgba(255, 51, 102, 0.1)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    backgroundColor: 'rgba(255, 51, 102, 0.2)'
                }
            },
            ghost: {
                backgroundColor: 'transparent',
                color: '#FF3366',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }
            },
            danger: {
                backgroundColor: '#EF4444',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#dc2626',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                }
            },
            success: {
                backgroundColor: '#10B981',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#059669',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
                }
            },
            disabled: {
                backgroundColor: '#9CA3AF',
                color: '#4B5563',
                cursor: 'not-allowed',
                '&:hover': {
                    transform: 'none',
                    boxShadow: 'none'
                }
            }
        };
        
        // Merge all styles
        const styles = {
            ...baseStyles,
            ...(sizeStyles[size] || sizeStyles.md),
            ...(variantStyles[variant] || variantStyles.primary),
            ...(isFullWidth && { width: '100%' })
        };
        
        return styles;
    },
    
    // Generate card styles with enhanced interactions
    card: (variant = 'default') => {
        const baseStyles = {
            backgroundColor: '#0B1220',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                borderColor: 'rgba(255, 51, 102, 0.5)'
            },
            '&:active': {
                transform: 'translateY(-1px)'
            },
            '&.clickable': {
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                }
            },
            '&.loading': {
                position: 'relative',
                overflow: 'hidden',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #FF3366, transparent)',
                    animation: 'shimmer 2s infinite'
                }
            },
            '@keyframes shimmer': {
                '0%': { transform: 'translateX(-100%)' },
                '100%': { transform: 'translateX(100%)' }
            }
        };
        
        const variants = {
            default: {},
            elevated: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                '&:hover': {
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }
            },
            outline: {
                backgroundColor: 'transparent',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                '&:hover': {
                    borderStyle: 'solid',
                    borderColor: 'rgba(255, 51, 102, 0.5)',
                    backgroundColor: 'rgba(255, 51, 102, 0.05)'
                }
            },
            primary: {
                backgroundColor: 'rgba(255, 51, 102, 0.1)',
                border: '1px solid rgba(255, 51, 102, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(255, 51, 102, 0.15)',
                    borderColor: 'rgba(255, 51, 102, 0.4)'
                }
            },
            secondary: {
                backgroundColor: 'rgba(31, 143, 255, 0.1)',
                border: '1px solid rgba(31, 143, 255, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(31, 143, 255, 0.15)',
                    borderColor: 'rgba(31, 143, 255, 0.4)'
                }
            },
            success: {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.4)'
                }
            },
            danger: {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.4)'
                }
            }
        };
        
        // Merge base styles with variant styles
        return { 
            ...baseStyles, 
            ...(variants[variant] || variants.default),
            // Add a subtle gradient overlay on hover for all cards
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, #FF3366, #1F8FFF)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                zIndex: 1
            },
            '&:hover::before': {
                opacity: 1
            }
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DesignTokens, applyDesignTokens };
}

// Apply design tokens when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    applyDesignTokens.applyColors();
});

// Global access
window.DesignTokens = DesignTokens;
window.applyDesignTokens = applyDesignTokens;