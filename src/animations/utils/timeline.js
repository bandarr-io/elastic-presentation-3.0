import { createTimeline as animeCreateTimeline, animate, stagger } from 'animejs';

/**
 * Timeline utility functions for complex animation sequences
 * Provides helpers for creating and managing animation timelines
 */

/**
 * Create a new timeline with default configuration
 * @param {Object} config - Timeline configuration
 * @returns {Object} Anime.js timeline instance
 */
export function createTimeline(config = {}) {
  const defaultConfig = {
    autoplay: true,
    easing: 'easeOutCubic',
    duration: 500
  };

  return animeCreateTimeline({
    ...defaultConfig,
    ...config
  });
}

/**
 * Create a timeline for scene entrance
 * @param {Object} config - Additional configuration
 * @returns {Object} Configured timeline
 */
export function createEntranceTimeline(config = {}) {
  return createTimeline({
    easing: 'cubicBezier(0.16, 1, 0.3, 1)',
    ...config
  });
}

/**
 * Create a timeline for scene exit
 * @param {Object} config - Additional configuration
 * @returns {Object} Configured timeline
 */
export function createExitTimeline(config = {}) {
  return createTimeline({
    easing: 'cubicBezier(0.7, 0, 0.84, 0)',
    duration: 300,
    ...config
  });
}

/**
 * Create a looping timeline for background animations
 * @param {Object} config - Additional configuration
 * @returns {Object} Configured timeline with loop
 */
export function createLoopingTimeline(config = {}) {
  return createTimeline({
    loop: true,
    direction: 'alternate',
    ...config
  });
}

/**
 * Add animation to timeline at specific position
 * @param {Object} timeline - Anime timeline instance
 * @param {Object} animation - Animation configuration
 * @param {string|number} position - Position offset ('-=500', '+=200', or absolute ms)
 * @returns {Object} Timeline for chaining
 */
export function addAtPosition(timeline, animation, position) {
  return timeline.add(animation, position);
}

/**
 * Add parallel animations to timeline
 * @param {Object} timeline - Anime timeline instance
 * @param {Array} animations - Array of animation configurations
 * @param {string|number} position - Start position for all animations
 * @returns {Object} Timeline for chaining
 */
export function addParallel(timeline, animations, position = '-=500') {
  animations.forEach(animation => {
    timeline.add(animation, position);
  });
  return timeline;
}

/**
 * Create coordinated reveal sequence
 * @param {Array} elements - Array of DOM elements or selectors
 * @param {Object} config - Base animation config
 * @param {number} stagger - Stagger delay between elements (ms)
 * @returns {Object} Timeline with reveal sequence
 */
export function createRevealSequence(elements, config = {}, stagger = 100) {
  const timeline = createEntranceTimeline();
  
  const baseConfig = {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 500,
    ...config
  };

  elements.forEach((element, index) => {
    const delay = index * stagger;
    timeline.add({
      
      ...baseConfig
    }, delay);
  });

  return timeline;
}

/**
 * Create multi-layer parallax timeline
 * @param {Array} layers - Array of { element, speed } objects
 * @param {number} scrollDistance - Total scroll distance
 * @returns {Object} Timeline for parallax effect
 */
export function createParallaxTimeline(layers, scrollDistance = 1000) {
  const timeline = createTimeline({ autoplay: false });

  layers.forEach(({ element, speed = 1 }) => {
    timeline.add({
      
      translateY: [0, -scrollDistance * speed],
      duration: scrollDistance,
      easing: 'linear'
    }, 0); // All start at same time
  });

  return timeline;
}

/**
 * Create staggered exit sequence
 * @param {Array} elements - Elements to animate out
 * @param {Object} config - Base animation config
 * @param {number} stagger - Stagger delay (ms)
 * @returns {Object} Timeline with exit sequence
 */
export function createExitSequence(elements, config = {}, stagger = 50) {
  const timeline = createExitTimeline();
  
  const baseConfig = {
    opacity: [1, 0],
    translateY: [0, -20],
    duration: 300,
    ...config
  };

  elements.forEach((element, index) => {
    const delay = index * stagger;
    timeline.add({
      
      ...baseConfig
    }, delay);
  });

  return timeline;
}

/**
 * Create attention-grabbing pulse sequence
 * @param {string|HTMLElement} element - Element to pulse
 * @param {number} pulseCount - Number of pulses
 * @returns {Object} Timeline with pulse animation
 */
export function createPulseSequence(element, pulseCount = 3) {
  const timeline = createTimeline({ loop: pulseCount });
  
  timeline.add({
    
    scale: [1, 1.05, 1],
    duration: 600,
    easing: 'easeInOutQuad'
  });

  return timeline;
}

/**
 * Create complex multi-stage reveal
 * @param {Object} config - Stage configurations
 * @returns {Object} Timeline with multi-stage reveal
 */
export function createMultiStageReveal({
  background,
  title,
  content,
  actions
}) {
  const timeline = createEntranceTimeline({ autoplay: false });

  // Stage 1: Background fade in
  if (background) {
    timeline.add({
      targets: background,
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad'
    });
  }

  // Stage 2: Title reveal (overlapping with background)
  if (title) {
    timeline.add({
      targets: title,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 600,
      easing: 'cubicBezier(0.16, 1, 0.3, 1)'
    }, '-=200');
  }

  // Stage 3: Content reveal (staggered)
  if (content) {
      timeline.add({
        targets: content,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        delay: stagger(80),
        easing: 'easeOutCubic'
      }, '-=300');
  }

  // Stage 4: Action buttons (final)
  if (actions) {
    timeline.add({
      targets: actions,
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 400,
      easing: 'easeOutBack'
    }, '-=200');
  }

  return timeline;
}

/**
 * Utility to pause timeline and wait for user interaction
 * @param {Object} timeline - Timeline to pause
 * @param {string|HTMLElement} trigger - Element that resumes timeline
 */
export function pauseForInteraction(timeline, trigger) {
  timeline.pause();
  
  const element = typeof trigger === 'string' 
    ? document.querySelector(trigger) 
    : trigger;
    
  if (element) {
    const handler = () => {
      timeline.play();
      element.removeEventListener('click', handler);
    };
    element.addEventListener('click', handler);
  }
}
