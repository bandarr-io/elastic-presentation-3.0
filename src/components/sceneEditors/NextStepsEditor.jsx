import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function NextStepsEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['next-steps'] || {}
  const update = (patch) => onUpdateSceneMetadata('next-steps', { ...meta, ...patch })

  return (
    <div className="space-y-6 mt-6">

      <h3 className={sectionTitleClass(isDark)}>
        Next Steps — Header
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="What Comes Next"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Plain</label>
        <input
          type="text"
          value={meta.headingPlain || ''}
          onChange={(e) => update({ headingPlain: e.target.value })}
          className={inputClass}
          placeholder="Ready to "
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Accent</label>
        <input
          type="text"
          value={meta.headingAccent || ''}
          onChange={(e) => update({ headingAccent: e.target.value })}
          className={inputClass}
          placeholder="Get Started?"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Subtitle</label>
        <textarea
          rows={2}
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="Here's a clear path forward — we'll guide you every step of the way."
        />
      </div>

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        Next Steps — Your Contact Info
      </h3>
      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
        Shown in the contact panel at the bottom right of the scene.
      </p>

      <div>
        <label className={fieldLabelClass(isDark)}>Panel Heading</label>
        <input
          type="text"
          value={meta.ctaHeading || ''}
          onChange={(e) => update({ ctaHeading: e.target.value })}
          className={inputClass}
          placeholder="Let's keep the momentum going."
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Your Name / Role</label>
        <input
          type="text"
          value={meta.ctaName || ''}
          onChange={(e) => update({ ctaName: e.target.value })}
          className={inputClass}
          placeholder="Jane Smith · Solutions Architect"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Email</label>
        <input
          type="text"
          value={meta.ctaEmail || ''}
          onChange={(e) => update({ ctaEmail: e.target.value })}
          className={inputClass}
          placeholder="jane.smith@elastic.co"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Scheduling Link / Phone</label>
        <input
          type="text"
          value={meta.ctaPhone || ''}
          onChange={(e) => update({ ctaPhone: e.target.value })}
          className={inputClass}
          placeholder="calendly.com/jane-smith"
        />
      </div>

    </div>
  )
}
