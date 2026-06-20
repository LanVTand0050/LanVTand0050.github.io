let expenseDelayChart = null;

const calculateButton = document.getElementById("calculateButton");
calculateButton.addEventListener("click", calculateExpenseDelay);

window.addEventListener("load", calculateExpenseDelay);

function calculateExpenseDelay() {
  calculateButton.disabled = true;
  calculateButton.textContent = "試算中...";

  setTimeout(() => {
    try {
      const inputs = getInputs();
      const lowExpenseProjection = buildProjection(inputs, inputs.lowExpenseRate);
      const highExpenseProjection = buildProjection(inputs, inputs.highExpenseRate);
      const lowTargetMonths = findTargetMonths(inputs, inputs.lowExpenseRate);
      const highTargetMonths = findTargetMonths(inputs, inputs.highExpenseRate);

      const result = {
        lowExpenseProjection,
        highExpenseProjection,
        lowTargetMonths,
        highTargetMonths
      };

      updateResults(result, inputs);
      updateProjectionTable(result, inputs);
      drawExpenseDelayChart(result);
    } catch (error) {
      alert(error.message);
    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "開始試算";
    }
  }, 50);
}

function getInputs() {
  const currentAssetWan = Number(document.getElementById("currentAssetWan").value);
  const monthlyContributionWan = Number(document.getElementById("monthlyContributionWan").value);
  const targetAssetWan = Number(document.getElementById("targetAssetWan").value);
  const projectionYears = Number(document.getElementById("projectionYears").value);
  const grossReturnRate = Number(document.getElementById("grossReturnRate").value) / 100;
  const lowExpenseRate = Number(document.getElementById("lowExpenseRate").value) / 100;
  const highExpenseRate = Number(document.getElementById("highExpenseRate").value) / 100;

  if (currentAssetWan < 0) {
    throw new Error("目前可投資資產不可小於 0。");
  }

  if (monthlyContributionWan < 0) {
    throw new Error("每月投入金額不可小於 0。");
  }

  if (targetAssetWan <= 0) {
    throw new Error("退休目標資產必須大於 0。");
  }

  if (projectionYears <= 0 || projectionYears > 80) {
    throw new Error("投資年數請設定在 1 到 80 年之間。");
  }

  if (lowExpenseRate < 0 || highExpenseRate < 0) {
    throw new Error("費用率不可小於 0。");
  }

  if (highExpenseRate < lowExpenseRate) {
    throw new Error("高費用率應大於或等於低費用率。");
  }

  if (grossReturnRate - lowExpenseRate <= -1 || grossReturnRate - highExpenseRate <= -1) {
    throw new Error("扣除費用率後的淨報酬率必須大於 -100%。");
  }

  return {
    currentAsset: currentAssetWan * 10000,
    monthlyContribution: monthlyContributionWan * 10000,
    targetAsset: targetAssetWan * 10000,
    projectionYears,
    grossReturnRate,
    lowExpenseRate,
    highExpenseRate
  };
}

function buildProjection(inputs, expenseRate) {
  const yearlyRows = [];
  const monthlyReturnRate = annualToMonthlyRate(inputs.grossReturnRate - expenseRate);
  let asset = inputs.currentAsset;

  yearlyRows.push({
    year: 0,
    asset
  });

  for (let month = 1; month <= inputs.projectionYears * 12; month++) {
    asset = asset * (1 + monthlyReturnRate) + inputs.monthlyContribution;

    if (month % 12 === 0) {
      yearlyRows.push({
        year: month / 12,
        asset
      });
    }
  }

  return yearlyRows;
}

function findTargetMonths(inputs, expenseRate) {
  if (inputs.currentAsset >= inputs.targetAsset) {
    return 0;
  }

  const monthlyReturnRate = annualToMonthlyRate(inputs.grossReturnRate - expenseRate);
  let asset = inputs.currentAsset;
  const maxMonths = 100 * 12;

  for (let month = 1; month <= maxMonths; month++) {
    asset = asset * (1 + monthlyReturnRate) + inputs.monthlyContribution;

    if (asset >= inputs.targetAsset) {
      return month;
    }
  }

  return null;
}

function annualToMonthlyRate(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function updateResults(result, inputs) {
  const lowFinalAsset = getFinalAsset(result.lowExpenseProjection);
  const highFinalAsset = getFinalAsset(result.highExpenseProjection);
  const difference = lowFinalAsset - highFinalAsset;
  const dragPercent = lowFinalAsset > 0 ? difference / lowFinalAsset : 0;

  document.getElementById("lowExpenseTargetTime").textContent = formatTargetMonths(result.lowTargetMonths);
  document.getElementById("highExpenseTargetTime").textContent = formatTargetMonths(result.highTargetMonths);
  document.getElementById("lowExpenseFinalAsset").textContent = formatCurrency(lowFinalAsset);
  document.getElementById("highExpenseFinalAsset").textContent = formatCurrency(highFinalAsset);
  document.getElementById("finalAssetDifference").textContent = formatCurrency(difference);
  document.getElementById("dragPercent").textContent = formatPercent(dragPercent);
  document.getElementById("delayResult").textContent = formatDelay(result.lowTargetMonths, result.highTargetMonths, inputs);
}

function updateProjectionTable(result) {
  const tableBody = document.getElementById("projectionTableBody");
  tableBody.innerHTML = "";

  result.lowExpenseProjection.forEach((lowRow, index) => {
    const highRow = result.highExpenseProjection[index];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>第 ${lowRow.year} 年</td>
      <td>${formatCurrency(lowRow.asset)}</td>
      <td>${formatCurrency(highRow.asset)}</td>
      <td>${formatCurrency(lowRow.asset - highRow.asset)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

function drawExpenseDelayChart(result) {
  const canvas = document.getElementById("expenseDelayChart");
  const ctx = canvas.getContext("2d");
  const labels = result.lowExpenseProjection.map((row) => `第 ${row.year} 年`);

  if (expenseDelayChart !== null) {
    expenseDelayChart.destroy();
  }

  expenseDelayChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "低費用率",
          data: result.lowExpenseProjection.map((row) => row.asset),
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: "高費用率",
          data: result.highExpenseProjection.map((row) => row.asset),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}：${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCompactCurrency(value);
            }
          },
          title: {
            display: true,
            text: "資產金額"
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 12
          },
          title: {
            display: true,
            text: "投資年數"
          }
        }
      }
    }
  });
}

function getFinalAsset(projection) {
  return projection[projection.length - 1].asset;
}

function formatDelay(lowTargetMonths, highTargetMonths, inputs) {
  if (lowTargetMonths === null && highTargetMonths === null) {
    return "兩者皆未達標";
  }

  if (lowTargetMonths === null) {
    return "低費用仍未達標";
  }

  if (highTargetMonths === null) {
    return "高費用 100 年內未達標";
  }

  const delayMonths = highTargetMonths - lowTargetMonths;

  if (delayMonths <= 0) {
    return "未延後";
  }

  return formatMonths(delayMonths);
}

function formatTargetMonths(months) {
  if (months === null) {
    return "100 年內未達標";
  }

  if (months === 0) {
    return "目前已達標";
  }

  return formatMonths(months);
}

function formatMonths(months) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} 個月`;
  }

  if (remainingMonths === 0) {
    return `${years} 年`;
  }

  return `${years} 年 ${remainingMonths} 個月`;
}

function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCompactCurrency(value) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}億`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}萬`;
  }

  return `${Math.round(value)}`;
}
