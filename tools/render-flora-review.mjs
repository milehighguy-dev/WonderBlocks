// Offline inspection of current flora geometry.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import * as T from '../vendor/three.module.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {TEMP_BASE_PARTS} from '../src/flora/temp-bases.js';

const args=process.argv.slice(2),value=name=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
const options=new Set(['--out','--collection','--ids','--mode','--size','--ss','--views']);
for(const argument of args)if(!options.has(argument.split('=')[0])||!argument.includes('='))throw Error('Unknown option '+argument);
const root=fileURLToPath(new URL('../',import.meta.url));
const collection=value('--collection')||'leaves';
if(!['leaves','branches','bases'].includes(collection))throw Error('Use --collection=leaves|branches|bases');
const output=path.resolve(value('--out')||path.join(root,'../../work/flora-'+collection+'-review'));
const selected=value('--ids')?.split(','),mode=value('--mode')||'both';
const cell=Number(value('--size')||256),ss=Number(value('--ss')||2);
if(!Number.isInteger(cell)||cell<128||cell>1024||![1,2].includes(ss))throw Error('Use --size=128..1024 and --ss=1|2');
const modes=mode==='both'?['clay','textured']:[mode];if(modes.some(m=>!['clay','textured'].includes(m)))throw Error('Use --mode=clay|textured|both');
const library={leaves:MODELED_LEAF_PARTS,branches:BARK_BRANCH_PARTS,bases:TEMP_BASE_PARTS}[collection];
const parts=library.filter(p=>!selected||selected.includes(p.id));
if(!parts.length)throw Error('No matching flora parts');
fs.mkdirSync(output,{recursive:true});
const viewOptions={quarter:['THREE QUARTER',[1,.65,1.5]],front:['FRONT',[0,.1,1]],side:['SIDE',[1,.1,0]],back:['BACK',[0,.1,-1]],top:['TOP',[.03,1,.03]],below:['BELOW',[.65,-1,1]]};
const views=(value('--views')?.split(',')||['quarter','front','side','top']).map(name=>{if(!viewOptions[name])throw Error('Unknown view '+name);return viewOptions[name];});
const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const keyLight=unit([-.55,.8,1]),fillLight=unit([.65,.2,-.6]);

function crc(data){let v=-1;for(const byte of data){v^=byte;for(let i=0;i<8;i++)v=v>>>1^(v&1?0xedb88320:0);}return (v^-1)>>>0;}
function png(width,height,data){
 const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)data.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);},header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const font={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],'.':['00000','00000','00000','00000','00000','00110','00110'],'-':['00000','00000','00000','11111','00000','00000','00000'],':':['00000','00100','00100','00000','00100','00100','00000'],'/':['00001','00001','00010','00100','01000','10000','10000'],'(' :['00010','00100','01000','01000','01000','00100','00010'],')':['01000','00100','00010','00010','00010','00100','01000'],'+':['00000','00100','00100','11111','00100','00100','00000']
};
function canvas(width,height,color=[27,36,42]){const data=Buffer.alloc(width*height*4);for(let i=0;i<width*height;i++){data[i*4]=color[0];data[i*4+1]=color[1];data[i*4+2]=color[2];data[i*4+3]=255;}return {width,height,data};}
function rect(image,x,y,w,h,color){for(let j=Math.max(0,y);j<Math.min(image.height,y+h);j++)for(let i=Math.max(0,x);i<Math.min(image.width,x+w);i++){const at=(j*image.width+i)*4;image.data[at]=color[0];image.data[at+1]=color[1];image.data[at+2]=color[2];image.data[at+3]=255;}}
function text(image,message,x,y,color=[208,222,224],scale=1){for(const char of message.toUpperCase()){const rows=font[char];if(rows)for(let j=0;j<7;j++)for(let i=0;i<5;i++)if(rows[j][i]==='1')rect(image,x+i*scale,y+j*scale,scale,scale,color);x+=6*scale;}}
function blit(target,image,x,y){for(let j=0;j<image.height;j++)image.data.copy(target.data,((y+j)*target.width+x)*4,j*image.width*4,(j+1)*image.width*4);}
function bounds(part){const box=new T.Box3();for(const m of part.meshes)for(let i=0;i<m.positions.length;i+=3)box.expandByPoint(new T.Vector3().fromArray(m.positions,i));return box;}
function prepare(part){
 const meshes=part.meshes.map(m=>{if(m.normals)return m;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.positions,3));g.setIndex(m.indices);g.computeVertexNormals();const result={...m,normals:[...g.attributes.normal.array]};g.dispose();return result;});
 return {...part,meshes};
}
const edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
function render(part,view,frame,style,size=cell){
 const resolution=size*ss,eye=unit(view),worldUp=Math.abs(eye[1])>.95?[0,0,-1]:[0,1,0],right=unit(cross(worldUp,eye)),up=cross(eye,right),scale=resolution*.87/(frame.radius*2),center=frame.center;
 const image=canvas(resolution,resolution,[37,47,52]),depth=new Float32Array(resolution*resolution).fill(-Infinity),normals=new Float32Array(resolution*resolution*3);
 const project=p=>{const q=p.map((x,i)=>x-center[i]);return [resolution*.5+dot(q,right)*scale,resolution*.5-dot(q,up)*scale,dot(q,eye)];};
 const diffuse=style==='textured'?part.textureMap?.()?.image:null,mask=part.alphaMap?.()?.image;
 const tint=new T.Color(part.reviewColor||(part.category==='Leaves'?'#ffffff':'#766044')).getHex(),channels=[tint>>16&255,tint>>8&255,tint&255];
 for(const mesh of part.meshes)for(let i=0;i<mesh.indices.length;i+=3){
  const ids=mesh.indices.slice(i,i+3),positions=ids.map(j=>mesh.positions.slice(j*3,j*3+3)),xy=positions.map(project),area=edge(xy[0],xy[1],xy[2][0],xy[2][1]);if(Math.abs(area)<1e-8)continue;
  const ns=ids.map(j=>mesh.normals.slice(j*3,j*3+3)),uvs=ids.map(j=>mesh.uv.slice(j*2,j*2+2)),minX=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[0])))),maxX=Math.min(resolution-1,Math.ceil(Math.max(...xy.map(p=>p[0])))),minY=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[1])))),maxY=Math.min(resolution-1,Math.ceil(Math.max(...xy.map(p=>p[1]))));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const a=edge(xy[1],xy[2],x+.5,y+.5)/area,b=edge(xy[2],xy[0],x+.5,y+.5)/area,c=1-a-b;if(a<0||b<0||c<0)continue;
   const at=y*resolution+x,z=a*xy[0][2]+b*xy[1][2]+c*xy[2][2];if(z<=depth[at])continue;
   const u=a*uvs[0][0]+b*uvs[1][0]+c*uvs[2][0],v=a*uvs[0][1]+b*uvs[1][1]+c*uvs[2][1];
   if(mask){const tx=Math.floor((u-Math.floor(u))*mask.width),ty=Math.floor((v-Math.floor(v))*mask.height);if(mask.data[(ty*mask.width+tx)*4]<115)continue;}
   let normal=unit([0,1,2].map(j=>a*ns[0][j]+b*ns[1][j]+c*ns[2][j]));if(dot(normal,eye)<0)normal=normal.map(x=>-x);
   const shade=.31+.55*Math.max(0,dot(normal,keyLight))+.18*Math.max(0,dot(normal,fillLight));let color=[185,195,192];
   if(diffuse){const tx=Math.floor((u-Math.floor(u))*diffuse.width),ty=Math.floor((v-Math.floor(v))*diffuse.height),source=(ty*diffuse.width+tx)*4;color=[diffuse.data[source],diffuse.data[source+1],diffuse.data[source+2]].map((v,i)=>v*channels[i]/255);}
   const pixel=at*4;for(let k=0;k<3;k++){image.data[pixel+k]=Math.min(255,Math.round(color[k]*shade));normals[at*3+k]=normal[k];}depth[at]=z;
  }
 }
 // Light local depth occlusion makes real recesses and folded interiors readable.
 const original=Buffer.from(image.data),tolerance=frame.radius*.018;
 for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const at=y*resolution+x;if(!Number.isFinite(depth[at]))continue;let blocked=0,samples=0;const ni=at*3,dr=normals[ni]*right[0]+normals[ni+1]*right[1]+normals[ni+2]*right[2],du=normals[ni]*up[0]+normals[ni+1]*up[1]+normals[ni+2]*up[2],de=Math.max(.2,normals[ni]*eye[0]+normals[ni+1]*eye[1]+normals[ni+2]*eye[2]);
  for(const radius of [4,16])for(let k=0;k<4;k++){
   const nx=x+Math.round(Math.cos(k*Math.PI/2)*radius),ny=y+Math.round(Math.sin(k*Math.PI/2)*radius);if(nx<0||ny<0||nx>=resolution||ny>=resolution)continue;
   const other=depth[ny*resolution+nx];if(Number.isFinite(other)){samples++;const slope=(-(nx-x)/scale*dr+(ny-y)/scale*du)/de;if(other-depth[at]>tolerance+Math.abs(slope)*.5)blocked++;}
  }
  const factor=1-.22*blocked/Math.max(1,samples);for(let k=0;k<3;k++)image.data[at*4+k]=Math.round(original[at*4+k]*factor);
 }
 const small=canvas(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=(y*size+x)*4;for(let k=0;k<3;k++){let sum=0;for(let sy=0;sy<ss;sy++)for(let sx=0;sx<ss;sx++)sum+=image.data[((y*ss+sy)*resolution+x*ss+sx)*4+k];small.data[at+k]=Math.round(sum/(ss*ss));}}
 const origin=project([0,0,0]).map(v=>v/ss);rect(small,Math.round(origin[0])-3,Math.round(origin[1]),7,1,[148,165,172]);rect(small,Math.round(origin[0]),Math.round(origin[1])-3,1,7,[148,165,172]);
 return small;
}
const overviewColumns=collection==='bases'?3:5;
const reports=[],started=performance.now(),overview=canvas(cell*overviewColumns,Math.ceil(parts.length/overviewColumns)*(cell+44)+26);
text(overview,{leaves:'CURRENT LEAF GEOMETRY',branches:'CURRENT BRANCH GEOMETRY',bases:'TEMP BASE GEOMETRY'}[collection],12,9,[226,232,230]);
for(const [assetIndex,asset] of parts.entries()){
 const part=prepare(asset),box=bounds(part),dimensions=box.getSize(new T.Vector3()),frame={center:box.getCenter(new T.Vector3()).toArray(),radius:dimensions.length()/2};
 const dims=dimensions.toArray().map(n=>n.toFixed(2)).join(' X '),triangles=part.meshes.reduce((n,m)=>n+m.indices.length/3,0);
 reports.push({id:part.id,name:part.name,inspection:'current',currentDimensions:dimensions.toArray(),currentTriangles:triangles,...(part.assembly?{joints:part.skeleton.length,reviewRole:part.reviewRole}: {})});
 const folder=path.join(output,part.id);fs.mkdirSync(folder,{recursive:true});
 for(const style of modes){
  const sheet=canvas(cell*views.length,cell+64);text(sheet,part.name+' / '+style,12,9,[237,230,198],2);
  text(sheet,'CURRENT '+part.name+' | '+dims+' | '+triangles+' TRI',12,31);
  for(const [column,[name,eye]] of views.entries()){
   const image=render(part,eye,frame,style);blit(sheet,image,column*cell,50);text(sheet,name,column*cell+8,58,[154,178,187]);
   fs.writeFileSync(path.join(folder,style+'-current-'+name.toLowerCase().replaceAll(' ','-')+'.png'),png(cell,cell,image.data));
  }
  fs.writeFileSync(path.join(output,part.id+'-'+style+'.png'),png(sheet.width,sheet.height,sheet.data));
 }
 const x=(assetIndex%overviewColumns)*cell,y=26+Math.floor(assetIndex/overviewColumns)*(cell+44);text(overview,part.name,x+7,y+4,[232,205,148]);
 blit(overview,render(part,views[0][1],frame,'clay'),x,y+18);text(overview,dims,x+5,y+cell+24,[154,178,187]);
 console.log(part.id+' current '+dims);
}
fs.writeFileSync(path.join(output,'overview.png'),png(overview.width,overview.height,overview.data));
fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(reports,null,2));
const heading={leaves:'Current leaf geometry',branches:'Current branch geometry',bases:'Temp base geometry'}[collection];
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>'+heading+'</title><style>body{background:#1b242a;color:#d8e5e6;font:16px system-ui;margin:24px}img{max-width:100%;display:block;margin:12px 0 30px}h2{margin-top:36px}a{color:#cfe9da}</style><h1>'+heading+'</h1><p>Each view shares the same object scale.</p><img src="overview.png">'+reports.map(r=>'<h2>'+r.name+'</h2>'+modes.map(m=>'<a href="'+r.id+'-'+m+'.png">'+m+'</a><img src="'+r.id+'-'+m+'.png">').join('')).join(''));
console.log('Review artifacts: '+output+' ('+((performance.now()-started)/1000).toFixed(1)+'s)');
