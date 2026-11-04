import test from 'node:test';
import assert from 'node:assert/strict';
import {HALLWAY_PRESETS,selectHallwayPreset} from '../src/routes/hallway-presets.js';
import {defaultRoute,validateRoute} from '../src/routes/stair-route.js';
import {defaultHallway,defaultHallwayRoute} from '../src/routes/hallway.js';
import {appendRouteSegment} from '../src/routes/route-actions.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Box3} from '../vendor/three.module.js';

test('new routes retain their established dimensions when themed hallway presets are added',()=>{
 assert.equal(defaultRoute().width,3.75);
 assert.equal(defaultHallwayRoute().width,3.75);
 assert.equal(defaultHallway().height,5.4);
 for(const preset of HALLWAY_PRESETS){const s={};selectHallwayPreset(s,preset.id);assert.equal(s.hallway.height,5.4);}
});

test('default hallways build solid walls and valid connected turns',()=>{
 const route=appendRouteSegment(defaultHallwayRoute(),'left','landing');
 validateRoute(route);
 const mesh=buildPart(makePart('stair-route',{route}));
 const bounds=new Box3().setFromObject(mesh);
 assert.ok(bounds.max.y>=5.4&&bounds.max.y<5.7);
 assert.ok(route.segments.some(s=>s.turn==='left'&&s.run>=route.width));
 disposePart(mesh);
});

test('changing hallway style preserves an existing authored height',()=>{
 const segment={hallway:{...defaultHallway(),height:3.4}};
 selectHallwayPreset(segment,'polis-massa');
 assert.equal(segment.hallway.height,3.4);
 assert.equal(defaultRoute({width:2}).width,2);
});
