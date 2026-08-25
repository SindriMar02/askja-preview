/* Askja Apartment · ERA lineage. Vanilla + GSAP ScrollTrigger + Lenis
   (desktop only; Lenis never mounts on touch). Reveals enhance visible
   defaults: initial states are set from JS, so no-JS renders everything. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var body = document.body;

  function setChrome(v) {
    body.setAttribute('data-chrome', v === 'dark' ? 'dark' : 'light');
    var meta = document.getElementById('themeColor');
    if (meta) meta.setAttribute('content', v === 'dark' ? '#1E2C36' : '#F6F7F6');
  }

  /* ---------- booking form: request-to-book through the SNDR engine ---------- */
  var form = document.getElementById('bookForm');
  if (form) {
    var API = window.ASKJA_API || 'http://askja.localhost:8787';
    var $ = function (id) { return document.getElementById(id); };
    var errFor = { bkArrive: 'errArrive', bkDepart: 'errDepart', bkGuests: 'errGuests', bkName: 'errName', bkPhone: 'errPhone', bkEmail: 'errEmail' };
    Object.keys(errFor).forEach(function (id) {
      $(id).addEventListener('input', function () { $(errFor[id]).hidden = true; $('errForm').hidden = true; });
    });
    (function () {
      var t = new Date();
      var iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
      $('bkArrive').min = iso; $('bkDepart').min = iso;
    })();
    var REASON_TEXT = {
      ALREADY_BOOKED: 'Those nights are already requested or taken. Try other dates.',
      OVER_CAPACITY: 'The apartment sleeps six at most.',
      TOO_SOON: 'That arrival is too soon for an online request. Call the family instead.',
      TOO_FAR_AHEAD: 'That is further ahead than the calendar is open. Write to the family.',
      MIN_NIGHTS: 'That stay is too short to request online.',
      MAX_NIGHTS: 'That stay is longer than can be requested online. Write to the family.',
      CLOSED_DAY: 'The apartment is closed on those dates.',
      OUT_OF_SEASON: 'The apartment is closed on those dates.',
      INVALID_RANGE: 'Departure must come after arrival.'
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var arrive = $('bkArrive').value, depart = $('bkDepart').value;
      var guests = parseInt($('bkGuests').value, 10);
      var name = $('bkName').value.trim(), phone = $('bkPhone').value.trim(), email = $('bkEmail').value.trim();
      var msg = $('bkMsg').value.trim();
      var bad = [];
      function flag(id, when) { $(errFor[id]).hidden = !when; if (when) bad.push($(id)); }
      flag('bkArrive', !arrive);
      flag('bkDepart', !depart || (arrive && depart <= arrive));
      flag('bkGuests', !(guests >= 1 && guests <= 6));
      flag('bkName', !name);
      flag('bkPhone', !phone);
      flag('bkEmail', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      var errForm = $('errForm');
      if (bad.length) {
        errForm.textContent = 'Check the highlighted fields, then send again.';
        errForm.hidden = false; bad[0].focus(); return;
      }
      errForm.hidden = true;
      var btn = $('bkSubmit');
      btn.disabled = true; btn.textContent = 'Sending…';
      function fail(text) {
        btn.disabled = false; btn.textContent = 'Send the request';
        errForm.textContent = text; errForm.hidden = false;
      }
      fetch(API + '/booking/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'apartment', date: arrive, endDate: depart, people: guests,
          customer: { name: name, phone: phone, email: email }, note: msg
        })
      }).then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
        .then(function (r) {
          window.__bookResult = r;
          if (r.data && r.data.ok) {
            btn.disabled = false; btn.textContent = 'Send the request';
            form.hidden = true;
            $('bookRef').textContent = r.data.id || '';
            var done = $('bookDone'); done.hidden = false; done.focus && done.focus();
            return;
          }
          if (r.status === 409 && r.data.reasons && r.data.reasons.length) {
            var known = r.data.reasons.map(function (x) { return REASON_TEXT[x]; }).filter(Boolean);
            fail(known[0] || 'Those dates cannot be requested online. Call or write to the family.');
            return;
          }
          if (r.status === 503 && r.data.reason === 'paused') {
            fail('Online requests are paused right now. Call +354 861 1889.');
            return;
          }
          if (r.data && r.data.messages && r.data.messages.length) { fail(r.data.messages[0]); return; }
          fail('The request did not go through. Call +354 861 1889 or write to askjaehf@gmail.com.');
        }).catch(function () {
          fail(/github\.io$/.test(location.hostname)
          ? 'Online requests are not switched on in this design preview. Call +354 861 1889 or write to askjaehf@gmail.com.'
          : 'The booking desk cannot be reached right now. Call +354 861 1889 or write to askjaehf@gmail.com.');
        });
    });
  }

  /* ---------- reduced motion / no GSAP: static render + chrome swap ---------- */
  if (reduced || !window.gsap) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setChrome(en.target.getAttribute('data-theme-val'));
      });
    }, { rootMargin: '-8% 0% -85% 0%' });
    document.querySelectorAll('[data-theme-val]').forEach(function (s) { io.observe(s); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (!isTouch) {
    var lenis = new Lenis({ lerp: 0.1, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  }
  gsap.ticker.lagSmoothing(0);

  /* ---------- chrome theme per section ---------- */
  document.querySelectorAll('[data-theme-val]').forEach(function (sec) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 4rem', end: 'bottom 4rem',
      onToggle: function (self) { if (self.isActive) setChrome(sec.getAttribute('data-theme-val')); }
    });
  });

  /* ---------- hero: dive-in + char reveal + differential drift ---------- */
  var heroMedia = document.getElementById('heroMedia');
  gsap.fromTo(heroMedia, { scale: 2 }, { scale: 1, duration: 1.6, ease: 'expo.out', delay: 0.1 });

  var title = document.getElementById('heroTitle');
  var word = title.textContent;
  title.textContent = '';
  title.setAttribute('aria-label', word);
  word.split('').forEach(function (ch) {
    var s = document.createElement('span');
    s.className = 'char'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch;
    title.appendChild(s);
  });
  gsap.fromTo('.hero_title .char',
    { rotateY: 90, yPercent: 50, opacity: 0 },
    { rotateY: 0, yPercent: 0, opacity: 1, duration: 1.2, ease: 'power4.out', stagger: 0.05, delay: 0.55 });
  gsap.fromTo('.hero_label', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.85 });

  document.querySelectorAll('[data-drift]').forEach(function (el) {
    gsap.to(el, {
      yPercent: Number(el.getAttribute('data-drift')), ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  });
  gsap.to(heroMedia, {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- reveal primitives on scroll (enhancing visible defaults) ---------- */
  var EASE = 'expo.out';
  document.querySelectorAll('[data-lines]').forEach(function (el) {
    gsap.fromTo(el, { yPercent: 24, opacity: 0, clipPath: 'inset(0 0 38% 0)' },
      { yPercent: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' } });
  });
  document.querySelectorAll('.ctn').forEach(function (el) {
    gsap.fromTo(el, { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 1.1, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' } });
  });
  document.querySelectorAll('.slide').forEach(function (el) {
    var inner = el.querySelector('img');
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 84%', toggleActions: 'play none none none' } });
    tl.fromTo(el, { clipPath: 'polygon(0 6%, 100% 0%, 100% 100%, 0 100%)', yPercent: 10, opacity: 0 },
      { clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)', yPercent: 0, opacity: 1, duration: 1.2, ease: EASE }, 0);
    if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.5, ease: EASE, clearProps: 'scale' }, 0);
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
