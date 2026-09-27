/* Aura rig: the Meshy scan is one fused, bone-less shell (faces +z, feet at y -0.95, crown +0.95).
   Builds a small skeleton in code and paints skin weights from body landmarks, then blurs them over the welded surface.
   auraRig(geometry, material) → { mesh: SkinnedMesh, bones: { root, waist, head, pony, arm:[L,R], elbow:[L,R], hand:[L,R] } }   (L = -x, R = +x) */
(function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const J = {                                   // joints in model space, measured off the scan
    root: V(0, -0.95, 0.13), waist: V(0, -0.16, 0.13), head: V(0, 0.11, 0.12), pony: V(0.1, 0.72, -0.2),
    arm: [V(-0.16, 0.06, 0.13), V(0.16, 0.06, 0.13)], cuff: [V(-0.36, -0.25, 0.16), V(0.34, -0.25, 0.16)], hand: [V(-0.31, -0.29, 0.15), V(0.3, -0.29, 0.15)],
    elbow: [V(-0.26, -0.09, 0.145), V(0.25, -0.09, 0.145)]
  };
  const NB = 10, B = { root: 0, waist: 1, head: 2, pony: 3, arm: [4, 5], hand: [6, 7], elbow: [8, 9] };

  function weights(P) {
    const n = P.count, W = new Float32Array(n * NB), p = V(), d = V(), q = V();
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(P, i);
      let arm = 0, side = 0, handK = 0, foreK = 0;
      for (let s = 0; s < 2; s++) {
        const sg = s ? 1 : -1, a = q.subVectors(J.cuff[s], J.arm[s]), L = a.length(); a.divideScalar(L);
        d.subVectors(p, J.arm[s]); const tl = d.dot(a); d.addScaledVector(a, -tl);
        const r = Math.hypot(d.x, d.y, d.z * 0.6), R = 0.055 + 0.055 * Math.min(1.3, Math.max(0, tl / L));
        const w = ss(-0.02, 0.05, tl) * (1 - ss(R, R + 0.04, r)) * ss(0.12, 0.2, sg * p.x) * (1 - ss(L * 1.25, L * 1.45, tl));
        if (w > arm) { arm = w; side = s; handK = ss(-0.26, -0.3, p.y); foreK = ss(0.36, 0.62, tl / L); }   // forearm past the elbow; the mitten below the cuff
      }
      const hairBack = ss(-0.08, -0.14, p.z) * ss(-0.1, 0.05, p.y);                          // everything behind the back is hair
      const headK = Math.max(ss(0.09, 0.16, p.y), hairBack);
      const pony = ss(-0.16, -0.22, p.z) * ss(-0.02, 0.06, p.x) * ss(0.7, 0.45, p.y);
      const up = ss(-0.26, -0.12, p.y), rest = 1 - arm, o = i * NB;
      W[o + B.arm[side]] += arm * (1 - handK) * (1 - foreK); W[o + B.elbow[side]] += arm * (1 - handK) * foreK; W[o + B.hand[side]] += arm * handK;
      W[o + B.pony] = rest * headK * pony; W[o + B.head] = rest * headK * (1 - pony);
      W[o + B.waist] = rest * (1 - headK) * up; W[o + B.root] = rest * (1 - headK) * (1 - up);
    }
    return W;
  }
  /* welded neighbour lists (UV seams split the shell into ~800 islands; positions join them back) */
  function neighbours(P, I) {
    const n = P.count, key = new Map(), id = new Int32Array(n); let u = 0;
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 2e4) + ',' + Math.round(P.getY(i) * 2e4) + ',' + Math.round(P.getZ(i) * 2e4); let v = key.get(k); if (v === undefined) key.set(k, v = u++); id[i] = v; }
    const adj = Array.from({ length: u }, () => new Set());
    for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) { const a = id[I[t + k]], b = id[I[t + (k + 1) % 3]]; adj[a].add(b); adj[b].add(a); }
    return { id, u, adj: adj.map(s => Int32Array.from(s)) };
  }
  function blur(W, nb, it) {
    const { id, u, adj } = nb, A = new Float32Array(u * NB), cnt = new Float32Array(u);
    for (let i = 0; i < id.length; i++) { cnt[id[i]]++; for (let b = 0; b < NB; b++) A[id[i] * NB + b] += W[i * NB + b]; }
    for (let v = 0; v < u; v++) for (let b = 0; b < NB; b++) A[v * NB + b] /= cnt[v];
    let X = A, Y = new Float32Array(u * NB);
    for (let k = 0; k < it; k++) {
      for (let v = 0; v < u; v++) { const nv = adj[v], o = v * NB; for (let b = 0; b < NB; b++) { let s = X[o + b]; for (const w of nv) s += X[w * NB + b]; Y[o + b] = s / (nv.length + 1); } }
      [X, Y] = [Y, X];
    }
    for (let i = 0; i < id.length; i++) for (let b = 0; b < NB; b++) W[i * NB + b] = X[id[i] * NB + b];
  }

  window.auraRig = function (geo, mat, o = {}) {
    const P = geo.attributes.position, W = weights(P);
    blur(W, neighbours(P, geo.index.array), o.blur ?? 6);
    const n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const o2 = i * NB, top = [...Array(NB).keys()].sort((a, b) => W[o2 + b] - W[o2 + a]).slice(0, 4);
      let s = 0; for (const b of top) s += W[o2 + b];
      top.forEach((b, k) => { si[i * 4 + k] = b; sw[i * 4 + k] = W[o2 + b] / (s || 1); });
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const mk = (pos, parentPos) => { const b = new THREE.Bone(); b.position.copy(pos).sub(parentPos || V(0, 0, 0)); return b; };
    const root = mk(J.root), waist = mk(J.waist, J.root), head = mk(J.head, J.waist), pony = mk(J.pony, J.head);
    const arm = [0, 1].map(s => mk(J.arm[s], J.waist)), elbow = [0, 1].map(s => mk(J.elbow[s], J.arm[s])), hand = [0, 1].map(s => mk(J.hand[s], J.elbow[s]));
    root.add(waist); waist.add(head, ...arm); head.add(pony); arm.forEach((a, s) => a.add(elbow[s])); elbow.forEach((e, s) => e.add(hand[s]));
    const list = [root, waist, head, pony, ...arm, ...hand, ...elbow];
    mat.skinning = true;
    const mesh = new THREE.SkinnedMesh(geo, mat); mesh.add(root); mesh.bind(new THREE.Skeleton(list));
    mesh.frustumCulled = false;
    return { mesh, bones: { root, waist, head, pony, arm, elbow, hand }, W, NB };
  };
})();
