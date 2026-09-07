/**
 * Colours for the 3D render itself. Kept out of components for the same
 * reason theme.css exists: nothing should hardcode a hex inline.
 *
 * These are the studio set, not UI chrome — the "no gradients" rule in §8
 * applies to panels and buttons, not to the render.
 */
export const sceneTheme = {
  /** Studio sweep behind the product: soft falloff from top to floor. */
  backdropTop: '#e4e4e4',
  backdropBottom: '#fdfdfd',
} as const
