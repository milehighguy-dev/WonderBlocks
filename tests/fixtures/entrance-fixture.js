// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {makeEntrance} from '../../src/interiors/entrances.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
import {Vector3} from '../../vendor/three.module.js';
export function entranceFixture(){const tower=makePart('block',{name:'Elevated entrance tower',scale:[10,18,9],color:'#788c8e'});const e=makeEntrance(tower,new Vector3(0,10,4.5),new Vector3(0,0,1),2.4);Object.assign(e,{landingWidth:6,depth:5,height:3});tower.entrances=[e];const route=makePart('stair-route',{name:'Upper arrival ramp',position:[0,7,14.5],rotation:[0,Math.PI,0],route:{width:2,thickness:.2,gap:.15,segments:[{kind:'ramp',run:10,rise:3,steps:1,turn:'straight',railing:{style:'posts'}}],links:{end:{partId:tower.id,entranceId:e.id}}}});return {format:'open-building-studio',version:1,name:'Test fixture',parts:resolveRouteLinks([tower,route])};}
