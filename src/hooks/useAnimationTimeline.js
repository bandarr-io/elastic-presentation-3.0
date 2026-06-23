import { useRef, useEffect, useCallback } from 'react';
import { createTimeline } from 'animejs';

/**
 * Master timeline hook for coordinating complex animation sequences
 * Provides timeline management with pause/resume/revert control
 * 
 * @param {Object} options - Timeline configuration
 * @param {boolean} options.autoplay - Whether to start timeline automatically (default: true)
 * @param {Function} options.onComplete - Callback when timeline completes
 * @returns {Object} Timeline control methods and state
 */
export function useAnimationTimeline({ autoplay = true, onComplete } = {}) {
  const timelineRef = useRef(null);
  const animationsRef = useRef([]);

  // Create a new timeline
  const createTimeline = useCallback((config = {}) => {
    // Clean up existing timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
      animationsRef.current.forEach(anim => {
        if (anim && typeof anim.pause === 'function') {
          anim.pause();
        }
      });
      animationsRef.current = [];
    }

    // Create new timeline configuration
    const timelineConfig = {
      autoplay: autoplay,
      ...config
    };

    if (onComplete) {
      timelineConfig.complete = onComplete;
    }

    timelineRef.current = createTimeline(timelineConfig);
    return timelineRef.current;
  }, [autoplay, onComplete]);

  // Add animation to timeline
  const add = useCallback((animationConfig) => {
    if (!timelineRef.current) {
      timelineRef.current = createTimeline({ autoplay });
    }

    const animation = timelineRef.current.add(animationConfig);
    animationsRef.current.push(animation);
    return animation;
  }, [autoplay]);

  // Play timeline
  const play = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.play();
    }
  }, []);

  // Pause timeline
  const pause = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
    }
  }, []);

  // Restart timeline
  const restart = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.restart();
    }
  }, []);

  // Reverse timeline
  const reverse = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.reverse();
    }
  }, []);

  // Seek to specific time in timeline
  const seek = useCallback((time) => {
    if (timelineRef.current) {
      timelineRef.current.seek(time);
    }
  }, []);

  // Clean up timeline
  const revert = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
      // Reset all animated elements to their original state
      animationsRef.current.forEach(anim => {
        if (anim && typeof anim.pause === 'function') {
          anim.pause();
        }
      });
      timelineRef.current = null;
      animationsRef.current = [];
    }
  }, []);

  // Get current progress (0-1)
  const getProgress = useCallback(() => {
    if (timelineRef.current) {
      return timelineRef.current.progress / 100;
    }
    return 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revert();
    };
  }, [revert]);

  return {
    createTimeline,
    add,
    play,
    pause,
    restart,
    reverse,
    seek,
    revert,
    getProgress,
    timeline: timelineRef.current
  };
}
