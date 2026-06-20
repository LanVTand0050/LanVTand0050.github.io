let lumpSumDcaChart = null;

const calculateButton = document.getElementById("calculateButton");
const previewInputIds = ["investmentAmountWan", "dcaMonths"];

calculateButton.addEventListener("click", calculateComparison);
previewInputIds.forEach((id) => {
  document.getElementById(id).addEventListener("input", updateInstallmentPreview);
});

window.addEventListener("load", () => {
  updateInstallmentPreview();
  calculateComparison();
});

function calculateComparison() {
  calculateButton.disabled = true;
  calculateButton.textContent = "模擬中...";

  setTimeout(() => {
    try {
      const inputs = getInputs();
      const result = runSimulation(inputs);
      updateResults(result, inputs);
      updateComparisonTable(result);
      drawChart(result.yearlyPercentiles);
    } catch (error) {
      alert(error.message);
    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "開始模擬";
    }
  }, 50);
}

function updateInstallmentPreview() {
  const amountWan = Number(document.getElementById("investmentAmountWan").value);
  const dcaMonths = Number(document.getElementById("dcaMonths").value);

  if (Number.isFinite(amountWan) && Number.isFinite(dcaMonths) && amountWan > 0 && dcaMonths >= 2) {
    document.getElementById("monthlyInstallmentPreview").textContent = formatCurrency(amountWan * 10000 / dcaMonths);
  } else {
    document.getElementById("monthlyInstallmentPreview").textContent = "-";
  }
}

function getInputs() {
  const investmentAmountWan = Number(document.getElementById("investmentAmountWan").value);
  const dcaMonths = Number(document.getElementById("dcaMonths").value);
  const investmentYears = Number(document.getElementById("investmentYears").value);
  const annualReturnRate = Number(document.getElementById("annualReturnRate").value) / 100;
  const annualVolatility = Number(document.getElementById("annualVolatility").value) / 100;
  const cashAnnualRate = Number(document.getElementById("cashAnnualRate").value) / 100;
  const simulations = Number(document.getElementById("simulations").value);

  const values = [investmentAmountWan, dcaMonths, investmentYears, annualReturnRate, annualVolatility, cashAnnualRate, simulations];
  if (!values.every(Number.isFinite)) {
    throw new Error("所有欄位都必須是有效數字。");
  }
  if (investmentAmountWan <= 0) {
    throw new Error("可投入資金必須大於 0。");
  }
  if (!Number.isInteger(dcaMonths) || dcaMonths < 2 || dcaMonths > 60) {
    throw new Error("分批投入期間請設定為 2 到 60 個整數月。");
  }
  if (!Number.isInteger(investmentYears) || investmentYears < 1 || investmentYears > 60) {
    throw new Error("總投資年數請設定為 1 到 60 個整數年。");
  }
  if (investmentYears * 12 < dcaMonths) {
    throw new Error("總投資期間必須涵蓋完整分批投入期間。");
  }
  if (annualReturnRate <= -1) {
    throw new Error("預期年化報酬率必須大於 -100%。");
  }
  if (annualVolatility < 0) {
    throw new Error("年化波動率不可小於 0。");
  }
  if (cashAnnualRate < 0) {
    throw new Error("現金年利率不可小於 0。");
  }
  if (!Number.isInteger(simulations) || simulations < 100 || simulations > 20000) {
    throw new Error("模擬次數請設定為 100 到 20,000 的整數。");
  }

  return {
    investmentAmount: investmentAmountWan * 10000,
    dcaMonths,
    investmentYears,
    annualReturnRate,
    annualVolatility,
    cashAnnualRate,
    simulations
  };
}

function runSimulation(inputs) {
  const totalMonths = inputs.investmentYears * 12;
  const monthlyInstallment = inputs.investmentAmount / inputs.dcaMonths;
  const cashMonthlyRate = Math.pow(1 + inputs.cashAnnualRate, 1 / 12) - 1;
  const yearlyLumpSumValues = Array.from({ length: inputs.investmentYears + 1 }, () => []);
  const yearlyDcaValues = Array.from({ length: inputs.investmentYears + 1 }, () => []);
  const lumpSumFinalValues = [];
  const dcaFinalValues = [];
  const differenceFinalValues = [];
  let lumpSumWins = 0;
  let dcaWins = 0;
  let ties = 0;

  for (let simulation = 0; simulation < inputs.simulations; simulation++) {
    let lumpSumAsset = inputs.investmentAmount;
    let dcaAsset = 0;
    let dcaCash = inputs.investmentAmount;
    yearlyLumpSumValues[0].push(lumpSumAsset);
    yearlyDcaValues[0].push(dcaAsset + dcaCash);

    for (let month = 1; month <= totalMonths; month++) {
      const marketMonthlyRate = randomMonthlyLogNormalReturn(inputs.annualReturnRate, inputs.annualVolatility);

      if (month <= inputs.dcaMonths) {
        const installment = Math.min(monthlyInstallment, dcaCash);
        dcaCash -= installment;
        dcaAsset += installment;
      }

      lumpSumAsset *= 1 + marketMonthlyRate;
      dcaAsset *= 1 + marketMonthlyRate;
      dcaCash *= 1 + cashMonthlyRate;

      if (month % 12 === 0) {
        yearlyLumpSumValues[month / 12].push(lumpSumAsset);
        yearlyDcaValues[month / 12].push(dcaAsset + dcaCash);
      }
    }

    const dcaFinalValue = dcaAsset + dcaCash;
    const difference = lumpSumAsset - dcaFinalValue;

    lumpSumFinalValues.push(lumpSumAsset);
    dcaFinalValues.push(dcaFinalValue);
    differenceFinalValues.push(difference);

    if (Math.abs(difference) < 1) {
      ties++;
    } else if (difference > 0) {
      lumpSumWins++;
    } else {
      dcaWins++;
    }
  }

  lumpSumFinalValues.sort((a, b) => a - b);
  dcaFinalValues.sort((a, b) => a - b);
  differenceFinalValues.sort((a, b) => a - b);

  return {
    lumpSumWinRate: lumpSumWins / inputs.simulations,
    dcaWinRate: dcaWins / inputs.simulations,
    tieRate: ties / inputs.simulations,
    lumpSum: buildPercentiles(lumpSumFinalValues),
    dca: buildPercentiles(dcaFinalValues),
    difference: buildPercentiles(differenceFinalValues),
    yearlyPercentiles: buildYearlyPercentiles(yearlyLumpSumValues, yearlyDcaValues)
  };
}

function buildPercentiles(sortedValues) {
  return {
    p10: percentile(sortedValues, 10),
    p50: percentile(sortedValues, 50),
    p90: percentile(sortedValues, 90)
  };
}

function buildYearlyPercentiles(lumpSumValues, dcaValues) {
  return lumpSumValues.map((values, year) => {
    values.sort((a, b) => a - b);
    dcaValues[year].sort((a, b) => a - b);
    return {
      year,
      lumpSumP50: percentile(values, 50),
      dcaP50: percentile(dcaValues[year], 50)
    };
  });
}

function randomMonthlyLogNormalReturn(arithmeticMean, volatility) {
  if (volatility === 0) {
    return Math.pow(1 + arithmeticMean, 1 / 12) - 1;
  }

  const variance = volatility * volatility;
  const sigmaSquared = Math.log(1 + variance / Math.pow(1 + arithmeticMean, 2));
  const sigma = Math.sqrt(sigmaSquared);
  const mu = Math.log(1 + arithmeticMean) - sigmaSquared / 2;
  return Math.exp(mu / 12 + sigma / Math.sqrt(12) * randomStandardNormal()) - 1;
}

function randomStandardNormal() {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  const index = percentileValue / 100 * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function updateResults(result, inputs) {
  document.getElementById("lumpSumWinRate").textContent = formatPercent(result.lumpSumWinRate);
  document.getElementById("dcaWinRate").textContent = formatPercent(result.dcaWinRate);
  document.getElementById("tieRate").textContent = formatPercent(result.tieRate);
  document.getElementById("lumpSumP50").textContent = formatCurrency(result.lumpSum.p50);
  document.getElementById("dcaP50").textContent = formatCurrency(result.dca.p50);
  document.getElementById("differenceP50").textContent = formatSignedCurrency(result.difference.p50);
  document.getElementById("monthlyInstallmentPreview").textContent = formatCurrency(inputs.investmentAmount / inputs.dcaMonths);
}

function updateComparisonTable(result) {
  const rows = [
    { label: "P10 較保守", key: "p10" },
    { label: "P50 中位數", key: "p50" },
    { label: "P90 較樂觀", key: "p90" }
  ];
  const tableBody = document.getElementById("comparisonTableBody");
  tableBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.label}</td>
      <td>${formatCurrency(result.lumpSum[row.key])}</td>
      <td>${formatCurrency(result.dca[row.key])}</td>
      <td>${formatSignedCurrency(result.difference[row.key])}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function drawChart(yearlyPercentiles) {
  const canvas = document.getElementById("lumpSumDcaChart");
  const context = canvas.getContext("2d");
  if (lumpSumDcaChart !== null) lumpSumDcaChart.destroy();

  lumpSumDcaChart = new Chart(context, {
    type: "line",
    data: {
      labels: yearlyPercentiles.map((row) => `第 ${row.year} 年`),
      datasets: [
        {
          label: "單筆投入 P50",
          data: yearlyPercentiles.map((row) => row.lumpSumP50),
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: "分批投入 P50（含現金）",
          data: yearlyPercentiles.map((row) => row.dcaP50),
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => formatCompactCurrency(value) },
          title: { display: true, text: "總資產" }
        },
        x: { title: { display: true, text: "投資年數" } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}：${formatCurrency(context.parsed.y)}`
          }
        }
      }
    }
  });
}

function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatSignedCurrency(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value)}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCompactCurrency(value) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 100000000) return `${sign}${(absoluteValue / 100000000).toFixed(1)}億`;
  if (absoluteValue >= 10000) return `${sign}${(absoluteValue / 10000).toFixed(0)}萬`;
  return `${Math.round(value)}`;
}
