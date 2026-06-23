import { animate } from 'animejs';

/**
 * Scroll progress animations
 * Track and animate based on scroll position
 */

/**
 * Create scroll progress tracker
 * @param {Function} onProgress - Callback with progress (0-1)
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function createScrollProgressTracker(onProgress, options = {}) {
  const {
    element = null,
    smoothness = 0.05
  } = options;

  let targetProgress = 0;
  let currentProgress = 0;
  let rafId = null;

  const calculateProgress = () => {
    if (element) {
      // Track progress within specific element
      const rect = element.getBoundingClientRect();
      const elementHeight = element.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      targetProgress = Math.max(0, Math.min(1, scrolled / elementHeight));
    } else {
      // Track progress of entire page
      const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = Math.max(0, Math.min(1, window.scrollY / windowHeight));
    }
  };

  const smoothUpdate = () => {
    // Smooth interpolation
    currentProgress += (targetProgress - currentProgress) * smoothness;
    
    if (Math.abs(targetProgress - currentProgress) > 0.001) {
      onProgress(currentProgress);
      rafId = requestAnimationFrame(smoothUpdate);
    } else {
      currentProgress = targetProgress;
      onProgress(currentProgress);
    }
  };

  const handleScroll = () => {
    calculateProgress();
    if (!rafId) {
      rafId = requestAnimationFrame(smoothUpdate);
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial calculation

  // Cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Scroll progress bar
 * @param {HTMLElement|string} progressBar - Progress bar element
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function scrollProgressBar(progressBar, options = {}) {
  const {
    direction = 'horizontal',
    element = null
  } = options;

  const bar = typeof progressBar === 'string'
    ? document.querySelector(progressBar)
    : progressBar;

  if (!bar) return () => {};

  const property = direction === 'horizontal' ? 'width' : 'height';

  return createScrollProgressTracker((progress) => {
    bar.style[property] = `${progress * 100}%`;
  }, { element });
}

/**
 * Scroll-based animation timeline
 * @param {Object} timeline - Anime.js timeline instance
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function scrollTimeline(timeline, options = {}) {
  const {
    startScroll = 0,
    endScroll = 1000,
    element = null
  } = options;

  if (!timeline) return () => {};

  timeline.pause();

  return createScrollProgressTracker((progress) => {
    const scrollRange = endScroll - startScroll;
    const currentScroll = startScroll + (progress * scrollRange);
    
    // Map scroll to timeline progress
    const timelineProgress = Math.max(0, Math.min(1, 
      (currentScroll - startScroll) / scrollRange
    ));

    timeline.seek(timeline.duration * timelineProgress);
  }, { element, smoothness: 0.1 });
}

/**
 * Parallax scroll effect
 * @param {Array} layers - Array of {element, speed} objects
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function parallaxScroll(layers, options = {}) {
  const {
    smoothness = 0.08
  } = options;

  const targetOffsets = layers.map(() => 0);
  const currentOffsets = layers.map(() => 0);
  let rafId = null;

  const calculateOffsets = () => {
    const scrollY = window.scrollY;
    layers.forEach((layer, index) => {
      targetOffsets[index] = scrollY * (layer.speed || 1);
    });
  };

  const smoothUpdate = () => {
    let needsUpdate = false;

    layers.forEach((layer, index) => {
      const diff = targetOffsets[index] - currentOffsets[index];
      
      if (Math.abs(diff) > 0.1) {
        currentOffsets[index] += diff * smoothness;
        layer.element.style.transform = `translate3d(0, ${currentOffsets[index]}px, 0)`;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      rafId = requestAnimationFrame(smoothUpdate);
    } else {
      rafId = null;
    }
  };

  const handleScroll = () => {
    calculateOffsets();
    if (!rafId) {
      rafId = requestAnimationFrame(smoothUpdate);
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Horizontal scroll animation
 * @param {HTMLElement} container - Container to scroll horizontally
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function horizontalScroll(container, options = {}) {
  const {
    speed = 1,
    smoothness = 0.1
  } = options;

  let targetScroll = 0;
  let currentScroll = 0;
  let rafId = null;

  const smoothUpdate = () => {
    const diff = targetScroll - currentScroll;
    
    if (Math.abs(diff) > 0.5) {
      currentScroll += diff * smoothness;
      container.style.transform = `translateX(-${currentScroll}px)`;
      rafId = requestAnimationFrame(smoothUpdate);
    } else {
      currentScroll = targetScroll;
      container.style.transform = `translateX(-${currentScroll}px)`;
      rafId = null;
    }
  };

  const handleScroll = () => {
    targetScroll = window.scrollY * speed;
    
    if (!rafId) {
      rafId = requestAnimationFrame(smoothUpdate);
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Reveal on scroll progress
 * @param {HTMLElement|string} element - Element to reveal
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function revealOnScrollProgress(element, options = {}) {
  const {
    startProgress = 0,
    endProgress = 1,
    property = 'opacity',
    fromValue = 0,
    toValue = 1
  } = options;

  const el = typeof element === 'string'
    ? document.querySelector(element)
    : element;

  if (!el) return () => {};

  return createScrollProgressTracker((progress) => {
    if (progress < startProgress) {
      el.style[property] = fromValue;
    } else if (progress > endProgress) {
      el.style[property] = toValue;
    } else {
      const range = endProgress - startProgress;
      const localProgress = (progress - startProgress) / range;
      const value = fromValue + (toValue - fromValue) * localProgress;
      el.style[property] = value;
    }
  });
}

/**
 * Sticky scroll animation
 * @param {HTMLElement} element - Element to make sticky with animation
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function stickyScrollAnimation(element, options = {}) {
  const {
    startOffset = 0,
    endOffset = 500,
    onProgress = null
  } = options;

  let isSticky = false;

  const handleScroll = () => {
    const scrollY = window.scrollY;
    const rect = element.getBoundingClientRect();

    if (scrollY >= startOffset && scrollY <= endOffset) {
      if (!isSticky) {
        element.style.position = 'fixed';
        element.style.top = '0';
        isSticky = true;
      }

      if (onProgress) {
        const progress = (scrollY - startOffset) / (endOffset - startOffset);
        onProgress(progress, element);
      }
    } else if (scrollY > endOffset) {
      element.style.position = 'absolute';
      element.style.top = `${endOffset}px`;
      isSticky = false;
    } else {
      element.style.position = 'relative';
      element.style.top = 'auto';
      isSticky = false;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Scroll-based color transition
 * @param {HTMLElement} element - Element to change color
 * @param {Array} colorStops - Array of {progress, color} objects
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function scrollColorTransition(element, colorStops, options = {}) {
  const {
    property = 'backgroundColor'
  } = options;

  return createScrollProgressTracker((progress) => {
    // Find the two nearest color stops
    let fromStop = colorStops[0];
    let toStop = colorStops[colorStops.length - 1];

    for (let i = 0; i < colorStops.length - 1; i++) {
      if (progress >= colorStops[i].progress && progress <= colorStops[i + 1].progress) {
        fromStop = colorStops[i];
        toStop = colorStops[i + 1];
        break;
      }
    }

    // Interpolate between colors
    const localProgress = (progress - fromStop.progress) / (toStop.progress - fromStop.progress);
    
    // Simple color interpolation (assumes hex colors)
    // For production, use a proper color interpolation library
    element.style[property] = localProgress < 0.5 ? fromStop.color : toStop.color;
  });
}
