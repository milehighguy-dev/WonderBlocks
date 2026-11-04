// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {entranceFixture} from './entrance-fixture.js';
import {extendPlatformTurn,roundPlatformEnds} from '../../src/platforms/platform-flow.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
export function roundedPlatformFixture(){
 const project=entranceFixture(),route=project.parts.find(p=>p.route);
 const platform=makePart('platform',{name:'Connected rounded L platform',position:[0,7,18.5],color:'#c6c5af'});
 Object.assign(platform.platform.sections[0],{depth:16,rotation:Math.PI/2});
 platform.platform=roundPlatformEnds(extendPlatformTurn(platform.platform,0,'right','rectangle',12,'rounded-exit',true));
 route.route.links.start={partId:platform.id,platformSection:platform.platform.sections[0].id,side:'front'};
 return {...project,name:'Rounded L · connected to elevated entrance',parts:resolveRouteLinks([...project.parts,platform])};
}
