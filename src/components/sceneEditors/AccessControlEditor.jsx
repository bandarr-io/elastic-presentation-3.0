import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function AccessControlEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass }) {
  const meta = sceneMetadata?.['access-control'] || {}
  const update = (patch) => onUpdateSceneMetadata('access-control', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`
  const panelClass = `p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`
  const panelTitleClass = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Access Control Content
      </h3>

      <div className="grid grid-cols-2 gap-4 items-stretch">

        {/* Identity */}
        <div className={panelClass}>
          <h4 className={panelTitleClass}>
            Identity
          </h4>
          <div>
            <label className={fieldLabelClass(isDark)}>
              Company Domain
            </label>
            <input
              type="text"
              value={meta.domain || ''}
              onChange={(e) => update({ domain: e.target.value })}
              className={inputClass}
              placeholder="acme.com"
            />
            <p className={hintClass}>
              Replaces the email domain in all log entries (e.g. user@acme.com)
            </p>
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>
              Departments
            </label>
            <input
              type="text"
              value={meta.departments || ''}
              onChange={(e) => update({ departments: e.target.value })}
              className={inputClass}
              placeholder="Engineering, Finance, Sales, IT"
            />
            <p className={hintClass}>
              Comma-separated list. Updates the ABAC department filter chips and redistributes log entries automatically.
            </p>
          </div>
        </div>

        {/* Column Labels */}
        <div className={panelClass}>
          <h4 className={panelTitleClass}>
            Column Labels
          </h4>
          <p className={`text-xs ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
            Rename table columns to match your terminology.
          </p>
          {[
            { key: 'action', placeholder: 'Action' },
            { key: 'credit_card', placeholder: 'Credit Card' },
            { key: 'ssn', placeholder: 'SSN' },
          ].map(({ key, placeholder }) => (
            <div key={key}>
              <label className={fieldLabelClass(isDark)}>
                {placeholder} column
              </label>
              <input
                type="text"
                value={meta[`label_${key}`] || ''}
                onChange={(e) => update({ [`label_${key}`]: e.target.value })}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

      </div>

      {/* Sample Values */}
      <div className={`p-4 rounded-xl space-y-4 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
        <div>
          <h4 className={panelTitleClass}>
            Sample Values
          </h4>
          <p className={hintClass}>
            Comma-separated values distributed across log entries. Leave blank to use defaults.
          </p>
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>
            Action values
          </label>
          <input
            type="text"
            value={meta.actions || ''}
            onChange={(e) => update({ actions: e.target.value })}
            className={inputClass}
            placeholder="login_success, payment_processed, config_change"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>
            {meta.label_credit_card || 'Credit Card'} values
          </label>
          <input
            type="text"
            value={meta.sensitive1Values || ''}
            onChange={(e) => update({ sensitive1Values: e.target.value })}
            className={inputClass}
            placeholder="4532-8821-3347-9912, 5421-3345-9921-7788"
          />
          <p className={hintClass}>
            Masking is format-aware: NNNN-NNNN-NNNN-NNNN → keeps first/last group. Other formats masked generically.
          </p>
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>
            {meta.label_ssn || 'SSN'} values
          </label>
          <input
            type="text"
            value={meta.sensitive2Values || ''}
            onChange={(e) => update({ sensitive2Values: e.target.value })}
            className={inputClass}
            placeholder="123-45-6789, EMP-2024-0042, ID-94821"
          />
          <p className={hintClass}>
            NNN-NN-NNNN → SSN masking. Any other format (e.g. EMP-2024-0042) → generic masking.
          </p>
        </div>
      </div>
    </div>
  )
}
