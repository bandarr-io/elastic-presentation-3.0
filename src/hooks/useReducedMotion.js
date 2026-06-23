import { useState, useEffect } from 'react';

/**
 * Hook to detect user's motion preferences for accessibility
 * Respects prefers-reduced-motion media query
 * 
 * @returns {Object} Motion preference state
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if matchMedia is available (SSR safety)
    if (typeof window === 'undefined' || !window.matchMedia) {
      setIsReady(true);
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);
    setIsReady(true);

    // Handle changes
    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (use addEventListener for modern browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  /**
   * Get animation duration adjusted for motion preference
   * @param {number} normalDuration - Normal duration in ms
   * @param {number} reducedDuration - Reduced duration in ms (default: normalDuration / 10)
   * @returns {number} Adjusted duration
   */
  const getDuration = (normalDuration, reducedDuration = null) => {
    if (!prefersReducedMotion) {
      return normalDuration;
    }
    return reducedDuration !== null ? reducedDuration : Math.max(normalDuration / 10, 50);
  };

  /**
   * Get easing adjusted for motion preference
   * @param {string} normalEasing - Normal easing function
   * @returns {string} Adjusted easing (linear for reduced motion)
   */
  const getEasing = (normalEasing) => {
    return prefersReducedMotion ? 'linear' : normalEasing;
  };

  /**
   * Check if animation should be enabled
   * @param {boolean} isDecorative - Whether animation is purely decorative
   * @returns {boolean} True if animation should play
   */
  const shouldAnimate = (isDecorative = false) => {
    if (!prefersReducedMotion) {
      return true;
    }
    // Disable decorative animations, but allow functional ones
    return !isDecorative;
  };

  /**
   * Get animation config adjusted for motion preference
   * @param {Object} config - Animation configuration
   * @param {boolean} isDecorative - Whether animation is decorative
   * @returns {Object|null} Adjusted config or null if animation should be skipped
   */
  const getAnimationConfig = (config, isDecorative = false) => {
    if (!shouldAnimate(isDecorative)) {
      return null;
    }

    if (!prefersReducedMotion) {
      return config;
    }

    // Reduce animation for accessibility
    return {
      ...config,
      duration: getDuration(config.duration || 500),
      easing: getEasing(config.easing || 'easeOutCubic'),
      // Remove decorative effects
      scale: config.scale ? [1, 1] : undefined,
      rotate: config.rotate ? [0, 0] : undefined,
      // Keep essential transforms
      translateX: config.translateX,
      translateY: config.translateY,
      opacity: config.opacity
    };
  };

  return {
    prefersReducedMotion,
    isReady,
    getDuration,
    getEasing,
    shouldAnimate,
    getAnimationConfig
  };
}
