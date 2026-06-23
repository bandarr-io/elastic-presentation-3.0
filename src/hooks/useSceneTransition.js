import { useCallback, useRef, useState } from 'react';
import { animate } from 'animejs';

/**
 * Coordinated scene transition hook for enter/exit animations
 * Ensures smooth transitions with no overlap or flickering
 * 
 * @param {Object} options - Transition configuration
 * @param {number} options.exitDuration - Duration of exit animation (ms, default: 300)
 * @param {number} options.enterDuration - Duration of enter animation (ms, default: 500)
 * @param {number} options.gap - Gap between exit and enter (ms, default: 0)
 * @returns {Object} Transition control methods and state
 */
export function useSceneTransition({ 
  exitDuration = 300, 
  enterDuration = 500, 
  gap = 0 
} = {}) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentAnimationRef = useRef(null);

  /**
   * Execute scene exit animation
   * @param {HTMLElement} element - Element to animate out
   * @param {Object} config - Animation configuration
   * @returns {Promise} Resolves when exit complete
   */
  const executeExit = useCallback((element, config = {}) => {
    if (!element) return Promise.resolve();

    // Cancel any existing animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.pause();
    }

    const exitConfig = {
      targets: element,
      opacity: [1, 0],
      translateY: [0, -20],
      duration: exitDuration,
      easing: 'easeInQuad',
      ...config
    };

    return new Promise((resolve) => {
      currentAnimationRef.current = animate(element, {
        ...exitConfig,
        onComplete: () => {
          resolve();
        }
      });
    });
  }, [exitDuration]);

  /**
   * Execute scene enter animation
   * @param {HTMLElement} element - Element to animate in
   * @param {Object} config - Animation configuration
   * @returns {Promise} Resolves when enter complete
   */
  const executeEnter = useCallback((element, config = {}) => {
    if (!element) return Promise.resolve();

    const enterConfig = {
      targets: element,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: enterDuration,
      easing: 'easeOutCubic',
      ...config
    };

    return new Promise((resolve) => {
      currentAnimationRef.current = animate(element, {
        ...enterConfig,
        onComplete: () => {
          resolve();
        }
      });
    });
  }, [enterDuration]);

  /**
   * Execute coordinated exit -> enter transition
   * @param {HTMLElement} exitElement - Element to exit
   * @param {HTMLElement} enterElement - Element to enter
   * @param {Object} exitConfig - Exit animation config
   * @param {Object} enterConfig - Enter animation config
   * @returns {Promise} Resolves when full transition complete
   */
  const transition = useCallback(async (
    exitElement, 
    enterElement, 
    exitConfig = {}, 
    enterConfig = {}
  ) => {
    setIsTransitioning(true);

    try {
      // Execute exit animation
      if (exitElement) {
        await executeExit(exitElement, exitConfig);
      }

      // Optional gap between exit and enter
      if (gap > 0) {
        await new Promise(resolve => setTimeout(resolve, gap));
      }

      // Execute enter animation
      if (enterElement) {
        await executeEnter(enterElement, enterConfig);
      }
    } finally {
      setIsTransitioning(false);
      currentAnimationRef.current = null;
    }
  }, [executeExit, executeEnter, gap]);

  /**
   * Execute parallel transition (crossfade)
   * @param {HTMLElement} exitElement - Element to exit
   * @param {HTMLElement} enterElement - Element to enter
   * @param {Object} exitConfig - Exit animation config
   * @param {Object} enterConfig - Enter animation config
   * @returns {Promise} Resolves when transition complete
   */
  const crossfade = useCallback(async (
    exitElement,
    enterElement,
    exitConfig = {},
    enterConfig = {}
  ) => {
    setIsTransitioning(true);

    try {
      // Execute both animations in parallel
      await Promise.all([
        exitElement ? executeExit(exitElement, exitConfig) : Promise.resolve(),
        enterElement ? executeEnter(enterElement, enterConfig) : Promise.resolve()
      ]);
    } finally {
      setIsTransitioning(false);
      currentAnimationRef.current = null;
    }
  }, [executeExit, executeEnter]);

  /**
   * Cancel current transition
   */
  const cancel = useCallback(() => {
    if (currentAnimationRef.current) {
      currentAnimationRef.current.pause();
      currentAnimationRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  return {
    transition,
    crossfade,
    executeExit,
    executeEnter,
    cancel,
    isTransitioning
  };
}
