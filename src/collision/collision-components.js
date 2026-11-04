// Stable physical/render ownership. Material finishes may carry the original
// interior role, but tint, transparency, UVs and textures never choose collision.
import {PARTS} from '../core/model.js';
export function objectComponent(part,mesh){
 const role=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material)?.userData.interiorRole;
 if(part.interiorProp||mesh.userData.railing||mesh.userData.highwayRailing||mesh.userData.routePost)return 'details';
 if(mesh.userData.floraBillboard)return 'exterior';
 if(mesh.userData.hallway||part.route?.segments[mesh.userData.routeSegment]?.hallway)return 'interior';
 if(['outside','roof'].includes(role))return 'exterior';
 if(role||mesh.userData.connectedInteriorId||mesh.userData.interiorFloor||mesh.userData.interiorCeiling)return 'interior';
 if(mesh.userData.floraComponent&&mesh.userData.floraComponent!=='bark')return 'details';
 const category=PARTS.find(p=>p.id===part.type)?.category;
 return category==='Details'?'details':'exterior';
}
