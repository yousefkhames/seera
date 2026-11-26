(function () {
  'use strict';
  var C = window.SeeraCore, I = window.SEERA_I18N, KEY = 'seera.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var state = load();

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.docs) && s.docs.length) { if (!s.docs.some(function (d) { return d.id === s.current; })) s.current = s.docs[0].id; return s; }
    } catch (e) {}
    var ui = (navigator.language || '').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';
    var cv = C.emptyCV(ui);
    return { ui: ui, docs: [cv], current: cv.id, tab: 'edit' };
  }
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Storage full'); }
    }, 150);
  }
  function flush() { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function doc() { return state.docs.filter(function (d) { return d.id === state.current; })[0] || state.docs[0]; }
  function T(k) { return (I[state.ui] || I.en)[k] || k; }
  function TD(d, k) { return (I[d.lang] || I.en)[k] || k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2200); }

  /* ---------- shell ---------- */
  function renderShell() {
    document.documentElement.lang = state.ui;
    document.documentElement.dir = state.ui === 'ar' ? 'rtl' : 'ltr';
    $('#brandName').textContent = T('app');
    $('#brandTag').textContent = T('tag');
    $('#btnDocs').textContent = T('docs');
    $('#btnUi').textContent = T('uiLang');
    var d = doc();
    $('#layout').dataset.tab = state.tab || 'edit';
    $('#tabs').innerHTML = ['edit', 'preview', 'check'].map(function (t) {
      return '<button role="tab" type="button" data-tab="' + t + '" aria-selected="' + ((state.tab || 'edit') === t) + '">' + T(t) + '</button>';
    }).join('');
    document.title = T('app') + ' - ' + (d.name || T('untitled'));
  }

  /* ---------- editor ---------- */
  function fld(label, key, val, opt) {
    opt = opt || {};
    var id = 'f_' + Math.random().toString(36).slice(2, 7);
    var attrs = (opt.arr ? ' data-arr="' + opt.arr + '" data-i="' + opt.i + '" data-k="' + key + '"' : ' data-f="' + key + '"');
    var inner = opt.area
      ? '<textarea id="' + id + '" rows="' + (opt.rows || 3) + '"' + attrs + '>' + esc(val) + '</textarea>'
      : '<input id="' + id + '" type="' + (opt.type || 'text') + '"' + (opt.ltr ? ' dir="ltr"' : '') + attrs + ' value="' + esc(val) + '"' + (opt.inputmode ? ' inputmode="' + opt.inputmode + '"' : '') + ' autocomplete="off">';
    return '<div class="fld ' + (opt.cls || '') + '"><label for="' + id + '">' + label + '</label>' + inner + (opt.hint ? '<small>' + opt.hint + '</small>' : '') + '</div>';
  }
  function sel(label, key, val, opts) {
    return '<div class="fld"><label>' + label + '</label><select data-f="' + key + '">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select></div>';
  }
  var COLORS = ['#0f766e', '#1d4ed8', '#7c3aed', '#be123c', '#b45309', '#1f2937'];
  function designCard(d) {
    return '<details class="card"><summary>' + T('template') + ' / ' + T('docLang') + '</summary><div class="grid2">' +
      sel(T('docLang'), 'lang', d.lang, [['en', 'English'], ['ar', 'العربية']]) +
      sel(T('template'), 'template', d.template, [['classic', T('t_classic')], ['modern', T('t_modern')], ['compact', T('t_compact')]]) +
      sel(T('font'), 'font', d.font, [['sans', T('f_sans')], ['serif', T('f_serif')]]) +
      sel(T('size'), 'size', d.size, [['s', T('s_s')], ['m', T('s_m')], ['l', T('s_l')]]) +
      '</div><div class="fld"><label>' + T('accent') + '</label><div class="swatches">' + COLORS.map(function (c) {
        return '<button type="button" class="sw" data-accent="' + c + '" style="background:' + c + '" aria-label="' + c + '" aria-pressed="' + (d.accent === c) + '"></button>';
      }).join('') + '</div></div></details>';
  }
  function personalCard(d) {
    return '<details class="card" open><summary>' + T('personal') + '</summary><div class="grid2">' +
      fld(T('name'), 'name', d.name, { cls: 'span2' }) + fld(T('jobtitle'), 'title', d.title, { cls: 'span2' }) +
      fld(T('email'), 'email', d.email, { type: 'email', ltr: true }) + fld(T('phone'), 'phone', d.phone, { type: 'tel', ltr: true, inputmode: 'tel' }) +
      fld(T('city'), 'city', d.city) + (d.kind === 'cv' ? fld(T('link'), 'link', d.link, { ltr: true }) : '') + '</div></details>';
  }
  function itemTools(arr, i, n) {
    return '<div class="tools"><button type="button" class="mini" data-act="up" data-arr="' + arr + '" data-i="' + i + '" aria-label="' + T('up') + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="mini" data-act="down" data-arr="' + arr + '" data-i="' + i + '" aria-label="' + T('down') + '"' + (i === n - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button type="button" class="mini danger" data-act="rm" data-arr="' + arr + '" data-i="' + i + '" aria-label="' + T('remove') + '">✕</button></div>';
  }
  function cvEditor(d) {
    var h = personalCard(d);
    h += '<details class="card" open><summary>' + T('summary') + '</summary>' + fld(T('summary'), 'summary', d.summary, { area: 1, rows: 5, hint: T('summaryHint') }) + '</details>';
    h += '<details class="card" open><summary>' + T('experience') + '</summary>';
    d.experience.forEach(function (e, i) {
      h += '<div class="item">' + itemTools('experience', i, d.experience.length) + '<div class="grid2">' +
        fld(T('role'), 'role', e.role, { arr: 'experience', i: i }) + fld(T('company'), 'company', e.company, { arr: 'experience', i: i }) +
        fld(T('place'), 'place', e.place, { arr: 'experience', i: i, cls: 'span2' }) +
        fld(T('start'), 'start', e.start, { arr: 'experience', i: i }) + fld(T('end'), 'end', e.end, { arr: 'experience', i: i }) +
        fld(T('bullets'), 'bullets', e.bullets, { arr: 'experience', i: i, area: 1, rows: 4, cls: 'span2', hint: T('bulletsHint') }) + '</div></div>';
    });
    h += '<button type="button" class="btn add" data-act="add" data-arr="experience">+ ' + T('addExp') + '</button></details>';
    h += '<details class="card"><summary>' + T('education') + '</summary>';
    d.education.forEach(function (e, i) {
      h += '<div class="item">' + itemTools('education', i, d.education.length) + '<div class="grid2">' +
        fld(T('degree'), 'degree', e.degree, { arr: 'education', i: i, cls: 'span2' }) + fld(T('school'), 'school', e.school, { arr: 'education', i: i, cls: 'span2' }) +
        fld(T('start'), 'start', e.start, { arr: 'education', i: i }) + fld(T('end'), 'end', e.end, { arr: 'education', i: i }) +
        fld(T('note'), 'note', e.note, { arr: 'education', i: i, cls: 'span2' }) + '</div></div>';
    });
    h += '<button type="button" class="btn add" data-act="add" data-arr="education">+ ' + T('addEdu') + '</button></details>';
    h += '<details class="card"><summary>' + T('skills') + ' / ' + T('languages') + ' / ' + T('certs') + '</summary>' +
      fld(T('skills'), 'skills', d.skills, { area: 1, rows: 3, hint: T('skillsHint') }) + fld(T('languages'), 'languages', d.languages) +
      fld(T('certs'), 'certs', d.certs, { area: 1, rows: 3, hint: T('certsHint') }) + '</details>';
    return h;
  }
  function letterEditor(d) {
    var h = personalCard(d);
    h += '<details class="card" open><summary>' + T('letter') + '</summary><div class="grid2">' +
      fld(T('recipient'), 'recipient', d.recipient, { cls: 'span2' }) + fld(T('company2'), 'company', d.company) + fld(T('role2'), 'role', d.role) +
      sel(T('tone'), 'tone', d.tone, [['formal', T('tone_formal')], ['friendly', T('tone_friendly')], ['bold', T('tone_bold')]]) +
      fld(T('years'), 'years', d.years, { inputmode: 'numeric' }) +
      fld(T('strengths'), 'strengths', d.strengths, { cls: 'span2' }) +
      fld(T('why'), 'why', d.why, { area: 1, rows: 2, cls: 'span2' }) + '</div>' +
      '<div class="row"><button type="button" class="btn" data-act="gen">' + T('generate') + '</button><button type="button" class="btn ghost" data-act="fromcv">' + T('fromCV') + '</button></div>' +
      fld(T('body'), 'body', d.body, { area: 1, rows: 10, hint: T('bodyHint') }) + '</details>';
    return h;
  }
  function renderEditor() {
    var d = doc();
    $('#paneEdit').innerHTML = '<div class="kindbar"><span class="pill">' + (d.kind === 'cv' ? T('cv') : T('letter')) + '</span><span class="saved">● ' + T('saved') + '</span></div>' +
      (d.kind === 'cv' && !d.name && !d.experience.length && !d.summary ? '<div class="hello"><b>' + T('helloT') + '</b><p>' + T('helloP') + '</p><button type="button" class="btn primary" data-act="sample">' + T('sample') + '</button></div>' : '') +
      designCard(d) + (d.kind === 'cv' ? cvEditor(d) : letterEditor(d)) + '<p class="foot">' + T('footer') + '</p>';
  }

  /* ---------- preview ---------- */
  function contactLine(d) {
    return [d.email, d.phone, d.city, d.kind === 'cv' ? d.link : ''].filter(Boolean).map(function (x) { return '<span dir="auto">' + esc(x) + '</span>'; }).join('<i class="dot">•</i>');
  }
  function sheetHTML(d) {
    var h = '<header class="s-head"><h1 dir="auto">' + esc(d.name || T('pName')) + '</h1>' + (d.title ? '<p class="s-title" dir="auto">' + esc(d.title) + '</p>' : '') +
      '<p class="s-contact">' + contactLine(d) + '</p></header>';
    if (d.kind === 'cv') {
      if (d.summary) h += '<section><h2>' + TD(d, 'summary') + '</h2><p dir="auto">' + esc(d.summary) + '</p></section>';
      var ex = d.experience.filter(function (e) { return e.role || e.company || e.bullets; });
      if (ex.length) {
        h += '<section><h2>' + TD(d, 'experience') + '</h2>';
        ex.forEach(function (e) {
          h += '<article><div class="s-row"><b dir="auto">' + esc([e.role, e.company].filter(Boolean).join(' - ')) + '</b><span class="s-date" dir="auto">' + esc([e.start, e.end].filter(Boolean).join(' - ')) + '</span></div>' +
            (e.place ? '<div class="s-sub" dir="auto">' + esc(e.place) + '</div>' : '') +
            (C.bulletsOf(e.bullets).length ? '<ul>' + C.bulletsOf(e.bullets).map(function (b) { return '<li dir="auto">' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</article>';
        });
        h += '</section>';
      }
      var ed = d.education.filter(function (e) { return e.degree || e.school; });
      if (ed.length) {
        h += '<section><h2>' + TD(d, 'education') + '</h2>';
        ed.forEach(function (e) {
          h += '<article><div class="s-row"><b dir="auto">' + esc([e.degree, e.school].filter(Boolean).join(' - ')) + '</b><span class="s-date" dir="auto">' + esc([e.start, e.end].filter(Boolean).join(' - ')) + '</span></div>' + (e.note ? '<div class="s-sub" dir="auto">' + esc(e.note) + '</div>' : '') + '</article>';
        });
        h += '</section>';
      }
      if (C.listOf(d.skills).length) h += '<section><h2>' + TD(d, 'skills') + '</h2><p dir="auto">' + esc(C.listOf(d.skills).join(d.lang === 'ar' ? '، ' : ', ')) + '</p></section>';
      if (C.listOf(d.languages).length) h += '<section><h2>' + TD(d, 'languages') + '</h2><p dir="auto">' + esc(C.listOf(d.languages).join(d.lang === 'ar' ? '، ' : ', ')) + '</p></section>';
      if (C.bulletsOf(d.certs).length) h += '<section><h2>' + TD(d, 'certs') + '</h2><ul>' + C.bulletsOf(d.certs).map(function (b) { return '<li dir="auto">' + esc(b) + '</li>'; }).join('') + '</ul></section>';
    } else {
      var g = C.generateLetter(d);
      var paras = (d.body && d.body.trim()) ? d.body.trim().split(/\n{2,}|\r?\n/).filter(Boolean) : g.paragraphs;
      h += '<section class="letter"><p dir="auto">' + esc(g.greeting) + '</p>' + paras.map(function (p) { return '<p dir="auto">' + esc(p) + '</p>'; }).join('') +
        '<p class="bye" dir="auto">' + esc(g.bye) + '<br>' + esc(d.name) + '</p></section>';
    }
    return h;
  }
  function renderPreview() {
    var d = doc(), s = $('#sheet');
    s.className = 'sheet t-' + d.template + ' f-' + d.font + ' z-' + d.size;
    s.dir = d.lang === 'ar' ? 'rtl' : 'ltr';
    s.lang = d.lang;
    s.style.setProperty('--acc', d.accent);
    s.innerHTML = sheetHTML(d);
    $('#pvBar').innerHTML = '<button class="btn primary" type="button" data-act="pdf">' + T('pdf') + '</button><button class="btn" type="button" data-act="txt">' + T('txt') + '</button><button class="btn" type="button" data-act="copy">' + T('copy') + '</button>';
  }

  /* ---------- ATS panel ---------- */
  function renderCheck() {
    var d = doc(), p = $('#paneCheck'), h = '';
    var keep = document.activeElement && document.activeElement.id === 'jobBox';
    if (d.kind === 'cv') {
      var r = C.atsCheck(d);
      var col = r.score >= 80 ? '#2f855a' : r.score >= 55 ? '#c77d0a' : '#c0392b';
      h += '<div class="score"><div class="ring" style="--p:' + r.score + ';--c:' + col + '"><b>' + r.score + '</b></div><div><h2>' + T('score') + '</h2><small>' + T('scoreNote') + ' (' + r.words + ' ' + T('words') + ')</small></div></div>';
      h += '<ul class="checks">' + r.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (c.ok ? '✓' : '✗') + '</span><span>' + T('c_' + c.id) + '</span></li>'; }).join('') + '</ul>';
    }
    h += '<div class="fld"><label for="jobBox">' + T('jobPaste') + '</label><textarea id="jobBox" data-f="job" rows="6">' + esc(d.job) + '</textarea><small>' + T('jobHint') + '</small></div><div id="jobRes"></div>';
    h += '<div class="tipbox"><b>' + T('tips') + '</b><ul><li>' + T('tip1') + '</li><li>' + T('tip2') + '</li><li>' + T('tip3') + '</li></ul></div>';
    p.innerHTML = h;
    renderJobRes();
  }
  function renderJobRes() {
    var d = doc(), el = $('#jobRes'); if (!el) return;
    if (!(d.job || '').trim()) { el.innerHTML = '<p class="muted">' + T('noJob') + '</p>'; return; }
    var text = d.kind === 'cv' ? C.cvPlainText(d) : C.letterText(d);
    var m = C.matchJob(text, d.job);
    if (m.score == null) { el.innerHTML = '<p class="muted">' + T('noJob') + '</p>'; return; }
    el.innerHTML = '<div class="match"><b>' + T('match') + ': ' + m.score + '%</b><div class="bar"><i style="width:' + m.score + '%"></i></div></div>' +
      '<p class="lbl">' + T('missing') + ' (' + m.missing.length + ')</p><div class="chips">' + m.missing.map(function (w) { return '<button type="button" class="chip no" data-act="addkw" data-w="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>' +
      (d.kind === 'cv' ? '<small>' + T('addSkill') + '</small>' : '') +
      '<p class="lbl">' + T('found') + ' (' + m.found.length + ')</p><div class="chips">' + m.found.map(function (w) { return '<span class="chip ok">' + esc(w) + '</span>'; }).join('') + '</div>';
  }
  function refreshLive() { renderPreview(); renderCheckLive(); }
  function renderCheckLive() {
    var d = doc();
    if (document.activeElement && document.activeElement.id === 'jobBox') { renderJobRes(); return; }
    renderCheck();
  }
  function renderAll() { renderShell(); renderEditor(); renderPreview(); renderCheck(); }

  /* ---------- docs dialog ---------- */
  function docsDialog() {
    var dlg = $('#dlgDocs');
    dlg.innerHTML = '<div class="dlg"><div class="dlg-h"><h2>' + T('docs') + '</h2><button class="mini" data-act="closedlg" type="button" aria-label="' + T('close') + '">✕</button></div>' +
      '<ul class="doclist">' + state.docs.map(function (x) {
        return '<li class="' + (x.id === state.current ? 'cur' : '') + '"><button type="button" class="open" data-act="opendoc" data-id="' + x.id + '"><b dir="auto">' + esc(x.name || T('untitled')) + '</b><small>' + (x.kind === 'cv' ? T('cv') : T('letter')) + ' · ' + (x.lang === 'ar' ? 'العربية' : 'English') + (x.title || x.role ? ' · ' + esc(x.title || x.role) : '') + '</small></button>' +
          '<button type="button" class="mini" data-act="dupdoc" data-id="' + x.id + '" aria-label="' + T('dup') + '">⧉</button><button type="button" class="mini danger" data-act="deldoc" data-id="' + x.id + '" aria-label="' + T('del') + '">✕</button></li>';
      }).join('') + '</ul>' +
      '<div class="row wrap"><button class="btn primary" type="button" data-act="newcv">+ ' + T('newcv') + '</button><button class="btn" type="button" data-act="newletter">+ ' + T('newletter') + '</button><button class="btn ghost" type="button" data-act="sample">' + T('sample') + '</button></div>' +
      '<div class="row wrap"><button class="btn ghost" type="button" data-act="exportjson">' + T('json') + '</button><button class="btn ghost" type="button" data-act="importjson">' + T('import') + '</button></div><p class="foot">' + T('private') + '</p></div>';
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- actions ---------- */
  function download(name, text, type) {
    var b = new Blob([text], { type: type + ';charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function fname(d, ext) { return ((d.name || 'seera').trim().replace(/[^\p{L}\p{N}]+/gu, '_') || 'seera') + '_' + (d.kind === 'cv' ? 'CV' : 'Letter') + '.' + ext; }
  function docText(d) { return d.kind === 'cv' ? C.cvToText(d) : C.letterText(d) + '\n'; }
  function touch(d) { d.updated = Date.now(); save(); }
  function setCur(id) { state.current = id; save(); renderAll(); }
  function newDoc(d) { state.docs.unshift(d); state.current = d.id; state.tab = 'edit'; save(); renderAll(); }

  var actions = {
    pdf: function () {
      var d = doc(), old = document.title;
      document.title = fname(d, 'pdf').replace(/\.pdf$/, '');
      state.tab = state.tab; window.print();
      setTimeout(function () { document.title = old; }, 800);
      toast(T('printHelp'));
    },
    txt: function () { var d = doc(); download(fname(d, 'txt'), docText(d), 'text/plain'); },
    copy: function () {
      var t = docText(doc());
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast(T('copied')); }, function () {
        var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(T('copied')); } catch (e) {} ta.remove();
      });
    },
    add: function (el) {
      var d = doc(), a = el.dataset.arr;
      d[a].push(a === 'experience' ? { role: '', company: '', place: '', start: '', end: '', bullets: '' } : { degree: '', school: '', start: '', end: '', note: '' });
      touch(d); renderEditor(); renderPreview(); renderCheck();
      var last = document.querySelectorAll('#paneEdit .item'); if (last.length) { var inputs = last[last.length - 1].querySelector('input'); if (inputs) inputs.focus(); }
    },
    rm: function (el) { var d = doc(); d[el.dataset.arr].splice(+el.dataset.i, 1); touch(d); renderEditor(); refreshLive(); },
    up: function (el) { var d = doc(), a = d[el.dataset.arr], i = +el.dataset.i; if (i > 0) { a.splice(i - 1, 0, a.splice(i, 1)[0]); touch(d); renderEditor(); refreshLive(); } },
    down: function (el) { var d = doc(), a = d[el.dataset.arr], i = +el.dataset.i; if (i < a.length - 1) { a.splice(i + 1, 0, a.splice(i, 1)[0]); touch(d); renderEditor(); refreshLive(); } },
    gen: function () {
      var d = doc();
      if (d.body.trim() && !confirm(T('gen_confirm'))) return;
      d.body = C.generateLetter(d).paragraphs.join('\n\n'); touch(d); renderEditor(); refreshLive();
    },
    fromcv: function () {
      var d = doc(), cv = state.docs.filter(function (x) { return x.kind === 'cv' && (x.name || x.email); })[0];
      if (!cv) { toast(T('noCV')); return; }
      ['name', 'title', 'email', 'phone', 'city'].forEach(function (k) { d[k] = cv[k]; });
      if (!d.strengths) d.strengths = C.listOf(cv.skills).slice(0, 4).join(', ');
      touch(d); renderEditor(); refreshLive();
    },
    addkw: function (el) {
      var d = doc(); if (d.kind !== 'cv') return;
      d.skills = (d.skills ? d.skills.replace(/[,\s]+$/, '') + ', ' : '') + el.dataset.w; touch(d); renderEditor(); refreshLive();
    },
    opendoc: function (el) { $('#dlgDocs').close(); setCur(el.dataset.id); },
    dupdoc: function (el) {
      var s = state.docs.filter(function (x) { return x.id === el.dataset.id; })[0], c = JSON.parse(JSON.stringify(s));
      c.id = C.uid(); c.name = (c.name || T('untitled')) + ' (2)'; state.docs.unshift(c); state.current = c.id; save(); renderAll(); docsDialog();
    },
    deldoc: function (el) {
      if (!confirm(T('confirmDel'))) return;
      state.docs = state.docs.filter(function (x) { return x.id !== el.dataset.id; });
      if (!state.docs.length) state.docs.push(C.emptyCV(state.ui));
      if (!state.docs.some(function (x) { return x.id === state.current; })) state.current = state.docs[0].id;
      save(); renderAll(); docsDialog();
    },
    newcv: function () { $('#dlgDocs').close(); newDoc(C.emptyCV(state.ui)); },
    newletter: function () { $('#dlgDocs').close(); var l = C.emptyLetter(state.ui), cv = state.docs.filter(function (x) { return x.kind === 'cv'; })[0]; if (cv) ['name', 'title', 'email', 'phone', 'city'].forEach(function (k) { l[k] = cv[k]; }); newDoc(l); },
    sample: function () { $('#dlgDocs').close(); var l = state.ui, c = C.emptyCV(l), s = window.SEERA_SAMPLE[l]; Object.assign(c, JSON.parse(JSON.stringify(s))); newDoc(c); },
    closedlg: function () { $('#dlgDocs').close(); },
    exportjson: function () { download('seera-backup.json', JSON.stringify({ app: 'seera', version: 1, docs: state.docs }, null, 2), 'application/json'); },
    importjson: function () { $('#fileImport').click(); }
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-tab],[data-accent]'); if (!t) return;
    if (t.dataset.accent) { var d = doc(); d.accent = t.dataset.accent; touch(d); renderEditor(); renderPreview(); return; }
    if (t.dataset.tab && t.closest('#tabs')) { state.tab = t.dataset.tab; save(); renderShell(); return; }
    var fn = actions[t.dataset.act]; if (fn) fn(t);
  });
  document.addEventListener('input', function (e) {
    var el = e.target, d = doc();
    if (el.dataset.arr) { d[el.dataset.arr][+el.dataset.i][el.dataset.k] = el.value; touch(d); renderPreview(); renderCheckLive(); return; }
    if (el.dataset.f && el.closest('#paneEdit,#paneCheck')) {
      var k = el.dataset.f; d[k] = el.value; touch(d);
      if (k === 'lang' || k === 'tone') { renderEditor(); }
      renderPreview(); renderCheckLive(); document.title = T('app') + ' - ' + (d.name || T('untitled'));
    }
  });
  $('#btnUi').addEventListener('click', function () { state.ui = state.ui === 'ar' ? 'en' : 'ar'; save(); renderAll(); });
  $('#btnDocs').addEventListener('click', docsDialog);
  $('#fileImport').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var docs = C.validateImport(JSON.parse(r.result));
        if (!docs || !docs.length) throw 0;
        state.docs = docs.concat(state.docs); state.current = docs[0].id; save(); renderAll(); docsDialog(); toast(T('importOk') + ': ' + docs.length);
      } catch (x) { toast(T('importBad')); }
    };
    r.readAsText(f); e.target.value = '';
  });
  function fit() {
    var w = $('.sheet-wrap'); if (!w || !w.clientWidth) return;
    $('#sheet').style.setProperty('--zoom', Math.min(1, (w.clientWidth - 16) / 794).toFixed(3));
  }
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe($('.sheet-wrap'));
  var _ra = renderShell; renderShell = function () { _ra(); fit(); };
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);
  renderAll();
  window.__seera = { state: function () { return state; } };
})();
