/* ============================================================
   map.js - Contact map + Members rendering
   ============================================================ */

'use strict';

/* ---------------- CONTACT PAGE ---------------- */
async function initContactMap() {
  let lab;
  try {
    lab = await fetchData('lab.json');
  } catch (e) {
    console.error('initContactMap:', e);
    return;
  }

  const bindings = {
    '#contact-name': lab.name,
    '#contact-university': lab.university,
    '#contact-address': lab.address,
    '#contact-room': lab.room,
    '#contact-email': lab.email,
    '#contact-phone': lab.phone,
  };

  Object.entries(bindings).forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = value || '';
  });

  const emailLink = document.querySelector('#contact-email-link');
  if (emailLink) {
    emailLink.textContent = lab.email || '';
    emailLink.href = `mailto:${lab.email || ''}`;
  }

  const phoneLink = document.querySelector('#contact-phone');
  if (phoneLink) {
    phoneLink.textContent = lab.phone || '';
    const cleaned = String(lab.phone || '').replace(/[^\d+]/g, '');
    phoneLink.href = cleaned ? `tel:${cleaned}` : '#';
  }

  const applyBtn = document.querySelector('#apply-btn');
  if (applyBtn && lab.apply_link) applyBtn.href = lab.apply_link;

  const recruitWrap = document.querySelector('#recruit-card-wrap');
  if (recruitWrap) recruitWrap.style.display = lab.recruiting ? '' : 'none';

  const mapEl = document.querySelector('#map');
  if (!mapEl || typeof L === 'undefined') return;

  const lat = lab.map_lat || 21.0039;
  const lng = lab.map_lng || 105.8412;

  const map = L.map('map', {
    center: [lat, lng],
    zoom: 15,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const marker = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#1B6EF3',
    fillColor: '#1B6EF3',
    fillOpacity: 0.8,
    weight: 2,
  }).addTo(map);

  marker.bindPopup(`<strong>${sanitize(lab.name || '')}</strong><br>${sanitize(lab.address || '')}`);
}

/* ---------------- MEMBERS PAGE ---------------- */
let allMembers = [];
let membersTab = 'current';
let membersLevel = 'All';

const ROLE_ORDER = ['professor', 'research-professor', 'phd', 'ms', 'undergrad', 'visiting'];
const ROLE_LABELS = {
  professor: 'Professor',
  'research-professor': 'Research Professor',
  phd: 'PhD Students',
  ms: 'MS Students',
  undergrad: 'Undergrad',
  visiting: 'Visiting',
};

async function initMembersPage() {
  try {
    allMembers = await fetchData('members.json');
  } catch (e) {
    console.error('initMembersPage:', e);
    return;
  }

  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('tab--active'));
      tab.classList.add('tab--active');
      membersTab = tab.dataset.tab;
      renderMembersPage();
    });
  });

  const levelSelect = document.querySelector('#member-level-filter');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      membersLevel = levelSelect.value;
      renderMembersPage();
    });
  }

  renderMembersPage();
}

function memberRowTemplate(member, isAlumni) {
  const photo = member.photo || '';
  const role = member.role || ROLE_LABELS[member.level] || '';

  return `
    <article class="card member-row ${isAlumni ? 'is-alumni' : ''}">
      ${photo
        ? `<img class="member-photo" src="${photo}" alt="${sanitize(member.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">
           <div class="member-photo-placeholder" style="display:none">M</div>`
        : `<div class="member-photo-placeholder">M</div>`}
      <div class="member-main">
        <h3 class="member-name">${sanitize(member.name)}</h3>
        <p class="member-role">${sanitize(role)}</p>
        ${member.department ? `<p class="member-dept">${sanitize(member.department)}</p>` : ''}
        ${member.affiliation ? `<p class="member-affiliation">${sanitize(member.affiliation)}</p>` : ''}
        ${isAlumni && member.graduated ? `<p class="member-grad">Graduation year: ${sanitize(member.graduated)}</p>` : ''}
      </div>
      <div class="member-links">
        ${member.email ? `<a href="mailto:${member.email}" aria-label="Email ${sanitize(member.name)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>` : ''}
        ${member.scholar ? `<a href="${member.scholar}" target="_blank" rel="noopener noreferrer" aria-label="Scholar ${sanitize(member.name)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z"/></svg>
        </a>` : ''}
      </div>
    </article>`;
}

function renderMembersPage() {
  const container = document.querySelector('#members-container');
  if (!container) return;

  let list = allMembers.filter((m) => m.category === membersTab);
  if (membersLevel !== 'All') {
    list = list.filter((m) => m.level === membersLevel);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">-</div>
        <p class="empty-state__text">No members found for this filter.</p>
      </div>`;
    const countEl = document.querySelector('#members-count');
    if (countEl) countEl.textContent = '0 members';
    return;
  }

  const groupedMarkup = ROLE_ORDER
    .filter((level) => list.some((m) => m.level === level))
    .map((level) => {
      const group = list.filter((m) => m.level === level);
      const title = ROLE_LABELS[level] || level;
      const rows = group.map((m) => memberRowTemplate(m, membersTab === 'alumni')).join('');

      return `
        <section class="member-group">
          <div class="group-heading">
            <span class="group-accent" aria-hidden="true"></span>
            <h2 class="group-title">${sanitize(title)}</h2>
            <span class="group-count">${group.length}</span>
          </div>
          <div class="member-list">${rows}</div>
        </section>`;
    })
    .join('');

  container.innerHTML = `<div class="member-groups">${groupedMarkup}</div>`;

  const countEl = document.querySelector('#members-count');
  if (countEl) countEl.textContent = `${list.length} member${list.length !== 1 ? 's' : ''}`;
}
