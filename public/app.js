/* ── Week utilities ── */

function getCurrentWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

function weekLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return 'Week of ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function addWeeks(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function diffWeeks(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((a - b) / (7 * 24 * 3600 * 1000));
}

/* ── State ── */

let allEntries = [];
let editingId = null;

/* ── DOM helpers ── */

const $ = id => document.getElementById(id);

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  $( viewId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── API ── */

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 204) return null;
  return res.json();
}

async function loadEntries() {
  allEntries = await api('GET', '/reflections');
  return allEntries;
}

/* ── Form view ── */

function setupFormForWeek(weekStart, existingEntry) {
  $('form-week-label').textContent = weekLabel(weekStart);
  const form = $('reflection-form');
  form.querySelector('[name=wentWell]').value = existingEntry?.wentWell ?? '';
  form.querySelector('[name=blocked]').value = existingEntry?.blocked ?? '';
  form.querySelector('[name=differently]').value = existingEntry?.differently ?? '';
  form.querySelector('[name=proud]').value = existingEntry?.proud ?? '';
  form.querySelector('[name=nextWeekFocus]').value = existingEntry?.nextWeekFocus ?? '';
  editingId = existingEntry?.id ?? null;
  $('btn-delete').style.display = existingEntry ? 'inline-block' : 'none';
}

$('reflection-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const weekStart = getCurrentWeekStart();
  const payload = {
    wentWell: form.wentWell.value.trim(),
    blocked: form.blocked.value.trim(),
    differently: form.differently.value.trim(),
    proud: form.proud.value.trim(),
    nextWeekFocus: form.nextWeekFocus.value.trim(),
  };

  let result;
  if (editingId) {
    result = await api('PUT', `/reflections/${editingId}`, payload);
  } else {
    payload.weekStart = weekStart;
    result = await api('POST', '/reflections', payload);
    if (result?.error === 'Entry for this week already exists') {
      // race condition: entry appeared since page load — switch to edit
      editingId = result.existingId;
      result = await api('PUT', `/reflections/${editingId}`, payload);
    }
  }

  await loadEntries();
  renderStreak();
  toast(`Reflection saved for ${weekLabel(weekStart)}`);
  showView('view-history');
  renderHistory();

  // Show bookmark banner on first ever save
  const saved = localStorage.getItem('bookmarkDismissed');
  if (!saved && allEntries.length === 1) {
    $('bookmark-banner').classList.remove('hidden');
  }
});

$('btn-delete').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Delete this reflection? This cannot be undone.')) return;
  await api('DELETE', `/reflections/${editingId}`);
  await loadEntries();
  renderStreak();
  editingId = null;
  toast('Entry deleted.');
  const weekStart = getCurrentWeekStart();
  setupFormForWeek(weekStart, null);
  showView('view-form');
});

$('dismiss-bookmark').addEventListener('click', () => {
  localStorage.setItem('bookmarkDismissed', '1');
  $('bookmark-banner').classList.add('hidden');
});

/* ── History view ── */

function renderHistory() {
  const list = $('history-list');
  const empty = $('history-empty');
  list.innerHTML = '';

  if (allEntries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const PROMPTS = [
    { key: 'wentWell',      label: 'What went well' },
    { key: 'blocked',       label: 'What was blocked' },
    { key: 'differently',   label: 'What would I do differently' },
    { key: 'proud',         label: 'Most proud of' },
    { key: 'nextWeekFocus', label: 'Next week focus' },
  ];

  allEntries.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = entry.id;

    const filledCount = PROMPTS.filter(p => entry[p.key]).length;

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-week">${weekLabel(entry.weekStart)}</div>
          <div class="card-meta">${filledCount} / ${PROMPTS.length} prompts filled</div>
        </div>
        <button class="card-toggle">View</button>
      </div>
      <div class="card-body">
        ${PROMPTS.map(p => entry[p.key] ? `
          <div class="field-block">
            <div class="field-label">${p.label}</div>
            <div class="field-value">${escHtml(entry[p.key])}</div>
          </div>` : '').join('')}
        <div class="card-actions">
          <button class="edit-btn">Edit</button>
        </div>
      </div>`;

    card.querySelector('.card-header').addEventListener('click', () => {
      const expanded = card.classList.toggle('expanded');
      card.querySelector('.card-toggle').textContent = expanded ? 'Close' : 'View';
    });

    card.querySelector('.edit-btn').addEventListener('click', e => {
      e.stopPropagation();
      setupFormForWeek(entry.weekStart, entry);
      $('form-week-label').textContent = weekLabel(entry.weekStart);
      showView('view-form');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    list.appendChild(card);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Streak ── */

function calcStreak(entries) {
  if (entries.length === 0) return 0;
  const weeks = new Set(entries.map(e => e.weekStart));
  const today = getCurrentWeekStart();
  let streak = 0;
  let w = today;
  while (weeks.has(w)) {
    streak++;
    w = addWeeks(w, -1);
  }
  return streak;
}

function renderStreak() {
  const streak = calcStreak(allEntries);
  const el = $('streak-display');
  if (streak === 0) {
    el.textContent = 'Start your streak';
  } else if (streak === 1) {
    el.textContent = '1 week \u2713';
  } else {
    el.textContent = `${streak} weeks \uD83D\uDD25`;
  }
}

/* ── Insights view ── */

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','was','it','i','my','me','we','our','this','that','be','been',
  'have','had','has','do','did','not','no','so','as','if','by','from',
  'are','were','what','when','how','very','just','also','more','than',
  'some','out','up','about','than','then','they','their','them','its',
  'which','who','there','get','got','can','could','would','should','will',
]);

function topWords(entries, field, n = 6) {
  const freq = {};
  entries.forEach(e => {
    if (!e[field]) return;
    e[field].toLowerCase().split(/\W+/).forEach(w => {
      if (w.length > 3 && !STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
  });
  return Object.entries(freq)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function renderInsights() {
  const empty = $('insights-empty');
  if (allEntries.length < 2) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Streak
  const streak = calcStreak(allEntries);
  $('ins-streak-val').textContent = streak === 0 ? '0 weeks' :
    streak === 1 ? '1 week \u2713' : `${streak} weeks \uD83D\uDD25`;

  // Consistency (last 12 weeks)
  const today = getCurrentWeekStart();
  let filled = 0;
  const weekSet = new Set(allEntries.map(e => e.weekStart));
  for (let i = 0; i < 12; i++) {
    if (weekSet.has(addWeeks(today, -i))) filled++;
  }
  $('ins-consistency-val').textContent = `${filled} / 12`;

  // Heatmap
  const heatmap = $('heatmap');
  heatmap.innerHTML = '';
  for (let i = 11; i >= 0; i--) {
    const w = addWeeks(today, -i);
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    if (weekSet.has(w)) cell.classList.add('filled');
    if (i === 0) cell.classList.add('current');
    cell.title = weekLabel(w);
    heatmap.appendChild(cell);
  }

  // Look back (~4 weeks ago)
  const lookbackWeek = addWeeks(today, -4);
  const closest = allEntries.find(e => Math.abs(diffWeeks(e.weekStart, lookbackWeek)) <= 1);
  const lookbackSection = $('lookback-section');
  if (closest) {
    lookbackSection.classList.remove('hidden');
    const card = $('lookback-card');
    card.innerHTML = `
      <div class="card-header" style="cursor:default">
        <div class="card-week">${weekLabel(closest.weekStart)}</div>
      </div>
      <div class="card-body" style="display:block">
        ${closest.nextWeekFocus ? `<div class="field-block">
          <div class="field-label">Your focus was</div>
          <div class="field-value">${escHtml(closest.nextWeekFocus)}</div>
        </div>` : ''}
        ${closest.proud ? `<div class="field-block">
          <div class="field-label">Proud of</div>
          <div class="field-value">${escHtml(closest.proud)}</div>
        </div>` : ''}
      </div>`;
  } else {
    lookbackSection.classList.add('hidden');
  }

  // Word frequency
  renderFreqList('freq-wins', topWords(allEntries, 'wentWell'));
  renderFreqList('freq-blocked', topWords(allEntries, 'blocked'));
}

function renderFreqList(elId, words) {
  const ul = $(elId);
  ul.innerHTML = '';
  if (words.length === 0) {
    ul.innerHTML = '<li style="color:var(--muted);font-size:.85rem">Not enough data yet</li>';
    return;
  }
  words.forEach(([word, count]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${word}</span><span class="freq-count">${count}×</span>`;
    ul.appendChild(li);
  });
}

/* ── Nav ── */

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const viewId = btn.dataset.view;
    showView(viewId);
    if (viewId === 'view-history') renderHistory();
    if (viewId === 'view-insights') renderInsights();
    if (viewId === 'view-form') {
      const weekStart = getCurrentWeekStart();
      const existing = allEntries.find(e => e.weekStart === weekStart);
      setupFormForWeek(weekStart, existing ?? null);
    }
  });
});

/* ── Init ── */

async function init() {
  await loadEntries();
  renderStreak();

  const weekStart = getCurrentWeekStart();
  const thisWeek = allEntries.find(e => e.weekStart === weekStart);

  if (thisWeek) {
    // This week has an entry — show history, but pre-load edit form
    setupFormForWeek(weekStart, thisWeek);
    showView('view-history');
    renderHistory();
  } else {
    // No entry this week — go straight to the form
    setupFormForWeek(weekStart, null);
    showView('view-form');
  }
}

init();
