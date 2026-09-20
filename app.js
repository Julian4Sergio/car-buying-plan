const DATA_FILES = ['profile', 'vehicles', 'quotes', 'test-drives', 'family-notes', 'progress'];

async function loadJson(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`无法加载 data/${name}.json（HTTP ${response.status}）`);
  return response.json();
}

function renderApp(data) {
  document.querySelector('#overview').dataset.ready = String(Boolean(data.profile));
}

async function start() {
  const status = document.querySelector('#app-status');
  try {
    const values = await Promise.all(DATA_FILES.map(loadJson));
    const data = Object.fromEntries(DATA_FILES.map((name, index) => [name, values[index]]));
    renderApp(data);
    status.textContent = `资料已加载，最后更新：${data.profile.lastReviewed}`;
  } catch (error) {
    status.className = 'card tag tag--reference';
    status.textContent = `购车计划暂时无法加载：${error.message}`;
  }
}

start();
