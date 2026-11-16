import {TransformControls as ThreeTransformControls} from '../../vendor/TransformControls.js';
import {Vector2,Vector3} from '../../vendor/three.module.js';
import {dragScale,limitScaleTravel} from './scale-drag.js';

const diagonal=new Vector2(1,-1).normalize();
const FINE_CONTROL=.2;

// Keep the stock move/rotate geometry and scale handles, with a pixel-based scale
// gesture that does not divide by the distance from the mouse to the pivot.
export class TransformControls extends ThreeTransformControls{
 constructor(camera,element){
  super(camera,element);this._requestedSize=this.size;this._scaleDrag=null;this._rotationDrag=null;this.uniformScale=false;this.scaleFactorLimits=null;
  const getPointer=this._getPointer;this._getPointer=event=>({...getPointer(event),shiftKey:event.shiftKey,altKey:event.altKey});
  const helper=this.getHelper(),update=helper.updateMatrixWorld.bind(helper);
  helper.updateMatrixWorld=force=>{this._syncSize();const result=update(force);if(this.mode==='scale'&&this.uniformScale)for(const handle of this._gizmo.gizmo.scale.children)if(handle.name!=='XYZ')handle.visible=false;return result;};
  for(const handle of this._gizmo.gizmo.scale.children)if(handle.name==='XYZ'){
   handle.geometry.scale(1.25,1.25,1.25);handle.material=handle.material.clone();handle.material.opacity=.95;
  }
 }
 _rect(){return this.domElement?.getBoundingClientRect()||{width:1280,height:720};}
 _syncSize(){const height=this._rect().height||720;this.size=this._requestedSize*(this.mode==='scale'?720/height:1);}
 setSize(size){this._requestedSize=size;this._syncSize();}
 _pixel(pointer){const rect=this._rect();return new Vector2(pointer.x*rect.width/2,-pointer.y*rect.height/2);}
 _origin(){this.object.updateWorldMatrix(true,false);return this.object.getWorldPosition(new Vector3());}
 _screen(point){const p=point.clone().project(this.camera),rect=this._rect();return new Vector2(p.x*rect.width/2,-p.y*rect.height/2);}
 pointerHover(pointer){
  if(this.mode==='scale'&&this.object&&!this.dragging&&pointer&&this.showX&&this.showY&&this.showZ){
   const origin=this._origin(),projected=origin.clone().project(this.camera);
   // Give the visible center cube priority over overlapping two-axis pickers.
   if(projected.z>=-1&&projected.z<=1&&this._pixel(pointer).distanceTo(this._screen(origin))<=Math.max(8,11*this._requestedSize)){
    this.axis='XYZ';return;
   }
   if(this.uniformScale){this.axis=null;return;}
  }
  super.pointerHover(pointer);
 }
 pointerDown(pointer){
  if(this.mode!=='scale'){
   const alreadyDragging=this.dragging,result=super.pointerDown(pointer);
   if(this.mode==='rotate'&&this.dragging&&!alreadyDragging)this._rotationDrag={object:this.object,lastRaw:0,angle:0};
   return result;
  }
  if(!this.object||this.dragging||!this.axis||!pointer||pointer.button!==0)return;
  const object=this.object,origin=this._origin(),start=this._pixel(pointer);
  this._positionStart.copy(object.position);this._quaternionStart.copy(object.quaternion);this._scaleStart.copy(object.scale);
  object.matrixWorld.decompose(this.worldPositionStart,this.worldQuaternionStart,this._worldScaleStart);
  this.pointStart.set(0,0,0);this.pointEnd.set(0,0,0);
  let direction=diagonal.clone();
  if(this.axis!=='XYZ'){
   direction.set(0,0);const center=this._screen(origin),offset=start.clone().sub(center);
   const span=this.camera.isOrthographicCamera?(this.camera.top-this.camera.bottom)/this.camera.zoom:origin.distanceTo(this.camera.position)*.5;
   for(const axis of this.axis){
    const basis=new Vector3(Number(axis==='X'),Number(axis==='Y'),Number(axis==='Z')).applyQuaternion(this.worldQuaternionStart);
    const projected=this._screen(origin.clone().addScaledVector(basis,Math.max(.001,span))).sub(center);
    if(projected.lengthSq()<1e-8)continue;
    projected.normalize();if(offset.dot(projected)<0)projected.negate();direction.add(projected);
   }
   if(direction.lengthSq()<.01)direction.copy(diagonal);else direction.normalize();
  }
  this._scaleDrag={object,axes:this.axis,start:object.scale.toArray(),last:start,pixels:0,direction};
  this.dragging=true;this.dispatchEvent({type:'mouseDown',mode:'scale'});
 }
 rotationDragAngle(raw,pointer,circular=false){
  const drag=this._rotationDrag??={object:this.object,lastRaw:0,angle:0};
  let delta=raw-drag.lastRaw;drag.lastRaw=raw;
  if(circular)delta=Math.atan2(Math.sin(delta),Math.cos(delta));
  // Weight each new movement, so pressing/releasing Shift during a gesture
  // changes sensitivity without rescaling the rotation already performed.
  drag.angle+=delta*(pointer?.shiftKey?FINE_CONTROL:1);
  const snap=pointer?.altKey||pointer?.shiftKey?null:this.rotationSnap;
  return snap?Math.round(drag.angle/snap)*snap:drag.angle;
 }
 pointerMove(pointer){
  if(this.mode!=='scale')return super.pointerMove(pointer);
  const drag=this._scaleDrag;
  if(!drag||!this.dragging||this.object!==drag.object||!pointer||pointer.button!==-1)return;
  const point=this._pixel(pointer),delta=point.clone().sub(drag.last);drag.last.copy(point);
  drag.pixels+=delta.dot(drag.direction)*(pointer.shiftKey?FINE_CONTROL:1);
  const snap=pointer.altKey||pointer.shiftKey?null:this.scaleSnap;
  drag.pixels=limitScaleTravel(drag.start,drag.axes,drag.pixels,snap,this.scaleFactorLimits);
  this.object.scale.fromArray(dragScale(drag.start,drag.axes,drag.pixels,snap,this.scaleFactorLimits));
  this.dispatchEvent({type:'change'});this.dispatchEvent({type:'objectChange'});
 }
 pointerUp(pointer){super.pointerUp(pointer);if(!this.dragging){this._scaleDrag=null;this._rotationDrag=null;}}
 reset(){super.reset();if(this._scaleDrag){this._scaleDrag.start=this.object.scale.toArray();this._scaleDrag.pixels=0;}if(this._rotationDrag){this._rotationDrag.lastRaw=0;this._rotationDrag.angle=0;}}
 detach(){this._scaleDrag=null;this._rotationDrag=null;return super.detach();}
}
