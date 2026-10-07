import type { Ficha } from '../engine/index';

/**
 * Galería: los personajes guardados en este navegador (localStorage).
 * Es una comodidad: si el navegador borra los datos se pierde. Para guardar de verdad, exporta la ficha.
 */
export interface GalleryItem {
  id: string;
  name: string;
  date: string;
  thumb: string;
  ficha: Ficha;
}

const KEY = 'pf.gallery.v1';

export function loadGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GalleryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveGallery(items: GalleryItem[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function upsert(items: GalleryItem[], item: GalleryItem): GalleryItem[] {
  const rest = items.filter((x) => x.name !== item.name);
  return [item, ...rest].slice(0, 40);
}
