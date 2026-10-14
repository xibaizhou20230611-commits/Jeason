const offlineStatus = document.getElementById('offline-status');
const installButton = document.getElementById('install-app');
const message = document.getElementById('app-message');
let installPrompt;
function tell(text) { message.hidden = false; message.textContent = text; }
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = null; tell('已添加到桌面，下次从图标打开即可。'); });
installButton.addEventListener('click', async () => {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) { tell('你已经在桌面应用中啦。'); return; }
  if (installPrompt) {
    const prompt = installPrompt; installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { document.getElementById('install-help').open = true; }
  } else { document.getElementById('install-help').open = true; }
});
document.getElementById('share-app').addEventListener('click', async () => {
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:') { tell('现在是本机预览。发布上线后，这里就能分享给朋友。'); return; }
  const url = new URL('./', location.href).href;
  try {
    if (navigator.share) { await navigator.share({title: '就选这个！', text: '纠结吃什么、去哪儿？来抽一签。', url}); }
    else { await navigator.clipboard.writeText(url); tell('链接已复制，粘贴发给朋友即可。'); }
  } catch (error) { if (error.name !== 'AbortError') tell('请复制浏览器地址栏的网址发给朋友：' + url); }
});
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    offlineStatus.textContent = '离线已就绪';
  }).catch(() => { offlineStatus.textContent = '离线准备失败，请联网刷新重试'; });
} else { offlineStatus.textContent = '此环境暂不支持离线安装，请使用 HTTPS 网址'; }
