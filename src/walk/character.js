import * as THREE from '../../vendor/three.module.js';
let data=null,texture=null;
export const characterInfo={name:'Scale reference',height:1.8,triangles:0,loaded:false};
export function setCharacterData(value){
 if(!value||!Number.isFinite(value.height)||value.height<=0||!Array.isArray(value.positions)||value.positions.length%9||value.positions.length>3000000||value.positions.some(v=>!Number.isFinite(v))||value.normals?.length!==value.positions.length||value.normals.some(v=>!Number.isFinite(v))||value.uvs?.length!==value.positions.length/3*2||value.uvs.some(v=>!Number.isFinite(v)))throw Error('Invalid reference mesh.');
 data=value;Object.assign(characterInfo,{name:value.name,height:value.height,triangles:value.positions.length/9,loaded:true});
}
export async function loadCharacter(){try{const r=await fetch(new URL('../../assets/character/character.json',import.meta.url));if(!r.ok)return false;setCharacterData(await r.json());texture=await new THREE.TextureLoader().loadAsync(new URL('../../assets/character/character.png',import.meta.url).href);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return true;}catch{return characterInfo.loaded;}}
export function buildCharacter(){
 const group=new THREE.Group();group.userData.referenceOnly=true;
 if(data){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));const material=new THREE.MeshStandardMaterial({map:texture,color:texture?'#ffffff':'#cbd0ce',roughness:.8});const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;group.add(mesh);}
 else{const material=new THREE.MeshStandardMaterial({color:'#b4c7bd'});const body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.45,8),material);body.position.y=.725;group.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.175,8,6),material);head.position.y=1.625;group.add(head);}
 return group;
}
