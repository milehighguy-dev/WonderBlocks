import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildPart} from '../src/core/geometry.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {levantine} from '../examples/generators/levantine-demo.js';

const project=levantine(),scene=new T.Scene();scene.background=new T.Color('#c8d1bf');scene.fog=new T.Fog('#c8d1bf',50,125);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(57,innerWidth/innerHeight,.06,180);
scene.add(new T.HemisphereLight('#e7efd1','#aaa284',1.5));scene.add(new T.AmbientLight('#ffffff',1.1));
const sun=new T.DirectionalLight('#ffe0a3',3.1);sun.position.set(-14,20,6);sun.target.position.set(0,0,0);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-24,right:24,top:30,bottom:-30,near:1,far:75});sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;scene.add(sun);
const openingCuts=prepareInteriorCuts(project.parts);
for(const p of project.parts)scene.add(buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:false}));
const stats=geometryStats(scene),controls=new OrbitControls(camera,renderer.domElement);controls.maxDistance=75;controls.minDistance=.3;controls.maxPolarAngle=Math.PI*.52;
const views={
 passage:{eye:[.45,1.68,-15.3],target:[-.2,1.95,5.5],caption:'Pergola walkway · Mos Eisley recessed entries and plaster houses.'},
 courtyard:{eye:[-.65,1.85,19.1],target:[.1,1.95,-7],caption:'Courtyard · cloth shades, cistern and street arch.'},
 overview:{eye:[19,15,-22],target:[0,1.5,1],caption:'Eight editable Mos Eisley houses · sixteen vines · timber pergola.'}
};
function draw(){renderer.render(scene,camera);}
function frame(key){const v=views[key];camera.position.fromArray(v.eye);controls.target.fromArray(v.target);controls.update();document.querySelector('#caption').textContent=v.caption;document.querySelector('#hint').textContent=`Drag to look around · ${project.parts.length} editable parts · ${Math.round(stats.triangles).toLocaleString()} triangles`;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===key);b.setAttribute('aria-pressed',String(b.dataset.view===key));}draw();}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>frame(b.dataset.view);
controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
const requested=new URLSearchParams(location.search).get('view');frame(views[requested]?requested:'passage');
