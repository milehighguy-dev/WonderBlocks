import {invalidateStructuralVolume} from '../collision/structural-volumes.js';
import {routeCutVolumes} from '../routes/route-cut-volumes.js';
import {roomCutVolumes} from './room-cut-volumes.js';
import {connectedOpeningCuts} from './connected-interior.js';
import * as T from '../../vendor/three.module.js';
import {partMatrix,entranceFrame,subtractEntranceVolume,subtractConvexVolume} from './entrances.js';
import {levelsOf} from './interior-storeys.js';
// Reuse expensive exterior-door matching within one build, never across edits.
export function prepareInteriorCuts(parts){const cache=new Map(parts.filter(p=>p.interior||p.entranceInteriors?.length).map(p=>[p.id,connectedOpeningCuts(p,parts)]));cache.routeVolumes=new Map(parts.filter(p=>p.type==='stair-route').map(p=>[p.id,routeCutVolumes(p)]));return cache;}
// Cut only hull geometry, before adding the target's own entrance rooms.
// Routes, props, and room finishes remain independent editable objects.
export function cutNeighborInteriors(group,target,parts,openingCuts){
 if(target.interiorProp||target.route||target.highway||target.type==='character-reference'||target.interior&&!target.interior.shell)return;
 const targetMatrix=partMatrix(target),cut=(frame,bounds,planes)=>{const relative=frame.clone().invert().multiply(targetMatrix);for(const mesh of group.children){if(!mesh.isMesh||target.interior&&!mesh.userData.interiorHull)continue;mesh.updateMatrix();const matrix=relative.clone().multiply(mesh.matrix);if(bounds){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix),volume=new T.Box3(new T.Vector3(bounds[0],bounds[2],bounds[4]),new T.Vector3(bounds[1],bounds[3],bounds[5]));if(!box.intersectsBox(volume))continue;}const geometry=planes?subtractConvexVolume(mesh.geometry,matrix,planes):subtractEntranceVolume(mesh.geometry,matrix,bounds);invalidateStructuralVolume(mesh,matrix,{bounds,planes});mesh.geometry.dispose();mesh.geometry=geometry;}};
 for(const source of parts){if(source.id===target.id)continue;for(const volume of (openingCuts?.routeVolumes?.get(source.id)??routeCutVolumes(source)))cut(new T.Matrix4(),volume.bounds,volume.planes);const spaces=[...(source.interior?[{frame:partMatrix(source),plan:source.interior}]:[]),...(source.entranceInteriors||[]).map(s=>({frame:entranceFrame(source,s),plan:s.plan}))];
 for(const {frame,plan} of spaces)for(const level of levelsOf(plan))for(const room of level.plan.rooms)for(const volume of roomCutVolumes(room,level.plan,level.elevation))cut(frame,volume.bounds,volume.planes);

 for(const window of (openingCuts?.get(source.id)??connectedOpeningCuts(source,parts)))cut(window.frame,window.bounds);
 for(const e of source.entrances||[]){const frame=entranceFrame(source,e);cut(frame,[-e.width/2,e.width/2,1e-5,e.height,-.5,.12]);if(!e.interiorId)cut(frame,[-e.landingWidth/2,e.landingWidth/2,0,e.height,-e.depth,-.35]);}
 }
}
