import { animate, stagger, random } from 'animejs';
import { easingPresets } from '../utils/easing';
import { getTextStagger } from '../utils/stagger';
import { createTimeline } from '../utils/timeline';

/**
 * Text reveal animations for headings, paragraphs, and typography
 * Cinematic text entrance effects
 */

/**
 * Fade-up reveal (simple, elegant)
 * @param {HTMLElement|string} target - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function fadeUpReveal(target, options = {}) {
  const {
    duration = 600,
    distance = 30,
    easing = easingPresets.entrance
  } = options;

  return animate(element, {
    
    opacity: [0, 1],
    translateY: [distance, 0],
    duration: duration,
    easing: easing,
    ...options
  });
}

/**
 * Character-by-character reveal (typing effect)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function characterReveal(element, options = {}) {
  const {
    speed = 'fast',
    cursor = false
  } = options;

  const text = element.textContent;
  element.innerHTML = '';

  // Split into characters and wrap each
  const chars = text.split('').map(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.opacity = '0';
    element.appendChild(span);
    return span;
  });

  // Add cursor if requested
  if (cursor) {
    const cursorEl = document.createElement('span');
    cursorEl.textContent = '|';
    cursorEl.className = 'typing-cursor';
    element.appendChild(cursorEl);
  }

  return animate(element, { chars,
    opacity: [0, 1],
    duration: 50,
    delay: getTextStagger(speed),
    easing: 'linear',
    ...options
  });
}

/**
 * Word-by-word reveal (staggered words)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function wordReveal(element, options = {}) {
  const {
    speed = 'medium',
    direction = 'up'
  } = options;

  const text = element.textContent;
  element.innerHTML = '';

  // Split into words and wrap each
  const words = text.split(' ').map(word => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    span.style.marginRight = '0.25em';
    element.appendChild(span);
    return span;
  });

  const distance = 20;
  const transform = direction === 'up'
    ? { translateY: [distance, 0] }
    : direction === 'down'
    ? { translateY: [-distance, 0] }
    : direction === 'left'
    ? { translateX: [distance, 0] }
    : { translateX: [-distance, 0] };

  const stagger = speed === 'fast' ? 40 : speed === 'slow' ? 120 : 80;

  return animate(element, { words,
    opacity: [0, 1],
    ...transform,
    duration: 400,
    delay: anime.stagger(stagger),
    easing: easingPresets.entrance,
    ...options
  });
}

/**
 * Line-by-line reveal (paragraph animation)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function lineReveal(element, options = {}) {
  const {
    stagger = 100,
    duration = 500
  } = options;

  // Split text into lines (basic approach)
  const text = element.innerHTML;
  const lines = text.split('<br>').filter(line => line.trim());
  element.innerHTML = '';

  const lineElements = lines.map(line => {
    const div = document.createElement('div');
    div.innerHTML = line;
    div.style.opacity = '0';
    element.appendChild(div);
    return div;
  });

  return animate(element, { lineElements,
    opacity: [0, 1],
    translateX: [-20, 0],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: easingPresets.entrance,
    ...options
  });
}

/**
 * Split reveal (text splits and reveals from center)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with split effect
 */
export function splitReveal(element, options = {}) {
  const {
    duration = 800
  } = options;

  const text = element.textContent;
  const midpoint = Math.floor(text.length / 2);
  
  element.innerHTML = '';

  // First half
  const leftSpan = document.createElement('span');
  leftSpan.textContent = text.slice(0, midpoint);
  leftSpan.style.display = 'inline-block';
  leftSpan.style.opacity = '0';
  
  // Second half
  const rightSpan = document.createElement('span');
  rightSpan.textContent = text.slice(midpoint);
  rightSpan.style.display = 'inline-block';
  rightSpan.style.opacity = '0';

  element.appendChild(leftSpan);
  element.appendChild(rightSpan);

  const timeline = createTimeline({ autoplay: false });

  timeline.add({
    targets: leftSpan,
    opacity: [0, 1],
    translateX: [-30, 0],
    duration: duration,
    easing: easingPresets.entrance
  });

  timeline.add({
    targets: rightSpan,
    opacity: [0, 1],
    translateX: [30, 0],
    duration: duration,
    easing: easingPresets.entrance
  }, `-=${duration}`);

  return timeline;
}

/**
 * Blur focus reveal (text comes into focus)
 * @param {HTMLElement|string} target - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function blurFocusReveal(target, options = {}) {
  const {
    duration = 800,
    blurAmount = 20
  } = options;

  return animate(element, {
    
    opacity: [0, 1],
    filter: [`blur(${blurAmount}px)`, 'blur(0px)'],
    duration: duration,
    easing: easingPresets.smooth,
    ...options
  });
}

/**
 * Glitch reveal (digital glitch effect)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with glitch effect
 */
export function glitchReveal(element, options = {}) {
  const {
    glitchCount = 5,
    duration = 100
  } = options;

  const timeline = createTimeline({ autoplay: false });
  const originalText = element.textContent;

  // Random glitch characters
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  for (let i = 0; i < glitchCount; i++) {
    timeline.add({
      duration: duration,
      begin: () => {
        // Randomize some characters
        element.textContent = originalText
          .split('')
          .map(char => Math.random() > 0.7 
            ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
            : char
          )
          .join('');
      }
    });
  }

  // Restore original text
  timeline.add({
    duration: 200,
    begin: () => {
      element.textContent = originalText;
    }
  });

  // Final fade in
  timeline.add({
    
    opacity: [0.3, 1],
    duration: 300,
    easing: 'easeOutQuad'
  }, `-=200`);

  return timeline;
}

/**
 * Scale bounce reveal (text pops in)
 * @param {HTMLElement|string} target - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function scaleBounceReveal(target, options = {}) {
  const {
    duration = 600
  } = options;

  return animate(element, {
    
    opacity: [0, 1],
    scale: [0.7, 1],
    duration: duration,
    easing: easingPresets.bounce,
    ...options
  });
}

/**
 * Slide clip reveal (text slides in with clip-path)
 * @param {HTMLElement|string} target - Text element
 * @param {string} direction - 'left', 'right', 'up', 'down'
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function slideClipReveal(target, direction = 'left', options = {}) {
  const {
    duration = 800
  } = options;

  const clipPaths = {
    left: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
    right: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
    up: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
    down: ['inset(0 0 100% 0)', 'inset(0 0 0 0)']
  };

  return animate(element, {
    
    clipPath: clipPaths[direction],
    duration: duration,
    easing: easingPresets.dramatic,
    ...options
  });
}

/**
 * Underline reveal (animated underline appearing)
 * @param {HTMLElement} element - Text element
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with underline effect
 */
export function underlineReveal(element, options = {}) {
  const {
    color = '#00bfb3',
    thickness = 2,
    duration = 600
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Create underline element
  const underline = document.createElement('div');
  underline.style.position = 'absolute';
  underline.style.bottom = '0';
  underline.style.left = '0';
  underline.style.width = '0';
  underline.style.height = `${thickness}px`;
  underline.style.backgroundColor = color;

  // Make element relative
  element.style.position = 'relative';
  element.appendChild(underline);

  // Fade in text
  timeline.add({
    
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 400,
    easing: easingPresets.entrance
  });

  // Animate underline
  timeline.add({
    targets: underline,
    width: '100%',
    duration: duration,
    easing: 'easeOutCubic'
  }, '-=200');

  return timeline;
}

/**
 * Multi-line stagger reveal (complex paragraph animation)
 * @param {HTMLElement} element - Text container
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with multi-line reveal
 */
export function multiLineStaggerReveal(element, options = {}) {
  const {
    linesDelay = 100,
    wordsDelay = 30
  } = options;

  const timeline = createTimeline({ autoplay: false });
  const lines = element.querySelectorAll('p, div, span');

  lines.forEach((line, lineIndex) => {
    const text = line.textContent;
    line.innerHTML = '';

    // Split into words
    const words = text.split(' ').map(word => {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.marginRight = '0.25em';
      line.appendChild(span);
      return span;
    });

    timeline.add({
      targets: words,
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 400,
      delay: anime.stagger(wordsDelay),
      easing: easingPresets.entrance
    }, lineIndex * linesDelay);
  });

  return timeline;
}
