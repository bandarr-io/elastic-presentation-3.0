import { animate, stagger } from 'animejs';
import { easingPresets } from '../utils/easing';

/**
 * Scroll-triggered reveal animations
 * Elements animate as they enter the viewport
 */

/**
 * Create IntersectionObserver for scroll reveals
 * @param {Function} callback - Callback when element intersects
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver} Observer instance
 */
export function createScrollObserver(callback, options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -10% 0px',
    triggerOnce = true
  } = options;

  const observedElements = new WeakSet();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!triggerOnce || !observedElements.has(entry.target)) {
          callback(entry.target, true);
          if (triggerOnce) {
            observedElements.add(entry.target);
            observer.unobserve(entry.target);
          }
        }
      } else if (!triggerOnce) {
        callback(entry.target, false);
      }
    });
  }, {
    threshold,
    rootMargin
  });

  return observer;
}

/**
 * Fade up reveal on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function fadeUpOnScroll(targets, options = {}) {
  const {
    distance = 40,
    duration = 600,
    stagger = 100,
    threshold = 0.1,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  // Set initial state
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = `translateY(${distance}px)`;
  });

  const observer = createScrollObserver((element, isVisible) => {
    if (isVisible) {
      animate(
        
        opacity: [0, 1],
        translateY: [distance, 0],
        duration: duration,
        easing: easingPresets.entrance
      });
    }
  }, { threshold, triggerOnce });

  elements.forEach((el, index) => {
    setTimeout(() => {
      observer.observe(el);
    }, index * stagger);
  });

  return observer;
}

/**
 * Slide in from side on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {string} direction - 'left' or 'right'
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function slideInOnScroll(targets, direction = 'left', options = {}) {
  const {
    distance = 60,
    duration = 700,
    stagger = 80,
    threshold = 0.1,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  const translateProperty = direction === 'left' ? 'translateX' : 'translateX';
  const initialValue = direction === 'left' ? -distance : distance;

  // Set initial state
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = `${translateProperty}(${initialValue}px)`;
  });

  const observer = createScrollObserver((element) => {
    animate(
      
      opacity: [0, 1],
      [translateProperty]: [initialValue, 0],
      duration: duration,
      easing: easingPresets.entrance
    });
  }, { threshold, triggerOnce });

  elements.forEach((el, index) => {
    setTimeout(() => {
      observer.observe(el);
    }, index * stagger);
  });

  return observer;
}

/**
 * Scale up reveal on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function scaleUpOnScroll(targets, options = {}) {
  const {
    fromScale = 0.8,
    duration = 600,
    stagger = 100,
    threshold = 0.2,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  // Set initial state
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = `scale(${fromScale})`;
  });

  const observer = createScrollObserver((element) => {
    animate(
      
      opacity: [0, 1],
      scale: [fromScale, 1],
      duration: duration,
      easing: easingPresets.entrance
    });
  }, { threshold, triggerOnce });

  elements.forEach((el, index) => {
    setTimeout(() => {
      observer.observe(el);
    }, index * stagger);
  });

  return observer;
}

/**
 * Blur focus reveal on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function blurFocusOnScroll(targets, options = {}) {
  const {
    blurAmount = 20,
    duration = 800,
    threshold = 0.15,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  // Set initial state
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.filter = `blur(${blurAmount}px)`;
  });

  const observer = createScrollObserver((element) => {
    animate(
      
      opacity: [0, 1],
      filter: [`blur(${blurAmount}px)`, 'blur(0px)'],
      duration: duration,
      easing: easingPresets.smooth
    });
  }, { threshold, triggerOnce });

  elements.forEach(el => observer.observe(el));

  return observer;
}

/**
 * Rotate reveal on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function rotateInOnScroll(targets, options = {}) {
  const {
    degrees = 45,
    axis = 'y',
    duration = 700,
    threshold = 0.2,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  const rotateProperty = `rotate${axis.toUpperCase()}`;

  // Set initial state
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = `${rotateProperty}(${degrees}deg)`;
  });

  const observer = createScrollObserver((element) => {
    animate(
      
      opacity: [0, 1],
      [rotateProperty]: [degrees, 0],
      duration: duration,
      easing: easingPresets.entrance
    });
  }, { threshold, triggerOnce });

  elements.forEach(el => observer.observe(el));

  return observer;
}

/**
 * Staggered grid reveal on scroll
 * @param {string} gridSelector - Grid container selector
 * @param {string} itemSelector - Grid item selector
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function gridRevealOnScroll(gridSelector, itemSelector, options = {}) {
  const {
    duration = 500,
    stagger = 60,
    fromDirection = 'bottom',
    threshold = 0.1,
    triggerOnce = true
  } = options;

  const grid = document.querySelector(gridSelector);
  if (!grid) return null;

  const items = grid.querySelectorAll(itemSelector);

  const distance = 30;
  const transform = fromDirection === 'bottom'
    ? { translateY: [distance, 0] }
    : fromDirection === 'top'
    ? { translateY: [-distance, 0] }
    : fromDirection === 'left'
    ? { translateX: [-distance, 0] }
    : { translateX: [distance, 0] };

  // Set initial state
  items.forEach(item => {
    item.style.opacity = '0';
  });

  const observer = createScrollObserver((element) => {
    animate(items, {
      opacity: [0, 1],
      ...transform,
      duration: duration,
      delay: stagger,
      easing: easingPresets.entrance
    });
  }, { threshold, triggerOnce });

  observer.observe(grid);

  return observer;
}

/**
 * Parallax reveal on scroll (multi-speed layers)
 * @param {Array} layers - Array of {element, speed} objects
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export function parallaxOnScroll(layers, options = {}) {
  const {
    smoothness = 0.1
  } = options;

  const updateParallax = () => {
    const scrollY = window.scrollY;

    layers.forEach(({ element, speed = 1 }) => {
      if (!element) return;

      const offset = scrollY * speed;
      element.style.transform = `translateY(${offset}px)`;
    });
  };

  let rafId = null;
  const smoothUpdate = () => {
    updateParallax();
    rafId = requestAnimationFrame(smoothUpdate);
  };

  window.addEventListener('scroll', updateParallax, { passive: true });
  smoothUpdate();

  // Cleanup function
  return () => {
    window.removeEventListener('scroll', updateParallax);
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Counter reveal on scroll (animated number counting)
 * @param {Array|string} targets - Counter elements
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function counterOnScroll(targets, options = {}) {
  const {
    duration = 1500,
    threshold = 0.3,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  const observer = createScrollObserver((element) => {
    const targetValue = parseFloat(element.getAttribute('data-target') || element.textContent);
    const prefix = element.getAttribute('data-prefix') || '';
    const suffix = element.getAttribute('data-suffix') || '';
    const decimals = parseInt(element.getAttribute('data-decimals') || '0');

    const obj = { value: 0 };

    animate(obj, {
      value: targetValue,
      duration: duration,
      easing: 'easeOutCubic',
      update: () => {
        element.textContent = `${prefix}${obj.value.toFixed(decimals)}${suffix}`;
      }
    });
  }, { threshold, triggerOnce });

  elements.forEach(el => observer.observe(el));

  return observer;
}

/**
 * Clip path reveal on scroll
 * @param {Array|string} targets - Elements to animate
 * @param {string} direction - 'horizontal', 'vertical', 'center'
 * @param {Object} options - Configuration options
 * @returns {IntersectionObserver} Observer instance
 */
export function clipPathRevealOnScroll(targets, direction = 'horizontal', options = {}) {
  const {
    duration = 1000,
    threshold = 0.2,
    triggerOnce = true
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  const clipPaths = {
    horizontal: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
    vertical: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
    center: ['inset(50% 50% 50% 50%)', 'inset(0 0 0 0)']
  };

  const [fromClip, toClip] = clipPaths[direction] || clipPaths.horizontal;

  // Set initial state
  elements.forEach(el => {
    el.style.clipPath = fromClip;
  });

  const observer = createScrollObserver((element) => {
    animate(
      
      clipPath: [fromClip, toClip],
      duration: duration,
      easing: easingPresets.dramatic
    });
  }, { threshold, triggerOnce });

  elements.forEach(el => observer.observe(el));

  return observer;
}
