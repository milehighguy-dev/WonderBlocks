import * as T from '../../vendor/three.module.js';
import {routeCutVolumes} from '../routes/route-cut-volumes.js';
import {roomCutVolumes} from '../interiors/room-cut-volumes.js';
import {connectedOpeningCuts} from '../interiors/connected-interior.js';
import {partMatrix,entranceFrame} from '../interiors/entrances.js';
import {levelsOf} from '../interiors/interior-storeys.js';

// Read the same semantic voids that already cut object skins during creation.
// These are query exclusions, not collision geometry or export-time carving.
export function preparedNavigationVoids(parts){
 const cells=[];
 function add(volume,frame=new T.Matrix4()){
  const [x0,x1,y0,y1,z0,z1]=volume.bounds,localBox=new T.Box3(new T.Vector3(x0,y0,z0),new T.Vector3(x1,y1,z1));
  cells.push({box:localBox.clone().applyMatrix4(frame),localBox,inverse:frame.clone().invert(),planes:volume.planes});
 }
 for(const part of parts){
  for(const volume of routeCutVolumes(part))add(volume);
  const spaces=[...(part.interior?[{frame:partMatrix(part),plan:part.interior}]:[]),...(part.entranceInteriors??[]).map(space=>({frame:entranceFrame(part,space),plan:space.plan}))];
  for(const {frame,plan} of spaces)for(const level of levelsOf(plan))for(const room of level.plan.rooms)for(const volume of roomCutVolumes(room,level.plan,level.elevation))add(volume,frame);
  for(const opening of connectedOpeningCuts(part,parts))add({bounds:opening.bounds},opening.frame);
  for(const entrance of part.entrances??[]){const frame=entranceFrame(part,entrance);add({bounds:[-entrance.width/2,entrance.width/2,1e-5,entrance.height,-.5,.12]},frame);if(!entrance.interiorId)add({bounds:[-entrance.landingWidth/2,entrance.landingWidth/2,0,entrance.height,-entrance.depth,-.35]},frame);}
 }
 return point=>cells.some(cell=>{if(!cell.box.containsPoint(point))return false;const local=point.clone().applyMatrix4(cell.inverse);return cell.localBox.containsPoint(local)&&(!cell.planes||cell.planes.every(([x,y,z,d])=>x*local.x+y*local.y+z*local.z+d>=-1e-7));});
}
