// 儲存 Chart.js 圖表實例，避免重複繪圖時疊在一起
let targetProbabilityChart = null;

// 綁定試算按鈕
const calculateButton = document.getElementById("calculateButton");
calculateButton.addEventListener("click", calculateYearsToRetirementTarget);

// 頁面載入後先跑一次預設值，讓使用者直接看到結果
window.addEventListener("load", calculateYearsToRetirementTarget);

/**
 * 主函式：讀取輸入、計算固定報酬結果、計算蒙地卡羅結果、更新畫面
 */
function calculateYearsToRetirementTarget() {
  calculateButton.disabled = true;
  calculateButton.textContent = "試算中...";

  // 用 setTimeout 讓瀏覽器先更新按鈕狀態，避免大量模擬時畫面卡住沒有提示
  setTimeout(() => {
    try {
      const inputs = getInputs();

      const fixedResult = calculateFixedProjection(inputs);
      updateFixedResults(fixedResult, inputs);
      updateProjectionTable(fixedResult.yearlyRows);

      const monteCarloResult = runMonteCarloSimulation(inputs);
      updateMonteCarloResults(monteCarloResult, inputs);
      drawTargetProbabilityChart(monteCarloResult.cumulativeByYear);
    } catch (error) {
      alert(error.message);
    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "開始試算";
    }
  }, 50);
}

/**
 * 讀取畫面輸入值
 */
function getInputs() {
  const currentAssetWan = Number(document.getElementById("currentAssetWan").value);
  const targetAssetWan = Number(document.getElementById("targetAssetWan").value);
  const monthlyContributionWan = Number(document.getElementById("monthlyContributionWan").value);
  const annualReturnRate = Number(document.getElementById("annualReturnRate").value) / 100;
  const annualVolatility = Number(document.getElementById("annualVolatility").value) / 100;
  const contributionGrowthRate = Number(document.getElementById("contributionGrowthRate").value) / 100;
  const maxYears = Number(document.getElementById("maxYears").value);
  const simulations = Number(document.getElementById("simulations").value);

  if (currentAssetWan < 0) {
    throw new Error("目前可投資資產不可小於 0。");
  }

  if (targetAssetWan <= 0) {
    throw new Error("退休目標金額必須大於 0。");
  }

  if (monthlyContributionWan < 0) {
    throw new Error("每月投入金額不可小於 0。");
  }

  if (annualVolatility < 0) {
    throw new Error("年化波動率不可小於 0。");
  }

  if (maxYears <= 0 || maxYears > 100) {
    throw new Error("最長試算年數請設定在 1 到 100 年之間。");
  }

  if (simulations < 100 || simulations > 100000) {
    throw new Error("蒙地卡羅模擬次數請設定在 100 到 100,000 次之間。");
  }

  return {
    // 畫面輸入單位是萬元，內部計算轉成元
    currentAsset: currentAssetWan * 10000,
    targetAsset: targetAssetWan * 10000,
    monthlyContribution: monthlyContributionWan * 10000,
    annualReturnRate,
    annualVolatility,
    contributionGrowthRate,
    maxYears,
    simulations
  };
}

/**
 * 固定報酬試算：逐月推估資產是否達標
 *
 * 假設：
 * 1. 每月報酬率由固定年化報酬率換算。
 * 2. 每月投入於月底投入。
 * 3. 每年年初依投入成長率調整每月投入金額。
 */
function calculateFixedProjection(inputs) {
  const {
    currentAsset,
    targetAsset,
    monthlyContribution,
    annualReturnRate,
    contributionGrowthRate,
    maxYears
  } = inputs;

  const monthlyReturnRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  const maxMonths = maxYears * 12;

  let asset = currentAsset;
  let monthlyContributionThisYear = monthlyContribution;
  let totalContribution = 0;
  let monthsNeeded = 0;
  let reached = currentAsset >= targetAsset;
  const yearlyRows = [];

  if (reached) {
    return {
      reached: true,
      monthsNeeded: 0,
      finalAsset: asset,
      totalContribution: 0,
      investmentGain: 0,
      yearlyRows: [
        {
          year: 0,
          asset,
          annualContribution: 0,
          totalContribution: 0
        }
      ]
    };
  }

  for (let month = 1; month <= maxMonths; month++) {
    // 每年度開始時，依投入成長率調整每月投入金額。
    // 第 1 年不調整；第 13、25、37... 個月開始調整。
    if (month > 1 && (month - 1) % 12 === 0) {
      monthlyContributionThisYear *= 1 + contributionGrowthRate;
    }

    // 資產先承受當月報酬，再於月底投入
    asset = asset * (1 + monthlyReturnRate) + monthlyContributionThisYear;
    totalContribution += monthlyContributionThisYear;

    // 每滿一年，記錄年度資料
    if (month % 12 === 0) {
      yearlyRows.push({
        year: month / 12,
        asset,
        annualContribution: calculateAnnualContributionForYear(monthlyContribution, contributionGrowthRate, month / 12),
        totalContribution
      });
    }

    if (asset >= targetAsset) {
      reached = true;
      monthsNeeded = month;

      // 若達標月份不是年底，補一列達標當年資料，方便查看
      if (month % 12 !== 0) {
        yearlyRows.push({
          year: Math.ceil(month / 12),
          asset,
          annualContribution: monthlyContributionThisYear * (month % 12),
          totalContribution
        });
      }

      break;
    }
  }

  return {
    reached,
    monthsNeeded,
    finalAsset: asset,
    totalContribution,
    investmentGain: asset - currentAsset - totalContribution,
    yearlyRows
  };
}

/**
 * 蒙地卡羅模擬：重複產生不同市場報酬路徑，計算各路徑的達標月份
 *
 * 設計：
 * 1. 每年產生一次隨機年報酬率。
 * 2. 年報酬採對數常態分配，避免報酬率低於 -100%。
 * 3. 該年度內用等效月報酬率推估每月資產。
 * 4. 沒有在 maxYears 內達標者，以 maxMonths + 1 表示「未達成」。
 */
function runMonteCarloSimulation(inputs) {
  const {
    currentAsset,
    targetAsset,
    monthlyContribution,
    annualReturnRate,
    annualVolatility,
    contributionGrowthRate,
    maxYears,
    simulations
  } = inputs;

  const maxMonths = maxYears * 12;
  const notReachedValue = maxMonths + 1;
  const reachedMonths = [];
  const cumulativeReachedByYear = new Array(maxYears + 1).fill(0);
  let successCount = 0;

  for (let i = 0; i < simulations; i++) {
    let asset = currentAsset;
    let monthlyContributionThisYear = monthlyContribution;
    let reachedMonth = currentAsset >= targetAsset ? 0 : notReachedValue;

    if (reachedMonth === 0) {
      successCount++;
      reachedMonths.push(0);

      // 一開始就已達標，代表從第 0 年起至所有後續年度皆已達成。
      for (let year = 0; year <= maxYears; year++) {
        cumulativeReachedByYear[year]++;
      }

      continue;
    }

    for (let year = 1; year <= maxYears; year++) {
      if (year > 1) {
        monthlyContributionThisYear *= 1 + contributionGrowthRate;
      }

      const annualReturn = randomLogNormalReturn(annualReturnRate, annualVolatility);
      const monthlyReturnRate = Math.pow(1 + annualReturn, 1 / 12) - 1;

      for (let monthInYear = 1; monthInYear <= 12; monthInYear++) {
        const absoluteMonth = (year - 1) * 12 + monthInYear;

        asset = asset * (1 + monthlyReturnRate) + monthlyContributionThisYear;

        if (asset >= targetAsset) {
          reachedMonth = absoluteMonth;
          break;
        }
      }

      if (reachedMonth !== notReachedValue) {
        break;
      }
    }

    if (reachedMonth !== notReachedValue) {
      successCount++;
      const reachedYear = Math.ceil(reachedMonth / 12);

      // 統計每一個年度結束前累積達成的次數
      for (let year = reachedYear; year <= maxYears; year++) {
        cumulativeReachedByYear[year]++;
      }
    }

    reachedMonths.push(reachedMonth);
  }

  reachedMonths.sort((a, b) => a - b);

  const cumulativeByYear = [];
  for (let year = 0; year <= maxYears; year++) {
    cumulativeByYear.push({
      year,
      probability: cumulativeReachedByYear[year] / simulations
    });
  }

  return {
    successRate: successCount / simulations,
    failureRate: 1 - successCount / simulations,
    p10: percentileMonthByNearestRank(reachedMonths, 10, notReachedValue),
    p25: percentileMonthByNearestRank(reachedMonths, 25, notReachedValue),
    p50: percentileMonthByNearestRank(reachedMonths, 50, notReachedValue),
    p75: percentileMonthByNearestRank(reachedMonths, 75, notReachedValue),
    p90: percentileMonthByNearestRank(reachedMonths, 90, notReachedValue),
    cumulativeByYear,
    notReachedValue
  };
}

/**
 * 產生對數常態分配的年報酬率
 *
 * 使用者輸入的是算術平均報酬率與波動率，這裡轉成 lognormal 參數，
 * 使隨機報酬不會小於 -100%。
 */
function randomLogNormalReturn(arithmeticMean, volatility) {
  if (volatility === 0) {
    return arithmeticMean;
  }

  const variance = volatility * volatility;
  const sigmaSquared = Math.log(1 + variance / Math.pow(1 + arithmeticMean, 2));
  const sigma = Math.sqrt(sigmaSquared);
  const mu = Math.log(1 + arithmeticMean) - sigmaSquared / 2;

  const z = randomStandardNormal();
  return Math.exp(mu + sigma * z) - 1;
}

/**
 * Box-Muller Transform 產生標準常態分配隨機數
 */
function randomStandardNormal() {
  let u1 = 0;
  let u2 = 0;

  while (u1 === 0) {
    u1 = Math.random();
  }

  while (u2 === 0) {
    u2 = Math.random();
  }

  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * 最近秩百分位數。
 * 若該百分位對應到 notReachedValue，代表該比例下仍未在期間內達標。
 */
function percentileMonthByNearestRank(sortedMonths, percentileValue, notReachedValue) {
  if (sortedMonths.length === 0) {
    return notReachedValue;
  }

  const index = Math.ceil((percentileValue / 100) * sortedMonths.length) - 1;
  return sortedMonths[Math.max(0, Math.min(index, sortedMonths.length - 1))];
}

/**
 * 計算某年度投入金額，用於年度表格顯示
 */
function calculateAnnualContributionForYear(initialMonthlyContribution, contributionGrowthRate, year) {
  const monthlyContributionForYear = initialMonthlyContribution * Math.pow(1 + contributionGrowthRate, year - 1);
  return monthlyContributionForYear * 12;
}

/**
 * 更新固定報酬結果區塊
 */
function updateFixedResults(result, inputs) {
  const assetGap = Math.max(inputs.targetAsset - inputs.currentAsset, 0);

  document.getElementById("yearsNeeded").textContent = result.reached
    ? formatMonths(result.monthsNeeded)
    : `超過 ${inputs.maxYears} 年仍未達標`;

  document.getElementById("targetDate").textContent = result.reached
    ? formatTargetDate(result.monthsNeeded)
    : "未達標";

  document.getElementById("assetGap").textContent = formatCurrency(assetGap);
  document.getElementById("finalAsset").textContent = formatCurrency(result.finalAsset);
  document.getElementById("totalContribution").textContent = formatCurrency(result.totalContribution);
  document.getElementById("investmentGain").textContent = formatCurrency(result.investmentGain);
}

/**
 * 更新蒙地卡羅結果區塊
 */
function updateMonteCarloResults(result, inputs) {
  document.getElementById("mcSuccessRate").textContent = formatPercent(result.successRate);
  document.getElementById("mcFailureRate").textContent = formatPercent(result.failureRate);
  document.getElementById("mcP10").textContent = formatMonteCarloMonths(result.p10, inputs.maxYears, result.notReachedValue);
  document.getElementById("mcP25").textContent = formatMonteCarloMonths(result.p25, inputs.maxYears, result.notReachedValue);
  document.getElementById("mcP50").textContent = formatMonteCarloMonths(result.p50, inputs.maxYears, result.notReachedValue);
  document.getElementById("mcP75").textContent = formatMonteCarloMonths(result.p75, inputs.maxYears, result.notReachedValue);
  document.getElementById("mcP90").textContent = formatMonteCarloMonths(result.p90, inputs.maxYears, result.notReachedValue);
}

/**
 * 更新固定報酬年度推估表格
 */
function updateProjectionTable(yearlyRows) {
  const tableBody = document.getElementById("projectionTableBody");
  tableBody.innerHTML = "";

  yearlyRows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>第 ${row.year} 年</td>
      <td>${formatCurrency(row.asset)}</td>
      <td>${formatCurrency(row.annualContribution)}</td>
      <td>${formatCurrency(row.totalContribution)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

/**
 * 畫出累積達成機率圖
 */
function drawTargetProbabilityChart(cumulativeByYear) {
  const canvas = document.getElementById("targetProbabilityChart");
  const ctx = canvas.getContext("2d");

  const labels = cumulativeByYear.map((row) => `第 ${row.year} 年`);
  const data = cumulativeByYear.map((row) => row.probability * 100);

  if (targetProbabilityChart !== null) {
    targetProbabilityChart.destroy();
  }

  targetProbabilityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "累積達成機率",
          data,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: false
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
              return `累積達成機率：${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function (value) {
              return `${value}%`;
            }
          },
          title: {
            display: true,
            text: "達成機率"
          }
        },
        x: {
          title: {
            display: true,
            text: "試算年數"
          }
        }
      }
    }
  });
}

/**
 * 將月份轉成年月顯示
 */
function formatMonths(months) {
  if (months === 0) {
    return "已達標";
  }

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

/**
 * 格式化蒙地卡羅達成年數。
 */
function formatMonteCarloMonths(months, maxYears, notReachedValue) {
  if (months >= notReachedValue) {
    return `超過 ${maxYears} 年或未達成`;
  }

  return formatMonths(months);
}

/**
 * 以目前日期推估達標年月
 */
function formatTargetDate(monthsNeeded) {
  if (monthsNeeded === 0) {
    return "目前已達標";
  }

  const date = new Date();
  date.setMonth(date.getMonth() + monthsNeeded);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return `${year} 年 ${month} 月`;
}

/**
 * 格式化百分比
 */
function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * 格式化金額
 */
function formatCurrency(value) {
  const roundedValue = Math.round(value);
  return `NT$${roundedValue.toLocaleString("zh-TW")}`;
}
