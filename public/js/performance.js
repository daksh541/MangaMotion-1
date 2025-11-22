// Performance optimization utilities

// Lazy load images with Intersection Observer
function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
        // Native lazy loading is supported
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        lazyImages.forEach(img => {
            // Handle any lazy loading specific logic here
        });
    } else {
        // Fallback for browsers that don't support native lazy loading
        const lazyImages = [].slice.call(document.querySelectorAll('img[loading="lazy"]'));
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src || lazyImage.src;
                        if (lazyImage.dataset.srcset) {
                            lazyImage.srcset = lazyImage.dataset.srcset;
                        }
                        lazyImage.classList.remove('lazy');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });

            lazyImages.forEach(function(lazyImage) {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback for browsers that don't support IntersectionObserver
            let active = false;
            const lazyLoad = function() {
                if (active === false) {
                    active = true;
                    setTimeout(function() {
                        lazyImages.forEach(function(lazyImage) {
                            if ((lazyImage.getBoundingClientRect().top <= window.innerHeight && lazyImage.getBoundingClientRect().bottom >= 0) && getComputedStyle(lazyImage).display !== 'none') {
                                lazyImage.src = lazyImage.dataset.src || lazyImage.src;
                                if (lazyImage.dataset.srcset) {
                                    lazyImage.srcset = lazyImage.dataset.srcset;
                                }
                                lazyImage.classList.remove('lazy');
                                lazyImages = lazyImages.filter(function(image) {
                                    return image !== lazyImage;
                                });
                                if (lazyImages.length === 0) {
                                    document.removeEventListener('scroll', lazyLoad);
                                    window.removeEventListener('resize', lazyLoad);
                                    window.removeEventListener('orientationchange', lazyLoad);
                                }
                            }
                        });
                        active = false;
                    }, 200);
                }
            };
            document.addEventListener('scroll', lazyLoad);
            window.addEventListener('resize', lazyLoad);
            window.addEventListener('orientationchange', lazyLoad);
        }
    }
}

// Optimize WebP support detection and image replacement
function optimizeImages() {
    // Check for WebP support
    const supportsWebP = () => {
        const elem = document.createElement('canvas');
        if (!!(elem.getContext && elem.getContext('2d'))) {
            return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }
        return false;
    };

    // Replace image sources with WebP if supported
    if (supportsWebP()) {
        document.querySelectorAll('img[data-webp]').forEach(img => {
            const webpSrc = img.getAttribute('data-webp');
            if (webpSrc) {
                img.src = webpSrc;
            }
        });
    }
}

// Initialize all performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    initLazyLoading();
    optimizeImages();
    
    // Load non-critical CSS
    const loadCSS = (href, before, media) => {
        const ss = window.document.createElement('link');
        const ref = before || window.document.getElementsByTagName('script')[0];
        ss.rel = 'stylesheet';
        ss.href = href;
        ss.media = 'only x';
        ref.parentNode.insertBefore(ss, before);
        const onloadcssdefined = (cb) => {
            const resolvedHref = ss.href;
            const sheets = document.styleSheets;
            for (let i = 0; i < sheets.length; i++) {
                if (sheets[i].href === resolvedHref) {
                    return cb();
                }
            }
            setTimeout(() => { onloadcssdefined(cb); });
        };
        const onloadcss = (cb) => {
            if (ss.addEventListener) {
                ss.addEventListener('load', cb);
            }
            ss.onload = cb;
        };
        onloadcss(() => {
            ss.media = media || 'all';
        });
        onloadcssdefined(() => {
            const sheet = ss.sheet;
            if (sheet) {
                // Handle any post-load CSS processing here
            }
        });
        return ss;
    };
    
    // Load non-critical CSS asynchronously
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
    loadCSS('/public/css/theme.css');
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
