// Pose changes can update the existing editable meshes. Asset, topology,
// material and morph changes still use the normal builder.
export function floraPreviewLayoutKey(part){
 if(Object.values(part.shape||{}).some(Boolean))return null;
 const {flora,...other}=part;
 return JSON.stringify([other,{
  ...flora,
  branches:flora.branches.map(({points,radii,childRotation,jointRotations,...branch})=>({...branch,joints:points.length})),
  organs:flora.organs.map(({offset,rotation,scale,...organ})=>organ)
 }]);
}
