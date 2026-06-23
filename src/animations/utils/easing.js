/**
 * Custom easing functions and presets for Anime.js animations
 * Provides cinematic easing curves for storytelling
 */

/**
 * Predefined easing presets for common animation patterns
 */
export const easingPresets = {
  // Smooth, organic entrance
  entrance: 'cubicBezier(0.16, 1, 0.3, 1)',
  
  // Sharp, purposeful exit
  exit: 'cubicBezier(0.7, 0, 0.84, 0)',
  
  // Bouncy, playful interaction
  bounce: 'spring(1, 80, 10, 0)',
  
  // Elastic, attention-grabbing
  elastic: 'spring(1, 60, 8, 0)',
  
  // Smooth, professional transitions
  smooth: 'cubicBezier(0.4, 0, 0.2, 1)',
  
  // Dramatic, cinematic reveals
  dramatic: 'cubicBezier(0.87, 0, 0.13, 1)',
  
  // Snappy, responsive interactions
  snappy: 'cubicBezier(0.34, 1.56, 0.64, 1)',
  
  // Gentle, subtle movements
  gentle: 'cubicBezier(0.25, 0.46, 0.45, 0.94)',
  
  // Sharp acceleration
  accel: 'cubicBezier(0.7, 0, 1, 0.5)',
  
  // Sharp deceleration
  decel: 'cubicBezier(0, 0.5, 0.3, 1)',
  
  // Standard material design
  standard: 'cubicBezier(0.4, 0, 0.2, 1)',
  
  // Linear for constant speed
  linear: 'linear'
};

/**
 * Get easing function for scene transitions
 * @param {string} direction - 'enter' or 'exit'
 * @returns {string} Easing function
 */
export function getSceneEasing(direction = 'enter') {
  return direction === 'enter' ? easingPresets.entrance : easingPresets.exit;
}

/**
 * Get easing function for data reveals
 * @param {boolean} isDramatic - Whether to use dramatic reveal
 * @returns {string} Easing function
 */
export function getDataRevealEasing(isDramatic = false) {
  return isDramatic ? easingPresets.dramatic : easingPresets.smooth;
}

/**
 * Get easing function for interactions
 * @param {string} type - 'hover', 'click', 'focus'
 * @returns {string} Easing function
 */
export function getInteractionEasing(type = 'hover') {
  switch (type) {
    case 'click':
      return easingPresets.snappy;
    case 'focus':
      return easingPresets.gentle;
    case 'hover':
    default:
      return easingPresets.smooth;
  }
}

/**
 * Get spring physics configuration
 * @param {string} preset - 'soft', 'medium', 'hard'
 * @returns {string} Spring configuration
 */
export function getSpringConfig(preset = 'medium') {
  const configs = {
    soft: 'spring(1, 50, 10, 0)',    // Gentle, slow settle
    medium: 'spring(1, 80, 10, 0)',  // Balanced
    hard: 'spring(1, 100, 8, 0)'     // Fast, snappy
  };
  return configs[preset] || configs.medium;
}

/**
 * Create custom cubic bezier easing
 * @param {number} x1 - First control point x
 * @param {number} y1 - First control point y
 * @param {number} x2 - Second control point x
 * @param {number} y2 - Second control point y
 * @returns {string} Cubic bezier string
 */
export function cubicBezier(x1, y1, x2, y2) {
  return `cubicBezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/**
 * Create custom spring configuration
 * @param {number} mass - Mass (default: 1)
 * @param {number} stiffness - Stiffness (default: 100)
 * @param {number} damping - Damping (default: 10)
 * @param {number} velocity - Initial velocity (default: 0)
 * @returns {string} Spring configuration string
 */
export function spring(mass = 1, stiffness = 100, damping = 10, velocity = 0) {
  return `spring(${mass}, ${stiffness}, ${damping}, ${velocity})`;
}
