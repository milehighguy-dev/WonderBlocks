import * as T from '../../vendor/three.module.js';
import {routeLayout} from './stair-route.js';

export function routeEditEndpoints(route,index){
 const entry=routeLayout(route)[index],s=entry.segment;
 const point=s.turnAngle!==undefined||s.curveAngle?[...entry.end]:[entry.start[0]+Math.sin(entry.heading)*s.run,entry.start[1]+(s.kind==='landing'?0:s.rise),entry.start[2]+Math.cos(entry.heading)*s.run];
 const endpoints=[{end:'end',point,heading:entry.endHeading}];
 // Deleting a section leaves an anchored, disconnected path. Its exposed
 // beginning must remain editable without dragging the downstream sections.
 if(s.pathStart&&!s.branchFrom&&!s.joinTo&&!s.wallJoinTo&&s.turn==='straight'&&!(index===0&&route.links?.start)&&!route.attachments?.some(a=>a.index===index&&a.end==='start'))endpoints.push({end:'start',point:[...entry.start],heading:entry.heading});
 return endpoints;
}

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
