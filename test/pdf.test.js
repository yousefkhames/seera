// Renders the print view of sample CVs to PDF and checks the text layer (what an ATS parses).
const {launch}=require('./cdp.js');const assert=require('assert');const {execSync}=require('child_process');
const base=process.argv[2];
(async()=>{const b=await launch(1200,900,false);try{
 for(const lang of ['en','ar']){
  await b.goto(base);await b.eval(`localStorage.clear();localStorage.setItem('seera.v1',JSON.stringify({ui:'${lang}',docs:[],current:'',tab:'edit'}))`);
  await b.goto(base);if(lang==='ar')await b.click('#btnUi');
  await b.click('#btnDocs');await b.click('[data-act=sample]');
  await b.send('Emulation.setEmulatedMedia',{media:'print'});await b.pdf('/tmp/cv-'+lang+'.pdf');await b.send('Emulation.setEmulatedMedia',{media:''});
  const txt=execSync('pdftotext /tmp/cv-'+lang+'.pdf -').toString();
  const pages=+execSync('pdfinfo /tmp/cv-'+lang+'.pdf').toString().match(/Pages:\s+(\d+)/)[1];
  assert.strictEqual(pages,1);
  assert(/@example\.com/.test(txt));assert(txt.includes('250,000'));
  assert(lang==='en'?txt.includes('EXPERIENCE')&&txt.includes('Nile Retail'):/النيل/.test(txt)||/للتجزئة/.test(txt));
  console.log('ok pdf text layer',lang,pages+' page, '+txt.length+' chars');
 }}catch(e){console.error('FAIL',e.message);process.exitCode=1}finally{b.close()}process.exit(process.exitCode||0)})();
