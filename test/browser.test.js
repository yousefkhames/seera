// Usage: node test/browser.test.js <baseUrl> [shotDir]
const {launch}=require('./cdp.js');const assert=require('assert');
const base=process.argv[2]||'http://127.0.0.1:8123/';const dir=process.argv[3]||'/tmp';
(async()=>{let n=0;const ok=(m)=>{n++;console.log('ok',m)};
 for(const [w,h,mob] of [[390,800,true],[1400,900,false]]){
  const b=await launch(w,h,mob);const errs=[];
  try{
   await b.goto(base);
   await b.eval(`localStorage.clear()`);await b.goto(base);
   assert.strictEqual(await b.eval(`document.title.startsWith('Seera')||document.title.startsWith('سيرة')`),true);ok(w+': loads');
   assert(await b.eval(`!!document.querySelector('.hello')`));ok(w+': empty-state hint');
   // sample CV via docs dialog
   await b.click('#btnDocs');await b.click('[data-act=sample]');
   assert.strictEqual(await b.eval(`document.querySelector('[data-f=name]').value`),'Salma Hassan');ok(w+': sample loads');
   // typing updates preview live
   await b.type('[data-f=name]','Omar Nabil');
   assert.strictEqual(await b.eval(`document.querySelector('#sheet h1').textContent`),'Omar Nabil');ok(w+': live preview');
   // add experience
   const before=await b.eval(`document.querySelectorAll('.item').length`);
   await b.click('[data-act=add][data-arr=experience]');
   assert.strictEqual(await b.eval(`document.querySelectorAll('.item').length`),before+1);ok(w+': add job');
   await b.click('[data-act=up][data-arr=experience][data-i="2"]');
   await b.click('[data-act=rm][data-arr=experience][data-i="1"]');
   assert.strictEqual(await b.eval(`document.querySelectorAll('[data-arr=experience][data-k=role]').length`),2);ok(w+': reorder/remove');
   // ATS score
   if(w<760){await b.click('[data-tab=check]')}
   const score=+await b.eval(`document.querySelector('.ring b').textContent`);assert(score>=80,'score '+score);ok(w+': ats score '+score);
   await b.type('#jobBox','We need someone with Tableau, SEO and Google Analytics experience in email marketing');
   assert(await b.eval(`document.querySelectorAll('#jobRes .chip.no').length>0`));ok(w+': job match missing');
   await b.click('#jobRes .chip.no[data-w=tableau]');
   assert(await b.eval(`document.querySelector('[data-f=skills]').value.toLowerCase().includes('tableau')`));ok(w+': add keyword to skills');
   await b.shot(dir+'/check-'+w+'.png');
   // preview tab
   if(w<760)await b.click('[data-tab=preview]');
   await b.shot(dir+'/preview-'+w+'.png');
   // persistence
   await b.eval(`window.dispatchEvent(new Event('pagehide'))`);await b.goto(base);
   assert.strictEqual(await b.eval(`document.querySelector('#sheet h1').textContent`),'Omar Nabil');ok(w+': persists reload');
   // language toggle to Arabic
   await b.click('#btnUi');
   assert.strictEqual(await b.eval(`document.documentElement.dir`),'rtl');ok(w+': RTL on');
   assert.strictEqual(await b.eval(`document.getElementById('sheet').dir`),'ltr');ok(w+': doc dir independent');
   // doc language arabic
   if(w<760)await b.click('[data-tab=edit]');
   await b.eval(`document.querySelector('details.card').open=true`);
   await b.eval(`(()=>{const s=document.querySelector('[data-f=lang]');s.value='ar';s.dispatchEvent(new Event('input',{bubbles:true}))})()`);
   assert.strictEqual(await b.eval(`document.getElementById('sheet').dir`),'rtl');ok(w+': arabic doc rtl');
   assert(await b.eval(`document.querySelector('#sheet h2').textContent.includes('نبذة')`));ok(w+': arabic headings');
   if(w<760)await b.click('[data-tab=preview]');
   await b.shot(dir+'/ar-'+w+'.png');
   // no horizontal overflow
   assert.strictEqual(await b.eval(`document.documentElement.scrollWidth<=window.innerWidth+1`),true);ok(w+': no horizontal overflow');
   // new letter + generate
   await b.click('#btnDocs');await b.click('[data-act=newletter]');
   if(w<760)await b.click('[data-tab=edit]');
   await b.type('[data-f=company]','Acme');await b.type('[data-f=role]','Analyst');
   await b.click('[data-act=gen]');
   assert((await b.eval(`document.querySelector('[data-f=body]').value`)).includes('Acme'));ok(w+': letter generate');
   // docs: duplicate/delete
   await b.click('#btnDocs');const c0=await b.eval(`document.querySelectorAll('.doclist li').length`);
   await b.click('[data-act=dupdoc]');assert.strictEqual(await b.eval(`document.querySelectorAll('.doclist li').length`),c0+1);ok(w+': duplicate doc');
   // PDF via print emulation: real text, one column
   await b.click('[data-act=closedlg]');
   if(w>=760){await b.send('Emulation.setEmulatedMedia',{media:'print'});await b.pdf(dir+'/out-'+w+'.pdf');await b.send('Emulation.setEmulatedMedia',{media:''});ok(w+': pdf rendered')}
  }catch(e){console.error('FAIL',e.message);process.exitCode=1}finally{b.close()}
 }
 console.log(n+' browser checks passed');process.exit(process.exitCode||0)})();
