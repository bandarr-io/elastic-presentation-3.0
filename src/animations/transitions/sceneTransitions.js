import { animate } from 'animejs';
import { easingPresets, getSceneEasing } from '../utils/easing';

/**
 * Scene transition animations for navigation between slides
 * Provides cinematic enter/exit effects
 */

/**
 * Fade transition (default, smooth)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function fadeTransition(element, direction = 'enter', options = {}) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  
  return animate(element, {
    opacity: isEnter ? [0, 1] : [1, 0],
    duration: isEnter ? 500 : 300,
    easing: getSceneEasing(direction),
    ...options
  });
}

/**
 * Slide transition (directional movement)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {string} slideDirection - 'up', 'down', 'left', 'right'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function slideTransition(
  element, 
  direction = 'enter', 
  slideDirection = 'up',
  options = {}
) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const distance = 50;

  // Determine translate values based on slide direction
  const getTranslate = () => {
    switch (slideDirection) {
      case 'up':
        return { translateY: isEnter ? [distance, 0] : [0, -distance] };
      case 'down':
        return { translateY: isEnter ? [-distance, 0] : [0, distance] };
      case 'left':
        return { translateX: isEnter ? [distance, 0] : [0, -distance] };
      case 'right':
        return { translateX: isEnter ? [-distance, 0] : [0, distance] };
      default:
        return { translateY: isEnter ? [distance, 0] : [0, -distance] };
    }
  };

  const animConfig = {
    
    opacity: isEnter ? [0, 1] : [1, 0],
    ...getTranslate(),
    duration: isEnter ? 600 : 350,
    easing: getSceneEasing(direction),
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Scale transition (zoom in/out)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function scaleTransition(element, direction = 'enter', options = {}) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const animConfig = {
    
    opacity: isEnter ? [0, 1] : [1, 0],
    scale: isEnter ? [0.95, 1] : [1, 0.95],
    duration: isEnter ? 500 : 300,
    easing: isEnter ? easingPresets.entrance : easingPresets.exit,
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Cinematic wipe transition (dramatic reveal)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {string} wipeDirection - 'horizontal' or 'vertical'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function wipeTransition(
  element,
  direction = 'enter',
  wipeDirection = 'horizontal',
  options = {}
) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const clipPath = wipeDirection === 'horizontal'
    ? {
        clipPath: isEnter
          ? ['inset(0 100% 0 0)', 'inset(0 0 0 0)']
          : ['inset(0 0 0 0)', 'inset(0 0 0 100%)']
      }
    : {
        clipPath: isEnter
          ? ['inset(100% 0 0 0)', 'inset(0 0 0 0)']
          : ['inset(0 0 0 0)', 'inset(0 0 100% 0)']
      };

  const animConfig = {
    
    ...clipPath,
    duration: isEnter ? 800 : 500,
    easing: easingPresets.dramatic,
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Depth transition (parallax layers)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function depthTransition(element, direction = 'enter', options = {}) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const animConfig = {
    
    opacity: isEnter ? [0, 1] : [1, 0],
    translateZ: isEnter ? [100, 0] : [0, 100],
    scale: isEnter ? [0.9, 1] : [1, 0.9],
    duration: isEnter ? 700 : 400,
    easing: getSceneEasing(direction),
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Rotate transition (3D flip effect)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {string} axis - 'x', 'y', or 'z'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function rotateTransition(
  element,
  direction = 'enter',
  axis = 'y',
  options = {}
) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const degrees = 90;
  
  const rotation = {
    x: { rotateX: isEnter ? [degrees, 0] : [0, degrees] },
    y: { rotateY: isEnter ? [degrees, 0] : [0, degrees] },
    z: { rotateZ: isEnter ? [degrees, 0] : [0, degrees] }
  };

  const animConfig = {
    
    opacity: isEnter ? [0, 1] : [1, 0],
    ...rotation[axis],
    duration: isEnter ? 800 : 500,
    easing: easingPresets.dramatic,
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Blur transition (focus/defocus)
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'enter' or 'exit'
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export function blurTransition(element, direction = 'enter', options = {}) {
  if (!element) return Promise.resolve();

  const isEnter = direction === 'enter';
  const animConfig = {
    
    opacity: isEnter ? [0, 1] : [1, 0],
    filter: isEnter
      ? ['blur(20px)', 'blur(0px)']
      : ['blur(0px)', 'blur(20px)'],
    duration: isEnter ? 600 : 400,
    easing: getSceneEasing(direction),
    ...options
  };

  return animate(element, animConfig);
}

/**
 * Coordinated scene change (exit current, enter next)
 * @param {HTMLElement} exitElement - Element to exit
 * @param {HTMLElement} enterElement - Element to enter
 * @param {string} transitionType - Type of transition
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export async function coordinatedSceneTransition(
  exitElement,
  enterElement,
  transitionType = 'fade',
  options = {}
) {
  const transitions = {
    fade: fadeTransition,
    slide: slideTransition,
    scale: scaleTransition,
    wipe: wipeTransition,
    depth: depthTransition,
    rotate: rotateTransition,
    blur: blurTransition
  };

  const transitionFn = transitions[transitionType] || fadeTransition;

  // Exit current scene
  if (exitElement) {
    await transitionFn(exitElement, 'exit', options);
  }

  // Small gap for clarity
  await new Promise(resolve => setTimeout(resolve, 50));

  // Enter next scene
  if (enterElement) {
    await transitionFn(enterElement, 'enter', options);
  }
}

/**
 * Crossfade transition (parallel exit/enter)
 * @param {HTMLElement} exitElement - Element to exit
 * @param {HTMLElement} enterElement - Element to enter
 * @param {Object} options - Additional options
 * @returns {Promise} Animation promise
 */
export async function crossfadeTransition(exitElement, enterElement, options = {}) {
  const animations = [];

  if (exitElement) {
    animations.push(fadeTransition(exitElement, 'exit', options));
  }

  if (enterElement) {
    animations.push(fadeTransition(enterElement, 'enter', options));
  }

  return Promise.all(animations);
}
