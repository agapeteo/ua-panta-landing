/* Panta — page behaviour: nav state, scroll reveals, marquee, waitlist */
(function () {
  'use strict';

  /* ---- sticky nav background on scroll ---- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- duplicate marquee content for seamless loop ---- */
  var strip = document.getElementById('strip');
  if (strip) strip.innerHTML += strip.innerHTML;

  /* ---- scroll reveal ---- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- waitlist form (submits to Web3Forms) ---- */
  var form = document.getElementById('waitlistForm');
  var note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = document.getElementById('email');
      var button = form.querySelector('button[type="submit"]');
      var val = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        note.textContent = 'Please enter a valid email address.';
        note.style.color = 'var(--accent-ink)';
        input.focus();
        return;
      }

      /* capture payload BEFORE disabling fields — disabled controls
         are excluded from FormData, which would strip the email */
      var payload = JSON.stringify(Object.fromEntries(new FormData(form)));

      /* pending state */
      if (button) button.disabled = true;
      input.disabled = true;
      note.textContent = 'Saving your seat…';
      note.style.color = '';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) throw new Error(data.message || 'Submission failed');
          if (window.gtag) gtag('event', 'generate_lead', { method: 'waitlist' });
          form.classList.add('form--done');
          form.innerHTML = '<input type="text" value="✓  You\'re on the list — see you in the quiet." readonly aria-live="polite" style="text-align:center;width:100%;" />';
          note.textContent = 'A seat is saved. We\'ll write once.';
          note.style.color = 'var(--forest)';
        })
        .catch(function () {
          if (button) button.disabled = false;
          input.disabled = false;
          note.textContent = 'Something went wrong — please try again.';
          note.style.color = 'var(--accent-ink)';
          input.focus();
        });
    });
  }

  /* ---- cookie consent banner (GA Consent Mode v2) ---- */
  var CONSENT_KEY = 'panta-consent';
  function setConsent(state) {
    try { localStorage.setItem(CONSENT_KEY, state); } catch (e) {}
    if (window.gtag) {
      var v = state === 'granted' ? 'granted' : 'denied';
      gtag('consent', 'update', {
        ad_storage: v,
        ad_user_data: v,
        ad_personalization: v,
        analytics_storage: v
      });
    }
  }

  var stored;
  try { stored = localStorage.getItem(CONSENT_KEY); } catch (e) { stored = null; }
  if (stored !== 'granted' && stored !== 'denied') {
    var banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p class="consent__text">We use a light touch of analytics to see how Panta is found. ' +
      'No ads, no selling — just the quiet numbers.</p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost" data-consent="denied">Decline</button>' +
      '<button type="button" class="btn btn--primary" data-consent="granted">Accept</button>' +
      '</div>';
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('consent--in'); });
    banner.addEventListener('click', function (ev) {
      var choice = ev.target.getAttribute('data-consent');
      if (!choice) return;
      setConsent(choice);
      banner.classList.remove('consent--in');
      banner.addEventListener('transitionend', function () { banner.remove(); }, { once: true });
    });
  }
})();
