import { animate } from 'animejs';
import { easingPresets } from '../utils/easing';

/**
 * Element-level transitions for individual components
 * Smaller, faster transitions for UI elements
 */

/**
 * Quick fade for elements
 * @param {HTMLElement|string} target - Element or selector
 * @param {boolean} fadeIn - True to fade in, false to fade out
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function quickFade(target, fadeIn = true, options = {}) {
  return animate(element, {
    
    opacity: fadeIn ? [0, 1] : [1, 0],
    duration: 300,
    easing: 'easeOutQuad',
    ...options
  });
}

/**
 * Slide and fade for elements
 * @param {HTMLElement|string} target - Element or selector
 * @param {boolean} slideIn - True to slide in, false to slide out
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function slideFade(target, slideIn = true, direction = 'up', options = {}) {
  const distance = 20;
  const transforms = {
    up: { translateY: slideIn ? [distance, 0] : [0, -distance] },
    down: { translateY: slideIn ? [-distance, 0] : [0, distance] },
    left: { translateX: slideIn ? [distance, 0] : [0, -distance] },
    right: { translateX: slideIn ? [-distance, 0] : [0, distance] }
  };

  return animate(element, {
    
    opacity: slideIn ? [0, 1] : [1, 0],
    ...transforms[direction],
    duration: 400,
    easing: slideIn ? easingPresets.entrance : easingPresets.exit,
    ...options
  });
}

/**
 * Pop animation (scale + fade)
 * @param {HTMLElement|string} target - Element or selector
 * @param {boolean} popIn - True to pop in, false to pop out
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function pop(target, popIn = true, options = {}) {
  return animate(element, {
    
    opacity: popIn ? [0, 1] : [1, 0],
    scale: popIn ? [0.8, 1] : [1, 0.8],
    duration: popIn ? 400 : 250,
    easing: popIn ? easingPresets.snappy : easingPresets.exit,
    ...options
  });
}

/**
 * Expand animation (height + opacity)
 * @param {HTMLElement|string} target - Element or selector
 * @param {boolean} expand - True to expand, false to collapse
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function expand(target, expand = true, options = {}) {
  const element = typeof target === 'string' 
    ? document.querySelector(target) 
    : target;
    
  const startHeight = expand ? 0 : element?.scrollHeight || 'auto';
  const endHeight = expand ? (element?.scrollHeight || 'auto') : 0;

  return animate(element, {
    
    height: [startHeight, endHeight],
    opacity: expand ? [0, 1] : [1, 0],
    duration: 350,
    easing: 'easeInOutQuad',
    ...options
  });
}

/**
 * Flip animation (rotate on axis)
 * @param {HTMLElement|string} target - Element or selector
 * @param {string} axis - 'x' or 'y'
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function flip(target, axis = 'y', options = {}) {
  const rotation = axis === 'x' ? { rotateX: [0, 360] } : { rotateY: [0, 360] };
  
  return animate(
    
    ...rotation,
    duration: 600,
    easing: 'easeInOutQuad',
    ...options
  });
}

/**
 * Shake animation (attention grabber)
 * @param {HTMLElement|string} target - Element or selector
 * @param {number} intensity - Shake intensity (px)
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function shake(target, intensity = 10, options = {}) {
  return animate(element, {
    
    translateX: [
      { value: intensity, duration: 100 },
      { value: -intensity, duration: 100 },
      { value: intensity / 2, duration: 100 },
      { value: -intensity / 2, duration: 100 },
      { value: 0, duration: 100 }
    ],
    easing: 'easeInOutQuad',
    ...options
  });
}

/**
 * Bounce animation
 * @param {HTMLElement|string} target - Element or selector
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function bounce(target, options = {}) {
  return animate(element, {
    
    translateY: [
      { value: -30, duration: 300, easing: 'easeOutQuad' },
      { value: 0, duration: 300, easing: 'easeInQuad' },
      { value: -15, duration: 200, easing: 'easeOutQuad' },
      { value: 0, duration: 200, easing: 'easeInQuad' }
    ],
    ...options
  });
}

/**
 * Pulse animation (scale variation)
 * @param {HTMLElement|string} target - Element or selector
 * @param {number} scale - Maximum scale value
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function pulse(target, scale = 1.05, options = {}) {
  return animate(element, {
    
    scale: [1, scale, 1],
    duration: 600,
    easing: 'easeInOutQuad',
    loop: options.loop || 1,
    ...options
  });
}

/**
 * Glow animation (box shadow pulse)
 * @param {HTMLElement|string} target - Element or selector
 * @param {string} color - Glow color
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function glow(target, color = 'rgba(0, 119, 204, 0.5)', options = {}) {
  return animate(element, {
    
    boxShadow: [
      `0 0 0 0 ${color}`,
      `0 0 20px 10px ${color}`,
      `0 0 0 0 ${color}`
    ],
    duration: 1000,
    easing: 'easeInOutQuad',
    loop: options.loop || 1,
    ...options
  });
}

/**
 * Morph animation (shape change using clip-path)
 * @param {HTMLElement|string} target - Element or selector
 * @param {string} fromShape - Starting clip-path
 * @param {string} toShape - Ending clip-path
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function morph(target, fromShape, toShape, options = {}) {
  return animate(element, {
    
    clipPath: [fromShape, toShape],
    duration: 800,
    easing: easingPresets.smooth,
    ...options
  });
}

/**
 * Typewriter effect (reveal text character by character)
 * @param {HTMLElement} target - Text element
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function typewriter(target, options = {}) {
  const element = typeof target === 'string'
    ? document.querySelector(target)
    : target;
    
  if (!element) return null;

  const text = element.textContent;
  element.textContent = '';
  element.style.opacity = '1';

  const textArray = text.split('');
  
  return animate(element, {
    
    duration: textArray.length * 50,
    easing: 'linear',
    update: (anim) => {
      const progress = anim.progress / 100;
      const currentLength = Math.floor(textArray.length * progress);
      element.textContent = textArray.slice(0, currentLength).join('');
    },
    ...options
  });
}

/**
 * Highlight flash animation
 * @param {HTMLElement|string} target - Element or selector
 * @param {string} color - Highlight color
 * @param {Object} options - Additional options
 * @returns {Object} Animation instance
 */
export function highlightFlash(target, color = '#ffeb3b', options = {}) {
  return animate(element, {
    
    backgroundColor: [color, 'transparent'],
    duration: 800,
    easing: 'easeOutQuad',
    ...options
  });
}
