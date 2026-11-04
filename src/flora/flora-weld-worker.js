const floraModule=import('./flora.js');

self.onmessage=async({data:{key,flora}})=>{
 try{
  const {floraWeldGeometry}=await floraModule;
  const g=floraWeldGeometry(flora);
  if(!g)throw Error('Plant has no wood to join.');
  const position=g.attributes.position.array,normal=g.attributes.normal.array,uv=g.attributes.uv.array,index=g.index.array;
  self.postMessage({key,position,normal,uv,index,step:g.userData.skinStep},[position.buffer,normal.buffer,uv.buffer,index.buffer]);
  g.dispose();
 }catch(error){self.postMessage({key,error:error.message});}
};
