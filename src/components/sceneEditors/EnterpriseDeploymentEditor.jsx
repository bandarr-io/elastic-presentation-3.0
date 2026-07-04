export default function EnterpriseDeploymentEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['enterprise-deployment'] || {}
  const update = (patch) => onUpdateSceneMetadata('enterprise-deployment', { ...meta, ...patch })

  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Reference Architecture" />
          </div>
          <div>
            <label className={labelClass}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Enterprise deployment " />
          </div>
          <div>
            <label className={labelClass}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="components" />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Leave blank to use the mode-aware default." />
          </div>
        </div>
        <p className={`text-xs mt-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
          Air-gapped mode (Package Registry, Artifact Registry, Maps Service, GeoIP) is toggled from the nav bar while viewing this scene.
        </p>
      </div>
    </div>
  )
}
