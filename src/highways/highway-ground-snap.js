import * as T from '../../vendor/three.module.js';

// Snap the underside of the deck onto a nearby upward-facing surface.
// A short probe keeps elevated roads from suddenly dropping to the ground.
export function snapHighwayGround(point,part,objects,{threshold=1}={}){
 const thickness=part.highway.thickness*Math.abs(part.scale[1]);
 const ray=new T.Raycaster(point.clone().add(new T.Vector3(0,threshold,0)),new T.Vector3(0,-1,0),0,threshold*2+thickness);
 for(const object of objects)object.updateWorldMatrix(true,true);
 const hits=ray.intersectObjects(objects,true).filter(hit=>{
  for(let o=hit.object;o;o=o.parent)if(!o.visible||o.userData.highwayDeck||o.userData.highwayRailing||o.userData.highwaySupport)return false;
  const normal=hit.face?.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld));
  return normal?.y>.5&&Math.abs(hit.point.y+thickness-point.y)<=threshold;
 });
 const target=hits[0]?.point.y;
 if(target!==undefined)return point.clone().setY(target+thickness);
 if(Math.abs(thickness-point.y)<=threshold)return point.clone().setY(thickness);
 return null;
}
