import { animate, stagger, setDashoffset } from 'animejs';
import { easingPresets } from '../utils/easing';
import { createTimeline } from '../utils/timeline';

/**
 * Diagram and architecture reveal animations
 * Specialized animations for technical diagrams, flowcharts, and architecture visuals
 */

/**
 * Node-by-node reveal (diagram nodes appear sequentially)
 * @param {Array|string} nodes - Diagram nodes
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function nodeReveal(nodes, options = {}) {
  const {
    duration = 500,
    stagger = 150,
    scaleFrom = 0.5
  } = options;

  return animate(nodes, {
    opacity: [0, 1],
    scale: [scaleFrom, 1],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: easingPresets.entrance,
    ...options
  });
}

/**
 * Connection line draw (animated lines between nodes)
 * @param {Array} lines - Array of SVG path or line elements
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function connectionLineReveal(lines, options = {}) {
  const {
    duration = 1000,
    stagger = 200
  } = options;

  // Set up each line for drawing animation
  lines.forEach(line => {
    if (line.tagName === 'path') {
      const length = line.getTotalLength();
      line.style.strokeDasharray = length;
      line.style.strokeDashoffset = length;
    }
  });

  return animate(lines, {
    strokeDashoffset: [anime.setDashoffset, 0],
    opacity: [0, 1],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: 'easeInOutQuad',
    ...options
  });
}

/**
 * Layered diagram reveal (build diagram in layers)
 * @param {Array} layers - Array of layer elements
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with layered reveal
 */
export function layeredDiagramReveal(layers, options = {}) {
  const {
    layerDelay = 400,
    duration = 600
  } = options;

  const timeline = createTimeline({ autoplay: false });

  layers.forEach((layer, index) => {
    const delay = index * layerDelay;

    timeline.add({
      targets: layer,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: duration,
      easing: easingPresets.entrance
    }, delay);
  });

  return timeline;
}

/**
 * Flowchart step-by-step reveal
 * @param {Array} steps - Flowchart step elements
 * @param {Array} connections - Connection line elements
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with coordinated reveal
 */
export function flowchartReveal(steps, connections, options = {}) {
  const {
    stepDuration = 500,
    connectionDuration = 400,
    stepDelay = 300
  } = options;

  const timeline = createTimeline({ autoplay: false });

  steps.forEach((step, index) => {
    const delay = index * stepDelay;

    // Reveal step
    timeline.add({
      targets: step,
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: stepDuration,
      easing: easingPresets.snappy
    }, delay);

    // Reveal connection after step (if exists)
    if (connections[index]) {
      const connection = connections[index];
      
      // Setup line drawing
      if (connection.tagName === 'path' || connection.tagName === 'line') {
        const length = connection.getTotalLength ? connection.getTotalLength() : 100;
        connection.style.strokeDasharray = length;
        connection.style.strokeDashoffset = length;

        timeline.add({
          targets: connection,
          strokeDashoffset: 0,
          opacity: [0, 1],
          duration: connectionDuration,
          easing: 'linear'
        }, delay + stepDuration - 100);
      }
    }
  });

  return timeline;
}

/**
 * Architecture layers reveal (tech stack visualization)
 * @param {Array} architectureLayers - Array of layer objects
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with architecture reveal
 */
export function architectureReveal(architectureLayers, options = {}) {
  const {
    layerStagger = 200,
    componentStagger = 80,
    duration = 500
  } = options;

  const timeline = createTimeline({ autoplay: false });

  architectureLayers.forEach((layer, layerIndex) => {
    const layerDelay = layerIndex * layerStagger;

    // Reveal layer container
    timeline.add({
      targets: layer.container,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: duration,
      easing: easingPresets.entrance
    }, layerDelay);

    // Reveal components within layer
    if (layer.components) {
      timeline.add({
        targets: layer.components,
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 400,
        delay: anime.stagger(componentStagger),
        easing: easingPresets.entrance
      }, layerDelay + 100);
    }
  });

  return timeline;
}

/**
 * Radial diagram reveal (items expand from center)
 * @param {Array} items - Diagram items arranged radially
 * @param {Object} centerPoint - { x, y } center coordinates
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with radial reveal
 */
export function radialDiagramReveal(items, centerPoint, options = {}) {
  const {
    duration = 800,
    stagger = 100
  } = options;

  const timeline = createTimeline({ autoplay: false });

  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    // Calculate angle from center
    const dx = itemCenter.x - centerPoint.x;
    const dy = itemCenter.y - centerPoint.y;
    const angle = Math.atan2(dy, dx);

    // Start from center, move to position
    const startDistance = 50;
    const fromX = Math.cos(angle) * startDistance;
    const fromY = Math.sin(angle) * startDistance;

    timeline.add({
      targets: item,
      opacity: [0, 1],
      translateX: [fromX, 0],
      translateY: [fromY, 0],
      scale: [0.5, 1],
      duration: duration,
      easing: easingPresets.entrance
    }, index * stagger);
  });

  return timeline;
}

/**
 * Hierarchy tree reveal (expand tree structure)
 * @param {HTMLElement} root - Root node
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with tree expansion
 */
export function hierarchyTreeReveal(root, options = {}) {
  const {
    levelDelay = 300,
    nodeStagger = 100
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Traverse tree and collect nodes by level
  const levels = [];
  const traverse = (node, level = 0) => {
    if (!levels[level]) levels[level] = [];
    levels[level].push(node);

    const children = node.querySelectorAll(':scope > .child, :scope > .node-child');
    children.forEach(child => traverse(child, level + 1));
  };

  traverse(root);

  // Animate each level
  levels.forEach((levelNodes, levelIndex) => {
    const delay = levelIndex * levelDelay;

    timeline.add({
      targets: levelNodes,
      opacity: [0, 1],
      translateX: [-20, 0],
      scale: [0.9, 1],
      duration: 500,
      delay: anime.stagger(nodeStagger),
      easing: easingPresets.entrance
    }, delay);
  });

  return timeline;
}

/**
 * Network graph reveal (nodes and connections)
 * @param {Array} nodes - Network nodes
 * @param {Array} edges - Network edges/connections
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with network reveal
 */
export function networkGraphReveal(nodes, edges, options = {}) {
  const {
    nodeStagger = 80,
    nodeDuration = 500,
    edgeStagger = 50,
    edgeDuration = 400,
    edgeDelay = 200
  } = options;

  const timeline = createTimeline({ autoplay: false });

  // Reveal nodes first
  timeline.add({
    targets: nodes,
    opacity: [0, 1],
    scale: [0.3, 1],
    duration: nodeDuration,
    delay: anime.stagger(nodeStagger),
    easing: easingPresets.entrance
  });

  // Setup edges for line drawing
  edges.forEach(edge => {
    if (edge.getTotalLength) {
      const length = edge.getTotalLength();
      edge.style.strokeDasharray = length;
      edge.style.strokeDashoffset = length;
    }
  });

  // Reveal edges after nodes
  timeline.add({
    targets: edges,
    strokeDashoffset: [anime.setDashoffset, 0],
    opacity: [0, 1],
    duration: edgeDuration,
    delay: anime.stagger(edgeStagger),
    easing: 'easeOutQuad'
  }, edgeDelay);

  return timeline;
}

/**
 * Timeline/Gantt chart reveal
 * @param {Array} bars - Timeline bar elements
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function timelineReveal(bars, options = {}) {
  const {
    duration = 800,
    stagger = 100,
    direction = 'horizontal'
  } = options;

  const scaleProperty = direction === 'horizontal' ? 'scaleX' : 'scaleY';

  return animate(bars, {
    [scaleProperty]: [0, 1],
    opacity: [0, 1],
    duration: duration,
    delay: anime.stagger(stagger),
    easing: 'easeOutCubic',
    transformOrigin: direction === 'horizontal' ? 'left center' : 'top center',
    ...options
  });
}

/**
 * Process flow reveal (sequential steps with arrows)
 * @param {Array} steps - Process step elements
 * @param {Array} arrows - Arrow elements
 * @param {Object} options - Configuration options
 * @returns {Object} Timeline with process flow
 */
export function processFlowReveal(steps, arrows, options = {}) {
  const {
    stepDuration = 500,
    arrowDuration = 300,
    gap = 100
  } = options;

  const timeline = createTimeline({ autoplay: false });

  steps.forEach((step, index) => {
    const delay = index * (stepDuration + gap);

    // Reveal step
    timeline.add({
      targets: step,
      opacity: [0, 1],
      scale: [0.9, 1],
      translateX: [-20, 0],
      duration: stepDuration,
      easing: easingPresets.entrance
    }, delay);

    // Reveal arrow pointing to next step
    if (arrows[index]) {
      timeline.add({
        targets: arrows[index],
        opacity: [0, 1],
        translateX: [-10, 0],
        duration: arrowDuration,
        easing: 'easeOutQuad'
      }, delay + stepDuration - 100);
    }
  });

  return timeline;
}

/**
 * Matrix grid reveal (data grid or heatmap)
 * @param {Array|string} cells - Grid cells
 * @param {Array} gridSize - [cols, rows]
 * @param {Object} options - Configuration options
 * @returns {Object} Animation instance
 */
export function matrixGridReveal(cells, gridSize, options = {}) {
  const {
    duration = 400,
    pattern = 'wave',
    baseDelay = 30
  } = options;

  const [cols, rows] = gridSize;

  return animate(cells, {
    opacity: [0, 1],
    scale: [0.5, 1],
    duration: duration,
    delay: (el, i) => {
      if (pattern === 'wave') {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return (row + col) * baseDelay;
      } else if (pattern === 'spiral') {
        // Simplified spiral calculation
        return i * baseDelay;
      } else {
        // Default cascade
        return i * baseDelay;
      }
    },
    easing: easingPresets.entrance,
    ...options
  });
}
