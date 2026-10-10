/**
 * Lector del kit deportivo, tal como lo usaría un juego: solo lee manifest.json y las hojas PNG.
 * No importa nada del motor de PixelForja (una prueba lo vigila): si algo falta acá, le falta al kit.
 */

export interface KitEvent {
  tipo: 'paso' | 'impacto' | 'suelta' | 'despegue' | 'aterriza';
  cuadro: number;
  fase: number;
  pie?: 'cerca' | 'lejos';
  /** por fila: mano o pie que pega, en pixeles desde el pivote */
  punto?: [number, number][];
}

export interface KitAnim {
  archivo: string;
  cuadros: number;
  fps: number;
  loop: boolean;
  eventos?: KitEvent[];
  avance?: number;
  elevacion?: number[];
  desplazamiento?: number[];
  rumbo?: string[];
  agua?: (number | null)[];
}

export interface KitAthlete {
  nombre: string;
  celda: number;
  pivote: [number, number];
  deportes: Record<string, Record<string, KitAnim>>;
}

export interface KitManifest {
  tipo: string;
  generado_con: string;
  version: number;
  celda: number;
  pivote: [number, number];
  direcciones: string[];
  atletas: Record<string, KitAthlete>;
  creditos?: string;
}

/** De dónde salen los archivos: una carpeta publicada (URL) o una carpeta elegida en el equipo. */
export interface KitSource {
  label: string;
  url(path: string): string | undefined;
}

export function urlSource(base: string): KitSource {
  const root = base.endsWith('/') ? base : `${base}/`;
  return { label: root, url: (p) => new URL(p, new URL(root, location.href)).href };
}

/** Carpeta elegida con el selector de carpetas: cada archivo queda como URL local. */
export function filesSource(files: FileList | File[]): KitSource {
  const map = new Map<string, string>();
  let label = 'kit';
  for (const f of Array.from(files)) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const parts = rel.split('/');
    // la carpeta raíz del kit es la que tiene el manifest; se quita el primer tramo (el nombre de la carpeta elegida)
    if (parts.length > 1) label = parts[0];
    map.set(parts.length > 1 ? parts.slice(1).join('/') : rel, URL.createObjectURL(f));
  }
  return { label, url: (p) => map.get(p) };
}

export class Kit {
  private images = new Map<string, Promise<HTMLImageElement>>();
  constructor(readonly manifest: KitManifest, private source: KitSource) {}

  static async load(source: KitSource): Promise<Kit> {
    const u = source.url('manifest.json');
    if (!u) throw new Error('La carpeta no tiene manifest.json');
    const res = await fetch(u);
    if (!res.ok) throw new Error(`No se pudo leer el manifiesto (${res.status})`);
    const m = (await res.json()) as KitManifest;
    if (m.generado_con !== 'PixelForja' || !m.atletas || m.direcciones?.length !== 8) throw new Error('Esto no es un kit deportivo de PixelForja');
    return new Kit(m, source);
  }

  get label() { return this.source.label; }
  athleteIds() { return Object.keys(this.manifest.atletas); }
  athlete(id: string) { return this.manifest.atletas[id]; }
  sports(id: string) { return Object.keys(this.manifest.atletas[id]?.deportes ?? {}); }
  anim(id: string, sport: string, name: string): KitAnim | undefined { return this.manifest.atletas[id]?.deportes[sport]?.[name]; }
  row(direction: string) { return this.manifest.direcciones.indexOf(direction); }

  image(path: string): Promise<HTMLImageElement> {
    let p = this.images.get(path);
    if (!p) {
      const u = this.source.url(path);
      p = new Promise((ok, fail) => {
        if (!u) { fail(new Error(`Falta ${path}`)); return; }
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => fail(new Error(`No se pudo cargar ${path}`));
        img.src = u;
      });
      this.images.set(path, p);
    }
    return p;
  }

  /** Carga todas las hojas de un atleta en un deporte. Devuelve las que se pudieron leer. */
  async preload(id: string, sport: string): Promise<Map<string, HTMLImageElement>> {
    const anims = this.manifest.atletas[id]?.deportes[sport] ?? {};
    const out = new Map<string, HTMLImageElement>();
    await Promise.all(Object.entries(anims).map(async ([name, a]) => {
      try { out.set(name, await this.image(a.archivo)); } catch { /* la animación queda sin hoja: el juego la salta */ }
    }));
    return out;
  }
}
