import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {swbfTreesDemo,exportBillboardPlant} from '../examples/generators/swbf-trees-demo.js';
import {buildPart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';

const scene=new T.Scene();scene.background=new T.Color('#8dada2');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.append(renderer.domElement);
const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,500),orbit=new OrbitControls(camera,renderer.domElement);
scene.add(new T.HemisphereLight('#edffdd','#4d5541',2.5));const sun=new T.DirectionalLight('#fff0d3',3);sun.position.set(-25,70,35);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-85,right:85,top:60,bottom:-60,far:200});sun.shadow.mapSize.set(2048,2048);scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(220,200),new T.MeshStandardMaterial({color:'#617361',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.6;floor.receiveShadow=true;scene.add(floor);
const project=swbfTreesDemo(),groups=project.parts.map(p=>{const g=buildPart(p,{batch:true,collision:false});scene.add(g);return g;}),stats=groups.map(geometryStats),cards=[];groups.forEach(g=>g.traverse(m=>{if(m.userData.floraBillboard)cards.push(m);}));
const cardCount=cards.reduce((n,m)=>n+m.geometry.userData.billboard.cards.length,0);
document.querySelector('#stats').textContent=`${cardCount} leaf cards · ${cardCount*2} foliage triangles · ${stats.reduce((n,s)=>n+s.triangles,0).toLocaleString()} total triangles`;
const views={all:[[0,57,186],[0,17,-15]],yavin:[[-26,26,88],[-26,14,4]],dagobah:[[31,24,82],[31,10,0]],endor:[[7,34,50],[7,20,-56]]};
function view(name){camera.position.fromArray(views[name][0]);orbit.target.fromArray(views[name][1]);orbit.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));document.querySelector('#foliage').onclick=e=>{const visible=!cards[0].visible;cards.forEach(m=>m.visible=visible);e.target.textContent=visible?'Hide foliage':'Show foliage';};view('all');
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.swbfPreview={project,camera,renderer,orbit,groups,cardCount,export:()=>project.parts.map((p,i)=>exportBillboardPlant(p,groups[i]))};renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
