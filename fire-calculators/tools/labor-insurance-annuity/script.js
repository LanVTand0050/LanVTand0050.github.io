const legalClaimAge = 65;
const maxAdjustmentYears = 5;
let annuityCumulativeChart = null;

const calculateButton = document.getElementById("calculateButton");
calculateButton.addEventListener("click", calculateLaborInsuranceAnnuity);

window.addEventListener("load", calculateLaborInsuranceAnnuity);

function calculateLaborInsuranceAnnuity() {
  try {
    const inputs = getInputs();
    const result = calculateResult(inputs);
    updateResults(result, inputs);
    drawCumulativeChart(result.baseMonthlyAmount);
  } catch (error) {
    alert(error.message);
  }
}

function getInputs() {
  const averageMonthlySalary = Number(document.getElementById("averageMonthlySalary").value);
  const insuranceYears = Number(document.getElementById("insuranceYears").value);
  const claimAge = Number(document.getElementById("claimAge").value);

  if (averageMonthlySalary <= 0) {
    throw new Error("平均月投保薪資必須大於 0。");
  }

  if (insuranceYears <= 0) {
    throw new Error("勞保年資必須大於 0。");
  }

  if (claimAge < legalClaimAge - maxAdjustmentYears || claimAge > legalClaimAge + maxAdjustmentYears) {
    throw new Error("預計請領年齡請設定在 60 到 70 歲之間。");
  }

  return {
    averageMonthlySalary,
    insuranceYears,
    claimAge
  };
}

function calculateResult(inputs) {
  const formulaOneAmount = inputs.averageMonthlySalary * inputs.insuranceYears * 0.00775 + 3000;
  const formulaTwoAmount = inputs.averageMonthlySalary * inputs.insuranceYears * 0.0155;
  const baseMonthlyAmount = Math.max(formulaOneAmount, formulaTwoAmount);

  const ageDifference = inputs.claimAge - legalClaimAge;
  const adjustmentRate = Math.max(
    -0.2,
    Math.min(0.2, ageDifference * 0.04)
  );
  const adjustedMonthlyAmount = baseMonthlyAmount * (1 + adjustmentRate);
  const annualAmount = adjustedMonthlyAmount * 12;

  return {
    formulaOneAmount,
    formulaTwoAmount,
    baseMonthlyAmount,
    adjustmentRate,
    adjustedMonthlyAmount,
    annualAmount
  };
}

function updateResults(result, inputs) {
  document.getElementById("formulaOneAmount").textContent = formatCurrency(result.formulaOneAmount);
  document.getElementById("formulaTwoAmount").textContent = formatCurrency(result.formulaTwoAmount);
  document.getElementById("baseMonthlyAmount").textContent = formatCurrency(result.baseMonthlyAmount);
  document.getElementById("adjustmentRate").textContent = formatSignedPercent(result.adjustmentRate);
  document.getElementById("adjustedMonthlyAmount").textContent = formatCurrency(result.adjustedMonthlyAmount);
  document.getElementById("annualAmount").textContent = formatCurrency(result.annualAmount);
  document.getElementById("eligibilityNote").textContent = getEligibilityNote(inputs.insuranceYears);
}

function getEligibilityNote(insuranceYears) {
  if (insuranceYears >= 15) {
    return "年資達 15 年門檻";
  }

  return "未滿 15 年，請留意請領資格";
}

function drawCumulativeChart(baseMonthlyAmount) {
  const canvas = document.getElementById("annuityCumulativeChart");
  const ctx = canvas.getContext("2d");
  const claimAges = [60, 65, 70];
  const labels = [];

  for (let age = 60; age <= 90; age++) {
    labels.push(`${age} 歲`);
  }

  const datasets = claimAges.map((claimAge) => {
    const adjustmentRate = calculateAgeAdjustmentRate(claimAge);
    const monthlyAmount = baseMonthlyAmount * (1 + adjustmentRate);
    const data = labels.map((_, index) => {
      const currentAge = 60 + index;
      const receivedYears = Math.max(currentAge - claimAge, 0);
      return monthlyAmount * 12 * receivedYears;
    });

    return {
      label: `${claimAge} 歲請領`,
      data,
      borderWidth: claimAge === legalClaimAge ? 3 : 2,
      pointRadius: 0,
      tension: 0.2
    };
  });

  if (annuityCumulativeChart !== null) {
    annuityCumulativeChart.destroy();
  }

  annuityCumulativeChart = new Chart(ctx, {
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
            text: "累積領取金額"
          }
        },
        x: {
          title: {
            display: true,
            text: "年齡"
          }
        }
      }
    }
  });
}

function calculateAgeAdjustmentRate(claimAge) {
  const ageDifference = claimAge - legalClaimAge;
  return Math.max(
    -0.2,
    Math.min(0.2, ageDifference * 0.04)
  );
}

function formatCurrency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
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

function formatSignedPercent(value) {
  const percentage = value * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(0)}%`;
}
