import * as T from '../../vendor/three.module.js';

// A young fern frond: one continuous tapered rachis, with folded paired pinnae
// tucked into the inside of its spiral. Fine hairs are suggested by the finish,
// rather than hundreds of tiny polygons.
export function curledFernMesh(curl=1,budding=0){
curl=T.MathUtils.clamp(curl,0,1);budding=T.MathUtils.clamp(budding,0,1);
const points=[],radii=[],sides=6,stem=new T.CubicBezierCurve3(new T.Vector3(),new T.Vector3(0,.3,0),new T.Vector3(.17,.5,0),new T.Vector3(.16,.78,0));
for(let i=0;i<=8;i++){points.push(stem.getPoint(i/8));radii.push(T.MathUtils.lerp(.027,.048,i/8));}
// A fiddlehead has one broad outer crozier around a packed head of folded
// pinnae. Its fleshy rachis and overlapping folds fill the head, rather than
// adding extra thin turns to a hollow wire spiral.
for(let i=1;i<=42;i++){const t=i/42,angle=t*Math.PI*2*1.45,radius=.012+.228*Math.pow(1-t,.6);points.push(new T.Vector3(-.08+Math.cos(angle)*radius,.78+Math.sin(angle)*radius,0));radii.push(T.MathUtils.lerp(.048,.009,t));}
// Unroll the turning angles, preserving every segment's length and the base.
// Linear blending of curled/straight vertices would collapse the coil midway.
let heading=Math.PI/2;
for(let i=9,previous=points[8].clone();i<points.length;i++){
 const original=points[i].clone(),delta=original.clone().sub(previous),angle=Math.atan2(delta.y,delta.x);
 heading+=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));
 const unrolled=Math.PI/2+curl*(heading-Math.PI/2);
 points[i]=points[i-1].clone().add(new T.Vector3(Math.cos(unrolled),Math.sin(unrolled),0).multiplyScalar(delta.length()));previous=original;
}
const mesh={positions:[],uv:[],indices:[]},frames=[];let distance=0;
for(let i=0;i<points.length;i++){
 const tangent=points[Math.min(points.length-1,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize(),inside=new T.Vector3(-tangent.y,tangent.x,0);
 frames.push({tangent,inside});if(i)distance+=points[i].distanceTo(points[i-1]);
 for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,p=points[i].clone().addScaledVector(inside,Math.cos(a)*radii[i]);p.z=Math.sin(a)*radii[i];mesh.positions.push(...p.toArray());mesh.uv.push(j/sides*.64,distance*2);}
 if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=i*sides+j,c=i*sides+(j+1)%sides,d=(i-1)*sides+(j+1)%sides;mesh.indices.push(a,c,b,a,d,c);}
}
for(const end of [0,points.length-1]){const center=mesh.positions.length/3;mesh.positions.push(...points[end].toArray());mesh.uv.push(.32,end?distance*2:0);for(let j=0;j<sides;j++){const a=end*sides+j,b=end*sides+(j+1)%sides;mesh.indices.push(...(end?[center,a,b]:[center,b,a]));}}

function foldedLeaf(i,side){
 const {tangent,inside}=frames[i],t=i/(points.length-1),growth=budding*(1-t*.65),length=T.MathUtils.lerp(.055,.125,T.MathUtils.smoothstep(i,6,12))*(1-.82*t*t)*(1+growth*3.5),width=length*T.MathUtils.lerp(.46,.2,growth),thickness=length*T.MathUtils.lerp(.2,.025,growth);
 const direction=inside.clone().multiplyScalar(T.MathUtils.lerp(1,.25,growth)).addScaledVector(tangent,.25).add(new T.Vector3(0,0,side*T.MathUtils.lerp(.15,1.6,growth))).normalize(),across=new T.Vector3().crossVectors(direction,new T.Vector3(0,0,1)).normalize(),normal=new T.Vector3().crossVectors(across,direction).normalize();
 const base=points[i].clone().addScaledVector(inside,radii[i]*.65).add(new T.Vector3(0,0,side*radii[i]*.35)),arch=length*(1-growth),centers=[base,base.clone().addScaledVector(direction,length*.5).addScaledVector(normal,side*arch*.22),base.clone().addScaledVector(direction,length).addScaledVector(tangent,arch*.2)],vertices=[],offset=mesh.positions.length/3;
 // Three small triangular sections describe a plump arched fold with a blunt,
 // turned lip. The same fourteen triangles unfurl into a tapered leaf blade.
 const corners=[[-.866,-.5],[.866,-.5],[0,1]],sizes=[.28,1,T.MathUtils.lerp(.38,.025,growth)];
 for(let section=0;section<3;section++)for(const [x,z] of corners){
  const point=centers[section].clone().addScaledVector(across,x*width*sizes[section]).addScaledVector(normal,z*thickness*sizes[section]);vertices.push(point);mesh.positions.push(...point.toArray());
  mesh.uv.push(T.MathUtils.lerp([.55,.67,.84][section],[.38,.3,.22][section],budding),(z+1)/2);
 }
 const faces=[[0,2,1],[6,7,8]];
 for(let section=0;section<2;section++)for(let j=0;j<3;j++){const a=section*3+j,b=section*3+(j+1)%3;faces.push([a,b,b+3],[a,b+3,a+3]);}
 const middle=centers[1];
 for(const ids of faces){const [a,b,c]=ids.map(k=>vertices[k]),n=b.clone().sub(a).cross(c.clone().sub(a)),out=a.clone().add(b).add(c).multiplyScalar(1/3).sub(middle);if(n.dot(out)<0)[ids[1],ids[2]]=[ids[2],ids[1]];mesh.indices.push(...ids.map(k=>k+offset));}
}
for(let i=4;i<points.length-2;i+=2)for(const side of [-1,1])foldedLeaf(i,side);
// The innermost developing bud closes the heart of the fiddlehead. It follows
// the moving tip and becomes a small apical bud as the frond unfurls.
const tip=points.at(-1),frame=frames.at(-1),budRadius=.008+.032*curl*curl*(1-budding*.5),budVertices=[],budOffset=mesh.positions.length/3;
for(let j=0;j<6;j++){const angle=j/6*Math.PI*2;budVertices.push(tip.clone().addScaledVector(frame.inside,Math.cos(angle)*budRadius).add(new T.Vector3(0,0,Math.sin(angle)*budRadius*.7)));}
for(const end of [-1,1])budVertices.push(tip.clone().addScaledVector(frame.tangent,end*budRadius*.8));
for(const [i,point] of budVertices.entries()){mesh.positions.push(...point.toArray());mesh.uv.push(.55,i<6?i/6:.5);}
for(let j=0;j<6;j++)for(const pole of [6,7]){const ids=[pole,j,(j+1)%6],[a,b,c]=ids.map(i=>budVertices[i]),n=b.clone().sub(a).cross(c.clone().sub(a)),out=a.clone().add(b).add(c).multiplyScalar(1/3).sub(tip);if(n.dot(out)<0)[ids[1],ids[2]]=[ids[2],ids[1]];mesh.indices.push(...ids.map(i=>i+budOffset));}
return mesh;
}
const mesh=curledFernMesh();

let texture;
export function curledFernTexture(){
 if(texture)return texture;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const noise=((Math.imul(x+7,73856093)^Math.imul(y+11,19349663))>>>0)%97/96,scale=T.MathUtils.smoothstep(x/size,.64,.8),rib=Math.sin(x*.8+y*.12)*.06,shade=.83+noise*.23+rib,base=[119,177,78].map((v,i)=>T.MathUtils.lerp(v,[242,163,86][i],scale)),at=(y*size+x)*4;
  for(let c=0;c<3;c++)data[at+c]=Math.round(T.MathUtils.clamp(base[c]*shade,0,255));data[at+3]=255;
 }
 texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.flipY=false;texture.needsUpdate=true;return texture;
}

export const CURLED_FERN={id:'curled-fern-fiddlehead',name:'Curled Fern Fiddlehead',sourceName:'Young coiled fern frond with folded leaflets',category:'Leaves',paletteCategory:'Flora',editorAxis:'z-to-y',surfaceHost:true,shapeControls:[{id:'curl',name:'Curl',default:1,start:[-.32,.35,0],end:[-.32,.88,0],hint:'0 · Uncurled — 1 · Tightly curled'},{id:'budding',name:'Leaf budding',default:0,start:[.35,.25,0],end:[.35,.8,0],hint:'0 · Folded buds — 1 · Open leaves'}],shapeMesh:morphs=>curledFernMesh(morphs.curl??1,morphs.budding??0),texture:true,textureMap:curledFernTexture,alphaMap:()=>null,iconUrl:new URL('../../assets/flora-curled-fern.svg',import.meta.url).href,triangles:mesh.indices.length/3,meshes:[mesh]};
