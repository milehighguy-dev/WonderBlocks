import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildPart} from '../src/core/geometry.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {geometryStats} from '../src/core/mesh-budget.js';

const project=await fetch('../examples/projects/asterfall.building.json').then(r=>{if(!r.ok)throw Error('Saved project unavailable.');return r.json();});
const scene=new T.Scene();scene.background=new T.Color('#264754');scene.fog=new T.Fog('#264754',210,460);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.2,900);
scene.add(new T.HemisphereLight('#c1e8ee','#60736b',2.1));
const sun=new T.DirectionalLight('#ffda9b',3.2);sun.position.set(-100,180,110);sun.target.position.y=30;scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-120,right:120,top:140,bottom:-120,near:1,far:400});sun.shadow.bias=-.0003;sun.shadow.normalBias=.08;scene.add(sun);
const rim=new T.DirectionalLight('#8ae2e5',1.8);rim.position.set(70,95,-100);rim.target.position.y=30;scene.add(rim.target);scene.add(rim);
const openingCuts=prepareInteriorCuts(project.parts);
for(const p of project.parts){const g=buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:false});g.traverse(m=>{if(!m.isMesh)return;if(/Amber lantern glass|Tidal heart|Waterfall ribbon/.test(p.name)){for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.emissive=new T.Color(p.color);mat.emissiveIntensity=/Tidal heart/.test(p.name)?.45:.18;}}});scene.add(g);}
const stats=geometryStats(scene),controls=new OrbitControls(camera,renderer.domElement);controls.maxDistance=340;controls.minDistance=3;controls.maxPolarAngle=Math.PI*.49;controls.enableDamping=false;
const views={
 skyline:{eye:[159,111,186],target:[0,24,-5],caption:'Asterfall · City of the Tide Engine. Bronze machinery hangs above a living island city: lantern quays, hanging gardens, a saffron exchange and the high chart archive.'},
 engine:{eye:[58,42,86],target:[0,44,-8],caption:'The 68-metre tide wheel. Its turquoise heart is held inside nested gyroscopes. The processional path passes underneath; the plaza branches into three districts.'},
 harbor:{eye:[62,39,111],target:[0,14,53],caption:'Lantern Harbor. Three boarding piers and two skiffs lead into a broad arrival terrace. A bridge with two short stair flights climbs toward the wheel.'},
 gardens:{eye:[-112,53,74],target:[-47,16,-3],caption:'The Hanging Gardens. Summer and gold-leaf aspens surround a domed conservatory. Still pools face the sea; the pilgrims’ walk continues toward the western falls and archive.'},
 market:{eye:[108,57,83],target:[53,25,-1],caption:'The Saffron Exchange. Four walk-through shops, cloth awnings, spice stalls and a copper clocktower. The eastern arcade provides a second route up to the acropolis.'},
 archive:{eye:[80,73,-122],target:[0,30,-57],caption:'The Observatory Acropolis. Enter the chart archive or follow the outer terrace. Both district loops meet here, below the observatory dome and asymmetric signal towers.'}
};
function draw(){renderer.render(scene,camera);}
function frame(key){const v=views[key];camera.position.fromArray(v.eye);camera.position.y+=30;controls.target.fromArray(v.target);controls.target.y+=30;controls.update();document.querySelector('#caption').textContent=v.caption;document.querySelector('#hint').textContent=`Drag to orbit · scroll to explore · ${project.parts.length} editable parts · ${Math.round(stats.triangles).toLocaleString()} triangles`;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===key);b.setAttribute('aria-pressed',String(b.dataset.view===key));});draw();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
const requested=new URLSearchParams(location.search).get('view');frame(views[requested]?requested:'skyline');
