// Los iconos de las habilidades, pintados: cada uno se arma una vez sobre un lienzo propio y se guarda.
//   - el fondo cuenta el elemento (lenguas de fuego, esquirlas de hielo, ramas de rayo, burbujas de veneno, volutas de
//     sombra, rayos de luz, tajos y sangre para lo físico), teñido con el color de la habilidad;
//   - el glifo tiene materia: las armas y los símbolos más usados van pintados pieza por pieza (acero con su bisel,
//     madera, oro, hueso, vidrio); el resto se dibuja como silueta y recibe volumen, contorno oscuro, luz arriba y sombra
//     abajo, y un resplandor del color del elemento por detrás;
//   - el marco es de bronce biselado con remaches; las definitivas llevan oro y gemas.
import type { Habilidad } from '../datos/clases';

type C2 = CanvasRenderingContext2D;
const cache = new Map<string, HTMLCanvasElement>();
const ELEM: Record<string, { luz: string; medio: string; hondo: string }> = {
  fuego: { luz: '#ffd070', medio: '#e0501a', hondo: '#3a0c04' }, frio: { luz: '#d8f4ff', medio: '#3f8fd0', hondo: '#061a34' },
  rayo: { luz: '#f0f0ff', medio: '#7a70e0', hondo: '#120c36' }, veneno: { luz: '#d0ff90', medio: '#3f9a1c', hondo: '#0a2406' },
  sombra: { luz: '#d8a0ff', medio: '#6a2cb0', hondo: '#12041e' }, luz: { luz: '#fff6c8', medio: '#e0a830', hondo: '#3a2404' },
  sangre: { luz: '#ff9080', medio: '#b01414', hondo: '#2a0404' }, fisico: { luz: '#f0e0c0', medio: '#8a4a2a', hondo: '#1c0e08' },
};
const ACERO = ['#f6faff', '#a4b4c8', '#4c586c'], ORO = ['#fff2b8', '#e2a430', '#70420c'], MADERA = ['#b88448', '#6e4420', '#34200e'], HUESO = ['#fffae6', '#d8c8a2', '#86745a'], BORDE = '#0a0705';
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (s: number) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const mezcla = (a: string, b: string, k: number) => { const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };

/** Degradado de tres tonos de un material a lo largo de (x0,y0)-(x1,y1). */
const mat = (c: C2, m: string[], x0: number, y0: number, x1: number, y1: number) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, m[0]); g.addColorStop(0.45, m[1]); g.addColorStop(1, m[2]); return g; };
/** Rellena y contornea el trazo actual. */
const pieza = (c: C2, relleno: string | CanvasGradient, lw = 1.5) => { c.fillStyle = relleno; c.fill(); c.lineWidth = lw; c.strokeStyle = BORDE; c.lineJoin = 'round'; c.stroke(); };
const poli = (c: C2, pts: number[]) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };

function espada(c: C2, e: { luz: string }, k = 1) {
  c.save(); c.scale(k, k);
  poli(c, [-2.6, 6, -2.6, -14, 0, -20, 2.6, -14, 2.6, 6]); pieza(c, mat(c, ACERO, -3, 0, 3, 0));
  c.strokeStyle = 'rgba(40,50,70,0.7)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, -15); c.lineTo(0, 5); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1.7, -13); c.lineTo(-1.7, 5); c.stroke();
  c.beginPath(); c.roundRect(-8.5, 5.5, 17, 3.4, 1.5); pieza(c, mat(c, ORO, 0, 5, 0, 9));
  c.beginPath(); c.rect(-1.7, 8.9, 3.4, 7.2); pieza(c, mat(c, MADERA, -2, 0, 2, 0), 1.2);
  c.beginPath(); c.arc(0, 18, 2.7, 0, 6.283); pieza(c, mat(c, ORO, -2, 16, 2, 20), 1.2);
  c.fillStyle = e.luz; c.beginPath(); c.arc(0, 7.2, 1.1, 0, 6.283); c.fill();
  c.restore();
}

/** Los glifos pintados pieza por pieza. Devuelve false si ese glifo no tiene versión pintada (va la silueta). */
function pintado(c: C2, glifo: string, e: { luz: string; medio: string; hondo: string }): boolean {
  switch (glifo) {
    case 'hacha': {
      c.save(); c.rotate(0.62);
      c.beginPath(); c.roundRect(-2, -15, 4, 34, 1.6); pieza(c, mat(c, MADERA, -2, 0, 2, 0));
      c.beginPath(); c.moveTo(1.5, -16); c.bezierCurveTo(13, -19, 18, -8, 16, 3); c.lineTo(1.5, -3); c.closePath(); pieza(c, mat(c, ACERO, 16, -8, 2, -8));
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(8, -16.2); c.bezierCurveTo(15, -15, 17, -7, 15.4, 1.6); c.stroke();
      c.strokeStyle = 'rgba(30,40,60,0.6)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(4, -13); c.quadraticCurveTo(9, -8, 5, -3); c.stroke();
      poli(c, [-1.5, -13, -8, -9.5, -1.5, -6]); pieza(c, mat(c, ACERO, -8, -10, -1, -10), 1.2);
      c.beginPath(); c.rect(-2.6, -4, 5.2, 2.6); pieza(c, mat(c, ORO, 0, -4, 0, -1), 1.1);
      c.beginPath(); c.rect(-2.6, 13, 5.2, 2.4); pieza(c, mat(c, ORO, 0, 13, 0, 16), 1.1);
      c.restore(); return true;
    }
    case 'espada': c.save(); c.rotate(0.785); espada(c, e, 1.02); c.restore(); return true;
    case 'doble': c.save(); c.rotate(-0.72); espada(c, e, 0.86); c.restore(); c.save(); c.rotate(0.72); espada(c, e, 0.86); c.restore(); return true;
    case 'triple': case 'garra': {
      for (let i = -1; i <= 1; i++) { c.save(); c.translate(i * 8.5, i * -1.5); c.rotate(0.3);
        c.beginPath(); c.moveTo(-2, 15); c.quadraticCurveTo(-6, -2, 3, -17); c.quadraticCurveTo(1.5, -2, 2.6, 15); c.closePath(); pieza(c, mat(c, glifo === 'garra' ? HUESO : ACERO, -4, 0, 4, 0), 1.3);
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1.6, 10); c.quadraticCurveTo(-3.6, -3, 2, -13); c.stroke(); c.restore(); }
      c.fillStyle = 'rgba(200,20,10,0.85)'; for (const [x, y, r] of [[-11, 13, 1.8], [-3, 17, 1.4], [8, 15, 1.9]]) { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
      return true;
    }
    case 'martillo': {
      c.save(); c.rotate(0.62);
      c.beginPath(); c.roundRect(-1.9, -8, 3.8, 27, 1.5); pieza(c, mat(c, MADERA, -2, 0, 2, 0));
      c.beginPath(); c.roundRect(-10.5, -18, 21, 11.5, 2); pieza(c, mat(c, ACERO, 0, -18, 0, -6));
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-9, -16.6, 18, 1.6);
      for (const x of [-7.4, 5.2]) { c.beginPath(); c.rect(x, -18.6, 2.2, 12.7); pieza(c, mat(c, ORO, 0, -18, 0, -6), 1); }
      c.restore(); return true;
    }
    case 'escudo': case 'piel': {
      c.beginPath(); c.moveTo(-14, -14); c.quadraticCurveTo(0, -18, 14, -14); c.quadraticCurveTo(14, 6, 0, 17); c.quadraticCurveTo(-14, 6, -14, -14); c.closePath(); pieza(c, mat(c, ACERO, -12, -14, 12, 14), 1.8);
      c.beginPath(); c.moveTo(-10.4, -11); c.quadraticCurveTo(0, -14, 10.4, -11); c.quadraticCurveTo(10.4, 4, 0, 12.6); c.quadraticCurveTo(-10.4, 4, -10.4, -11); c.closePath();
      const g = c.createLinearGradient(-10, -12, 10, 12); g.addColorStop(0, mezcla(e.medio, '#ffffff', 0.25)); g.addColorStop(1, e.hondo); pieza(c, g, 1);
      c.beginPath(); c.rect(-1.5, -10.5, 3, 20); c.rect(-8.5, -4, 17, 3); c.fillStyle = mat(c, ORO, 0, -10, 0, 10); c.fill();
      c.beginPath(); c.arc(0, -2.5, 3.2, 0, 6.283); pieza(c, mat(c, ORO, -3, -5, 3, 1), 1);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-12.6, -13); c.quadraticCurveTo(-13, 0, -7, 9); c.stroke();
      return true;
    }
    case 'flecha': case 'lanza': {
      const lan = glifo === 'lanza'; c.save(); c.rotate(0.785);
      c.beginPath(); c.rect(-1.1, -12, 2.2, lan ? 31 : 27); pieza(c, mat(c, MADERA, -1, 0, 1, 0), 1.1);
      if (lan) { c.beginPath(); c.moveTo(0, -21); c.quadraticCurveTo(5.4, -13, 2.2, -7); c.lineTo(-2.2, -7); c.quadraticCurveTo(-5.4, -13, 0, -21); c.closePath(); } else poli(c, [0, -20, 4.6, -10.5, 0, -12.5, -4.6, -10.5]);
      pieza(c, mat(c, ACERO, -4, 0, 4, 0), 1.3);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1, -18); c.lineTo(-3, -11.5); c.stroke();
      if (lan) { c.beginPath(); c.rect(-2.4, -7.2, 4.8, 2.2); pieza(c, mat(c, ORO, 0, -7, 0, -5), 1); c.fillStyle = e.medio; c.beginPath(); c.moveTo(-2, -5); c.quadraticCurveTo(-7, 0, -3, 5); c.quadraticCurveTo(-2, 0, 0, -5); c.fill(); }
      else for (const sx of [-1, 1]) { poli(c, [sx * 1, 8, sx * 5.4, 11, sx * 5.4, 17, sx * 1, 14]); pieza(c, mezcla(e.medio, '#ffffff', 0.2), 1); }
      c.restore(); return true;
    }
    case 'arco': {
      c.strokeStyle = BORDE; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, -16); c.quadraticCurveTo(14, 0, -6, 16); c.stroke();
      c.strokeStyle = mat(c, MADERA, -6, -16, 8, 16); c.lineWidth = 3.6; c.beginPath(); c.moveTo(-6, -16); c.quadraticCurveTo(14, 0, -6, 16); c.stroke();
      c.strokeStyle = 'rgba(255,240,210,0.9)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-6, -16); c.lineTo(-11, 0); c.lineTo(-6, 16); c.stroke();
      c.beginPath(); c.rect(-11, -0.9, 26, 1.8); pieza(c, mat(c, MADERA, 0, -1, 0, 1), 1);
      poli(c, [19, 0, 12.5, -3.6, 13.5, 0, 12.5, 3.6]); pieza(c, mat(c, ACERO, 12, -3, 12, 3), 1.1);
      c.beginPath(); c.rect(3.4, -3.2, 2.6, 6.4); pieza(c, mat(c, ORO, 0, -3, 0, 3), 1);
      return true;
    }
    case 'craneo': {
      c.beginPath(); c.moveTo(-12, -4); c.bezierCurveTo(-13, -19, 13, -19, 12, -4); c.bezierCurveTo(12, 3, 8, 4, 7.5, 8); c.lineTo(7, 14); c.lineTo(-7, 14); c.lineTo(-7.5, 8); c.bezierCurveTo(-8, 4, -12, 3, -12, -4); c.closePath(); pieza(c, mat(c, HUESO, -8, -16, 8, 14), 1.7);
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 5.2, -3.6, 3.7, 4.3, sx * 0.25, 0, 6.283); c.fillStyle = '#0a0604'; c.fill(); c.beginPath(); c.arc(sx * 5.2, -3, 1.5, 0, 6.283); c.fillStyle = e.luz; c.fill(); }
      poli(c, [0, 1.5, -1.9, 6, 1.9, 6]); c.fillStyle = '#140c08'; c.fill();
      c.strokeStyle = '#3a2c20'; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.6, 9); c.lineTo(i * 2.6, 14); c.stroke(); } c.beginPath(); c.moveTo(-7, 9.4); c.lineTo(7, 9.4); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -10); c.quadraticCurveTo(-5, -15.5, 2, -15.6); c.stroke();
      return true;
    }
    case 'corona': {
      poli(c, [-15, 10, -15, -7, -8.5, 1, -4.2, -11, 0, -1, 4.2, -11, 8.5, 1, 15, -7, 15, 10]); pieza(c, mat(c, ORO, 0, -11, 0, 11), 1.7);
      c.beginPath(); c.rect(-15, 6.5, 30, 4.4); pieza(c, mat(c, ORO, 0, 6, 0, 11), 1.2);
      for (const [x, y, r] of [[-15, -7, 2.1], [-4.2, -11, 2.4], [4.2, -11, 2.4], [15, -7, 2.1], [0, 8.6, 1.9], [-8.6, 8.6, 1.5], [8.6, 8.6, 1.5]]) { c.beginPath(); c.arc(x, y, r, 0, 6.283); pieza(c, e.medio, 1); c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 6.283); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-13.6, 5); c.lineTo(-13.6, -3); c.stroke();
      return true;
    }
    case 'ojo': {
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(0, -15, 17, 0); c.quadraticCurveTo(0, 15, -17, 0); c.closePath(); pieza(c, mat(c, HUESO, 0, -9, 0, 9), 1.8);
      const g = c.createRadialGradient(0, 0, 1, 0, 0, 7.4); g.addColorStop(0, e.luz); g.addColorStop(0.55, e.medio); g.addColorStop(1, e.hondo); c.beginPath(); c.arc(0, 0, 7.2, 0, 6.283); pieza(c, g, 1.1);
      c.beginPath(); c.ellipse(0, 0, 1.9, 5.6, 0, 0, 6.283); c.fillStyle = '#050302'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(-2.6, -2.8, 1.5, 0, 6.283); c.fill();
      c.strokeStyle = BORDE; c.lineWidth = 1.3; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5.4, -8.8 + Math.abs(i) * 2.1); c.lineTo(i * 6.8, -13.4 + Math.abs(i) * 2.4); c.stroke(); }
      return true;
    }
    case 'frasco': case 'racimo': {
      const una = (x: number, y: number, k: number) => { c.save(); c.translate(x, y); c.scale(k, k);
        c.beginPath(); c.rect(-2.8, -15, 5.6, 8); pieza(c, 'rgba(210,235,255,0.55)', 1.2);
        c.beginPath(); c.arc(0, 3, 10.5, 0, 6.283); pieza(c, 'rgba(200,230,255,0.3)', 1.6);
        c.save(); c.beginPath(); c.arc(0, 3, 9.2, 0, 6.283); c.clip(); const g = c.createLinearGradient(0, -2, 0, 13); g.addColorStop(0, e.luz); g.addColorStop(0.4, e.medio); g.addColorStop(1, e.hondo); c.fillStyle = g; c.fillRect(-11, -1.5, 22, 16); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-11, -1.5, 22, 1.3); c.restore();
        c.beginPath(); c.rect(-3.6, -18.6, 7.2, 4.2); pieza(c, mat(c, MADERA, 0, -19, 0, -14), 1.1);
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, 3, 7.6, 3.5, 4.5); c.stroke(); c.restore(); };
      if (glifo === 'racimo') { una(-8, 4, 0.62); una(8, 4, 0.62); una(0, -5, 0.7); } else una(0, 1, 1);
      return true;
    }
    case 'llama': case 'muro': {
      const una = (x: number, k: number) => { c.save(); c.translate(x, 0); c.scale(k, k);
        for (const [s2, col] of [[1, e.hondo === '#3a0c04' ? '#c02a08' : e.medio], [0.72, e.hondo === '#3a0c04' ? '#ff8a1c' : mezcla(e.medio, e.luz, 0.5)], [0.42, e.luz]] as [number, string][]) { c.save(); c.translate(0, 16 * (1 - s2)); c.scale(s2, s2);
          c.beginPath(); c.moveTo(0, -18); c.bezierCurveTo(4, -9, 13, -4, 10.5, 7); c.bezierCurveTo(9.4, 14, 3.6, 16, 0, 16); c.bezierCurveTo(-3.6, 16, -9.4, 14, -10.5, 7); c.bezierCurveTo(-12, -2, -5, -4, -4, -11); c.bezierCurveTo(-2, -8, 0, -11, 0, -18); c.closePath();
          if (s2 === 1) pieza(c, col, 1.7); else { c.fillStyle = col; c.fill(); } c.restore(); }
        c.restore(); };
      if (glifo === 'muro') { una(-11, 0.6); una(11, 0.6); una(0, 0.78); } else una(0, 1);
      return true;
    }
    case 'gota': case 'corazon': {
      const g = c.createRadialGradient(-3.5, -2, 1, 0, 2, 16); g.addColorStop(0, mezcla(e.luz, '#ffffff', 0.3)); g.addColorStop(0.5, e.medio); g.addColorStop(1, e.hondo);
      c.beginPath(); if (glifo === 'gota') { c.moveTo(0, -17); c.bezierCurveTo(4, -8, 12.5, -1, 12.5, 6); c.bezierCurveTo(12.5, 13, 6.4, 17, 0, 17); c.bezierCurveTo(-6.4, 17, -12.5, 13, -12.5, 6); c.bezierCurveTo(-12.5, -1, -4, -8, 0, -17); } else { c.moveTo(0, 15); c.bezierCurveTo(-21, 1, -12, -18, 0, -7); c.bezierCurveTo(12, -18, 21, 1, 0, 15); }
      c.closePath(); pieza(c, g, 1.7);
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-5.4, glifo === 'gota' ? 1 : -5.6, 2.2, 3.8, 0.5, 0, 6.283); c.fill();
      return true;
    }
    case 'rayo': case 'chispa': {
      poli(c, [5, -19, -9.5, 2, -1.5, 2, -6, 19, 10, -4, 1.5, -4]); c.lineJoin = 'round';
      const g = c.createLinearGradient(-6, -18, 6, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, e.luz); g.addColorStop(1, e.medio); pieza(c, g, 1.7);
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(3, -15); c.lineTo(-6.6, 0.4); c.stroke();
      if (glifo === 'chispa') for (const [x, y] of [[-13, -11], [13, 8], [-12, 12], [12, -13]]) { c.fillStyle = e.luz; c.fillRect(x - 0.7, y - 2.6, 1.4, 5.2); c.fillRect(x - 2.6, y - 0.7, 5.2, 1.4); }
      return true;
    }
    case 'colmillo': {
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 13, -14); c.quadraticCurveTo(sx * 2.4, -13, sx * 4.6, 15); c.quadraticCurveTo(sx * 11, 1, sx * 13, -14); c.closePath(); pieza(c, mat(c, HUESO, sx * 12, -12, sx * 4, 12), 1.5);
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(sx * 11.4, -11); c.quadraticCurveTo(sx * 9.6, 0, sx * 6, 9); c.stroke(); }
      c.beginPath(); c.rect(-15, -18, 30, 4.6); pieza(c, mezcla(e.hondo, '#701010', 0.6), 1.3);
      c.fillStyle = '#c01410'; c.beginPath(); c.moveTo(4.6, 15); c.quadraticCurveTo(7, 19, 4.6, 20.4); c.quadraticCurveTo(2.2, 19, 4.6, 15); c.fill();
      return true;
    }
    case 'cruz': {
      c.beginPath(); c.rect(-2.6, -17, 5.2, 34); c.rect(-10.5, -8.6, 21, 5.2); pieza(c, mat(c, ORO, -8, -16, 8, 16), 1.7);
      c.fillStyle = mat(c, ORO, -8, -16, 8, 16); c.fillRect(-1.8, -16, 3.6, 32); c.fillRect(-9.6, -7.8, 19.2, 3.6);
      c.beginPath(); c.arc(0, -6, 2.6, 0, 6.283); pieza(c, e.medio, 1); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(-0.8, -6.8, 0.9, 0, 6.283); c.fill();
      return true;
    }
    case 'sol': case 'nova': case 'estrella': {
      const n = glifo === 'estrella' ? 5 : 8, r1 = glifo === 'estrella' ? 17 : 18, r0 = glifo === 'estrella' ? 7 : glifo === 'nova' ? 5 : 8.6;
      c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r0 : r1, a = -Math.PI / 2 + (i * Math.PI) / n; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
      const g = c.createRadialGradient(0, 0, 1, 0, 0, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, e.luz); g.addColorStop(1, e.medio); pieza(c, g, 1.6);
      if (glifo !== 'estrella') { c.beginPath(); c.arc(0, 0, glifo === 'nova' ? 4 : 6.4, 0, 6.283); const g2 = c.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 6.4); g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, e.luz); pieza(c, g2, 1.1); }
      return true;
    }
    case 'cristal': case 'copo': {
      if (glifo === 'cristal') { poli(c, [0, -18, 8.6, -4, 0, 18, -8.6, -4]); pieza(c, mat(c, [mezcla(e.luz, '#ffffff', 0.5), e.medio, e.hondo], -8, -12, 8, 14), 1.7);
        poli(c, [0, -18, 8.6, -4, 0, 0]); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill(); poli(c, [0, 0, 8.6, -4, 0, 18]); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-8.6, -4); c.lineTo(0, 0); c.lineTo(8.6, -4); c.moveTo(0, 0); c.lineTo(0, 18); c.stroke(); return true; }
      for (const [lw, col] of [[4.6, BORDE], [2.2, e.luz]] as [number, string][]) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
        for (let a = 0; a < 6; a++) { c.save(); c.rotate((a * Math.PI) / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -17); c.moveTo(0, -8); c.lineTo(-4.4, -12.4); c.moveTo(0, -8); c.lineTo(4.4, -12.4); c.moveTo(0, -13); c.lineTo(-2.8, -15.8); c.moveTo(0, -13); c.lineTo(2.8, -15.8); c.stroke(); c.restore(); } }
      c.beginPath(); c.arc(0, 0, 2.6, 0, 6.283); c.fillStyle = '#ffffff'; c.fill();
      return true;
    }
    case 'bola': case 'meteoro': case 'orbe': {
      if (glifo !== 'orbe') { c.beginPath(); c.moveTo(-18, -18); c.quadraticCurveTo(-4, -12, -4.6, 5); c.lineTo(9, -6.4); c.quadraticCurveTo(-2, -15, -18, -18); c.closePath(); const gt = c.createLinearGradient(-18, -18, 4, 2); gt.addColorStop(0, 'rgba(0,0,0,0)'); gt.addColorStop(1, e.medio); c.fillStyle = gt; c.fill(); }
      const g = c.createRadialGradient(1, 2, 1, 4, 5, 11.5); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, e.luz); g.addColorStop(0.8, e.medio); g.addColorStop(1, e.hondo);
      c.beginPath(); c.arc(glifo === 'orbe' ? 0 : 4, glifo === 'orbe' ? 0 : 5, glifo === 'orbe' ? 13 : 10.6, 0, 6.283); pieza(c, g, 1.6);
      if (glifo === 'orbe') { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 13, 4.6, 0.5, 0, 6.283); c.stroke(); }
      return true;
    }
    case 'nube': case 'lluvia': {
      const g = c.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, mezcla(e.luz, '#ffffff', 0.5)); g.addColorStop(0.6, e.medio); g.addColorStop(1, e.hondo);
      const oy = glifo === 'lluvia' ? -5 : 0;
      c.beginPath(); c.arc(-8, 2 + oy, 7.5, 0, 6.283); c.arc(1, -4 + oy, 9.5, 0, 6.283); c.arc(10, 3 + oy, 7, 0, 6.283); c.rect(-8, 2 + oy, 18, 7.6); c.lineWidth = 3.4; c.strokeStyle = BORDE; c.stroke(); c.fillStyle = g; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-1, -8.6 + oy, 5, 2.2, -0.2, 0, 6.283); c.fill();
      if (glifo === 'lluvia') for (let i = -2; i <= 2; i++) { c.strokeStyle = BORDE; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(i * 5.6, 8); c.lineTo(i * 5.6 - 2.6, 16); c.stroke(); c.strokeStyle = e.luz; c.lineWidth = 1.4; c.stroke(); }
      return true;
    }
    case 'puno': case 'mano': case 'manos': {
      const guante = (x: number, k: number, abierta: boolean) => { c.save(); c.translate(x, 0); c.scale(k, k);
        c.beginPath(); c.roundRect(-7, 6, 14, 10, 2); pieza(c, mat(c, ORO, 0, 6, 0, 16), 1.4);
        if (abierta) { for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-8.6 + i * 4.5, -16 + Math.abs(i - 1.5) * 2.2, 3.7, 15, 1.8); pieza(c, mat(c, ACERO, -9 + i * 4.5, 0, -5 + i * 4.5, 0), 1.2); }
          c.beginPath(); c.roundRect(-9, -3, 18, 11, 3); pieza(c, mat(c, ACERO, -9, -3, 9, 8), 1.4);
          c.beginPath(); c.roundRect(8, -4, 3.6, 9, 1.8); c.save(); c.translate(9.8, 0.5); c.rotate(0.5); c.translate(-9.8, -0.5); pieza(c, mat(c, ACERO, 8, 0, 12, 0), 1.2); c.restore();
          const gp = c.createRadialGradient(0, 2, 0.5, 0, 2, 5); gp.addColorStop(0, '#ffffff'); gp.addColorStop(0.5, e.luz); gp.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gp; c.beginPath(); c.arc(0, 2, 5, 0, 6.283); c.fill(); }
        else { c.beginPath(); c.roundRect(-9.5, -10, 19, 17, 4); pieza(c, mat(c, ACERO, -9, -10, 9, 7), 1.6);
          c.strokeStyle = 'rgba(30,40,60,0.8)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-9.5 + i * 4.75, -10); c.lineTo(-9.5 + i * 4.75, -1); c.stroke(); } c.beginPath(); c.moveTo(-9.5, -1); c.lineTo(9.5, -1); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-8, -8.8, 16, 1.4);
          for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-7.1 + i * 4.75, -10, 1.5, 0, 6.283); pieza(c, mat(c, ORO, 0, -11, 0, -9), 0.9); } }
        c.restore(); };
      if (glifo === 'manos') { guante(-8.5, 0.66, true); guante(8.5, 0.66, true); } else guante(0, 1, glifo === 'mano');
      return true;
    }
    case 'boca': {
      c.beginPath(); c.ellipse(0, 0, 16, 12.5, 0, 0, 6.283); pieza(c, mat(c, ['#7a1410', '#3a0806', '#120202'], 0, -12, 0, 12), 1.8);
      c.beginPath(); c.ellipse(0, 3, 9, 6, 0, 0, 6.283); c.fillStyle = '#050101'; c.fill();
      for (const sy of [-1, 1]) for (let i = -3; i <= 3; i++) { const x = i * 4.2, l = (Math.abs(i) === 2 ? 7.6 : 4.6) * (sy < 0 ? 1 : 0.8), y0 = sy * (11.4 - Math.abs(i) * 0.75); poli(c, [x - 1.9, y0, x + 1.9, y0, x, y0 - sy * l]); pieza(c, mat(c, HUESO, 0, y0, 0, y0 - sy * l), 0.9); }
      c.strokeStyle = e.luz; c.lineWidth = 1.2; c.lineCap = 'round'; for (const [a, r] of [[0.5, 19], [2.64, 19], [-0.5, 19.5], [3.64, 19.5]]) { c.beginPath(); c.moveTo(Math.cos(a) * 17, Math.sin(a) * 13.6); c.lineTo(Math.cos(a) * (r + 3), Math.sin(a) * (r * 0.78 + 2)); c.stroke(); }
      return true;
    }
    case 'pluma': {
      c.save(); c.rotate(0.62);
      c.beginPath(); c.moveTo(0, -19); c.bezierCurveTo(9, -10, 8, 5, 1.5, 13); c.lineTo(-1.5, 13); c.bezierCurveTo(-8, 5, -9, -10, 0, -19); c.closePath(); pieza(c, mat(c, [mezcla(e.luz, '#ffffff', 0.5), e.medio, e.hondo], -7, -14, 7, 12), 1.6);
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.8; for (let i = 0; i < 6; i++) { const y = -13 + i * 4.2; c.beginPath(); c.moveTo(0, y + 3); c.lineTo(-5.6 + i * 0.3, y); c.moveTo(0, y + 3); c.lineTo(5.6 - i * 0.3, y); c.stroke(); }
      c.beginPath(); c.rect(-0.8, -17, 1.6, 36); pieza(c, mat(c, HUESO, -1, 0, 1, 0), 0.9);
      c.restore(); return true;
    }
    case 'arbol': case 'raiz': {
      c.beginPath(); c.moveTo(-2.6, 17); c.lineTo(-1.8, 2); c.lineTo(1.8, 2); c.lineTo(2.6, 17); c.closePath(); pieza(c, mat(c, MADERA, -3, 0, 3, 0), 1.4);
      if (glifo === 'raiz') { for (const sx of [-1, 1]) { c.strokeStyle = BORDE; c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(sx * 7, 8, sx * 12, 17); c.moveTo(0, -2); c.quadraticCurveTo(sx * 9, -6, sx * 13, -15); c.stroke(); c.strokeStyle = mat(c, MADERA, 0, -15, 0, 17); c.lineWidth = 2.4; c.stroke(); }
        c.beginPath(); c.arc(0, -8, 5, 0, 6.283); pieza(c, mat(c, [e.luz, e.medio, e.hondo], -4, -12, 4, -4), 1.3); return true; }
      const g = c.createRadialGradient(-4, -10, 1, 0, -5, 15); g.addColorStop(0, mezcla(e.luz, '#ffffff', 0.3)); g.addColorStop(0.55, e.medio); g.addColorStop(1, e.hondo);
      c.beginPath(); c.arc(-7, -3, 7, 0, 6.283); c.arc(7, -3, 7, 0, 6.283); c.arc(0, -10, 8.6, 0, 6.283); c.arc(0, -1, 6.4, 0, 6.283); c.lineWidth = 3.2; c.strokeStyle = BORDE; c.stroke(); c.fillStyle = g; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.4)'; for (const [x, y] of [[-5, -12], [3, -14], [8, -6], [-9, -4]]) { c.beginPath(); c.arc(x, y, 1.6, 0, 6.283); c.fill(); }
      return true;
    }
  }
  return false;
}

/** La silueta de siempre (trazos y formas simples), en blanco: después recibe el volumen. */
function silueta(ctx: C2, glifo: string) {
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = (pts: number[]) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
  switch (glifo) {
    case 'hacha': L([-10, 14, 8, -10]); ctx.beginPath(); ctx.arc(8, -10, 9, -1.2, 1.4); ctx.fill(); break;
    case 'espada': L([-12, 12, 12, -12]); L([-6, 2, 2, 10]); break;
    case 'doble': L([-14, 10, 4, -10]); L([-4, 14, 14, -6]); break;
    case 'triple': L([-14, 8, 2, -12]); L([-6, 12, 10, -8]); L([2, 14, 14, 0]); break;
    case 'salto': L([-14, 12, -4, -10, 6, 4, 14, -12]); break;
    case 'giro': ctx.beginPath(); ctx.arc(0, 0, 12, 0, 5); ctx.stroke(); L([12, 0, 14, -8]); break;
    case 'craneo': ctx.beginPath(); ctx.arc(0, -3, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(-7, -5, 5, 5); ctx.fillRect(2, -5, 5, 5); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(-6, 7, 12, 6); break;
    case 'boca': ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.stroke(); L([-8, -3, -4, 3, 0, -3, 4, 3, 8, -3]); break;
    case 'puno': ctx.fillRect(-9, -9, 18, 16); ctx.fillStyle = '#000'; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 5, -9, 1, 8); break;
    case 'escudo': ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(12, -13); ctx.lineTo(10, 4); ctx.lineTo(0, 14); ctx.lineTo(-10, 4); ctx.closePath(); ctx.stroke(); break;
    case 'onda': for (let r = 5; r <= 15; r += 5) { ctx.beginPath(); ctx.arc(0, 4, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } break;
    case 'gota': ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(12, 6, 0, 12); ctx.quadraticCurveTo(-12, 6, 0, -14); ctx.fill(); break;
    case 'piel': ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.stroke(); L([-6, -4, 6, 6]); break;
    case 'rayo': L([4, -14, -4, 0, 4, 0, -4, 14]); break;
    case 'cruz': L([0, -14, 0, 14]); L([-10, -4, 10, -4]); break;
    case 'flecha': L([-12, 12, 12, -12]); L([4, -12, 12, -12, 12, -4]); break;
    case 'sol': ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); for (let a = 0; a < 8; a++) L([Math.cos(a * 0.785) * 9, Math.sin(a * 0.785) * 9, Math.cos(a * 0.785) * 14, Math.sin(a * 0.785) * 14]); break;
    case 'manos': L([-8, 12, -8, -6, -2, -12]); L([8, 12, 8, -6, 2, -12]); break;
    case 'espina': for (let a = 0; a < 6; a++) L([0, 0, Math.cos(a) * 13, Math.sin(a) * 13]); break;
    case 'llama': ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(12, 0, 6, 12); ctx.lineTo(-6, 12); ctx.quadraticCurveTo(-12, 0, 0, -14); ctx.fill(); break;
    case 'ojo': ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'martillo': L([-10, 12, 6, -4]); ctx.fillRect(0, -14, 12, 10); break;
    case 'bola': case 'meteoro': ctx.beginPath(); ctx.arc(2, 2, 9, 0, Math.PI * 2); ctx.fill(); L([-4, -4, -14, -14]); break;
    case 'muro': for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 9 - 4, 12); ctx.quadraticCurveTo(i * 9, -16, i * 9 + 4, 12); ctx.fill(); } break;
    case 'cristal': ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(6, 0); ctx.lineTo(0, 14); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); break;
    case 'nova': for (let a = 0; a < 8; a++) L([Math.cos(a * 0.785) * 5, Math.sin(a * 0.785) * 5, Math.cos(a * 0.785) * 14, Math.sin(a * 0.785) * 14]); break;
    case 'orbe': ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'copo': for (let a = 0; a < 3; a++) L([Math.cos(a * 1.047) * 13, Math.sin(a * 1.047) * 13, -Math.cos(a * 1.047) * 13, -Math.sin(a * 1.047) * 13]); break;
    case 'chispa': L([-12, 4, -4, -4, 0, 6, 6, -6, 12, 2]); break;
    case 'nube': ctx.beginPath(); ctx.arc(-6, 0, 7, 0, Math.PI * 2); ctx.arc(4, -3, 8, 0, Math.PI * 2); ctx.arc(8, 4, 6, 0, Math.PI * 2); ctx.fill(); break;
    case 'abanico': for (let a = -2; a <= 2; a++) L([0, 12, a * 6, -12]); break;
    case 'lluvia': for (let i = -2; i <= 2; i++) L([i * 6, -12, i * 6 - 3, 4]); break;
    case 'lanza': L([-13, 13, 13, -13]); ctx.beginPath(); ctx.moveTo(13, -13); ctx.lineTo(5, -9); ctx.lineTo(9, -5); ctx.fill(); break;
    case 'pluma': ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0.6, 0, Math.PI * 2); ctx.stroke(); L([-8, 10, 8, -10]); break;
    case 'alma': ctx.beginPath(); ctx.arc(0, -4, 8, 0, Math.PI * 2); ctx.fill(); L([-6, 4, -8, 14]); L([6, 4, 8, 14]); break;
    case 'hueso': L([-10, 10, 10, -10]); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 11, -s * 11, 3, 0, Math.PI * 2); ctx.fill(); } break;
    case 'espiral': ctx.beginPath(); for (let a = 0; a < 12; a += 0.2) ctx.lineTo(Math.cos(a) * a * 1.2, Math.sin(a) * a * 1.2); ctx.stroke(); break;
    case 'arco': ctx.beginPath(); ctx.arc(-6, 0, 14, -1.2, 1.2); ctx.stroke(); L([-1, -13, -1, 13]); break;
    case 'mano': ctx.fillRect(-8, -2, 16, 12); for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 4.5, -12, 3, 10); break;
    case 'reloj': ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); L([0, 0, 0, -8]); L([0, 0, 6, 3]); break;
    case 'garra': for (let i = -1; i <= 1; i++) L([i * 7, 12, i * 7 + 4, -12]); break;
    case 'corazon': ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-16, 0, -10, -16, 0, -6); ctx.bezierCurveTo(10, -16, 16, 0, 0, 12); ctx.fill(); break;
    case 'viento': for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-13, i * 7); ctx.quadraticCurveTo(4, i * 7 - 6, 13, i * 7); ctx.stroke(); } break;
    case 'grieta': L([-12, -12, -4, -2, -8, 4, 4, 12]); break;
    case 'raiz': L([0, -14, 0, 4, -8, 14]); L([0, 4, 8, 14]); L([0, -4, -8, 2]); break;
    case 'arbol': ctx.beginPath(); ctx.arc(0, -4, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-2, 4, 4, 10); break;
    case 'frasco': ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-3, -12, 6, 10); break;
    case 'racimo': for (const [a, b] of [[-6, 4], [6, 4], [0, -6]]) { ctx.beginPath(); ctx.arc(a, b, 6, 0, Math.PI * 2); ctx.fill(); } break;
    case 'torre': ctx.fillRect(-6, -6, 12, 18); ctx.fillRect(-10, -10, 20, 5); L([0, -10, 12, -14]); break;
    case 'moneda': ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); ctx.font = 'bold 13px Georgia, serif'; ctx.fillText('G', -4.5, 5); break;
    case 'corona': ctx.beginPath(); ctx.moveTo(-13, 9); ctx.lineTo(-13, -7); ctx.lineTo(-6, 1); ctx.lineTo(0, -12); ctx.lineTo(6, 1); ctx.lineTo(13, -7); ctx.lineTo(13, 9); ctx.closePath(); ctx.fill(); ctx.fillRect(-13, 11, 26, 3); break;
    case 'estrella': ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
    case 'campana': ctx.beginPath(); ctx.moveTo(-11, 8); ctx.quadraticCurveTo(-10, -13, 0, -13); ctx.quadraticCurveTo(10, -13, 11, 8); ctx.closePath(); ctx.fill(); ctx.fillRect(-13, 8, 26, 3); ctx.beginPath(); ctx.arc(0, 13, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'ala': for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-12, 10 - i * 2); ctx.quadraticCurveTo(-2, -4 - i * 3, 13 - i * 3, -12 + i * 6); ctx.stroke(); } break;
    case 'colmillo': for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 11, -12); ctx.quadraticCurveTo(sx * 2, -10, sx * 4, 13); ctx.quadraticCurveTo(sx * 9, 0, sx * 11, -12); ctx.fill(); } break;
    case 'loto': for (let a = -2; a <= 2; a++) { ctx.save(); ctx.rotate(a * 0.5); ctx.beginPath(); ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } L([-13, 10, 13, 10]); break;
    case 'cepo': ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.stroke(); for (let i = -2; i <= 2; i++) L([i * 5, 2, i * 5 + 1, -5]); L([-14, 6, 14, 6]); break;
    case 'tumba': ctx.beginPath(); ctx.moveTo(-9, 13); ctx.lineTo(-9, -4); ctx.arc(0, -4, 9, Math.PI, 0); ctx.lineTo(9, 13); ctx.stroke(); L([0, -6, 0, 6]); L([-4, -2, 4, -2]); break;
    default: ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
  }
}

function fondo(c: C2, hb: Habilidad, e: { luz: string; medio: string; hondo: string }, T: number) {
  const R = rnd(hash(hb.id ?? hb.glifo ?? 'x')), col = hb.color ?? e.medio;
  const g = c.createRadialGradient(T * 0.5, T * 0.42, T * 0.05, T * 0.5, T * 0.5, T * 0.78); g.addColorStop(0, mezcla(col, e.luz, 0.25)); g.addColorStop(0.5, mezcla(col, e.hondo, 0.45)); g.addColorStop(1, mezcla(e.hondo, '#000000', 0.5));
  c.fillStyle = g; c.fillRect(0, 0, T, T);
  c.save(); c.globalCompositeOperation = 'lighter';
  switch (hb.elem) {
    case 'fuego': for (let i = 0; i < 7; i++) { const x = R() * T, h = T * (0.3 + R() * 0.45), w = T * (0.08 + R() * 0.1); c.fillStyle = `rgba(255,${90 + Math.floor(R() * 80)},20,${0.1 + R() * 0.12})`; c.beginPath(); c.moveTo(x - w, T); c.quadraticCurveTo(x - w * 0.6, T - h * 0.5, x, T - h); c.quadraticCurveTo(x + w * 0.9, T - h * 0.4, x + w, T); c.fill(); } break;
    case 'frio': for (let i = 0; i < 9; i++) { const a = R() * 6.283, d = T * (0.42 + R() * 0.2), x = T / 2 + Math.cos(a) * d, y = T / 2 + Math.sin(a) * d, l = T * (0.12 + R() * 0.16); c.fillStyle = `rgba(190,230,255,${0.1 + R() * 0.14})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a) * l + Math.sin(a) * l * 0.2, y - Math.sin(a) * l - Math.cos(a) * l * 0.2); c.lineTo(x - Math.cos(a) * l - Math.sin(a) * l * 0.2, y - Math.sin(a) * l + Math.cos(a) * l * 0.2); c.fill(); } break;
    case 'rayo': c.strokeStyle = 'rgba(190,190,255,0.22)'; c.lineWidth = T * 0.016; for (let i = 0; i < 4; i++) { let x = R() * T, y = 0; c.beginPath(); c.moveTo(x, y); while (y < T) { x += (R() - 0.5) * T * 0.22; y += T * (0.1 + R() * 0.12); c.lineTo(x, y); } c.stroke(); } break;
    case 'veneno': for (let i = 0; i < 12; i++) { const r = T * (0.02 + R() * 0.05); c.strokeStyle = `rgba(170,255,110,${0.14 + R() * 0.16})`; c.lineWidth = T * 0.012; c.beginPath(); c.arc(R() * T, T * (0.3 + R() * 0.7), r, 0, 6.283); c.stroke(); } break;
    case 'sombra': c.strokeStyle = 'rgba(190,120,255,0.16)'; c.lineWidth = T * 0.03; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(T / 2 + (R() - 0.5) * T * 0.3, T / 2 + (R() - 0.5) * T * 0.3, T * (0.2 + R() * 0.3), R() * 6.283, R() * 6.283 + 2.2); c.stroke(); } break;
    case 'luz': for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + R() * 0.2, w = 0.06 + R() * 0.05; c.fillStyle = `rgba(255,235,160,${0.07 + R() * 0.08})`; c.beginPath(); c.moveTo(T / 2, T / 2); c.lineTo(T / 2 + Math.cos(a - w) * T, T / 2 + Math.sin(a - w) * T); c.lineTo(T / 2 + Math.cos(a + w) * T, T / 2 + Math.sin(a + w) * T); c.fill(); } break;
    default: c.strokeStyle = 'rgba(255,200,160,0.13)'; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { c.lineWidth = T * (0.012 + R() * 0.02); const x = R() * T * 0.7, y = T * (0.2 + R() * 0.6), l = T * (0.3 + R() * 0.4); c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * 0.75); c.stroke(); }
      if (hb.elem === 'sangre') for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,30,20,${0.12 + R() * 0.14})`; c.beginPath(); c.arc(R() * T, R() * T, T * (0.012 + R() * 0.035), 0, 6.283); c.fill(); }
  }
  c.restore();
  // viñeta y un brillo de vidrio arriba
  const v = c.createRadialGradient(T / 2, T / 2, T * 0.28, T / 2, T / 2, T * 0.74); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.62)'); c.fillStyle = v; c.fillRect(0, 0, T, T);
  const b = c.createLinearGradient(0, 0, 0, T * 0.45); b.addColorStop(0, 'rgba(255,255,255,0.13)'); b.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = b; c.fillRect(0, 0, T, T * 0.45);
}

function marco(c: C2, T: number, oro: boolean, redondo: boolean, e: { medio: string }) {
  const m = oro ? ORO : ['#e8c88a', '#a07c44', '#3c2a12'], w = Math.max(2, T * 0.075);
  c.save();
  if (redondo) {
    c.lineWidth = w; const g = c.createLinearGradient(0, 0, T, T); g.addColorStop(0, m[0]); g.addColorStop(0.5, m[1]); g.addColorStop(1, m[2]); c.strokeStyle = g; c.beginPath(); c.arc(T / 2, T / 2, T / 2 - w / 2, 0, 6.283); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.beginPath(); c.arc(T / 2, T / 2, T / 2 - w, 0, 6.283); c.stroke(); c.beginPath(); c.arc(T / 2, T / 2, T / 2 - 0.5, 0, 6.283); c.stroke();
  } else {
    // bisel: claro arriba y a la izquierda, oscuro abajo y a la derecha
    c.fillStyle = m[1]; c.fillRect(0, 0, T, w); c.fillRect(0, 0, w, T); c.fillRect(0, T - w, T, w); c.fillRect(T - w, 0, w, T);
    c.fillStyle = m[0]; c.fillRect(0, 0, T, w * 0.4); c.fillRect(0, 0, w * 0.4, T);
    c.fillStyle = m[2]; c.fillRect(0, T - w * 0.45, T, w * 0.45); c.fillRect(T - w * 0.45, 0, w * 0.45, T);
    c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, T - 1, T - 1); c.strokeRect(w + 0.5, w + 0.5, T - 2 * w - 1, T - 2 * w - 1);
    // remaches en las esquinas (gemas en las definitivas)
    for (const [x, y] of [[w * 0.9, w * 0.9], [T - w * 0.9, w * 0.9], [w * 0.9, T - w * 0.9], [T - w * 0.9, T - w * 0.9]]) { const r = w * (oro ? 0.75 : 0.5); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = oro ? e.medio : m[0]; c.fill(); c.lineWidth = 0.8; c.strokeStyle = 'rgba(0,0,0,0.8)'; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 6.283); c.fill(); }
  }
  c.restore();
}

let lienzoG: HTMLCanvasElement | null = null;
/** El glifo con volumen sobre un lienzo de T × T (centrado), listo para copiar. */
function glifo(hb: Habilidad, e: { luz: string; medio: string; hondo: string }, T: number): HTMLCanvasElement {
  const g = (lienzoG ??= document.createElement('canvas')); g.width = g.height = T; const c = g.getContext('2d')!;
  c.clearRect(0, 0, T, T); c.save(); c.translate(T / 2, T / 2); const k = T / 48; c.scale(k, k);
  const hecho = pintado(c, hb.glifo, e);
  if (!hecho) silueta(c, hb.glifo);
  c.restore();
  if (hecho) return g;
  // la silueta blanca recibe materia: degradado de marfil al color del elemento, sombra abajo a la derecha y luz arriba
  c.save(); c.globalCompositeOperation = 'source-in'; const gr = c.createLinearGradient(0, T * 0.18, 0, T * 0.84); gr.addColorStop(0, '#fffdf2'); gr.addColorStop(0.45, mezcla(e.luz, '#ffffff', 0.35)); gr.addColorStop(1, mezcla(e.medio, e.luz, 0.35)); c.fillStyle = gr; c.fillRect(0, 0, T, T); c.restore();
  const cuerpo = document.createElement('canvas'); cuerpo.width = cuerpo.height = T; const cc = cuerpo.getContext('2d')!;
  // contorno oscuro: la silueta en negro, corrida a los ocho lados
  const negra = document.createElement('canvas'); negra.width = negra.height = T; const cn = negra.getContext('2d')!; cn.drawImage(g, 0, 0); cn.globalCompositeOperation = 'source-in'; cn.fillStyle = BORDE; cn.fillRect(0, 0, T, T);
  const o = Math.max(1, T / 44); for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o], [o * 1.6, o * 1.9]]) cc.drawImage(negra, dx, dy);
  cc.drawImage(g, 0, 0);
  // bisel: la silueta negra corrida arriba a la izquierda, recortada al cuerpo, deja sombra en el canto de abajo
  const bis = document.createElement('canvas'); bis.width = bis.height = T; const cb = bis.getContext('2d')!; cb.drawImage(g, 0, 0); cb.globalCompositeOperation = 'destination-out'; cb.drawImage(g, -o * 0.9, -o * 0.9); cb.globalCompositeOperation = 'source-in'; cb.fillStyle = 'rgba(40,20,10,0.5)'; cb.fillRect(0, 0, T, T);
  cc.drawImage(bis, 0, 0);
  c.clearRect(0, 0, T, T); c.drawImage(cuerpo, 0, 0);
  return g;
}

/** El icono de una habilidad, pintado y guardado. `s` es el lado con que se va a dibujar (se pinta al doble). */
export function iconoPintado(hb: Habilidad, s: number, apagado = false, redondo = false, soloGlifo = false, sinMarco = false): HTMLCanvasElement {
  // (los botones del HUD táctil pasan también seudo-habilidades sin id: el escudo de Calmo, el golpe)
  const T = Math.max(32, Math.round(s * 2)), clave = `${hb.id ?? ''}~${hb.glifo}~${hb.color}|${T}|${apagado ? 1 : 0}${redondo ? 1 : 0}${soloGlifo ? 1 : 0}${sinMarco ? 1 : 0}`;
  let cv = cache.get(clave); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = T; const c = cv.getContext('2d')!;
  const e = ELEM[hb.elem] ?? ELEM.fisico;
  if (!soloGlifo) { c.save(); if (redondo) { c.beginPath(); c.arc(T / 2, T / 2, T / 2, 0, 6.283); c.clip(); } fondo(c, hb, e, T); c.restore(); }
  const gl = glifo(hb, e, T);
  // el resplandor del elemento por detrás del glifo
  if (!apagado) { c.save(); c.globalCompositeOperation = 'lighter'; const tin = document.createElement('canvas'); tin.width = tin.height = T; const ct = tin.getContext('2d')!; ct.drawImage(gl, 0, 0); ct.globalCompositeOperation = 'source-in'; ct.fillStyle = e.luz; ct.fillRect(0, 0, T, T);
    const r = T / 18; c.globalAlpha = 0.045; for (let a = 0; a < 12; a++) c.drawImage(tin, Math.cos(a * 0.5236) * r, Math.sin(a * 0.5236) * r); c.restore(); }
  // (en un botón redondo las puntas de un arma en diagonal se salían del círculo: ahí el glifo va al 80 %)
  const m = soloGlifo ? T * 0.1 : redondo ? T * 0.13 : T * 0.06; c.drawImage(gl, m, m, T - 2 * m, T - 2 * m);
  if (!soloGlifo && !sinMarco) marco(c, T, !!hb.definitiva, redondo, e);
  if (apagado) { c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(14,12,12,0.66)'; c.fillRect(0, 0, T, T); c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, T, T); c.restore(); }
  cache.set(clave, cv); return cv;
}
