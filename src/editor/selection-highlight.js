import * as T from '../../vendor/three.module.js';

// Separate overlays share geometry/textures without becoming part of the object.
// They cannot affect picking, triangle counts, saved scenes or export collision.
export function createSelectionHighlight(scene){
 const group=new T.Group();group.name='selection-highlight';scene.add(group);
 let entries=new Map();
 const visible=source=>{for(let o=source;o;o=o.parent)if(!o.visible)return false;return true;};
 function release(entry){group.remove(entry.overlay);for(const material of entry.materials)material.dispose();}
 function set(roots){
  const sources=new Set();for(const root of roots)root?.traverse(source=>{if(source.isMesh&&!source.userData.materialGhost)sources.add(source);});
  for(const [source,entry] of entries)if(!sources.has(source)){release(entry);entries.delete(source);}
  for(const source of sources){
   if(entries.has(source))continue;
   const materials=(Array.isArray(source.material)?source.material:[source.material]).map(original=>{
    const material=new T.MeshBasicMaterial({color:0xffd43b,map:original.map,alphaMap:original.alphaMap,alphaTest:original.alphaTest*.32,transparent:true,opacity:.32,depthWrite:false,side:original.side,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false});
    material.visible=original.visible;
    material.onBeforeCompile=shader=>{if(source.userData.floraBillboard)original.onBeforeCompile(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = diffuse;');};
    material.customProgramCacheKey=()=> 'selection-yellow-v1'+(source.userData.floraBillboard?'-billboard':'');
    return material;
   });
   const overlay=new T.Mesh(source.geometry,Array.isArray(source.material)?materials:materials[0]);overlay.matrixAutoUpdate=false;overlay.renderOrder=1800;overlay.raycast=()=>{};
   if(source.userData.floraBillboard)overlay.onBeforeRender=(...args)=>source.onBeforeRender(...args);
   group.add(overlay);entries.set(source,{overlay,materials});
  }
  update();
 }
 function update(){for(const [source,{overlay}] of entries){source.updateWorldMatrix(true,false);overlay.matrix.copy(source.matrixWorld);overlay.matrixWorldNeedsUpdate=true;overlay.visible=visible(source);}}
 return {group,set,update,dispose(){for(const entry of entries.values())release(entry);entries.clear();scene.remove(group);}};
}
