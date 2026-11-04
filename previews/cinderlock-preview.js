import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildPart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';

const response=await fetch('../examples/projects/cinderlock.building.json');if(!response.ok)throw Error('Saved map unavailable.');const project=await response.json();
const scene=new T.Scene();scene.background=new T.Color('#354a4c');scene.fog=new T.Fog('#354a4c',150,350);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(45,innerWidth/innerHeight,.15,600),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=2;controls.maxDistance=260;controls.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight('#d5e9e6','#697260',2.2));const sun=new T.DirectionalLight('#ffe0af',2.8);sun.position.set(-60,100,70);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:80,bottom:-80,near:1,far:250});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;scene.add(sun);
const roots=[],openingCuts=prepareInteriorCuts(project.parts),grey=new Map();
for(const p of project.parts){const root=buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:false});root.userData.part=p;root.traverse(m=>{if(!m.isMesh)return;m.userData.originalMaterial=m.material;if(/light strip|illuminated display|status light/.test(p.name))for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.emissive=new T.Color(p.color);mat.emissiveIntensity=.35;}});roots.push(root);scene.add(root);}
let blockout=false,cutaway=true,current='tactical';
const views={
 tactical:{eye:[0,124,28],target:[0,0,0],caption:'Three lanes, one connected fight. A: cooling court. B: central foundry. C: freight yard. Cooling is 4.8 m high, the foundry street 2.4 m, and freight at ground level. Separate ramps and stairs connect them; no walkways cross overhead. Each workshop has three exits.'},
 district:{eye:[100,88,115],target:[0,4,0],caption:'Cinderlock Foundry. A terraced industrial combat block: solid buildings, usable rooms, protected approaches and a restrained skyline. Cutaway reveals the actual playable space.'},
 foundry:{eye:[-18,18,21],target:[0,4.2,0],caption:'B · The fastest crossing is also contested. Eight entrances offer several attack angles. The furnace breaks the center sightline; both low control booths have front and rear stair approaches.'},
 cooling:{eye:[28,17,-35],target:[-2,6,-23],caption:'A · Cooling lane alternates indoor pump rooms and a covered approach into the open turbine court. Tall machines block long shots. The four-door houses let players retreat or change angle.'},
 freight:{eye:[-30,13,35],target:[0,1.5,24],caption:'C · Freight is a sunken close-range route. Container rows split the approach, with low cover at the foundry exit and side alleys into both warehouses. The gantry is overhead scenery.'},
 spawn:{eye:[-44,13,18],target:[-35,4,0],caption:'West workshop · three ways out. The front exit has a solid dogleg baffle; north and south doors lead to different lanes. The eastern workshop uses the same protective layout.'}
};
const labels=[['A · COOLING',[0,6.6,-18.5]],['B · FOUNDRY',[0,4.2,7.8]],['C · FREIGHT',[0,1.8,28]],['WEST',[-42,4.4,0]],['EAST',[42,4.4,0]]].map(([text,point])=>{const el=document.createElement('div');el.className='marker'+(/WEST|EAST/.test(text)?' spawn':'');el.textContent=text;document.body.append(el);return {el,point:new T.Vector3(...point)};});
function draw(){renderer.render(scene,camera);for(const {el,point} of labels){const v=point.clone().project(camera);el.hidden=current!=='tactical'||Math.abs(v.x)>1||Math.abs(v.y)>1||v.z>1;el.style.left=(v.x+1)*innerWidth/2+'px';el.style.top=(1-v.y)*innerHeight/2+'px';}}
function visibility(){
 for(const root of roots){const p=root.userData.part,decor=p.assemblyName?.startsWith('D · ');root.visible=!(blockout&&decor||cutaway&&/roof/i.test(p.name));root.traverse(m=>{if(!m.isMesh)return;m.visible=!(cutaway&&m.userData.interiorCeiling);if(blockout){const tone=p.type==='interior'?'#b9c8c3':/CONTROL|home console/.test(p.name)?p.color:p.route?'#a5bdc4':p.name.endsWith('solid ground')?'#56656b':'#718a91';if(!grey.has(tone))grey.set(tone,new T.MeshStandardMaterial({color:tone,roughness:.85}));m.material=grey.get(tone);}else m.material=m.userData.originalMaterial;});
 }
 for(const [id,value] of [['blockout',blockout],['cutaway',cutaway]]){const b=document.getElementById(id);b.setAttribute('aria-pressed',String(value));b.classList.toggle('active',value);}
 document.getElementById('cutaway').textContent='Cutaway '+(cutaway?'on':'off');draw();
}
function frame(key){current=key;const v=views[key];camera.position.fromArray(v.eye);controls.target.fromArray(v.target);controls.update();document.querySelector('#caption').textContent=v.caption;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===key);b.setAttribute('aria-pressed',String(b.dataset.view===key));}draw();}
document.querySelector('#blockout').onclick=()=>{blockout=!blockout;visibility();};document.querySelector('#cutaway').onclick=()=>{cutaway=!cutaway;visibility();};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
const stats=geometryStats(scene);document.querySelector('#hint').textContent=`${project.parts.length} editable parts · ${Math.round(stats.triangles).toLocaleString()} triangles · Blockout hides cosmetic detail · Drag to orbit`;
visibility();const requested=new URLSearchParams(location.search).get('view');frame(views[requested]?requested:'tactical');
