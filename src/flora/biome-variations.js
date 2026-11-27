// Variants change the editable wood as well as the crown. Every branch keeps
// its attachment at the local origin, including roots and socket-mounted wood.
// Collision must be exported for each structure, never borrowed by family name.
export const BIOME_TREE_FAMILIES=new Set(['oak','birch','pine','spruce','rowan','kapok','fig','vined-fig','mangrove','vined-mangrove','cypress','pandanus','willow','alder','poplar','date-palm','tamarisk','sea-grape','coconut-palm','understory-palm','black-mangrove','fan-palm','coastal-wind-tree','treeline-conifer','woodland-sapling','standing-snag','broken-tree','fallen-tree']);
export function biomeStructureVariant(f,variant){
 if(![0,1,2].includes(variant))throw Error('Choose structure variant A, B or C.');
 if(!variant)return f;
 const wide=variant===1;
 for(const [i,b] of f.branches.entries()){
  if(b.anchor)continue;
  const groundRoot=/root|pneumatophore/i.test(b.name||'');
  const main=!b.parent,angle=(wide?.38:-.49)+Math.sin(i*1.73)*.24,c=Math.cos(angle),s=Math.sin(angle),origin=b.points[0];
  const stretch=groundRoot?1:wide?.93:1.08,reach=groundRoot?1:wide?1.16:.86;
  b.points=b.points.map((p,j)=>{
   if(!j)return [...p];
   const t=j/(b.points.length-1),x=p[0]-origin[0],y=p[1]-origin[1],z=p[2]-origin[2];
   // Roots retain their contact elevations; crown boughs acquire different
   // elbows and rises rather than becoming uniform scaled copies.
   return [origin[0]+(x*c-z*s)*reach+(main?y*(wide?.085:-.055)*t:Math.sin(t*Math.PI)*(wide?.12:-.09)),origin[1]+y*stretch+(groundRoot||main?0:Math.sin(t*Math.PI)*Math.hypot(x,z)*.12*(wide?1:-1)),origin[2]+(x*s+z*c)*reach+(main?y*.035*Math.sin(t*Math.PI):0)];
  });
  b.radii=b.radii.map((r,j)=>Math.max(.015,r*(groundRoot?1:wide?1.08:.94)*(1+(j?Math.sin(i+j)*.04:0))));
  if(b.parent&&!b.parentOrgan&&!b.branchSurface&&!groundRoot&&!/vine|liana/i.test(b.name||''))b.at=Math.max(.05,Math.min(.98,b.at+(wide?-.035:.025)*(.6+.4*Math.sin(i*2.3)**2)));
 }
 // Some trees use editable body organs for their main fork (e.g. willow).
 // Changing that body carries every socket-mounted child with it.
 for(const o of f.organs.filter(o=>o.kind==='bark')){
  o.rotation[1]+=(wide?.18:-.23);o.scale=o.scale.map((v,k)=>v*(k===1?(wide?.95:1.05):(wide?1.08:.94)));
 }
 return f;
}
export function biomeCrownVariant(spec,variant){
 if(![0,1,2].includes(variant))throw Error('Choose crown variant A, B or C.');
 const short=spec.id.replace('biome-',''),f=structuredClone(spec.floraPreset);
 if(!BIOME_TREE_FAMILIES.has(short))return {...spec,floraPreset:f};
 biomeStructureVariant(f,variant);
 for(const [i,o] of f.organs.entries())if(o.billboard){
  o.billboard.facing='camera';
  if(variant){
   const wide=variant===1,wave=Math.sin(i*1.71+variant*.83);
   o.billboard.seed=(o.billboard.seed+variant*17011+i*67)%65536;
   o.billboard.radius*=wide?1.18:.84;o.billboard.height*=wide?.9:1.28;
   const size=(wide?1.09:.96)*(1+wave*.09);o.billboard.minSize*=size;o.billboard.maxSize*=size;
   o.billboard.count=Math.max(1,Math.min(128,Math.round(o.billboard.count*(wide?1.12:.88))));
   o.billboard.lowDetailCount=Math.min(o.billboard.count,Math.max(1,Math.ceil(o.billboard.count*.4)));
   o.at=Math.min(1,Math.max(0,o.at+(wide?-.035:.025)*(.5+.5*Math.abs(wave))));
   o.rotation[1]+=(variant===1?.31:-.27)+wave*.18;
  }
 }else if(variant&&o.kind==='leaf'){
  const wave=Math.sin(i*1.71+variant*.83),wide=variant===1;
  o.scale=o.scale.map((v,k)=>v*(1+wave*.12)*(k===1?(wide?.92:1.12):(wide?1.12:.92)));
  o.rotation[1]+=(wide?.28:-.31)+wave*.12;o.rotation[0]+=wave*.11;
 }
 const label=['A','B','C'][variant],id=spec.id+(variant?'-'+label.toLowerCase():'');
 return {...spec,id,name:spec.name+(variant?' '+label:''),collection:'Archipelago',family:short,crownVariant:label,structureVariant:label,paletteCategory:'Tree presets',sourceName:'Archipelago · '+spec.name+' '+label+' · editable tree structure · '+spec.biomes.join(' · '),floraPreset:f};
}
export function biomeCrownVariants(specs){
 return specs.flatMap(spec=>BIOME_TREE_FAMILIES.has(spec.id.replace('biome-',''))?[0,1,2].map(variant=>biomeCrownVariant(spec,variant)):[spec]);
}
