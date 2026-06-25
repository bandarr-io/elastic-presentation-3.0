import { ICON_OPTIONS } from '../../data/iconOptions'

/**
 * Dropdown picker for choosing a scene icon by name.
 * Writes the FontAwesome icon name (e.g. 'database') back via onChange.
 */
export default function IconSelect({ value, onChange, inputClass, isDark, label = 'Icon' }) {
  return (
    <div>
      <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {ICON_OPTIONS.map((opt) => (
          <option key={opt.name} value={opt.name}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
