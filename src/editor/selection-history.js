// Selection belongs to the editor, not to the saved scene. Remember it beside
// history entries so Undoing a duplicate returns to its original object.
export class SelectionMemory{
 constructor(){this.entries=new Map();}
 remember(key,ids,primary){this.entries.set(key,{ids:[...ids],primary});}
 restore(key,parts,hidden=new Set()){
  const entry=this.entries.get(key),existing=new Set(parts.map(p=>p.id)),ids=new Set((entry?.ids||[]).filter(id=>existing.has(id)&&!hidden.has(id)));
  return {ids,primary:ids.has(entry?.primary)?entry.primary:[...ids].at(-1)||null};
 }
 retain(keys){const valid=new Set(keys);for(const key of this.entries.keys())if(!valid.has(key))this.entries.delete(key);}
}
