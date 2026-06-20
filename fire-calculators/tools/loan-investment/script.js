let loanComparisonChart = null;

const calculateButton = document.getElementById("calculateButton");

calculateButton.addEventListener("click", calculateLoanInvestmentComparison);

document.getElementById("loanAmountWan").addEventListener("input", updateMonthlyPaymentPreview);
document.getElementById("loanAnnualRate").addEventListener("input", updateMonthlyPaymentPreview);
document.getElementById("loanYears").addEventListener("input", updateMonthlyPaymentPreview);

window.addEventListener("load", () => {
  updateMonthlyPaymentPreview();
  calculateLoanInvestmentComparison();
});

function calculateLoanInvestmentComparison() {
  calculateButton.disabled = true;
  calculateButton.textContent = "試算中...";

  setTimeout(() => {
    try {
      const inputs = getInputs();
      const loanSummary = calculateLoanSummary(inputs);
      const result = runMonteCarloComparison(inputs, loanSummary);

      updateResults(result, loanSummary);
      updateComparisonTable(result);
      drawLoanComparisonChart(result.yearlyDifferencePercentiles);
    } catch (error) {
      alert(error.message);
    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "開始試算";
    }
  }, 50);
}

function updateMonthlyPaymentPreview() {
  const loanAmountWan = Number(document.getElementById("loanAmountWan").value);
  const loanAnnualRate = Number(document.getElementById("loanAnnualRate").value) / 100;
  const loanYears = Number(document.getElementById("loanYears").value);

  if (
    Number.isFinite(loanAmountWan) &&
    Number.isFinite(loanAnnualRate) &&
    Number.isFinite(loanYears) &&
    loanAmountWan >= 0 &&
    loanAnnualRate >= 0 &&
    loanYears > 0
  ) {
    const monthlyPayment = calculateMonthlyPayment(loanAmountWan * 10000, loanAnnualRate, loanYears);
    document.getElementById("monthlyPaymentPreview").textContent = formatCurrency(monthlyPayment);
  } else {
    document.getElementById("monthlyPaymentPreview").textContent = "-";
  }
}

function getInputs() {
  const loanAmountWan = Number(document.getElementById("loanAmountWan").value);
  const loanAnnualRate = Number(document.getElementById("loanAnnualRate").value) / 100;
  const loanYears = Number(document.getElementById("loanYears").value);
  const annualReturnRate = Number(document.getElementById("annualReturnRate").value) / 100;
  const annualVolatility = Number(document.getElementById("annualVolatility").value) / 100;
  const monthlyExtraContributionWan = Number(document.getElementById("monthlyExtraContributionWan").value);
  const simulations = Number(document.getElementById("simulations").value);

  if (loanAmountWan <= 0) {
    throw new Error("貸款金額必須大於 0。");
  }

  if (loanAnnualRate < 0) {
    throw new Error("貸款年利率不可小於 0。");
  }

  if (loanYears <= 0 || loanYears > 40) {
    throw new Error("貸款年限請設定在 1 到 40 年之間。");
  }

  if (annualVolatility < 0) {
    throw new Error("年化波動率不可小於 0。");
  }

  if (annualReturnRate <= -1) {
    throw new Error("預期年化報酬率必須大於 -100%。");
  }

  if (monthlyExtraContributionWan < 0) {
    throw new Error("每月額外投入不可小於 0。");
  }

  if (simulations < 100 || simulations > 100000) {
    throw new Error("蒙地卡羅模擬次數請設定在 100 到 100,000 次之間。");
  }

  return {
    loanAmount: loanAmountWan * 10000,
    loanAnnualRate,
    loanYears,
    annualReturnRate,
    annualVolatility,
    monthlyExtraContribution: monthlyExtraContributionWan * 10000,
    simulations
  };
}

function calculateLoanSummary(inputs) {
  const monthlyPayment = calculateMonthlyPayment(inputs.loanAmount, inputs.loanAnnualRate, inputs.loanYears);
  const totalLoanMonths = inputs.loanYears * 12;

  return {
    monthlyPayment,
    totalInterest: monthlyPayment * totalLoanMonths - inputs.loanAmount,
    remainingLoanBalance: 0
  };
}

function calculateMonthlyPayment(loanAmount, annualRate, years) {
  const totalMonths = years * 12;
  const monthlyRate = annualRate / 12;

  if (monthlyRate === 0) {
    return loanAmount / totalMonths;
  }

  const growth = Math.pow(1 + monthlyRate, totalMonths);
  return loanAmount * monthlyRate * growth / (growth - 1);
}

function calculateRemainingLoanBalance(loanAmount, annualRate, years, paidMonths) {
  const totalMonths = years * 12;

  if (paidMonths >= totalMonths) {
    return 0;
  }

  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, years);
  const monthlyRate = annualRate / 12;

  if (monthlyRate === 0) {
    return Math.max(loanAmount - monthlyPayment * paidMonths, 0);
  }

  const growth = Math.pow(1 + monthlyRate, paidMonths);
  return Math.max(loanAmount * growth - monthlyPayment * ((growth - 1) / monthlyRate), 0);
}

function runMonteCarloComparison(inputs, loanSummary) {
  const comparisonMonths = inputs.loanYears * 12;
  const differenceByYear = Array.from({ length: inputs.loanYears + 1 }, () => []);
  const leveragedFinalValues = [];
  const baselineFinalValues = [];
  const finalDifferences = [];
  let advantageCount = 0;

  for (let i = 0; i < inputs.simulations; i++) {
    let leveragedAsset = inputs.loanAmount;
    let baselineAsset = 0;
    let monthlyReturnRate = 0;

    differenceByYear[0].push(0);

    for (let month = 1; month <= comparisonMonths; month++) {
      if ((month - 1) % 12 === 0) {
        const yearlyReturn = randomLogNormalReturn(inputs.annualReturnRate, inputs.annualVolatility);
        monthlyReturnRate = Math.pow(1 + yearlyReturn, 1 / 12) - 1;
      }

      leveragedAsset = leveragedAsset * (1 + monthlyReturnRate) + inputs.monthlyExtraContribution;
      baselineAsset = baselineAsset * (1 + monthlyReturnRate) + loanSummary.monthlyPayment + inputs.monthlyExtraContribution;

      if (month % 12 === 0) {
        const remainingLoanBalance = calculateRemainingLoanBalance(
          inputs.loanAmount,
          inputs.loanAnnualRate,
          inputs.loanYears,
          month
        );

        differenceByYear[month / 12].push(leveragedAsset - remainingLoanBalance - baselineAsset);
      }
    }

    const leveragedNetAsset = leveragedAsset - loanSummary.remainingLoanBalance;
    const difference = leveragedNetAsset - baselineAsset;

    leveragedFinalValues.push(leveragedNetAsset);
    baselineFinalValues.push(baselineAsset);
    finalDifferences.push(difference);

    if (difference > 0) {
      advantageCount++;
    }
  }

  leveragedFinalValues.sort((a, b) => a - b);
  baselineFinalValues.sort((a, b) => a - b);
  finalDifferences.sort((a, b) => a - b);

  return {
    advantageRate: advantageCount / inputs.simulations,
    leveraged: {
      p10: percentile(leveragedFinalValues, 10),
      p50: percentile(leveragedFinalValues, 50),
      p90: percentile(leveragedFinalValues, 90)
    },
    baseline: {
      p10: percentile(baselineFinalValues, 10),
      p50: percentile(baselineFinalValues, 50),
      p90: percentile(baselineFinalValues, 90)
    },
    difference: {
      p10: percentile(finalDifferences, 10),
      p50: percentile(finalDifferences, 50),
      p90: percentile(finalDifferences, 90)
    },
    breakEvenReturn: calculateBreakEvenReturn(inputs, loanSummary),
    yearlyDifferencePercentiles: buildYearlyDifferencePercentiles(differenceByYear)
  };
}

function buildYearlyDifferencePercentiles(differenceByYear) {
  return differenceByYear.map((values, year) => {
    values.sort((a, b) => a - b);

    return {
      year,
      p10: percentile(values, 10),
      p50: percentile(values, 50),
      p90: percentile(values, 90)
    };
  });
}

function calculateBreakEvenReturn(inputs, loanSummary) {
  let low = -0.99;
  let high = 1;

  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const difference = calculateFixedDifference(inputs, loanSummary, mid);

    if (difference > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

function calculateFixedDifference(inputs, loanSummary, annualReturnRate) {
  const comparisonMonths = inputs.loanYears * 12;
  const monthlyReturnRate = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  let leveragedAsset = inputs.loanAmount;
  let baselineAsset = 0;

  for (let month = 1; month <= comparisonMonths; month++) {
    leveragedAsset = leveragedAsset * (1 + monthlyReturnRate) + inputs.monthlyExtraContribution;
    baselineAsset = baselineAsset * (1 + monthlyReturnRate) + loanSummary.monthlyPayment + inputs.monthlyExtraContribution;
  }

  return leveragedAsset - loanSummary.remainingLoanBalance - baselineAsset;
}

function randomLogNormalReturn(arithmeticMean, volatility) {
  if (volatility === 0) {
    return arithmeticMean;
  }

  const variance = volatility * volatility;
  const sigmaSquared = Math.log(1 + variance / Math.pow(1 + arithmeticMean, 2));
  const sigma = Math.sqrt(sigmaSquared);
  const mu = Math.log(1 + arithmeticMean) - sigmaSquared / 2;

  return Math.exp(mu + sigma * randomStandardNormal()) - 1;
}

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

function updateResults(result, loanSummary) {
  document.getElementById("advantageRate").textContent = formatPercent(result.advantageRate);
  document.getElementById("monthlyPayment").textContent = formatCurrency(loanSummary.monthlyPayment);
  document.getElementById("totalInterest").textContent = formatCurrency(loanSummary.totalInterest);
  document.getElementById("leveragedP50").textContent = formatCurrency(result.leveraged.p50);
  document.getElementById("baselineP50").textContent = formatCurrency(result.baseline.p50);
  document.getElementById("differenceP50").textContent = formatCurrency(result.difference.p50);
  document.getElementById("breakEvenReturn").textContent = formatPercent(result.breakEvenReturn);
}

function updateComparisonTable(result) {
  const rows = [
    {
      label: "P10 較保守情境",
      leveraged: result.leveraged.p10,
      baseline: result.baseline.p10,
      difference: result.difference.p10
    },
    {
      label: "P50 中位數情境",
      leveraged: result.leveraged.p50,
      baseline: result.baseline.p50,
      difference: result.difference.p50
    },
    {
      label: "P90 較樂觀情境",
      leveraged: result.leveraged.p90,
      baseline: result.baseline.p90,
      difference: result.difference.p90
    }
  ];

  const tableBody = document.getElementById("comparisonTableBody");
  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.label}</td>
      <td>${formatCurrency(row.leveraged)}</td>
      <td>${formatCurrency(row.baseline)}</td>
      <td>${formatCurrency(row.difference)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function drawLoanComparisonChart(yearlyDifferencePercentiles) {
  const canvas = document.getElementById("loanComparisonChart");
  const ctx = canvas.getContext("2d");

  const labels = yearlyDifferencePercentiles.map((row) => `第 ${row.year} 年`);

  if (loanComparisonChart !== null) {
    loanComparisonChart.destroy();
  }

  loanComparisonChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "P10 較保守",
          data: yearlyDifferencePercentiles.map((row) => row.p10),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: "P50 中位數",
          data: yearlyDifferencePercentiles.map((row) => row.p50),
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: "P90 較樂觀",
          data: yearlyDifferencePercentiles.map((row) => row.p90),
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
          ticks: {
            callback: function (value) {
              return formatCompactCurrency(value);
            }
          },
          title: {
            display: true,
            text: "淨資產差異"
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

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatCompactCurrency(value) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 100000000) {
    return `${sign}${(absoluteValue / 100000000).toFixed(1)}億`;
  }

  if (absoluteValue >= 10000) {
    return `${sign}${(absoluteValue / 10000).toFixed(0)}萬`;
  }

  return `${Math.round(value)}`;
}
