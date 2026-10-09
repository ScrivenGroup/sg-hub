// theme toggle — in-memory only (no storage)
const root = document.documentElement;
const themeBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');
themeBtn.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeIcon.textContent = isDark ? '🌙' : '☀️';
  themeLabel.textContent = isDark ? 'Dark mode' : 'Light mode';
});

// top-level view switch (Component Library <-> Web-App Behaviours)
function switchView(view){
  document.body.setAttribute('data-view', view);
  document.getElementById('pillComponents').classList.toggle('active', view === 'components');
  document.getElementById('pillBehaviours').classList.toggle('active', view === 'behaviours');
  document.getElementById('pillProcesses').classList.toggle('active', view === 'processes');
  document.getElementById('sidebarComponents').style.display = view === 'components' ? '' : 'none';
  document.getElementById('sidebarBehaviours').style.display = view === 'behaviours' ? '' : 'none';
  document.getElementById('sidebarProcesses').style.display = view === 'processes' ? '' : 'none';
  document.getElementById('viewComponents').style.display = view === 'components' ? '' : 'none';
  document.getElementById('viewBehaviours').style.display = view === 'behaviours' ? '' : 'none';
  document.getElementById('viewProcesses').style.display = view === 'processes' ? '' : 'none';
  window.scrollTo({top:0});
}

// mobile menu
document.getElementById('menuBtn').addEventListener('click', () => {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.toggle('open'));
});

// code block toggle
function toggleCode(btn){
  const pre = btn.closest('.panel').querySelector('pre.code-block');
  pre.classList.toggle('open');
  btn.textContent = pre.classList.contains('open') ? 'Hide code' : 'Code';
}
function copyCode(btn){
  const pre = btn.closest('.panel').querySelector('pre.code-block');
  const text = pre.textContent;
  const done = () => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1400);
  };
  try{
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  }catch(e){ fallbackCopy(text, done); }
}
function fallbackCopy(text, done){
  try{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  }catch(e){ /* clipboard unavailable in this preview — no-op */ }
}
function copyNoteBlock(btn){
  const pre = btn.closest('details').querySelector('.note-body');
  const text = pre.textContent;
  const done = () => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy raw text'; btn.classList.remove('copied'); }, 1400);
  };
  try{
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  }catch(e){ fallbackCopy(text, done); }
}

// scrollspy for sidebar active link (works across both views; hidden sections just never intersect)
const links = Array.from(document.querySelectorAll('.nav-link'));
const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = '#' + entry.target.id;
    const link = links.find(l => l.getAttribute('href') === id);
    if(!link) return;
    if(entry.isIntersecting){
      const group = link.closest('aside');
      group.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
sections.forEach(s => spyObserver.observe(s));
document.querySelector('#sidebarComponents .nav-link') && document.querySelector('#sidebarComponents .nav-link').classList.add('active');
document.querySelector('#sidebarBehaviours .nav-link') && document.querySelector('#sidebarBehaviours .nav-link').classList.add('active');
document.querySelector('#sidebarProcesses .nav-link') && document.querySelector('#sidebarProcesses .nav-link').classList.add('active');

links.forEach(l => l.addEventListener('click', () => { if(window.innerWidth <= 900) document.querySelectorAll('.sidebar').forEach(s=>s.classList.remove('open')); }));

// ============ BEHAVIOUR DEMOS ============

// 1. loading vs blank
function runLoadingDemo(btn){
  const blank = document.getElementById('demoBlank');
  const skel = document.getElementById('demoSkeletonBox');
  blank.innerHTML = '';
  skel.innerHTML = '<div class="skeleton skel-line" style="width:80%"></div><div class="skeleton skel-line" style="width:60%"></div><div class="skeleton skel-line" style="width:70%"></div>';
  setTimeout(() => {
    skel.innerHTML = '<div class="fade-in" style="font-size:13px;"><strong>Order #4821</strong><br>Shipped Sep 14</div>';
  }, 900);
  setTimeout(() => {
    blank.innerHTML = '<div class="fade-in" style="font-size:13px;"><strong>Order #4821</strong><br>Shipped Sep 14</div>';
  }, 1400);
}

// 2. debounce vs naive
let debounceTimer = null, naiveCount = 0, debouncedCount = 0;
function onSearchInput(e){
  naiveCount++;
  document.getElementById('naiveCount').textContent = naiveCount;
  document.getElementById('searchStatus').textContent = 'typing…';
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedCount++;
    document.getElementById('debouncedCount').textContent = debouncedCount;
    document.getElementById('searchStatus').textContent = 'search fired ✓';
  }, 400);
}

// 3. optimistic like
function toggleLike(btn){
  const liked = btn.classList.toggle('liked');
  const countEl = btn.querySelector('.like-count');
  const count = parseInt(countEl.textContent, 10);
  countEl.textContent = liked ? count + 1 : count - 1;
  btn.querySelector('.heart').textContent = liked ? '♥' : '♡';
}

// 5. prevent double submit
function submitDemo(btn){
  if(btn.classList.contains('is-loading')) return;
  const original = btn.textContent;
  btn.classList.add('is-loading');
  setTimeout(() => {
    btn.classList.remove('is-loading');
    btn.textContent = 'Submitted ✓';
    btn.style.background = 'var(--success-600)';
    setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 1600);
  }, 1300);
}

// 7. autosave / dirty state
let saveTimer = null;
function markDirty(){
  document.getElementById('saveStatus').innerHTML = '<span class="dirty-dot"></span>Unsaved changes…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    document.getElementById('saveStatus').textContent = 'All changes saved';
  }, 900);
}

// 9. undo delete
let undoTimer = null;
function deleteRow(id, label){
  document.getElementById(id).style.display = 'none';
  const t = document.getElementById('undoToast');
  document.getElementById('undoToastText').textContent = label + ' deleted';
  t.style.display = 'flex';
  t.dataset.target = id;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { t.style.display = 'none'; }, 5000);
}
function undoDelete(){
  const t = document.getElementById('undoToast');
  const id = t.dataset.target;
  if(id){ document.getElementById(id).style.display = 'flex'; }
  t.style.display = 'none';
  clearTimeout(undoTimer);
}
function resetUndoDemo(){
  ['row1','row2','row3'].forEach(id => { document.getElementById(id).style.display = 'flex'; });
  document.getElementById('undoToast').style.display = 'none';
  clearTimeout(undoTimer);
}

// 10. retry
function retryLoad(){
  const wrap = document.getElementById('retryDemo');
  wrap.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;"></div><span style="font-size:13px; color:var(--text-muted); font-weight:600;">Retrying…</span>';
  setTimeout(() => {
    wrap.innerHTML = '<span style="font-size:13px; color:var(--success-600); font-weight:600;">✓ Comments loaded</span>';
  }, 1100);
}

// 10b. offline banner
function toggleOffline(el){
  document.getElementById('offlineBanner').style.display = el.checked ? 'flex' : 'none';
}
function resetRetryOfflineDemo(){
  const wrap = document.getElementById('retryDemo');
  wrap.innerHTML = '✕ Failed to load comments <button class="btn btn-secondary btn-sm" onclick="retryLoad()">Retry</button>';
  document.getElementById('offlineBanner').style.display = 'none';
  const cb = document.getElementById('offlineToggle');
  if(cb) cb.checked = false;
}

// 11. reduced motion
function toggleReducedMotion(el){
  document.getElementById('motionDemo2').classList.toggle('no-motion', el.checked);
}

const embedParams = new URLSearchParams(location.search);
if (embedParams.get("embed") === "1") document.body.classList.add("embed");
const startView = embedParams.get("view");
if (
  startView === "components" ||
  startView === "behaviours" ||
  startView === "processes"
) {
  switchView(startView);
}
