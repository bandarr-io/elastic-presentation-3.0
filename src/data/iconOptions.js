import {
  faDatabase,
  faServer,
  faGaugeHigh,
  faBolt,
  faLayerGroup,
  faShieldHalved,
  faShield,
  faFingerprint,
  faHeadset,
  faGlobe,
  faClipboardCheck,
  faBuildingColumns,
  faStopwatch,
  faClock,
  faChartLine,
  faChartColumn,
  faMagnifyingGlass,
  faBrain,
  faRobot,
  faLock,
  faKey,
  faUsers,
  faUser,
  faGear,
  faCloud,
  faNetworkWired,
  faEye,
  faRocket,
  faCoins,
  faBell,
  faFileShield,
  faCube,
  faCubes,
  faDiagramProject,
  faCircleNodes,
  faWandMagicSparkles,
  faSatelliteDish,
  faPlug,
  faMapLocationDot,
  faStar,
  faCheck,
  faTriangleExclamation,
  faFire,
  faCodeBranch,
  faTerminal,
  faBug,
  faLifeRing,
  faBullseye,
  faGraduationCap,
  faHandshake,
  faRightLeft,
  faEnvelopeOpenText,
  faMagnifyingGlassChart,
  faTableColumns,
  faDna,
} from '@fortawesome/free-solid-svg-icons'

// Curated icon set for the scene editors' icon picker.
// `name` matches each icon's FontAwesome iconName so a default icon object
// (e.g. faDatabase) and a metadata string ('database') resolve to the same entry.
export const ICON_OPTIONS = [
  { name: 'database', label: 'Database', icon: faDatabase },
  { name: 'server', label: 'Server', icon: faServer },
  { name: 'gauge-high', label: 'Gauge', icon: faGaugeHigh },
  { name: 'bolt', label: 'Bolt', icon: faBolt },
  { name: 'layer-group', label: 'Layers', icon: faLayerGroup },
  { name: 'shield-halved', label: 'Shield (halved)', icon: faShieldHalved },
  { name: 'shield', label: 'Shield', icon: faShield },
  { name: 'fingerprint', label: 'Fingerprint', icon: faFingerprint },
  { name: 'headset', label: 'Headset', icon: faHeadset },
  { name: 'globe', label: 'Globe', icon: faGlobe },
  { name: 'clipboard-check', label: 'Clipboard Check', icon: faClipboardCheck },
  { name: 'building-columns', label: 'Institution', icon: faBuildingColumns },
  { name: 'stopwatch', label: 'Stopwatch', icon: faStopwatch },
  { name: 'clock', label: 'Clock', icon: faClock },
  { name: 'chart-line', label: 'Chart (line)', icon: faChartLine },
  { name: 'chart-column', label: 'Chart (bar)', icon: faChartColumn },
  { name: 'magnifying-glass', label: 'Search', icon: faMagnifyingGlass },
  { name: 'brain', label: 'Brain', icon: faBrain },
  { name: 'robot', label: 'Robot', icon: faRobot },
  { name: 'lock', label: 'Lock', icon: faLock },
  { name: 'key', label: 'Key', icon: faKey },
  { name: 'users', label: 'Users', icon: faUsers },
  { name: 'user', label: 'User', icon: faUser },
  { name: 'gear', label: 'Gear', icon: faGear },
  { name: 'cloud', label: 'Cloud', icon: faCloud },
  { name: 'network-wired', label: 'Network', icon: faNetworkWired },
  { name: 'eye', label: 'Eye', icon: faEye },
  { name: 'rocket', label: 'Rocket', icon: faRocket },
  { name: 'coins', label: 'Coins', icon: faCoins },
  { name: 'bell', label: 'Bell', icon: faBell },
  { name: 'file-shield', label: 'File Shield', icon: faFileShield },
  { name: 'cube', label: 'Cube', icon: faCube },
  { name: 'cubes', label: 'Cubes', icon: faCubes },
  { name: 'diagram-project', label: 'Diagram', icon: faDiagramProject },
  { name: 'circle-nodes', label: 'Nodes', icon: faCircleNodes },
  { name: 'wand-magic-sparkles', label: 'Magic Wand', icon: faWandMagicSparkles },
  { name: 'satellite-dish', label: 'Satellite Dish', icon: faSatelliteDish },
  { name: 'plug', label: 'Plug', icon: faPlug },
  { name: 'map-location-dot', label: 'Map Pin', icon: faMapLocationDot },
  { name: 'star', label: 'Star', icon: faStar },
  { name: 'check', label: 'Check', icon: faCheck },
  { name: 'triangle-exclamation', label: 'Warning', icon: faTriangleExclamation },
  { name: 'fire', label: 'Fire', icon: faFire },
  { name: 'code-branch', label: 'Code Branch', icon: faCodeBranch },
  { name: 'terminal', label: 'Terminal', icon: faTerminal },
  { name: 'bug', label: 'Bug', icon: faBug },
  { name: 'life-ring', label: 'Life Ring', icon: faLifeRing },
  { name: 'bullseye', label: 'Target', icon: faBullseye },
  { name: 'graduation-cap', label: 'Graduation Cap', icon: faGraduationCap },
  { name: 'handshake', label: 'Handshake', icon: faHandshake },
  { name: 'right-left', label: 'Exchange', icon: faRightLeft },
  { name: 'envelope-open-text', label: 'Email', icon: faEnvelopeOpenText },
  { name: 'magnifying-glass-chart', label: 'Search Chart', icon: faMagnifyingGlassChart },
  { name: 'table-columns', label: 'Dashboard', icon: faTableColumns },
  { name: 'dna', label: 'DNA', icon: faDna },
]

export const ICON_BY_NAME = Object.fromEntries(ICON_OPTIONS.map((o) => [o.name, o.icon]))

/**
 * Resolve an icon value to a FontAwesome icon object.
 * Accepts either an icon object (scene defaults) or a string name (metadata overrides).
 */
export function resolveIcon(value, fallback = null) {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  return ICON_BY_NAME[value] || fallback
}

/** FontAwesome icon name for a value that may be an object or a string. */
export function iconNameOf(value, fallbackName = '') {
  if (!value) return fallbackName
  if (typeof value === 'string') return value
  return value.iconName || fallbackName
}
