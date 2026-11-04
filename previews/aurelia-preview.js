import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {buildPart} from '../src/core/geometry.js';
import {aureliaGate} from '../examples/generators/aurelia-demo.js';
const project=aureliaGate(),scene=new T.Scene();
scene.background=new T.Color('#172d40');scene.fog=new T.Fog('#172d40',250,650);
const camera=new T.PerspectiveCamera(45,innerWidth/innerHeight,.5,1200);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight('#a5d9ef','#343a45',2.2));
const sun=new T.DirectionalLight('#ffd4a2',3);sun.position.set(-90,140,90);scene.add(sun);
const rim=new T.DirectionalLight('#6fc5e6',2);rim.position.set(80,90,-120);scene.add(rim);
let triangles=0;
for(const part of project.parts){const group=buildPart(part,{parts:project.parts,batch:true,collision:false});group.traverse(m=>{if(!m.isMesh)return;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;if(/Luminous core|Reactor lens|guide light|beacon|arrival sign|lighting strip/.test(part.name)){m.material=m.material.clone();m.material.emissive=new T.Color(part.color);m.material.emissiveIntensity=.9;}});scene.add(group);}
const water=new T.Mesh(new T.PlaneGeometry(1200,1200),new T.MeshStandardMaterial({color:'#132b37',metalness:.6,roughness:.3}));water.rotation.x=-Math.PI/2;water.position.y=-26;scene.add(water);
const controls=new OrbitControls(camera,renderer.domElement);controls.maxDistance=700;controls.minDistance=5;controls.maxPolarAngle=Math.PI*.49;
const views={
 overview:{eye:[215,168,245],target:[0,32,-20],caption:'Aurelia Gate — a reactor harbor at dusk. The ring plaza anchors two crowned residential towers, a terraced transit hall, landing piers, and an elevated skyway with a sweeping exit.'},
 plaza:{eye:[58,47,78],target:[0,15,0],caption:'The annular public concourse surrounds a luminous energy core. Short bridges lead to the arrival court, both tower terraces, and the station.'},
 station:{eye:[46,40,-48],target:[0,21,-85],caption:'A compact transit approach: one short stair flight, an upper court, and an enclosed ticket hall. Amber entry lights contrast with the cyan arrival sign.'},
 harbor:{eye:[-124,58,89],target:[-53,20,10],caption:'The west harbor steps up from the tower terrace to a rounded landing apron. Solid piers descend into the dark basin below.'},
 skyway:{eye:[156,86,121],target:[66,27,48],caption:'The elevated expressway curves around the district. A narrower harbor exit peels off toward the west, with separate deck, barrier, underside, and support finishes.'}
};
let current='overview';
function draw(){renderer.render(scene,camera);}
function frame(name){current=name;const v=views[name];camera.position.fromArray(v.eye);controls.target.fromArray(v.target);document.querySelector('#caption').textContent=v.caption;document.querySelector('#hint').textContent='Drag to orbit · scroll to zoom · '+project.parts.length+' editable parts · '+Math.round(triangles).toLocaleString()+' triangles';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));controls.update();draw();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});const requested=new URLSearchParams(location.search).get('view');frame(views[requested]?requested:'overview');
