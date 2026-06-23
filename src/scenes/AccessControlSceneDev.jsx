import { animate, stagger } from 'animejs'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserShield,
  faShieldHalved,
  faEyeSlash,
  faLock,
  faUnlock,
  faDatabase,
  faFilter,
  faMask,
  faCheckCircle,
  faTimesCircle,
  faCode,
  faClipboardCheck,
  faUserSecret,
  faServer,
  faFile,
  faTag,
  faBuilding,
  faGlobe,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleLogData = [
  { id: 1, timestamp: '09:23:41', user: 'john.smith@acme.com',    source_ip: '192.168.1.47',  action: 'login_success',     user_id: 'USR-48291', ssn: '123-45-4521', severity: 'info',     department: 'Engineering', region: 'US'   },
  { id: 2, timestamp: '09:24:12', user: 'sarah.jones@acme.com',   source_ip: '10.0.0.55',     action: 'payment_processed', user_id: 'USR-77043', ssn: '234-56-8832', severity: 'high',     department: 'Finance',     region: 'EU'   },
  { id: 3, timestamp: '09:26:55', user: 'admin@acme.com',         source_ip: '10.0.0.1',      action: 'config_change',     user_id: 'USR-00019', ssn: '345-67-1190', severity: 'critical', department: 'IT',          region: 'US'   },
  { id: 4, timestamp: '09:28:33', user: 'lisa.chen@acme.com',     source_ip: '192.168.2.101', action: 'data_export',       user_id: 'USR-61882', ssn: '456-78-5567', severity: 'high',     department: 'Finance',     region: 'APAC' },
  { id: 5, timestamp: '09:30:17', user: 'emma.davis@acme.com',    source_ip: '192.168.3.88',  action: 'api_request',       user_id: 'USR-53410', ssn: '567-34-2209', severity: 'info',     department: 'Engineering', region: 'US'   },
  { id: 6, timestamp: '09:31:45', user: 'raj.patel@acme.com',     source_ip: '10.0.1.200',    action: 'login_failed',      user_id: 'USR-39027', ssn: '567-89-7789', severity: 'medium',   department: 'Sales',       region: 'APAC' },
  { id: 7, timestamp: '09:33:22', user: 'maria.garcia@acme.com',  source_ip: '172.16.5.33',   action: 'refund_issued',     user_id: 'USR-82156', ssn: '678-90-2341', severity: 'high',     department: 'Finance',     region: 'EU'   },
  { id: 8, timestamp: '09:45:58', user: 'security_scan@acme.com', source_ip: '10.0.0.100',    action: 'vuln_detected',     user_id: 'USR-00042', ssn: '789-23-6614', severity: 'critical', department: 'IT',          region: 'US'   },
  { id: 9, timestamp: '09:48:12', user: 'alex.kim@acme.com',      source_ip: '192.168.1.150', action: 'deployment',        user_id: 'USR-74390', ssn: '890-45-3378', severity: 'medium',   department: 'Engineering', region: 'US'   },
  { id:10, timestamp: '09:51:44', user: 'nina.wong@acme.com',     source_ip: '172.16.2.45',   action: 'report_generated',  user_id: 'USR-56614', ssn: '234-89-5501', severity: 'info',     department: 'IT',          region: 'APAC' },
  { id:11, timestamp: '09:54:02', user: 'tom.brown@acme.com',     source_ip: '192.168.8.77',  action: 'customer_lookup',   user_id: 'USR-29835', ssn: '789-01-9988', severity: 'info',     department: 'Sales',       region: 'EU'   },
  { id:12, timestamp: '09:56:30', user: 'james.lee@acme.com',     source_ip: '192.168.4.201', action: 'transaction_void',  user_id: 'USR-41107', ssn: '890-12-3322', severity: 'high',     department: 'Finance',     region: 'US'   },
  { id:13, timestamp: '09:59:11', user: 'svc_monitor@acme.com',   source_ip: '10.0.0.200',    action: 'health_check',      user_id: 'USR-00087', ssn: '456-12-7743', severity: 'info',     department: 'IT',          region: 'US'   },
  { id:14, timestamp: '10:02:44', user: 'kate.miller@acme.com',   source_ip: '192.168.5.66',  action: 'contract_signed',   user_id: 'USR-68523', ssn: '321-54-8876', severity: 'medium',   department: 'Sales',       region: 'EU'   },
]

// Masking is format-aware — works regardless of what the column is named.
const maskPiiValue = (value) => {
  if (!value) return value
  // Credit card: NNNN-NNNN-NNNN-NNNN — keep first and last group
  if (/^\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}$/.test(value))
    return value.replace(/^(\d{4})[-\s](\d{4})[-\s](\d{4})[-\s](\d{4})$/, '$1-XXXX-XXXX-$4')
  // SSN: NNN-NN-NNNN — mask first two groups
  if (/^\d{3}-\d{2}-\d{4}$/.test(value))
    return value.replace(/^(\d{3})-(\d{2})-(\d{4})$/, '***-**-$3')
  // Generic: keep first 2 and last 2 characters, mask everything in between
  if (value.length > 4) return value.slice(0, 2) + '*'.repeat(Math.min(value.length - 4, 6)) + value.slice(-2)
  return '****'
}

// Default dept order — used to remap when departments are customised
const DEFAULT_DEPTS = ['Engineering', 'Finance', 'Sales', 'IT']

// ─── Config ───────────────────────────────────────────────────────────────────

const accessLevels = [
  { id: 'cluster',  name: 'Cluster',  icon: faServer,   description: 'Cluster-wide operations'        },
  { id: 'index',    name: 'Index',    icon: faDatabase, description: 'Which indices can be queried'   },
  { id: 'document', name: 'Document', icon: faFile,     description: 'Row-level filtering (DLS)'      },
  { id: 'field',    name: 'Field',    icon: faTag,      description: 'Column masking (FLS)'           },
]

const roles = [
  {
    id: 'admin',
    name: 'Admin',
    icon: faUserShield,
    description: 'Full cluster access',
    summary: 'Unrestricted access to all indices, documents, and fields across the entire cluster.',
    compliance: ['SOC 2', 'ISO 27001'],
    levels: {
      cluster:  { access: true,  detail: 'All operations'          },
      index:    { access: true,  detail: '*'                        },
      document: { access: true,  detail: 'No filters'              },
      field:    { access: true,  detail: 'All fields'              },
    },
    visibleFields: ['timestamp', 'user', 'source_ip', 'action', 'user_id', 'ssn', 'severity', 'department', 'region'],
    documentFilter: () => true,
  },
  {
    id: 'analyst',
    name: 'Security Analyst',
    icon: faShieldHalved,
    description: 'Security indices only',
    summary: 'Read-only access to security logs. Only high and critical severity events are visible. PII fields are masked.',
    compliance: ['SOC 2', 'NIST CSF', 'ISO 27001'],
    levels: {
      cluster:  { access: false, detail: 'Read only'                },
      index:    { access: true,  detail: 'security-*, logs-*'      },
      document: { access: true,  detail: 'severity: high|critical' },
      field:    { access: true,  detail: 'No PII fields'           },
    },
    visibleFields: ['timestamp', 'user', 'source_ip', 'action', 'severity', 'department'],
    documentFilter: (doc) => ['high', 'critical'].includes(doc.severity),
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: faCode,
    description: 'App logs only',
    summary: 'App log access scoped to Engineering only. No sensitive data or critical events exposed.',
    compliance: ['SOC 2', 'GDPR'],
    levels: {
      cluster:  { access: false, detail: 'No access'               },
      index:    { access: true,  detail: 'logs-*, metrics-*'       },
      document: { access: true,  detail: 'dept: Engineering'       },
      field:    { access: true,  detail: 'Basic fields only'       },
    },
    visibleFields: ['timestamp', 'action', 'severity', 'department'],
    documentFilter: (doc) => doc.severity !== 'critical',
    abacDefault: { department: 'Engineering' },
  },
  {
    id: 'auditor',
    name: 'Auditor',
    icon: faClipboardCheck,
    description: 'Audit trail access',
    summary: 'Read-only audit trail access. Sees who did what and when — nothing more.',
    compliance: ['SOC 2', 'GDPR', 'HIPAA', 'ISO 27001'],
    levels: {
      cluster:  { access: false, detail: 'No access'               },
      index:    { access: true,  detail: 'audit-*'                 },
      document: { access: true,  detail: 'All documents'           },
      field:    { access: true,  detail: 'user, action, time'      },
    },
    visibleFields: ['timestamp', 'user', 'action'],
    documentFilter: () => true,
  },
]

const abacAttributes = [
  { id: 'department', name: 'Dept',   icon: faBuilding, values: ['Engineering', 'Finance', 'Sales', 'IT'] },
  { id: 'region',     name: 'Region', icon: faGlobe,    values: ['US', 'EU', 'APAC']                                   },
]

const allFields = [
  { key: 'timestamp',   label: 'Timestamp',   sensitive: false },
  { key: 'user',        label: 'User',        sensitive: false },
  { key: 'source_ip',   label: 'Source IP',   sensitive: true  },
  { key: 'action',      label: 'Action',      sensitive: false },
  { key: 'user_id',     label: 'User ID',     sensitive: true  },
  { key: 'ssn',         label: 'SSN',         sensitive: true  },
  { key: 'severity',    label: 'Severity',    sensitive: false },
  { key: 'department',  label: 'Department',  sensitive: false },
  { key: 'region',      label: 'Region',      sensitive: false },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity, isVisible, isDark }) {
  const colors = {
    critical: 'bg-red-500/20 text-red-400',
    high:     'bg-orange-500/20 text-orange-400',
    medium:   'bg-yellow-500/20 text-yellow-400',
    info:     isDark ? 'bg-white/10 text-white/50' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/50',
  }
  if (!isVisible) {
    return <span className={`px-1.5 py-0.5 rounded text-xs select-none ${isDark ? 'bg-white/5 text-white/20' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/20'}`}>████</span>
  }
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[severity] ?? colors.info}`}>{severity}</span>
}

function DataCell({ value, isVisible, isSensitive, isDark, piiMasked }) {
  const displayValue = (piiMasked && isSensitive && value) ? maskPiiValue(value) : (value ?? '')
  return (
    <td className={`px-2 py-1.5 text-xs font-mono border-b ${isDark ? 'border-white/5' : 'border-elastic-dev-blue/5'}`}>
      {isVisible ? (
        <span className={isSensitive ? (isDark ? 'text-elastic-pink' : 'text-elastic-blue') : isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}>
          {displayValue}
        </span>
      ) : (
        <span className={`select-none ${isDark ? 'text-white/15' : 'text-elastic-dev-blue/15'}`}>████</span>
      )}
    </td>
  )
}

function RoleSummary({ selectedRole, isDark }) {
  return (
    <div className={`mt-3 pt-3 border-t flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
      <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-elastic-ink/70'}`}>
        {selectedRole.summary}
      </p>
    </div>
  )
}

function AccessFunnel({ selectedRole, isDark }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {accessLevels.map((level, i) => {
        const hasAccess = selectedRole.levels[level.id]?.access
        const detail    = selectedRole.levels[level.id]?.detail ?? level.description
        return (
          <div key={level.id} className="flex flex-col items-center w-full">
            {i > 0 && (
              <div className={`w-px h-2 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/15'}`} />
            )}
            <div className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-300 ${
              hasAccess
                ? isDark ? 'border-elastic-blue/40 bg-elastic-blue/10' : 'border-elastic-blue/25 bg-elastic-blue/[0.07]'
                : isDark ? 'border-white/10 opacity-30' : 'border-elastic-dev-blue/10 opacity-30'
            }`}>
              <FontAwesomeIcon
                icon={level.icon}
                className={`text-sm flex-shrink-0 ${hasAccess ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{level.name}</div>
                <div className={`text-xs font-mono leading-tight truncate ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'}`}>{detail}</div>
              </div>
              <FontAwesomeIcon
                icon={hasAccess ? faCheckCircle : faTimesCircle}
                className={`text-sm flex-shrink-0 ${hasAccess ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : 'text-red-400/50'}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AccessLevelsHorizontal({ selectedRole, isDark }) {
  return (
    <div className="flex items-center gap-1.5">
      {accessLevels.map((level, i) => {
        const hasAccess = selectedRole.levels[level.id]?.access
        const detail    = selectedRole.levels[level.id]?.detail ?? level.description
        return (
          <div key={level.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <FontAwesomeIcon
                icon={faArrowRight}
                className={`text-[8px] flex-shrink-0 ${isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}`}
              />
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-300 flex-shrink-0 ${
              hasAccess
                ? isDark ? 'border-elastic-blue/40 bg-elastic-blue/10' : 'border-elastic-blue/25 bg-elastic-blue/[0.07]'
                : isDark ? 'border-white/10 opacity-30' : 'border-elastic-dev-blue/10 opacity-30'
            }`}>
              <FontAwesomeIcon
                icon={level.icon}
                className={`text-[10px] flex-shrink-0 ${hasAccess ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}
              />
              <div>
                <div className={`text-[10px] font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{level.name}</div>
                <div className={`text-[9px] font-mono leading-tight ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/60'}`}>{detail}</div>
              </div>
              <FontAwesomeIcon
                icon={hasAccess ? faCheckCircle : faTimesCircle}
                className={`text-[9px] flex-shrink-0 ${hasAccess ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : 'text-red-400/50'}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function AccessControlSceneDev({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // ── Derive configurable values from metadata ─────────────────────────────
  const effectiveDomain = metadata.domain?.trim() || 'acme.com'

  const effectiveDepts = useMemo(() => {
    const raw = metadata.departments || ''
    const parsed = raw.split(',').map(s => s.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : DEFAULT_DEPTS
  }, [metadata.departments])

  const effectiveActions = useMemo(() => {
    const parsed = (metadata.actions || '').split(',').map(s => s.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : null
  }, [metadata.actions])

  const effectiveSensitive1 = useMemo(() => {
    const parsed = (metadata.sensitive1Values || '').split(',').map(s => s.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : null
  }, [metadata.sensitive1Values])

  const effectiveSensitive2 = useMemo(() => {
    const parsed = (metadata.sensitive2Values || '').split(',').map(s => s.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : null
  }, [metadata.sensitive2Values])

  // Remap log data: domain, departments, and optionally action / sensitive field values
  const effectiveLogData = useMemo(() => {
    let s1Idx = 0
    let s2Idx = 0
    return sampleLogData.map((row, i) => {
      const newRow = {
        ...row,
        user:       row.user.replace(/@[\w.-]+$/, `@${effectiveDomain}`),
        department: effectiveDepts[DEFAULT_DEPTS.indexOf(row.department) % effectiveDepts.length] ?? effectiveDepts[0],
      }
      if (effectiveActions)    newRow.action      = effectiveActions[i % effectiveActions.length]
      if (effectiveSensitive1 && row.user_id !== null) newRow.user_id = effectiveSensitive1[s1Idx++ % effectiveSensitive1.length]
      if (effectiveSensitive2 && row.ssn         !== null) newRow.ssn         = effectiveSensitive2[s2Idx++ % effectiveSensitive2.length]
      return newRow
    })
  }, [effectiveDomain, effectiveDepts, effectiveActions, effectiveSensitive1, effectiveSensitive2])

  // Override column labels from metadata
  const effectiveFields = useMemo(() => allFields.map(f => ({
    ...f,
    label: metadata[`label_${f.key}`]?.trim() || f.label,
  })), [metadata])

  // Dynamic ABAC dept values
  const effectiveAbacAttrs = useMemo(() => [
    { id: 'department', name: 'Dept',   icon: faBuilding, values: effectiveDepts },
    { id: 'region',     name: 'Region', icon: faGlobe,    values: ['US', 'EU', 'APAC'] },
  ], [effectiveDepts])

  const [selectedRole, setSelectedRole] = useState(roles[0])
  const [piiMasked, setPiiMasked]       = useState(false)
  const [abacFilters, setAbacFilters]   = useState({ department: null, region: null })
  const [lastDelta, setLastDelta] = useState(null)

  const headerRef      = useRef(null)
  const controlBarRef  = useRef(null)
  const tableRef       = useRef(null)
  const tbodyRef       = useRef(null)
  const prevVisibleIds = useRef(new Set(effectiveLogData.map(d => d.id)))

  useEffect(() => {
    const els = [headerRef.current, controlBarRef.current, tableRef.current]
    els.forEach(el => { if (el) el.style.opacity = '0' })

    if (headerRef.current)
      animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'easeOutCubic' })
    if (controlBarRef.current)
      animate(controlBarRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 500, delay: 150, easing: 'easeOutCubic' })
    if (tableRef.current)
      animate(tableRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, delay: 300, easing: 'easeOutCubic' })
  }, [])

  const computeVisible = useCallback((role, filters) =>
    effectiveLogData.filter(row => {
      if (!role.documentFilter(row)) return false
      if (filters.department && row.department !== filters.department) return false
      if (filters.region     && row.region     !== filters.region)     return false
      return true
    }), [effectiveLogData])

  const visibleDocs   = computeVisible(selectedRole, abacFilters)
  const visibleDocIds = new Set(visibleDocs.map(d => d.id))
  const hiddenDocs    = effectiveLogData.length - visibleDocs.length
  const hiddenFields  = effectiveFields.length - selectedRole.visibleFields.length
  const roleHasPii    = effectiveFields.some(f => f.sensitive && selectedRole.visibleFields.includes(f.key))

  useEffect(() => {
    const prev = prevVisibleIds.current
    const curr = visibleDocIds
    const newlyVisible = [...curr].filter(id => !prev.has(id))
    const newlyHidden  = [...prev].filter(id => !curr.has(id))

    if ((newlyVisible.length > 0 || newlyHidden.length > 0) && tbodyRef.current) {
      newlyVisible.forEach(id => {
        const row = tbodyRef.current.querySelector(`[data-rowid="${id}"]`)
        if (row) animate(row, { backgroundColor: ['rgba(11,100,221,0.12)', 'transparent'], duration: 700, easing: 'easeOutCubic' })
      })
      newlyHidden.forEach(id => {
        const row = tbodyRef.current.querySelector(`[data-rowid="${id}"]`)
        if (row) animate(row, { backgroundColor: ['rgba(220,38,38,0.08)', 'transparent'], duration: 700, easing: 'easeOutCubic' })
      })
      setLastDelta(curr.size - prev.size)
    }
    prevVisibleIds.current = new Set(curr)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, abacFilters])

  // Resolve a role's intended ABAC default to the (possibly remapped) attribute values
  const resolveAbacDefault = useCallback((role) => {
    const next = { department: null, region: null }
    const deptDefault = role.abacDefault?.department
    if (deptDefault) {
      const idx = DEFAULT_DEPTS.indexOf(deptDefault)
      next.department = idx >= 0 ? (effectiveDepts[idx] ?? effectiveDepts[0]) : deptDefault
    }
    if (role.abacDefault?.region) next.region = role.abacDefault.region
    return next
  }, [effectiveDepts])

  const selectRole = useCallback((role) => {
    setSelectedRole(role)
    setAbacFilters(resolveAbacDefault(role))
    const hasPii = allFields.some(f => f.sensitive && role.visibleFields.includes(f.key))
    if (!hasPii) setPiiMasked(false)
  }, [resolveAbacDefault])

  const toggleAbacFilter = (attrId, value) =>
    setAbacFilters(prev => ({ ...prev, [attrId]: prev[attrId] === value ? null : value }))

  return (
    <div className="w-full flex flex-col h-full px-6 pt-4 pb-2 overflow-hidden">
      <div className="max-w-[95%] mx-auto w-full flex flex-col h-full gap-3">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div ref={headerRef} className="text-center flex-shrink-0">
          <p className={`text-sm font-semibold uppercase tracking-eyebrow pt-8 mb-4 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            Multi-Layer Security
          </p>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-headline mb-4">
            <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}>See What </span>
            <span className={isDark ? 'text-elastic-pink' : 'text-elastic-blue'}>They</span>
            <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}> See</span>
          </h2>
          <p className={`leading-paragraph text-lg md:text-xl max-w-5xl mx-auto pt-1 pb-4 ${isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'}`}>
            Role and attribute-based controls, so every user sees exactly what they need, nothing more.
          </p>
        </div>

        {/* ── Horizontal control bar ───────────────────────────────────── */}
        <div
          ref={controlBarRef}
          className={`flex items-center gap-4 px-4 py-2.5 rounded-xl border flex-shrink-0 ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'
          }`}
        >
          {/* RBAC Role */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faShieldHalved} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Role</span>
            </div>
            <div className="flex gap-2">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                    selectedRole.id === role.id
                      ? isDark ? 'border-elastic-blue/50 bg-elastic-blue/15 text-white' : 'border-elastic-blue/40 bg-elastic-blue/[0.08] text-elastic-blue'
                      : isDark ? 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/25'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={role.icon}
                    className={`text-xs ${selectedRole.id === role.id ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : 'opacity-40'}`}
                  />
                  {role.name}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className={`w-px self-stretch ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />

          {/* ABAC Filters */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faFilter} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>ABAC</span>
            </div>
            {effectiveAbacAttrs.map(attr => (
              <div key={attr.id} className="flex items-center gap-1.5">
                <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                  <FontAwesomeIcon icon={attr.icon} className="text-[11px]" /> {attr.name}:
                </span>
                <div className="flex gap-1.5">
                  {attr.values.map(val => (
                    <button
                      key={val}
                      onClick={() => toggleAbacFilter(attr.id, val)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        abacFilters[attr.id] === val
                          ? isDark ? 'bg-elastic-teal text-elastic-dev-blue font-semibold' : 'bg-elastic-blue text-white font-semibold'
                          : isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom row: access card + table ─────────────────────────── */}
        <div ref={tableRef} className="flex gap-3 flex-1 min-h-0">

          {/* Access card */}
          <div className={`w-64 flex-shrink-0 rounded-xl border p-3 flex flex-col ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'
          }`}>
            <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
              <FontAwesomeIcon icon={faLock} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Access Levels</span>
            </div>
            <AccessFunnel selectedRole={selectedRole} isDark={isDark} />
            <RoleSummary selectedRole={selectedRole} isDark={isDark} />
          </div>

          {/* Data table */}
          <div className={`flex-1 min-h-0 rounded-xl border flex flex-col overflow-hidden ${
            isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-elastic-dev-blue/10'
          }`}>

            {/* Toolbar — index path + PII toggle + status badges */}
            <div className={`px-3 py-1.5 border-b flex items-center justify-between flex-shrink-0 ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10'
            }`}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faDatabase} className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                  {selectedRole.levels.index.detail}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Persistent visibility badge */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  lastDelta !== null && lastDelta > 0
                    ? isDark ? 'bg-elastic-teal/15 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'
                    : lastDelta !== null && lastDelta < 0
                      ? 'bg-red-500/15 text-red-400'
                      : isDark ? 'bg-white/10 text-white/50' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/50'
                }`}>
                  {lastDelta !== null && lastDelta !== 0 && (
                    <span>{lastDelta > 0 ? '+' : ''}{lastDelta} · </span>
                  )}
                  {visibleDocs.length} of {effectiveLogData.length} rows visible
                </div>
                {hiddenDocs > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10">
                    <FontAwesomeIcon icon={faFilter} className="text-red-400 text-[9px]" />
                    <span className="text-[10px] text-red-400 font-medium">{hiddenDocs} filtered</span>
                  </div>
                )}
                {hiddenFields > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-elastic-pink/10">
                    <FontAwesomeIcon icon={faEyeSlash} className="text-elastic-pink text-[9px]" />
                    <span className="text-[10px] text-elastic-pink font-medium">{hiddenFields} hidden</span>
                  </div>
                )}
                {hiddenDocs === 0 && hiddenFields === 0 && !piiMasked && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${isDark ? 'bg-elastic-teal/10' : 'bg-elastic-blue/10'}`}>
                    <FontAwesomeIcon icon={faUnlock} className={`text-[9px] ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    <span className={`text-[10px] font-medium ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Full Access</span>
                  </div>
                )}
                {/* PII masking toggle — inline in toolbar */}
                <div
                  className={`flex items-center gap-1.5 pl-2 border-l transition-opacity ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'} ${roleHasPii ? '' : 'opacity-40'}`}
                  title={roleHasPii ? 'Toggle PII field masking' : 'This role has no PII fields in view'}
                >
                  <FontAwesomeIcon icon={faUserSecret} className={`text-[9px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`} />
                  <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>PII</span>
                  <button
                    onClick={() => setPiiMasked(v => !v)}
                    disabled={!roleHasPii}
                    className={`relative w-8 h-4 rounded-full transition-all duration-300 ${roleHasPii ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                      piiMasked
                        ? isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'
                        : isDark ? 'bg-white/20' : 'bg-elastic-dev-blue/20'
                    }`}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-300"
                      style={{ left: piiMasked ? '18px' : '2px' }}
                    />
                  </button>
                  {piiMasked && (
                    <FontAwesomeIcon icon={faMask} className={`text-[9px] ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-elastic-dev-blue' : 'bg-white'}`}>
                  <tr>
                    {effectiveFields.map(field => {
                      const isVisible = selectedRole.visibleFields.includes(field.key)
                      return (
                        <th
                          key={field.key}
                          className={`px-2 py-1.5 text-left text-xs uppercase tracking-wider border-b whitespace-nowrap transition-all duration-300 ${
                            isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'
                          } ${isVisible
                            ? isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                            : isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {field.label}
                            {field.sensitive && <FontAwesomeIcon icon={faLock} className={`text-[8px] ${isVisible ? (isDark ? 'text-elastic-pink' : 'text-elastic-blue') : ''}`} />}
                            {!isVisible && <FontAwesomeIcon icon={faEyeSlash} className="text-[8px]" />}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {effectiveLogData.map(row => {
                    const isDocVisible = visibleDocIds.has(row.id)
                    return (
                      <tr
                        key={row.id}
                        data-rowid={row.id}
                        className={`transition-opacity duration-300 ${
                          isDocVisible
                            ? isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-elastic-dev-blue/[0.02]'
                            : 'opacity-20'
                        }`}
                      >
                        {effectiveFields.map(field => {
                          const isFieldVisible = selectedRole.visibleFields.includes(field.key) && isDocVisible
                          if (field.key === 'severity') {
                            return (
                              <td key={field.key} className={`px-2 py-1.5 border-b ${isDark ? 'border-white/5' : 'border-elastic-dev-blue/5'}`}>
                                <SeverityBadge severity={row.severity} isVisible={isFieldVisible} isDark={isDark} />
                              </td>
                            )
                          }
                          return (
                            <DataCell
                              key={field.key}
                              value={row[field.key]}
                              isVisible={isFieldVisible}
                              isSensitive={field.sensitive}
                              isDark={isDark}
                              piiMasked={piiMasked}
                            />
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Status bar */}
            <div className={`px-3 py-1 border-t flex items-center justify-between text-[10px] flex-shrink-0 ${
              isDark ? 'bg-white/[0.02] border-white/10 text-white/40' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10 text-elastic-dev-blue/40'
            }`}>
              <div className="flex items-center gap-1.5">
                <span>Role:</span>
                <span className={`font-bold ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{selectedRole.name}</span>
                {(abacFilters.department || abacFilters.region) && <span>+ ABAC active</span>}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  <FontAwesomeIcon icon={faCheckCircle} className={`mr-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                  {visibleDocs.length} visible
                </span>
                {hiddenDocs > 0 && (
                  <span>
                    <FontAwesomeIcon icon={faTimesCircle} className="mr-1 text-red-400" />
                    {hiddenDocs} hidden
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessControlSceneDev
