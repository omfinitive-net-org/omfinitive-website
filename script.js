// =============================================
// OMFiNiTiVE Website Scripts
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Navigation scroll effect
  const nav = document.getElementById('nav');
  const handleScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', navLinks.classList.contains('active') ? 'true' : 'false');
    // Animate hamburger
    const spans = navToggle.querySelectorAll('span');
    if (navLinks.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      const spans = navToggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    });
  });

  // Hero particles
  const particlesContainer = document.getElementById('heroParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
      particle.style.animationDelay = (Math.random() * 10) + 's';
      particle.style.width = particle.style.height = (Math.random() * 3 + 1) + 'px';
      particlesContainer.appendChild(particle);
    }
  }

  // Scroll-triggered fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.solution-card, .feature-card, .contact-item, .value').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });

  // Stagger animation delays for grid items
  document.querySelectorAll('.solutions-grid .solution-card').forEach((card, i) => {
    card.style.animationDelay = (i * 0.15) + 's';
  });

  document.querySelectorAll('.features-grid .feature-card').forEach((card, i) => {
    card.style.animationDelay = (i * 0.1) + 's';
  });

  document.querySelectorAll('.about-values .value').forEach((val, i) => {
    val.style.animationDelay = (i * 0.1) + 's';
  });

  initPricing();
  initPersonaPicker();

  // Contact form handling via Cloudflare Worker
  const WORKER_URL = 'https://omfinitive-contact.omfinitive-net.workers.dev';
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  function showStatus(message, isError) {
    formStatus.textContent = message;
    formStatus.className = 'form-status ' + (isError ? 'form-status-error' : 'form-status-success');
    formStatus.style.display = 'block';
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      formStatus.style.display = 'none';

      // Get Turnstile token
      const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
      if (!turnstileToken) {
        showStatus('Please complete the captcha verification.', true);
        return;
      }

      const formData = new FormData(contactForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        organisation: formData.get('organisation'),
        // Several can be ticked: keys go comma-separated; the labels also travel in the
        // message so the enquiry email names them whatever Worker version is deployed.
        interest: formData.getAll('interest').join(','),
        message: formData.get('message'),
        interestLabel: Array.from(contactForm.querySelectorAll('input[name="interest"]:checked'))
          .map((c) => c.parentElement.textContent.trim()).join(', '),
        turnstileToken: turnstileToken,
      };

      // Validate
      if (!data.name || !data.email || !data.message) {
        showStatus('Please fill in all required fields.', true);
        return;
      }
      if (data.interestLabel) {
        data.message = 'Interested in: ' + data.interestLabel + '\n\n' + data.message;
      }
      delete data.interestLabel;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const response = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showStatus('Thank you! Your message has been sent successfully.', false);
          if (window.omfTrack) window.omfTrack('contact_form_submitted');
          contactForm.reset();
          // Reset Turnstile widget
          if (window.turnstile) {
            turnstile.reset();
          }
        } else {
          showStatus(result.error || 'Something went wrong. Please try again.', true);
        }
      } catch (err) {
        showStatus('Network error. Please check your connection and try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }

  // "Book a Demo" / "Request More Information" buttons all go to the contact
  // form; data-contact-intent seeds an empty message so the enquiry says why.
  const CONTACT_INTENTS = {
    demo: "I'd like to book a demo of OMFiNiTiVE.",
    info: "I'd like more information about OMFiNiTiVE.",
    ofsted: "I'd like a demo of Children's Homes & Ofsted Registration.",
    cqc: "I'd like a demo of CQC Registration.",
    setup: "I'd like OMFiNiTiVE set up for my organisation. Our service types are: ",
    migration: "We'd like help migrating our existing data (staff, training, care plans and/or policies) into OMFiNiTiVE. We currently use: ",
  };
  function prefillContact(intent) {
    const text = intent && CONTACT_INTENTS[intent];
    const msg = document.getElementById('message');
    if (!text || !msg) return;
    const seeded = Object.values(CONTACT_INTENTS).includes(msg.value.trim());
    if (!msg.value.trim() || seeded) msg.value = text;
    if (window.omfTrack) window.omfTrack('contact_cta_click', { intent: intent });
  }

  // Links from other pages (e.g. demo.html "/?intent=setup#contact") seed the
  // contact message the same way data-contact-intent does on this page.
  try {
    const qIntent = new URLSearchParams(location.search).get('intent');
    if (qIntent && CONTACT_INTENTS[qIntent]) prefillContact(qIntent);
  } catch (e) { /* old browsers: no prefill */ }

  // Deep link straight to an FAQ answer (#faq-...) opens it.
  if (location.hash && location.hash.length > 1) {
    const initial = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (initial && initial.tagName === 'DETAILS') initial.open = true;
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        // Links to an FAQ answer open it (e.g. "Explore Recruitment").
        if (target.tagName === 'DETAILS') target.open = true;
        prefillContact(anchor.dataset.contactIntent);
        const navHeight = nav.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
});

// =============================================
// Pricing: sector packages from the app's public packages API
// Mirrors frontend/fe/src/lib/sectorPricing.ts (category "sector", active,
// priced, sort_order). Fallback data renders first so the section is never
// empty; live data replaces it when the API answers (needs CORS for
// www.omfinitive.net on api.omfinitive.net).
// =============================================
const PACKAGES_URL = 'https://api.omfinitive.net/api/v1/packages';
const SIGNUP_URL = 'https://app.omfinitive.net/signup';

const CAPABILITY_NAMES = {
  hr_core: 'HR Core',
  payroll: 'Payroll & Attendance',
  recruitment: 'Recruitment & Eligibility',
  care: 'Care Delivery',
  medications: 'Medications (eMAR)',
  ecm: 'Electronic Call Monitoring',
  governance: 'Governance & Safety',
  compliance: 'Compliance & Quality',
};

// Snapshot of GET /api/v1/packages sector packages, 2026-11-08; Supported Living
// split into Adults/Children per updates/22 (children copies adults' pricing).
const FALLBACK_PACKAGES = [
  { key: 'domiciliary-care', name: 'Domiciliary Care', description: 'Provide quality care at home', category: 'sector', pepm_min: 28, pepm_max: 40, base_fee_min: 29, base_fee_max: 34, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'medications', 'ecm', 'governance', 'compliance'], recommended: false, sort_order: 5, is_active: true },
  { key: 'supported-living', name: 'Supported Living (Adults)', description: 'Provide support & accommodation', category: 'sector', pepm_min: 26, pepm_max: 38, base_fee_min: 32, base_fee_max: 45, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'medications', 'ecm', 'governance', 'compliance'], recommended: false, sort_order: 6, is_active: true },
  { key: 'supported-living-children', name: 'Supported Living (Children)', description: 'Support & accommodation for children', category: 'sector', pepm_min: 26, pepm_max: 38, base_fee_min: 32, base_fee_max: 45, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'medications', 'ecm', 'governance', 'compliance'], recommended: false, sort_order: 6.5, is_active: true },
  { key: 'healthcare-recruitment', name: 'Recruitment', description: 'Provide trained and qualified care staff', category: 'sector', pepm_min: 18, pepm_max: 24, base_fee_min: 19, base_fee_max: 24, modules: ['hr_core', 'payroll', 'recruitment', 'compliance'], recommended: false, sort_order: 7, is_active: true },
  { key: 'care-home', name: 'Care Home', description: 'Accommodation & care for the elderly', category: 'sector', pepm_min: 28, pepm_max: 40, base_fee_min: 34, base_fee_max: 46, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'medications', 'governance', 'compliance'], recommended: false, sort_order: 8, is_active: true },
  { key: 'childrens-home', name: 'Young Children', description: 'Accommodation & care for children', category: 'sector', pepm_min: 30, pepm_max: 42, base_fee_min: 36, base_fee_max: 48, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'governance', 'compliance'], recommended: false, sort_order: 9, is_active: true },
  { key: 'supported-accommodation-16', name: 'Supported Accommodation (16+)', description: 'Accommodation & support for young people 16+', category: 'sector', pepm_min: 22, pepm_max: 32, base_fee_min: 28, base_fee_max: 38, modules: ['hr_core', 'payroll', 'recruitment', 'care', 'governance', 'compliance'], recommended: false, sort_order: 10, is_active: true },
];

const SVG_OPEN = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const HEART = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>';
const SECTOR_ICONS = {
  'domiciliary-care': HEART,
  'supported-living': HEART + '<path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
  'healthcare-recruitment': '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  'care-home': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  'childrens-home': '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
  'supported-living-children': '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
  'supported-accommodation-16': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
};
const DEFAULT_ICON = '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>';

function escapeHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Pull the package list out of {success, data: [...]}, {data: {items}}, or a bare array. */
function extractPackages(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  const d = json.data !== undefined ? json.data : json;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.items)) return d.items;
  if (d && Array.isArray(d.packages)) return d.packages;
  return [];
}

/** Active, priced (never £0) sector packages in sort_order. */
function toSectorPlans(list) {
  return list
    .filter((p) => p && p.category === 'sector' && p.is_active !== false && p.key && p.name
      && Number(p.pepm_min) > 0 && Number(p.base_fee_min) > 0)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function planCard(p) {
  const baseMin = Number(p.base_fee_min);
  const baseMax = Number(p.base_fee_max) > baseMin ? Number(p.base_fee_max) : baseMin;
  const base = '+ &pound;' + money(baseMin) + (baseMax > baseMin ? '&ndash;&pound;' + money(baseMax) : '') + '/month base fee';
  const features = (Array.isArray(p.modules) ? p.modules : [])
    .map((m) => '<li>' + escapeHtml(CAPABILITY_NAMES[m] || m) + '</li>').join('');
  const rec = !!p.recommended;
  const href = SIGNUP_URL + '?package=' + encodeURIComponent(p.key);
  return '<article class="plan-card' + (rec ? ' is-recommended' : '') + '">'
    + (rec ? '<span class="plan-badge">Most Popular</span>' : '')
    + '<div class="plan-icon">' + SVG_OPEN + (SECTOR_ICONS[p.key] || DEFAULT_ICON) + '</svg></div>'
    + '<h3 class="plan-name">' + escapeHtml(p.name) + '</h3>'
    + '<p class="plan-desc">' + escapeHtml(p.description) + '</p>'
    + '<p class="plan-price"><span>from</span><strong>&pound;' + money(p.pepm_min) + '</strong><span>/employee/month</span></p>'
    + '<p class="plan-base">' + base + '</p>'
    + '<ul class="plan-features" aria-label="Included in ' + escapeHtml(p.name) + '">' + features + '</ul>'
    + '<a class="btn btn-lg ' + (rec ? 'btn-white' : 'btn-dark') + '" href="' + href + '" target="_blank" rel="noopener"'
    + ' data-plan="' + escapeHtml(p.key) + '" aria-label="Get started: ' + escapeHtml(p.name) + '">Get started</a>'
    + '</article>';
}

function renderPlans(grid, plans, source) {
  grid.innerHTML = plans.map(planCard).join('');
  grid.dataset.source = source;
}

function initPricing() {
  const grid = document.getElementById('pricingGrid');
  if (!grid) return;

  // Always show something immediately.
  renderPlans(grid, toSectorPlans(FALLBACK_PACKAGES), 'fallback');

  grid.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-plan]');
    if (a && window.omfTrack) window.omfTrack('select_plan', { package: a.dataset.plan });
  });

  if (!window.fetch) return;
  const ctrl = window.AbortController ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 8000);
  fetch(PACKAGES_URL, { headers: { Accept: 'application/json' }, credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((json) => {
      const plans = toSectorPlans(extractPackages(json));
      if (plans.length) renderPlans(grid, plans, 'live');
    })
    .catch(() => { /* keep the fallback cards */ })
    .finally(() => clearTimeout(timer));
}

// =============================================
// Demo page (demo.html): "Choose who to view as" persona picker.
// Panels are in the HTML (first one visible without JS); this only toggles.
// =============================================
function initPersonaPicker() {
  const cards = document.querySelectorAll('.persona-card[data-persona]');
  if (!cards.length) return;
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const key = card.dataset.persona;
      cards.forEach((c) => {
        const on = c === card;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      document.querySelectorAll('.persona-panel').forEach((p) => {
        p.hidden = p.id !== 'persona-' + key;
      });
      if (window.omfTrack) window.omfTrack('demo_persona_select', { persona: key });
    });
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-demo-open]');
    if (a && window.omfTrack) window.omfTrack('demo_open', { from: a.dataset.demoOpen });
  });
}

// =============================================
// Contact form: "Interested In" as a searchable, multi-select dropdown.
// Progressive enhancement over the grouped checkboxes in the fieldset: without
// JavaScript the checkboxes show as a plain list and still submit.
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const group = document.querySelector('.interest-group');
  const panel = group && group.querySelector('.interest-options');
  if (!group || !panel) return;
  const boxes = Array.from(panel.querySelectorAll('input[name="interest"]'));
  const labelOf = (cb) => cb.parentElement.textContent.trim();

  group.classList.add('ms-enhanced');
  panel.id = panel.id || 'interestPanel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Interested In options');
  panel.hidden = true;

  const control = document.createElement('div');
  control.className = 'ms-control';
  const chips = document.createElement('div');
  chips.className = 'ms-chips';
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = 'Search or select…';
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-expanded', 'false');
  search.setAttribute('aria-controls', panel.id);
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-label', 'Interested In: search options');
  search.autocomplete = 'off';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ms-toggle';
  toggle.setAttribute('aria-label', 'Show options');
  toggle.tabIndex = -1;
  chips.appendChild(search);
  control.append(chips, toggle);
  group.insertBefore(control, panel);

  const empty = document.createElement('p');
  empty.className = 'ms-empty';
  empty.textContent = 'No matches';
  empty.hidden = true;
  panel.appendChild(empty);

  const open = () => {
    if (!panel.hidden) return;
    panel.hidden = false;
    group.classList.add('ms-open');
    search.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    panel.hidden = true;
    group.classList.remove('ms-open');
    search.setAttribute('aria-expanded', 'false');
  };
  const visible = () => boxes.filter((cb) => !cb.parentElement.hidden);

  const filter = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    panel.querySelectorAll('.interest-col').forEach((col) => {
      let n = 0;
      col.querySelectorAll('.interest-option').forEach((opt) => {
        const hit = !q || opt.textContent.toLowerCase().includes(q);
        opt.hidden = !hit;
        if (hit) n++;
      });
      col.hidden = n === 0;
      shown += n;
    });
    empty.hidden = shown !== 0;
  };

  const renderChips = () => {
    chips.querySelectorAll('.ms-chip').forEach((c) => c.remove());
    boxes.filter((cb) => cb.checked).forEach((cb) => {
      const chip = document.createElement('span');
      chip.className = 'ms-chip';
      chip.textContent = labelOf(cb);
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'ms-chip-remove';
      x.setAttribute('aria-label', 'Remove ' + labelOf(cb));
      x.textContent = '×';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        cb.checked = false;
        renderChips();
        search.focus();
      });
      chip.appendChild(x);
      chips.insertBefore(chip, search);
    });
    search.placeholder = boxes.some((cb) => cb.checked) ? '' : 'Search or select…';
  };

  control.addEventListener('click', () => { open(); search.focus(); });
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hidden) { open(); search.focus(); } else { close(); }
  });
  search.addEventListener('input', () => { open(); filter(); });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); open();
      const v = visible(); if (v[0]) v[0].focus();
    } else if (e.key === 'Enter') {
      // Enter picks the first match instead of submitting the form.
      e.preventDefault();
      const v = visible();
      if (!panel.hidden && v[0] && search.value.trim()) {
        v[0].checked = !v[0].checked; renderChips(); search.value = ''; filter();
      } else { open(); }
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Backspace' && !search.value) {
      const last = boxes.filter((cb) => cb.checked).pop();
      if (last) { last.checked = false; renderChips(); }
    }
  });
  panel.addEventListener('change', () => { renderChips(); });
  panel.addEventListener('keydown', (e) => {
    const v = visible();
    const i = v.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (v[i + 1] || v[i] || v[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) search.focus(); else v[i - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); search.focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (i >= 0) { v[i].checked = !v[i].checked; renderChips(); } }
  });
  document.addEventListener('click', (e) => { if (!group.contains(e.target)) close(); });
  group.addEventListener('focusout', (e) => { if (!group.contains(e.relatedTarget)) close(); });
  const form = group.closest('form');
  if (form) form.addEventListener('reset', () => setTimeout(() => { search.value = ''; filter(); renderChips(); close(); }, 0));
  renderChips();
});
