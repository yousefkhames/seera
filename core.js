/* Seera core: pure logic, no DOM. Works in browser (window.SeeraCore) and Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SeeraCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOP_EN = 'a an and are as at be but by for from has have in is it its of on or our that the their this to we will with you your who not can all any more be been was were they them his her he she than then also into over about such per etc using use used need needs someone looking seeking required requirements ability able strong good great work working join team role candidate must should would could may one two years year plus preferred'.split(' ');
  var STOP_AR = 'في من على الى إلى عن مع هذا هذه ذلك تلك التي الذي الذين هو هي هم نحن انت أنت او أو ان أن إن كان كانت يكون تكون كل أي اي قد لا لم لن ما ثم حتى بين عند لدى كما أو و ب ل ك'.split(' ');
  var STOP = {};
  STOP_EN.concat(STOP_AR).forEach(function (w) { STOP[w] = 1; });

  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function emptyCV(lang) {
    return {
      id: uid(), kind: 'cv', lang: lang || 'en', template: 'classic', accent: '#0f766e', font: 'sans', size: 'm',
      name: '', title: '', email: '', phone: '', city: '', link: '', summary: '',
      experience: [], education: [], skills: '', languages: '', certs: '',
      job: '', updated: Date.now()
    };
  }
  function emptyLetter(lang) {
    return {
      id: uid(), kind: 'letter', lang: lang || 'en', template: 'classic', accent: '#0f766e', font: 'sans', size: 'm',
      name: '', title: '', email: '', phone: '', city: '',
      recipient: '', company: '', role: '', tone: 'formal', strengths: '', years: '', why: '', body: '',
      job: '', updated: Date.now()
    };
  }

  function normalizeDigits(s) {
    return String(s || '').replace(/[\u0660-\u0669]/g, function (d) { return d.charCodeAt(0) - 0x660; })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return d.charCodeAt(0) - 0x6F0; });
  }
  function stripMarks(s) {
    return String(s || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  }
  function tokens(text) {
    var t = stripMarks(normalizeDigits(text)).toLowerCase();
    var m = t.match(/[\p{L}\p{N}][\p{L}\p{N}+#.\-]*/gu) || [];
    return m.map(function (w) { return w.replace(/[.\-]+$/, ''); }).filter(Boolean);
  }
  function stem(w) {
    if (/[.+#]/.test(w)) return w;
    if (/^[a-z]/.test(w) && w.length > 4) {
      if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
      if (/(ing|ed)$/.test(w) && w.length > 5) return w.replace(/(ing|ed)$/, '');
      if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    }
    if (/^[\u0600-\u06FF]/.test(w) && w.length > 4) {
      w = w.replace(/^(وال|بال|لل|ال)/, '');
    }
    return w;
  }
  function keywords(text, limit) {
    var freq = {}, first = {}, shown = {};
    tokens(text).forEach(function (w, i) {
      if (w.length < 2 || STOP[w] || STOP[stripMarks(w)] || /^\d+$/.test(w)) return;
      var s = stem(w);
      if (STOP[s]) return;
      freq[s] = (freq[s] || 0) + 1;
      if (!(s in first)) { first[s] = i; shown[s] = w; }
    });
    var arr = Object.keys(freq).map(function (k) { return { word: k, shown: shown[k], n: freq[k], pos: first[k] }; });
    arr.sort(function (a, b) { return b.n - a.n || a.pos - b.pos; });
    return arr.slice(0, limit || 25);
  }

  function cvPlainText(cv) {
    var parts = [cv.name, cv.title, cv.email, cv.phone, cv.city, cv.link, cv.summary];
    (cv.experience || []).forEach(function (e) { parts.push(e.role, e.company, e.place, e.start, e.end, e.bullets); });
    (cv.education || []).forEach(function (e) { parts.push(e.degree, e.school, e.start, e.end, e.note); });
    parts.push(cv.skills, cv.languages, cv.certs);
    return parts.filter(Boolean).join('\n');
  }

  function matchJob(docText, jobText) {
    var jk = keywords(jobText, 30);
    if (!jk.length) return { score: null, found: [], missing: [] };
    var have = {};
    tokens(docText).forEach(function (w) { have[stem(w)] = 1; });
    var found = [], missing = [];
    jk.forEach(function (k) { (have[k.word] ? found : missing).push(k.shown); });
    return { score: Math.round(found.length / jk.length * 100), found: found, missing: missing };
  }

  function bulletsOf(s) {
    return String(s || '').split(/\r?\n/).map(function (l) { return l.replace(/^\s*[-•*·–]\s*/, '').trim(); }).filter(Boolean);
  }
  function listOf(s) {
    return String(s || '').split(/[,\n،؛;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* ATS checks: every check is a real rule evaluated on the data. */
  function atsCheck(cv) {
    var checks = [];
    function add(id, ok, weight, info) { checks.push({ id: id, ok: !!ok, weight: weight, info: info || '' }); }
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((cv.email || '').trim());
    var digits = normalizeDigits(cv.phone).replace(/\D/g, '');
    add('name', (cv.name || '').trim().split(/\s+/).filter(Boolean).length >= 2, 10);
    add('email', email, 10);
    add('phone', digits.length >= 8 && digits.length <= 15, 8, digits.length);
    add('title', (cv.title || '').trim().length >= 3, 6);
    var sw = tokens(cv.summary).length;
    add('summary', sw >= 25 && sw <= 90, 10, sw);
    var exp = (cv.experience || []).filter(function (e) { return (e.role || '').trim() && (e.company || '').trim(); });
    add('experience', exp.length >= 1, 14, exp.length);
    var allB = [];
    exp.forEach(function (e) { allB = allB.concat(bulletsOf(e.bullets)); });
    add('bullets', exp.length > 0 && exp.every(function (e) { return bulletsOf(e.bullets).length >= 2; }), 8, allB.length);
    var withNum = allB.filter(function (b) { return /\d/.test(normalizeDigits(b)); }).length;
    add('numbers', allB.length > 0 && withNum / allB.length >= 0.3, 8, withNum + '/' + allB.length);
    var dates = exp.length > 0 && exp.every(function (e) { return (e.start || '').trim(); });
    add('dates', dates, 5);
    add('education', (cv.education || []).some(function (e) { return (e.degree || '').trim() || (e.school || '').trim(); }), 6);
    add('skills', listOf(cv.skills).length >= 5, 10, listOf(cv.skills).length);
    var long = allB.filter(function (b) { return tokens(b).length > 35; }).length;
    add('longbullets', long === 0, 3, long);
    var wc = tokens(cvPlainText(cv)).length;
    add('length', wc >= 150 && wc <= 900, 2, wc);
    var total = 0, got = 0;
    checks.forEach(function (c) { total += c.weight; if (c.ok) got += c.weight; });
    var score = Math.round(got / total * 100);
    var job = cv.job ? matchJob(cvPlainText(cv), cv.job) : null;
    return { score: score, checks: checks, job: job, words: wc };
  }

  /* Cover letter generator: templates, no AI. Fills what the user gave. */
  var LETTER = {
    en: {
      formal: {
        hi: function (r) { return r ? 'Dear ' + r + ',' : 'Dear Hiring Manager,'; },
        open: 'I am writing to apply for the {role} position at {company}.',
        years: ' I bring {years} years of relevant experience.',
        str: ' My strengths include {strengths}.',
        why: ' {why}',
        close: 'I would welcome the chance to discuss how I can contribute to {company}. Thank you for your time and consideration.',
        bye: 'Sincerely,'
      },
      friendly: {
        hi: function (r) { return r ? 'Hello ' + r + ',' : 'Hello,'; },
        open: 'I was excited to see the {role} opening at {company}, and I would love to be considered.',
        years: ' I have spent {years} years doing work that fits this role.',
        str: ' What I do best: {strengths}.',
        why: ' {why}',
        close: 'I would be glad to talk more about the role. Thanks for reading, and I hope to hear from you.',
        bye: 'Best regards,'
      },
      bold: {
        hi: function (r) { return r ? 'Dear ' + r + ',' : 'Dear Hiring Team,'; },
        open: '{company} needs a {role}. I can start delivering from week one.',
        years: ' {years} years of hands-on experience back that up.',
        str: ' I am strong in {strengths}.',
        why: ' {why}',
        close: 'Let us talk. I can share examples of my work and answer any question you have.',
        bye: 'Regards,'
      }
    },
    ar: {
      formal: {
        hi: function (r) { return r ? 'السيد/ة ' + r + ' المحترم/ة،' : 'السادة مسؤولي التوظيف المحترمين،'; },
        open: 'يسعدني التقدم لوظيفة {role} لدى {company}.',
        years: ' لدي خبرة تتجاوز {years} سنوات في مجال العمل.',
        str: ' من أبرز نقاط قوتي: {strengths}.',
        why: ' {why}',
        close: 'أتطلع إلى فرصة لمناقشة كيف يمكنني الإسهام في نجاح {company}. أشكركم على وقتكم واهتمامكم.',
        bye: 'مع خالص التقدير،'
      },
      friendly: {
        hi: function (r) { return r ? 'مرحبا ' + r + '،' : 'مرحبا،'; },
        open: 'سعدت جدا برؤية فرصة {role} لدى {company}، وأتمنى أن يتم النظر في طلبي.',
        years: ' عملت {years} سنوات في مجال قريب من هذه الوظيفة.',
        str: ' أفضل ما أقدمه: {strengths}.',
        why: ' {why}',
        close: 'يسعدني أن نتحدث أكثر عن الوظيفة. شكرا لقراءتكم، وآمل أن أسمع منكم قريبا.',
        bye: 'تحياتي،'
      },
      bold: {
        hi: function (r) { return r ? 'السيد/ة ' + r + '،' : 'فريق التوظيف الكريم،'; },
        open: 'تحتاج {company} إلى {role}، وأستطيع البدء بالإنجاز من الأسبوع الأول.',
        years: ' خبرة عملية لمدة {years} سنوات تدعم ذلك.',
        str: ' أتميز في {strengths}.',
        why: ' {why}',
        close: 'يسعدني اللقاء ومشاركة أمثلة من عملي والإجابة عن أي سؤال.',
        bye: 'مع التحية،'
      }
    }
  };
  function fill(t, d) { return t.replace(/\{(\w+)\}/g, function (_, k) { return d[k]; }); }
  function generateLetter(l) {
    var set = (LETTER[l.lang] || LETTER.en)[l.tone] || LETTER.en.formal;
    var sep = l.lang === 'ar' ? '، ' : ', ';
    var d = {
      role: (l.role || '').trim() || (l.lang === 'ar' ? 'المنصب المعلن' : 'advertised'),
      company: (l.company || '').trim() || (l.lang === 'ar' ? 'شركتكم' : 'your company'),
      years: normalizeDigits(l.years).trim(), strengths: listOf(l.strengths).join(sep)
    };
    var p1 = fill(set.open, d);
    if (d.years && /^\d+$/.test(d.years)) p1 += fill(set.years, d);
    if (d.strengths) p1 += fill(set.str, d);
    if (l.why && l.why.trim()) p1 += ' ' + l.why.trim();
    return { greeting: set.hi((l.recipient || '').trim()), paragraphs: [p1, fill(set.close, d)], bye: set.bye };
  }
  function letterText(l) {
    var g = generateLetter(l);
    var body = (l.body && l.body.trim()) ? l.body.trim() : g.paragraphs.join('\n\n');
    return [g.greeting, '', body, '', g.bye, l.name].join('\n');
  }

  function cvToText(cv) {
    var L = cv.lang === 'ar' ? { s: 'الملخص', e: 'الخبرة العملية', ed: 'التعليم', sk: 'المهارات', lg: 'اللغات', ce: 'الشهادات' }
      : { s: 'SUMMARY', e: 'EXPERIENCE', ed: 'EDUCATION', sk: 'SKILLS', lg: 'LANGUAGES', ce: 'CERTIFICATIONS' };
    var out = [];
    out.push(cv.name); if (cv.title) out.push(cv.title);
    out.push([cv.email, cv.phone, cv.city, cv.link].filter(Boolean).join(' | '));
    if (cv.summary) out.push('', L.s, cv.summary);
    if ((cv.experience || []).length) {
      out.push('', L.e);
      cv.experience.forEach(function (e) {
        out.push([e.role, e.company, e.place].filter(Boolean).join(' - '));
        var dt = [e.start, e.end].filter(Boolean).join(' - '); if (dt) out.push(dt);
        bulletsOf(e.bullets).forEach(function (b) { out.push('- ' + b); });
        out.push('');
      });
    }
    if ((cv.education || []).length) {
      out.push(L.ed);
      cv.education.forEach(function (e) {
        out.push([e.degree, e.school].filter(Boolean).join(' - ') + (e.start || e.end ? ' (' + [e.start, e.end].filter(Boolean).join(' - ') + ')' : ''));
        if (e.note) out.push(e.note);
      });
      out.push('');
    }
    if (cv.skills) out.push(L.sk, listOf(cv.skills).join(', '), '');
    if (cv.languages) out.push(L.lg, listOf(cv.languages).join(', '), '');
    if (cv.certs) out.push(L.ce, bulletsOf(cv.certs).concat([]).join('\n'));
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  var EXP_ITEM = { role: '', company: '', place: '', start: '', end: '', bullets: '' };
  var EDU_ITEM = { degree: '', school: '', start: '', end: '', note: '' };
  function strOf(v, max) { return (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '')).slice(0, max); }
  function itemsOf(list, shape) {
    return (Array.isArray(list) ? list : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 40).map(function (x) {
      var o = {}; Object.keys(shape).forEach(function (k) { o[k] = strOf(x[k], k === 'bullets' || k === 'note' ? 3000 : 200); }); return o;
    });
  }
  /** Rebuild a document from untrusted data (import or old storage): every field gets the right type and length. */
  function sanitizeDoc(d) {
    if (!d || typeof d !== 'object' || (d.kind !== 'cv' && d.kind !== 'letter')) return null;
    var lang = d.lang === 'ar' ? 'ar' : 'en';
    var base = d.kind === 'cv' ? emptyCV(lang) : emptyLetter(lang);
    Object.keys(base).forEach(function (k) {
      if (['id', 'kind', 'lang', 'updated', 'experience', 'education'].indexOf(k) >= 0) return;
      base[k] = strOf(d[k], k === 'body' || k === 'job' || k === 'summary' || k === 'why' || k === 'strengths' ? 8000 : 500);
    });
    if (d.kind === 'cv') { base.experience = itemsOf(d.experience, EXP_ITEM); base.education = itemsOf(d.education, EDU_ITEM); }
    base.accent = /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : '#0f766e';
    base.template = ['classic', 'modern', 'compact'].indexOf(d.template) >= 0 ? d.template : 'classic';
    base.font = d.font === 'serif' ? 'serif' : 'sans';
    base.size = ['s', 'm', 'l'].indexOf(d.size) >= 0 ? d.size : 'm';
    if (d.kind === 'letter') base.tone = ['formal', 'friendly', 'bold'].indexOf(d.tone) >= 0 ? d.tone : 'formal';
    base.updated = Number(d.updated) > 0 ? Number(d.updated) : Date.now();
    if (typeof d.id === 'string' && /^[\w-]{1,40}$/.test(d.id)) base.id = d.id;
    return base;
  }

  function validateImport(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var docs = Array.isArray(obj.docs) ? obj.docs : (obj.kind ? [obj] : null);
    if (!docs) return null;
    return docs.map(sanitizeDoc).filter(Boolean).slice(0, 100).map(function (d) { d.id = uid(); return d; });
  }

  return { uid: uid, emptyCV: emptyCV, emptyLetter: emptyLetter, tokens: tokens, keywords: keywords, matchJob: matchJob,
    atsCheck: atsCheck, generateLetter: generateLetter, letterText: letterText, cvToText: cvToText, cvPlainText: cvPlainText,
    bulletsOf: bulletsOf, listOf: listOf, validateImport: validateImport, sanitizeDoc: sanitizeDoc, normalizeDigits: normalizeDigits };
});
