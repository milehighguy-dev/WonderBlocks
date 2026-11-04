import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildPart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {mosSourceGroup} from '../src/parts/mos-eisley.js';
import {MOS_CANDIDATES,mosEisleyReview} from '../examples/generators/mos-eisley-demo.js';

const viewport=document.querySelector('#viewport'),project=mosEisleyReview(),scene=new T.Scene();scene.background=new T.Color('#c4b99b');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;viewport.prepend(renderer.domElement);
scene.add(new T.HemisphereLight('#fff4da','#93836a',2));const sun=new T.DirectionalLight('#ffe8bc',2.6);sun.position.set(-25,65,30);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-65,right:65,top:50,bottom:-50,near:1,far:160});sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;scene.add(sun);
const groups=new Map();
for(const c of MOS_CANDIDATES){const g=new T.Group();groups.set(c.id,g);scene.add(g);}
for(const p of project.parts){const g=buildPart(p,{parts:project.parts,batch:true,collision:false});g.traverse(m=>{if(m.userData.interiorCeiling)m.visible=false;});groups.get(p.assemblyId.slice(-2)).add(g);}
const camera=new T.PerspectiveCamera(43,1,.1,350),controls=new OrbitControls(camera,renderer.domElement);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=180;
const stats=geometryStats(scene),referenceRoot=new T.Group();scene.add(referenceRoot);let current=null,reference=false;
const referenceData=await fetch('../assets/mos-eisley/reference-buildings.json').then(r=>{if(!r.ok)throw Error('Stock references unavailable');return r.json();});
const references=new Map();for(const [key,source] of Object.entries(referenceData)){const g=mosSourceGroup(source);g.visible=false;referenceRoot.add(g);references.set(key,g);}
function render(){renderer.render(scene,camera);}
function frame(root,overview=false){
 root.updateWorldMatrix(true,true);const box=new T.Box3();root.traverse(m=>{if(m.isMesh&&m.visible&&m.parent.name!=='Sample ground'){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});
 const target=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
 const vertical=T.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect),distance=size.length()*.5/Math.sin(Math.min(vertical,horizontal)/2)*1.12;
 const direction=overview?new T.Vector3(.9,.95,1.4):current?.id==='04'&&!reference?new T.Vector3(.8,1.5,1.4):new T.Vector3(1,.65,1.5);
 camera.position.copy(target).addScaledVector(direction.normalize(),distance);controls.target.copy(target);controls.update();render();
}
function select(id,stock=false){
 current=MOS_CANDIDATES.find(c=>c.id===id)||null;reference=!!(current?.reference&&stock);
 for(const [key,g] of groups)g.visible=!current||(!reference&&key===current.id);
 for(const [key,g] of references)g.visible=reference&&key===current.reference;
 for(const b of document.querySelectorAll('.sample')){b.classList.toggle('active',b.dataset.id===id);b.setAttribute('aria-pressed',String(b.dataset.id===id));}
 const stockButton=document.querySelector('#stock');stockButton.hidden=!current?.reference;stockButton.textContent=reference?'Return to editable proposal':'Show stock reference';stockButton.setAttribute('aria-pressed',String(reference));
 document.querySelector('#overview').classList.toggle('active',!current);
 document.querySelector('#description').textContent=current?(reference?'Stock reference · '+referenceData[current.reference].source.split(/[\\/]/).at(-1)+'. Original complete building, shown for comparison.':current.id+' · '+current.title+'. '+current.summary):'Five selected Mos Eisley collections: building blocks, a weathered shop, recessed doorways, editable rooms, and a street arch.';
 document.querySelector('#stats').textContent=current?(reference?referenceData[current.reference].triangles.toLocaleString()+' stock triangles':current.source)+' · Drag to orbit · Scroll to zoom':project.parts.length+' editable parts · '+Math.round(stats.triangles).toLocaleString()+' triangles · Drag to orbit';
 if(!current){const all=new T.Group();for(const g of groups.values())all.add(g.clone());frame(all,true);}else frame(reference?references.get(current.reference):groups.get(current.id));
}
for(const c of MOS_CANDIDATES){const b=document.createElement('button');b.className='sample';b.dataset.id=c.id;b.innerHTML='<strong>'+c.id+'</strong><span>'+c.title+'</span>';b.onclick=()=>select(c.id);document.querySelector('#samples').append(b);}
document.querySelector('#overview').onclick=()=>select(null);document.querySelector('#stock').onclick=()=>select(current.id,!reference);
controls.addEventListener('change',render);
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(current)frame(reference?references.get(current.reference):groups.get(current.id));else select(null);}
addEventListener('resize',resize);resize();const requested=new URLSearchParams(location.search).get('sample')||'01';if(MOS_CANDIDATES.some(c=>c.id===requested))select(requested);
