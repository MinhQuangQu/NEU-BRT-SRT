/* ============================================================
   filter.js - Filter/search logic for News and Papers
   ============================================================ */

'use strict';

/* ---------------- NEWS LIST ---------------- */
const NEWS_PER_PAGE = 10;
let allNews = [];
let newsState = { filter: 'All', query: '', page: 1 };

async function initNewsPage() {
  try {
    allNews = await fetchData('news.json');
  } catch (e) {
    console.error('initNewsPage:', e);
    return;
  }

  const tabsContainer = document.querySelector('#news-tabs');
  if (tabsContainer) {
    const categories = ['All', ...new Set(allNews.map((n) => n.category))];
    tabsContainer.innerHTML = categories
      .map((cat) => `<button class="tab ${cat === 'All' ? 'tab--active' : ''}" data-filter="${cat}">${sanitize(cat)}</button>`)
      .join('');

    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabsContainer.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('tab--active'));
      btn.classList.add('tab--active');
      newsState.filter = btn.dataset.filter;
      newsState.page = 1;
      renderNewsPage();
    });
  }

  const searchInput = document.querySelector('#news-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      newsState.query = searchInput.value.toLowerCase().trim();
      newsState.page = 1;
      renderNewsPage();
    });
  }

  renderNewsPage();
}

function filteredNews() {
  return allNews
    .filter((n) => newsState.filter === 'All' || n.category === newsState.filter)
    .filter((n) => {
      const q = newsState.query;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return b.date.localeCompare(a.date);
    });
}

function newsItemTemplate(item) {
  const d = formatNewsDate(item.date);
  const catClass = newsCategoryClass(item.category);
  const href = `post-detail.html?id=${encodeURIComponent(item.id)}`;

  return `
    <article class="card news-item" role="article">
      <div class="news-date">
        <span class="news-date__day">${d.day}</span>
        <span class="news-date__month">${d.monthYear}</span>
      </div>
      <div class="news-main">
        <div class="news-meta">
          ${item.pinned ? '<span class="badge badge--pin">Pinned</span>' : ''}
          <span class="badge ${catClass}">${sanitize(item.category)}</span>
        </div>
        <a class="news-title" href="${href}">${sanitize(item.title)}</a>
      </div>
      <a class="news-arrow" href="${href}" aria-label="Open news item">></a>
    </article>`;
}

function renderNewsPage() {
  const list = filteredNews();
  const paged = paginate(list, newsState.page, NEWS_PER_PAGE);

  renderList('#news-list', paged, newsItemTemplate, 'No news items match the current filter.');

  const countEl = document.querySelector('#news-count');
  if (countEl) {
    countEl.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;
  }

  renderPagination('#news-pagination', list.length, newsState.page, NEWS_PER_PAGE, (nextPage) => {
    newsState.page = nextPage;
    renderNewsPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------- NEWS DETAIL ---------------- */
async function initNewsDetailPage() {
  const titleEl = document.querySelector('#news-detail-title');
  if (!titleEl) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    titleEl.textContent = 'News item not found';
    const body = document.querySelector('#news-detail-body');
    if (body) body.innerHTML = '<p>The requested item id is missing.</p>';
    return;
  }

  let item;
  try {
    const data = await fetchData('news.json');
    item = data.find((n) => String(n.id) === id);
  } catch (e) {
    console.error('initNewsDetailPage:', e);
    titleEl.textContent = 'Unable to load news item';
    return;
  }

  if (!item) {
    titleEl.textContent = 'News item not found';
    const body = document.querySelector('#news-detail-body');
    if (body) body.innerHTML = '<p>This announcement may have been removed.</p>';
    return;
  }

  const categoryEl = document.querySelector('#news-detail-category');
  const authorEl = document.querySelector('#news-detail-author');
  const dateEl = document.querySelector('#news-detail-date');
  const bodyEl = document.querySelector('#news-detail-body');

  if (categoryEl) categoryEl.textContent = String(item.category || '').toUpperCase();
  titleEl.textContent = item.title || 'Untitled';
  if (authorEl) authorEl.textContent = item.author || 'Admin';
  if (dateEl) {
    const parsed = new Date(item.date);
    if (Number.isNaN(parsed.getTime())) {
      dateEl.textContent = item.date || '';
    } else {
      dateEl.textContent = parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    }
  }
  if (bodyEl) bodyEl.innerHTML = safeHTML(item.body || '<p>No content.</p>');
}

/* ---------------- PAPERS ---------------- */
const PAPERS_PER_PAGE = 8;
let allPapers = [];
let papersState = { type: 'All', query: '', page: 1 };

async function initPapersPage() {
  try {
    allPapers = await fetchData('papers.json');
  } catch (e) {
    console.error('initPapersPage:', e);
    return;
  }

  const typeSelect = document.querySelector('#paper-type');
  if (typeSelect) {
    const types = ['All', ...new Set(allPapers.map((p) => p.type))];
    typeSelect.innerHTML = types.map((t) => `<option value="${t}">${t}</option>`).join('');

    const queryType = new URLSearchParams(window.location.search).get('type');
    if (queryType && types.includes(queryType)) {
      papersState.type = queryType;
      typeSelect.value = queryType;
    }

    typeSelect.addEventListener('change', () => {
      papersState.type = typeSelect.value;
      papersState.page = 1;
      renderPapersPage();
    });
  }

  const searchInput = document.querySelector('#paper-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      papersState.query = searchInput.value.toLowerCase().trim();
      papersState.page = 1;
      renderPapersPage();
    });
  }

  renderPapersPage();
}

function filteredPapers() {
  const q = papersState.query;
  return allPapers
    .filter((p) => papersState.type === 'All' || p.type === papersState.type)
    .filter((p) => {
      if (!q) return true;
      const authors = (p.authors || []).join(' ').toLowerCase();
      return p.title.toLowerCase().includes(q) || authors.includes(q) || (p.venue || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.id || '').localeCompare(a.id || '');
    });
}

function paperItemTemplate(paper, index) {
  const authors = paper.authors || [];
  const lead = authors[0] || '';
  const rest = authors.slice(1).join(', ');
  const showIndex = String(index + 1).padStart(2, '0');
  const doi = (paper.doi || '').trim();
  const doiLink = doi
    ? (doi.startsWith('http://') || doi.startsWith('https://') ? doi : `https://doi.org/${doi}`)
    : '';

  return `
    <article class="card paper-item">
      <span class="paper-index">${showIndex}</span>
      <div class="paper-main">
        <h3 class="paper-title">
          ${doiLink
            ? `<a href="${sanitize(doiLink)}" target="_blank" rel="noopener noreferrer">${sanitize(paper.title)}</a>`
            : sanitize(paper.title)}
        </h3>
        <p class="paper-authors">
          ${lead ? `<span class="lead-author">${sanitize(lead)}</span>` : ''}
          ${rest ? `, ${sanitize(rest)}` : ''}
        </p>
        <div class="paper-badges">
          <span class="paper-chip paper-chip--type">${sanitize(paper.type || 'N/A')}</span>
          <span class="paper-meta-inline paper-venue">${sanitize(paper.venue || '')}</span>
          <span class="paper-meta-inline">${sanitize(String(paper.year || ''))}</span>
          ${paper.if ? `<span class="paper-chip paper-chip--if">IF ${sanitize(String(paper.if))}</span>` : ''}
          ${paper.jcr ? `<span class="paper-chip paper-chip--jcr">${sanitize(String(paper.jcr))}</span>` : ''}
        </div>
      </div>
      ${doi
        ? `<button class="paper-copy" data-doi="${sanitize(doi)}" onclick="handleCopyDoi(this)" aria-label="Copy DOI">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>`
        : ''}
    </article>`;
}

function renderPapersPage() {
  const list = filteredPapers();
  const pageItems = paginate(list, papersState.page, PAPERS_PER_PAGE);

  const baseIndex = (papersState.page - 1) * PAPERS_PER_PAGE;
  renderList(
    '#papers-list',
    pageItems,
    (paper, i) => paperItemTemplate(paper, baseIndex + i),
    'No publications match the selected filters.'
  );

  const countEl = document.querySelector('#paper-count');
  if (countEl) {
    countEl.textContent = `Showing ${list.length} of ${allPapers.length} publications`;
  }

  renderPagination('#paper-pagination', list.length, papersState.page, PAPERS_PER_PAGE, (nextPage) => {
    papersState.page = nextPage;
    renderPapersPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

window.handleCopyDoi = function handleCopyDoi(btn) {
  const doi = btn.getAttribute('data-doi');
  if (!doi) return;
  copyText(doi, btn);
};
