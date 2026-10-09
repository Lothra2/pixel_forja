/* Visor vivo del Bosque GG. Canvas 2D, sin librerías. Sirve también de referencia para el juego:
   orden de dibujo, animaciones, luces, bruma por capas, partículas por zona y criaturas. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cv = $('escena'), ctx = cv.getContext('2d');
  const low = document.createElement('canvas'), g = low.getContext('2d');
  const dark = document.createElement('canvas'), dg = dark.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let D = null; const IMG = {};
  let VW = 640, VH = 360, scale = 1, Wp = 0, Hp = 0;
  const cam = { x: 0, y: 0 };
  let tour = true, tourIdx = 0, tourT = 0, tourFrom = null, nieblaK = 1, nocheK = 0.15, t = 0; // hora dorada: base 15 %, las zonas oscuras suman hasta 55 %
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- carga ----------
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('No cargó ' + src)); i.src = src; });
  async function boot() {
    D = await (await fetch('mundo.json')).json();
    const files = new Set(['agua.png', 'fx/luz.png', 'fx/nube.png', 'fx/niebla_nubes.png', 'fx/niebla_jirones.png']);
    D.chunks.forEach((c) => files.add(c.f));
    D.sprites.forEach((s) => Object.values(s.anims).forEach((a) => files.add(a.f)));
    Object.values(D.creatures).forEach((c) => Object.values(c.anims).forEach((a) => files.add(a.f)));
    Object.values(D.particles).forEach((p) => files.add(p.f));
    let done = 0; const all = [...files];
    await Promise.all(all.map(async (f) => { IMG[f] = await load(f); done++; $('pct').textContent = Math.round((done / all.length) * 100) + '%'; }));
    prepare();
    $('carga').hidden = true;
    requestAnimationFrame(frame);
  }

  // ---------- preparación ----------
  let waterMask, grid, GS = 256, gw = 0, gh = 0, decos = [], crows = [], eyes = [], tinted = {}, vignette = null;
  function prepare() {
    waterMask = new Uint8Array((D.w / 32) * (D.h / 32));
    D.water.forEach((i) => (waterMask[i] = 1));
    gw = Math.ceil(D.w / GS); gh = Math.ceil(D.h / GS);
    grid = Array.from({ length: gw * gh }, () => []);
    D.decos.forEach(([si, x, y], k) => {
      const s = D.sprites[si];
      const d = { s, x, y, k, ph: hash(x, y), anim: s.anims.idle ? 'idle' : s.anims.girar ? 'girar' : s.anims.dormido ? 'dormido' : Object.keys(s.anims)[0], blinkAt: 2 + hash(y, x) * 8, blinkT: -1 };
      decos.push(d);
      grid[clamp(Math.floor(y / GS), 0, gh - 1) * gw + clamp(Math.floor(x / GS), 0, gw - 1)].push(d);
    });
    for (const e of D.entities) {
      if (e.tipo !== 'criatura') continue;
      if (e.props.especie === 'cuervo') crows.push({ hx: e.x, hy: e.y, x: e.x, y: e.y, st: 'quieto', vx: 0, vy: 0, t0: hash(e.x, e.y) * 5, left: hash(e.y, e.x) < 0.5, back: 0 });
      else eyes.push({ x: e.x, y: e.y, blinkAt: hash(e.x, 3) * 6, blinkT: -1, ph: hash(e.x, e.y) });
    }
    const start = D.postales[0];
    cam.x = start.x; cam.y = start.y;
    resize();
  }

  function resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    Wp = Math.round(innerWidth * dpr); Hp = Math.round(innerHeight * dpr);
    scale = Math.max(1, Math.round(Math.min(Wp / 640, Hp / 360)));
    VW = Math.ceil(Wp / scale); VH = Math.ceil(Hp / scale);
    cv.width = Wp; cv.height = Hp;
    low.width = VW; low.height = VH; dark.width = VW; dark.height = VH;
    vignette = document.createElement('canvas'); vignette.width = VW; vignette.height = VH;
    const vg = vignette.getContext('2d');
    const gr = vg.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    gr.addColorStop(0, 'rgba(2,4,10,0)'); gr.addColorStop(1, 'rgba(2,4,10,0.75)');
    vg.fillStyle = gr; vg.fillRect(0, 0, VW, VH);
  }
  addEventListener('resize', () => D && resize());

  /** Luz teñida (se arma una vez por color). */
  function tint(color) {
    if (tinted[color]) return tinted[color];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.drawImage(IMG['fx/luz.png'], 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, 128, 128);
    return (tinted[color] = c);
  }

  // ---------- zonas ----------
  let zoneNow = null; const visited = new Set();
  const Z = { niebla: 0.3, oscuridad: 0, luz: [255, 236, 200] };
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function zoneAt(x, y) {
    let best = null;
    for (const z of D.zones) if (x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h && (!best || z.w * z.h < best.w * best.h)) best = z;
    return best;
  }
  let bannerTimer = 0;
  function updateZone(dt) {
    const z = zoneAt(cam.x, cam.y);
    if (z !== zoneNow) {
      zoneNow = z;
      $('zonaActual').textContent = z ? z.nombre : 'Bosque GG';
      if (z && !visited.has(z.nombre)) {
        visited.add(z.nombre);
        $('zonaNombre').textContent = z.nombre;
        $('zona').classList.add('ver');
        clearTimeout(bannerTimer); bannerTimer = setTimeout(() => $('zona').classList.remove('ver'), 3200);
      }
    }
    const p = z ? z.props : {};
    const k = Math.min(1, dt * 1.2);
    Z.niebla = lerp(Z.niebla, p.niebla ?? 0.3, k);
    Z.oscuridad = lerp(Z.oscuridad, p.oscuridad ?? 0, k);
    const target = p.luz ? hexRGB(p.luz) : [255, 236, 200];
    Z.luz = Z.luz.map((v, i) => lerp(v, target[i], k));
    setAmbience(p.ambiente ?? 'bosque', dt);
  }

  // ---------- sonido ----------
  let soundOn = false; const AUD = {};
  function setAmbience(name, dt) {
    if (!soundOn) return;
    for (const [n, a] of Object.entries(AUD)) {
      const want = n === name ? 0.55 : 0;
      a.volume = clamp(lerp(a.volume, want, Math.min(1, dt * 0.8)), 0, 1);
    }
  }
  $('btnSonido').addEventListener('click', () => {
    soundOn = !soundOn;
    $('btnSonido').setAttribute('aria-pressed', String(soundOn));
    if (soundOn) {
      for (const [n, f] of Object.entries(D.audio || {})) {
        if (!AUD[n]) { AUD[n] = new Audio(f); AUD[n].loop = true; AUD[n].volume = 0; }
        AUD[n].play().catch(() => {});
      }
    } else for (const a of Object.values(AUD)) a.pause();
  });

  // ---------- partículas ----------
  const P = [];
  const want = (name) => !!(zoneNow && String(zoneNow.props.particulas || '').split(',').includes(name));
  function spawn(dt) {
    const count = (type) => P.reduce((n, p) => n + (p.type === type ? 1 : 0), 0);
    const rx = () => cam.x - VW / 2 + Math.random() * VW, ry = () => cam.y - VH / 2 + Math.random() * VH;
    const night = nocheK + Z.oscuridad;
    if ((want('luciernagas') || night > 0.6) && count('luciernaga') < 14 + night * 16) P.push({ type: 'luciernaga', x: rx(), y: ry(), vx: 0, vy: 0, life: 6 + Math.random() * 6, age: 0, ph: Math.random() * 9 });
    if (want('fuegos_fatuos') && count('fuego') < 4 && Math.random() < dt * 0.6) P.push({ type: 'fuego', x: rx(), y: ry(), life: 10 + Math.random() * 8, age: 0, ph: Math.random() * 9, violet: Math.random() < 0.4 });
    if ((want('hojas') || want('polen') || Math.random() < 0.2) && count('hoja') < 10 && Math.random() < dt * 2) P.push({ type: 'hoja', x: rx(), y: cam.y - VH / 2 - 8, vx: 6 + Math.random() * 10, vy: 12 + Math.random() * 10, life: 14, age: 0, ph: Math.random() * 9, autumn: Math.random() < 0.5 });
    if (want('mariposas') && count('mariposa') < 5 && Math.random() < dt) P.push({ type: 'mariposa', x: rx(), y: ry(), life: 12, age: 0, ph: Math.random() * 9, c: ['azul', 'naranja', 'rosa'][Math.floor(Math.random() * 3)] });
    if ((want('polen') || want('esporas') || want('polvo') || want('brasas')) && count('mota') < 30 && Math.random() < dt * 12) {
      const kind = want('brasas') ? 'brasa' : want('esporas') ? 'espora' : want('polvo') ? 'polvo' : 'polen';
      P.push({ type: 'mota', kind, x: rx(), y: ry(), vx: (Math.random() - 0.3) * 6, vy: kind === 'brasa' ? -14 : -3 - Math.random() * 4, life: 4 + Math.random() * 4, age: 0, ph: Math.random() * 9 });
    }
    if (want('murcielagos') && count('murcielago') < 2 && Math.random() < dt * 0.15) { const l = Math.random() < 0.5; P.push({ type: 'murcielago', x: l ? cam.x - VW / 2 - 20 : cam.x + VW / 2 + 20, y: ry() - 40, vx: l ? 70 : -70, vy: -6, life: 12, age: 0, ph: 0 }); }
  }
  function stepParticles(dt) {
    for (const p of P) {
      p.age += dt;
      if (p.type === 'luciernaga') { p.x += Math.sin(t * 0.7 + p.ph) * 8 * dt; p.y += Math.cos(t * 0.9 + p.ph * 1.3) * 6 * dt; }
      else if (p.type === 'fuego') { p.x += Math.sin(t * 0.4 + p.ph) * 14 * dt; p.y += Math.cos(t * 0.6 + p.ph) * 9 * dt; }
      else if (p.type === 'hoja') { p.x += (p.vx + Math.sin(t * 2 + p.ph) * 14) * dt; p.y += p.vy * dt; }
      else if (p.type === 'mariposa') { p.x += Math.sin(t * 1.3 + p.ph) * 22 * dt; p.y += Math.sin(t * 2.1 + p.ph * 2) * 16 * dt; }
      else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; }
    }
    for (let i = P.length - 1; i >= 0; i--) if (P[i].age > P[i].life || Math.abs(P[i].x - cam.x) > VW || Math.abs(P[i].y - cam.y) > VH) P.splice(i, 1);
  }
  const fade = (p) => Math.min(1, p.age / 0.8, (p.life - p.age) / 0.8);
  function drawStrip(img, n, f, x, y, w, h) { g.drawImage(img, (f % n) * w, 0, w, h, Math.round(x), Math.round(y), w, h); }

  // ---------- cámara ----------
  const TOUR_MOVE = 9, TOUR_HOLD = 4;
  function stepCamera(dt) {
    if (tour && D.postales.length) {
      tourT += dt;
      const target = D.postales[tourIdx % D.postales.length];
      if (!tourFrom) tourFrom = { x: cam.x, y: cam.y };
      const k = clamp(tourT / TOUR_MOVE, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      cam.x = lerp(tourFrom.x, target.x, e); cam.y = lerp(tourFrom.y, target.y, e);
      if (tourT > TOUR_MOVE + TOUR_HOLD) { tourIdx++; tourT = 0; tourFrom = null; }
    }
    const kx = keys.has('ArrowLeft') || keys.has('a') ? -1 : keys.has('ArrowRight') || keys.has('d') ? 1 : 0;
    const ky = keys.has('ArrowUp') || keys.has('w') ? -1 : keys.has('ArrowDown') || keys.has('s') ? 1 : 0;
    if (kx || ky) { stopTour(); cam.x += kx * 140 * dt; cam.y += ky * 140 * dt; }
    cam.x = clamp(cam.x, VW / 2, D.w - VW / 2); cam.y = clamp(cam.y, VH / 2, D.h - VH / 2);
  }
  function stopTour() { if (!tour) return; tour = false; $('btnTour').setAttribute('aria-pressed', 'false'); }
  $('btnTour').addEventListener('click', () => { tour = !tour; tourT = 0; tourFrom = null; $('btnTour').setAttribute('aria-pressed', String(tour)); });
  $('niebla').addEventListener('input', (e) => (nieblaK = e.target.value / 100));
  $('noche').addEventListener('input', (e) => (nocheK = e.target.value / 100));
  const keys = new Set();
  addEventListener('keydown', (e) => keys.add(e.key));
  addEventListener('keyup', (e) => keys.delete(e.key));
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dpr = Wp / innerWidth, dx = (e.clientX - drag.x) * dpr / scale, dy = (e.clientY - drag.y) * dpr / scale;
    if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; stopTour(); }
    if (drag.moved) { cam.x = drag.cx - dx; cam.y = drag.cy - dy; }
  });
  cv.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const dpr = Wp / innerWidth, wx = cam.x - VW / 2 + (e.clientX * dpr) / scale, wy = cam.y - VH / 2 + (e.clientY * dpr) / scale;
      for (const c of crows) if (c.st !== 'volar' && Math.hypot(c.x - wx, c.y - 8 - wy) < 26) scare(c, wx);
    }
    drag = null;
  });

  // ---------- criaturas ----------
  function scare(c, fromX) { c.st = 'volar'; c.left = fromX > c.x; c.vx = (c.left ? -1 : 1) * (50 + Math.random() * 40); c.vy = -55 - Math.random() * 30; c.back = 14 + Math.random() * 10; }
  function stepCreatures(dt) {
    for (const c of crows) {
      if (c.st === 'volar') {
        c.x += c.vx * dt; c.y += c.vy * dt; c.vy -= 6 * dt; c.back -= dt;
        if (c.back <= 0) { c.st = 'quieto'; c.x = c.hx; c.y = c.hy; }
      } else {
        // la heroína (el centro de la cámara) se acerca y salen volando
        if (Math.hypot(c.x - cam.x, c.y - cam.y) < 46) scare(c, cam.x);
        if (c.st === 'quieto' && Math.random() < dt * 0.25) { c.st = 'picotear'; c.t0 = t; }
        if (c.st === 'picotear' && t - c.t0 > 0.65) c.st = 'quieto';
      }
    }
    for (const e of eyes) if (t > e.blinkAt && e.blinkT < 0) { e.blinkT = t; e.blinkAt = t + 2 + Math.random() * 6; }
  }

  // ---------- dibujo ----------
  function frame(ms) {
    const now = ms / 1000, dt = Math.min(0.05, now - (frame.last || now)); frame.last = now;
    t += reduce ? dt * 0.25 : dt;
    stepCamera(dt); updateZone(dt); spawn(dt); stepParticles(dt); stepCreatures(dt);
    const ox = Math.round(cam.x - VW / 2), oy = Math.round(cam.y - VH / 2);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#0a1418'; g.fillRect(0, 0, VW, VH);
    g.save(); g.translate(-ox, -oy);

    // 1. agua animada (debajo del suelo)
    const wf = Math.floor(t / 0.22) % 4, cols = D.w / 32;
    for (let ty = Math.max(0, Math.floor(oy / 32)); ty <= Math.min(D.h / 32 - 1, Math.floor((oy + VH) / 32)); ty++)
      for (let tx = Math.max(0, Math.floor(ox / 32)); tx <= Math.min(cols - 1, Math.floor((ox + VW) / 32)); tx++)
        if (waterMask[ty * cols + tx]) g.drawImage(IMG['agua.png'], wf * 32, 0, 32, 32, tx * 32, ty * 32, 32, 32);
    // 2. suelo
    for (const c of D.chunks) if (c.x < ox + VW && c.x + c.w > ox && c.y < oy + VH && c.y + c.h > oy) g.drawImage(IMG[c.f], c.x, c.y);
    // 3. objetos visibles
    const vis = [], M = 260;
    for (let gy = clamp(Math.floor((oy - 40) / GS), 0, gh - 1); gy <= clamp(Math.floor((oy + VH + M) / GS), 0, gh - 1); gy++)
      for (let gx = clamp(Math.floor((ox - M / 2) / GS), 0, gw - 1); gx <= clamp(Math.floor((ox + VW + M / 2) / GS), 0, gw - 1); gx++)
        for (const d of grid[gy * gw + gx]) if (d.x + d.s.w > ox && d.x - d.s.w < ox + VW && d.y - d.s.h < oy + VH && d.y + 8 > oy) vis.push(d);
    const lights = [];
    const drawDeco = (d) => {
      const s = d.s;
      let an = d.anim;
      if (s.anims.despierto) {
        const near = Math.hypot(d.x - cam.x, d.y - 60 - cam.y) < 130;
        an = near ? 'despierto' : 'dormido';
        if (near && t > d.blinkAt && d.blinkT < 0) { d.blinkT = t; d.blinkAt = t + 3 + hash(d.k, Math.floor(t)) * 5; }
        if (d.blinkT >= 0) { if (t - d.blinkT < 0.42) an = 'parpadeo'; else d.blinkT = -1; }
      }
      const a = s.anims[an];
      const f = an === 'parpadeo' ? Math.min(a.n - 1, Math.floor((t - d.blinkT) * a.fps)) : Math.floor(t * a.fps + d.ph * a.n) % a.n;
      g.drawImage(IMG[a.f], f * s.w, 0, s.w, s.h, d.x - s.ax, d.y - s.ay, s.w, s.h);
      if (s.light) lights.push({ x: d.x, y: d.y - (s.light.dy || 0), r: s.light.radius, c: s.light.color, fl: s.light.flicker, pu: s.light.pulse, ph: d.ph });
      if (an === 'despierto') lights.push({ x: d.x, y: d.y - 54, r: 46, c: s.name.endsWith('1') ? '#7affc8' : '#ffd25a', pu: true, ph: d.ph });
    };
    for (const d of vis) if (d.s.layer === 'suelo') drawDeco(d);
    const sorted = vis.filter((d) => d.s.layer !== 'suelo');
    // cuervos en el mismo orden por y
    const crowSpr = D.creatures.cuervo, crowL = D.creatures.cuervo_izq;
    for (const c of crows) if (Math.abs(c.x - cam.x) < VW && Math.abs(c.y - cam.y) < VH) sorted.push({ crow: c, y: c.y });
    sorted.sort((a, b) => a.y - b.y);
    for (const d of sorted) {
      if (d.crow) {
        const c = d.crow, spr = c.left ? crowL : crowSpr, a = spr.anims[c.st];
        const f = c.st === 'picotear' ? Math.min(a.n - 1, Math.floor((t - c.t0) * a.fps)) : Math.floor(t * a.fps + c.t0) % a.n;
        g.drawImage(IMG[a.f], f * 16, 0, 16, 16, Math.round(c.x - 8), Math.round(c.y - 15), 16, 16);
      } else drawDeco(d);
    }
    // 4. sombras de nubes
    const cl = IMG['fx/nube.png'];
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i, 1) * D.w + t * (7 + i)) % (D.w + 400)) - 200, y = hash(i, 2) * D.h;
      if (x + cl.width * 2 > ox && x < ox + VW && y + cl.height * 2 > oy && y < oy + VH) { g.globalAlpha = 0.8; g.drawImage(cl, x, y, cl.width * 2, cl.height * 2); g.globalAlpha = 1; }
    }
    // 5. partículas que van debajo de la luz (hojas, mariposas, motas)
    for (const p of P) {
      if (p.type === 'hoja') { const pp = D.particles[p.autumn ? 'hoja_otono' : 'hoja_verde']; g.globalAlpha = fade(p); drawStrip(IMG[pp.f], pp.n, Math.floor(t * pp.fps + p.ph), p.x, p.y, pp.w, pp.h); }
      else if (p.type === 'mariposa') { const pp = D.particles['mariposa_' + p.c]; g.globalAlpha = fade(p); drawStrip(IMG[pp.f], pp.n, Math.floor(t * pp.fps + p.ph), p.x, p.y, pp.w, pp.h); }
      else if (p.type === 'mota') { const pp = D.particles[p.kind]; g.globalAlpha = fade(p) * 0.9; drawStrip(IMG[pp.f], pp.n, Math.floor(t * pp.fps + p.ph), p.x, p.y, pp.w, pp.h); if (p.kind === 'brasa') lights.push({ x: p.x, y: p.y, r: 10, c: '#ff8a3a' }); }
      else if (p.type === 'murcielago') { const b = D.creatures.murcielago.anims.volar; g.globalAlpha = 1; drawStrip(IMG[b.f], b.n, Math.floor(t * b.fps), p.x, p.y + Math.sin(t * 6) * 3, 16, 8); }
    }
    g.globalAlpha = 1;
    g.restore();

    // 6. bruma en dos capas que corren con el viento
    const fogA = clamp(Z.niebla * nieblaK, 0, 1.5);
    const fogLayer = (img, par, sx, sy, alpha, sc) => {
      if (alpha <= 0.01) return;
      const S = img.width * sc;
      const fx = -((((cam.x * par + t * sx) % S) + S) % S), fy = -((((cam.y * par + t * sy) % S) + S) % S);
      g.globalAlpha = Math.min(1, alpha);
      for (let y = fy - S; y < VH; y += S) for (let x = fx - S; x < VW; x += S) g.drawImage(img, Math.round(x), Math.round(y), S, S);
      g.globalAlpha = 1;
    };
    fogLayer(IMG['fx/niebla_jirones.png'], 1, 12, 1.5, fogA * 0.85, 2);
    fogLayer(IMG['fx/niebla_nubes.png'], 1.15, 7, -2, fogA * 0.55, 2);

    // 7. oscuridad con pozos de luz
    const night = clamp(nocheK + Z.oscuridad, 0, 0.6);
    dg.globalCompositeOperation = 'source-over';
    dg.clearRect(0, 0, VW, VH);
    dg.fillStyle = `rgba(3,6,18,${night})`; dg.fillRect(0, 0, VW, VH);
    dg.globalCompositeOperation = 'destination-out';
    const L = IMG['fx/luz.png'];
    // la heroína lleva un farol: luz suave donde está la cámara
    lights.push({ x: cam.x, y: cam.y, r: 92, c: '#ffe2a8', hero: true, ph: 0 });
    for (const p of P) if (p.type === 'fuego') lights.push({ x: p.x + 8, y: p.y + 8, r: 44, c: p.violet ? '#c8a0ff' : '#8af8ff', pu: true, ph: p.ph });
    for (const l of lights) {
      const k = l.fl ? 0.86 + 0.14 * Math.sin(t * 11 + l.ph * 20) * Math.sin(t * 7.3 + l.ph * 9) : l.pu ? 0.82 + 0.18 * Math.sin(t * 2 + l.ph * 6) : 1;
      const R = l.r * k;
      dg.globalAlpha = l.hero ? 0.75 : 1;
      dg.drawImage(L, l.x - ox - R, l.y - oy - R, R * 2, R * 2);
    }
    dg.globalAlpha = 1;
    g.drawImage(dark, 0, 0);
    // 8. resplandor de color de cada luz
    g.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (l.hero) continue;
      const k = l.fl ? 0.85 + 0.15 * Math.sin(t * 9 + l.ph * 13) : l.pu ? 0.8 + 0.2 * Math.sin(t * 2 + l.ph * 6) : 1;
      const R = l.r * 0.7 * k;
      g.globalAlpha = 0.22 + night * 0.25;
      g.drawImage(tint(l.c), l.x - ox - R, l.y - oy - R, R * 2, R * 2);
    }
    // 9. lo que brilla en la oscuridad: luciérnagas, fuegos fatuos, ojos
    for (const p of P) {
      if (p.type === 'luciernaga') { const pp = D.particles.luciernaga; g.globalAlpha = fade(p) * (0.6 + 0.4 * Math.sin(t * 3 + p.ph)); drawStrip(IMG[pp.f], pp.n, Math.floor(t * pp.fps + p.ph), p.x - ox, p.y - oy, pp.w, pp.h); }
      else if (p.type === 'fuego') { const w = D.creatures[p.violet ? 'fuego_fatuo_violeta' : 'fuego_fatuo'].anims.flotar; g.globalAlpha = fade(p); drawStrip(IMG[w.f], w.n, Math.floor(t * w.fps + p.ph), p.x - ox, p.y - oy + Math.sin(t * 2 + p.ph) * 3, 16, 16); }
    }
    g.globalCompositeOperation = 'source-over';
    for (const e of eyes) {
      if (Math.abs(e.x - cam.x) > VW / 2 + 20 || Math.abs(e.y - cam.y) > VH / 2 + 20) continue;
      const o = D.creatures.ojos.anims;
      g.globalAlpha = clamp(0.35 + night, 0, 1);
      if (e.blinkT >= 0 && t - e.blinkT < 0.36) drawStrip(IMG[o.parpadeo.f], o.parpadeo.n, Math.floor((t - e.blinkT) * o.parpadeo.fps), e.x - 8 - ox, e.y - 4 - oy, 16, 8);
      else { e.blinkT = -1; drawStrip(IMG[o.mirar.f], o.mirar.n, Math.floor(t * o.mirar.fps + e.ph * 4), e.x - 8 - ox, e.y - 4 - oy, 16, 8); }
    }
    g.globalAlpha = 1;
    // 10. color de la zona y viñeta
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = `rgb(${Z.luz.map(Math.round).join(',')})`; g.globalAlpha = 0.35; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(vignette, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, VW * scale, VH * scale);
    requestAnimationFrame(frame);
  }

  // para pruebas automáticas (capturas): mover la cámara y apagar el recorrido
  window.__visor = { cam, ir: (x, y) => { stopTour(); cam.x = x; cam.y = y; }, noche: (v) => (nocheK = v) };
  boot().catch((e) => { $('pct').textContent = ''; $('cargaTexto').textContent = 'No se pudo cargar el bosque: ' + e.message; });
})();
