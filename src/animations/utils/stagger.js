/**
 * Stagger utilities for sequential animations
 * Provides flexible timing patterns for lists, grids, and groups
 */

/**
 * Create stagger configuration for anime.js
 * @param {number} value - Base stagger value (ms or grid spacing)
 * @param {Object} options - Stagger options
 * @returns {Object|number} Stagger configuration
 */
export function createStagger(value, options = {}) {
  const {
    grid,           // [cols, rows] for grid layout
    from,           // 'first', 'last', 'center', index
    direction,      // 'normal', 'reverse'
    easing,         // Easing for stagger timing
    axis            // 'x', 'y' for grid direction
  } = options;

  // Simple stagger
  if (!grid && !from && !direction && !easing) {
    return value;
  }

  // Advanced stagger configuration
  const config = { value };

  if (grid) {
    config.grid = grid;
  }

  if (from !== undefined) {
    config.from = from;
  }

  if (direction) {
    config.direction = direction;
  }

  if (easing) {
    config.easing = easing;
  }

  if (axis) {
    config.axis = axis;
  }

  return config;
}

/**
 * Preset stagger patterns
 */
export const staggerPresets = {
  // Fast cascade (50ms)
  fast: 50,
  
  // Medium cascade (100ms)
  medium: 100,
  
  // Slow, dramatic cascade (200ms)
  slow: 200,
  
  // Ultra-fast ripple (30ms)
  ripple: 30,
  
  // Wave effect (150ms)
  wave: 150
};

/**
 * Get stagger for list items
 * @param {number} itemCount - Number of items
 * @param {string} speed - 'fast', 'medium', 'slow'
 * @returns {Object} Stagger configuration
 */
export function getListStagger(itemCount, speed = 'medium') {
  const baseValue = staggerPresets[speed] || staggerPresets.medium;
  
  // Adjust stagger based on item count
  const adjustedValue = itemCount > 10 ? baseValue * 0.7 : baseValue;
  
  return createStagger(adjustedValue, {
    easing: 'easeOutQuad'
  });
}

/**
 * Get stagger for grid layout
 * @param {Array} gridSize - [cols, rows]
 * @param {string} from - Start position ('first', 'center', 'last')
 * @param {string} speed - 'fast', 'medium', 'slow'
 * @returns {Object} Stagger configuration
 */
export function getGridStagger(gridSize, from = 'center', speed = 'medium') {
  const baseValue = staggerPresets[speed] || staggerPresets.medium;
  
  return createStagger(baseValue, {
    grid: gridSize,
    from: from,
    easing: 'easeOutQuad'
  });
}

/**
 * Get stagger for text reveal (character/word)
 * @param {string} speed - 'fast', 'medium', 'slow'
 * @returns {number} Stagger value in ms
 */
export function getTextStagger(speed = 'fast') {
  const values = {
    fast: 20,
    medium: 40,
    slow: 60
  };
  return values[speed] || values.fast;
}

/**
 * Get stagger with wave effect
 * @param {number} baseValue - Base stagger time (ms)
 * @param {string} direction - 'normal' or 'reverse'
 * @returns {Object} Stagger configuration
 */
export function getWaveStagger(baseValue = 100, direction = 'normal') {
  return createStagger(baseValue, {
    direction,
    easing: 'easeInOutQuad'
  });
}

/**
 * Get radial stagger (from center outward)
 * @param {number} baseValue - Base stagger time (ms)
 * @param {Array} gridSize - [cols, rows]
 * @returns {Object} Stagger configuration
 */
export function getRadialStagger(baseValue = 80, gridSize = [3, 3]) {
  return createStagger(baseValue, {
    grid: gridSize,
    from: 'center',
    easing: 'easeOutQuad'
  });
}

/**
 * Get directional stagger (left-to-right, top-to-bottom, etc.)
 * @param {number} baseValue - Base stagger time (ms)
 * @param {string} axis - 'x' or 'y'
 * @param {string} direction - 'normal' or 'reverse'
 * @returns {Object} Stagger configuration
 */
export function getDirectionalStagger(
  baseValue = 100, 
  axis = 'x', 
  direction = 'normal'
) {
  return createStagger(baseValue, {
    axis,
    direction,
    easing: 'easeOutQuad'
  });
}
