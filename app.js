const DATA_FILES = ['profile', 'vehicles', 'quotes', 'test-drives', 'family-notes', 'progress'];

async function loadJson(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`无法加载 data/${name}.json（HTTP ${response.status}）`);
  return response.json();
}

function renderApp(data) {
  document.querySelector('#overview').dataset.ready = 'true';
  document.querySelector('#app-status').textContent = `资料已加载，最后更新：${data.profile.lastReviewed}`;
}

async function start() {
  const status = document.querySelector('#app-status');
  try {
    const values = await Promise.all(DATA_FILES.map(loadJson));
    renderApp(Object.fromEntries(DATA_FILES.map((name, index) => [name, values[index]])));
  } catch (error) {
    status.className = 'card tag tag--reference';
    status.textContent = `购车计划暂时无法加载：${error.message}`;
  }
}

start();
