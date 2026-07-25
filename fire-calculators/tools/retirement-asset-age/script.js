const STORAGE_COOKIE = "retirement_asset_age_v2";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MAX_ASSETS = 8;
const MAX_MONTHS = 1200;

const DEFAULT_STATE = {
  currentAge: 36,
  targetAssetWan: 4500,
  assets: [
    { name: "VT", currentAssetWan: 100, annualReturn: 7, monthlyContributionWan: 4, note: "全球股票 ETF" },
    { name: "006208", currentAssetWan: 100, annualReturn: 9, monthlyContributionWan: 0, note: "台灣大型股 ETF" },
    { name: "2412", currentAssetWan: 100, annualReturn: 3.9, monthlyContributionWan: 1.4, note: "中華電信" },
    { name: "現金", currentAssetWan: 100, annualReturn: 1, monthlyContributionWan: 1, note: "現金／定存" }
  ]
};

const assetRows = document.getElementById("assetRows");
const addAssetButton = document.getElementById("addAssetButton");
const calculateButton = document.getElementById("calculateButton");
const resetButton = document.getElementById("resetButton");
const formError = document.getElementById("formError");
let state = loadState();
let assetGrowthChart = null;

renderInputs();
calculateAndRender();

document.getElementById("currentAge").addEventListener("input", handleInputChange);
document.getElementById("targetAssetWan").addEventListener("input", handleInputChange);
assetRows.addEventListener("input", handleInputChange);
assetRows.addEventListener("click", handleAssetAction);
calculateButton.addEventListener("click", calculateAndRender);
addAssetButton.addEventListener("click", addAsset);
resetButton.addEventListener("click", resetState);

function renderInputs() {
  document.getElementById("currentAge").value = state.currentAge;
  document.getElementById("targetAssetWan").value = state.targetAssetWan;
  assetRows.innerHTML = state.assets.map((asset, index) => `
    <tr data-index="${index}">
      <td data-label="投資標的">
        <input data-field="name" type="text" value="${escapeHtml(asset.name)}" maxlength="30" aria-label="第 ${index + 1} 項投資標的" />
      </td>
      <td data-label="目前資產（萬元）">
        <input data-field="currentAssetWan" type="number" value="${asset.currentAssetWan}" min="0" step="1" inputmode="decimal" aria-label="${escapeHtml(asset.name || `第 ${index + 1} 項`)}目前資產" />
      </td>
      <td data-label="年化報酬率">
        <div class="input-suffix"><input data-field="annualReturn" type="number" value="${asset.annualReturn}" min="-99.99" step="0.1" aria-label="${escapeHtml(asset.name || `第 ${index + 1} 項`)}年化報酬率" /><span>%</span></div>
      </td>
      <td data-label="每月投入（萬元）">
        <input data-field="monthlyContributionWan" type="number" value="${asset.monthlyContributionWan}" min="0" step="0.1" inputmode="decimal" aria-label="${escapeHtml(asset.name || `第 ${index + 1} 項`)}每月投入" />
      </td>
      <td data-label="備註">
        <input data-field="note" type="text" value="${escapeHtml(asset.note)}" maxlength="50" aria-label="${escapeHtml(asset.name || `第 ${index + 1} 項`)}備註" />
      </td>
      <td class="asset-remove-cell">
        <button class="icon-button remove-asset" type="button" aria-label="刪除第 ${index + 1} 項資產" ${state.assets.length === 1 ? "disabled" : ""}>×</button>
      </td>
    </tr>
  `).join("");
  addAssetButton.disabled = state.assets.length >= MAX_ASSETS;
}

function handleInputChange(event) {
  const row = event.target.closest("tr[data-index]");
  if (row && event.target.dataset.field) {
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    state.assets[index][field] = isNumericField(field) ? toFiniteNumber(event.target.value) : event.target.value;
  } else {
    state.currentAge = toFiniteNumber(document.getElementById("currentAge").value);
    state.targetAssetWan = toFiniteNumber(document.getElementById("targetAssetWan").value);
  }
  saveState();
  calculateAndRender();
}

function handleAssetAction(event) {
  const button = event.target.closest(".remove-asset");
  if (!button) return;
  const row = button.closest("tr[data-index]");
  state.assets.splice(Number(row.dataset.index), 1);
  saveState();
  renderInputs();
  calculateAndRender();
}

function addAsset() {
  if (state.assets.length >= MAX_ASSETS) return;
  state.assets.push({ name: `資產 ${state.assets.length + 1}`, currentAssetWan: 0, annualReturn: 0, monthlyContributionWan: 0, note: "" });
  saveState();
  renderInputs();
  calculateAndRender();
  assetRows.querySelector("tr:last-child input").focus();
}

function resetState() {
  state = structuredClone(DEFAULT_STATE);
  saveState();
  renderInputs();
  calculateAndRender();
}

function calculateAndRender() {
  try {
    const inputs = validateState(state);
    const result = calculateProjection(inputs);
    renderResult(inputs, result);
    renderAssetGrowthChart(inputs);
    formError.hidden = true;
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
}

function calculateProjection(inputs) {
  const balances = inputs.assets.map((asset) => asset.currentAssetWan);
  const monthlyRates = inputs.assets.map((asset) => Math.pow(1 + asset.annualReturn / 100, 1 / 12) - 1);
  let total = sum(balances);
  let months = total >= inputs.targetAssetWan ? 0 : null;

  for (let month = 1; month <= MAX_MONTHS && months === null; month++) {
    for (let index = 0; index < balances.length; index++) {
      balances[index] = balances[index] * (1 + monthlyRates[index]) + inputs.assets[index].monthlyContributionWan;
    }
    total = sum(balances);
    if (total >= inputs.targetAssetWan) months = month;
  }

  return { balances, monthlyRates, total, months, reached: months !== null };
}

function calculateGrowthTrend(inputs) {
  const balances = inputs.assets.map((asset) => asset.currentAssetWan);
  const monthlyRates = inputs.assets.map((asset) => Math.pow(1 + asset.annualReturn / 100, 1 / 12) - 1);
  const monthsToAge80 = Math.max(0, Math.round((80 - inputs.currentAge) * 12));
  const rows = [createTrendRow(inputs.currentAge, balances)];

  for (let month = 1; month <= monthsToAge80; month++) {
    for (let index = 0; index < balances.length; index++) {
      balances[index] = balances[index] * (1 + monthlyRates[index]) + inputs.assets[index].monthlyContributionWan;
    }

    if (month % 12 === 0 || month === monthsToAge80) {
      rows.push(createTrendRow(inputs.currentAge + month / 12, balances));
    }
  }

  return rows;
}

function createTrendRow(age, balances) {
  return {
    age,
    balances: [...balances],
    total: sum(balances)
  };
}

function renderResult(inputs, result) {
  const currentTotal = sum(inputs.assets.map((asset) => asset.currentAssetWan));
  const monthlyTotal = sum(inputs.assets.map((asset) => asset.monthlyContributionWan));
  const gap = Math.max(inputs.targetAssetWan - currentTotal, 0);
  const targetAge = result.reached ? formatAge(inputs.currentAge, result.months) : "超過 100 年";

  document.getElementById("targetAge").textContent = targetAge;
  document.getElementById("targetStatus").textContent = result.reached
    ? result.months === 0 ? "目前資產已達退休目標" : `預計再經過 ${formatDuration(result.months)}達標`
    : "依目前設定，100 年內未達標";
  document.getElementById("monthsNeeded").textContent = result.reached ? `${formatNumber(result.months)} 個月` : "超過 1,200 個月";
  document.getElementById("totalAtTarget").textContent = result.reached ? formatWan(result.total) : "—";
  document.getElementById("currentTotal").textContent = formatWan(currentTotal);
  document.getElementById("monthlyTotal").textContent = formatWan(monthlyTotal, 1);
  document.getElementById("targetGap").textContent = formatWan(gap);

  const allocationRows = document.getElementById("allocationRows");
  allocationRows.innerHTML = inputs.assets.map((asset, index) => {
    const allocation = result.total > 0 ? result.balances[index] / result.total : 0;
    return `
      <tr>
        <td>${escapeHtml(asset.name || "未命名資產")}</td>
        <td>${formatPercent(result.monthlyRates[index])}</td>
        <td>${result.reached ? formatWan(result.balances[index]) : "—"}</td>
        <td>${result.reached ? formatPercent(allocation) : "—"}</td>
        <td>${escapeHtml(asset.note)}</td>
      </tr>
    `;
  }).join("");

  const hero = document.querySelector(".retirement-result-hero");
  hero.classList.toggle("not-reached", !result.reached);
}

function renderAssetGrowthChart(inputs) {
  const canvas = document.getElementById("assetGrowthChart");
  if (typeof Chart === "undefined") {
    canvas.parentElement.innerHTML = '<p class="form-error">趨勢圖元件載入失敗，請重新整理頁面。</p>';
    return;
  }

  const rows = calculateGrowthTrend(inputs);
  const colors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4f46e5", "#65a30d"];
  const assetDatasets = inputs.assets.map((asset, index) => ({
    label: asset.name || `資產 ${index + 1}`,
    data: rows.map((row) => Math.round(row.balances[index])),
    borderColor: colors[index],
    backgroundColor: colors[index],
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.15
  }));

  if (assetGrowthChart !== null) assetGrowthChart.destroy();
  assetGrowthChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: rows.map((row) => formatChartAge(row.age)),
      datasets: [
        {
          label: "總資產",
          data: rows.map((row) => Math.round(row.total)),
          borderColor: "#0f172a",
          backgroundColor: "#0f172a",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.15
        },
        ...assetDatasets,
        {
          label: "退休目標",
          data: rows.map(() => inputs.targetAssetWan),
          borderColor: "#e11d48",
          backgroundColor: "#e11d48",
          borderWidth: 2,
          borderDash: [7, 5],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}：${formatWan(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "年齡" },
          ticks: { maxTicksLimit: 12 }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "資產（萬元）" },
          ticks: {
            callback(value) {
              return `${Number(value).toLocaleString("zh-TW")} 萬`;
            }
          }
        }
      }
    }
  });
}

function validateState(value) {
  const currentAge = Number(value.currentAge);
  const targetAssetWan = Number(value.targetAssetWan);
  if (!Number.isFinite(currentAge) || currentAge < 0 || currentAge > 80) {
    throw new Error("目前年齡請輸入 0～80 歲。");
  }
  if (!Number.isFinite(targetAssetWan) || targetAssetWan <= 0) {
    throw new Error("退休目標資產必須大於 0。");
  }
  if (!Array.isArray(value.assets) || value.assets.length < 1 || value.assets.length > MAX_ASSETS) {
    throw new Error("請設定 1～8 項資產。");
  }
  const assets = value.assets.map((asset, index) => {
    const currentAssetWan = Number(asset.currentAssetWan);
    const annualReturn = Number(asset.annualReturn);
    const monthlyContributionWan = Number(asset.monthlyContributionWan);
    if (!Number.isFinite(currentAssetWan) || currentAssetWan < 0) throw new Error(`第 ${index + 1} 項目前資產不可小於 0。`);
    if (!Number.isFinite(annualReturn) || annualReturn <= -100) throw new Error(`第 ${index + 1} 項年化報酬率必須大於 -100%。`);
    if (!Number.isFinite(monthlyContributionWan) || monthlyContributionWan < 0) throw new Error(`第 ${index + 1} 項每月投入不可小於 0。`);
    return { name: String(asset.name || ""), currentAssetWan, annualReturn, monthlyContributionWan, note: String(asset.note || "") };
  });
  return { currentAge, targetAssetWan, assets };
}

function saveState() {
  const encoded = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${STORAGE_COOKIE}=${encoded}; Max-Age=${COOKIE_MAX_AGE}; Path=/fire-calculators/tools/retirement-asset-age/; SameSite=Lax`;
}

function loadState() {
  const prefix = `${STORAGE_COOKIE}=`;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  if (!cookie) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(decodeURIComponent(cookie.slice(prefix.length)));
    return validateState(parsed);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function isNumericField(field) {
  return ["currentAssetWan", "annualReturn", "monthlyContributionWan"].includes(field);
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatAge(currentAge, months) {
  const wholeAgeMonths = Math.round(currentAge * 12) + months;
  return `${Math.floor(wholeAgeMonths / 12)} 歲 ${wholeAgeMonths % 12} 個月`;
}

function formatDuration(months) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} 個月`;
  if (remainingMonths === 0) return `${years} 年`;
  return `${years} 年 ${remainingMonths} 個月`;
}

function formatWan(value, maximumFractionDigits = 0) {
  return `${value.toLocaleString("zh-TW", { maximumFractionDigits })} 萬元`;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("zh-TW");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatChartAge(age) {
  const roundedAge = Math.round(age * 12) / 12;
  const years = Math.floor(roundedAge);
  const months = Math.round((roundedAge - years) * 12);
  return months === 0 ? `${years} 歲` : `${years} 歲 ${months} 個月`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
