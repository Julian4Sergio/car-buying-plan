const DATA_FILES = ['profile', 'vehicles', 'quotes', 'test-drives', 'family-notes', 'progress'];

async function loadJson(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`无法加载 data/${name}.json（HTTP ${response.status}）`);
  return response.json();
}

function present(value, suffix = '') {
  return value === null || value === undefined || value === '' ? '待核实' : `${value}${suffix}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\'\"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function displayVehicleName(vehicle) {
  return vehicle.name.startsWith(vehicle.brand) ? vehicle.name : `${vehicle.brand} ${vehicle.name}`;
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

function recommendedVariant(vehicle) {
  return vehicle.variants.find((variant) => variant.id === vehicle.recommendedVariantId) || {};
}

function renderOverview(profile, ranking) {
  const overview = document.querySelector('#overview');
  const allScoresMissing = ranking.every(({ score }) => score === null);
  const needs = [
    `${present(profile.city)}、${present(profile.powertrain)}${present(profile.bodyType)}`,
    `约${present(profile.familySize)}人、${present(profile.purchaseWindowMonths?.join('-'), '个月')}`,
    `${present(profile.primaryUse)}、每周约 ${present(profile.weeklyKm, 'km')}`,
    `约 ${present(profile.homeChargingAfterMonths, '个月')} 后家充，此前${present(profile.chargingBeforeHome)}`,
  ];
  const recommendations = ranking.slice(0, 3).map((item, index) => {
    const variant = recommendedVariant(item.vehicle);
    const rankLabel = item.score === null ? `重点候选 ${index + 1}` : `推荐 ${index + 1}`;
    const score = item.score === null ? '待评分' : item.score.toFixed(1);
    return `<article class="card overview-recommendation">
      <span class="tag ${escapeHtml(budgetStatus(item.totalWan, profile.budget).className)}">${escapeHtml(rankLabel)}</span>
      <h2>${escapeHtml(displayVehicleName(item.vehicle))}</h2>
      <p class="muted">${escapeHtml(present(variant.name))}</p>
      <p class="score-meta">评分：<strong>${escapeHtml(score)}</strong> · 置信度：${escapeHtml(present(item.confidence, '%'))} · <span class="tag ${escapeHtml(budgetStatus(item.totalWan, profile.budget).className)}">${escapeHtml(budgetStatus(item.totalWan, profile.budget).label)}</span></p>
      <ul class="compact-list"><li>优势：${escapeHtml(present(item.vehicle.strengths?.[0]))}</li><li>风险：${escapeHtml(present(item.vehicle.risks?.[0]))}</li></ul>
    </article>`;
  }).join('');
  overview.querySelector('.grid').innerHTML = `
    <article class="card"><h2>需求</h2><ul class="compact-list">${needs.map((need) => `<li>${escapeHtml(need)}</li>`).join('')}</ul></article>
    <article class="card"><h2>预算</h2><p>目标 ${escapeHtml(money(profile.budget?.targetWan))}</p><p class="muted">观察上限 ${escapeHtml(money(profile.budget?.ceilingWan))}</p></article>
    <article class="card"><h2>更新时间</h2><p>${escapeHtml(present(profile.lastReviewed))}</p><p class="muted">${escapeHtml(present(profile.scoreNote))}</p></article>
    ${allScoresMissing ? '<p class="ranking-note muted">现阶段资料不足，顺序不代表最终推荐</p>' : ''}
    ${recommendations}`;
}

function renderCandidates(vehicles, quotes, profile) {
  const container = document.querySelector('#candidates .grid');
  container.innerHTML = vehicles.map((vehicle) => {
    const variant = recommendedVariant(vehicle);
    const quote = quotes.find((item) => item.vehicleId === vehicle.id && item.variantId === vehicle.recommendedVariantId);
    const totalWan = quote ? calculateEstimatedTotal(quote) : null;
    const status = budgetStatus(totalWan, profile.budget);
    const source = vehicle.sources?.[0] || {};
    return `<article class="card vehicle-card">
      <img class="vehicle-image" src="${escapeHtml(vehicle.image || 'assets/car-placeholder.svg')}" alt="${escapeHtml(displayVehicleName(vehicle))}" onerror="this.onerror=null;this.src='assets/car-placeholder.svg'">
      <p><span class="tag tag--reference">${escapeHtml(present(vehicle.status))}</span> <span class="tag ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span></p>
      <h3>${escapeHtml(displayVehicleName(vehicle))}</h3>
      <p class="muted">推荐版本：${escapeHtml(present(variant.name))}</p>
      <p class="price-meta">指导价：${escapeHtml(money(quote?.guidePriceWan ?? variant.guidePriceWan))}<br>预计落地价：${escapeHtml(money(totalWan))}</p>
      <p>${escapeHtml(present(vehicle.summary))}</p>
      <ul class="compact-list"><li>优势：${escapeHtml(present(vehicle.strengths?.[0]))}</li><li>风险：${escapeHtml(present(vehicle.risks?.[0]))}</li></ul>
      <p class="source-meta">来源：<a href="${escapeHtml(source.url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(present(source.title))}</a> · ${escapeHtml(present(source.checkedAt))}</p>
    </article>`;
  }).join('');
}

function comparisonTable(vehicles) {
  if (!vehicles.length) return '<p class="muted">请选择至少一款车型。</p>';
  const scoreLabels = [
    ['battery', '电池'], ['afterSales', '售后'], ['comfort', '舒适'], ['space', '空间'], ['safety', '安全'],
    ['charging', '补能'], ['price', '价格'], ['driving', '驾驶'], ['smart', '智能'],
  ];
  const dimensions = (vehicle) => {
    const values = ['lengthMm', 'widthMm', 'heightMm'].map((field) => present(vehicle.specs?.[field]));
    return `${values.join(' × ')} mm`;
  };
  const rows = [
    ['推荐版本', (vehicle) => recommendedVariant(vehicle).name],
    ['车身尺寸', dimensions],
    ['轴距', (vehicle) => present(vehicle.specs?.wheelbaseMm, ' mm')],
    ['后备厢', (vehicle) => present(vehicle.specs?.trunkLiters, ' L')],
    ['电池厂商', (vehicle) => vehicle.specs?.batterySupplier],
    ['电池容量', (vehicle) => present(recommendedVariant(vehicle).batteryKwh, ' kWh')],
    ['CLTC续航', (vehicle) => present(recommendedVariant(vehicle).cltcKm, ' km')],
    ['充电平台', (vehicle) => recommendedVariant(vehicle).chargingPlatform],
    ...scoreLabels.map(([key, label]) => [label, (vehicle) => vehicle.scores?.[key]?.value]),
    ['主要风险', (vehicle) => vehicle.risks?.join('；')],
  ];
  return `<div class="scroll-table"><table class="comparison-table">
    <thead><tr><th scope="col">对比项</th>${vehicles.map((vehicle) => `<th scope="col">${escapeHtml(displayVehicleName(vehicle))}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th>${vehicles.map((vehicle) => `<td>${escapeHtml(present(value(vehicle)))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function renderComparison(vehicles, ranking) {
  const section = document.querySelector('#comparison');
  let content = section.querySelector('.comparison-content');
  if (!content) {
    section.querySelectorAll(':scope > :not(#comparison-title)').forEach((element) => element.remove());
    content = document.createElement('div');
    content.className = 'comparison-content';
    section.append(content);
  }
  let selectedIds = ranking.slice(0, 3).map(({ vehicle }) => vehicle.id);
  const draw = (focusedVehicleId) => {
    const selectedVehicles = vehicles.filter((vehicle) => selectedIds.includes(vehicle.id));
    content.innerHTML = `<fieldset class="compare-controls"><legend>选择对比车型（最多 3 款）</legend>${vehicles.map((vehicle) => {
      const checked = selectedIds.includes(vehicle.id);
      const disabled = !checked && selectedIds.length >= 3;
      return `<label${disabled ? ' class="is-disabled"' : ''}><input type="checkbox" value="${escapeHtml(vehicle.id)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}> ${escapeHtml(displayVehicleName(vehicle))}</label>`;
    }).join('')}</fieldset>${comparisonTable(selectedVehicles)}`;
    content.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) {
          if (selectedIds.length >= 3) {
            input.checked = false;
            return;
          }
          selectedIds = [...selectedIds, input.value];
        } else {
          selectedIds = selectedIds.filter((id) => id !== input.value);
        }
        draw(input.value);
      });
    });
    if (focusedVehicleId) {
      [...content.querySelectorAll('input[type="checkbox"]')].find((input) => input.value === focusedVehicleId)?.focus();
    }
  };
  draw();
}
function renderCosts() {}
function renderTestDrives() {}
function renderFamilyNotes() {}
function renderProgress() {}

function renderApp(data) {
  const ranking = buildRanking(data.vehicles, data.quotes, data.profile);
  renderOverview(data.profile, ranking);
  renderCandidates(data.vehicles, data.quotes, data.profile);
  renderComparison(data.vehicles, ranking);
  renderCosts(data.quotes, data.vehicles, data.profile);
  renderTestDrives(data['test-drives']);
  renderFamilyNotes(data['family-notes']);
  renderProgress(data.progress);
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
