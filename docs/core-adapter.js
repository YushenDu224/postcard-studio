// The UI consumes this interface, never a specific C++/WASM implementation.
const units = { mm: 0, cm: 1, in: 2, px: 3 };
export const fallback = {
  toMm(value, unit, dpi) {
    if (!Number.isFinite(value) || value <= 0 || !(unit in units)) return -1;
    return unit === 'cm' ? value * 10 : unit === 'in' ? value * 25.4 : unit === 'px' ? dpi > 0 ? value * 25.4 / dpi : -1 : value;
  },
  pixels(mm, dpi) {return Number.isFinite(mm) && Number.isFinite(dpi) && mm > 0 && dpi > 0 && mm / 25.4 * dpi < 2147483647.5 ? Math.max(1, Math.round(mm / 25.4 * dpi)) : -1;},
  coverScale(iw, ih, aw, ah) {return iw > 0 && ih > 0 && aw > 0 && ah > 0 ? Math.max(aw / iw, ah / ih) : -1;},
  effectiveDpi(iw, ih, aw, ah, zoom) {const s = this.coverScale(iw, ih, aw, ah); return s > 0 && zoom >= 1 ? 25.4 / (s * zoom) : -1;}
};
export let engine = fallback;
export async function initializeCore() {
  try {
    const {default:createCore} = await import('./core.generated.js');
    const m = await createCore();
    engine = {
      toMm:(v,u,d)=>m._pc_to_mm(v, units[u] ?? -1, d),
      pixels:(v,d)=>m._pc_pixels(v,d),
      coverScale:(iw,ih,w,h)=>m._pc_cover_scale(iw,ih,w,h),
      effectiveDpi:(iw,ih,w,h,z)=>m._pc_effective_dpi(iw,ih,w,h,z)
    };
    return 'wasm';
  } catch { return 'fallback'; }
}
