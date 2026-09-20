const DATA_FILES = ['profile', 'vehicles', 'quotes', 'test-drives', 'family-notes', 'progress'];

async function loadJson(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`无法加载 data/${name}.json（HTTP ${response.status}）`);
  return response.json();
}

function present(value, suffix = '') {
  return value === null || value === undefined || value === '' ? '待核实' : `${value}${suffix}`;
}

function money(value) {
  return value === null || value === undefined ? '待核实' : `${value.toFixed(2)} 万元`;
}

function calculateEstimatedTotal(quote) {
  const fields = ['guidePriceWan', 'discountWan', 'insuranceWan', 'purchaseTaxWan', 'registrationWan', 'optionsWan'];
  if (fields.some((field) => quote[field] === null || quote[field] === undefined)) return null;
  const total = quote.guidePriceWan - quote.discountWan + quote.insuranceWan + quote.purchaseTaxWan + quote.registrationWan + quote.optionsWan;
  return Math.round(total * 1_000_000) / 1_000_000;
}

function budgetStatus(totalWan, budget) {
  if (totalWan === null) return { label: '落地价待核实', className: 'tag--reference' };
  if (totalWan <= budget.targetWan) return { label: '预算内', className: 'tag--within' };
  if (totalWan <= budget.ceilingWan) return { label: `需放宽 ${(totalWan - budget.targetWan).toFixed(2)} 万`, className: 'tag--stretch' };
  return { label: `超观察上限 ${(totalWan - budget.ceilingWan).toFixed(2)} 万`, className: 'tag--reference' };
}

function calculateScore(vehicle, weights) {
  let weighted = 0;
  let availableWeight = 0;
  Object.entries(weights).forEach(([key, weight]) => {
    const value = vehicle.scores[key]?.value;
    if (typeof value === 'number') {
      weighted += value * weight;
      availableWeight += weight;
    }
  });
  return { score: availableWeight ? weighted / availableWeight : null, confidence: availableWeight };
}

function buildRanking(vehicles, quotes, profile) {
  return vehicles
    .map((vehicle) => {
      const quote = quotes.find((item) => item.vehicleId === vehicle.id && item.variantId === vehicle.recommendedVariantId) || null;
      const totalWan = quote ? calculateEstimatedTotal(quote) : null;
      const { score, confidence } = calculateScore(vehicle, profile.weights);
      return { vehicle, quote, totalWan, score, confidence };
    })
    .filter(({ totalWan }) => totalWan === null || totalWan <= profile.budget.ceilingWan)
    .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
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
