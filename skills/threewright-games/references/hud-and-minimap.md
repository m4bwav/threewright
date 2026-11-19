# HUD and minimap notes

Short notes for game HUDs; add to them as games need more. Unverified in a threewright page unless a line says otherwise.

- Minimap on a flat world: a second `OrthographicCamera` looking down, rendered into a small viewport (`renderer.setViewport` and `setScissor` after the main render) or a `WebGLRenderTarget` shown in the HUD. Draw it on a layer set so labels and icons appear only there.
- Minimap on a planet (a small sphere the player walks round): project each point onto the player's tangent frame instead, `x = dot(p, right)`, `y = dot(p, forward)` for unit vectors `p` from the planet centre. That is an orthographic view from above the player, so the near hemisphere reads like a flat map.
- Points with `dot(p, up) < 0` are on the far side: do not plot them where they land (they would overlap near things); clamp them to the minimap rim along their `(x, y)` direction as off-screen pointers.
- Idea from the robinduckett/boo-mas game (2026-11-18; no licence, so the idea only).
