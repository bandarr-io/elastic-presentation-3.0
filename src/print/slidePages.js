// Pure: which printed pages a deck produces. One page per enabled scene, in
// deck order. Scenes are printed in their opening state (beat 0). Speaker notes
// are never printed.

export function slidePages(scenes = []) {
  return scenes.map((scene, i) => ({ key: `${scene.id}#${i}`, sceneId: scene.id, beat: 0 }))
}
