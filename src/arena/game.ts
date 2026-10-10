import { Actor } from './actor';
import type { Kit, KitEvent } from './kit';
import { DIR_WORLD, SQRT2, dist, nearestDirection, screenIntentToWorld, toScreen, type Direction, type Vec } from './iso';
import { makeScene, toUV, type Scene, type SceneId } from './scenes';
import { Effects, Sfx } from './fx';

/**
 * La arena: un juego mínimo por deporte que usa el kit como lo haría un juego de verdad.
 * Cada deporte trae su reposo, sus formas de moverse y sus acciones. Si el kit no trae una animación, su botón no sale.
 */

export interface SportConfig {
  idle: string;
  walk?: string;
  /** cómo se corre (atletismo: correr, sprint o vallas; natación: los estilos) */
  gaits: string[];
  actions: string[];
  rival?: boolean;
}

export const SPORTS: Record<SceneId, SportConfig> = {
  atletismo: { idle: 'idle', walk: 'walk', gaits: ['run', 'sprint', 'hurdles'], actions: ['sprint_start', 'long_jump', 'pole_vault', 'shot_put', 'javelin', 'celebrate'] },
  natacion: { idle: 'tread_water', gaits: ['swim', 'swim_back', 'swim_breast', 'swim_fly'], actions: ['dive'] },
  voley: { idle: 'vb_ready', walk: 'walk', gaits: ['run'], actions: ['serve', 'vb_bump', 'vb_set', 'spike', 'block', 'vb_dive'], rival: true },
  tenis: { idle: 'tn_ready', walk: 'walk', gaits: ['run'], actions: ['tennis_serve', 'forehand', 'backhand', 'tn_volley', 'tn_smash'], rival: true },
  pelea: { idle: 'guard', walk: 'fight_step', gaits: [], actions: ['jab', 'punch', 'hook', 'uppercut', 'low_kick', 'kick_martial', 'flying_kick', 'fight_block', 'slip'], rival: true },
};

const DAMAGE: Record<string, number> = { jab: 6, punch: 10, hook: 12, uppercut: 14, low_kick: 8, kick_martial: 14, flying_kick: 18 };
const SERVES = new Set(['serve', 'tennis_serve']);
/**
 * Escala de juego: metros por unidad del mundo. Los chibis tienen piernas cortas y no corren a escala real; con esta
 * escala los 100 m de la pista son 600 unidades y un salto o un lanzamiento dan números de atletismo creíbles.
 */
const METERS = 1 / 6;
/** largo de la recta: de la salida a la meta */
export const START_U = -260, FINISH_U = START_U + 100 / METERS;
const G = 170;

interface Ball { pos: Vec; z: number; v: Vec; vz: number; bounces: number; side: -1 | 1; live: boolean; t: number; lastBy: Actor | null; bounceSide?: -1 | 1 }
interface Thrown { kind: 'shot' | 'javelin'; pos: Vec; z: number; v: Vec; vz: number; from: Vec; landed: boolean; t: number; angle: number }
interface Toss { actor: Actor; from: Vec; z0: number; to: Vec; zc: number; dur: number; t: number }

export interface LogLine { t: number; who: string; anim: string; tipo: string; cuadro: number }

export class Game {
  scene!: Scene;
  player!: Actor;
  rival: Actor | null = null;
  fx = new Effects();
  sfx = new Sfx();
  ball: Ball | null = null;
  thrown: Thrown[] = [];
  toss: Toss | null = null;
  hitstop = 0;
  time = 0;
  score: [number, number] = [0, 0];
  hp: [number, number] = [100, 100];
  message = '';
  messageT = 0;
  log: LogLine[] = [];
  /** contador de eventos por tipo (lo leen las pruebas) */
  counts: Record<string, number> = {};
  sport: SceneId = 'atletismo';
  gait = 0;
  // estado por deporte
  private jumpFrom: Vec | null = null;
  private raceStart: number | null = null;
  private lapStart: number | null = null;
  onBlock = false;
  private ai = { t: 0, plan: '' as string, target: null as Vec | null, swingAt: 0, swing: '' };
  private server: 'player' | 'rival' = 'player';
  private waitServe = 0;
  private koT = 0;
  private winner: Actor | null = null;
  private wake = 0;

  constructor(readonly kit: Kit) {}

  get cfg() { return SPORTS[this.sport]; }

  async setup(athlete: string, rival: string | null, sport: SceneId) {
    this.sport = sport;
    this.scene = makeScene(sport);
    this.player = new Actor(this.kit, athlete, sport, this.scene.player.pos, this.scene.player.facing, (a, e, n) => this.onEvent(a, e, n));
    this.player.sheets = await this.kit.preload(athlete, sport);
    this.rival = null;
    if (this.cfg.rival && rival && this.scene.rival) {
      this.rival = new Actor(this.kit, rival, sport, this.scene.rival.pos, this.scene.rival.facing, (a, e, n) => this.onEvent(a, e, n));
      this.rival.sheets = await this.kit.preload(rival, sport);
    }
    this.reset();
  }

  reset() {
    const s = this.scene;
    this.player.interrupt();
    this.player.pos = { ...s.player.pos };
    this.player.facing = s.player.facing;
    this.player.inWater = false;
    this.player.anim = '';
    if (this.rival && s.rival) {
      this.rival.interrupt();
      this.rival.pos = { ...s.rival.pos };
      this.rival.facing = s.rival.facing;
      this.rival.anim = '';
      this.rival.loop(this.cfg.idle);
    }
    this.onBlock = this.sport === 'natacion';
    this.player.loop(this.onBlock ? 'idle' : this.cfg.idle);
    if (!this.player.anim) this.player.loop('idle');
    this.ball = null; this.thrown = []; this.toss = null;
    this.score = [0, 0]; this.hp = [100, 100];
    this.jumpFrom = null; this.raceStart = null; this.lapStart = null; this.koT = 0; this.winner = null;
    this.server = 'player'; this.waitServe = 0;
    this.ai = { t: 1, plan: '', target: null, swingAt: 0, swing: '' };
    this.say('');
  }

  lang: 'es' | 'en' = 'es';
  say(text: string, secs = 2.2) { this.message = text; this.messageT = text ? secs : 0; }
  private m(es: string, en: string) { return this.lang === 'es' ? es : en; }

  /** Acciones que este atleta tiene de verdad (las demás no se muestran). */
  actions(): string[] { return this.cfg.actions.filter((a) => this.player.has(a)); }
  gaits(): string[] { return this.cfg.gaits.filter((a) => this.player.has(a)); }

  act(name: string) {
    const p = this.player;
    if (p.busy) return;
    if (this.sport === 'natacion') {
      if (name !== 'dive' || !this.onBlock) return;
      this.onBlock = false;
      p.inWater = true;
      p.play('dive', () => { p.loop(this.cfg.idle); });
      return;
    }
    if (this.sport === 'voley' || this.sport === 'tenis') {
      // se pega mirando a la cancha del rival
      p.facing = 'down_right';
      if (SERVES.has(name) && (this.ball || this.server !== 'player')) return;
    }
    if (this.sport === 'pelea') {
      if (this.koT > 0) return;
      p.facing = this.faceTo(p, this.rival!);
    }
    if (name === 'sprint_start') this.raceStart = null;
    p.play(name, () => p.loop(this.cfg.idle));
  }

  private faceTo(a: Actor, b: Actor): Direction {
    return nearestDirection({ x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y });
  }

  /** Un paso del juego. intent: lo que pide el jugador en pantalla; run: si va corriendo. */
  step(dt: number, intent: Vec, run: boolean) {
    this.time += dt;
    if (this.messageT > 0) { this.messageT -= dt; if (this.messageT <= 0) this.message = ''; }
    this.fx.update(dt);
    // golpe que congela: todos quietos unos cuadros
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.movePlayer(dt, intent, run);
    if (this.rival) this.moveRival(dt);
    this.updateBall(dt);
    this.updateThrown(dt);
    this.updateSport(dt);
  }

  private movePlayer(dt: number, intent: Vec, run: boolean) {
    const p = this.player;
    if (p.busy) { p.update(dt); this.keepApart(); this.clamp(p, -1); return; }
    const k = Math.min(1, Math.hypot(intent.x, intent.y));
    const blocked = this.onBlock || (this.sport === 'pelea' && this.koT > 0);
    if (k < 0.15 || blocked) {
      p.reverse = false;
      if (this.sport === 'pelea' && this.rival && this.koT <= 0) p.facing = this.faceTo(p, this.rival);
      p.loop(this.onBlock ? 'idle' : this.cfg.idle);
      p.update(dt);
      return;
    }
    const w = screenIntentToWorld(intent.x, intent.y);
    const dir = nearestDirection(w);
    let gait = run || !this.cfg.walk ? this.gaits()[this.gait] ?? this.cfg.walk ?? this.cfg.idle : this.cfg.walk;
    if (this.sport === 'pelea') {
      // en la pelea se mira siempre al rival y se camina en guardia, hacia atrás al revés
      gait = this.cfg.walk!;
      p.facing = this.faceTo(p, this.rival!);
      const f = DIR_WORLD[p.facing], m = DIR_WORLD[dir];
      p.reverse = f.x * m.x + f.y * m.y < -0.1;
    } else {
      p.facing = dir;
      p.reverse = false;
    }
    p.loop(gait);
    // el ciclo con avance mueve al atleta a su velocidad natural (con la palanca, más lento y la animación también)
    p.update(dt, { dir: DIR_WORLD[dir], k: this.sport === 'pelea' ? k * 2 : k });
    this.keepApart();
    this.clamp(p, -1);
  }

  private clamp(a: Actor, side: -1 | 1) {
    const s = this.scene.netX !== undefined ? side : undefined;
    a.pos = this.scene.clamp(a.pos, s);
  }

  /** dos peleadores no se meten uno dentro del otro */
  private keepApart() {
    if (this.sport !== 'pelea' || !this.rival) return;
    const a = this.player, b = this.rival;
    const d = dist(a.pos, b.pos), min = 15;
    if (d >= min || d === 0) return;
    const push = (min - d) / 2, ux = (a.pos.x - b.pos.x) / d, uy = (a.pos.y - b.pos.y) / d;
    a.pos = { x: a.pos.x + ux * push, y: a.pos.y + uy * push };
    b.pos = { x: b.pos.x - ux * push, y: b.pos.y - uy * push };
  }

  // ---------- eventos del kit ----------

  private onEvent(a: Actor, e: KitEvent, anim: string) {
    this.counts[e.tipo] = (this.counts[e.tipo] ?? 0) + 1;
    this.log.unshift({ t: this.time, who: a === this.player ? 'J1' : 'CPU', anim, tipo: e.tipo, cuadro: e.cuadro });
    this.log.length = Math.min(this.log.length, 8);
    const water = a.inWater && a.waterRow() !== null;
    switch (e.tipo) {
      case 'paso':
        if (!water) { this.fx.dust(a.pos, 3); this.sfx.step(e.pie !== 'lejos'); }
        if (anim === 'sprint_start' && this.raceStart === null) this.raceStart = this.time;
        break;
      case 'despegue':
        this.jumpFrom = { ...a.pos };
        if (!water) this.fx.dust(a.pos, 6);
        this.sfx.whoosh();
        if (anim === 'sprint_start') this.raceStart = this.time;
        break;
      case 'aterriza': {
        const pit = this.scene.pit, uv = toUV(a.pos);
        const inPit = !!pit && uv.u >= pit.u0 && uv.u <= pit.u1 && uv.v >= pit.v0 && uv.v <= pit.v1;
        if (inPit) this.fx.burst(a.pos, 1, 14, ['#e8d4a0', '#d2b57a', '#f2e4bc'], 30, 20);
        else this.fx.dust(a.pos, 8);
        this.sfx.land();
        if (anim === 'pole_vault') this.fx.shake = 2;
        if (anim === 'long_jump' && this.jumpFrom) {
          const m = dist(this.jumpFrom, a.pos) * METERS;
          this.fx.text(a.pos, 40, `${m.toFixed(2)} m`, inPit ? '#ffd34d' : '#f5f2ff');
        }
        break;
      }
      case 'suelta': this.release(a, e, anim); break;
      case 'impacto': this.impact(a, e, anim); break;
    }
  }

  private point(a: Actor, e: KitEvent) {
    const p = e.punto?.[a.row];
    return p ? a.pointToWorld(p) : { pos: { ...a.pos }, z: 18 };
  }

  private release(a: Actor, e: KitEvent, anim: string) {
    const at = this.point(a, e);
    const f = DIR_WORLD[a.facing];
    if (anim === 'shot_put' || anim === 'javelin') {
      const jav = anim === 'javelin';
      const sp = jav ? 150 : 92, ang = jav ? 0.62 : 0.68;
      const d = DIR_WORLD[((this.kit.anim(a.id, a.sport, anim)?.rumbo?.[a.row]) ?? a.facing) as Direction] ?? f;
      this.thrown.push({ kind: jav ? 'javelin' : 'shot', pos: at.pos, z: at.z, v: { x: d.x * sp * Math.cos(ang), y: d.y * sp * Math.cos(ang) }, vz: sp * Math.sin(ang), from: { ...a.pos }, landed: false, t: 0, angle: 0 });
      this.sfx.whoosh();
      return;
    }
    if (SERVES.has(anim)) {
      // lanzamiento del saque: la pelota sube y baja justo a la mano en el cuadro del golpe (los dos vienen en el kit)
      const d = this.kit.anim(a.id, a.sport, anim)!;
      const hit = d.eventos?.find((x) => x.tipo === 'impacto');
      if (!hit) return;
      const dur = Math.max(0.1, (hit.cuadro - e.cuadro) / d.fps);
      const c = hit.punto?.[a.row] ? a.pointToWorld(hit.punto[a.row]) : { pos: a.pos, z: 24 };
      this.toss = { actor: a, from: at.pos, z0: at.z, to: c.pos, zc: c.z, dur, t: 0 };
      this.ball = { pos: { ...at.pos }, z: at.z, v: { x: 0, y: 0 }, vz: 0, bounces: 0, side: a === this.player ? -1 : 1, live: false, t: 0, lastBy: a };
    }
  }

  private impact(a: Actor, e: KitEvent, anim: string) {
    if (anim === 'dive') {
      this.fx.burst(a.pos, 1, 18, ['#ffffff', '#cfe8ff', '#8cc8f0'], 40, 50);
      this.sfx.splash(true);
      this.lapStart = this.time;
      return;
    }
    if (this.sport === 'pelea') return this.fightHit(a, e, anim);
    if (this.sport === 'voley' || this.sport === 'tenis') return this.racketHit(a, e, anim);
    if (anim === 'knockout' || anim === 'die') { this.fx.dust(a.pos, 10); this.sfx.land(); }
  }

  // ---------- peleas ----------

  private fightHit(a: Actor, e: KitEvent, anim: string) {
    const b = a === this.player ? this.rival : this.player;
    if (!b) return;
    if (anim === 'knockout') { this.fx.dust(a.pos, 12); this.sfx.land(); this.fx.shake = 3; return; }
    if (anim === 'fight_block') return;
    const dmg = DAMAGE[anim];
    if (!dmg) return;
    const at = this.point(a, e);
    const reach = dist(at.pos, b.pos);
    // el golpe llega si la mano o el pie cae sobre el cuerpo del otro (y no está en el aire con la patada baja)
    if (reach > 9 || this.koT > 0) { this.sfx.whoosh(); return; }
    const toA = { x: a.pos.x - b.pos.x, y: a.pos.y - b.pos.y };
    const bf = DIR_WORLD[b.facing];
    const facingA = bf.x * toA.x + bf.y * toA.y > 0;
    if (b.busy && b.anim === 'fight_block' && facingA) {
      this.fx.burst(at.pos, at.z, 5, ['#cfdcff', '#ffffff'], 20, 10);
      this.sfx.hit(false);
      this.hitstop = 0.04;
      return;
    }
    if (b.busy && b.anim === 'slip') { this.sfx.whoosh(); return; }
    const i = b === this.player ? 0 : 1;
    this.hp[i] = Math.max(0, this.hp[i] - dmg);
    this.fx.burst(at.pos, at.z, 10, ['#ffd34d', '#ffffff', '#ff8a3d'], 50, 30);
    this.fx.text(b.pos, 46, `-${dmg}`, '#ffd34d');
    this.sfx.hit(dmg >= 12);
    this.hitstop = dmg >= 12 ? 0.09 : 0.06;
    this.fx.shake = dmg >= 12 ? 2.5 : 1.5;
    b.interrupt();
    if (this.hp[i] <= 0) {
      b.play('knockout', () => { /* queda en el piso */ }, true);
      this.koT = 3.2;
      this.say(i === 0 ? 'K.O.' : this.m('¡NOCAUT!', 'KNOCKOUT!'), 3);
      this.winner = a;
    } else {
      b.play('fight_hit', () => b.loop(this.cfg.idle), true);
    }
  }

  // ---------- vóley y tenis ----------

  private racketHit(a: Actor, e: KitEvent, anim: string) {
    const ball = this.ball;
    const at = this.point(a, e);
    this.toss = null;
    if (!ball) { this.sfx.whoosh(); return; }
    const near = dist(ball.pos, at.pos) < (a === this.player ? 16 : 14) && Math.abs(ball.z - at.z) < 16;
    if (!near) { this.sfx.whoosh(); return; }
    const side: -1 | 1 = a === this.player ? -1 : 1;
    const volley = this.sport === 'voley';
    // a dónde va: a la cancha del otro, más rápido el remate y el smash, alto la colocación
    const fast = anim === 'spike' || anim === 'tn_smash';
    const T = volley ? (fast ? 0.55 : anim === 'vb_set' ? 1.5 : 1.15) : fast ? 0.55 : 0.95;
    const c = this.scene.court ?? { X: 80, Y: 30 };
    const tx = -side * (c.X * 0.3 + Math.random() * c.X * 0.55);
    const ty = (Math.random() * 2 - 1) * (c.Y - 8);
    const zt = volley ? 14 : 0;
    ball.pos = { ...at.pos }; ball.z = Math.max(4, at.z);
    ball.v = { x: (tx - ball.pos.x) / T, y: (ty - ball.pos.y) / T };
    ball.vz = (zt - ball.z + 0.5 * G * T * T) / T;
    // que pase la red: si la parábola queda baja en x = 0, se sube un poco
    const tNet = ball.v.x !== 0 ? -ball.pos.x / ball.v.x : -1;
    if (tNet > 0 && tNet < T) {
      const zNet = ball.z + ball.vz * tNet - 0.5 * G * tNet * tNet;
      const need = (this.scene.netTop ?? 0) + 4;
      if (zNet < need) ball.vz += (need - zNet) / tNet;
    }
    ball.side = (-side) as -1 | 1;
    ball.live = true; ball.bounces = 0; ball.bounceSide = undefined; ball.lastBy = a; ball.t = 0;
    this.sfx.ball();
    this.fx.burst(at.pos, at.z, 4, ['#ffffff', '#ffd34d'], 20, 10);
    this.hitstop = 0.03;
  }

  private updateBall(dt: number) {
    if (this.toss) {
      // la pelota del saque va de la mano que la suelta a la que pega
      const s = this.toss;
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const vz = (s.zc - s.z0 + 0.5 * G * s.dur * s.dur) / s.dur;
      if (this.ball) {
        this.ball.pos = { x: s.from.x + (s.to.x - s.from.x) * k, y: s.from.y + (s.to.y - s.from.y) * k };
        this.ball.z = s.z0 + vz * Math.min(s.t, s.dur * 1.3) - 0.5 * G * Math.min(s.t, s.dur * 1.3) ** 2;
      }
      if (s.t > s.dur * 1.3) { this.toss = null; this.ball = null; }
      return;
    }
    const b = this.ball;
    if (!b || !b.live) return;
    b.t += dt;
    const x0 = b.pos.x;
    b.pos = { x: b.pos.x + b.v.x * dt, y: b.pos.y + b.v.y * dt };
    b.vz -= G * dt;
    b.z += b.vz * dt;
    // la red
    if (this.scene.netX !== undefined && Math.sign(x0) !== Math.sign(b.pos.x) && b.z < (this.scene.netTop ?? 0)) {
      b.v = { x: -b.v.x * 0.2, y: b.v.y * 0.3 };
      b.pos.x = x0;
      this.sfx.bounce();
    }
    if (b.z <= 0) {
      b.z = 0;
      const volley = this.sport === 'voley';
      if (volley || b.bounces >= 1 || !this.inCourt(b.pos)) return this.scorePoint(b);
      b.bounces++;
      b.bounceSide = b.pos.x < 0 ? -1 : 1;
      b.vz = -b.vz * 0.62;
      b.v = { x: b.v.x * 0.85, y: b.v.y * 0.85 };
      this.sfx.bounce();
      this.fx.dust(b.pos, 2, '#ffffff');
    }
    if (b.t > 6) this.scorePoint(b);
  }

  private inCourt(p: Vec) {
    const c = this.scene.court;
    return !!c && Math.abs(p.x) <= c.X && Math.abs(p.y) <= c.Y;
  }

  private scorePoint(b: Ball) {
    // si ya picó adentro, pierde el que no la devolvió; si no, el lado donde cayó adentro o el que la tiró afuera
    const inside = this.inCourt(b.pos);
    const landedSide = b.pos.x < 0 ? -1 : 1;
    const loser: -1 | 1 = b.bounceSide ?? (inside ? landedSide : (b.lastBy === this.player ? -1 : 1));
    if (loser === 1) { this.score[0]++; this.server = 'player'; this.say(this.m('¡Punto!', 'Point!')); this.player.play('celebrate', () => this.player.loop(this.cfg.idle)); }
    else { this.score[1]++; this.server = 'rival'; this.say(this.m('Punto del rival', 'Rival scores')); }
    this.fx.dust(b.pos, 6, '#ffffff');
    this.sfx.whistle();
    this.ball = null;
    this.waitServe = 1.6;
    this.ai.plan = '';
  }

  private updateThrown(dt: number) {
    for (const t of this.thrown) {
      t.t += dt;
      if (t.landed) continue;
      t.pos = { x: t.pos.x + t.v.x * dt, y: t.pos.y + t.v.y * dt };
      t.vz -= G * dt;
      t.z += t.vz * dt;
      t.angle = Math.atan2(t.vz, Math.hypot(t.v.x, t.v.y));
      if (t.z <= 0) {
        t.z = 0; t.landed = true; t.t = 0;
        const m = dist(t.from, t.pos) * METERS;
        this.fx.text(t.pos, 20, `${m.toFixed(2)} m`, '#ffd34d');
        this.fx.dust(t.pos, t.kind === 'shot' ? 10 : 5);
        this.sfx.land();
      }
    }
    this.thrown = this.thrown.filter((t) => !t.landed || t.t < 4);
  }

  // ---------- rival y reglas de cada deporte ----------

  private updateSport(dt: number) {
    const p = this.player;
    if (this.sport === 'atletismo' && this.raceStart !== null) {
      const u = toUV(p.pos).u;
      if (u >= FINISH_U) {
        const secs = this.time - this.raceStart;
        this.say(`${this.m('Meta', 'Finish')}: ${secs.toFixed(2)} s`, 3);
        this.raceStart = null;
      }
    }
    if (this.sport === 'natacion' && p.inWater && !p.busy) {
      this.wake -= dt;
      if (p.moved > 0 && this.wake <= 0) { this.fx.burst(p.pos, 0.5, 2, ['#ffffff', '#cfe8ff'], 10, 6); this.wake = 0.12; }
      if (this.lapStart !== null && this.scene.pool && toUV(p.pos).u >= this.scene.pool.u1 - 12) {
        this.say(`${this.m('Largo', 'Length')}: ${(this.time - this.lapStart).toFixed(2)} s`, 3);
        this.lapStart = null;
      }
    }
    if (this.koT > 0) {
      this.koT -= dt;
      // el ganador festeja cuando el otro ya cayó
      const w = this.winner;
      if (w && this.koT < 2.4 && !w.busy) { this.winner = null; if (w.has('victory')) w.play('victory', () => w.loop(this.cfg.idle), true); }
      if (this.koT <= 0) { this.hp = [100, 100]; this.reset(); }
    }
    if ((this.sport === 'voley' || this.sport === 'tenis') && !this.ball && !this.toss) {
      this.waitServe -= dt;
      if (this.server === 'rival' && this.waitServe <= 0 && this.rival && !this.rival.busy) {
        const serve = this.sport === 'voley' ? 'serve' : 'tennis_serve';
        this.rival.facing = 'up_left';
        this.rival.play(serve, () => this.rival!.loop(this.cfg.idle));
        this.waitServe = 3;
      }
    }
  }

  private moveRival(dt: number) {
    const r = this.rival!;
    if (r.busy) { r.update(dt); this.clamp(r, 1); return; }
    if (this.sport === 'pelea') return this.fightAI(dt);
    // vóley y tenis: va a donde la pelota va a estar a la altura del golpe y arranca el golpe a tiempo
    const b = this.ball;
    let target: Vec | null = null;
    if (b && b.live && b.side === 1) {
      const plan = this.predict(b);
      if (plan) {
        const swing = this.pickSwing(r, plan.pos);
        const d = r.def(swing);
        const hit = d?.eventos?.find((e) => e.tipo === 'impacto');
        if (d && hit) {
          const lead = hit.cuadro / d.fps;
          // la mano pega adelante del cuerpo: se para un poco antes del punto
          const c = hit.punto?.[this.kit.row('up_left')];
          const reach = c ? Math.max(3, Math.abs(c[0]) / SQRT2) : 5;
          const f = DIR_WORLD.up_left;
          target = { x: plan.pos.x - f.x * reach, y: plan.pos.y - f.y * reach };
          if (plan.t <= lead + 0.02) {
            r.facing = 'up_left';
            r.play(swing, () => r.loop(this.cfg.idle));
            r.update(dt);
            return;
          }
        }
      }
    } else {
      target = this.scene.rival!.pos;
    }
    if (target && dist(target, r.pos) > 2) {
      const w = { x: target.x - r.pos.x, y: target.y - r.pos.y };
      const dir = nearestDirection(w);
      const far = dist(target, r.pos) > 14;
      r.facing = dir;
      r.loop(far ? 'run' : 'walk');
      // un rival que tiene que llegar corre más rápido que su ritmo natural: la animación se acelera igual
      r.update(dt, { dir: DIR_WORLD[dir], k: far ? 1.6 : 1 });
      this.clamp(r, 1);
    } else {
      r.facing = 'up_left';
      r.loop(this.cfg.idle);
      r.update(dt);
    }
  }

  /** Dónde y cuándo la pelota queda a la altura de golpe en la cancha del rival. */
  predict(b: Ball): { pos: Vec; t: number } | null {
    let pos = { ...b.pos }, z = b.z, vz = b.vz, v = { ...b.v }, bounces = b.bounces;
    const volley = this.sport === 'voley';
    for (let t = 0; t < 4; t += 1 / 60) {
      pos = { x: pos.x + v.x / 60, y: pos.y + v.y / 60 };
      vz -= G / 60; z += vz / 60;
      if (z <= 0) {
        if (volley || bounces >= 1) return null;
        z = 0; vz = -vz * 0.62; v = { x: v.x * 0.85, y: v.y * 0.85 }; bounces++;
      }
      if (pos.x * b.side <= 4) continue;
      const ok = volley ? vz < 0 && z <= 16 : bounces >= 1 && vz < 0 && z <= 14;
      if (ok) return { pos, t };
    }
    return null;
  }

  private pickSwing(r: Actor, at: Vec): string {
    if (this.sport === 'voley') return r.has('vb_bump') ? 'vb_bump' : 'vb_set';
    // derecha o revés según de qué lado del cuerpo viene
    const f = DIR_WORLD.up_left;
    const side = (at.x - r.pos.x) * -f.y + (at.y - r.pos.y) * f.x;
    return side > 0 && r.has('backhand') ? 'backhand' : 'forehand';
  }

  private fightAI(dt: number) {
    const r = this.rival!, p = this.player;
    if (this.koT > 0) { r.loop(this.cfg.idle); r.update(dt); return; }
    r.facing = this.faceTo(r, p);
    this.ai.t -= dt;
    const d = dist(r.pos, p.pos);
    // si el jugador arranca un golpe cerca, a veces se cubre o esquiva
    if (p.busy && DAMAGE[p.anim] && p.t < 1.2 && d < 18 && this.ai.plan !== 'defend') {
      this.ai.plan = 'defend';
      if (Math.random() < 0.35) { r.play(Math.random() < 0.6 ? 'fight_block' : 'slip', () => r.loop(this.cfg.idle)); r.update(dt); return; }
    }
    if (!p.busy && this.ai.plan === 'defend') this.ai.plan = '';
    if (d > 13) {
      const f = DIR_WORLD[r.facing];
      r.reverse = false;
      r.loop(this.cfg.walk!);
      r.update(dt, { dir: f, k: 2 });
      this.keepApart();
      this.clamp(r, 1);
      return;
    }
    if (this.ai.t <= 0) {
      const moves = ['jab', 'jab', 'punch', 'hook', 'low_kick', 'kick_martial', 'uppercut'].filter((m) => r.has(m));
      const m = moves[Math.floor(Math.random() * moves.length)];
      if (m) r.play(m, () => r.loop(this.cfg.idle));
      this.ai.t = 0.7 + Math.random() * 0.9;
    } else {
      r.loop(this.cfg.idle);
    }
    r.update(dt);
  }

  // ---------- dibujo ----------

  draw(g: CanvasRenderingContext2D, cam: Vec, debug: boolean) {
    const s = this.scene;
    g.drawImage(s.ground, Math.round(s.origin.x - cam.x), Math.round(s.origin.y - cam.y));
    s.props(g, cam, this.time, 'back');
    // sombras de la pelota y lo lanzado (en el piso, siempre detrás)
    if (this.ball) this.shadow(g, cam, this.ball.pos);
    for (const t of this.thrown) this.shadow(g, cam, t.pos);
    // orden por profundidad; con red, primero el lado de atrás
    type D = { depth: number; side: number; draw: () => void };
    const items: D[] = [];
    const add = (pos: Vec, draw: () => void) => items.push({ depth: pos.x + pos.y, side: pos.x < (s.netX ?? -1e9) ? 0 : 1, draw });
    add(this.player.pos, () => this.player.draw(g, cam, { debug }));
    if (this.rival) { const r = this.rival; add(r.pos, () => r.draw(g, cam, { debug })); }
    if (this.ball) { const b = this.ball; add(b.pos, () => this.drawBall(g, cam, b)); }
    for (const t of this.thrown) add(t.pos, () => this.drawThrown(g, cam, t));
    items.sort((a, b) => a.side - b.side || a.depth - b.depth);
    let netDrawn = s.netX === undefined;
    for (const it of items) {
      if (!netDrawn && it.side === 1) { s.props(g, cam, this.time, 'mid'); netDrawn = true; }
      it.draw();
    }
    if (!netDrawn) s.props(g, cam, this.time, 'mid');
    s.props(g, cam, this.time, 'front');
    this.fx.draw(g, cam);
    // ayuda: dónde se va a poder pegar la pelota que viene (en datos, también la del rival)
    if (this.ball?.live && !this.toss && (this.ball.side === -1 || debug)) {
      const pl = this.predict(this.ball);
      if (pl) {
        const q = toScreen(pl.pos.x, pl.pos.y);
        g.strokeStyle = this.ball.side === -1 ? 'rgba(255,211,77,0.9)' : 'rgba(255,255,255,0.5)';
        g.beginPath(); g.ellipse(Math.round(q.x - cam.x) + 0.5, Math.round(q.y - cam.y) + 0.5, 5, 2.5, 0, 0, Math.PI * 2); g.stroke();
      }
    }
  }

  /**
   * Con la cámara pegada al jugador, la pelota y el rival pueden quedar afuera: una flechita en el borde dice
   * dónde están (amarilla la pelota, blanca el rival).
   */
  drawOffscreen(g: CanvasRenderingContext2D, cam: Vec, W: number, H: number) {
    if (!this.scene.follow) return;
    const marks: [Vec, number, string][] = [];
    if (this.rival) marks.push([this.rival.pos, 20, 'rgba(245,242,255,0.85)']);
    if (this.ball) marks.push([this.ball.pos, this.ball.z, '#ffd34d']);
    for (const [p, z, color] of marks) {
      const s = toScreen(p.x, p.y, z);
      const x = s.x - cam.x, y = s.y - cam.y, m = 6;
      if (x >= 0 && x < W && y >= 0 && y < H) continue;
      const ex = Math.max(m, Math.min(W - m, x)), ey = Math.max(m, Math.min(H - m, y));
      const a = Math.atan2(y - ey, x - ex);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(Math.round(ex + Math.cos(a) * 4), Math.round(ey + Math.sin(a) * 4));
      g.lineTo(Math.round(ex + Math.cos(a + 2.4) * 4), Math.round(ey + Math.sin(a + 2.4) * 4));
      g.lineTo(Math.round(ex + Math.cos(a - 2.4) * 4), Math.round(ey + Math.sin(a - 2.4) * 4));
      g.fill();
    }
  }

  private shadow(g: CanvasRenderingContext2D, cam: Vec, p: Vec) {
    const s = toScreen(p.x, p.y);
    g.fillStyle = 'rgba(8,6,16,0.35)';
    g.fillRect(Math.round(s.x - cam.x) - 1, Math.round(s.y - cam.y), 3, 1);
  }

  private drawBall(g: CanvasRenderingContext2D, cam: Vec, b: Ball) {
    const s = toScreen(b.pos.x, b.pos.y, b.z);
    const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
    const volley = this.sport === 'voley';
    g.fillStyle = '#1b1730';
    g.fillRect(x - 2, y - 1, 5, 3); g.fillRect(x - 1, y - 2, 3, 5);
    g.fillStyle = volley ? '#f4f1e8' : '#d8f05a';
    g.fillRect(x - 1, y - 1, 3, 3);
    g.fillStyle = volley ? '#3b6cd8' : '#ffffff';
    g.fillRect(x - 1, y - 1, 1, 1);
  }

  private drawThrown(g: CanvasRenderingContext2D, cam: Vec, t: Thrown) {
    const s = toScreen(t.pos.x, t.pos.y, t.z);
    const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
    if (t.kind === 'shot') {
      g.fillStyle = '#1b1730'; g.fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle = '#8b8fa3'; g.fillRect(x - 1, y - 1, 2, 2);
      return;
    }
    // jabalina: una línea que sigue la trayectoria (y queda clavada inclinada)
    const v = toScreen(t.v.x, t.v.y);
    const len = Math.hypot(v.x, v.y) || 1;
    const dx = v.x / len, ang = t.landed ? -0.5 : t.angle;
    const ux = dx * Math.cos(ang), uy = -Math.sin(ang) + (v.y / len) * Math.cos(ang) * 0.5;
    for (let i = -7; i <= 7; i++) {
      g.fillStyle = i > 5 ? '#c9c9d2' : '#f4f1e8';
      g.fillRect(Math.round(x + ux * i), Math.round(y + uy * i), 1, 1);
    }
  }

  /**
   * A dónde mira la cámara. En las canchas, al medio entre los dos (y la pelota), pero nunca deja afuera al
   * jugador: si no entran todos, manda el jugador. En tenis sigue al jugador de cerca y se asoma un poco hacia
   * la pelota. W y H: tamaño de la vista en pixeles de arte.
   */
  focus(W: number, H: number): Vec {
    const p = this.player.pos;
    if (this.rival) {
      const ps = toScreen(p.x, p.y);
      let c: Vec;
      if (this.scene.follow) {
        // se asoma hacia la pelota, o hacia la cancha si no hay pelota en juego
        const b = this.ball ? toScreen(this.ball.pos.x, this.ball.pos.y) : toScreen(0, 0);
        c = { x: ps.x + (b.x - ps.x) * 0.35, y: ps.y - 22 + (b.y - ps.y) * 0.35 };
      } else {
        const pts = [p, this.rival.pos, ...(this.ball ? [this.ball.pos] : [])];
        const m = { x: pts.reduce((t, q) => t + q.x, 0) / pts.length, y: pts.reduce((t, q) => t + q.y, 0) / pts.length };
        c = toScreen(m.x, m.y, 14);
      }
      // el sprite va de 46 pixeles arriba de los pies hasta los pies; se deja un margen a los lados
      const mx = Math.max(0, W / 2 - 30);
      const y0 = ps.y + 6 - H / 2, y1 = ps.y - 50 + H / 2;
      return { x: Math.max(ps.x - mx, Math.min(ps.x + mx, c.x)), y: y0 <= y1 ? Math.max(y0, Math.min(y1, c.y)) : ps.y - 22 };
    }
    const s = toScreen(p.x, p.y, 16);
    // mira un poco adelante de hacia donde va
    const f = DIR_WORLD[this.player.facing];
    const ahead = toScreen(f.x * 40, f.y * 40);
    return { x: s.x + ahead.x, y: s.y + ahead.y };
  }
}
