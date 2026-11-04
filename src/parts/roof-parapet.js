import * as T from '../../vendor/three.module.js';

export function validateRoofParapet(settings){
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!['height','thickness'].includes(k))||!Number.isFinite(settings.height)||settings.height<0||settings.height>2||!Number.isFinite(settings.thickness)||settings.thickness<.05||settings.thickness>1)throw Error('Invalid roof rim dimensions.');
 return settings;
}

// All four sides belong to the host part, including selection, transforms,
// finishes and physical collision. Dimensions are metres, independent of scale.
export function buildRoofParapet(group,material,{width=1,height=1,depth=1,scale=[1,1,1]},settings){
 validateRoofParapet(settings);if(!settings.height)return;
 const h=settings.height/Math.abs(scale[1]),tx=Math.min(width*.45,settings.thickness/Math.abs(scale[0])),tz=Math.min(depth*.45,settings.thickness/Math.abs(scale[2]));
 const box=(w,d,x,z)=>{
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,height+h/2,z);mesh.name='Raised roof rim';mesh.userData.roofParapet=true;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 };
 for(const side of [-1,1]){box(width,tz,0,side*(depth-tz)/2);box(tx,depth-2*tz,side*(width-tx)/2,0);}
}
