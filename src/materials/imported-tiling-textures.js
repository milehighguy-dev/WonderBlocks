import {LIBRARY_SURFACES,libraryPixels} from './texture-library.js';
export const IMPORTED_TILING_TEXTURES=LIBRARY_SURFACES.filter(s=>['SWBF1','SWBF2','Jedi Academy','KOTOR'].includes(s.game));
export function importedTilingPixels(id,size=128){return IMPORTED_TILING_TEXTURES.some(s=>s.id===id)?libraryPixels(id,size):null;}
