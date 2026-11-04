import {validateProject} from '../core/model.js';
import {remapPartReferences} from '../editor/part-references.js';
import {assemblyLabel} from '../core/assemblies.js';

export function exportScope(project,ids=null){
 const chosen=ids===null?null:new Set(ids),copy=structuredClone(project);
 copy.parts=copy.parts.filter(p=>p.type!=='character-reference'&&(!chosen||chosen.has(p.id)));
 if(!copy.parts.length)throw Error(chosen?'Select an object or object group to export.':'Add a scene object before exporting.');
 remapPartReferences(copy.parts,new Map(copy.parts.map(p=>[p.id,p.id])));
 if(chosen)copy.name=copy.parts.length===1?copy.parts[0].name:copy.parts.every(p=>p.assemblyId&&p.assemblyId===copy.parts[0].assemblyId)?assemblyLabel(copy.parts):'Selected objects';
 return validateProject(copy);
}
