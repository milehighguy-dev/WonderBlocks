import * as T from '../../vendor/three.module.js';
export function routeHandleGeometry(kind){
 if(kind==='join')return new T.RingGeometry(.59,.91,20).rotateX(-Math.PI/2);
 if(kind==='edit')return new T.BoxGeometry(1.25,1.25,1.25);
 let points;
 if(kind==='start')points=[[-.25,-1],[.25,-1],[.25,-.25],[1,-.25],[1,.25],[.25,.25],[.25,1],[-.25,1],[-.25,.25],[-1,.25],[-1,-.25],[-.25,-.25]];
 else if(kind==='width')points=[[-.26,-.5],[-.65,-.5],[0,-1.15],[.65,-.5],[.26,-.5],[.26,.5],[.65,.5],[0,1.15],[-.65,.5],[-.26,.5]];
 else points=[[-1.35,0],[-.7,-.55],[-.7,-.2],[.7,-.2],[.7,-.55],[1.35,0],[.7,.55],[.7,.2],[.2,.2],[.2,.8],[.55,.8],[0,1.4],[-.55,.8],[-.2,.8],[-.2,.2],[-.7,.2],[-.7,.55]];
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));shape.closePath();
 return new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false}).translate(0,0,-.06).rotateX(Math.PI/2);
}
