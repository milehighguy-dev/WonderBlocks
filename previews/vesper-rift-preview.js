import * as T from '../vendor/three.module.js';

import {OrbitControls} from '../vendor/OrbitControls.js';

import {buildPart} from '../src/core/geometry.js';

import {geometryStats} from '../src/core/mesh-budget.js';

import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';

import {VESPER_SITES,VESPER_REFERENCE_VIEW} from '../examples/generators/vesper-rift-demo.js';



const response=await fetch('../examples/projects/vesper-rift.building.json');if(!response.ok)throw Error('Saved city unavailable.');const project=await response.json();

const scene=new T.Scene();scene.background=new T.Color('#6b5145');scene.fog=new T.FogExp2('#817565',.0024);

const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.prepend(renderer.domElement);

const camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.15,1400),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=1;controls.maxDistance=600;controls.maxPolarAngle=Math.PI*.54;

scene.add(new T.HemisphereLight('#c6b69e','#61605a',2.2));

const sun=new T.DirectionalLight('#d3aa83',1.65);sun.position.set(-170,170,100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-140,right:140,top:135,bottom:-135,near:1,far:600});sun.shadow.normalBias=.05;sun.shadow.bias=-.00015;scene.add(sun);

// Atmospheric sky is presentation lighting; architecture comes from the project.

const sky=new T.Mesh(new T.SphereGeometry(1100,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`

 varying vec3 v;

 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}

 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}

 void main(){vec3 d=normalize(v);float h=d.y;vec3 c=mix(vec3(.49,.29,.20),vec3(.16,.13,.13),smoothstep(-.03,.8,h));float cloud=0.;vec3 p=d*vec3(7.,28.,7.);float amp=.55;for(int i=0;i<5;i++){cloud+=noise(p)*amp;p=p*2.07+13.;amp*=.5;}c+=vec3(.32,.23,.17)*(cloud-.5);c=mix(vec3(.42,.43,.40),c,smoothstep(-.22,.10,h));gl_FragColor=vec4(c,1.);}

 `}));sky.material.fog=false;scene.add(sky);

const moon=new T.Mesh(new T.SphereGeometry(68,48,32),new T.ShaderMaterial({fog:false,transparent:true,vertexShader:'varying vec3 p;varying vec3 n;void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`

 varying vec3 p;varying vec3 n;

 float hash(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}

 float noise(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}

 void main(){float terrain=.5*noise(p*.055)+.25*noise(p*.15)+.12*noise(p*.5);float lit=.55+.45*max(0.,dot(normalize(n),normalize(vec3(-1.,.4,.8))));vec3 c=vec3(.55,.34,.23)*(lit*.7+terrain*.55);gl_FragColor=vec4(c,.62);}

 `}));moon.position.set(340,182,-610);scene.add(moon);

const roots=[],cuts=prepareInteriorCuts(project.parts),grey=new Map();

for(const p of project.parts){const root=buildPart(p,{parts:project.parts,openingCuts:cuts,batch:true,collision:false});root.userData.part=p;root.traverse(m=>{if(!m.isMesh)return;m.userData.originalMaterial=m.material;if(/Cyan mineral seam|lightglass|Amber lantern · glass/.test(p.name))for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.emissive=new T.Color(p.color);mat.emissiveIntensity=.6;}});root.traverse(m=>{if(!m.isMesh)return;for(const mat of Array.isArray(m.material)?m.material:[m.material]){if(mat.userData.vesperHaze)continue;mat.userData.vesperHaze=true;mat.onBeforeCompile=shader=>{shader.vertexShader='varying float vRiftHeight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRiftHeight=(modelMatrix*vec4(transformed,1.)).y;');shader.fragmentShader='varying float vRiftHeight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\nfloat riftHaze=clamp((12.-vRiftHeight)/115.,0.,.72);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.42,.43,.40),riftHaze);');};mat.customProgramCacheKey=()=> 'vesper-height-haze-v1';}});roots.push(root);scene.add(root);}

// A few local lamps express the intended lighting without changing scene geometry.

for(const [x,y,z] of [[-55,31,40],[55,31,40],[-55,35,-50],[31,36,-50],[55,41,-140]]){const l=new T.PointLight('#ffbd6e',50,23,1.7);l.position.set(x,y,z);scene.add(l);}

let blockout=false,cutaway=false,current='city';

const views={

 city:{eye:VESPER_REFERENCE_VIEW.eye,target:VESPER_REFERENCE_VIEW.target,caption:'Player viewpoint · standing on the west cliff street at 1.7 m eye height. The hanging hall stands on the right; the far-bank village faces it across the gorge. A causeway lies far below, with a high skywalk above the city. This ledge is part of the playable map.'},

 arrival:{eye:[-44,29.7,37],target:[8,52,190],caption:'Arrival end · the three relocated mineral towers fill the previously empty end of the canyon beyond the Republic starting district. This is the reverse view from the main canyon overlook.'},

 tactical:{eye:[0,245,80],target:[0,27,-55],caption:'Three crossings connect two continuous cliff streets. Sheltered arrival halls feed galleries, the projecting council chamber and the high crossing. Short rested stairs connect the districts.'},

 rotunda:{eye:[-19,34,-12],target:[34,39,-53],caption:'The hanging council hall projects from the east cliff. A broad weathered roof, carved galleries and civic banners mark the district; side approaches connect its terrace to the street.'},

 market:{eye:[-40,34,-14],target:[-60,36,-70],caption:'Cliff galleries · a broad stone street passes inhabited rooms carved into the canyon bank. Recessed window bands and lantern lines extend along the rock face.'},

 cascade:{eye:[-19,17,12],target:[-5,37,-185],caption:'Beneath the streets · masonry arches and lower cliff dwellings disappear into the gorge. Waterfalls fall past the inhabited faces into deep mist.'},

 street:{eye:[-46,29.7,65],target:[-48,33,-39],caption:'Street level · low parapets and carved doorways frame a continuous cliff avenue. Rested stairs lead upward; the crossing to the opposite bank opens on the right.'}

};

const labels=VESPER_SITES.map(site=>{const el=document.createElement('div');el.className='marker'+(site.team?' spawn':'');el.textContent=site.label;document.body.append(el);return {el,point:new T.Vector3(...site.position).add(new T.Vector3(0,2,0))};});

function draw(){renderer.render(scene,camera);for(const {el,point} of labels){const v=point.clone().project(camera);el.hidden=current!=='tactical'||Math.abs(v.x)>1||Math.abs(v.y)>1||v.z>1;el.style.left=(v.x+1)*innerWidth/2+'px';el.style.top=(1-v.y)*innerHeight/2+'px';}}

function visibility(){

 for(const root of roots){const p=root.userData.part;root.visible=!(blockout&&p.assemblyName?.startsWith('D · ')||cutaway&&/roof|canopy/.test(p.name));root.traverse(m=>{if(!m.isMesh)return;m.visible=!(cutaway&&m.userData.interiorCeiling);if(blockout){const tone=p.type==='interior'?'#d6c6a5':p.route?'#b6c9bd':'#727e77';if(!grey.has(tone))grey.set(tone,new T.MeshStandardMaterial({color:tone,roughness:.9}));m.material=grey.get(tone);}else m.material=m.userData.originalMaterial;});}

 for(const [id,value] of [['blockout',blockout],['cutaway',cutaway]]){const b=document.getElementById(id);b.setAttribute('aria-pressed',String(value));b.classList.toggle('active',value);}

 document.getElementById('cutaway').textContent='Cutaway '+(cutaway?'on':'off');draw();

}

function frame(key){current=key;const v=views[key];camera.position.fromArray(v.eye);controls.target.fromArray(v.target);controls.update();document.querySelector('#caption').textContent=v.caption;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===key);b.setAttribute('aria-pressed',String(b.dataset.view===key));}draw();}

document.querySelector('#blockout').onclick=()=>{blockout=!blockout;visibility();};document.querySelector('#cutaway').onclick=()=>{cutaway=!cutaway;visibility();};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));controls.addEventListener('change',draw);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});

const stats=geometryStats(scene);document.querySelector('#hint').textContent=`${project.parts.length} editable parts · ${Math.round(stats.triangles).toLocaleString()} triangles · Native Wonderblocks scene · Drag to orbit`;

visibility();const requested=new URLSearchParams(location.search).get('view');frame(views[requested]?requested:'city');
