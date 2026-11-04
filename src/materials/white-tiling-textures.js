import {LIBRARY_SURFACES,libraryPixels} from './texture-library.js';
export const WHITE_TILING_TEXTURES=LIBRARY_SURFACES.filter(s=>s.sourceId);
export function whiteTilingPixels(id,size=128){return WHITE_TILING_TEXTURES.some(s=>s.id===id)?libraryPixels(id,size):null;}
