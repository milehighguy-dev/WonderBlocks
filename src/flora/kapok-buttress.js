// Closed root walls and bole retain their authored outline while joints bend.
const angles=[],fins=[{a:.1,r:5.1,h:6.6},{a:1.04,r:4.5,h:5.7},{a:2.15,r:5.6,h:6.1},{a:3.25,r:4.8,h:5.5},{a:4.26,r:5.4,h:6.8},{a:5.43,r:4.7,h:5.9}];
for(let i=0;i<64;i++)angles.push(i*Math.PI*2/64);
for(const fin of fins)for(const offset of [-.12,-.065,-.025,0,.025,.065,.12])angles.push((fin.a+offset+Math.PI*2)%(Math.PI*2));
angles.sort((a,b)=>a-b);angles.push(angles[0]+Math.PI*2);
const rootRows=[0,.12,.35,.7,1.15,1.8,2.6,3.5,4.5,5.5,6.3,7];
const girths=[[0,1.55],[7,1.15],[12,1.08],[18,.94],[24,.77],[29,.56],[34,.16],[35,.035]];
function shaftRadius(y){const i=Math.min(girths.length-2,girths.findLastIndex(p=>p[0]<=y)),a=girths[i],b=girths[i+1];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]);}
function mesh(height,rows){const positions=[],uv=[],indices=[],bindings=[],n=angles.length;
 for(const y of rows)for(const angle of angles){
  const t=Math.min(1,y/height);let flare=0;
  for(const fin of fins){const delta=Math.atan2(Math.sin(angle-fin.a),Math.cos(angle-fin.a));flare=Math.max(flare,fin.r*Math.max(0,1-y/fin.h)**1.7*Math.exp(-((delta/.048)**2)));}
  const radius=shaftRadius(y)+flare,bearing=angle+.028*Math.sin(y*.9)*Math.sin(angle*3+1);
  positions.push(Math.cos(bearing)*radius/height,y/height,Math.sin(bearing)*radius/height);uv.push(angle/(Math.PI*2)*4,y/7*3);bindings.push(t);
 }
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;indices.push(a,c,b,b,c,d);}
 for(const [row,reverse] of [[0,true],[rows.length-1,false]]){const center=positions.length/3;positions.push(0,rows[row]/height,0);uv.push(.5,.5);bindings.push(Math.min(1,rows[row]/height));for(let i=0;i<n-1;i++){const a=row*n+i,b=a+1;indices.push(center,...(reverse?[a,b]:[b,a]));}}
 return {positions,uv,indices,bindings};
}
const roots=mesh(7,[...rootRows,7.45]),bole=mesh(35,[...rootRows,9,12,15,18,21,24,27,30,32,34,35]);
export const KAPOK_BUTTRESS_SHAPES={
 'kapok-buttress':{points:[[0,0,0],[0,.5,0],[0,1,0]],radii:[1.55/7,1.35/7,1.15/7],length:7,joints:3,mesh:roots},
 'kapok-buttressed-bole':{points:Array.from({length:8},(_,i)=>[0,i/7,0]),radii:Array.from({length:8},(_,i)=>shaftRadius(i*5)/35),length:35,joints:8,mesh:bole},
};
export const KAPOK_BUTTRESS={id:'kapok-buttress',name:'Kapok Buttress Roots',sourceName:'Ceiba pentandra buttress roots',category:'Trunks',paletteCategory:'Bases',texture:false,nativeSkin:true,profile:{radii:[1.55,1.35,1.15],percentages:[0,.5,1]},meshes:[roots],iconUrl:new URL('../../assets/flora-tree-presets/kapok-buttress.png',import.meta.url).href};
export const KAPOK_BOLE={id:'kapok-buttressed-bole',name:'Kapok Buttressed Bole',category:'Trunks',paletteHidden:true,texture:false,nativeSkin:true,profile:{radii:[1.55,1.15,.035],percentages:[0,.2,1]},meshes:[bole],iconUrl:KAPOK_BUTTRESS.iconUrl};
