/* Procedural car + engine bay (transverse 4-cyl, layout after a Nissan Sunny N16 bay).
   Hood opens with scroll progress (--sc-p on #engine). Non-engine parts fade to focus the engine.
   Classic script (no top-level import) so it also runs from file://. */
const SECTION = document.getElementById('engine');
if (SECTION) boot();

function boot() {
  const stage = SECTION.querySelector('.engine-stage');
  const canvas = SECTION.querySelector('.engine-canvas');
  // one stop per service: <li data-part data-anchor data-az data-el data-w>Service name</li>
  const stops = [...SECTION.querySelectorAll('.engine-stops li')];
  const pinEl = SECTION.querySelector('.pin'), capEl = SECTION.querySelector('.engine-caption');
  const capPart = capEl.querySelector('.engine-caption__part'), capText = capEl.querySelector('.engine-caption__text');
  const capCount = capEl.querySelector('.engine-caption__count'), capDots = [...capEl.querySelectorAll('.engine-caption__dots i')];
  const params = new URLSearchParams(location.search);
  const forcedP = params.has('engineP') ? parseFloat(params.get('engineP')) : null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, started = false;
  const T = window.__engineTimings = {};
  const tick = () => new Promise(r => setTimeout(r, 0));   // yield to the browser between heavy steps

  // build early (about 2.5 screens away) so the cost lands while the visitor is still reading above
  new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && !started) { started = true; init(); }
  }, { rootMargin: '250% 0px 250% 0px' }).observe(SECTION);
  // render only while the act is actually (nearly) on screen
  new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      document.documentElement.classList.toggle('engine-live', visible);
    }
  }, { rootMargin: '10% 0px 10% 0px' }).observe(SECTION);

  // warm the network + module evaluation while the browser is idle after load
  addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => {
    import('three').catch(() => {}); import('three/addons/environments/RoomEnvironment.js').catch(() => {}); import('three/addons/geometries/RoundedBoxGeometry.js').catch(() => {});
  }, { timeout: 3000 }));

  setInterval(() => {
    if (visible && !window.__engine && !stage.classList.contains('engine--nogl')) {
      stage._wait = (stage._wait || 0) + 1;
      if (stage._wait > 12) stage.classList.add('engine--nogl');
    }
  }, 1000);

  async function init() {
    try {
      const [THREE, env, rbg] = await Promise.all([
        import('three'),
        import('three/addons/environments/RoomEnvironment.js'),
        import('three/addons/geometries/RoundedBoxGeometry.js'),
      ]);
      T.imports = Math.round(performance.now());
      await tick();
      await run(THREE, env.RoomEnvironment, rbg.RoundedBoxGeometry);
    } catch (err) {
      console.error('engine3d failed', err);
      stage.classList.add('engine--nogl');
    }
  }

  async function run(THREE, RoomEnvironment, RoundedBoxGeometry) {
    const t0 = performance.now();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { stage.classList.add('engine--nogl'); return; }

    const mobile = matchMedia('(max-width: 760px)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;   // redrawn on demand, see frame()
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.95;
    T.env = Math.round(performance.now() - t0);
    await tick();

    const V3 = THREE.Vector3;
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    /* ---------------- materials ---------------- */
    const M = {
      paint: new THREE.MeshPhysicalMaterial({ color: 0x8d97a6, metalness: 0.65, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
      paintIn: new THREE.MeshStandardMaterial({ color: 0x17181b, metalness: 0.5, roughness: 0.6 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x06080b, metalness: 0.2, roughness: 0.03, transparent: true, opacity: 0.9 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.92 }),
      hose: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.8 }),
      alloy: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.2 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8b8f96, metalness: 1, roughness: 0.35 }),
      cast: new THREE.MeshStandardMaterial({ color: 0x5a5d63, metalness: 0.85, roughness: 0.55 }),
      castDark: new THREE.MeshStandardMaterial({ color: 0x2c2e33, metalness: 0.85, roughness: 0.5 }),
      alu: new THREE.MeshStandardMaterial({ color: 0xa6aab1, metalness: 1, roughness: 0.38 }),
      plastic: new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.55 }),
      plasticGrey: new THREE.MeshStandardMaterial({ color: 0x2b2c30, roughness: 0.6 }),
      amber: new THREE.MeshStandardMaterial({ color: 0xff7a1f, roughness: 0.42, metalness: 0.15, emissive: 0x3a1500 }),
      exhaust: new THREE.MeshStandardMaterial({ color: 0x4a3b32, metalness: 0.9, roughness: 0.5, emissive: 0xff5a10, emissiveIntensity: 0 }),
      red: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5, metalness: 0.2 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x2a6fb8, roughness: 0.5 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0xcfc6b8, emissive: 0xffc67a, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.4 }),
      tail: new THREE.MeshStandardMaterial({ color: 0xaa1a14, emissive: 0x6a0805, emissiveIntensity: 0.8, roughness: 0.3 }),
      tank: new THREE.MeshPhysicalMaterial({ color: 0xe0a64a, transparent: true, opacity: 0.55, roughness: 0.2 }),
      tankW: new THREE.MeshPhysicalMaterial({ color: 0xece6d6, transparent: true, opacity: 0.6, roughness: 0.25 }),
      tankBlue: new THREE.MeshPhysicalMaterial({ color: 0x5aa0d8, transparent: true, opacity: 0.5, roughness: 0.2 }),
      felt: new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 1 }),
      battery: new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 }),
    };

    /* ---------------- helpers ---------------- */
    const add = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
    const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
    const cylZ = (r, len, mat, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, mat); };
    const cylX = (r, len, mat, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, mat); };
    const cylY = (r, len, mat, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    const curveOf = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)), closed, 'centripetal');
    const tube = (pts, r, mat, closed = false, seg = 64) => new THREE.Mesh(new THREE.TubeGeometry(curveOf(pts, closed), seg, r, 8, closed), mat);
    const ribbed = (parent, pts, r, n, mat) => {
      const c = curveOf(pts);
      parent.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, r * 0.9, 10, false), mat));
      const tg = new THREE.TorusGeometry(r, r * 0.22, 6, 18);
      for (let i = 0; i <= n; i++) {
        const u = i / n, m = new THREE.Mesh(tg, mat);
        m.position.copy(c.getPointAt(u));
        m.quaternion.setFromUnitVectors(new V3(0, 0, 1), c.getTangentAt(u).normalize());
        parent.add(m);
      }
    };
    const strut = (p0, p1, r, mat, seg = 10) => {
      const a = new V3(...p0), b = new V3(...p1), d = b.clone().sub(a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
      return m;
    };
    const rrShape = (w, d, r) => {
      const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
      s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2);
      s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI);
      s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
      return s;
    };
    const slab = (w, d, t, r, bev = 0.012) => {
      const g = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 14 });
      g.rotateX(-Math.PI / 2); g.translate(0, bev, 0); return g;
    };
    const hull = (pts) => {
      pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = []; for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      const up = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      up.pop(); lo.pop(); return lo.concat(up);
    };
    const mirrorTo = (obj) => { const c = obj.clone(); c.scale.x *= -1; c.position.x *= -1; return c; };
    const canvasTex = (w, h, draw, rep) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      if (rep) t.repeat.set(...rep); return t;
    };

    /* groups: body (fades hard), bay (fades softly), hero engine (never fades) */
    const car = new THREE.Group(); scene.add(car);
    const body = new THREE.Group(), bay = new THREE.Group(), hero = new THREE.Group();
    car.add(body, bay, hero);
    const ENG_Z = 1.3;
    hero.position.set(0.0, 0, ENG_Z);
    const HOOD_Y = 0.96;

    /* ================= BODY ================= */
    const sideShape = new THREE.Shape();
    sideShape.moveTo(-2.1, 0.26); sideShape.lineTo(-1.8, 0.26);
    sideShape.absarc(-1.35, 0.26, 0.45, Math.PI, 0, true); sideShape.lineTo(0.9, 0.26);
    sideShape.absarc(1.35, 0.26, 0.45, Math.PI, 0, true); sideShape.lineTo(2.2, 0.26);
    sideShape.lineTo(2.31, 0.4); sideShape.lineTo(2.32, 0.6); sideShape.lineTo(2.24, 0.765);
    sideShape.lineTo(2.1, 0.825); sideShape.lineTo(0.55, 0.995); sideShape.lineTo(-0.6, 0.99);
    sideShape.lineTo(-1.4, 1.01); sideShape.lineTo(-2.2, 0.95); sideShape.lineTo(-2.28, 0.55);
    sideShape.lineTo(-2.26, 0.34); sideShape.closePath();
    const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 5, curveSegments: 28 });
    sideGeo.rotateY(-Math.PI / 2); sideGeo.translate(0.92 - 0.035, 0, 0);
    const sideR = new THREE.Mesh(sideGeo, M.paint); body.add(sideR); body.add(mirrorTo(sideR));

    const cShape = new THREE.Shape();
    cShape.moveTo(-2.1, 0.26); cShape.lineTo(0.55, 0.26); cShape.lineTo(0.55, 0.995);
    cShape.lineTo(-0.6, 0.99); cShape.lineTo(-1.4, 1.01); cShape.lineTo(-2.2, 0.95);
    cShape.lineTo(-2.28, 0.55); cShape.lineTo(-2.26, 0.34); cShape.closePath();
    const cGeo = new THREE.ExtrudeGeometry(cShape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 8 });
    cGeo.rotateY(-Math.PI / 2); cGeo.translate(0.6, 0, 0);
    body.add(new THREE.Mesh(cGeo, M.paint));
    add(body, rbox(1.5, 0.06, 4.45, 0.02, M.plastic), 0, 0.24, 0.1);

    // nose, lamps, grille
    add(body, rbox(1.86, 0.4, 0.26, 0.07, M.paint), 0, 0.47, 2.18);
    const grilleTex = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f3136'; g.lineWidth = 2; for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [3, 1]);
    add(body, rbox(1.2, 0.18, 0.06, 0.03, new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.6 })), 0, 0.5, 2.315);
    add(body, rbox(1.2, 0.035, 0.05, 0.015, M.alloy), 0, 0.615, 2.325);
    add(body, rbox(1.3, 0.08, 0.1, 0.03, M.paint), 0, 0.79, 2.16);
    for (const sx of [1, -1]) {
      const hl = rbox(0.34, 0.1, 0.06, 0.04, M.lamp); hl.rotation.y = sx * 0.28; add(body, hl, sx * 0.74, 0.72, 2.27);
      const lens = rbox(0.36, 0.12, 0.02, 0.02, M.glass); lens.rotation.y = sx * 0.28; add(body, lens, sx * 0.745, 0.72, 2.305);
      const proj = cylZ(0.035, 0.03, M.alloy, 20); proj.rotation.y = sx * 0.28; add(body, proj, sx * 0.7, 0.72, 2.29);
      add(body, rbox(0.1, 0.05, 0.1, 0.02, M.amber), sx * 0.86, 0.5, 2.28);
    }
    add(body, rbox(1.88, 0.42, 0.18, 0.09, M.paint), 0, 0.52, -2.2);
    for (const sx of [1, -1]) { const tl = rbox(0.42, 0.13, 0.08, 0.04, M.tail); tl.rotation.y = sx * -0.15; add(body, tl, sx * 0.74, 0.8, -2.27); }
    add(body, rbox(0.6, 0.06, 0.06, 0.02, M.alloy), 0, 0.62, -2.3);
    for (const sx of [1, -1]) {
      for (const z of [0.5, -0.58, -1.62]) add(body, rbox(0.012, 0.64, 0.012, 0.004, M.plastic), sx * 0.925, 0.64, z);
      add(body, rbox(0.012, 0.012, 1.1, 0.004, M.plastic), sx * 0.925, 0.3, -0.55);
      for (const z of [0.0, -1.1]) add(body, rbox(0.02, 0.03, 0.15, 0.01, M.alloy), sx * 0.93, 0.88, z);
      add(body, rbox(0.1, 0.09, 0.2, 0.04, M.paint), sx * 0.99, 1.04, 0.42);
    }

    // greenhouse
    const gShape = new THREE.Shape();
    gShape.moveTo(0.52, 0.95); gShape.lineTo(-0.2, 1.42); gShape.lineTo(-1.3, 1.43); gShape.lineTo(-1.95, 1.0);
    gShape.lineTo(-1.95, 0.95); gShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 1.38, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 6 });
    gGeo.rotateY(-Math.PI / 2); gGeo.translate(0.69, 0, 0);
    { const p = gGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - 0.14 * Math.min(1, Math.max(0, (y - 0.95) / 0.48)); p.setX(i, p.getX(i) * k); }
      gGeo.computeVertexNormals(); }
    body.add(new THREE.Mesh(gGeo, M.glass));
    add(body, new THREE.Mesh(slab(1.16, 1.06, 0.035, 0.18), M.paint), 0, 1.42, -0.75);
    for (const sx of [1, -1]) {
      body.add(strut([sx * 0.7, 0.98, 0.5], [sx * 0.6, 1.42, -0.2], 0.022, M.paint));
      body.add(strut([sx * 0.71, 0.98, -0.62], [sx * 0.62, 1.43, -0.62], 0.02, M.plastic));
      body.add(strut([sx * 0.68, 1.0, -1.95], [sx * 0.6, 1.43, -1.3], 0.03, M.paint));
      body.add(strut([sx * 0.72, 0.985, 0.5], [sx * 0.72, 0.985, -1.95], 0.012, M.alloy));
    }

    // wheels
    const tyreGeo = new THREE.LatheGeometry([[0.2, -0.1], [0.3, -0.112], [0.335, -0.09], [0.34, -0.06], [0.34, 0.06], [0.335, 0.09], [0.3, 0.112], [0.2, 0.1]].map(p => new THREE.Vector2(...p)), 48);
    tyreGeo.rotateZ(Math.PI / 2);
    const lipGeo = new THREE.LatheGeometry([[0.18, -0.1], [0.215, -0.1], [0.215, -0.085], [0.195, -0.07], [0.195, 0.07], [0.215, 0.085], [0.215, 0.1], [0.18, 0.1]].map(p => new THREE.Vector2(...p)), 40);
    lipGeo.rotateZ(Math.PI / 2);
    const makeWheel = () => {
      const w = new THREE.Group();
      add(w, new THREE.Mesh(tyreGeo, M.rubber)); add(w, new THREE.Mesh(lipGeo, M.alloy));
      add(w, cylX(0.2, 0.02, M.castDark), 0.07, 0, 0);
      for (let i = 0; i < 5; i++) { const arm = new THREE.Group(); arm.rotation.x = i * Math.PI * 2 / 5; add(arm, rbox(0.035, 0.17, 0.045, 0.012, M.alloy), 0.085, 0.12, 0); w.add(arm); }
      add(w, cylX(0.04, 0.04, M.alloy), 0.095, 0, 0);
      add(w, cylX(0.165, 0.02, M.steel), -0.05, 0, 0);
      add(w, rbox(0.06, 0.1, 0.085, 0.02, M.red), -0.04, 0.14, 0.05);
      w.traverse(o => { o.userData.fk = 'wheel'; });
      return w;
    };
    for (const [x, z] of [[0.77, 1.35], [0.77, -1.35]]) {
      const wr = makeWheel(); wr.position.set(x, 0.335, z); body.add(wr);
      const wl = makeWheel(); wl.scale.x = -1; wl.position.set(-x, 0.335, z); body.add(wl);
    }

    // hood (hinged), with stamped liner ribs like a real one
    const hood = new THREE.Group(); hood.position.set(0, HOOD_Y, 0.58); body.add(hood);
    const hoodGeo = slab(1.31, 1.52, 0.035, 0.14, 0.012); hoodGeo.translate(0, 0, 0.76);
    { const p = hoodGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.655; p.setY(i, p.getY(i) + 0.022 * (1 - x * x)); }
      hoodGeo.computeVertexNormals(); }
    const SL = 0.1086;
    const hs = new THREE.Mesh(hoodGeo, M.paint); hs.rotation.x = SL; hood.add(hs);
    const liner = new THREE.Mesh(slab(1.17, 1.38, 0.02, 0.12, 0.008), M.felt); liner.geometry.translate(0, 0, 0.74); liner.rotation.x = SL; add(hood, liner, 0, -0.02, 0);
    for (const z of [0.3, 0.68, 1.06, 1.3]) { const rib = rbox(1.0, 0.014, 0.05, 0.006, M.paintIn); rib.rotation.x = SL; add(hood, rib, 0, -0.04 - z * SL, z); }
    for (const x of [-0.42, 0, 0.42]) { const rib = rbox(0.05, 0.014, 1.1, 0.006, M.paintIn); rib.rotation.x = SL; add(hood, rib, x, -0.04 - 0.55 * SL, 0.55); }
    add(hood, rbox(0.12, 0.04, 0.05, 0.015, M.plastic), 0, -0.06, 1.46);
    const prop = strut([0, 0, 0], [0, 0.5, 0], 0.006, M.steel, 6); body.add(prop);

    // body material fade targets are applied later (see FOCUS)

    await tick();
    /* ================= BAY (car coordinates) ================= */
    // firewall, cowl panel with louvres and wipers, bay floor, subframe
    add(bay, rbox(1.3, 0.72, 0.05, 0.02, M.felt), 0, 0.64, 0.575);
    add(bay, rbox(1.3, 0.05, 0.28, 0.015, M.plastic), 0, 0.985, 0.7);
    for (let i = 0; i < 14; i++) add(bay, rbox(0.07, 0.012, 0.18, 0.004, M.paintIn), -0.6 + i * 0.092, 1.0, 0.7);
    for (const sx of [1, -1]) {
      add(bay, cylY(0.016, 0.03, M.steel, 10), sx * 0.3, 1.0, 0.62);
      const arm = rbox(0.5, 0.012, 0.018, 0.004, M.plastic); arm.rotation.z = sx * 0.04; add(bay, arm, sx * 0.34, 1.0, 0.53);
      add(bay, rbox(0.46, 0.014, 0.03, 0.005, M.rubber), sx * 0.36, 0.995, 0.5);
    }
    add(bay, rbox(1.3, 0.04, 1.62, 0.01, M.plastic), 0, 0.285, 1.4);
    for (const sx of [1, -1]) add(bay, rbox(0.09, 0.075, 1.5, 0.02, M.castDark), sx * 0.4, 0.33, 1.38);   // subframe rails
    add(bay, rbox(0.9, 0.06, 0.12, 0.02, M.castDark), 0, 0.33, 1.6);
    add(bay, rbox(1.3, 0.07, 0.11, 0.02, M.plasticGrey), 0, 0.805, 2.06);                                   // radiator support top
    add(bay, rbox(0.07, 0.5, 0.1, 0.02, M.plasticGrey), 0.62, 0.55, 2.05);
    add(bay, rbox(0.07, 0.5, 0.1, 0.02, M.plasticGrey), -0.62, 0.55, 2.05);
    add(bay, rbox(0.14, 0.06, 0.06, 0.02, M.plasticGrey), 0, 0.77, 2.1);                                     // hood latch

    // radiator + condenser + fan
    const finTex = canvasTex(128, 128, (g) => { g.fillStyle = '#26282c'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6a6e75'; g.lineWidth = 1.2; for (let x = 0; x < 128; x += 4) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 128); g.stroke(); } g.strokeStyle = '#15171a'; g.lineWidth = 2; for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } }, [7, 3]);
    const radMat = new THREE.MeshStandardMaterial({ map: finTex, metalness: 0.8, roughness: 0.5 });
    add(bay, rbox(1.0, 0.44, 0.07, 0.01, radMat), 0, 0.53, 1.99);
    add(bay, rbox(1.0, 0.4, 0.03, 0.01, radMat), 0, 0.53, 2.04);
    add(bay, rbox(0.08, 0.5, 0.09, 0.02, M.plastic), -0.54, 0.53, 1.99); add(bay, rbox(0.08, 0.5, 0.09, 0.02, M.plastic), 0.54, 0.53, 1.99);
    add(bay, cylY(0.034, 0.03, M.amber), 0.4, 0.77, 1.99);                                                    // radiator cap
    add(bay, rbox(0.95, 0.42, 0.12, 0.02, M.plastic), 0, 0.53, 1.89);
    const fan = new THREE.Group(); fan.position.set(0, 0.53, 1.86); bay.add(fan);
    add(fan, new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 8, 48), M.plasticGrey)); add(fan, cylZ(0.035, 0.05, M.castDark));
    for (let i = 0; i < 7; i++) { const b = new THREE.Group(); b.rotation.z = i * Math.PI * 2 / 7; const bl = rbox(0.06, 0.13, 0.008, 0.003, M.plasticGrey); bl.rotation.y = 0.5; add(b, bl, 0, 0.1, 0); fan.add(b); }

    // air filter box + ribbed intake hose (passenger side, rear), snorkel
    add(bay, rbox(0.27, 0.17, 0.34, 0.04, M.plastic), -0.46, 0.62, 0.79);
    for (let i = 0; i < 8; i++) add(bay, rbox(0.27, 0.05, 0.012, 0.004, M.plasticGrey), -0.46, 0.715, 0.65 + i * 0.04);  // box ribs
    for (const dz of [-0.12, 0.12]) add(bay, rbox(0.03, 0.04, 0.03, 0.01, M.steel), -0.46, 0.7, 0.79 + dz);            // clips
    add(bay, rbox(0.12, 0.1, 0.1, 0.03, M.plastic), -0.55, 0.64, 1.02);                                                // snorkel to fender
    ribbed(bay, [[-0.39, 0.68, 0.99], [-0.43, 0.74, 0.99], [-0.47, 0.76, 0.96], [-0.5, 0.72, 0.99]], 0.04, 10, M.hose); // to throttle body

    // battery, fuse box, relay
    add(bay, rbox(0.28, 0.19, 0.17, 0.02, M.battery), -0.46, 0.38, 1.7);
    add(bay, rbox(0.3, 0.012, 0.19, 0.005, M.plasticGrey), -0.46, 0.485, 1.7);
    add(bay, rbox(0.07, 0.04, 0.05, 0.01, M.red), -0.34, 0.5, 1.7); add(bay, cylY(0.016, 0.03, M.plastic, 10), -0.58, 0.5, 1.7);
    add(bay, rbox(0.2, 0.1, 0.14, 0.02, M.plastic), -0.22, 0.37, 1.76);
    for (let i = 0; i < 4; i++) add(bay, rbox(0.04, 0.012, 0.1, 0.003, M.plasticGrey), -0.29 + i * 0.045, 0.43, 1.76);

    // driver side: brake booster, master cylinder, reservoir, ABS block, fluid tanks
    add(bay, cylZ(0.15, 0.15, M.plastic, 32), 0.32, 0.74, 0.675);
    add(bay, cylZ(0.05, 0.02, M.steel, 20), 0.32, 0.74, 0.755);
    add(bay, cylZ(0.034, 0.13, M.alu), 0.32, 0.75, 0.84);
    add(bay, rbox(0.1, 0.08, 0.07, 0.02, M.tank), 0.32, 0.82, 0.86); add(bay, cylY(0.028, 0.02, M.amber), 0.32, 0.87, 0.86);   // brake reservoir + cap
    add(bay, rbox(0.11, 0.1, 0.17, 0.02, M.alu), 0.48, 0.52, 0.92);                                              // ABS block
    for (let i = 0; i < 4; i++) tube2(bay, [[0.43, 0.56, 0.88 + i * 0.04], [0.4, 0.62, 0.9], [0.36, 0.7, 0.9]], 0.005, M.steel);
    tube2(bay, [[0.5, 0.5, 1.0], [0.52, 0.42, 1.3], [0.5, 0.36, 1.7], [0.5, 0.34, 2.0]], 0.006, M.steel);          // brake line along rail
    add(bay, rbox(0.1, 0.17, 0.08, 0.025, M.tankW), 0.5, 0.6, 1.62); add(bay, cylY(0.03, 0.02, M.red), 0.5, 0.7, 1.62); // coolant reservoir
    add(bay, rbox(0.12, 0.22, 0.1, 0.03, M.tankBlue), 0.5, 0.5, 1.93); add(bay, cylY(0.028, 0.02, M.blue), 0.5, 0.63, 1.93); // washer bottle
    // ECM + wiring
    add(bay, rbox(0.17, 0.05, 0.14, 0.015, M.alu), 0.5, 0.68, 1.12);
    for (let i = 0; i < 3; i++) add(bay, rbox(0.03, 0.04, 0.03, 0.008, M.plastic), 0.43, 0.7, 1.07 + i * 0.045);
    tube2(bay, [[-0.34, 0.5, 1.76], [-0.3, 0.8, 1.5], [-0.1, 0.86, 1.2], [0.1, 0.8, 1.0], [0.3, 0.8, 1.0], [0.43, 0.7, 1.1]], 0.012, M.plastic);
    tube2(bay, [[-0.3, 0.45, 1.78], [-0.16, 0.45, 1.9], [0.1, 0.45, 1.9], [0.28, 0.4, 1.7]], 0.01, M.plastic);

    // strut towers
    for (const sx of [1, -1]) {
      add(bay, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.14, 28), M.castDark), sx * 0.5, 0.78, 1.35);
      add(bay, cylY(0.045, 0.02, M.steel), sx * 0.5, 0.86, 1.35);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; add(bay, cylY(0.013, 0.016, M.steel, 6), sx * 0.5 + Math.cos(a) * 0.065, 0.85, 1.35 + Math.sin(a) * 0.065); }
    }
    // CV axles + boots (the "axle")
    for (const sx of [1, -1]) {
      add(bay, mirrorAxle(sx), 0, 0, 0);
    }
    function mirrorAxle(sx) {
      const g = new THREE.Group();
      g.add(add(new THREE.Group(), cylX(0.017, 0.4, M.steel, 12), sx * 0.52, 0.335, 1.35));
      const pts = []; for (let i = 0; i <= 22; i++) { const t = i / 22; pts.push(new THREE.Vector2(0.022 + 0.04 * t + (i % 2 ? 0.01 : 0), t * 0.2)); }
      const bg = new THREE.LatheGeometry(pts, 20); bg.rotateZ(-sx * Math.PI / 2);
      const boot = new THREE.Mesh(bg, M.rubber); boot.position.set(sx * 0.4, 0.335, 1.35); g.add(boot);
      return g;
    }
    function tube2(parent, pts, r, mat) { parent.add(tube(pts, r, mat, false, 48)); }

    await tick();
    /* ================= ENGINE (hero, local to E, transverse: x lateral, z fore/aft) ================= */
    const E = hero;
    add(E, rbox(0.54, 0.07, 0.4, 0.02, M.alu), 0, 0.33, 0);                                  // oil pan
    add(E, rbox(0.6, 0.24, 0.46, 0.03, M.cast), 0, 0.46, 0);                                 // block
    for (const x of [-0.22, -0.073, 0.073, 0.22]) add(E, rbox(0.012, 0.2, 0.48, 0.004, M.castDark), x + 0.07, 0.46, 0);
    add(E, rbox(0.6, 0.13, 0.46, 0.025, M.alu), 0, 0.64, 0);                                 // head
    add(E, rbox(0.56, 0.06, 0.34, 0.025, M.plasticGrey), 0, 0.735, 0);                       // valve cover
    add(E, rbox(0.4, 0.014, 0.1, 0.006, M.castDark), 0, 0.77, -0.1);                         // cover emboss
    for (const x of [-0.25, -0.125, 0, 0.125, 0.25]) for (const sz of [1, -1]) add(E, cylY(0.0095, 0.012, M.steel, 6), x, 0.77, sz * 0.15);
    // 4 ignition coils + connectors
    for (const x of [-0.21, -0.07, 0.07, 0.21]) {
      add(E, rbox(0.045, 0.075, 0.05, 0.014, M.plastic), x, 0.79, 0.04);
      add(E, cylY(0.012, 0.03, M.rubber, 8), x, 0.745, 0.04);
      add(E, rbox(0.03, 0.03, 0.025, 0.008, M.plasticGrey), x, 0.8, 0.075);
    }
    add(E, cylY(0.03, 0.022, M.plastic), 0.25, 0.78, -0.1);                                  // oil filler cap
    add(E, new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 20), M.amber), 0.25, 0.793, -0.1).rotation.x = Math.PI / 2;
    // dipstick (amber loop)
    tube2(E, [[-0.12, 0.5, 0.24], [-0.12, 0.66, 0.25], [-0.12, 0.8, 0.22]], 0.004, M.steel);
    add(E, new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0045, 6, 16), M.amber), -0.12, 0.815, 0.22);
    // intake (rear, z-): plenum, runners, throttle body, fuel rail + injectors
    add(E, cylX(0.052, 0.52, M.alu, 28), -0.02, 0.68, -0.31);
    for (const x of [-0.21, -0.07, 0.07, 0.21]) tube2(E, [[x, 0.66, -0.31], [x, 0.7, -0.27], [x, 0.7, -0.24], [x, 0.66, -0.22]], 0.02, M.alu);
    add(E, cylX(0.045, 0.1, M.castDark), -0.34, 0.68, -0.31);                                // throttle body
    add(E, cylX(0.012, 0.52, M.steel, 10), 0, 0.71, -0.2);                                   // fuel rail
    for (const x of [-0.21, -0.07, 0.07, 0.21]) add(E, cylY(0.012, 0.05, M.plastic, 8), x, 0.68, -0.2);
    // exhaust (front, z+): manifold, heat shield, downpipe
    for (const x of [-0.21, -0.07, 0.07, 0.21]) tube2(E, [[x, 0.62, 0.23], [x, 0.56, 0.3], [x, 0.46, 0.32], [x * 0.3, 0.36, 0.3]], 0.019, M.exhaust);
    tube2(E, [[0, 0.36, 0.3], [0, 0.3, 0.28], [-0.02, 0.28, 0.1], [-0.02, 0.28, -0.2]], 0.045, M.exhaust);
    { const hg = new THREE.CylinderGeometry(0.165, 0.165, 0.46, 28, 1, true, -0.2, 1.9); hg.rotateZ(Math.PI / 2);
      const hsM = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: 0x80848b, metalness: 1, roughness: 0.5, side: THREE.DoubleSide })); add(E, hsM, 0, 0.42, 0.2);
      for (const x of [-0.18, 0, 0.18]) add(E, cylZ(0.012, 0.012, M.steel, 6), x, 0.58, 0.345); }
    // belt side (+x): timing cover, pulleys, belt, alternator, A/C compressor
    add(E, rbox(0.07, 0.34, 0.42, 0.025, M.castDark), 0.33, 0.52, 0);
    const px = [{ y: 0.36, z: 0.0, r: 0.06 }, { y: 0.5, z: 0.3, r: 0.035 }, { y: 0.62, z: -0.1, r: 0.04 }, { y: 0.34, z: 0.19, r: 0.045 }, { y: 0.72, z: 0.05, r: 0.026 }];
    const BX = 0.375;
    for (const p of px) { add(E, cylX(p.r, 0.03, M.steel, 28), BX, p.y, p.z); add(E, cylX(p.r * 0.45, 0.05, M.castDark, 16), BX + 0.005, p.y, p.z); }
    { const pts = []; for (const p of px) for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; pts.push([p.z + Math.cos(a) * (p.r + 0.006), p.y + Math.sin(a) * (p.r + 0.006)]); }
      const h = hull(pts); E.add(Object.assign(tube(h.map(q => [BX + 0.004, q[1], q[0]]), 0.007, M.rubber, true, 220))); }
    add(E, cylX(0.065, 0.14, M.alu), 0.34, 0.5, 0.3);                                      // alternator
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; add(E, rbox(0.14, 0.012, 0.012, 0.004, M.castDark), 0.34, 0.5 + Math.cos(a) * 0.066, 0.3 + Math.sin(a) * 0.066); }
    add(E, cylX(0.05, 0.12, M.steel), 0.28, 0.34, 0.19);                                     // A/C compressor
    // gearbox (-x): bell housing + case
    { const bg = new THREE.CylinderGeometry(0.17, 0.2, 0.22, 32); bg.rotateZ(Math.PI / 2); add(E, new THREE.Mesh(bg, M.alu), -0.41, 0.38, 0); }
    add(E, rbox(0.22, 0.26, 0.36, 0.04, M.cast), -0.6, 0.4, 0);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; add(E, cylX(0.011, 0.014, M.steel, 6), -0.3, 0.38 + Math.cos(a) * 0.18, Math.sin(a) * 0.18); }
    // oil filter, starter, mount
    add(E, cylZ(0.042, 0.11, M.plasticGrey), 0.14, 0.3, 0.3); add(E, new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.008, 8, 24), M.amber), 0.14, 0.3, 0.355);
    add(E, cylX(0.055, 0.15, M.castDark), -0.2, 0.42, -0.28);
    add(E, rbox(0.12, 0.05, 0.12, 0.015, M.rubber), 0.4, 0.8, -0.02); add(E, rbox(0.04, 0.2, 0.04, 0.01, M.castDark), 0.4, 0.68, -0.02);
    // hoses: upper (radiator -> thermostat), lower, A/C pipes, vacuum, coolant bypass
    tube2(bay, [[0.34, 0.74, 1.95], [0.32, 0.77, 1.78], [0.3, 0.76, 1.62], [0.24, 0.74, ENG_Z + 0.22]], 0.028, M.hose);
    tube2(bay, [[-0.34, 0.34, 1.96], [-0.3, 0.3, 1.8], [-0.05, 0.31, 1.7], [0.14, 0.38, ENG_Z + 0.24]], 0.026, M.hose);
    for (const q of [[0.34, 0.76, 1.95], [0.24, 0.74, ENG_Z + 0.22], [-0.34, 0.34, 1.96]]) { const cl = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 8, 20), M.steel); cl.rotation.x = Math.PI / 2; add(bay, cl, ...q); }
    tube2(bay, [[0.3, 0.34, ENG_Z + 0.19], [0.36, 0.3, 1.8], [0.44, 0.34, 2.0]], 0.012, M.alu);
    tube2(bay, [[0.3, 0.38, ENG_Z + 0.16], [0.42, 0.32, 1.75], [0.5, 0.4, 2.0]], 0.01, M.alu);
    tube2(bay, [[-0.02, 0.7, ENG_Z - 0.31], [0.1, 0.78, 1.1], [0.2, 0.8, 0.9], [0.31, 0.76, 0.78]], 0.011, M.hose);
    tube2(bay, [[-0.12, 0.7, ENG_Z - 0.31], [0.0, 0.84, 1.0], [0.18, 0.88, 0.78], [0.3, 0.82, 0.75]], 0.008, M.hose);
    tube2(bay, [[0.1, 0.64, ENG_Z - 0.2], [0.3, 0.74, 1.0], [0.46, 0.64, 1.3], [0.5, 0.64, 1.58]], 0.012, M.hose);

    /* ================= focus fade system ================= */
    const fadeCache = new Map(), fades = [];
    // Fading materials are transparent from the start. Flipping `transparent` mid-scroll forces a shader
    // rebuild for every material in one frame (a multi-second stall); a constant flag has no such cost.
    // Only body + wheels fade; the bay and engine are never touched.
    const fadeMat = (m, kind) => { const k = m.uuid + kind; let c = fadeCache.get(k); if (!c) { c = m.clone(); c.userData.base = m.opacity; c.userData.kind = kind; c.transparent = true; fadeCache.set(k, c); fades.push(c); } return c; };
    body.traverse(o => { if (o.isMesh) o.material = fadeMat(o.material, o.userData.fk || 'body'); });
    const bodyMeshes = []; body.traverse(o => { if (o.isMesh) bodyMeshes.push(o); });
    car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    /* ================= extras: scan sweep + ground + lights ================= */
    const scanTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,122,31,0)'); gr.addColorStop(0.5, 'rgba(255,170,90,1)'); gr.addColorStop(1, 'rgba(255,122,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scan.rotation.x = -Math.PI / 2; scan.position.set(0, 0.84, 1.0); scene.add(scan);
    const lampBody = fadeMat(M.lamp, 'body');

    const gc = document.createElement('canvas'); gc.width = gc.height = 256;
    { const g = gc.getContext('2d'); const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#aaa'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(11, 72), new THREE.MeshStandardMaterial({ color: 0x3a3229, roughness: 0.9, metalness: 0, transparent: true, alphaMap: new THREE.CanvasTexture(gc) }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const key = new THREE.DirectionalLight(0xfff0dc, 3.0); key.position.set(4.5, 7, 6); key.target.position.set(0, 0.5, 0.8);
    key.castShadow = !mobile; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xff7a1f, 1.5); rim.position.set(-6, 2.6, -3.5); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffc99a, 0.9); rim2.position.set(5, 2, -5); scene.add(rim2);
    const bayLight = new THREE.PointLight(0xffe6c4, 0, 3.4, 1.7); bayLight.position.set(0, 1.25, 1.4); scene.add(bayLight);
    const focus = new THREE.SpotLight(0xffd9a8, 0, 4.2, 0.55, 0.7, 1.4); focus.position.set(0.3, 2.4, 1.9); focus.target.position.set(0, 0.6, ENG_Z); scene.add(focus, focus.target);

    /* ================= camera ================= */
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    const keys = [
      { pos: [5.6, 1.5, 7.2], look: [0, 1.15, 0.4] },
      { pos: [4.8, 1.7, 6.3], look: [0, 0.95, 0.9] },
      { pos: [3.1, 2.4, 5.1], look: [0, 0.7, 1.3] },
      { pos: [0.9, 3.0, 3.9], look: [0, 0.5, 1.25] },
      { pos: [-0.5, 2.55, 3.1], look: [0.05, 0.5, 1.25] },
    ];
    const posCurve = new THREE.CatmullRomCurve3(keys.map(k => new V3(...k.pos)), false, 'catmullrom', 0.5);
    const lookCurve = new THREE.CatmullRomCurve3(keys.map(k => new V3(...k.look)), false, 'catmullrom', 0.5);
    const tmpP = new V3(), tmpL = new V3(), right = new V3(), upv = new V3();

    // compile every shader up front, without blocking the page (parallel compile where the browser supports it)
    const tc = performance.now();
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
    T.compile = Math.round(performance.now() - tc);
    await tick();

    /* ================= service stops: the camera goes to each part ================= */
    const S0 = 0.30, S1 = 1.0, N = stops.length;      // the stops share p 0.30 .. 1.0, the hood opens before
    const stopData = stops.map(li => ({
      anchor: new V3(...li.dataset.anchor.split(',').map(Number)),
      az: parseFloat(li.dataset.az), elev: parseFloat(li.dataset.el), w: parseFloat(li.dataset.w),
      get part() { return li.dataset.part; }, get text() { return li.textContent.trim(); }, pos: new V3(), look: new V3(),   // read live so a language switch changes the captions
    }));
    let W = 0, H = 0;
    // camera pose per stop: sit at azimuth/elevation from the part, far enough that its neighbourhood (w = half-width in metres) fits the screen width
    const placeStops = () => {
      const asp = Math.min(W / H, 1.15), th = Math.tan(camera.fov * Math.PI / 360);
      for (const s of stopData) {
        const d = Math.max(0.6, s.w / (th * asp));
        s.look.copy(s.anchor);
        s.pos.set(Math.sin(s.az) * Math.cos(s.elev), Math.sin(s.elev), Math.cos(s.az) * Math.cos(s.elev)).multiplyScalar(d).add(s.anchor);
      }
    };
    const resize = () => {
      const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false); camera.aspect = W / H;
      camera.fov = W / H < 0.9 ? 42 : 32; camera.updateProjectionMatrix(); placeStops();
    };
    new ResizeObserver(resize).observe(stage); resize();
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    if (!reduced) stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2; ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2; });

    const proj = new V3(), poseA = new V3(), lookA = new V3();
    let capIdx = -1;
    window.__umEngineRefresh = () => { capIdx = -1; };   // called after a language switch: redraw the caption text
    const intro = (pc, sc, p, l) => { posCurve.getPoint(pc, p); lookCurve.getPoint(pc, l); if (W / H < 0.9) p.sub(l).multiplyScalar(sc).add(l); };

    /* ================= frame ================= */
    let ps = forcedP ?? (reduced ? 0.36 : 0), last = performance.now(), shadowOn = true, tAcc = 0;
    let fbS = sm(0.22, 0.8, ps);   // smoothed focus amount: outer body ghosting, eased over ~1.5 s
    let shadowDirty = true, lastOpen = -1, frames = 0, accDt = 0;
    let pr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    const readP = () => {
      if (forcedP !== null) return forcedP;
      if (reduced) return 0.36;
      const v = parseFloat(SECTION.style.getPropertyValue('--sc-p'));
      return Number.isFinite(v) ? v : 0;
    };
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (!visible && forcedP === null) return;
      const rdt = Math.min(0.25, (now - last) / 1000);
      const dt = Math.min(0.05, rdt); last = now; tAcc += dt;
      const target = readP();
      ps += (target - ps) * Math.min(1, dt * 14);   // the page already glides; this only rounds off the last bit
      if (Math.abs(target - ps) < 0.0004) ps = target;

      // which stop the camera is at (u runs 0..N across p S0..S1) and how visible its marker + caption are
      const u = N ? (ps - S0) / (S1 - S0) * N : 0;
      const idx = Math.max(0, Math.min(N - 1, Math.floor(u - 0.2)));
      let o = 0;
      if (u > 0 && N) o = sm(idx + 0.25, idx + 0.55, u) * (idx === N - 1 ? 1 : 1 - sm(idx + 0.92, idx + 1.12, u));

      const open = sm(0.05, 0.3, ps);
      hood.rotation.x = -open * 1.12;
      // prop rod: from fender anchor to hood underside
      { const top = hood.localToWorld(new V3(0.5, -0.06, 1.0)); const base = new V3(0.52, 0.82, 0.78); const d = top.clone().sub(base);
        prop.position.copy(base).addScaledVector(d, 0.5); prop.scale.set(1, d.length() / 0.5, 1); prop.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); prop.visible = open > 0.05; }

      // focus: fade body + bay, keep the engine solid
      // only the outer body and wheels ghost out; the bay and engine keep their full look
      fbS += (sm(0.22, 0.8, ps) - fbS) * (1 - Math.exp(-rdt * 2.0));
      const fb = fbS;
      for (const m of fades) {
        const kd = m.userData.kind, k = kd === 'wheel' ? 0.9 : kd === 'body' ? 0.6 : 0;
        m.opacity = m.userData.base * (1 - k * fb);
        m.depthWrite = m.opacity > 0.95;
      }
      const wantShadow = fb < 0.4;
      if (wantShadow !== shadowOn) { shadowOn = wantShadow; for (const o of bodyMeshes) o.castShadow = wantShadow; shadowDirty = true; }
      // the shadow map only needs redrawing while the hood actually moves (it is the one moving caster)
      if (Math.abs(open - lastOpen) > 0.003) { lastOpen = open; shadowDirty = true; }
      if (shadowDirty && renderer.shadowMap.enabled) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }

      // adaptive resolution: if frames are slow, step the pixel ratio down (phones, weak GPUs)
      frames++; accDt += rdt;
      if (frames >= 45) {
        const avg = accDt / frames; frames = 0; accDt = 0;
        if (avg > 0.028 && pr > 1) { pr = Math.max(1, pr - 0.25); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); T.pr = pr; }
      }

      fan.rotation.z = ps * 6 + (ps > 0.9 ? tAcc * 14 : 0);
      bayLight.intensity = 6 * sm(0.08, 0.32, ps) * (1 - 0.35 * fb);
      focus.intensity = 14 * fb;
      renderer.toneMappingExposure = 1.2 + 0.1 * sm(0.3, 0.7, ps);

      // diagnostic scan sweep (ties to "computer scanning")
      const sp = idx === 1 ? o : 0;   // the sweep belongs to the computer-scanning stop
      const ph = (tAcc * 0.35) % 1;
      scan.position.z = 0.72 + ph * 1.3; scan.position.y = 0.84;
      scan.material.opacity = 0.5 * Math.sin(Math.min(1, Math.max(0, ph)) * Math.PI) * sp;

      // engine wakes up at the end: idle shake + hot manifold + lamps
      const wake = sm(0.9, 0.99, ps);
      hero.position.set(Math.sin(tAcc * 55) * 0.0011 * wake, Math.sin(tAcc * 47) * 0.0009 * wake, ENG_Z);
      M.exhaust.emissiveIntensity = 0.9 * wake;
      lampBody.emissiveIntensity = (0.45 + 0.8 * wake) * (1 - 0.9 * fb);

      if (u <= 0 || !N) {
        // intro: the hood opens while the camera comes round to a high front view of the bay
        intro(Math.min(1, Math.max(0, ps / S0)) * 0.75, 1.32 + 0.18 * (1 - sm(0.12, 0.3, ps)), tmpP, tmpL);
      } else {
        const k = Math.min(N - 1, Math.floor(u)), f = sm(0, 0.6, Math.min(1, u - k));   // arrive in the first 60% of a step, then hold on the part
        if (k === 0) intro(0.75, 1.32, poseA, lookA); else { poseA.copy(stopData[k - 1].pos); lookA.copy(stopData[k - 1].look); }
        tmpP.lerpVectors(poseA, stopData[k].pos, f); tmpL.lerpVectors(lookA, stopData[k].look, f);
      }
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 4); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 4);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion); upv.set(0, 1, 0);
      tmpP.addScaledVector(right, ptr.sx * 0.16).addScaledVector(upv, -ptr.sy * 0.1);
      camera.position.copy(tmpP); camera.lookAt(tmpL);
      if (u > 0) {   // slide the view so the part sits above the caption instead of dead centre
        const hh = tmpP.distanceTo(tmpL) * Math.tan(camera.fov * Math.PI / 360);
        upv.set(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(upv, -(W / H < 0.9 ? 0.27 : 0.1) * hh * sm(0, 0.5, u));
      }
      camera.updateMatrixWorld();

      renderer.render(scene, camera);

      // marker on the part + the caption for it
      if (N) {
        const sd = stopData[idx];
        if (idx !== capIdx) {
          capIdx = idx; capPart.textContent = sd.part; capText.textContent = sd.text;
          capCount.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
          capDots.forEach((d, i) => { d.classList.toggle('is-on', i === idx); d.classList.toggle('is-done', i < idx); });
        }
        proj.copy(sd.anchor).project(camera);
        const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
        const on = o > 0.01 && proj.z < 1 && sx > 0 && sx < W && sy > 0 && sy < H;
        pinEl.style.opacity = on ? o.toFixed(3) : '0';
        if (on) pinEl.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        capEl.style.opacity = o.toFixed(3);
        capEl.style.transform = `translate3d(0,${((1 - o) * 14).toFixed(1)}px,0)`;
      }
    };
    requestAnimationFrame(frame);
    stage.classList.add('engine--ready');
    window.__engine = { scene, camera, hood, renderer };
    T.total = Math.round(performance.now() - t0);
  }
}
