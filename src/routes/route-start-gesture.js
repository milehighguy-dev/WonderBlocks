import * as T from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';
// Freeze the starting frame so rotating the preview cannot shift the next mouse delta.
export function initialRouteGesture(part,ray,pointerId){const source=structuredClone(part),matrix=partMatrix(source),inverse=matrix.clone().invert(),origin=new T.Vector3(...source.position),normal=new T.Vector3(0,1,0).transformDirection(matrix),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,origin),point=ray.intersectPlane(plane,new T.Vector3());return point?{source,anchor:{type:'start',index:0},plane,inverse,start:point.applyMatrix4(inverse),pointerId,heading:0,moved:false,initial:true}:null;}
