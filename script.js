// 页面状态集中管理，所有用户文字都通过 textContent 显示。
const $ = id => document.getElementById(id);
const presets = { food: ['今天吃什么？', '火锅\n面条\n饺子\n寿司\n麻辣烫'], weekend: ['周末去哪儿？', '逛公园\n看电影\n去书店\n骑行\n宅家休息'], break: ['休息做点什么？', '听一首歌\n伸个懒腰\n出门散步\n泡杯茶\n读几页书'], custom: ['我想决定……', ''] };
const storageKey = 'choose-for-me-v2';
let state = { question: '今天吃什么？', options: '火锅\n面条\n饺子', scene: 'food', noRepeat: false, drawn: [], history: [] };
let busy = false;
let currentId = null;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && typeof saved.question === 'string' && typeof saved.options === 'string') {
    state.question = saved.question.slice(0, 60); state.options = saved.options.slice(0, 3000);
    state.scene = Object.hasOwn(presets, saved.scene) ? saved.scene : 'custom';
    state.noRepeat = saved.noRepeat === true;
    state.drawn = Array.isArray(saved.drawn) ? saved.drawn.filter(x => typeof x === 'string') : [];
    state.history = Array.isArray(saved.history) ? saved.history.filter(x => x && typeof x.answer === 'string' && typeof x.question === 'string' && Number.isFinite(x.time) && typeof x.id === 'string').slice(0, 12) : [];
  }
} catch { $('save-status').textContent = '暂时无法读取保存内容'; }
function options() { return [...new Set(state.options.split('\n').map(x => x.trim()).filter(Boolean))]; }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); $('save-status').textContent = '已自动保存在当前浏览器'; }
  catch { $('save-status').textContent = '无法保存，关闭后可能丢失'; }
}
function update() {
  const items = options();
  $('count').textContent = `${items.length} 个选项`;
  $('ticket-question').textContent = state.question.trim() || '这次，选哪一个？';
  $('remaining').textContent = state.noRepeat ? `本轮还剩 ${items.filter(x => !state.drawn.includes(x)).length} / ${items.length} 个可选项` : '每次独立抽取，结果可能重复。';
  document.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scene === state.scene)));
}
function resetResult() {
  currentId = null; $('accept').hidden = true;
  $('result-label').textContent = '准备好了，就抽一签'; $('result').textContent = '?';
  $('result-note').textContent = '答案出现的那一刻，留意你的第一反应。';
  $('feedback').textContent = '不用想得太完美，先迈出一小步。';
  $('choose').firstChild.textContent = '帮我选一个 ';
}
function renderHistory() {
  $('history-list').replaceChildren(); $('empty-history').hidden = state.history.length > 0;
  $('clear-history').disabled = state.history.length === 0;
  for (const item of state.history) {
    const li = document.createElement('li'), detail = document.createElement('div'), title = document.createElement('strong'), subtitle = document.createElement('small'), time = document.createElement('time');
    title.textContent = item.answer + (item.accepted ? ' ✓' : ''); subtitle.textContent = item.question;
    time.textContent = new Date(item.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    detail.append(title, subtitle); li.append(detail, time); $('history-list').append(li);
  }
}
$('question').value = state.question; $('options').value = state.options; $('no-repeat').checked = state.noRepeat;
$('question').addEventListener('input', () => { state.question = $('question').value; state.scene = 'custom'; resetResult(); update(); save(); });
$('options').addEventListener('input', () => { state.options = $('options').value; state.scene = 'custom'; state.drawn = []; resetResult(); update(); save(); });
$('no-repeat').addEventListener('change', () => { state.noRepeat = $('no-repeat').checked; state.drawn = []; resetResult(); update(); save(); });
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
  state.scene = button.dataset.scene; [state.question, state.options] = presets[state.scene]; state.drawn = [];
  $('question').value = state.question; $('options').value = state.options; resetResult(); update(); save();
  if (state.scene === 'custom') $('question').focus();
}));
$('reset-round').addEventListener('click', () => { state.drawn = []; resetResult(); update(); save(); $('feedback').textContent = '新的一轮，所有选项都可以抽取。'; });
function lock(locked) {
  busy = locked;
  document.querySelectorAll('nav button, .editor input, .editor textarea, .editor button, #choose').forEach(el => { el.disabled = locked; });
  document.querySelector('.ticket').classList.toggle('drawing', locked);
}
function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
$('choose').addEventListener('click', () => {
  if (busy) return;
  const all = options(); const pool = state.noRepeat ? all.filter(x => !state.drawn.includes(x)) : all;
  if (all.length < 2) { $('result-label').textContent = '再添一个选项吧'; $('result').textContent = '…'; $('result-note').textContent = '至少写下两个不同的选项，每行一个。'; $('options').focus(); return; }
  if (!pool.length) { $('result-label').textContent = '这一轮抽完啦'; $('result').textContent = '✓'; $('result-note').textContent = '点击「重新开始一轮」，就能再次抽取。'; $('accept').hidden = true; return; }
  lock(true); $('accept').hidden = true; $('result-label').textContent = '好运正在挑选…'; $('result').textContent = '✳';
  const answer = pick(pool);
  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850;
  setTimeout(() => {
    if (state.noRepeat) state.drawn.push(answer);
    const item = { id: crypto.randomUUID(), answer, question: state.question.trim() || '这次，选哪一个？', time: Date.now(), accepted: false };
    currentId = item.id; state.history.unshift(item); state.history = state.history.slice(0, 12);
    $('result-label').textContent = '这次，就选它！'; $('result').textContent = answer;
    $('result-note').textContent = '是心动，还是想再试一次？你的感觉也很重要。';
    $('choose').firstChild.textContent = '再帮我选一次 '; $('accept').hidden = false;
    $('feedback').textContent = state.noRepeat ? '本轮接下来不会再抽到它。' : '每个选项，都有同样的机会。';
    lock(false); update(); renderHistory(); save();
  }, delay);
});
$('accept').addEventListener('click', () => {
  const item = state.history.find(x => x.id === currentId); if (!item) return;
  item.accepted = true; $('result-label').textContent = '决定了，就它！'; $('feedback').textContent = '小纠结结束，去享受你的选择吧。'; $('accept').hidden = true; renderHistory(); save();
});
$('clear-history').addEventListener('click', () => { state.history = []; currentId = null; $('accept').hidden = true; renderHistory(); save(); });
update(); renderHistory();
