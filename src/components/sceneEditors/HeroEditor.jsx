import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function HeroEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.hero || {}
  const update = (patch) => onUpdateSceneMetadata('hero', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Hero Content
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Text Alignment
        </label>
        <select
          value={meta.align || 'left'}
          onChange={(e) => update({ align: e.target.value })}
          className={inputClass}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
        </select>
        <p className={hintClass}>
          Alignment of the revealed banner (logo, title, subtitle)
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Typing Text
        </label>
        <input
          type="text"
          value={meta.typingText || ''}
          onChange={(e) => update({ typingText: e.target.value })}
          className={inputClass}
          placeholder="The Elastic Search AI Platform"
        />
        <p className={hintClass}>
          Text that types out in the search bar animation
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Banner Title
        </label>
        <input
          type="text"
          value={meta.bannerTitle || ''}
          onChange={(e) => update({ bannerTitle: e.target.value })}
          className={inputClass}
          placeholder="The Elastic Search AI Platform:"
        />
        <p className={hintClass}>
          First line of the banner title
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Banner Highlight Text
        </label>
        <input
          type="text"
          value={meta.bannerHighlight || ''}
          onChange={(e) => update({ bannerHighlight: e.target.value })}
          className={inputClass}
          placeholder="Transforming Data into Action"
        />
        <p className={hintClass}>
          Second line (highlighted in gradient/blue)
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Banner Subtitle
        </label>
        <input
          type="text"
          value={meta.bannerSubtitle || ''}
          onChange={(e) => update({ bannerSubtitle: e.target.value })}
          className={inputClass}
          placeholder="Unleash the Power of Real-Time Insights, Scale, and Innovation"
        />
        <p className={hintClass}>
          Subtitle text below the main title
        </p>
      </div>
    </div>
  )
}
