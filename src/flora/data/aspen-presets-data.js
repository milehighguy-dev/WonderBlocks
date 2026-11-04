const bark={preset:'aspen-bark',scale:.55};
const limb=(id,name,parent,at,points,radii)=>({id,name,parent,at,profile:'flora-basic-branch',nativeShape:true,points,radii});
const branches=[limb('aspen-trunk','Aspen pale bole',null,0,[[0,0,0],[.06,3,0],[-.04,6,.08],[.14,9,.05],[.08,12,-.08],[.28,15,.06],[.16,18,0]],[.31,.23,.19,.15,.10,.055,.015])];
const leaves=[];
for(let i=0;i<11;i++){
 const angle=i*2.39996+.4,at=.34+i*.055,length=2.8+Math.sin((i+1)/12*Math.PI)*.8-i*.1,dx=Math.cos(angle)*length,dz=Math.sin(angle)*length,id='aspen-bough-'+i;
 branches.push(limb(id,'Aspen crown bough '+(i+1),'aspen-trunk',at,[[0,0,0],[dx*.34,.65,dz*.34],[dx*.76,1.75,dz*.76],[dx,2.8,dz]],[.065,.044,.025,.015]));
 const fork=id+'-fork',side=angle+(i%2?-.85:.85);
 branches.push(limb(fork,'Aspen fine fork '+(i+1),id,.6,[[0,0,0],[Math.cos(side)*.65,.8,Math.sin(side)*.65],[Math.cos(side)*1.1,1.65,Math.sin(side)*1.1]],[.028,.019,.015]));
 leaves.push({id:'aspen-leaves-'+i,name:'Aspen leaf patch '+(i+1),branch:id,kind:'leaf',at:.65,offset:[0,.35,0],rotation:[0,angle,0],scale:[1,1,1],asset:'aspen-summer-leaves',billboard:{count:12,radius:.85,height:1.5,minSize:2.6,maxSize:3.2,heightScale:.5,darknessMin:.7,darknessMax:1,seed:151+i*19,atlas:2,facing:'camera',anchor:'center'}});
}
// Winter keeps the bole and primary boughs, without the fine forks or twig fans.
export const ASPEN_PRESETS=['summer','fall','winter'].map(season=>({id:'aspen-'+season,name:'Aspen · '+season[0].toUpperCase()+season.slice(1),sourceName:'Mature aspen · representative 18 m tree',planet:'Earth',category:'Tree presets',paletteCategory:'Tree presets',floraPreset:{branches:structuredClone(season==='winter'?branches.filter(b=>!b.id.endsWith('-fork')):branches),organs:season==='winter'?[]:structuredClone(leaves).map(o=>({...o,asset:'aspen-'+season+'-leaves'})),colors:{bark:'#ebe9da',leaf:'#ffffff'},detail:'standard',finishes:{bark}}}));
