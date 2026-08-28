import './style.css';
import { cardsCsv, makeSession, nextWeekLabel } from './routine';
import { db } from './store';
import type { Card, Reflection, Session, Settings } from './types';
import { today, uid } from './types';

type View = 'today' | 'cards' | 'plan' | 'shelf' | 'about';
let view: View = 'today';
let cards: Card[] = [];
let settings: Settings;
let session: Session | undefined;
let answerVisible = false;
let notice = '';
let online = navigator.onLine;
let reflections: Reflection[] = [];
let updateReady = false;
let swRegistration: ServiceWorkerRegistration | undefined;
const app = document.querySelector<HTMLDivElement>('#app')!;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
const currentCard = () => cards.find((card) => card.id === session?.remainingIds[0]);
const activeCards = () => cards.filter((card) => card.status === 'active');
const archivedCards = () => cards.filter((card) => card.status === 'archived');
const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function setNotice(message: string) { notice = message; render(); window.setTimeout(() => { if (notice === message) { notice = ''; render(); } }, 4500); }
function applyTheme() { document.documentElement.dataset.theme = settings.theme; }
function navItem(target: View, label: string) { return `<button class="nav-item ${view === target ? 'is-current' : ''}" data-view="${target}" ${view === target ? 'aria-current="page"' : ''}>${label}</button>`; }

function cardForm(card?: Card) {
  const editing = Boolean(card);
  return `<section class="form-sheet" aria-labelledby="${editing ? 'edit-card-title' : 'add-card-title'}">
    <div class="section-kicker">${editing ? 'Revise a card' : 'Make a small card'}</div>
    <h2 id="${editing ? 'edit-card-title' : 'add-card-title'}">${editing ? 'Give this card its next useful shape.' : 'A clear pair is enough.'}</h2>
    <form id="card-form" data-id="${card?.id ?? ''}">
      <label>Prompt <span aria-hidden="true">*</span><textarea required name="front" rows="3" maxlength="600" placeholder="e.g. How do I say “I would like…”?">${escapeHtml(card?.front ?? '')}</textarea></label>
      <label>Answer <span aria-hidden="true">*</span><textarea required name="back" rows="3" maxlength="600" placeholder="e.g. Me gustaría…">${escapeHtml(card?.back ?? '')}</textarea></label>
      <div class="form-row"><label>Language <input name="language" maxlength="80" value="${escapeHtml(card?.language ?? '')}" placeholder="Spanish" /></label><label>Review on <input required name="dueOn" type="date" value="${card?.dueOn ?? today()}" /></label></div>
      <label>Private note <span class="hint">optional</span><textarea name="note" rows="2" maxlength="1000" placeholder="Context, source, or a better example.">${escapeHtml(card?.note ?? '')}</textarea></label>
      <div class="form-actions"><button class="button primary" type="submit">${editing ? 'Save revision' : 'Add to your loop'}</button>${editing ? '<button class="button quiet" type="button" data-cancel-edit>Cancel</button>' : ''}</div>
    </form>
  </section>`;
}

function reviewScreen() {
  const due = activeCards().filter((card) => card.dueOn <= today()).length;
  if (!activeCards().length) return `<section class="welcome"><div><p class="eyebrow">A ritual, not a streak</p><h1>Your next ten minutes can be quiet.</h1><p class="lede">Make a few language cards, then meet only a small set each day. Nothing chases you. You can retire a card when it has done its work.</p><button class="button primary" data-view="cards" data-focus-add>Add your first card</button></div><img src="/quiet-desk-garden.webp" width="760" height="760" fetchpriority="high" decoding="async" alt="Paper-cut desk garden with blank study cards, a lamp, plant, and shelf." /></section>${cardForm()}`;
  if (!session?.cardIds.length) return `<section class="completion"><div class="paper-sun" aria-hidden="true"></div><p class="eyebrow">Nothing due today</p><h1>Your loop has room to breathe.</h1><p>You have ${activeCards().length} active ${activeCards().length === 1 ? 'card' : 'cards'}; ${due ? `${due} will be ready when you begin.` : 'the next one will arrive when you chose.'}</p><div class="form-actions"><button class="button primary" data-start-session>Choose today’s small set</button><button class="button quiet" data-view="cards">Tend your cards</button></div></section>`;
  if (!session.remainingIds.length) return `<section class="completion"><div class="paper-sun" aria-hidden="true">✓</div><p class="eyebrow">Set down for today</p><h1>Your small set is complete.</h1><p>${session.cardIds.length} ${session.cardIds.length === 1 ? 'card has' : 'cards have'} a new place in time. There is nothing to protect or catch up on.</p><button class="button quiet" data-view="cards">Look after your cards</button></section>`;
  const card = currentCard();
  if (!card) return `<section class="completion"><h1>One card needs attention.</h1><p>It was changed in another tab. Start a new set and your loop will settle.</p><button class="button primary" data-reset-session>Choose a fresh set</button></section>`;
  const position = session.cardIds.length - session.remainingIds.length + 1;
  return `<section class="review-wrap"><div class="review-head"><div><p class="eyebrow">${dateLabel.format(new Date(`${today()}T12:00:00`))}</p><h1>Your quiet review</h1></div><p class="set-count" aria-label="Card ${position} of ${session.cardIds.length}">${position} / ${session.cardIds.length}</p></div><div class="progress" aria-hidden="true"><span style="width:${((position - 1) / session.cardIds.length) * 100}%"></span></div><article class="review-card ${answerVisible ? 'answer-shown' : ''}" aria-live="polite"><p class="card-language">${escapeHtml(card.language || 'Language card')}</p><p class="card-text">${escapeHtml(answerVisible ? card.back : card.front)}</p>${answerVisible && card.note ? `<p class="card-note">${escapeHtml(card.note)}</p>` : ''}</article>${answerVisible ? `<div class="review-actions"><button class="button primary" data-review="later">Keep for tomorrow</button><button class="button quiet" data-review="again">Let it return later today</button><button class="button danger" data-archive="${card.id}">Archive this card</button></div><p class="action-help">Archiving asks why and keeps the card in your export.</p>` : '<button class="button primary reveal" data-show-answer>Show answer</button>'}</section>`;
}

function cardsScreen() {
  const visible = activeCards();
  return `<section class="page-head"><p class="eyebrow">Your material</p><h1>Cards that still serve you</h1><p class="lede">Edit freely. Archived cards are held, never erased, until you choose to delete all data.</p></section>${cardForm()}<section class="collection" aria-labelledby="active-cards"><div class="section-title"><h2 id="active-cards">Active cards <span>${visible.length}</span></h2><button class="text-button" data-export="csv">Export CSV</button></div>${visible.length ? `<ul class="card-list">${visible.sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((card) => `<li><div><p class="card-mini-front">${escapeHtml(card.front)}</p><p class="card-meta">${escapeHtml(card.language || 'Unlabelled')} · ${card.dueOn <= today() ? 'ready now' : `next: ${card.dueOn}`}</p></div><div class="row-buttons"><button class="icon-button" aria-label="Edit ${escapeHtml(card.front)}" data-edit="${card.id}">Edit</button><button class="icon-button archive" aria-label="Archive ${escapeHtml(card.front)}" data-archive="${card.id}">Archive</button></div></li>`).join('')}</ul>` : '<div class="empty-inline">No active cards yet. Add one above whenever a phrase feels worth keeping.</div>'}</section>${archivedCards().length ? `<section class="collection archive-list" aria-labelledby="archive-cards"><div class="section-title"><h2 id="archive-cards">Archive shelf <span>${archivedCards().length}</span></h2></div><ul class="card-list">${archivedCards().map((card) => `<li><div><p class="card-mini-front">${escapeHtml(card.front)}</p><p class="card-meta">Retired: ${escapeHtml(card.archiveReason || 'No reason given')}</p></div><button class="icon-button" data-restore="${card.id}">Return to loop</button></li>`).join('')}</ul></section>` : ''}`;
}

function planScreen() {
  return `<section class="page-head"><p class="eyebrow">Optional weekly planning</p><h1>Decide the shape, not the pressure.</h1><p class="lede">Your daily set is finite. This is only a way to make that boundary feel familiar.</p></section><section class="plan-sheet"><div class="plan-toggle"><div><h2>Weekly plan</h2><p>Show a gentle weekly note. It does not make reminders or streaks.</p></div><label class="switch"><input type="checkbox" id="weekly-plan" ${settings.weeklyPlan ? 'checked' : ''}><span></span><span class="sr-only">Enable weekly plan</span></label></div><div class="limit-control"><label for="daily-limit"><strong>Daily set size</strong><span>Choose between 1 and 20 cards. Today’s set won’t change once it starts.</span></label><output id="limit-output">${settings.dailyLimit} cards</output><input id="daily-limit" type="range" min="1" max="20" value="${settings.dailyLimit}" /><div class="range-labels"><span>one</span><span>twenty</span></div></div>${settings.weeklyPlan ? `<div class="week-tabs" aria-label="This week"><p>Small invitation for the week of ${nextWeekLabel()}</p><div>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => `<span>${day}</span>`).join('')}</div><p class="plan-note">Open Quiet Loop on any day that suits you. The loop will be here.</p></div>` : '<p class="soft-note">Turn this on only if a little shape helps. It has no notifications.</p>'}</section>`;
}

function licenseState() { return localStorage.getItem('sb_license:calm-language-routine'); }
function shelfScreen() {
  const licensed = Boolean(licenseState());
  return `<section class="page-head"><p class="eyebrow">Quiet shelf</p><h1>Notice what stays with you.</h1><p class="lede">A small weekly reflection, separate from the review queue.</p></section>${licensed ? `<section class="reflection-sheet"><h2>This week</h2><form id="reflection-form"><label for="reflection">What did you want to keep close?</label><textarea id="reflection" name="reflection" required maxlength="1200" rows="5" placeholder="A word, a sound, a situation…"></textarea><button class="button primary" type="submit">Place on shelf</button></form>${reflections.length ? `<ul class="reflection-list">${reflections.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((reflection) => `<li><p>${escapeHtml(reflection.text)}</p><small>Week of ${reflection.week}</small></li>`).join('')}</ul>` : ''}</section>` : `<section class="unlock-sheet"><p class="eyebrow">One-time unlock · $12</p><h2>Keep a quiet shelf for reflections.</h2><p>Free review, card retirement, and all exports remain fully yours. The one-time unlock adds private weekly reflections and helps keep Quiet Loop subscription-free.</p><a class="button primary" href="https://api.sociobot.in/api/v1/products/calm-language-routine/checkout">Buy the quiet shelf</a><details><summary>Already bought it?</summary><form id="license-form"><label for="license">Paste your license token</label><input id="license" name="license" required autocomplete="off"><button class="button quiet" type="submit">Restore purchase</button></form></details><p class="legal-note">Sociobot/Dodo is merchant of record. Refunds are handled there and revoke the unlock. <a href="/terms/">Terms</a></p></section>`}`;
}

function aboutScreen() {
  return `<section class="page-head"><p class="eyebrow">A private utility</p><h1>Built for the long middle.</h1><p class="lede">Quiet Loop is for adult learners who want a practice they can return to, not a system that performs urgency.</p></section><section class="about-sheet"><h2>What it does</h2><ul><li>Builds one bounded set from cards due today.</li><li>Lets you archive stale material with a reason, then restore it if needed.</li><li>Stores cards in this browser’s IndexedDB by default.</li><li>Exports CSV or a full JSON backup; you can delete everything.</li></ul><h2>What it does not do</h2><p>No streaks, push notifications, feed, generated lessons, account, or claim that it will make you fluent.</p><div class="about-actions"><button class="button quiet" data-export="json">Export backup</button><label class="button quiet file-button">Import backup<input id="import-file" type="file" accept="application/json"></label><button class="text-button danger-text" data-delete-all>Delete all local data</button></div><p class="legal-note">Illustration generated for Quiet Loop; no external analytics or third-party fonts. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></section>`;
}

function body() { return view === 'today' ? reviewScreen() : view === 'cards' ? cardsScreen() : view === 'plan' ? planScreen() : view === 'shelf' ? shelfScreen() : aboutScreen(); }
function render() {
  applyTheme();
  app.innerHTML = `<header class="site-header"><a class="wordmark" href="#today" aria-label="Quiet Loop home"><span aria-hidden="true">◒</span> Quiet Loop</a><nav aria-label="Main navigation">${navItem('today', 'Today')}${navItem('cards', 'Cards')}${navItem('plan', 'Plan')}${navItem('shelf', 'Shelf')}${navItem('about', 'About')}</nav><button class="theme-button" data-theme aria-label="Switch colour theme">◐</button></header>${!online ? '<div class="offline-banner" role="status">You’re offline. Your cards are still here.</div>' : ''}<main id="main" tabindex="-1">${body()}</main><footer><p>Quiet Loop holds your practice on this device.</p><p><a href="/privacy/">Privacy</a> <span aria-hidden="true">·</span> <a href="/terms/">Terms</a> <span aria-hidden="true">·</span> Original paper-cut illustration generated for Quiet Loop.</p></footer>${updateReady ? '<button class="toast update-toast" data-refresh>Update ready · Reload</button>' : `<div class="toast" aria-live="polite" aria-atomic="true">${escapeHtml(notice)}</div>`}<dialog id="archive-dialog"><form method="dialog" id="archive-form"><h2>Move this card to the archive shelf?</h2><p id="archive-card-name"></p><label for="archive-reason">Why is it no longer useful?</label><select id="archive-reason" required><option value="">Choose a reason</option><option>Already familiar</option><option>Too vague</option><option>No longer relevant</option><option>Duplicate</option><option>Other</option></select><menu><button class="button quiet" value="cancel">Keep it active</button><button class="button danger" value="archive">Archive card</button></menu></form></dialog>`;
}

async function load() {
  try { [cards, settings, reflections] = await Promise.all([db.allCards(), db.getSettings(), db.allReflections()]); session = await db.getSession(today()); render(); reconcileLicense(); }
  catch (error) { app.innerHTML = `<main id="main"><section class="completion"><h1>Your local shelf could not open.</h1><p>Browser storage may be disabled. Enable site data for this page, then reload.</p></section></main>`; console.error(error); }
}

async function ensureSession(force = false) { if (force || !session) { session = makeSession(cards, today(), settings.dailyLimit); await db.putSession(session); } }
async function archive(id: string, reason: string) { const card = cards.find((item) => item.id === id); if (!card) return; Object.assign(card, { status: 'archived', archiveReason: reason, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await db.putCard(card); if (session) { session.remainingIds = session.remainingIds.filter((item) => item !== id); if (!session.remainingIds.length) session.completedAt = new Date().toISOString(); await db.putSession(session); } setNotice('Card moved to the archive shelf. You can return it later.'); }
async function review(action: 'later' | 'again') { const card = currentCard(); if (!card || !session) return; if (action === 'later') card.dueOn = new Date(Date.now() + 86400000).toISOString().slice(0, 10); else session.remainingIds = [...session.remainingIds.slice(1), card.id]; if (action === 'later') session.remainingIds = session.remainingIds.slice(1); card.updatedAt = new Date().toISOString(); await db.putCard(card); if (!session.remainingIds.length) session.completedAt = new Date().toISOString(); await db.putSession(session); answerVisible = false; render(); }
function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
async function verifyLicense(token: string) { const verdict = localStorage.getItem('sb_license_verdict:calm-language-routine'); if (verdict) { try { const parsed = JSON.parse(verdict) as { valid: boolean; at: number }; if (Date.now() - parsed.at < 86400000 && parsed.valid) return true; } catch { localStorage.removeItem('sb_license_verdict:calm-language-routine'); } } try { const response = await fetch(`https://api.sociobot.in/api/v1/products/calm-language-routine/verify?license=${encodeURIComponent(token)}`); const result = await response.json() as { valid: boolean }; localStorage.setItem('sb_license_verdict:calm-language-routine', JSON.stringify({ valid: result.valid, at: Date.now() })); return result.valid; } catch { return true; }
}
async function reconcileLicense() { const token = licenseState(); if (!token) return; if (!await verifyLicense(token)) { localStorage.removeItem('sb_license:calm-language-routine'); notice = 'Your license is no longer active. The free loop is unchanged.'; render(); } }

app.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const viewButton = target.closest<HTMLElement>('[data-view]'); if (viewButton) { view = viewButton.dataset.view as View; answerVisible = false; render(); return; }
  if (target.closest('[data-show-answer]')) { answerVisible = true; render(); return; }
  if (target.closest('[data-start-session]') || target.closest('[data-reset-session]')) { await ensureSession(true); render(); return; }
  const reviewButton = target.closest<HTMLElement>('[data-review]'); if (reviewButton) { await review(reviewButton.dataset.review as 'later' | 'again'); return; }
  const edit = target.closest<HTMLElement>('[data-edit]'); if (edit) { app.querySelector('.form-sheet')?.remove(); const card = cards.find((item) => item.id === edit.dataset.edit); if (card) { const collection = app.querySelector('.collection'); collection?.insertAdjacentHTML('beforebegin', cardForm(card)); app.querySelector<HTMLTextAreaElement>('textarea[name="front"]')?.focus(); } return; }
  if (target.closest('[data-cancel-edit]')) { render(); return; }
  const archiveButton = target.closest<HTMLElement>('[data-archive]'); if (archiveButton) { const dialog = app.querySelector<HTMLDialogElement>('#archive-dialog')!; const card = cards.find((item) => item.id === archiveButton.dataset.archive); dialog.dataset.id = archiveButton.dataset.archive ?? ''; app.querySelector('#archive-card-name')!.textContent = card?.front ?? ''; dialog.showModal(); return; }
  const restore = target.closest<HTMLElement>('[data-restore]'); if (restore) { const card = cards.find((item) => item.id === restore.dataset.restore); if (card) { Object.assign(card, { status: 'active', dueOn: today(), archivedAt: undefined, archiveReason: undefined, updatedAt: new Date().toISOString() }); await db.putCard(card); setNotice('Card returned to today’s loop.'); } return; }
  const exportButton = target.closest<HTMLElement>('[data-export]'); if (exportButton) { const kind = exportButton.dataset.export; download(`quiet-loop-${today()}.${kind}`, kind === 'csv' ? cardsCsv(cards) : JSON.stringify({ version: 1, cards, settings, reflections }, null, 2), kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json'); setNotice(`${kind === 'csv' ? 'CSV' : 'Backup'} exported.`); return; }
  if (target.closest('[data-delete-all]')) { if (window.confirm('Delete every Quiet Loop card, session, plan, and reflection from this browser? This cannot be undone.')) { await db.clearAll(); cards = []; reflections = []; session = undefined; settings = { dailyLimit: 7, weeklyPlan: false, theme: 'system' }; view = 'today'; setNotice('All local Quiet Loop data was deleted.'); } return; }
  if (target.closest('[data-theme]')) { settings.theme = settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system'; await db.putSettings(settings); render(); }
  if (target.closest('[data-refresh]')) { swRegistration?.waiting?.postMessage('skip-waiting'); location.reload(); }
});

app.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.target as HTMLFormElement;
  if (form.id === 'card-form') { const values = new FormData(form); const now = new Date().toISOString(); const existing = cards.find((card) => card.id === form.dataset.id); const card: Card = { id: existing?.id ?? uid(), front: String(values.get('front')).trim(), back: String(values.get('back')).trim(), language: String(values.get('language')).trim(), note: String(values.get('note')).trim(), dueOn: String(values.get('dueOn')), status: existing?.status ?? 'active', createdAt: existing?.createdAt ?? now, updatedAt: now, archivedAt: existing?.archivedAt, archiveReason: existing?.archiveReason }; await db.putCard(card); if (existing) Object.assign(existing, card); else cards.push(card); session = undefined; view = 'cards'; setNotice(existing ? 'Card revised.' : 'Card added to your loop.'); return; }
  if (form.id === 'archive-form') { const dialog = form.closest<HTMLDialogElement>('dialog')!; if ((event as SubmitEvent).submitter?.getAttribute('value') === 'archive') { const reason = app.querySelector<HTMLSelectElement>('#archive-reason')!.value; if (!reason) return; await archive(dialog.dataset.id!, reason); } dialog.close(); return; }
  if (form.id === 'reflection-form') { const text = String(new FormData(form).get('reflection')).trim(); const reflection: Reflection = { id: uid(), week: nextWeekLabel(), text, createdAt: new Date().toISOString() }; await db.putReflection(reflection); reflections.push(reflection); setNotice('Placed on your quiet shelf.'); return; }
  if (form.id === 'license-form') { const token = String(new FormData(form).get('license')).trim(); if (!token) return; localStorage.setItem('sb_license:calm-language-routine', token); const valid = await verifyLicense(token); if (!valid) { localStorage.removeItem('sb_license:calm-language-routine'); setNotice('That license is not active. You can buy a new one from the quiet shelf.'); } else { setNotice('Purchase restored.'); } return; }
});

app.addEventListener('change', async (event) => { const target = event.target as HTMLInputElement; if (target.id === 'weekly-plan') { settings.weeklyPlan = target.checked; await db.putSettings(settings); render(); } if (target.id === 'import-file' && target.files?.[0]) { try { const data = JSON.parse(await target.files[0].text()) as { cards?: Card[]; settings?: Settings; reflections?: Reflection[] }; if (!Array.isArray(data.cards)) throw new Error('Missing cards'); await db.putCards(data.cards.filter((card) => card?.id && card.front && card.back)); if (data.settings) await db.putSettings({ ...settings, ...data.settings }); if (Array.isArray(data.reflections)) for (const reflection of data.reflections) await db.putReflection(reflection); await load(); setNotice('Backup imported into this browser.'); } catch { setNotice('That file is not a Quiet Loop backup. Try a JSON export from Quiet Loop.'); } } });
app.addEventListener('input', async (event) => { const target = event.target as HTMLInputElement; if (target.id === 'daily-limit') { settings.dailyLimit = Number(target.value); app.querySelector('#limit-output')!.textContent = `${target.value} cards`; await db.putSettings(settings); } });

window.addEventListener('online', () => { online = true; render(); }); window.addEventListener('offline', () => { online = false; render(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then((registration) => {
  swRegistration = registration;
  const announceUpdate = () => { updateReady = true; render(); };
  if (registration.waiting) announceUpdate();
  registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
    if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
  }));
}).catch((error) => console.error('Service worker registration failed', error));
const inboundLicense = new URLSearchParams(location.search).get('license');
if (inboundLicense) { localStorage.setItem('sb_license:calm-language-routine', inboundLicense); history.replaceState({}, '', location.pathname); }
load();
