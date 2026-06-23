import { animate, stagger, random } from 'animejs';
import { createTimeline } from '../utils/timeline';
import { easingPresets } from '../utils/easing';

/**
 * Cross-scene effects that carry elements or themes between scenes
 * Creates visual continuity and narrative flow
 */

/**
 * Particle carry-over effect (particles float from one scene to next)
 * @param {HTMLElement} fromScene - Origin scene
 * @param {HTMLElement} toScene - Destination scene
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with particle effect
 */
export function particleCarryOver(fromScene, toScene, options = {}) {
  const {
    particleCount = 20,
    duration = 1000,
    color = '#00bfb3'
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Create particle container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  // Create particles
  const particles = Array.from({ length: particleCount }, () => {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = color;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    container.appendChild(particle);
    return particle;
  });

  // Animate particles
  timeline.add({
    targets: particles,
    translateX: () => anime.random(-200, 200),
    translateY: () => anime.random(-200, 200),
    scale: [1, 0],
    opacity: [1, 0],
    duration: duration,
    delay: anime.stagger(50),
    easing: 'easeOutCubic',
    onComplete: () => {
      container.remove();
    }
  });

  return timeline;
}

/**
 * Color wave transition (color spreads across scene)
 * @param {HTMLElement} element - Element to apply effect
 * @param {string} fromColor - Starting color
 * @param {string} toColor - Ending color
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function colorWave(element, fromColor, toColor, options = {}) {
  const {
    duration = 800,
    direction = 'horizontal'
  } = options;

  // Create gradient overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1';
  
  const gradient = direction === 'horizontal'
    ? `linear-gradient(90deg, ${fromColor} 0%, ${toColor} 100%)`
    : `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`;
    
  overlay.style.background = gradient;
  element.appendChild(overlay);

  return animate(element, { overlay,
    opacity: [0, 1, 0],
    duration: duration,
    easing: 'easeInOutQuad',
    onComplete: () => {
      overlay.remove();
    }
  });
}

/**
 * Data trail effect (numbers/text flow between scenes)
 * @param {HTMLElement} fromElement - Source element
 * @param {HTMLElement} toElement - Destination element
 * @param {Array} dataPoints - Array of text/numbers to animate
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with data trail
 */
export function dataTrail(fromElement, toElement, dataPoints = [], options = {}) {
  const {
    duration = 1200,
    stagger = 80
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Get positions
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  // Create data elements
  const elements = dataPoints.map((text) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.left = `${fromRect.left + fromRect.width / 2}px`;
    el.style.top = `${fromRect.top + fromRect.height / 2}px`;
    el.style.fontSize = '14px';
    el.style.fontWeight = 'bold';
    el.style.color = '#00bfb3';
    el.style.opacity = '0';
    container.appendChild(el);
    return el;
  });

  // Animate trail
  timeline.add({
    targets: elements,
    left: toRect.left + toRect.width / 2,
    top: toRect.top + toRect.height / 2,
    opacity: [0, 1, 0],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: easingPresets.smooth,
    onComplete: () => {
      container.remove();
    }
  });

  return timeline;
}

/**
 * Spotlight transition (focus travels between elements)
 * @param {HTMLElement} fromElement - Element to start spotlight
 * @param {HTMLElement} toElement - Element to end spotlight
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with spotlight effect
 */
export function spotlightTransition(fromElement, toElement, options = {}) {
  const {
    duration = 1000,
    spotlightSize = 200
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Create spotlight overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9998';
  document.body.appendChild(overlay);

  // Get positions
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;

  // Animate radial gradient position
  const animatedValues = { x: fromX, y: fromY };
  
  timeline.add({
    targets: animatedValues,
    x: toX,
    y: toY,
    duration: duration,
    easing: easingPresets.smooth,
    update: () => {
      overlay.style.background = 
        `radial-gradient(circle ${spotlightSize}px at ${animatedValues.x}px ${animatedValues.y}px, transparent, rgba(0, 0, 0, 0.8))`;
    },
    onComplete: () => {
      overlay.remove();
    }
  });

  return timeline;
}

/**
 * Ripple effect spreading from one element to another
 * @param {HTMLElement} fromElement - Origin element
 * @param {HTMLElement} toElement - Destination element
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with ripple effect
 */
export function rippleConnect(fromElement, toElement, options = {}) {
  const {
    duration = 800,
    color = '#00bfb3',
    rippleCount = 3
  } = options;

  const timeline = createTimeline({ autoplay: false });

  const fromRect = fromElement.getBoundingClientRect();
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  // Create ripples
  const ripples = Array.from({ length: rippleCount }, (_, i) => {
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${fromRect.left + fromRect.width / 2}px`;
    ripple.style.top = `${fromRect.top + fromRect.height / 2}px`;
    ripple.style.width = '10px';
    ripple.style.height = '10px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = `2px solid ${color}`;
    ripple.style.transform = 'translate(-50%, -50%)';
    container.appendChild(ripple);
    return ripple;
  });

  // Animate ripples
  timeline.add({
    targets: ripples,
    width: 300,
    height: 300,
    opacity: [0.8, 0],
    duration: duration,
    delay: anime.stagger(duration / rippleCount),
    easing: 'easeOutQuad',
    onComplete: () => {
      container.remove();
    }
  });

  return timeline;
}

/**
 * Theme morph (gradually change theme colors across transition)
 * @param {Object} fromTheme - Starting theme colors
 * @param {Object} toTheme - Ending theme colors
 * @param {Array} elements - Elements to apply theme to
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function themeMorph(fromTheme, toTheme, elements = [], options = {}) {
  const {
    duration = 600
  } = options;

  const animations = elements.map(({ element, property }) => {
    return animate(element, {
      
      [property]: [fromTheme[property], toTheme[property]],
      duration: duration,
      easing: easingPresets.smooth
    });
  });

  return Promise.all(animations.map(anim => anim.then(() => {})));
}

/**
 * Depth shift (Z-axis movement creating layered transition)
 * @param {HTMLElement} fromScene - Scene moving back
 * @param {HTMLElement} toScene - Scene moving forward
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with depth shift
 */
export function depthShift(fromScene, toScene, options = {}) {
  const {
    duration = 800
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Move current scene back
  timeline.add({
    targets: fromScene,
    translateZ: [0, -200],
    scale: [1, 0.9],
    opacity: [1, 0],
    duration: duration,
    easing: easingPresets.smooth
  });

  // Bring new scene forward
  timeline.add({
    targets: toScene,
    translateZ: [200, 0],
    scale: [1.1, 1],
    opacity: [0, 1],
    duration: duration,
    easing: easingPresets.smooth
  }, `-=${duration * 0.5}`); // Overlap by 50%

  return timeline;
}
