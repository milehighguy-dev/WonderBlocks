import {navigationBlocks,parsePlanning,parseBarriers} from './swbf2-navigation-merge.js';

export const exportOwner=result=>result.manifest.exportIdentity?.id??result.filename.replace(/\.(swbf2|object|msh)\.zip$/,'');
export function removeGeneratedNavigation(planning,barriers,prefix){
 if(!/^w[0-9a-f]{8}$/.test(prefix))throw Error('Missing generated planning identity.');
 const owned=name=>name.toLowerCase().startsWith(prefix.toLowerCase()+'_');
 const strip=(text,blocks)=>{for(const block of blocks.filter(b=>owned(b.name)).sort((a,b)=>b.start-a.start))text=text.slice(0,block.start)+text.slice(block.end);return text;};
 const nextPlanning=strip(planning,navigationBlocks(planning)).trim()+'\n';
 try{parsePlanning(nextPlanning);}catch{throw Error('WorldEdit planning references this export’s generated hubs or connections. Disconnect those references in WorldEdit before removing its planning.');}
 const retained=strip(barriers,navigationBlocks(barriers,true)).replace(/\bBarrierCount\s*\(\s*\d+\s*\)\s*;/g,'').trim(),records=parseBarriers(retained);
 return {planning:nextPlanning,barriers:`BarrierCount(${records.length});\n\n${retained}${retained?'\n':''}`};
}
export function assertAssetUpdateCompatible(previous,files){
 if(!previous?.destination?.layerName)throw Error('Export this scene’s placements once before using Update assets only.');
 const placed=path=>/^odf\/[^/]+\.odf$/i.test(path),old=new Set((previous.files??[]).filter(placed)),next=new Set([...files.keys()].filter(placed));
 if(old.size!==next.size||[...old].some(path=>!next.has(path)))throw Error('Scene resources were added, removed or renamed. Choose Replace scene placements to update its object list.');
}
