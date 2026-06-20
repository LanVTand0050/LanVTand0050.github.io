const defaultAssets = [
  { name: "台股", amountWan: 300, targetPercent: 30 },
  { name: "美股", amountWan: 500, targetPercent: 50 },
  { name: "債券", amountWan: 100, targetPercent: 10 },
  { name: "現金", amountWan: 100, targetPercent: 10 }
];

const assetRows = document.getElementById("assetRows");
const addAssetButton = document.getElementById("addAssetButton");
const calculateButton = document.getElementById("calculateButton");

addAssetButton.addEventListener("click", () => {
  addAssetRow({ name: "", amountWan: 0, targetPercent: 0 });
});

calculateButton.addEventListener("click", calculateRebalance);

document.querySelectorAll("input[name='rebalanceMode']").forEach((input) => {
  input.addEventListener("change", updateContributionVisibility);
});

window.addEventListener("load", () => {
  defaultAssets.forEach(addAssetRow);
  updateContributionVisibility();
  calculateRebalance();
});

function addAssetRow(asset) {
  const row = document.createElement("div");
  row.className = "asset-row";

  row.innerHTML = `
    <label class="asset-field">
      <span class="asset-field-label">資產名稱</span>
      <input class="asset-name" type="text" value="${escapeHtml(asset.name)}" aria-label="資產名稱" />
    </label>
    <label class="asset-field">
      <span class="asset-field-label">目前金額（萬元）</span>
      <input class="asset-amount" type="number" value="${asset.amountWan}" min="0" step="1" aria-label="目前金額" />
    </label>
    <label class="asset-field">
      <span class="asset-field-label">目標比例（%）</span>
      <input class="asset-target" type="number" value="${asset.targetPercent}" min="0" max="100" step="0.1" aria-label="目標比例" />
    </label>
    <button class="icon-button remove-asset-button" type="button" aria-label="移除資產">×</button>
  `;

  row.querySelector(".remove-asset-button").addEventListener("click", () => {
    if (assetRows.children.length <= 1) {
      alert("至少需要保留一個資產類別。");
      return;
    }

    row.remove();
    calculateRebalance();
  });

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", calculateRebalance);
  });

  assetRows.appendChild(row);
}

function updateContributionVisibility() {
  const mode = getMode();
  const newContributionLabel = document.getElementById("newContributionLabel");
  newContributionLabel.style.display = mode === "contribution" ? "grid" : "none";
  calculateRebalance();
}

function calculateRebalance() {
  try {
    const inputs = getInputs();
    const result = inputs.mode === "full"
      ? calculateFullRebalance(inputs)
      : calculateContributionOnlyRebalance(inputs);

    updateSummary(result);
    updateTable(result.rows);
  } catch (error) {
    showError(error.message);
  }
}

function getInputs() {
  const assets = Array.from(document.querySelectorAll(".asset-row")).map((row, index) => {
    const name = row.querySelector(".asset-name").value.trim() || `資產 ${index + 1}`;
    const amountWan = Number(row.querySelector(".asset-amount").value);
    const targetPercent = Number(row.querySelector(".asset-target").value);

    if (amountWan < 0) {
      throw new Error(`${name} 的目前金額不可小於 0。`);
    }

    if (targetPercent < 0) {
      throw new Error(`${name} 的目標比例不可小於 0。`);
    }

    return {
      name,
      amount: amountWan * 10000,
      targetPercent,
      targetRatio: targetPercent / 100
    };
  });

  if (assets.length === 0) {
    throw new Error("請至少輸入一個資產類別。");
  }

  const totalAsset = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const targetTotalPercent = assets.reduce((sum, asset) => sum + asset.targetPercent, 0);
  const mode = getMode();
  const newContributionWan = Number(document.getElementById("newContributionWan").value);

  if (totalAsset <= 0) {
    throw new Error("目前總資產必須大於 0。");
  }

  if (Math.abs(targetTotalPercent - 100) > 0.01) {
    throw new Error(`目標比例合計目前為 ${targetTotalPercent.toFixed(2)}%，請調整為 100%。`);
  }

  if (newContributionWan < 0) {
    throw new Error("新增投入金額不可小於 0。");
  }

  return {
    assets,
    totalAsset,
    targetTotalPercent,
    mode,
    newContribution: mode === "contribution" ? newContributionWan * 10000 : 0
  };
}

function getMode() {
  return document.querySelector("input[name='rebalanceMode']:checked").value;
}

function calculateFullRebalance(inputs) {
  const afterRebalanceTotal = inputs.totalAsset;

  const rows = inputs.assets.map((asset) => {
    const currentPercent = asset.amount / inputs.totalAsset * 100;
    const targetAmount = afterRebalanceTotal * asset.targetRatio;
    const actionAmount = targetAmount - asset.amount;

    return {
      name: asset.name,
      currentAmount: asset.amount,
      currentPercent,
      targetPercent: asset.targetPercent,
      driftPercent: currentPercent - asset.targetPercent,
      targetAmount,
      actionAmount
    };
  });

  return buildResult(inputs, rows, afterRebalanceTotal);
}

function calculateContributionOnlyRebalance(inputs) {
  const afterRebalanceTotal = inputs.totalAsset + inputs.newContribution;
  const rows = inputs.assets.map((asset) => {
    const currentPercent = asset.amount / inputs.totalAsset * 100;
    const targetAmount = afterRebalanceTotal * asset.targetRatio;
    const shortfall = Math.max(targetAmount - asset.amount, 0);

    return {
      name: asset.name,
      currentAmount: asset.amount,
      currentPercent,
      targetPercent: asset.targetPercent,
      driftPercent: currentPercent - asset.targetPercent,
      targetAmount,
      shortfall,
      actionAmount: 0
    };
  });

  let remainingContribution = inputs.newContribution;
  const totalShortfall = rows.reduce((sum, row) => sum + row.shortfall, 0);

  if (totalShortfall > 0 && remainingContribution > 0) {
    rows.forEach((row) => {
      row.actionAmount = Math.min(remainingContribution * (row.shortfall / totalShortfall), row.shortfall);
    });
  }

  return buildResult(inputs, rows, afterRebalanceTotal);
}

function buildResult(inputs, rows, afterRebalanceTotal) {
  const largestDriftRow = rows.reduce((largest, row) => {
    return Math.abs(row.driftPercent) > Math.abs(largest.driftPercent) ? row : largest;
  }, rows[0]);
  const largestDriftPercent = largestDriftRow.driftPercent;

  return {
    mode: inputs.mode,
    totalAsset: inputs.totalAsset,
    targetTotalPercent: inputs.targetTotalPercent,
    afterRebalanceTotal,
    largestDriftAsset: Math.abs(largestDriftPercent) < 0.005 ? "無偏離" : largestDriftRow.name,
    largestDriftPercent,
    rows
  };
}

function updateSummary(result) {
  document.getElementById("totalAsset").textContent = formatCurrency(result.totalAsset);
  document.getElementById("targetTotalPercent").textContent = `${result.targetTotalPercent.toFixed(2)}%`;
  document.getElementById("largestDriftAsset").textContent = result.largestDriftAsset;
  document.getElementById("largestDriftPercent").textContent = formatSignedPercent(result.largestDriftPercent);
  document.getElementById("afterRebalanceTotal").textContent = formatCurrency(result.afterRebalanceTotal);
}

function updateTable(rows) {
  const tableBody = document.getElementById("rebalanceTableBody");
  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(row.name)}</td>
      <td>${formatCurrency(row.currentAmount)}</td>
      <td>${formatPercent(row.currentPercent)}</td>
      <td>${formatPercent(row.targetPercent)}</td>
      <td>${formatSignedPercent(row.driftPercent)}</td>
      <td>${formatCurrency(row.targetAmount)}</td>
      <td>${formatAction(row.actionAmount)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

function showError(message) {
  document.getElementById("targetTotalPercent").textContent = "需修正";
  document.getElementById("largestDriftAsset").textContent = "-";
  document.getElementById("largestDriftPercent").textContent = "-";
  document.getElementById("afterRebalanceTotal").textContent = "-";

  const tableBody = document.getElementById("rebalanceTableBody");
  tableBody.innerHTML = `
    <tr>
      <td colspan="7">${escapeHtml(message)}</td>
    </tr>
  `;
}

function formatAction(value) {
  if (Math.abs(value) < 1) {
    return "不需調整";
  }

  if (value > 0) {
    return `買入 ${formatCurrency(value)}`;
  }

  return `賣出 ${formatCurrency(Math.abs(value))}`;
}

function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
