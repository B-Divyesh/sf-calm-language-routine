import './style.css';
import { cardsCsv, makeSession, nextWeekLabel } from './routine';
import { createStore } from './store';
import type { Backup, Card, Reflection, Session, Settings } from './types';
import { today, uid } from './types';
import { isCard, isReflection, isSession, parseBackup, safeSettings } from './validation';

type View = 'today' | 'cards' | 'plan' | 'shelf' | 'about';

const PRODUCT_ORIGIN = 'https://calm-language-routine.sociobot.in';
const PRODUCT_SLUG = 'calm-language-routine';
const isDemoMode = location.pathname.replace(/\/$/, '') === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
const database = createStore(isDemoMode ? 'demo:quiet-loop' : 'quiet-loop');
const demoMarker = 'demo:quiet-loop:seeded';
const app = document.querySelector<HTMLDivElement>('#app')!;
const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

let view: View = routeView();
let cards: Card[] = [];
let settings: Settings = { dailyLimit: 7, weeklyPlan: false, theme: 'system' };
let session: Session | undefined;
let answerVisible = false;
let notice = '';
let noticeTimer: number | undefined;
let online = navigator.onLine;
let reflections: Reflection[] = [];
let updateReady = false;
let swRegistration: ServiceWorkerRegistration | undefined;
let licenseUnlocked = isDemoMode;

function routeView(): View {
  if (isDemoMode) {
    const requested = new URLSearchParams(location.search).get('view');
    return ['cards', 'plan', 'shelf', 'about'].includes(requested ?? '') ? requested as View : 'today';
  }
  const path = location.pathname.replace(/\/$/, '') || '/';
  return ({ '/': 'today', '/cards': 'cards', '/plan': 'plan', '/shelf': 'shelf', '/about': 'about' } as Record<string, View>)[path] ?? 'today';
}

function viewUrl(target: View): string {
  if (isDemoMode) return target === 'today' ? '/demo' : `/demo?view=${target}`;
  return target === 'today' ? '/' : `/${target}`;
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
const currentCard = () => cards.find((card) => card.id === session?.remainingIds[0]);
const activeCards = () => cards.filter((card) => card.status === 'active');
const archivedCards = () => cards.filter((card) => card.status === 'archived');

function pageTitle(): string {
  if (isDemoMode) return 'Demo — Quiet Loop';
  return {
    today: 'Quiet Loop — Review a finite language set',
    cards: 'Cards — Quiet Loop',
    plan: 'Daily limit — Quiet Loop',
    shelf: 'Weekly reflections — Quiet Loop',
    about: 'Data controls — Quiet Loop'
  }[view];
}

function updateMetadata(): void {
  document.title = pageTitle();
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `${PRODUCT_ORIGIN}${isDemoMode ? '/demo' : viewUrl(view)}`;
  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = pageTitle();
  const twitterTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.content = pageTitle();
  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl && canonical) ogUrl.content = canonical.href;
}

function navItem(target: View, label: string): string {
  return `<a class="nav-item ${view === target ? 'is-current' : ''}" href="${viewUrl(target)}" data-view="${target}" ${view === target ? 'aria-current="page"' : ''}>${label}</a>`;
}

function cardForm(card?: Card): string {
  const editing = Boolean(card);
  const titleId = editing ? 'edit-card-title' : 'add-card-title';
  return `<section class="form-sheet" aria-labelledby="${titleId}">
    <p class="section-label">${editing ? 'Edit card' : 'Add a card'}</p>
    <h2 id="${titleId}">${editing ? 'Update this prompt and answer' : 'Add a prompt and answer'}</h2>
    <form id="card-form" data-id="${card?.id ?? ''}">
      <p class="required-note" id="required-note">Fields marked * are required.</p>
      <label for="card-front">Prompt *</label>
      <textarea id="card-front" required name="front" rows="3" maxlength="600" aria-describedby="required-note card-form-error" placeholder="How do I ask for the bill?">${escapeHtml(card?.front ?? '')}</textarea>
      <label for="card-back">Answer *</label>
      <textarea id="card-back" required name="back" rows="3" maxlength="600" aria-describedby="required-note card-form-error" placeholder="¿Me trae la cuenta, por favor?">${escapeHtml(card?.back ?? '')}</textarea>
      <div class="form-row">
        <div><label for="card-language">Language</label><input id="card-language" name="language" maxlength="80" value="${escapeHtml(card?.language ?? '')}" placeholder="Spanish" /></div>
        <div><label for="card-due">Review on *</label><input id="card-due" required name="dueOn" type="date" value="${card?.dueOn ?? today()}" /></div>
      </div>
      <label for="card-note">Private note <span class="hint">optional</span></label>
      <textarea id="card-note" name="note" rows="2" maxlength="1000" placeholder="Add context or a useful example.">${escapeHtml(card?.note ?? '')}</textarea>
      <p class="form-error" id="card-form-error" role="alert"></p>
      <div class="form-actions"><button class="button primary" type="submit">${editing ? 'Save changes' : 'Add card'}</button>${editing ? '<button class="button quiet" type="button" data-cancel-edit>Cancel editing</button>' : ''}</div>
    </form>
  </section>`;
}

function landingDetails(): string {
  return `<section class="how-section" aria-labelledby="how-title">
    <p class="section-label">How it works</p>
    <h2 id="how-title">Review a fixed set in three steps</h2>
    <ol class="step-list">
      <li><strong>Add</strong><span>Add your own prompt and answer.</span></li>
      <li><strong>Review</strong><span>Review only cards due today, up to your chosen limit.</span></li>
      <li><strong>Archive</strong><span>Archive a card with a reason when it stops helping.</span></li>
    </ol>
  </section>
  <section class="plain-section" aria-labelledby="limits-title">
    <p class="section-label">Privacy and limits</p>
    <h2 id="limits-title">What Quiet Loop does not do</h2>
    <p>Quiet Loop has no streaks, feeds, push notifications, generated lessons, or account.</p>
    <p>It does not promise a learning result.</p>
    <p>Your cards and reflections stay in this browser unless you export them.</p>
  </section>
  <section class="price-section" aria-labelledby="price-title">
    <p class="section-label">Optional paid feature</p>
    <h2 id="price-title">Weekly reflections cost $12 once</h2>
    <p>Review, archiving, and exports stay free.</p>
    <a class="button quiet" href="${viewUrl('shelf')}" data-view="shelf">See weekly reflections</a>
  </section>`;
}

function reviewScreen(): string {
  const active = activeCards();
  const due = active.filter((card) => card.dueOn <= today()).length;
  if (!active.length) {
    return `<section class="welcome">
      <div>
        <p class="section-label">Private language review</p>
        <h1 tabindex="-1">Review a small language set</h1>
        <p class="lede">For adult language learners who want a short routine without streaks or an endless queue.</p>
        <div class="hero-actions"><a class="button primary" href="/demo">Try it with sample data</a><a class="button quiet" href="${viewUrl('cards')}" data-view="cards" data-focus-add>Add your first card</a></div>
        <p class="action-note">The sample loads five cards in a separate demo.</p>
        <ul class="fact-list"><li>Cards stay in this browser.</li><li>Works offline after your first visit.</li><li>Free review. Weekly reflections cost $12 once.</li></ul>
      </div>
      <img src="/quiet-desk-garden.webp" width="760" height="760" fetchpriority="high" decoding="async" alt="Paper-cut desk with blank study cards, a lamp, a plant, and an archive shelf." />
    </section>${cardForm()}${landingDetails()}`;
  }
  if (!session?.cardIds.length) {
    if (!due) return `<section class="completion"><div class="paper-sun" aria-hidden="true"></div><p class="section-label">Today</p><h1 tabindex="-1">No cards are due today</h1><p>You have ${active.length} active ${active.length === 1 ? 'card' : 'cards'}. The next card appears on its review date.</p><a class="button quiet" href="${viewUrl('cards')}" data-view="cards">Manage cards</a></section>`;
    return `<section class="completion"><div class="paper-sun" aria-hidden="true"></div><p class="section-label">Today</p><h1 tabindex="-1">${due} ${due === 1 ? 'card is' : 'cards are'} ready</h1><p>Your review will contain at most ${settings.dailyLimit} ${settings.dailyLimit === 1 ? 'card' : 'cards'} and will not grow after it starts.</p><button class="button primary" data-start-session>Start today’s review</button></section>`;
  }
  if (!session.remainingIds.length) return `<section class="completion"><div class="paper-sun" aria-hidden="true">✓</div><p class="section-label">Today</p><h1 tabindex="-1">Today’s review is complete</h1><p>You reviewed ${session.cardIds.length} ${session.cardIds.length === 1 ? 'card' : 'cards'}. No more cards will be added today.</p><a class="button quiet" href="${viewUrl('cards')}" data-view="cards">Manage cards</a></section>`;
  const card = currentCard();
  if (!card) return `<section class="completion"><h1 tabindex="-1">A card changed in another tab</h1><p>Start a new review to use the current cards.</p><button class="button primary" data-reset-session>Start a new review</button></section>`;
  const position = session.cardIds.length - session.remainingIds.length + 1;
  return `<section class="review-wrap">
    <div class="review-head"><div><p class="section-label">${dateLabel.format(new Date(`${today()}T12:00:00`))}</p><h1 tabindex="-1">Review today’s language cards</h1></div><p class="set-count" aria-label="Card ${position} of ${session.cardIds.length}">${position} / ${session.cardIds.length}</p></div>
    <progress class="progress" aria-label="Review progress" max="${session.cardIds.length}" value="${position - 1}"></progress>
    <article class="review-card ${answerVisible ? 'answer-shown' : ''}" aria-live="polite"><p class="card-language">${escapeHtml(card.language || 'Language card')}</p><p class="card-text">${escapeHtml(answerVisible ? card.back : card.front)}</p>${answerVisible && card.note ? `<p class="card-note">${escapeHtml(card.note)}</p>` : ''}</article>
    ${answerVisible ? `<div class="review-actions"><button class="button primary" data-review="later">Review tomorrow</button><button class="button quiet" data-review="again">Review again today</button><button class="button danger" data-archive="${card.id}">Archive card</button></div><p class="action-help">Archived cards remain in your exports and can be restored.</p>` : '<button class="button primary reveal" data-show-answer>Show answer</button>'}
  </section>`;
}

function cardsScreen(): string {
  const visible = activeCards().sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const archived = archivedCards();
  return `<section class="page-head"><p class="section-label">Cards</p><h1 tabindex="-1">Add and update language cards</h1><p class="lede">Edit a card, change its review date, or move it to the archive with a reason.</p></section>
    ${cardForm()}
    <section class="collection" aria-labelledby="active-cards"><div class="section-title"><h2 id="active-cards">Active cards <span>${visible.length}</span></h2><button class="text-button" data-export="csv">Export CSV</button></div>
      ${visible.length ? `<ul class="card-list">${visible.map((card) => `<li><div><p class="card-mini-front">${escapeHtml(card.front)}</p><p class="card-meta">${escapeHtml(card.language || 'No language label')} · ${card.dueOn <= today() ? 'ready now' : `review on ${card.dueOn}`}</p></div><div class="row-buttons"><button class="icon-button" aria-label="Edit ${escapeHtml(card.front)}" data-edit="${card.id}">Edit</button><button class="icon-button archive" aria-label="Archive ${escapeHtml(card.front)}" data-archive="${card.id}">Archive</button></div></li>`).join('')}</ul>` : '<div class="empty-inline">No active cards. Add a prompt and answer above.</div>'}
    </section>
    ${archived.length ? `<section class="collection archive-list" aria-labelledby="archive-cards"><div class="section-title"><h2 id="archive-cards">Archived cards <span>${archived.length}</span></h2></div><ul class="card-list">${archived.map((card) => `<li><div><p class="card-mini-front">${escapeHtml(card.front)}</p><p class="card-meta">Reason: ${escapeHtml(card.archiveReason || 'No reason recorded')}</p></div><button class="icon-button" data-restore="${card.id}">Restore card</button></li>`).join('')}</ul></section>` : ''}`;
}

function planScreen(): string {
  return `<section class="page-head"><p class="section-label">Review settings</p><h1 tabindex="-1">Set your daily review limit</h1><p class="lede">Choose a fixed set of 1 to 20 due cards. A started review does not grow.</p></section>
    <section class="plan-sheet"><div class="plan-toggle"><div><h2>Show a weekly note</h2><p>This note does not create reminders or streaks.</p></div><label class="switch"><input type="checkbox" id="weekly-plan" aria-label="Show a weekly note" ${settings.weeklyPlan ? 'checked' : ''}><span aria-hidden="true"></span></label></div>
      <div class="limit-control"><label for="daily-limit"><strong>Cards per day</strong><span>Choose between 1 and 20 cards.</span></label><output id="limit-output" for="daily-limit">${settings.dailyLimit} cards</output><input id="daily-limit" type="range" min="1" max="20" value="${settings.dailyLimit}" /><div class="range-labels"><span>1</span><span>20</span></div></div>
      ${settings.weeklyPlan ? `<div class="week-tabs" aria-label="Week of ${nextWeekLabel()}"><p>Week of ${nextWeekLabel()}</p><div>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => `<span>${day}</span>`).join('')}</div><p class="plan-note">Open Quiet Loop on any day that suits you.</p></div>` : '<p class="soft-note">Turn this on only if a weekly note helps.</p>'}
    </section>`;
}

function localKey(name: string): string {
  return isDemoMode ? `demo:${name}` : name;
}

function licenseState(): string | null {
  return isDemoMode ? null : localStorage.getItem(localKey(`sb_license:${PRODUCT_SLUG}`));
}

function cachedLicenseVerdict(): boolean | null {
  const stored = localStorage.getItem(localKey(`sb_license_verdict:${PRODUCT_SLUG}`));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { valid: unknown; at: unknown };
    if (typeof parsed.valid === 'boolean' && typeof parsed.at === 'number' && Date.now() - parsed.at < 86400000) return parsed.valid;
  } catch {
    localStorage.removeItem(localKey(`sb_license_verdict:${PRODUCT_SLUG}`));
  }
  return null;
}

function shelfScreen(): string {
  const licensed = isDemoMode || licenseUnlocked;
  return `<section class="page-head"><p class="section-label">Optional weekly reflections</p><h1 tabindex="-1">Write a weekly reflection</h1><p class="lede">Save one private note about language you want to remember.</p></section>
    ${licensed ? `<section class="reflection-sheet"><h2>This week</h2><form id="reflection-form"><label for="reflection">What do you want to remember?</label><textarea id="reflection" name="reflection" required maxlength="1200" rows="5" aria-describedby="reflection-error" placeholder="A word, a sound, or a useful situation."></textarea><p class="form-error" id="reflection-error" role="alert"></p><button class="button primary" type="submit">Save reflection</button></form>${reflections.length ? `<ul class="reflection-list">${[...reflections].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((reflection) => `<li><p>${escapeHtml(reflection.text)}</p><small>Week of ${reflection.week}</small></li>`).join('')}</ul>` : '<p class="empty-inline">No reflections saved yet.</p>'}</section>` : `<section class="unlock-sheet"><p class="section-label">One-time purchase · $12 USD</p><h2>Add private weekly reflections</h2><p>The free review, archive, and export tools do not change. This purchase adds weekly reflections.</p><a class="button primary" href="https://api.sociobot.in/api/v1/products/${PRODUCT_SLUG}/checkout">Buy weekly reflections for $12</a><details><summary>Restore a purchase</summary><form id="license-form"><label for="license">License token</label><input id="license" name="license" required autocomplete="off" aria-describedby="license-help"><p id="license-help" class="hint">Paste the token from your purchase receipt.</p><button class="button quiet" type="submit">Restore purchase</button></form></details><p class="legal-note">Sociobot and Dodo handle payment and refunds. A refund removes access to weekly reflections. <a href="/terms/">Read the terms</a>.</p></section>`}`;
}

function aboutScreen(): string {
  return `<section class="page-head"><p class="section-label">Data controls</p><h1 tabindex="-1">Export or delete your data</h1><p class="lede">Quiet Loop stores study data in this browser. You control the backup and deletion tools.</p></section>
    <section class="about-sheet"><h2>Available controls</h2><ul><li>Export active and archived cards as CSV.</li><li>Export cards, settings, review state, and reflections as JSON.</li><li>Import a valid Quiet Loop JSON backup.</li><li>Delete all Quiet Loop data from this browser.</li></ul><div class="about-actions"><button class="button quiet" data-export="json">Export JSON backup</button><label class="button quiet file-button">Import JSON backup<input id="import-file" type="file" accept="application/json"></label><button class="text-button danger-text" data-delete-all>Delete all local data</button></div><p class="legal-note">Quiet Loop has no account, tracking script, or external font. <a href="/privacy/">Read the privacy notice</a>.</p></section>`;
}

function body(): string {
  if (view === 'today') return reviewScreen();
  if (view === 'cards') return cardsScreen();
  if (view === 'plan') return planScreen();
  if (view === 'shelf') return shelfScreen();
  return aboutScreen();
}

function render(focusHeading = false): void {
  applyTheme();
  updateMetadata();
  app.innerHTML = `${isDemoMode ? '<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><span><button class="banner-button" data-reset-demo>Reset demo</button><button class="banner-button" data-start-real>Start for real</button></span></aside>' : ''}
    <header class="site-header"><a class="wordmark" href="${viewUrl('today')}" data-view="today" aria-label="Quiet Loop home"><span aria-hidden="true">◒</span> Quiet Loop</a><nav aria-label="Main navigation">${navItem('today', 'Review')}${navItem('cards', 'Cards')}${navItem('plan', 'Daily limit')}${navItem('shelf', 'Reflections')}</nav><button class="theme-button" data-theme-action aria-label="${settings.theme === 'system' ? 'Use dark theme' : settings.theme === 'dark' ? 'Use light theme' : 'Use system theme'}">◐</button></header>
    <div class="offline-banner" role="status" ${online ? 'hidden' : ''}>You are offline. Saved cards are still available.</div>
    <div class="route-announcer sr-only" aria-live="polite"></div>
    <main id="main" tabindex="-1">${body()}</main>
    <footer><p>Review a fixed daily set and archive cards that stop helping.</p><nav aria-label="Footer navigation"><a href="${viewUrl('about')}" data-view="about">Data controls</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p>Built by Param Factory · v1.1.0 · Original generated illustration.</p></footer>
    <div class="toast" id="status-toast" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(notice)}</div>
    <button class="toast update-toast" data-refresh ${updateReady ? '' : 'hidden'}>Update available. Reload now</button>
    <dialog id="archive-dialog" aria-labelledby="archive-title" aria-describedby="archive-card-name"><form method="dialog" id="archive-form"><h2 id="archive-title">Archive this card?</h2><p id="archive-card-name"></p><label for="archive-reason">Reason *</label><select id="archive-reason" required aria-describedby="archive-help"><option value="">Choose a reason</option><option>Already familiar</option><option>Too vague</option><option>No longer relevant</option><option>Duplicate</option><option>Other</option></select><p id="archive-help" class="hint">Choose a reason before archiving. You can restore the card later.</p><menu><button class="button quiet" type="button" data-close-dialog>Keep card active</button><button class="button danger" type="submit" value="archive">Archive card</button></menu></form></dialog>`;

  if (focusHeading) {
    requestAnimationFrame(() => {
      const heading = app.querySelector<HTMLElement>('main h1');
      heading?.focus();
      const announcer = app.querySelector<HTMLElement>('.route-announcer');
      if (announcer && heading) announcer.textContent = heading.textContent ?? '';
    });
  }
}

function applyTheme(): void {
  document.documentElement.dataset.theme = settings.theme;
}

function showNotice(message: string): void {
  notice = message;
  const region = app.querySelector<HTMLElement>('#status-toast');
  if (region) region.textContent = message;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    if (notice !== message) return;
    notice = '';
    const currentRegion = app.querySelector<HTMLElement>('#status-toast');
    if (currentRegion) currentRegion.textContent = '';
  }, 4500);
}

function navigate(target: View, focusAdd = false): void {
  view = target;
  answerVisible = false;
  history.pushState({ view: target }, '', viewUrl(target));
  render(true);
  if (focusAdd) requestAnimationFrame(() => app.querySelector<HTMLTextAreaElement>('#card-front')?.focus());
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function sampleBackup(): Backup {
  const now = new Date().toISOString();
  const sampleCards: Card[] = [
    { id: 'demo-bill', front: 'How do I ask for the bill?', back: '¿Me trae la cuenta, por favor?', language: 'Spanish', note: 'Useful at the end of a meal.', dueOn: today(), status: 'active', createdAt: now, updatedAt: now },
    { id: 'demo-minutes', front: 'I’ll be there in ten minutes.', back: 'Estaré allí en diez minutos.', language: 'Spanish', note: 'Use estar for location and arrival.', dueOn: today(), status: 'active', createdAt: now, updatedAt: now },
    { id: 'demo-slowly', front: 'Could you speak more slowly?', back: '¿Podría hablar más despacio?', language: 'Spanish', note: 'A polite request for conversation practice.', dueOn: today(), status: 'active', createdAt: now, updatedAt: now },
    { id: 'demo-platform', front: 'The train leaves from platform six.', back: 'El tren sale del andén seis.', language: 'Spanish', note: 'Andén means platform.', dueOn: today(), status: 'active', createdAt: now, updatedAt: now },
    { id: 'demo-weather', front: 'It might rain this afternoon.', back: 'Puede que llueva esta tarde.', language: 'Spanish', note: 'Scheduled for a later review.', dueOn: addDays(2), status: 'active', createdAt: now, updatedAt: now }
  ];
  const sampleSettings: Settings = { dailyLimit: 4, weeklyPlan: true, theme: 'system' };
  const sampleSession = makeSession(sampleCards, today(), sampleSettings.dailyLimit);
  return {
    version: 1,
    cards: sampleCards,
    settings: sampleSettings,
    sessions: [sampleSession],
    reflections: [{ id: 'demo-reflection', week: nextWeekLabel(), text: 'Polite requests are easier when I practise the whole sentence.', createdAt: now }]
  };
}

async function seedDemo(): Promise<void> {
  await database.clearAll();
  await database.writeBackup(sampleBackup());
  localStorage.setItem(demoMarker, '1');
}

async function load(): Promise<void> {
  try {
    if (isDemoMode && !localStorage.getItem(demoMarker)) await seedDemo();
    const [storedCards, storedSettings, storedReflections, storedSession] = await Promise.all([
      database.allCards(), database.getSettings(), database.allReflections(), database.getSession(today())
    ]);
    cards = storedCards.filter(isCard);
    settings = safeSettings(storedSettings);
    reflections = storedReflections.filter(isReflection);
    session = isSession(storedSession) ? storedSession : undefined;
    licenseUnlocked = isDemoMode || Boolean(licenseState() && cachedLicenseVerdict() === true);
    render();
    const skipped = (storedCards.length - cards.length) + (storedReflections.length - reflections.length) + (storedSession && !session ? 1 : 0);
    if (skipped) showNotice(`${skipped} damaged ${skipped === 1 ? 'record was' : 'records were'} skipped. Import a valid backup or delete local data.`);
    void reconcileLicense();
  } catch (error) {
    app.innerHTML = `<main id="main"><section class="completion"><h1 tabindex="-1">Local data could not open</h1><p>Allow site data for this page, then reload.</p></section></main>`;
    console.error(error);
  }
}

async function ensureSession(force = false): Promise<void> {
  if (force || !session) {
    session = makeSession(cards, today(), settings.dailyLimit);
    await database.putSession(session);
  }
}

async function archive(id: string, reason: string): Promise<void> {
  const card = cards.find((item) => item.id === id);
  if (!card) return;
  Object.assign(card, { status: 'archived', archiveReason: reason, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await database.putCard(card);
  if (session) {
    session.remainingIds = session.remainingIds.filter((item) => item !== id);
    if (!session.remainingIds.length) session.completedAt = new Date().toISOString();
    await database.putSession(session);
  }
  render();
  showNotice('Card archived. You can restore it from Cards.');
}

async function review(action: 'later' | 'again'): Promise<void> {
  const card = currentCard();
  if (!card || !session) return;
  if (action === 'later') {
    card.dueOn = addDays(1);
    session.remainingIds = session.remainingIds.slice(1);
  } else {
    session.remainingIds = [...session.remainingIds.slice(1), card.id];
  }
  card.updatedAt = new Date().toISOString();
  await database.putCard(card);
  if (!session.remainingIds.length) session.completedAt = new Date().toISOString();
  await database.putSession(session);
  answerVisible = false;
  render();
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportBackup(): Promise<void> {
  const storedSessions = await database.allSessions();
  const backup: Backup = { version: 1, cards, settings, reflections, sessions: storedSessions.filter(isSession) };
  download(`quiet-loop-${today()}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

async function verifyLicense(token: string): Promise<boolean | null> {
  const verdictKey = localKey(`sb_license_verdict:${PRODUCT_SLUG}`);
  const cached = cachedLicenseVerdict();
  if (cached !== null) return cached;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('License check failed.');
    const result = await response.json() as { valid?: unknown };
    if (typeof result.valid !== 'boolean') throw new Error('License response was invalid.');
    localStorage.setItem(verdictKey, JSON.stringify({ valid: result.valid, at: Date.now() }));
    return result.valid;
  } catch {
    return null;
  }
}

async function reconcileLicense(): Promise<void> {
  if (isDemoMode) return;
  const token = licenseState();
  if (!token) return;
  const valid = await verifyLicense(token);
  if (valid === true) {
    const changed = !licenseUnlocked;
    licenseUnlocked = true;
    if (changed && view === 'shelf') render();
  } else if (valid === false) {
    localStorage.removeItem(localKey(`sb_license:${PRODUCT_SLUG}`));
    licenseUnlocked = false;
    if (view === 'shelf') render();
    showNotice('This license is not active. Free review and exports still work.');
  } else {
    showNotice('The license could not be checked. Reconnect and try again.');
  }
}

function formError(form: HTMLFormElement, field: HTMLTextAreaElement, message: string, errorId: string): void {
  field.setCustomValidity(message);
  const region = form.querySelector<HTMLElement>(`#${errorId}`);
  if (region) region.textContent = message;
  field.reportValidity();
  field.focus();
}

async function activateUpdate(): Promise<void> {
  const waiting = swRegistration?.waiting;
  if (!waiting) return;
  let reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  waiting.postMessage('skip-waiting');
  window.setTimeout(reload, 3000);
}

app.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;

  if (target.closest('[data-reset-demo]')) {
    await seedDemo();
    view = 'today';
    answerVisible = false;
    history.replaceState({}, '', '/demo');
    await load();
    showNotice('Demo reset to five sample cards.');
    return;
  }
  if (target.closest('[data-start-real]')) {
    await database.clearAll();
    localStorage.removeItem(demoMarker);
    location.assign('/');
    return;
  }

  const viewLink = target.closest<HTMLElement>('[data-view]');
  if (viewLink) {
    event.preventDefault();
    navigate(viewLink.dataset.view as View, viewLink.hasAttribute('data-focus-add'));
    return;
  }
  if (target.closest('[data-show-answer]')) {
    answerVisible = true;
    render();
    return;
  }
  if (target.closest('[data-start-session]') || target.closest('[data-reset-session]')) {
    await ensureSession(true);
    render();
    return;
  }
  const reviewButton = target.closest<HTMLElement>('[data-review]');
  if (reviewButton) {
    await review(reviewButton.dataset.review as 'later' | 'again');
    return;
  }
  const edit = target.closest<HTMLElement>('[data-edit]');
  if (edit) {
    app.querySelector('.form-sheet')?.remove();
    const card = cards.find((item) => item.id === edit.dataset.edit);
    if (card) {
      app.querySelector('.collection')?.insertAdjacentHTML('beforebegin', cardForm(card));
      app.querySelector<HTMLTextAreaElement>('#card-front')?.focus();
    }
    return;
  }
  if (target.closest('[data-cancel-edit]')) {
    render();
    return;
  }
  const archiveButton = target.closest<HTMLElement>('[data-archive]');
  if (archiveButton) {
    const dialog = app.querySelector<HTMLDialogElement>('#archive-dialog')!;
    const card = cards.find((item) => item.id === archiveButton.dataset.archive);
    dialog.dataset.id = archiveButton.dataset.archive ?? '';
    app.querySelector('#archive-card-name')!.textContent = card?.front ?? '';
    const reason = app.querySelector<HTMLSelectElement>('#archive-reason')!;
    reason.value = '';
    dialog.showModal();
    reason.focus();
    return;
  }
  if (target.closest('[data-close-dialog]')) {
    app.querySelector<HTMLDialogElement>('#archive-dialog')?.close();
    return;
  }
  const restore = target.closest<HTMLElement>('[data-restore]');
  if (restore) {
    const card = cards.find((item) => item.id === restore.dataset.restore);
    if (card) {
      Object.assign(card, { status: 'active', dueOn: today(), archivedAt: undefined, archiveReason: undefined, updatedAt: new Date().toISOString() });
      await database.putCard(card);
      render();
      showNotice('Card restored and due today.');
    }
    return;
  }
  const exportButton = target.closest<HTMLElement>('[data-export]');
  if (exportButton) {
    const kind = exportButton.dataset.export;
    if (kind === 'csv') download(`quiet-loop-${today()}.csv`, cardsCsv(cards), 'text/csv;charset=utf-8');
    else await exportBackup();
    showNotice(`${kind === 'csv' ? 'CSV' : 'JSON backup'} exported.`);
    return;
  }
  if (target.closest('[data-delete-all]')) {
    if (window.confirm('Delete every card, review, setting, and reflection stored by Quiet Loop in this browser? This cannot be undone.')) {
      await database.clearAll();
      cards = [];
      reflections = [];
      session = undefined;
      settings = { dailyLimit: 7, weeklyPlan: false, theme: 'system' };
      view = 'today';
      history.pushState({}, '', viewUrl('today'));
      render(true);
      showNotice('All local Quiet Loop data was deleted.');
    }
    return;
  }
  if (target.closest('button[data-theme-action]')) {
    settings.theme = settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system';
    await database.putSettings(settings);
    render();
    return;
  }
  if (target.closest('button[data-refresh]')) await activateUpdate();
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id === 'card-form') {
    const values = new FormData(form);
    const front = String(values.get('front') ?? '').trim();
    const back = String(values.get('back') ?? '').trim();
    if (!front) {
      formError(form, form.elements.namedItem('front') as HTMLTextAreaElement, 'Enter a prompt with at least one visible character.', 'card-form-error');
      return;
    }
    if (!back) {
      formError(form, form.elements.namedItem('back') as HTMLTextAreaElement, 'Enter an answer with at least one visible character.', 'card-form-error');
      return;
    }
    const now = new Date().toISOString();
    const existing = cards.find((card) => card.id === form.dataset.id);
    const card: Card = {
      id: existing?.id ?? uid(),
      front,
      back,
      language: String(values.get('language') ?? '').trim(),
      note: String(values.get('note') ?? '').trim(),
      dueOn: String(values.get('dueOn') ?? ''),
      status: existing?.status ?? 'active',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt,
      archiveReason: existing?.archiveReason
    };
    await database.putCard(card);
    if (existing) Object.assign(existing, card);
    else cards.push(card);
    view = 'cards';
    history.replaceState({ view }, '', viewUrl(view));
    render();
    showNotice(existing ? 'Card changes saved.' : 'Card added.');
    return;
  }
  if (form.id === 'archive-form') {
    const dialog = form.closest<HTMLDialogElement>('dialog')!;
    const reason = app.querySelector<HTMLSelectElement>('#archive-reason')!.value;
    if (!reason) return;
    dialog.close();
    await archive(dialog.dataset.id ?? '', reason);
    return;
  }
  if (form.id === 'reflection-form') {
    const field = form.elements.namedItem('reflection') as HTMLTextAreaElement;
    const text = field.value.trim();
    if (!text) {
      formError(form, field, 'Enter a reflection with at least one visible character.', 'reflection-error');
      return;
    }
    const reflection: Reflection = { id: uid(), week: nextWeekLabel(), text, createdAt: new Date().toISOString() };
    await database.putReflection(reflection);
    reflections.push(reflection);
    render();
    showNotice('Reflection saved.');
    return;
  }
  if (form.id === 'license-form') {
    const token = String(new FormData(form).get('license') ?? '').trim();
    if (!token) return;
    localStorage.setItem(localKey(`sb_license:${PRODUCT_SLUG}`), token);
    localStorage.removeItem(localKey(`sb_license_verdict:${PRODUCT_SLUG}`));
    const valid = await verifyLicense(token);
    if (valid === false) {
      localStorage.removeItem(localKey(`sb_license:${PRODUCT_SLUG}`));
      licenseUnlocked = false;
      showNotice('That license is not active. Check the token or buy a new license.');
    } else if (valid === true) {
      licenseUnlocked = true;
      render();
      showNotice('Purchase restored. Weekly reflections are available.');
    } else {
      licenseUnlocked = false;
      showNotice('The license could not be checked. Reconnect and try again.');
    }
  }
});

app.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'weekly-plan') {
    settings.weeklyPlan = target.checked;
    await database.putSettings(settings);
    render();
    return;
  }
  if (target.id === 'import-file' && target.files?.[0]) {
    try {
      const backup = parseBackup(JSON.parse(await target.files[0].text()));
      await database.writeBackup(backup);
      await load();
      showNotice('JSON backup imported.');
    } catch {
      showNotice('This is not a valid Quiet Loop JSON backup. Choose an unedited Quiet Loop export.');
    } finally {
      target.value = '';
    }
  }
});

app.addEventListener('input', async (event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (target.id === 'daily-limit') {
    settings.dailyLimit = Number(target.value);
    const output = app.querySelector('#limit-output');
    if (output) output.textContent = `${target.value} cards`;
    await database.putSettings(settings);
  }
  if (target.matches('#card-front, #card-back, #reflection')) {
    target.setCustomValidity('');
    const error = target.closest('form')?.querySelector<HTMLElement>('.form-error');
    if (error) error.textContent = '';
  }
});

window.addEventListener('popstate', () => {
  view = routeView();
  answerVisible = false;
  render(true);
});

window.addEventListener('online', () => {
  online = true;
  app.querySelector<HTMLElement>('.offline-banner')?.setAttribute('hidden', '');
});

window.addEventListener('offline', () => {
  online = false;
  app.querySelector<HTMLElement>('.offline-banner')?.removeAttribute('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    swRegistration = registration;
    const announceUpdate = () => {
      updateReady = true;
      app.querySelector<HTMLElement>('[data-refresh]')?.removeAttribute('hidden');
    };
    if (registration.waiting) announceUpdate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
      if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
    }));
  }).catch((error) => console.error('Service worker registration failed', error));
}

const inboundUrl = new URL(location.href);
const inboundLicense = inboundUrl.searchParams.get('license');
if (inboundLicense && !isDemoMode) {
  localStorage.setItem(localKey(`sb_license:${PRODUCT_SLUG}`), inboundLicense);
  localStorage.removeItem(localKey(`sb_license_verdict:${PRODUCT_SLUG}`));
  inboundUrl.searchParams.delete('license');
  history.replaceState({}, '', `${inboundUrl.pathname}${inboundUrl.search}${inboundUrl.hash}`);
}

document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', () => {
  requestAnimationFrame(() => app.querySelector<HTMLElement>('main h1')?.focus());
});

void load();
