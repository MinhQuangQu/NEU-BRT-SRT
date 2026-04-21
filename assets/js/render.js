/* ============================================================
   render.js - Generic JSON to DOM renderer utilities
   ============================================================ */

'use strict';

async function fetchData(file) {
  const url = `./_data/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function sanitize(value) {
  const tmp = document.createElement('div');
  tmp.textContent = String(value ?? '');
  return tmp.innerHTML;
}

function safeHTML(input) {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>')
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/&lt;br\s*\/?&gt;/g, '<br>')
    .replace(/&lt;p&gt;/g, '<p>')
    .replace(/&lt;\/p&gt;/g, '</p>')
    .replace(/&lt;ul&gt;/g, '<ul>')
    .replace(/&lt;\/ul&gt;/g, '</ul>')
    .replace(/&lt;li&gt;/g, '<li>')
    .replace(/&lt;\/li&gt;/g, '</li>');
}

function renderList(selector, items, templateFn, emptyText = 'No items found.') {
  const container = document.querySelector(selector);
  if (!container) return;
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">-</div>
        <p class="empty-state__text">${sanitize(emptyText)}</p>
      </div>`;
    return;
  }
  container.innerHTML = items.map(templateFn).join('');
}

function monthShort(month) {
  const arr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return arr[Math.max(0, Math.min(11, month - 1))] || 'JAN';
}

function formatNewsDate(dateStr) {
  const [year, month, day] = (dateStr || '').split('-').map((v) => parseInt(v, 10));
  if (!year || !month || !day) {
    return { day: '--', monthYear: '--- --', year: '', iso: '' };
  }
  const mm = monthShort(month);
  const yy = String(year).slice(-2);
  return {
    day: String(day).padStart(2, '0'),
    monthYear: `${mm} ${yy}`,
    year: String(year),
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function newsCategoryClass(cat) {
  const map = {
    Notice: 'badge--notice',
    Awards: 'badge--awards',
    Award: 'badge--awards',
    Publication: 'badge--publication',
    Event: 'badge--event',
  };
  return map[cat] || 'badge--category';
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = (link.getAttribute('href') || '').split('?')[0];
    const target = href.split('/').pop();
    if (target && target === page) {
      link.classList.add('active');
      const parentDropdown = link.closest('.nav-item--dropdown');
      if (parentDropdown) parentDropdown.classList.add('open');
    }
  });
}

function initNavbarInteractions() {
  const nav = document.querySelector('.navbar');
  const mobileBtn = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 10) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', navLinks.classList.contains('open') ? 'true' : 'false');
    });
  }

  const dropdowns = document.querySelectorAll('.nav-item--dropdown');
  dropdowns.forEach((item) => {
    const trigger = item.querySelector('.nav-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      if (window.matchMedia('(max-width: 640px)').matches) {
        e.preventDefault();
        item.classList.toggle('open');
        trigger.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
      }
    });
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target.closest('.navbar')) {
      if (navLinks) navLinks.classList.remove('open');
      dropdowns.forEach((item) => item.classList.remove('open'));
    }
  });
}

async function initSiteShell() {
  try {
    const lab = await fetchData('lab.json');
    const logoText = document.querySelector('.nav-logo__text');
    const logoSub = document.querySelector('.nav-logo__sub');
    if (logoText) logoText.textContent = lab.short_name || lab.name;
    if (logoSub) logoSub.textContent = lab.university || '';

    const footerContact = document.querySelector('.footer-contact-label');
    const footerEmail = document.querySelector('.footer-email');
    if (footerContact) footerContact.textContent = 'Contact us';
    if (footerEmail) {
      footerEmail.textContent = lab.email || '';
      footerEmail.href = `mailto:${lab.email || ''}`;
    }

    const titleEl = document.querySelector('title');
    if (titleEl && !titleEl.dataset.set) {
      titleEl.textContent = `${titleEl.textContent} | ${lab.short_name || lab.name || 'Lab'}`;
      titleEl.dataset.set = '1';
    }
  } catch (e) {
    console.warn('initSiteShell:', e);
  }
}

function paginate(items, page, perPage) {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

function renderPagination(selector, total, current, perPage, onPageChange) {
  const container = document.querySelector(selector);
  if (!container) return;

  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<button class="pagination__btn pagination__prev" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}"><</button>`;
  for (let i = 1; i <= totalPages; i += 1) {
    html += `<button class="pagination__btn ${i === current ? 'pagination__btn--active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="pagination__btn pagination__next" ${current === totalPages ? 'disabled' : ''} data-page="${current + 1}">></button>`;

  container.innerHTML = html;
  container.querySelectorAll('.pagination__btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page, 10)));
  });
}

async function copyText(text, trigger) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (trigger) {
      const prev = trigger.getAttribute('aria-label') || 'Copy';
      trigger.setAttribute('aria-label', 'Copied');
      setTimeout(() => trigger.setAttribute('aria-label', prev), 1200);
    }
  } catch (e) {
    console.warn('copyText failed:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initNavbarInteractions();
  initSiteShell();
});
