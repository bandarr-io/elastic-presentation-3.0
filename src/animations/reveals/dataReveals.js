import { animate, stagger, setDashoffset } from 'animejs';
import { easingPresets, getDataRevealEasing } from '../utils/easing';
import { getGridStagger, getListStagger } from '../utils/stagger';
import { createTimeline } from '../utils/timeline';

/**
 * Data visualization reveal animations
 * Specialized animations for charts, stats, and data displays
 */

/**
 * Counter animation (animated number counting up)
 * @param {HTMLElement} element - Element containing number
 * @param {number} from - Starting value
 * @param {number} to - Ending value
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function counterReveal(element, from = 0, to = 100, options = {}) {
  const {
    duration = 1500,
    decimals = 0,
    prefix = '',
    suffix = '',
    easing = 'easeOutCubic'
  } = options;

  const obj = { value: from };

  return animate(obj, {
    value: to,
    duration: duration,
    easing: easing,
    update: () => {
      const value = obj.value.toFixed(decimals);
      element.textContent = `${prefix}${value}${suffix}`;
    },
    ...options
  });
}

/**
 * Progress bar reveal (animated fill)
 * @param {HTMLElement} element - Progress bar element
 * @param {number} targetPercent - Target percentage (0-100)
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function progressBarReveal(element, targetPercent = 100, options = {}) {
  const {
    duration = 1200,
    easing = 'easeOutCubic',
    direction = 'horizontal'
  } = options;

  const property = direction === 'horizontal' ? 'width' : 'height';

  return animate(element, {
    [property]: `${targetPercent}%`,
    duration: duration,
    easing: easing,
    ...options
  });
}

/**
 * Staggered grid reveal (data cards/items)
 * @param {Array|string} targets - Elements or selector
 * @param {Array} gridSize - [cols, rows]
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function gridDataReveal(targets, gridSize = [3, 3], options = {}) {
  const {
    duration = 600,
    from = 'center',
    animateFrom = 'bottom'
  } = options;

  const translate = animateFrom === 'bottom'
    ? { translateY: [40, 0] }
    : animateFrom === 'top'
    ? { translateY: [-40, 0] }
    : animateFrom === 'left'
    ? { translateX: [-40, 0] }
    : { translateX: [40, 0] };

  return animate(targets, {
    opacity: [0, 1],
    ...translate,
    scale: [0.9, 1],
    duration: duration,
    delay: getGridStagger(gridSize, from, 'medium'),
    easing: getDataRevealEasing(false),
    ...options
  });
}

/**
 * List reveal with stagger
 * @param {Array|string} targets - List items
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function listDataReveal(targets, options = {}) {
  const {
    duration = 500,
    speed = 'medium'
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  return animate(elements, {
    opacity: [0, 1],
    translateX: [-30, 0],
    duration: duration,
    delay: getListStagger(elements.length, speed),
    easing: easingPresets.entrance,
    ...options
  });
}

/**
 * Chart/graph draw animation (SVG paths)
 * @param {SVGElement} pathElement - SVG path element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function chartDrawReveal(pathElement, options = {}) {
  const {
    duration = 2000,
    easing = 'easeInOutQuad',
    direction = 'forward'
  } = options;

  // Get path length
  const pathLength = pathElement.getTotalLength();

  // Set initial state
  pathElement.style.strokeDasharray = pathLength;
  pathElement.style.strokeDashoffset = direction === 'forward' ? pathLength : -pathLength;

  return animate(pathElement, {
    strokeDashoffset: 0,
    duration: duration,
    easing: easing,
    ...options
  });
}

/**
 * Pie chart segment reveal (animated arc drawing)
 * @param {Array|string} segments - Pie chart segments
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function pieChartReveal(segments, options = {}) {
  const {
    duration = 1500,
    stagger = 200
  } = options;

  return animate(segments, {
    strokeDashoffset: [anime.setDashoffset, 0],
    opacity: [0, 1],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: 'easeOutCubic',
    ...options
  });
}

/**
 * Data table reveal (rows appear sequentially)
 * @param {Array|string} rows - Table rows
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function tableReveal(rows, options = {}) {
  const {
    duration = 400,
    stagger = 60
  } = options;

  return animate(rows, {
    opacity: [0, 1],
    translateX: [-20, 0],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: 'easeOutQuad',
    ...options
  });
}

/**
 * Stats grid reveal (numbers + descriptions)
 * @param {Array} statElements - Array of stat element objects
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with coordinated reveal
 */
export function statsGridReveal(statElements, options = {}) {
  const {
    duration = 600,
    counterDuration = 1500,
    stagger = 100
  } = options;

  const timeline = createTimeline({ autoplay: false });

  statElements.forEach((stat, index) => {
    const delay = index * stagger;

    // Reveal container
    timeline.add({
      targets: stat.container,
      opacity: [0, 1],
      scale: [0.9, 1],
      translateY: [20, 0],
      duration: duration,
      easing: easingPresets.entrance
    }, delay);

    // Animate counter if present
    if (stat.counter && stat.value) {
      const counterObj = { value: 0 };
      timeline.add({
        targets: counterObj,
        value: stat.value,
        duration: counterDuration,
        easing: 'easeOutCubic',
        update: () => {
          stat.counter.textContent = Math.round(counterObj.value);
        }
      }, delay + 100);
    }
  });

  return timeline;
}

/**
 * Cascade reveal (waterfall effect for data)
 * @param {Array|string} targets - Data elements
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function cascadeReveal(targets, options = {}) {
  const {
    duration = 500,
    stagger = 80,
    direction = 'down'
  } = options;

  const transform = direction === 'down'
    ? { translateY: [-30, 0] }
    : direction === 'up'
    ? { translateY: [30, 0] }
    : direction === 'left'
    ? { translateX: [30, 0] }
    : { translateX: [-30, 0] };

  return animate(targets, {
    opacity: [0, 1],
    ...transform,
    duration: duration,
    delay: anime.stagger(stagger),
    easing: 'easeOutCubic',
    ...options
  });
}

/**
 * Radial burst reveal (data points emerge from center)
 * @param {Array|string} targets - Data elements
 * @param {Object} centerPoint - { x, y } center coordinates
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with radial reveal
 */
export function radialBurstReveal(targets, centerPoint, options = {}) {
  const {
    duration = 800,
    stagger = 50
  } = options;

  const elements = typeof targets === 'string'
    ? document.querySelectorAll(targets)
    : targets;

  const timeline = createTimeline({ autoplay: false });

  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const elementCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    // Calculate direction from center
    const dx = elementCenter.x - centerPoint.x;
    const dy = elementCenter.y - centerPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const fromX = centerPoint.x + Math.cos(angle) * 20;
    const fromY = centerPoint.y + Math.sin(angle) * 20;

    timeline.add({
      
      opacity: [0, 1],
      scale: [0.5, 1],
      translateX: [fromX - elementCenter.x, 0],
      translateY: [fromY - elementCenter.y, 0],
      duration: duration,
      easing: 'easeOutCubic'
    }, index * stagger);
  });

  return timeline;
}

/**
 * Highlight reveal (flash attention to data point)
 * @param {HTMLElement} element - Element to highlight
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with highlight effect
 */
export function highlightDataReveal(element, options = {}) {
  const {
    color = '#ffeb3b',
    pulseCount = 2
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Initial reveal
  timeline.add({
    
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 400,
    easing: easingPresets.entrance
  });

  // Pulse highlight
  for (let i = 0; i < pulseCount; i++) {
    timeline.add({
      
      backgroundColor: [color, 'transparent'],
      scale: [1, 1.05, 1],
      duration: 600,
      easing: 'easeInOutQuad'
    }, `-=${i === 0 ? 0 : 400}`);
  }

  return timeline;
}
