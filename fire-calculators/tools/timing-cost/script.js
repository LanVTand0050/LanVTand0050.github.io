let timingCostChart = null;
const tradingDaysPerYear = 252;
const missedDayScenarios = [0, 5, 10, 20];

const calculateButton = document.getElementById("calculateButton");
calculateButton.addEventListener("click", calculateTimingCost);

window.addEventListener("load", calculateTimingCost);

function calculateTimingCost() {
  calculateButton.disabled = true;
  calculateButton.textContent = "試算中...";

  setTimeout(() => {
    try {
      const inputs = getInputs();
      const result = runSimulation(inputs);

      updateResults(result);
      updateComparisonTable(result);
      drawTimingCostChart(result);
    } catch (error) {
      alert(error.message);
    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "開始試算";
    }
  }, 50);
}

function getInputs() {
  const initialAssetWan = Number(document.getElementById("initialAssetWan").value);
  const monthlyContributionWan = Number(document.getElementById("monthlyContributionWan").value);
  const investmentYears = Number(document.getElementById("investmentYears").value);
  const annualReturnRate = Number(document.getElementById("annualReturnRate").value) / 100;
  const annualVolatility = Number(document.getElementById("annualVolatility").value) / 100;
  const simulations = Number(document.getElementById("simulations").value);

  if (initialAssetWan < 0) {
    throw new Error("初始投資金額不可小於 0。");
  }

  if (monthlyContributionWan < 0) {
    throw new Error("每月投入金額不可小於 0。");
  }

  if (investmentYears <= 0 || investmentYears > 60) {
    throw new Error("投資年數請設定在 1 到 60 年之間。");
  }

  if (annualVolatility < 0) {
    throw new Error("年化波動率不可小於 0。");
  }

  if (annualReturnRate <= -1) {
    throw new Error("預期年化報酬率必須大於 -100%。");
  }

  if (simulations < 100 || simulations > 20000) {
    throw new Error("蒙地卡羅模擬次數請設定在 100 到 20,000 次之間。");
  }

  return {
    initialAsset: initialAssetWan * 10000,
    monthlyContribution: monthlyContributionWan * 10000,
    investmentYears,
    annualReturnRate,
    annualVolatility,
    simulations
  };
}

function runSimulation(inputs) {
  const scenarioValues = new Map();
  missedDayScenarios.forEach((days) => scenarioValues.set(days, []));
  let holdBeatsMiss10Count = 0;

  for (let i = 0; i < inputs.simulations; i++) {
    const dailyReturns = generateDailyReturns(inputs);
    const sortedBestReturns = [...dailyReturns].sort((a, b) => b - a);
    const returnsByScenario = new Map();

    missedDayScenarios.forEach((missedDays) => {
      const thresholdReturns = sortedBestReturns.slice(0, missedDays);
      const adjustedReturns = removeBestReturns(dailyReturns, thresholdReturns);
      const finalAsset = calculateFinalAsset(inputs, adjustedReturns);
      scenarioValues.get(missedDays).push(finalAsset);
      returnsByScenario.set(missedDays, finalAsset);
    });

    if (returnsByScenario.get(0) > returnsByScenario.get(10)) {
      holdBeatsMiss10Count++;
    }
  }

  const scenarios = missedDayScenarios.map((missedDays) => {
    const values = scenarioValues.get(missedDays).sort((a, b) => a - b);

    return {
      missedDays,
      p10: percentile(values, 10),
      p50: percentile(values, 50),
      p90: percentile(values, 90)
    };
  });

  const holdScenario = scenarios.find((scenario) => scenario.missedDays === 0);
  scenarios.forEach((scenario) => {
    scenario.p50Difference = holdScenario.p50 - scenario.p50;
  });

  return {
    scenarios,
    holdAdvantageRate: holdBeatsMiss10Count / inputs.simulations
  };
}

function generateDailyReturns(inputs) {
  const totalDays = inputs.investmentYears * tradingDaysPerYear;
  const dailyMean = Math.pow(1 + inputs.annualReturnRate, 1 / tradingDaysPerYear) - 1;
  const dailyVolatility = inputs.annualVolatility / Math.sqrt(tradingDaysPerYear);
  const dailyReturns = [];

  for (let day = 0; day < totalDays; day++) {
    dailyReturns.push(randomNormal(dailyMean, dailyVolatility));
  }

  return dailyReturns;
}

function removeBestReturns(dailyReturns, bestReturns) {
  if (bestReturns.length === 0) {
    return dailyReturns;
  }

  const counts = new Map();
  bestReturns.forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return dailyReturns.map((value) => {
    const remainingCount = counts.get(value) || 0;

    if (remainingCount > 0) {
      counts.set(value, remainingCount - 1);
      return 0;
    }

    return value;
  });
}

function calculateFinalAsset(inputs, dailyReturns) {
  let asset = inputs.initialAsset;

  dailyReturns.forEach((dailyReturn, index) => {
    asset *= 1 + dailyReturn;

    if ((index + 1) % 21 === 0) {
      asset += inputs.monthlyContribution;
    }
  });

  return Math.max(asset, 0);
}

function randomNormal(mean, standardDeviation) {
  if (standardDeviation === 0) {
    return mean;
  }

  let u1 = 0;
  let u2 = 0;

  while (u1 === 0) {
    u1 = Math.random();
  }

  while (u2 === 0) {
    u2 = Math.random();
  }

  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * standardDeviation;
}

function percentile(sortedArray, percentileValue) {
  if (sortedArray.length === 0) {
    return 0;
  }

  const index = (percentileValue / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedArray[lower];
  }

  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

function updateResults(result) {
  const hold = getScenario(result, 0);
  const miss5 = getScenario(result, 5);
  const miss10 = getScenario(result, 10);
  const miss20 = getScenario(result, 20);
  const miss10Cost = hold.p50 - miss10.p50;

  document.getElementById("holdP50").textContent = formatCurrency(hold.p50);
  document.getElementById("miss5P50").textContent = formatCurrency(miss5.p50);
  document.getElementById("miss10P50").textContent = formatCurrency(miss10.p50);
  document.getElementById("miss20P50").textContent = formatCurrency(miss20.p50);
  document.getElementById("miss10Cost").textContent = formatCurrency(miss10Cost);
  document.getElementById("miss10LossPercent").textContent = formatPercent(miss10Cost / hold.p50);
  document.getElementById("holdAdvantageRate").textContent = formatPercent(result.holdAdvantageRate);
}

function updateComparisonTable(result) {
  const tableBody = document.getElementById("comparisonTableBody");
  tableBody.innerHTML = "";

  result.scenarios.forEach((scenario) => {
    const tr = document.createElement("tr");
    const label = scenario.missedDays === 0 ? "全程持有" : `錯過最佳 ${scenario.missedDays} 天`;

    tr.innerHTML = `
      <td>${label}</td>
      <td>${formatCurrency(scenario.p10)}</td>
      <td>${formatCurrency(scenario.p50)}</td>
      <td>${formatCurrency(scenario.p90)}</td>
      <td>${formatCurrency(scenario.p50Difference)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

function drawTimingCostChart(result) {
  const canvas = document.getElementById("timingCostChart");
  const ctx = canvas.getContext("2d");
  const labels = result.scenarios.map((scenario) => {
    return scenario.missedDays === 0 ? "全程持有" : `錯過 ${scenario.missedDays} 天`;
  });

  if (timingCostChart !== null) {
    timingCostChart.destroy();
  }

  timingCostChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "P10",
          data: result.scenarios.map((scenario) => scenario.p10)
        },
        {
          label: "P50",
          data: result.scenarios.map((scenario) => scenario.p50)
        },
        {
          label: "P90",
          data: result.scenarios.map((scenario) => scenario.p90)
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
            text: "期末資產"
          }
        }
      }
    }
  });
}

function getScenario(result, missedDays) {
  return result.scenarios.find((scenario) => scenario.missedDays === missedDays);
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
