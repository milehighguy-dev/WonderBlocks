import * as T from '../../vendor/three.module.js';
import {sceneRenderKey} from './scene-render-key.js';
import {resolveRouteLinks} from '../routes/route-links.js';
import {prepareInteriorCuts} from '../interiors/interior-hull-cuts.js';
import {roomCutVolumes} from '../interiors/room-cut-volumes.js';
import {levelsOf} from '../interiors/interior-storeys.js';
import {entranceFrame,partMatrix} from '../interiors/entrances.js';
import {platformRailSpans} from '../platforms/platform.js';

const boxOf=b=>new T.Box3(new T.Vector3(b[0],b[2],b[4]),new T.Vector3(b[1],b[3],b[5]));

// Mirror the geometry builder's cross-object inputs. Compare actual window and
// railing outputs rather than invalidating the scene whenever any hull changes.
function dependencies(input,roots){
 const parts=resolveRouteLinks(input),cuts=prepareInteriorCuts(parts),volumes=[];
 const byId=new Map(parts.map(p=>[p.id,p])),highways=sceneRenderKey(parts.filter(p=>p.highway));
 const add=(source,frame,volume)=>volumes.push({source,box:boxOf(volume.bounds).applyMatrix4(frame),key:JSON.stringify([source,frame.elements,volume])});
 for(const p of parts){
  for(const volume of cuts.routeVolumes.get(p.id)||[])add(p.id,new T.Matrix4(),volume);
  const spaces=[...(p.interior?[{frame:partMatrix(p),plan:p.interior}]:[]),...(p.entranceInteriors||[]).map(s=>({frame:entranceFrame(p,s),plan:s.plan}))];
  for(const {frame,plan} of spaces)for(const level of levelsOf(plan))for(const room of level.plan.rooms)for(const volume of roomCutVolumes(room,level.plan,level.elevation))add(p.id,frame,volume);
  for(const window of cuts.get(p.id)||[])add(p.id,window.frame,{bounds:window.bounds});
  for(const e of p.entrances||[]){
   const frame=entranceFrame(p,e);add(p.id,frame,{bounds:[-e.width/2,e.width/2,1e-5,e.height,-.5,.12]});
   if(!e.interiorId)add(p.id,frame,{bounds:[-e.landingWidth/2,e.landingWidth/2,0,e.height,-e.depth,-.35]});
  }
 }
 return new Map(parts.map(p=>{
  const root=roots.get(p.id),rawBounds=root?.userData.uncutBounds;
  // Use the original uncut hull. The visible result may have lost an entire
  // region to a doorway; that region must reappear when its cutter is deleted.
  const bounds=rawBounds?.clone().applyMatrix4(partMatrix(p)).expandByScalar(1e-5);
  const cuttable=!(p.interiorProp||p.route||p.highway||p.type==='character-reference'||p.interior&&!p.interior.shell);
  const neighbours=cuttable?volumes.filter(v=>v.source!==p.id&&(!bounds||v.box.intersectsBox(bounds))).map(v=>v.key):[];
  const ownWindows=(cuts.get(p.id)||[]).map(w=>[w.frame.elements,w.bounds,w.kind,w.levelId]);
  const fittedHosts=(p.route?.segments||[]).flatMap(s=>{const id=s.hallway?.entranceFit?.partId;return id?[byId.get(id)??null]:[];});
  return [p.id,JSON.stringify([sceneRenderKey([p]),neighbours,ownWindows,p.platform?platformRailSpans(p,parts):null,p.highway?highways:null,sceneRenderKey(fittedHosts.filter(Boolean))])];
 }));
}

export function reusableSceneParts(previous,next,roots=new Map()){
 const before=dependencies(previous,roots),after=dependencies(next,roots);
 return new Set([...after].filter(([id,key])=>before.get(id)===key).map(([id])=>id));
}
