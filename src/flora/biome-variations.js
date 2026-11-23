// Crown variants retain their woody scaffold, so accurate trunk/root collision
// can be shared. Leaf envelopes, attachment heights and seeded clumps differ.
export const BIOME_TREE_FAMILIES=new Set(['oak','birch','pine','spruce','rowan','kapok','fig','vined-fig','mangrove','vined-mangrove','cypress','pandanus','willow','alder','poplar','date-palm','tamarisk','sea-grape','coconut-palm','understory-palm']);
export function biomeCrownVariant(spec,variant){
 if(![0,1,2].includes(variant))throw Error('Choose crown variant A, B or C.');
 const short=spec.id.replace('biome-',''),f=structuredClone(spec.floraPreset);
 if(!BIOME_TREE_FAMILIES.has(short))return {...spec,floraPreset:f};
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
 return {...spec,id,name:spec.name+(variant?' '+label:''),family:short,crownVariant:label,sourceName:spec.name+' '+label+' · editable crown variant · '+spec.biomes.join(' · '),floraPreset:f};
}
export function biomeCrownVariants(specs){
 return specs.flatMap(spec=>BIOME_TREE_FAMILIES.has(spec.id.replace('biome-',''))?[0,1,2].map(variant=>biomeCrownVariant(spec,variant)):[spec]);
}
