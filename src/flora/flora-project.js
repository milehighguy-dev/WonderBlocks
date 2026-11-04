import {validateFlora} from './flora.js';

export function floraDraftIsEmpty(draft){return !draft.flora.organs.length&&draft.flora.branches.every(b=>b.anchor);}
// Saving a draft must not commit it to scene history or end the editing session.
export function floraDraftSnapshot(project,draft){
 const snapshot=structuredClone(project);if(!draft)return snapshot;validateFlora(draft.flora);
 const index=snapshot.parts.findIndex(p=>p.id===draft.id),empty=floraDraftIsEmpty(draft);
 if(index>=0){if(empty)snapshot.parts.splice(index,1);else snapshot.parts[index]=structuredClone(draft);}
 else if(!empty)snapshot.parts.push(structuredClone(draft));
 return snapshot;
}
