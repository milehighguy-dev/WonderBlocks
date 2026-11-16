import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.projectFilesTest={files:{},calls:[],nextName:'chosen.building.json',cancel:false,fail:false};
  window.showSaveFilePicker=async options=>{const state=window.projectFilesTest;state.calls.push({suggestedName:options.suggestedName,startIn:options.startIn?.name});if(state.cancel){state.cancel=false;throw new DOMException('Cancelled','AbortError');}const name=state.nextName;return {name,createWritable:async()=>{let pending;return {write:async text=>{if(state.fail){state.fail=false;throw Error('Test write failure');}pending=text;},close:async()=>{state.files[name]=pending;},abort:async()=>{pending=undefined;}};}};};
 });
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const load=async project=>{await page.locator('#file').setInputFiles({name:'input.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(name=>document.getElementById('title').value===name&&!document.getElementById('scene-loading')?.open,project.name);};
 const title=async name=>{await page.locator('#title').fill(name);await page.locator('#title').press('Tab');};
 const saved=async(name,title)=>page.waitForFunction(({name,title})=>{const text=window.projectFilesTest.files[name];return text&&JSON.parse(text).name===title&&!document.getElementById('save').disabled;},{name,title});
 await load({format:'open-building-studio',version:1,name:'First project',parts:[makePart('block')]});
 await page.locator('#save').click();await saved('chosen.building.json','First project');
 await title('Updated project');await page.keyboard.press('Control+s');await saved('chosen.building.json','Updated project');assert.equal(await page.evaluate(()=>projectFilesTest.calls.length),2,'Save opens the dialog again for overwriting');
 await title('Save As copy');await page.evaluate(()=>projectFilesTest.nextName='copy.building.json');await page.keyboard.press('Control+Shift+s');await saved('copy.building.json','Save As copy');
 assert.equal(await page.evaluate(()=>JSON.parse(projectFilesTest.files['chosen.building.json']).name),'Updated project');assert.equal(await page.evaluate(()=>projectFilesTest.calls[1].suggestedName),'chosen.building.json');
 await page.evaluate(()=>projectFilesTest.cancel=true);await page.keyboard.press('Control+Shift+s');await page.waitForFunction(()=>!projectFilesTest.cancel&&!document.getElementById('save').disabled);await title('After cancellation');await page.keyboard.press('Control+s');await saved('copy.building.json','After cancellation');assert.equal(await page.evaluate(()=>projectFilesTest.calls.length),5,'every save opens a dialog; cancellation keeps the prior filename');
 await page.evaluate(()=>projectFilesTest.fail=true);await title('Failed write');await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Test write failure'));assert.equal(await page.evaluate(()=>JSON.parse(projectFilesTest.files['copy.building.json']).name),'After cancellation');
 const f=defaultFlora();addFloraAsset(f,f.branches[0].id,'flora-basic-branch');await load({format:'open-building-studio',version:1,name:'Draft project',parts:[makePart('flora',{flora:f})]});
 await page.locator('[data-workspace-mode=flora]').click();await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-flora-edit]').click();await page.getByRole('button',{name:'Extend branch',exact:true}).click();await page.evaluate(()=>projectFilesTest.nextName='draft.building.json');await page.keyboard.press('Control+s');await saved('draft.building.json','Draft project');
 assert.equal(await page.evaluate(()=>JSON.parse(projectFilesTest.files['draft.building.json']).parts[0].flora.branches[0].points.length),3,'Save includes unfinished plant edits');
 assert.equal(await page.locator('.flora-editor').isVisible(),true,'saving keeps the editor open');assert.deepEqual(errors,[]);
 console.log('PASS Save dialog: filename choice, overwrite, keyboard shortcuts, cancellation, write failure, document changes and live editor drafts.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
