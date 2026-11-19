# Particle notes

- Cheap ambient particles (snow, dust, embers) can move entirely in the vertex shader: position = a function of `uTime` and a per-particle seed attribute, wrapped into a box round the camera. No CPU update and no buffer upload per frame; one draw call. Use compute (WebGPU) when particles must collide or react.
- On a planet, wind is a tangent field: build the wind vector, then remove its component along the surface normal (`w - n * dot(w, n)`). A smooth tangent field on a sphere must have at least one calm point (the hairy ball theorem), so place the calm spot somewhere it does not matter.
- Idea from the robinduckett/boo-mas game (2026-11-18; no licence, so the idea only). Not yet run in a threewright page.
