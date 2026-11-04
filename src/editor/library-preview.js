import * as T from '../../vendor/three.module.js';
import {makePart} from '../core/model.js';
import {buildPart} from '../core/geometry.js';
// Library previews have their own scene context, including only saved object group members.
export function buildLibraryPreview(def){if(!def.parts)return buildPart(makePart(def.type??def.id,structuredClone(def.preset||{})),{batch:true,collision:false,parts:[]});const group=new T.Group();for(const part of def.parts)group.add(buildPart(part,{batch:true,collision:false,parts:def.parts}));return group;}
