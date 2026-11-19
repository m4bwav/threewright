// Loops and polygons on a unit sphere, plain arrays [x, y, z], no three.js needed.
// Edges are great-circle arcs (the shortest path between two corners), not lines
// of constant latitude. Same axes as latLonToVector3 in index.html: y is north.

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

export function latLonToUnit(lat, lon) {
  const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(l), Math.sin(p), Math.cos(p) * Math.sin(l)];
}

// Gnomonic projection onto the plane touching the sphere at `center`. It sends
// every great circle to a straight line, so a flat polygon test is exact.
// Returns null for points on the far hemisphere, which it cannot show.
export function gnomonic(q, center, e1, e2) {
  const d = dot(q, center);
  return d <= 1e-9 ? null : [dot(q, e1) / d, dot(q, e2) / d];
}

// Is `q` inside the loop `corners` (unit vectors, in order)? The loop must fit in
// one hemisphere; its corner average is used as the projection centre.
export function pointInSphericalPolygon(q, corners) {
  const c = unit(corners.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]));
  const e1 = unit(cross(Math.abs(c[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0], c)), e2 = cross(c, e1);
  const p = gnomonic(q, c, e1, e2);
  if (!p) return false;
  const poly = corners.map((v) => gnomonic(v, c, e1, e2));
  let inside = false; // crossing-number test in the tangent plane
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Where do arcs a-b and c-d cross? The two great circles meet at the pair of
// points along cross(normalAB, normalCD); keep the one that lies on both arcs.
export function arcIntersection(a, b, c, d) {
  const n = cross(cross(a, b), cross(c, d));
  if (Math.hypot(n[0], n[1], n[2]) < 1e-12) return null; // same or parallel circles
  const between = (u, v, p) => dot(cross(u, p), cross(p, v)) >= -1e-12 && dot(u, p) > 0 && dot(v, p) > 0;
  for (const s of [1, -1]) {
    const p = unit(n).map((x) => x * s);
    if (between(a, b, p) && between(c, d, p)) return p;
  }
  return null;
}
