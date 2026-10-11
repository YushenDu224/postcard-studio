let dbPromise;
function openDB(){return dbPromise ??= new Promise((resolve,reject)=>{
  const r=indexedDB.open('postcard-studio',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('local');
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});}
export async function readDraft(){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('local').objectStore('local').get('draft');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveDraft(project){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('local','readwrite');tx.objectStore('local').put(structuredClone(project),'draft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export async function clearDraft(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('local','readwrite');tx.objectStore('local').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
