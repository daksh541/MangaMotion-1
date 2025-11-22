// MangaMotion AI Design Tokens
// Complete design system with colors, typography, spacing, and effects

const DesignTokens = {
    // Color Palette
    colors: {
        // Theme colors (cinematic anime tech) - Deep navy/charcoal with neon accents
        themes: {
            light: {
                background: '#0F0F23', // Deep navy
                surface: '#1A1A2E', // Charcoal
                textPrimary: '#FFFFFF',
                textSecondary: '#B8C5D6',
                border: 'rgba(138, 43, 226, 0.3)', // Neon purple border
                cardBg: 'rgba(26, 26, 46, 0.8)', // Semi-transparent charcoal
                cardBorder: 'rgba(138, 43, 226, 0.4)',
                navBg: 'rgba(15, 15, 35, 0.9)', // Glassy navy
                navBorder: 'rgba(138, 43, 226, 0.2)',
                heroOverlay: 'rgba(15, 15, 35, 0.7)',
                shadow: '0 8px 32px rgba(138, 43, 226, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)'
            },
            dark: {
                background: '#0A0A14', // Deeper navy
                surface: '#121226', // Darker charcoal
                textPrimary: '#FFFFFF',
                textSecondary: '#A0A8B8',
                border: 'rgba(186, 85, 211, 0.4)', // Lighter neon purple
                cardBg: 'rgba(18, 18, 38, 0.9)',
                cardBorder: 'rgba(186, 85, 211, 0.5)',
                navBg: 'rgba(10, 10, 20, 0.95)',
                navBorder: 'rgba(186, 85, 211, 0.3)',
                heroOverlay: 'rgba(10, 10, 20, 0.8)',
                shadow: '0 12px 40px rgba(186, 85, 211, 0.4), 0 6px 20px rgba(0, 0, 0, 0.5)'
            }
        },

        // Primary: Neon gradient accents
        primary: '#8A2BE2', // Neon purple
        secondary: '#00BFFF', // Deep sky blue
        tertiary: '#FF1493', // Deep pink

        // Status Colors (neon variants)
        success: '#00FF7F', // Spring green
        error: '#FF4500', // Orange red
        warning: '#FFD700', // Gold
        info: '#00CED1', // Dark turquoise

        // Neon Gradients
        gradientPrimary: 'linear-gradient(135deg, #8A2BE2 0%, #00BFFF 50%, #FF1493 100%)',
        gradientSecondary: 'linear-gradient(135deg, #FF1493 0%, #FFD700 100%)',
        gradientSurface: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(0, 191, 255, 0.1) 50%, rgba(255, 20, 147, 0.1) 100%)',
        gradientNeon: 'linear-gradient(135deg, #8A2BE2, #00BFFF, #FF1493)',
        gradientGlass: 'linear-gradient(135deg, rgba(15, 15, 35, 0.8) 0%, rgba(26, 26, 46, 0.6) 100%)',

        // Shadows with neon glow
        shadowCard: '0 8px 32px rgba(138, 43, 226, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)',
        shadowHeavy: '0 20px 40px rgba(138, 43, 226, 0.4), 0 10px 20px rgba(0, 0, 0, 0.5)',
        shadowGlow: '0 0 30px rgba(138, 43, 226, 0.6), 0 0 60px rgba(0, 191, 255, 0.4)',
        shadowHover: '0 12px 24px rgba(138, 43, 226, 0.4), 0 6px 12px rgba(0, 0, 0, 0.3)',
        shadowNeon: '0 0 20px rgba(138, 43, 226, 0.8), 0 0 40px rgba(0, 191, 255, 0.6), 0 0 60px rgba(255, 20, 147, 0.4)'
    },
    
    // Typography - Bold display fonts mixed with clean sans-serif
    typography: {
        fontFamily: {
            primary: "'Inter', 'Poppins', 'Outfit', sans-serif",
            display: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
            secondary: "'Poppins', sans-serif",
            mono: "'JetBrains Mono', monospace"
        },

        fontSize: {
            h1: '64px', // Huge bold headline
            h2: '48px',
            h3: '32px',
            h4: '24px',
            h5: '20px',
            h6: '18px',
            body: '16px',
            small: '14px',
            micro: '12px'
        },

        fontWeight: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extraBold: 800,
            black: 900
        },

        lineHeight: {
            headings: 1.1, // Tighter for bold display
            body: 1.6,
            small: 1.4,
            micro: 1.3
        }
    },

    // Spacing & Grid (8px/12px base units)
    spacing: {
        base: '8px',
        grid: '12px', // Alternative base unit
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        xxxl: '64px'
    },
    
    // Layout
    layout: {
        sidebarWidth: '280px',
        inspectorWidth: '320px',
        minCanvasWidth: '720px',
        maxContentWidth: '1280px',
        headerHeight: '64px',
        containerMaxWidth: '1200px',
        gridColumns: {
            mobile: 1,
            tablet: 2,
            desktop: 3,
            wide: 4
        }
    },

    // Borders
    borders: {
        radius: {
            sm: '4px',
            md: '8px', // Standard radius
            lg: '16px', // Larger for cards/modals
            xl: '24px',
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
            fast: '0.15s ease-in-out',
            normal: '0.25s ease-in-out',
            slow: '0.4s ease-in-out'
        },

        backdropBlur: 'blur(20px)',
        glassmorphism: 'backdrop-filter: blur(20px) saturate(180%); background: rgba(15, 15, 35, 0.8); border: 1px solid rgba(138, 43, 226, 0.3);',

        animations: {
            float: 'float 6s ease-in-out infinite',
            pulse: 'pulse 2s infinite',
            glow: 'glow 2s ease-in-out infinite alternate',
            fadeIn: 'fadeIn 0.6s ease-out forwards',
            slideUp: 'slideUp 0.5s ease-out forwards',
            neonPulse: 'neonPulse 3s ease-in-out infinite alternate',
            particleFloat: 'particleFloat 8s ease-in-out infinite',
            motionSweep: 'motionSweep 2s ease-in-out infinite',
            cardLift: 'cardLift 0.3s ease-out forwards'
        }
    },
    
    // Component-specific tokens
    components: {
        button: {
            height: '44px', // 44px+ for touch targets
            padding: '0 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '16px',
            minWidth: '44px'
        },

        card: {
            padding: '24px',
            borderRadius: '16px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            hover: {
                transform: 'translateY(-4px)',
                shadow: '0 10px 20px rgba(0,0,0,0.07), 0 3px 6px rgba(0,0,0,0.05)'
            }
        },

        input: {
            height: '44px', // 40-44px for comfortable touch
            padding: '0 16px',
            borderRadius: '8px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            focus: {
                borderColor: '#6366F1',
                shadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
            }
        },

        modal: {
            overlay: 'rgba(0, 0, 0, 0.5)',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px'
        },

        tooltip: {
            background: '#1F2937',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            maxWidth: '200px'
        },

        panel: {
            thumbnailSize: '80px',
            borderRadius: '8px',
            activeBorder: '2px solid #6366F1'
        },

        grid: {
            gap: '24px',
            columns: {
                mobile: 1,
                tablet: 2,
                desktop: 3,
                wide: 4
            }
        },

        navigation: {
            height: '64px',
            logoSize: '40px',
            searchWidth: '300px'
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
            minHeight: '44px', // Touch-friendly
            padding: '0 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.25s ease-in-out',
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
                padding: '0 16px',
                fontSize: '14px',
                minHeight: '36px'
            },
            md: {
                padding: '0 24px',
                fontSize: '16px',
                minHeight: '44px'
            },
            lg: {
                padding: '0 32px',
                fontSize: '18px',
                minHeight: '52px'
            },
            xl: {
                padding: '0 40px',
                fontSize: '20px',
                minHeight: '60px'
            }
        };

        const variantStyles = {
            primary: {
                background: 'linear-gradient(135deg, #6366F1 0%, #0D9488 100%)',
                color: 'white',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 4px 8px rgba(99, 102, 241, 0.2)'
                }
            },
            secondary: {
                background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
                color: 'white',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 4px 8px rgba(236, 72, 153, 0.2)'
                }
            },
            outline: {
                backgroundColor: 'transparent',
                border: '2px solid #6366F1',
                color: '#6366F1',
                '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)'
                }
            },
            ghost: {
                backgroundColor: 'transparent',
                color: '#6366F1',
                '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    transform: 'translateY(0)',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)'
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
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '24px',
            transition: 'all 0.25s ease-in-out',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.07), 0 3px 6px rgba(0,0,0,0.05)',
                borderColor: 'rgba(99, 102, 241, 0.3)'
            },
            '&:active': {
                transform: 'translateY(-1px)'
            },
            '&.clickable': {
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.02)'
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
                    background: 'linear-gradient(90deg, transparent, #6366F1, transparent)',
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
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }
            },
            outline: {
                backgroundColor: 'transparent',
                border: '2px dashed rgba(99, 102, 241, 0.2)',
                '&:hover': {
                    borderStyle: 'solid',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)'
                }
            },
            primary: {
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.4)'
                }
            },
            secondary: {
                backgroundColor: 'rgba(13, 148, 136, 0.05)',
                border: '1px solid rgba(13, 148, 136, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    borderColor: 'rgba(13, 148, 136, 0.4)'
                }
            },
            success: {
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.4)'
                }
            },
            danger: {
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
                background: 'linear-gradient(90deg, #6366F1, #0D9488)',
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