import { animate } from 'animejs';
import { easingPresets, getInteractionEasing } from '../utils/easing';

/**
 * Click interaction effects for buttons and interactive elements
 * Provides immediate feedback for user clicks
 */

/**
 * Press down effect (scale down on click)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Promise} Animation promise
 */
export async function pressDownEffect(element, options = {}) {
  const {
    scale = 0.95,
    duration = 100
  } = options;

  // Press down
  await animate(element, {
    scale: scale,
    duration: duration,
    easing: 'easeOutQuad'
  });

  // Release
  return animate(element, {
    scale: 1,
    duration: duration * 1.5,
    easing: getInteractionEasing('click')
  });
}

/**
 * Ripple effect (material design ripple)
 * @param {HTMLElement} element - Element to add ripple to
 * @param {MouseEvent} event - Click event for position
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function rippleEffect(element, event, options = {}) {
  const {
    color = 'rgba(255, 255, 255, 0.5)',
    duration = 600
  } = options;

  // Create ripple element
  const ripple = document.createElement('div');
  const rect = element.getBoundingClientRect();
  
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const size = Math.max(rect.width, rect.height) * 2;

  ripple.style.position = 'absolute';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = '0';
  ripple.style.height = '0';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = color;
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.pointerEvents = 'none';
  ripple.style.zIndex = '1000';

  // Ensure element has position context and overflow hidden
  const originalPosition = element.style.position;
  const originalOverflow = element.style.overflow;
  
  if (!originalPosition || originalPosition === 'static') {
    element.style.position = 'relative';
  }
  element.style.overflow = 'hidden';

  element.appendChild(ripple);

  return animate(ripple, {
    width: size,
    height: size,
    opacity: [1, 0],
    duration: duration,
    easing: 'easeOutQuad',
    onComplete: () => {
      ripple.remove();
      // Restore original overflow if needed
      if (!originalOverflow) {
        element.style.overflow = '';
      }
    }
  });
}

/**
 * Punch effect (quick scale pulse)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function punchEffect(element, options = {}) {
  const {
    scale = 1.15,
    duration = 200
  } = options;

  return animate(element, {
    scale: [1, scale, 1],
    duration: duration,
    easing: 'easeInOutQuad'
  });
}

/**
 * Flash effect (opacity flash)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function flashEffect(element, options = {}) {
  const {
    minOpacity = 0.5,
    duration = 200
  } = options;

  return animate(element, {
    opacity: [1, minOpacity, 1],
    duration: duration,
    easing: 'linear'
  });
}

/**
 * Shake effect (horizontal shake)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function shakeEffect(element, options = {}) {
  const {
    distance = 10,
    duration = 400
  } = options;

  return animate(element, {
    translateX: [
      { value: distance, duration: 50 },
      { value: -distance, duration: 50 },
      { value: distance / 2, duration: 50 },
      { value: -distance / 2, duration: 50 },
      { value: 0, duration: 50 }
    ],
    easing: 'easeInOutQuad'
  });
}

/**
 * Jiggle effect (rotation wiggle)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function jiggleEffect(element, options = {}) {
  const {
    degrees = 5,
    duration = 400
  } = options;

  return animate(element, {
    rotate: [
      { value: degrees, duration: 100 },
      { value: -degrees, duration: 100 },
      { value: degrees / 2, duration: 100 },
      { value: 0, duration: 100 }
    ],
    easing: 'easeInOutQuad'
  });
}

/**
 * Success pulse (green pulse effect)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function successPulse(element, options = {}) {
  const {
    color = '#10b981',
    duration = 600
  } = options;

  return animate(element, {
    backgroundColor: [color, 'transparent'],
    scale: [1, 1.05, 1],
    duration: duration,
    easing: 'easeInOutQuad'
  });
}

/**
 * Error shake (red shake effect)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function errorShake(element, options = {}) {
  const {
    color = '#ef4444',
    distance = 10
  } = options;

  // Store original border
  const originalBorder = element.style.border;

  element.style.border = `2px solid ${color}`;

  return animate(element, {
    translateX: [
      { value: distance, duration: 50 },
      { value: -distance, duration: 50 },
      { value: distance / 2, duration: 50 },
      { value: -distance / 2, duration: 50 },
      { value: 0, duration: 50 }
    ],
    easing: 'easeInOutQuad',
    onComplete: () => {
      // Restore original border after delay
      setTimeout(() => {
        element.style.border = originalBorder;
      }, 500);
    }
  });
}

/**
 * Bounce click (spring bounce)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function bounceClick(element, options = {}) {
  const {
    distance = 15,
    duration = 500
  } = options;

  return animate(element, {
    translateY: [0, -distance, 0],
    duration: duration,
    easing: easingPresets.bounce
  });
}

/**
 * Expand click (scale expand with fade)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function expandClick(element, options = {}) {
  const {
    scale = 1.5,
    duration = 400
  } = options;

  return animate(element, {
    scale: [1, scale],
    opacity: [1, 0],
    duration: duration,
    easing: 'easeOutQuad'
  });
}

/**
 * Splash effect (radial color splash)
 * @param {HTMLElement} element - Element to add splash to
 * @param {MouseEvent} event - Click event for position
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function splashEffect(element, event, options = {}) {
  const {
    color = '#00bfb3',
    duration = 800
  } = options;

  const splash = document.createElement('div');
  const rect = element.getBoundingClientRect();
  
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  splash.style.position = 'absolute';
  splash.style.left = `${x}px`;
  splash.style.top = `${y}px`;
  splash.style.width = '0';
  splash.style.height = '0';
  splash.style.borderRadius = '50%';
  splash.style.backgroundColor = color;
  splash.style.transform = 'translate(-50%, -50%)';
  splash.style.pointerEvents = 'none';

  if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
    element.style.position = 'relative';
  }
  element.style.overflow = 'hidden';

  element.appendChild(splash);

  return animate(element, { splash,
    width: 300,
    height: 300,
    opacity: [0.6, 0],
    duration: duration,
    easing: 'easeOutQuad',
    onComplete: () => {
      splash.remove();
    }
  });
}

/**
 * Confetti burst (celebratory particles)
 * @param {HTMLElement} element - Element to burst from
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function confettiBurst(element, options = {}) {
  const {
    particleCount = 20,
    colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8'],
    duration = 1000
  } = options;

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10000';
  document.body.appendChild(container);

  // Create particles
  const particles = Array.from({ length: particleCount }, () => {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(particle);
    return particle;
  });

  // Animate particles
  return animate(element, { particles,
    translateX: () => anime.random(-150, 150),
    translateY: () => anime.random(-150, 150),
    rotate: () => anime.random(0, 360),
    scale: [1, 0],
    opacity: [1, 0],
    duration: duration,
    easing: 'easeOutQuad',
    onComplete: () => {
      container.remove();
    }
  });
}
