// 儲存 Chart.js 圖表實例，避免重複產生圖表時疊在一起
let assetChart = null;

// 取得按鈕並綁定事件
document.getElementById("runButton").addEventListener("click", runSimulation);

// 當使用者調整初始資產或提領率時，即時更新「初始年提領金額」
document.getElementById("initialAssetWan").addEventListener("input", updateWithdrawalPreview);
document.getElementById("withdrawalRate").addEventListener("input", updateWithdrawalPreview);

// 頁面載入後先顯示一次預設提領金額，並用預設值跑一次試算
window.addEventListener("load", () => {
  updateWithdrawalPreview();
  runSimulation();
});

/**
 * 主函式：讀取輸入值，執行蒙地卡羅模擬，更新結果與圖表
 */
function runSimulation() {
  const button = document.getElementById("runButton");
  button.disabled = true;
  button.textContent = "模擬中...";

  // 使用 setTimeout 讓畫面有時間更新「模擬中」狀態
  setTimeout(() => {
    try {
      const inputs = getInputs();
      const result = monteCarloSimulation(inputs);

      updateResults(result, inputs);
      drawChart(result.percentilePaths, inputs.years);
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "開始試算";
    }
  }, 50);
}

/**
 * 即時計算並顯示第一年提領金額
 *
 * 初始資產輸入單位是「萬元」，程式內會換算成「元」。
 * 第一年提領金額 = 初始資產 × 年提領率
 */
function updateWithdrawalPreview() {
  const initialAssetWan = Number(document.getElementById("initialAssetWan").value);
  const withdrawalRate = Number(document.getElementById("withdrawalRate").value) / 100;

  if (Number.isFinite(initialAssetWan) && Number.isFinite(withdrawalRate) && initialAssetWan >= 0 && withdrawalRate >= 0) {
    const initialAsset = initialAssetWan * 10000;
    const annualWithdrawal = initialAsset * withdrawalRate;
    document.getElementById("initialWithdrawalAmount").textContent = formatCurrency(annualWithdrawal);
  } else {
    document.getElementById("initialWithdrawalAmount").textContent = "-";
  }
}

/**
 * 從畫面讀取使用者輸入值
 */
function getInputs() {
  const initialAssetWan = Number(document.getElementById("initialAssetWan").value);
  const withdrawalRate = Number(document.getElementById("withdrawalRate").value) / 100;
  const inflationRate = Number(document.getElementById("inflationRate").value) / 100;
  const meanReturn = Number(document.getElementById("meanReturn").value) / 100;
  const volatility = Number(document.getElementById("volatility").value) / 100;
  const years = Number(document.getElementById("years").value);
  const simulations = Number(document.getElementById("simulations").value);

  // 初始資產的畫面輸入單位為萬元，程式內統一換算成元
  const initialAsset = initialAssetWan * 10000;

  // 年提領金額由提領率換算而來
  const annualWithdrawal = initialAsset * withdrawalRate;

  // 基本輸入檢查
  if (initialAssetWan < 0) {
    throw new Error("初始資產不可小於 0。若資產為 4,000 萬，請輸入 4000。");
  }

  if (withdrawalRate < 0) {
    throw new Error("年提領率不可小於 0。例：3% 請輸入 3。");
  }

  if (years <= 0) {
    throw new Error("模擬年數必須大於 0。");
  }

  if (simulations < 100) {
    throw new Error("蒙地卡羅模擬次數建議至少 100 次。");
  }

  if (simulations > 100000) {
    throw new Error("蒙地卡羅模擬次數過高，請設定在 100,000 次以下。");
  }

  if (volatility < 0) {
    throw new Error("波動率不可小於 0。");
  }

  return {
    initialAssetWan,
    initialAsset,
    withdrawalRate,
    annualWithdrawal,
    inflationRate,
    meanReturn,
    volatility,
    years,
    simulations
  };
}

/**
 * 蒙地卡羅模擬核心
 *
 * 這版不再把 50 條隨機路徑全部畫出來，因為畫面會很亂。
 * 改成每一年統計所有模擬路徑的百分位數：
 * - P5：偏悲觀路徑
 * - P25：較保守路徑
 * - P50：中位數路徑
 * - P75：較樂觀路徑
 * - P95：偏樂觀路徑
 *
 * 提領邏輯：
 * 第一年提領金額 = 初始資產 × 年提領率
 * 第 N 年提領金額 = 第一年提領金額 × (1 + 通膨率) ^ (N - 1)
 */
function monteCarloSimulation(inputs) {
  const {
    initialAsset,
    annualWithdrawal,
    inflationRate,
    meanReturn,
    volatility,
    years,
    simulations
  } = inputs;

  let successCount = 0;
  const finalAssets = [];

  // yearlyAssets[0] 儲存第 0 年所有模擬的資產，yearlyAssets[1] 儲存第 1 年，以此類推
  const yearlyAssets = Array.from({ length: years + 1 }, () => []);

  for (let i = 0; i < simulations; i++) {
    let asset = initialAsset;
    let failed = false;

    // 第 0 年，也就是剛退休時的初始資產
    yearlyAssets[0].push(asset);

    for (let year = 1; year <= years; year++) {
      const annualReturn = randomNormal(meanReturn, volatility);

      // 提領金額會依通膨率逐年調整
      const withdrawal = annualWithdrawal * Math.pow(1 + inflationRate, year - 1);

      // 資產先承受市場報酬，再扣除當年度提領
      asset = asset * (1 + annualReturn) - withdrawal;

      if (asset <= 0) {
        asset = 0;
        failed = true;
      }

      yearlyAssets[year].push(asset);

      // 若已失敗，後續年度都補 0，讓每一年都有相同數量的資料可計算百分位
      if (failed) {
        for (let remainingYear = year + 1; remainingYear <= years; remainingYear++) {
          yearlyAssets[remainingYear].push(0);
        }
        break;
      }
    }

    finalAssets.push(asset);

    if (!failed && asset > 0) {
      successCount++;
    }
  }

  // 最終資產排序，用來計算最後年度的百分位數
  finalAssets.sort((a, b) => a - b);

  // 計算每一年的 P5 / P25 / P50 / P75 / P95 路徑
  const percentilePaths = buildPercentilePaths(yearlyAssets);

  const successRate = successCount / simulations;
  const failureRate = 1 - successRate;

  return {
    successRate,
    failureRate,
    medianFinalAsset: percentile(finalAssets, 50),
    p5FinalAsset: percentile(finalAssets, 5),
    p95FinalAsset: percentile(finalAssets, 95),
    percentilePaths
  };
}

/**
 * 將每一年度所有模擬結果轉成 5 條百分位路徑
 */
function buildPercentilePaths(yearlyAssets) {
  const percentileLabels = [5, 25, 50, 75, 95];
  const paths = {
    p5: [],
    p25: [],
    p50: [],
    p75: [],
    p95: []
  };

  yearlyAssets.forEach((assetsOfYear) => {
    assetsOfYear.sort((a, b) => a - b);

    paths.p5.push(percentile(assetsOfYear, percentileLabels[0]));
    paths.p25.push(percentile(assetsOfYear, percentileLabels[1]));
    paths.p50.push(percentile(assetsOfYear, percentileLabels[2]));
    paths.p75.push(percentile(assetsOfYear, percentileLabels[3]));
    paths.p95.push(percentile(assetsOfYear, percentileLabels[4]));
  });

  return paths;
}

/**
 * 使用 Box-Muller Transform 產生常態分配隨機數
 *
 * mean：平均值
 * standardDeviation：標準差
 */
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

/**
 * 計算百分位數
 *
 * sortedArray 必須是由小到大排序後的陣列
 * percentileValue 例如 5、50、95
 */
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

/**
 * 更新畫面上的統計結果
 */
function updateResults(result, inputs) {
  document.getElementById("successRate").textContent = formatPercent(result.successRate);
  document.getElementById("failureRate").textContent = formatPercent(result.failureRate);
  document.getElementById("firstYearWithdrawal").textContent = formatCurrency(inputs.annualWithdrawal);
  document.getElementById("lastYearWithdrawal").textContent = formatCurrency(getWithdrawalByYear(inputs.annualWithdrawal, inputs.inflationRate, inputs.years));
  document.getElementById("medianFinalAsset").textContent = formatCurrency(result.medianFinalAsset);
  document.getElementById("p5FinalAsset").textContent = formatCurrency(result.p5FinalAsset);
  document.getElementById("p95FinalAsset").textContent = formatCurrency(result.p95FinalAsset);
}

/**
 * 計算指定年度的通膨調整後提領金額
 */
function getWithdrawalByYear(firstYearWithdrawal, inflationRate, year) {
  return firstYearWithdrawal * Math.pow(1 + inflationRate, year - 1);
}

/**
 * 使用 Chart.js 畫出百分位資產路徑
 */
function drawChart(percentilePaths, years) {
  const canvas = document.getElementById("assetChart");
  const ctx = canvas.getContext("2d");

  const labels = [];
  for (let year = 0; year <= years; year++) {
    labels.push(`第 ${year} 年`);
  }

  // 只畫 5 條百分位數線，避免 50 條隨機線造成畫面雜亂
  const datasets = [
    {
      label: "P5 偏悲觀",
      data: percentilePaths.p5,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2
    },
    {
      label: "P25 保守",
      data: percentilePaths.p25,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2
    },
    {
      label: "P50 中位數",
      data: percentilePaths.p50,
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.2
    },
    {
      label: "P75 樂觀",
      data: percentilePaths.p75,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2
    },
    {
      label: "P95 偏樂觀",
      data: percentilePaths.p95,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2
    }
  ];

  if (assetChart !== null) {
    assetChart.destroy();
  }

  assetChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top"
        },
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
            text: "退休後年數"
          }
        }
      }
    }
  });
}

/**
 * 格式化百分比
 */
function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * 格式化金額，例如 40000000 → NT$40,000,000
 */
function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

/**
 * 圖表 Y 軸使用簡化金額
 */
function formatCompactCurrency(value) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}億`;
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}萬`;
  }

  return `${Math.round(value)}`;
}
