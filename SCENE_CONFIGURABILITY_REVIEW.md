# Scene Configurability Review

Review of every scene against the Settings panel to determine what can be edited
today and what is needed to make **all** scenes fully configurable.

## How configuration works (two tiers)

- **File:** @src/components/SceneSettings.jsx — the Settings panel + the `useSceneConfiguration` hook that persists config to `localStorage` (`STORAGE_KEY = 'presentation-scene-config'`).
- **File:** @src/App.jsx — defines `allScenes` (the full deck) and wires per-scene `metadata` into each scene via `sceneProps` (≈ lines 1065–1182).

There are **two independent levels** of "configurable":

1. **Structural config — applies to ALL 29 scenes.** Handled by `SceneItem` (@src/components/SceneSettings.jsx) on the *Scenes* tab:
   - Enable/disable (`toggleScene`)
   - Drag-to-reorder (`updateOrder`)
   - Duration edit (`updateDuration`)
   - **Scene Title** edit (`onUpdateSceneMetadata(scene.id, { title })`) — line 478
   So at the structural level, every scene is already configurable.

2. **Content/text config — only SOME scenes.** Handled by `CustomizationsPanel` (@src/components/SceneSettings.jsx line 1399). It edits each scene's `metadata` blob (eyebrow, titles, subtitles, cards, stats, etc.). The catch: the scene must (a) appear in the panel's `<select>` dropdown (lines 1447–1462) **and** (b) have a matching `selectedScene === '<id>'` editor form, **and** (c) be passed its `metadata` in @src/App.jsx.

The gap the request is about is tier 2: **content editing is missing for 12 of 29 scenes.**

## Full scene inventory

`✓` = editable, `❌` = not editable, `—` = N/A

| # | Scene id | Structural (Scenes tab) | Content editor | Scene accepts `metadata`? |
|---|----------|:---:|:---:|:---:|
| 1 | hero | ✓ | ✓ (dropdown) | yes |
| 2 | agenda | ✓ | ✓ (own *Agenda* tab — `AgendaEditor`) | yes |
| 3 | team | ✓ | ✓ (own *Team* tab — `TeamEditorPanel`) | via `TeamContext` |
| 4 | about | ✓ | ✓ (dropdown) | yes |
| 5 | business-value | ✓ | ✓ (dropdown) | yes |
| 6 | current-architecture | ✓ | ❌ | **yes (ready)** |
| 7 | elastic-value | ✓ | ❌ | **yes (ready)** |
| 8 | value-by-team | ✓ | ❌ | **yes (ready)** |
| 9 | security-use-cases | ✓ | ❌ | **yes (ready)** |
| 10 | unified-strategy | ✓ | ✓ (dropdown) | yes |
| 11 | ai-assistant | ✓ | ❌ | **yes (ready)** |
| 12 | security-narrative-visual | ✓ | ❌ | **yes (ready)** |
| 13 | security | ✓ | ❌ | **no** (stage-driven) |
| 14 | licensing | ✓ | ❌ | **no** (hardcoded) |
| 15 | customer-architect | ✓ | ❌ | **yes (ready)** |
| 16 | services | ✓ | ✓ (dropdown) | yes |
| 17 | next-steps | ✓ | ✓ (dropdown) | yes |
| 18 | panel | ✓ | ✓ (dropdown) | yes |
| 19 | problem-patterns | ✓ | ✓ (dropdown) | yes |
| 20 | data-explosion | ✓ | ✓ (dropdown) | yes |
| 21 | logsdb | ✓ | ❌ | **yes (ready)** |
| 22 | data-mesh | ✓ | ✓ (dropdown) | yes |
| 23 | cross-cluster | ✓ | ✓ (dropdown) | yes |
| 24 | schema | ✓ | ✓ (dropdown) | yes |
| 25 | access-control | ✓ | ✓ (dropdown) | yes |
| 26 | data-tiering | ✓ | ❌ | **no** (run-driven) |
| 27 | consolidation | ✓ | ✓ (dropdown) | yes |
| 28 | esql | ✓ | ✓ (dropdown) | yes |
| 29 | platform-operations | ✓ | ❌ | **yes (ready)** |

**Content-editable today: 17 / 29** (15 in the dropdown + Agenda + Team).

## The gap — 12 scenes not content-editable

### Group A — Metadata-ready (9 scenes): UI work only

These already accept a `metadata` prop with rich defaults **and** are already passed
their metadata in @src/App.jsx. They are missing only (1) a dropdown `<option>` and
(2) an editor form in `CustomizationsPanel`. No scene-file or App.jsx changes needed.

- **File:** @src/scenes/CurrentArchitectureScene.jsx — `metadata`: eyebrow, titlePart1/2, subtitle, infrastructure, appStack, currentStack, pipeline, programStatus (line 167+).
- **File:** @src/scenes/ElasticValueScene.jsx — `metadata`: heroStats, stats, eyebrow, titlePlain/Accent, subtitle, bottomLine (line 32+).
- **File:** @src/scenes/ValueByTeamScene.jsx — `metadata`: teams, eyebrow, titlePlain/Accent, subtitle, impactStat/Label/Detail (line 82+).
- **File:** @src/scenes/SecurityUseCasesScene.jsx — `metadata`: useCases, eyebrow, titleAccent/Plain, subtitle (line 130+).
- **File:** @src/scenes/AIAssistantScene.jsx — `metadata`: titleParts, eyebrow, stages, todayLabel, roadmapLabel, subtitle (line 49+).
- **File:** @src/scenes/SecurityNarrativeVisualScene.jsx — `metadata`: eyebrow, beats (line 70+). ❓ Lighter metadata surface — most content lives in the `BEATS` constant; may want to expand override support before exposing.
- **File:** @src/scenes/CustomerArchitectScene.jsx — `metadata`: eyebrow, headingPlain/Accent, subtitle, caTagline/Title/Subtitle/Journey/Champions, caPillars, caJourneyPhases, supportLayers (line 50+).
- **File:** @src/scenes/LogsDBScene.jsx — `metadata`: titleParts, eyebrow, outcomes, modes, subtitle (line 91+).
- **File:** @src/scenes/PlatformOperationsScene.jsx — `metadata`: pillars, eyebrow, titleAccent/Plain, subtitle, footer (line 50+).

### Group B — No metadata support (3 scenes): scene refactor required

These do not accept `metadata` at all and are **not** passed metadata in @src/App.jsx.
Making them content-editable requires: add a `metadata` prop + default fallbacks in the
scene, wire `metadata` into `sceneProps` in App.jsx, then add the dropdown option + editor form.

- **File:** @src/scenes/SecurityScene.jsx — signature `({ externalStage, onStageChange, playSignal, phaseAdvanceSignal, onAlertPhaseChange })` (line 202). Animation/stage-driven; all copy is hardcoded.
- **File:** @src/scenes/LicensingScene.jsx — signature `LicensingScene()` (line 107), no props. Tier feature lists hardcoded in module constants (`freeOpenFeatures`, etc.).
- **File:** @src/scenes/DataTieringScene.jsx — signature `({ isRunning, setIsRunning, resetSignal })` (line 206). Interaction-driven; copy hardcoded.

## Recommended path to "all scenes configurable"

1. **Phase 1 (low effort, high value):** Add the 9 Group A scenes to the `CustomizationsPanel` dropdown + editor forms. Pure UI work in @src/components/SceneSettings.jsx; the data plumbing already exists.
2. **Phase 2 (medium effort):** Refactor the 3 Group B scenes to accept `metadata`, wire them in @src/App.jsx, then add their editors.
3. ❓ **Decision needed:** For animation-heavy scenes (security, data-tiering, security-narrative-visual) — do you want full text editing of every label, or just the header (eyebrow/title/subtitle)? Header-only is much smaller and keeps the animations safe.

ASSUMPTION: "Configurable" means editing on-screen text/content via the Settings panel (not changing animation behavior or layout). If you also want layout/behavior toggles, that's a larger scope.
