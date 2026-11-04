import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {TEMP_BASE_PARTS} from '../src/flora/temp-bases.js';

const reviewParts=[...MODELED_LEAF_PARTS,...BARK_BRANCH_PARTS,...TEMP_BASE_PARTS];

const scene=new T.Scene();scene.background=new T.Color('#d5d8cf');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.01,100),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.1;controls.maxDistance=30;
scene.add(new T.HemisphereLight('#edf1e5','#6d7063',1.8));
const key=new T.DirectionalLight('#ffe2bd',2.2);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-2,near:.1,far:15});key.shadow.normalBias=.009;scene.add(key);
const fill=new T.DirectionalLight('#d5e7ec',.7);fill.position.set(3,2,-4);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#c1c6b9',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(12,24,'#a4afa3','#b5bfb2');grid.position.y=-.015;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
const selection=document.querySelector('#part'),shape=document.querySelector('#shape'),status=document.querySelector('#status'),clay=document.querySelector('#clay'),wire=document.querySelector('#wire');
for(const [name,parts] of [['Leaves',MODELED_LEAF_PARTS],['Branches',BARK_BRANCH_PARTS],['Bases',TEMP_BASE_PARTS]]){const group=document.createElement('optgroup');group.label=name;for(const part of parts){const option=document.createElement('option');option.value=part.id;option.textContent=part.name;group.append(option);}selection.append(group);}
let current,mesh,morphs={},view='orbit',radius=1,center=new T.Vector3(0,1,0);
const directions={orbit:[2.7,1.5,3.7],front:[0,0,1],side:[1,0,0],back:[0,0,-1],above:[0,1,.001],below:[0,-1,.001]};
function draw(){renderer.render(scene,camera);}
function frame(name){view=name;camera.up.set(0,1,0);const direction=new T.Vector3(...directions[name]).normalize();camera.position.copy(center).addScaledVector(direction,radius/Math.sin(T.MathUtils.degToRad(camera.fov/2))*1.4);controls.target.copy(center);camera.near=Math.max(.005,radius/100);camera.far=Math.max(50,radius*40);camera.updateProjectionMatrix();controls.update();for(const button of document.querySelectorAll('[data-view]')){button.classList.toggle('active',button.dataset.view===name);button.setAttribute('aria-pressed',String(button.dataset.view===name));}draw();}
function rebuild(reframe=false){
 if(mesh){scene.remove(mesh);const materials=new Set();mesh.traverse(child=>{if(child.isMesh){child.geometry.dispose();materials.add(child.material);}});for(const material of materials)material.dispose();}
 const data=current.shapeMesh?[current.shapeMesh(morphs)]:current.meshes;
 const material=new T.MeshStandardMaterial({color:clay.checked?'#a6b0a4':current.reviewColor||(current.category==='Leaves'?'#ffffff':'#766044'),map:clay.checked?null:current.textureMap(),roughness:.9,metalness:0,wireframe:wire.checked,side:T.FrontSide});
 const pieces=data.map(source=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(source.positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(source.uv,2));geometry.setIndex(source.indices);if(source.normals)geometry.setAttribute('normal',new T.Float32BufferAttribute(source.normals,3));else geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();const piece=new T.Mesh(geometry,material);piece.castShadow=true;piece.receiveShadow=true;return piece;});
 mesh=pieces.length===1?pieces[0]:new T.Group();if(!mesh.isMesh)mesh.add(...pieces);mesh.name=current.id;scene.add(mesh);
 const box=new T.Box3().setFromObject(mesh);if(current.assembly){mesh.position.y=-box.min.y;box.translate(new T.Vector3(0,mesh.position.y,0));}
 const triangleCount=data.reduce((count,source)=>count+source.indices.length/3,0);status.textContent=current.name+' · '+Math.round(triangleCount).toLocaleString()+' triangles';
 const nextCenter=box.getCenter(new T.Vector3()),nextRadius=box.getSize(new T.Vector3()).length()/2;
 if(reframe){center=nextCenter;radius=nextRadius;frame(view);}else{
  // Keep growth visible while preserving the chosen orbit angle. Tall twigs
  // otherwise grow behind the toolbar when the length slider is increased.
  camera.position.sub(center).multiplyScalar(nextRadius/radius).add(nextCenter);controls.target.add(nextCenter.clone().sub(center));center=nextCenter;radius=nextRadius;controls.update();draw();
 }
}
function choose(){current=reviewParts.find(part=>part.id===selection.value);morphs={};shape.replaceChildren();const shapeControls=current.shapeControls||[];document.querySelector('#reset').hidden=!shapeControls.length;for(const control of shapeControls){morphs[control.id]=control.default;const label=document.createElement('label');label.className='slider';const caption=document.createElement('span'),text=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');text.textContent=control.name;output.textContent=Math.round(control.default*100)+'%';caption.append(text,output);input.type='range';input.min=0;input.max=1;input.step=.01;input.value=control.default;input.setAttribute('aria-label',control.name);input.title='Adjust '+control.name.toLowerCase();input.oninput=()=>{morphs[control.id]=Number(input.value);output.textContent=Math.round(Number(input.value)*100)+'%';rebuild();};label.append(caption,input);shape.append(label);}if(current.assembly){const hint=document.createElement('p');hint.textContent='Move its joints in the flora editor.';shape.append(hint);}const url=new URL(location.href);url.searchParams.set('part',current.id);history.replaceState(null,'',url);rebuild(true);}
selection.onchange=choose;clay.onchange=wire.onchange=()=>rebuild();document.querySelector('#reset').onclick=choose;for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>frame(button.dataset.view);
controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
const requested=new URLSearchParams(location.search).get('part');selection.value=reviewParts.find(part=>part.id===requested)?.id||MODELED_LEAF_PARTS[0].id;choose();
// Small read-only inspection surface for browser checks, without loading a demo.
window.floraReview={get part(){return current.id;},get triangles(){let count=0;mesh.traverse(child=>{if(child.isMesh)count+=child.geometry.index.count/3;});return count;},get renderer(){return renderer;},get mesh(){return mesh.isMesh?mesh:mesh.children[0];},get object(){return mesh;},get camera(){return camera;}};
