// Minimal Chrome DevTools driver (no deps) for local browser tests.
const {spawn}=require('child_process');const http=require('http');const fs=require('fs');
exports.launch=async function(w=390,h=800,mobile=true){
  const port=9300+Math.floor(Math.random()*500);
  const p=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir=/tmp/cdp'+port,'--window-size='+w+','+h,'about:blank'],{stdio:'ignore'});
  let list;for(let i=0;i<50;i++){try{list=await new Promise((res,rej)=>http.get('http://127.0.0.1:'+port+'/json',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)))}).on('error',rej));break}catch(e){await new Promise(r=>setTimeout(r,200))}}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let id=0;const pend={};ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}};
  const send=(method,params={})=>new Promise((res,rej)=>{const i=++id;pend[i]=d=>d.error?rej(new Error(JSON.stringify(d.error))):res(d.result);ws.send(JSON.stringify({id:i,method,params}))});
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile});
  const api={send,
    async goto(u){await send('Page.navigate',{url:u});await new Promise(r=>setTimeout(r,1200))},
    async eval(e){const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description));return r.result.value},
    async shot(f){const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(f,Buffer.from(r.data,'base64'))},
    async pdf(f){const r=await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true});fs.writeFileSync(f,Buffer.from(r.data,'base64'))},
    async click(sel){return api.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('nosel ${sel.replace(/'/g,'')}');e.click();return 1})()`)},
    async type(sel,val){return api.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('nosel');e.focus();e.value=${JSON.stringify(val)};e.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`)},
    close(){try{ws.close()}catch(e){}p.kill()}};
  return api};
