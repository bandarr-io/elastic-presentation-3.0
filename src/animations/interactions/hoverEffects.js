import { animate } from 'animejs';
import { easingPresets, getInteractionEasing } from '../utils/easing';

/**
 * Hover interaction effects for interactive elements
 * Provides responsive feedback for user interactions
 */

/**
 * Scale hover (gentle scale up)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function scaleHover(element, isEnter = true, options = {}) {
  const {
    scale = 1.05,
    duration = 200
  } = options;

  return animate(element, {
    scale: isEnter ? scale : 1,
    duration: duration,
    easing: getInteractionEasing('hover'),
    ...options
  });
}

/**
 * Lift hover (scale + shadow)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function liftHover(element, isEnter = true, options = {}) {
  const {
    scale = 1.03,
    translateY = -4,
    shadowColor = 'rgba(0, 0, 0, 0.15)',
    duration = 250
  } = options;

  const shadow = isEnter
    ? `0 8px 16px ${shadowColor}`
    : '0 2px 4px rgba(0, 0, 0, 0.05)';

  return animate(element, {
    scale: isEnter ? scale : 1,
    translateY: isEnter ? translateY : 0,
    boxShadow: shadow,
    duration: duration,
    easing: easingPresets.smooth,
    ...options
  });
}

/**
 * Glow hover (border/shadow glow)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function glowHover(element, isEnter = true, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.4)',
    duration = 300
  } = options;

  const shadow = isEnter
    ? `0 0 20px ${color}, 0 0 40px ${color}`
    : '0 0 0 rgba(0, 0, 0, 0)';

  return animate(element, {
    boxShadow: shadow,
    duration: duration,
    easing: easingPresets.smooth,
    ...options
  });
}

/**
 * Tilt hover (3D tilt effect based on mouse position)
 * @param {HTMLElement} element - Element to animate
 * @param {MouseEvent} event - Mouse event with position
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function tiltHover(element, event, options = {}) {
  const {
    maxTilt = 10,
    duration = 200,
    perspective = 1000
  } = options;

  if (!event) {
    // Reset tilt
    return animate(element, {
      rotateX: 0,
      rotateY: 0,
      duration: duration,
      easing: easingPresets.smooth
    });
  }

  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateY = ((x - centerX) / centerX) * maxTilt;
  const rotateX = ((centerY - y) / centerY) * maxTilt;

  element.style.perspective = `${perspective}px`;

  return animate(element, {
    rotateX: rotateX,
    rotateY: rotateY,
    duration: duration,
    easing: easingPresets.smooth
  });
}

/**
 * Shine hover (light sweep effect)
 * @param {HTMLElement} element - Element to add shine to
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function shineHover(element, options = {}) {
  const {
    duration = 600,
    color = 'rgba(255, 255, 255, 0.3)'
  } = options;

  // Create shine element
  const shine = document.createElement('div');
  shine.style.position = 'absolute';
  shine.style.top = '0';
  shine.style.left = '-100%';
  shine.style.width = '50%';
  shine.style.height = '100%';
  shine.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
  shine.style.pointerEvents = 'none';
  shine.style.zIndex = '1';

  // Ensure element has position context
  const originalPosition = element.style.position;
  if (!originalPosition || originalPosition === 'static') {
    element.style.position = 'relative';
  }
  element.style.overflow = 'hidden';

  element.appendChild(shine);

  return animate(element, { shine,
    left: ['-100%', '200%'],
    duration: duration,
    easing: 'easeInOutQuad',
    onComplete: () => {
      shine.remove();
    }
  });
}

/**
 * Underline hover (animated underline)
 * @param {HTMLElement} element - Text element to underline
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function underlineHover(element, isEnter = true, options = {}) {
  const {
    color = '#00bfb3',
    thickness = 2,
    duration = 250
  } = options;

  // Get or create underline element
  let underline = element.querySelector('.hover-underline');
  
  if (!underline) {
    underline = document.createElement('div');
    underline.className = 'hover-underline';
    underline.style.position = 'absolute';
    underline.style.bottom = '0';
    underline.style.left = '0';
    underline.style.width = '0';
    underline.style.height = `${thickness}px`;
    underline.style.backgroundColor = color;
    underline.style.transition = 'none';

    // Ensure element has position context
    if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
      element.style.position = 'relative';
    }
    element.appendChild(underline);
  }

  return animate(element, { underline,
    width: isEnter ? '100%' : '0%',
    duration: duration,
    easing: 'easeOutCubic'
  });
}

/**
 * Color shift hover (smooth color transition)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function colorShiftHover(element, isEnter = true, options = {}) {
  const {
    hoverColor = '#00bfb3',
    originalColor = null,
    duration = 300
  } = options;

  // Store original color if not provided
  const fromColor = originalColor || element.style.color || window.getComputedStyle(element).color;

  return animate(element, {
    color: isEnter ? hoverColor : fromColor,
    duration: duration,
    easing: easingPresets.smooth,
    ...options
  });
}

/**
 * Bounce hover (playful bounce)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function bounceHover(element, options = {}) {
  const {
    distance = 10,
    duration = 400
  } = options;

  return animate(element, {
    translateY: [0, -distance, 0],
    duration: duration,
    easing: 'easeOutQuad'
  });
}

/**
 * Rotate hover (gentle rotation)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function rotateHover(element, isEnter = true, options = {}) {
  const {
    degrees = 5,
    duration = 200
  } = options;

  return animate(element, {
    rotate: isEnter ? degrees : 0,
    duration: duration,
    easing: easingPresets.smooth
  });
}

/**
 * Pulse hover (scale pulse)
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function pulseHover(element, options = {}) {
  const {
    scale = 1.1,
    duration = 300,
    loop = false
  } = options;

  return animate(element, {
    scale: [1, scale, 1],
    duration: duration,
    easing: 'easeInOutQuad',
    loop: loop
  });
}

/**
 * Border grow hover (border expands)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function borderGrowHover(element, isEnter = true, options = {}) {
  const {
    color = '#00bfb3',
    width = 2,
    duration = 250
  } = options;

  return animate(element, {
    borderWidth: isEnter ? `${width}px` : '0px',
    borderColor: color,
    borderStyle: 'solid',
    duration: duration,
    easing: easingPresets.smooth
  });
}

/**
 * Background expand hover (background color expands)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isEnter - True for hover enter, false for leave
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function backgroundExpandHover(element, isEnter = true, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.1)',
    duration = 300
  } = options;

  // Get or create background overlay
  let overlay = element.querySelector('.hover-bg-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'hover-bg-overlay';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = color;
    overlay.style.borderRadius = 'inherit';
    overlay.style.transform = 'scale(0)';
    overlay.style.zIndex = '-1';
    overlay.style.pointerEvents = 'none';

    // Ensure element has position context
    if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
      element.style.position = 'relative';
    }
    element.appendChild(overlay);
  }

  return animate(element, { overlay,
    scale: isEnter ? 1 : 0,
    opacity: isEnter ? 1 : 0,
    duration: duration,
    easing: 'easeOutCubic'
  });
}
