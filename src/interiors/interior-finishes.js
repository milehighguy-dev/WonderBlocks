import {inside,pointsOf} from './polygon-plan.js';
export function wallFinishAt(plan,point,base=0){return plan.rooms.some(room=>point.y<base+(room.ceilingHeight??room.wallHeight??plan.height)+1e-7&&inside({x:point.x,z:point.z},pointsOf(room),false))?'wall':'outside';}
export function wallFinishHeights(plan,base=0){return [...new Set(plan.rooms.map(room=>base+(room.ceilingHeight??room.wallHeight??plan.height)))];}
