import {validateProject} from '../core/model.js';
import {floraDraftSnapshot} from '../flora/flora-project.js';
import {saveConnectedInterior} from '../interiors/connected-interior.js';
import {ensureRoomDoorIds,reconcileRoomRouteLinks} from '../interiors/room-route.js';
import {interiorRouteStair} from '../interiors/interior-route.js';

// A download is a snapshot, never an implicit Finish or an edit to scene history.
export function editorDraftSnapshot(project,{draft=null,placed=true,contextParts=null,connected=null,interiorRoute=null}={}){
 let snapshot=structuredClone(project);if(!draft||!placed)return validateProject(snapshot);
 if(contextParts)snapshot.parts=structuredClone(contextParts);
 draft=structuredClone(draft);
 if(interiorRoute){
  const context=interiorRoute,parent=structuredClone(context.draft),stair=interiorRouteStair(parent,context.from,draft,context.stairId);
  parent.interior.stairs=(parent.interior.stairs||[]).filter(s=>s.id!==stair.id).concat(stair);draft=parent;
 }
 if(draft.flora)return validateProject(floraDraftSnapshot(snapshot,draft));
 if(draft.interior){
  ensureRoomDoorIds(draft.interior);
  if(connected){
   const next=saveConnectedInterior(connected,draft.interior),removed=new Set(connected.host.entrances.filter(e=>!next.entrances.some(n=>n.id===e.id)).map(e=>e.id));
   for(const p of snapshot.parts)for(const end of ['start','end'])if(removed.has(p.route?.links?.[end]?.entranceId))delete p.route.links[end];draft=next;
  }
 }
 const index=snapshot.parts.findIndex(p=>p.id===draft.id);
 if(index<0)snapshot.parts.push(draft);else snapshot.parts[index]=draft;
 if(draft.interior||connected)reconcileRoomRouteLinks(snapshot.parts,draft);
 return validateProject(snapshot);
}
