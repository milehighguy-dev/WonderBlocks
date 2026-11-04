import {SURFACES} from './surfaces.js';
import {LIBRARY_CATEGORIES} from './texture-library.js';
export const TEXTURE_CATEGORIES=[...LIBRARY_CATEGORIES.map(c=>({...c,ids:new Set(c.ids)})),
 {id:'all',name:'All textures',ids:new Set(SURFACES.filter(s=>s.id!=='plain').map(s=>s.id)),preview:LIBRARY_CATEGORIES.flatMap(c=>c.preview.slice(0,1)).slice(0,4)}];
export function texturesForCategory(id){const category=TEXTURE_CATEGORIES.find(c=>c.id===id);return category?SURFACES.filter(s=>category.ids.has(s.id)):[];}
