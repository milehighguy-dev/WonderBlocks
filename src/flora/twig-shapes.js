import * as T from '../../vendor/three.module.js';

// Authored woody twigs. Centerlines, section envelopes, bud positions,
// and bark coordinates are independent of the visual-reference meshes.
const tau = Math.PI * 2;
const clamp = T.MathUtils.clamp;
const mix = T.MathUtils.lerp;
const smooth = t => t * t * (3 - 2 * t);

function envelope(values, t) {
  const p = clamp(t, 0, 1) * (values.length - 1);
  const i = Math.min(values.length - 2, Math.floor(p));
  return mix(values[i], values[i + 1], smooth(p - i));
}

const designs = {
  tapered: {
    points: [[0, 0, 0], [.004, .27, .003], [-.008, .59, .018], [.011, .98, .008], [.002, 1.38, -.007], [.01, 1.83, .007]],
    radii: [.087, .087, .078, .064, .050, .040, .025],
    buds: [[.17, 2.8, .035, .030], [.24, 1.25, .071, .030], [.43, 4.4, .064, .028], [.63, 2.8, .035, .026], [.75, 5.5, .029, .026]],
    phase: .18,
    sides: 9,
    rings: 31
  },
  bent: {
    points: [[0, 0, 0], [.10, .53, .04], [-.11, .99, .20], [.145, 1.39, -.075], [.025, 1.79, -.025]],
    radii: [.077, .086, .074, .061, .055, .039, .024],
    buds: [[.28, .9, .052, .029], [.49, 3.9, .042, .025], [.73, 1.9, .044, .020], [.84, 4.7, .023, .018]],
    phase: .48,
    sides: 9,
    rings: 40
  },
  slender: {
    points: [[0, 0, 0], [-.006, .31, .004], [.005, .71, -.005], [-.008, 1.14, .004], [.003, 1.53, -.006], [.007, 1.86, .003]],
    radii: [.070, .064, .059, .056, .054, .054, .048],
    buds: [[.22, 2.8, .012, .027], [.44, .2, .015, .021], [.63, 4.1, .012, .021], [.77, 1.4, .014, .020]],
    phase: .31,
    sides: 8,
    rings: 29
  }
};

export function twigShape(kind, morphs = {}) {
  const design = designs[kind];
  if (!design) throw new Error('Unknown twig study: ' + kind);
  const width = mix(.64, 1.36, clamp(morphs.width ?? .5, 0, 1));
  const length = mix(.68, 1.32, clamp(morphs.length ?? .5, 0, 1));
  const bend = (clamp(morphs.bend ?? .5, 0, 1) - .5) * .6;
  const points = design.points.map(p => new T.Vector3(...p));
  // Tight mitered knees make the elbow twig read as crooked wood rather than
  // a smooth cane. Other twigs use a gently wandering continuous centerline.
  const curve = kind === 'bent' ? new class extends T.Curve {
    getPoint(t, target = new T.Vector3()) {
      const f = clamp(t, 0, 1) * (points.length - 1);
      const i = Math.min(points.length - 2, Math.floor(f));
      return target.copy(points[i]).lerp(points[i + 1], f - i);
    }
  }() : new T.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(design.rings, false);
  const positions = [], uv = [], indices = [], rings = [];
  let previous = null, distance = 0;
  const vertex = (p, u, v) => {const i = positions.length / 3; positions.push(...p); uv.push(u, v); return i;};
  const triangle = (a, b, c) => indices.push(a, b, c);
  const transform = p => {
    const t = p[1] / design.points.at(-1)[1];
    return [p[0] * width + bend * .38 * t * t, p[1] * length, p[2] * width + bend * .14 * t * t];
  };
  for (let j = 0; j <= design.rings; j++) {
    const t = j / design.rings, center = curve.getPoint(t), radius = envelope(design.radii, t);
    const mappedCenter = new T.Vector3(...transform(center.toArray()));
    if (previous) distance += mappedCenter.distanceTo(previous);
    previous = mappedCenter;
    const ring = [];
    for (let k = 0; k <= design.sides; k++) {
      const a = k / design.sides * tau, phase = a + design.phase;
      const ridges = 1 + .045 * Math.sin(phase * 3 + t * 5) + .022 * Math.sin(phase * 5 - t * 8);
      let raised = 0;
      for (const [at, angle, height, span] of design.buds) {
        const da = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
        raised += height * Math.exp(-(((t - at) / span) ** 2) - ((da / .49) ** 2));
      }
      const collar = kind === 'slender' ? [.20, .48, .76].reduce((sum, at) => sum + .009 * Math.exp(-(((t - at) / .025) ** 2)), 0) : 0;
      const r = radius * ridges + raised + collar, p = center.clone()
        .addScaledVector(frames.normals[j], Math.cos(phase) * r)
        .addScaledVector(frames.binormals[j], Math.sin(phase) * r * .91);
      ring.push(vertex(transform(p.toArray()), k / design.sides * .75, distance * 1.5));
    }
    rings.push(ring);
  }
  for (let j = 0; j < design.rings; j++) for (let k = 0; k < design.sides; k++) {
    const a = rings[j][k], b = rings[j][k + 1], c = rings[j + 1][k + 1], d = rings[j + 1][k];
    triangle(a, b, d); triangle(b, c, d);
  }
  for (const end of [false, true]) {
    const j = end ? design.rings : 0;
    const center = vertex(transform(end ? curve.getPoint(1).toArray() : [0, 0, 0]), .875, .5);
    const cap = [];
    for (let k = 0; k <= design.sides; k++) {
      const a = k / design.sides * tau, at = rings[j][k] * 3;
      cap.push(vertex(positions.slice(at, at + 3), .875 + Math.cos(a) * .115, .5 + Math.sin(a) * .44));
    }
    for (let k = 0; k < design.sides; k++) {
      const a = cap[k], b = cap[k + 1];
      if (end) triangle(center, a, b); else triangle(center, b, a);
    }
  }

  return {positions, uv, indices};
}

