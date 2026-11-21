  // phones: horizontal pans become stacked flow sections, and the hero is shorter
  if (matchMedia('(max-width: 760px)').matches) {
    document.querySelectorAll('[data-sc-act="pan"]').forEach(function (sec) {
      sec.setAttribute('data-sc-act', 'flow'); sec.removeAttribute('data-sc-span'); sec.classList.add('sc-section', 'stack-section');
      var rail = sec.querySelector('[data-sc-pan]');
      if (rail) {
        rail.removeAttribute('data-sc-pan'); rail.classList.add('rail--stack', 'sc-wrap');
        rail.setAttribute('data-sc-in', ''); rail.setAttribute('data-sc-stagger', '70');
      }
    });
    var hero = document.querySelector('[data-sc-act="pin"]'); if (hero) hero.setAttribute('data-sc-span', '1.5');
    // keep the hero copy on screen until the hero leaves, so the lower half is not an empty band while scrolling
    var hcopy = document.querySelector('.hero-copy'); if (hcopy) hcopy.setAttribute('data-sc-cue', '0 1 0 0');
    // the photo sits at the top of a tall section on phones: finish unfolding while it is still mid-screen
    var fig = document.querySelector('.standing__photo'); if (fig) fig.setAttribute('data-sc-reveal-at', '0.06 0.27');
  }

  /* ================= language: English is the page; Arabic strings come from i18n.js ================= */
  var root = document.documentElement;
  var AR = (window.UM_I18N && window.UM_I18N.ar) || {};
  var LANG = root.getAttribute('lang') === 'ar' ? 'ar' : 'en';
  function tr(key, en) { return LANG === 'ar' && AR[key] !== undefined ? AR[key] : en; }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function applyLang(lang) {
    LANG = lang;
    root.setAttribute('lang', lang); root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    if (lang === 'ar' && window.__umArFonts) window.__umArFonts();
    each('[data-i18n]', function (el) {
      if (el.__en === undefined) el.__en = el.textContent;
      var k = el.getAttribute('data-i18n');
      el.textContent = lang === 'ar' && AR[k] !== undefined ? AR[k] : el.__en;
    });
    each('[data-i18n-html]', function (el) {
      if (el.__enH === undefined) el.__enH = el.innerHTML;
      var k = el.getAttribute('data-i18n-html');
      el.innerHTML = lang === 'ar' && AR[k] !== undefined ? AR[k] : el.__enH;
    });
    each('[data-i18n-attr]', function (el) {
      if (!el.__enA) el.__enA = {};
      el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
        var i = pair.indexOf(':'), a = pair.slice(0, i), k = pair.slice(i + 1);
        if (el.__enA[a] === undefined) el.__enA[a] = el.getAttribute(a);
        el.setAttribute(a, lang === 'ar' && AR[k] !== undefined ? AR[k] : el.__enA[a]);
      });
    });
    each('[data-i18n-part]', function (el) {
      if (el.__enP === undefined) el.__enP = el.getAttribute('data-part');
      var k = el.getAttribute('data-i18n-part');
      el.setAttribute('data-part', lang === 'ar' && AR[k] !== undefined ? AR[k] : el.__enP);
    });
    if (document.documentElement.__enTitle === undefined) {
      var md = document.querySelector('meta[name="description"]');
      root.__enTitle = document.title; root.__enDesc = md ? md.getAttribute('content') : '';
    }
    document.title = tr('meta.title', root.__enTitle);
    var md2 = document.querySelector('meta[name="description"]'); if (md2) md2.setAttribute('content', tr('meta.desc', root.__enDesc));
    var lb = document.getElementById('lang-btn');
    if (lb) {
      lb.textContent = lang === 'ar' ? 'English' : 'العربية';
      lb.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
      lb.setAttribute('aria-label', lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic');
    }
  }
  applyLang(LANG);   // before mount: the scroll engine splits headings, so they must already hold the right words

  ScrollCraft.mount(document.body);
  var SC = ScrollCraft.instances[ScrollCraft.instances.length - 1];
  document.getElementById('year').textContent = new Date().getFullYear();

  // the name is sized to run margin to margin: measure it at 100px, then scale the font to the room it has
  function fit() {
    each('[data-fit]', function (el) {
      var host = el.classList.contains('bigcall__num') ? el.parentElement : el;
      var hs = getComputedStyle(host);
      var avail = host.clientWidth - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight);
      if (!(avail > 0)) return;
      el.style.fontSize = '100px';
      var kids = el.children.length ? el.children : [el], w = 0;
      Array.prototype.forEach.call(kids, function (k) { if (k.offsetWidth) w = Math.max(w, k.offsetWidth); });
      if (w > 0) {
        var fs = 100 * avail / w * 0.995, cap = parseFloat(el.getAttribute('data-fit-max'));
        if (cap) fs = Math.min(fs, innerWidth * cap / 100);
        el.style.fontSize = fs.toFixed(2) + 'px';
      }
    });
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  // any face finishing its download (the Arabic fonts arrive late after a language switch) changes the text widths: re-fit and re-measure
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { fit(); if (SC && SC.layout) SC.layout(); });
  window.addEventListener('resize', fit);

  // opening hours, read in Abu Dhabi time: Saturday-Thursday 8:00-13:00 and 15:00-21:00, Friday closed
  function updateHours() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    } catch (e) { return; }
    var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ''; };
    var day = get('weekday'), mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
    var open = false, text;
    if (day === 'Fri') text = tr('h.fri', 'Closed today (Friday) · opens Saturday 8:00 AM');
    else if (mins >= 480 && mins < 780) { open = true; text = tr('h.open1', 'Open now · closes 1:00 PM'); }
    else if (mins >= 900 && mins < 1260) { open = true; text = tr('h.open2', 'Open now · closes 9:00 PM'); }
    else if (mins < 480) text = tr('h.early', 'Closed · opens 8:00 AM');
    else if (mins < 900) text = tr('h.break', 'Closed for the break · opens 3:00 PM');
    else text = day === 'Thu' ? tr('h.thu', 'Closed · opens Saturday 8:00 AM') : tr('h.night', 'Closed · opens 8:00 AM tomorrow');
    each('[data-open-text]', function (n) { n.textContent = text; });
    each('[data-open-dot]', function (n) { n.classList.toggle('dot--closed', !open); });
  }
  updateHours();

  (function () {
    var bar = document.querySelector('.site-bar');
    var onScroll = function () { bar.classList.toggle('is-scrolled', window.scrollY > 8); };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ================= job card: ticked services -> prefilled WhatsApp message ================= */
  var PHONE = '971505120476';
  var checks = Array.prototype.slice.call(document.querySelectorAll('.service-item input[type="checkbox"]'));
  var card = document.getElementById('jobcard');
  var jobList = document.getElementById('jobcard-list');
  var jobCount = document.getElementById('jobcard-count');
  function waLink(items) {
    var text = items.length
      ? tr('wa.quote', "Hi, I'd like a quote for:") + "\n" + items.map(function (i) { return "- " + i; }).join('\n')
      : tr('wa.ask', "Hi, I'd like to ask about a service at your workshop.");
    return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text);
  }
  function renderJobs() {
    var selected = checks.filter(function (c) { return c.checked; }).map(function (c) { return c.parentNode.querySelector('span').textContent.trim(); });
    jobList.innerHTML = '';
    selected.forEach(function (job) { var li = document.createElement('li'); li.textContent = job; jobList.appendChild(li); });
    jobCount.textContent = selected.length;
    card.classList.toggle('is-open', selected.length > 0);
    var link = waLink(selected);
    each('[data-wa]', function (a) { a.href = link; });
  }
  checks.forEach(function (c) { c.addEventListener('change', renderJobs); });
  document.getElementById('jobcard-clear').addEventListener('click', function () {
    checks.forEach(function (c) { c.checked = false; });
    renderJobs();
  });
  renderJobs();

  /* ================= theme + language buttons ================= */
  var themeBtn = document.getElementById('theme-btn');
  function setTheme(t, save) {
    root.setAttribute('data-theme', t);
    themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#231D16' : '#F6F4EF');
    if (save) { try { localStorage.setItem('um-theme', t); } catch (e) {} }
    root.style.removeProperty('--sc-canvas');   // the scroll engine writes the page colour inline; clear it so the new theme's colour shows at once
    if (SC && SC.read) SC.read();
  }
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  themeBtn.addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); });

  function switchLang(lang) {
    applyLang(lang);
    // headings the engine had split into line masks hold stale words: let it split them again
    if (SC && SC.acts) SC.acts.forEach(function (a) { a.cues.forEach(function (q) { if (q.kinetic) { q.el.__scSplit = null; q.units = null; q.el.classList.remove('sc-is-split'); } }); });
    renderJobs(); updateHours(); fit();
    if (window.__umEngineRefresh) window.__umEngineRefresh();
    var done = function () { fit(); if (SC && SC.layout) SC.layout(); };
    if (lang === 'ar' && document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('900 1em Cairo'), document.fonts.load('400 1em "IBM Plex Sans Arabic"')]).then(done, done);
    }
    done();
  }
  if (LANG === 'ar' && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); if (SC && SC.layout) SC.layout(); });

  /* ================= before / after slider ================= */
  (function () {
    var frame = document.getElementById('ba-frame'), range = document.getElementById('ba-range');
    if (!frame || !range) return;
    var touched = false, raf = 0;
    function set(v) { frame.style.setProperty('--pos', v.toFixed(2)); range.value = v; }
    range.addEventListener('input', function () { touched = true; cancelAnimationFrame(raf); set(parseFloat(range.value)); });
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { range.addEventListener(ev, function () { touched = true; cancelAnimationFrame(raf); }, { passive: true }); });
    range.addEventListener('pointerdown', function () { frame.classList.add('is-dragging'); });
    addEventListener('pointerup', function () { frame.classList.remove('is-dragging'); });
    set(50);
    // one slow demonstration when it first scrolls into view: out to the damage, across to the repair, back to the middle
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    var played = false;
    new IntersectionObserver(function (es) {
      if (played || !es[0].isIntersecting) return;
      played = true;
      var keys = [[0, 50], [0.28, 84], [0.66, 16], [1, 50]], dur = 2800, t0 = performance.now();
      function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
      (function step(now) {
        if (touched) return;
        var p = Math.min(1, (now - t0) / dur), i = 0;
        while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
        var a = keys[i], b = keys[i + 1], f = ease(Math.max(0, Math.min(1, (p - a[0]) / (b[0] - a[0]))));
        set(a[1] + (b[1] - a[1]) * f);
        if (p < 1) raf = requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 }).observe(frame);
  })();
