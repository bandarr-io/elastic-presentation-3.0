import { animate } from 'animejs';
import { easingPresets, getInteractionEasing } from '../utils/easing';

/**
 * Focus interaction effects for form elements and accessibility
 * Provides visual feedback for keyboard navigation and form focus
 */

/**
 * Glow focus (border glow on focus)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function glowFocus(element, isFocused = true, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.6)',
    duration = 250
  } = options;

  const shadow = isFocused
    ? `0 0 0 3px ${color}`
    : '0 0 0 0 rgba(0, 0, 0, 0)';

  return animate(element, {
    boxShadow: shadow,
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Scale focus (slight scale up on focus)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function scaleFocus(element, isFocused = true, options = {}) {
  const {
    scale = 1.02,
    duration = 200
  } = options;

  return animate(element, {
    scale: isFocused ? scale : 1,
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Underline focus (animated underline)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function underlineFocus(element, isFocused = true, options = {}) {
  const {
    color = '#00bfb3',
    thickness = 2,
    duration = 250
  } = options;

  // Get or create underline element
  let underline = element.querySelector('.focus-underline');
  
  if (!underline) {
    underline = document.createElement('div');
    underline.className = 'focus-underline';
    underline.style.position = 'absolute';
    underline.style.bottom = '0';
    underline.style.left = '0';
    underline.style.width = '0';
    underline.style.height = `${thickness}px`;
    underline.style.backgroundColor = color;

    if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
      element.style.position = 'relative';
    }
    element.appendChild(underline);
  }

  return animate(element, { underline,
    width: isFocused ? '100%' : '0%',
    duration: duration,
    easing: 'easeOutCubic'
  });
}

/**
 * Border pulse focus (pulsing border)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function borderPulseFocus(element, isFocused = true, options = {}) {
  const {
    color = '#00bfb3',
    minWidth = 1,
    maxWidth = 3,
    duration = 800
  } = options;

  if (!isFocused) {
    return animate(element, {
      borderWidth: `${minWidth}px`,
      borderColor: color,
      duration: 200,
      easing: 'easeOutQuad'
    });
  }

  return animate(element, {
    borderWidth: [minWidth, maxWidth, minWidth],
    borderColor: color,
    duration: duration,
    easing: 'easeInOutQuad',
    loop: true
  });
}

/**
 * Label float focus (floating label effect)
 * @param {HTMLElement} label - Label element
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {boolean} hasValue - Whether input has value
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function labelFloatFocus(label, isFocused = true, hasValue = false, options = {}) {
  const {
    floatY = -24,
    floatScale = 0.85,
    duration = 200
  } = options;

  const shouldFloat = isFocused || hasValue;

  return animate(element, { label,
    translateY: shouldFloat ? floatY : 0,
    scale: shouldFloat ? floatScale : 1,
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Highlight focus (background color highlight)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function highlightFocus(element, isFocused = true, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.05)',
    duration = 250
  } = options;

  return animate(element, {
    backgroundColor: isFocused ? color : 'transparent',
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Expand focus (width expansion)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function expandFocus(element, isFocused = true, options = {}) {
  const {
    expandWidth = '110%',
    originalWidth = '100%',
    duration = 250
  } = options;

  return animate(element, {
    width: isFocused ? expandWidth : originalWidth,
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Icon color focus (animate icon color on focus)
 * @param {HTMLElement} icon - Icon element
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function iconColorFocus(icon, isFocused = true, options = {}) {
  const {
    focusColor = '#00bfb3',
    blurColor = '#666666',
    duration = 200
  } = options;

  return animate(element, { icon,
    color: isFocused ? focusColor : blurColor,
    duration: duration,
    easing: getInteractionEasing('focus')
  });
}

/**
 * Placeholder fade focus (fade out placeholder on focus)
 * @param {HTMLElement} placeholder - Placeholder element
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function placeholderFadeFocus(placeholder, isFocused = true, options = {}) {
  const {
    duration = 200
  } = options;

  return animate(element, { placeholder,
    opacity: isFocused ? 0 : 1,
    duration: duration,
    easing: 'easeOutQuad'
  });
}

/**
 * Ring focus (expanding ring effect)
 * @param {HTMLElement} element - Element to add ring to
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function ringFocus(element, isFocused = true, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.3)',
    maxSize = 20,
    duration = 300
  } = options;

  // Get or create ring element
  let ring = element.querySelector('.focus-ring');
  
  if (!ring) {
    ring = document.createElement('div');
    ring.className = 'focus-ring';
    ring.style.position = 'absolute';
    ring.style.inset = '-10px';
    ring.style.border = `0px solid ${color}`;
    ring.style.borderRadius = 'inherit';
    ring.style.pointerEvents = 'none';
    ring.style.zIndex = '-1';

    if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
      element.style.position = 'relative';
    }
    element.appendChild(ring);
  }

  return animate(element, { ring,
    borderWidth: isFocused ? `${maxSize}px` : '0px',
    opacity: isFocused ? 0.5 : 0,
    duration: duration,
    easing: 'easeOutCubic'
  });
}

/**
 * Ripple focus (focus ripple from center)
 * @param {HTMLElement} element - Element to add ripple to
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function rippleFocus(element, options = {}) {
  const {
    color = 'rgba(0, 191, 179, 0.3)',
    duration = 600
  } = options;

  const ripple = document.createElement('div');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);

  ripple.style.position = 'absolute';
  ripple.style.left = '50%';
  ripple.style.top = '50%';
  ripple.style.width = '0';
  ripple.style.height = '0';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = color;
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.pointerEvents = 'none';

  if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
    element.style.position = 'relative';
  }
  element.style.overflow = 'hidden';

  element.appendChild(ripple);

  return animate(element, { ripple,
    width: size,
    height: size,
    opacity: [0.5, 0],
    duration: duration,
    easing: 'easeOutQuad',
    onComplete: () => {
      ripple.remove();
    }
  });
}

/**
 * Accessibility focus (high-contrast focus indicator)
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isFocused - True for focus, false for blur
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function accessibilityFocus(element, isFocused = true, options = {}) {
  const {
    color = '#000000',
    bgColor = '#ffff00',
    duration = 150
  } = options;

  // High contrast for accessibility
  return animate(element, {
    outline: isFocused ? `3px solid ${color}` : 'none',
    outlineOffset: isFocused ? '2px' : '0px',
    backgroundColor: isFocused ? bgColor : 'transparent',
    duration: duration,
    easing: 'linear'
  });
}
