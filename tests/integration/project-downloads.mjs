// These regression tests inspect downloaded snapshots. Save As itself is covered
// separately with file handles and the desktop's native file dialog.
export async function useProjectDownloads(page){
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
}
