// Default roadshow session schedule for the Agenda scene.
// Shared between App.jsx (rendering) and SceneSettings.jsx (editing) so the
// settings panel can seed its editor from the same source of truth.
export const DEFAULT_AGENDA_ITEMS = [
  { time: '8:00 – 8:15', title: 'Welcome & Strategic Framing', sceneIds: [] },
  { time: '8:15 – 9:00', title: 'Customer Technology Environment Deep Dive', sceneIds: [] },
  { time: '9:00 – 9:45', title: 'Platform Demo — Observability Core', sceneIds: [] },
  { time: '9:45 – 10:15', title: 'Break + Informal Technical Q&A', sceneIds: [] },
  { time: '10:15 – 11:00', title: 'AI, Security, Search + Tool Consolidation', sceneIds: [] },
  { time: '11:00 – 11:50', title: 'Deployment, Gaps, Pricing, POC, References', sceneIds: [] },
  { time: '11:50 – 12:00', title: 'Customer Use Cases — In Production Today', sceneIds: [] },
]
