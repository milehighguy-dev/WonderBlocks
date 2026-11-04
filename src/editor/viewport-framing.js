import * as T from '../../vendor/three.module.js';

// Fit the complete object into the canvas area below its floating controls.
export function frameViewportBox(camera,orbit,box,viewport,{direction=new T.Vector3(1,.8,1),minDistance=2,padding=1.12}={}){
 if(box.isEmpty())return false;
 const rect=viewport?.getBoundingClientRect?.(),height=Math.max(1,rect?.height||viewport?.clientHeight||600),width=Math.max(1,rect?.width||viewport?.clientWidth||height*camera.aspect);
 let top=0;
 for(const control of viewport?.querySelectorAll?.(':scope > .viewport-topbar,:scope > .floor-workspace:not([hidden])')||[]){const r=control.getBoundingClientRect();if(r.height>0)top=Math.max(top,r.bottom-(rect?.top||0)+12);}
 top=Math.min(top,height*.6);
 const half=T.MathUtils.degToRad(camera.getEffectiveFOV())/2,radius=box.getSize(new T.Vector3()).length()/2,angle=Math.min(Math.atan(Math.tan(half)*(height-top)/height),Math.atan(Math.tan(half)*width/height));
 const distance=Math.max(minDistance,radius/Math.sin(angle)*padding),axis=direction.clone().normalize(),up=new T.Vector3(0,1,0).addScaledVector(axis,-axis.y).normalize(),target=box.getCenter(new T.Vector3()).addScaledVector(up,distance*Math.tan(half)*top/height);
 orbit.target.copy(target);camera.position.copy(target).addScaledVector(axis,distance);camera.aspect=width/height;camera.far=Math.max(camera.far,distance+radius*3+1);camera.updateProjectionMatrix();camera.lookAt(target);orbit.update();camera.updateMatrixWorld(true);return true;
}
