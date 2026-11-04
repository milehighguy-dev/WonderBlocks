// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {defaultRailing} from '../../src/routes/railings.js';
export function walkwayFixture(){const railing={...defaultRailing(),style:'bespin',height:.7,panelThickness:.29,color:'#c9c6b9'},segment=(kind,run,rise=0,turn='straight')=>({kind,run,rise,turn,steps:kind==='stairs'?16:1,railing:structuredClone(railing)});return {format:'open-building-studio',version:1,name:'Test fixture',parts:[makePart('stair-route',{name:'Bespin ramp and corner',position:[-7,4,0],route:{width:3,thickness:.18,gap:.2,segments:[segment('ramp',9,2),segment('landing',3,0,'left'),segment('stairs',5,-2),segment('landing',3)]}}),makePart('stair-route',{name:'Bespin curved walkway',position:[7,4,0],route:{width:3,thickness:.18,gap:.2,segments:[segment('landing',3),{...segment('ramp',9,2),curveAngle:Math.PI/2},segment('landing',3)]}})]};}

export function archedRouteFixture(){const p=walkwayFixture();for(const part of p.parts)if(part.route){part.name=part.name.replace('Bespin','Arched Bespin');for(const s of part.route.segments){s.railing.style='bespin-arches';s.railing.spacing=3.6;}}return p;}
