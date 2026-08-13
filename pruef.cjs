const { chromium } = require("playwright-core");
const fs=require("fs"), path=require("path");
(async () => {
  const seed = fs.readFileSync(path.join(__dirname,"tools","kontrast-seed.json"),"utf8");
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport:{width:420,height:900} });
  await p.goto("http://localhost:5199/"); await p.waitForTimeout(900);
  await p.evaluate(async ([s,n]) => {
    const db = await new Promise((res,rej)=>{const q=indexedDB.open("supadupa-money",2);
      q.onupgradeneeded=e=>{const d=e.target.result;
        if(!d.objectStoreNames.contains("appdata"))d.createObjectStore("appdata");
        if(!d.objectStoreNames.contains("kvstore"))d.createObjectStore("kvstore");};
      q.onsuccess=e=>res(e.target.result); q.onerror=rej;});
    await new Promise((res,rej)=>{const tx=db.transaction("appdata","readwrite");
      tx.objectStore("appdata").put(s,"finanzapp_v9"); tx.oncomplete=res; tx.onerror=rej;});
    await new Promise((res,rej)=>{const tx=db.transaction("kvstore","readwrite");
      tx.objectStore("kvstore").put(n,"mbt_theme"); tx.oncomplete=res; tx.onerror=rej;});
  }, [seed,"tastenhell"]);
  await p.reload(); await p.waitForTimeout(2300);
  await p.mouse.click(210, 855); await p.waitForTimeout(500);
  await p.mouse.click(126, 862); await p.waitForTimeout(1500);
  await p.screenshot({ path:"/tmp/claude-0/-home-user-supadupa-money/a54072a6-cf5f-56ba-96bb-32814df7ae15/scratchpad/zurueck.png" });
  await b.close();
})();
