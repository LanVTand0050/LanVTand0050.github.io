const checklistItems = [
  {
    id: "emergencyFund",
    severity: "critical",
    warning: "緊急預備金尚未確認：投資前應先保留日常生活與突發支出所需資金。"
  },
  {
    id: "longTermMoney",
    severity: "critical",
    warning: "資金使用期限尚未確認：三年內可能需要的資金，不宜承擔必須在低點賣出的風險。"
  },
  {
    id: "drawdownCapacity",
    severity: "critical",
    warning: "下跌承受能力尚未確認：先降低投入金額，直到市場大跌也不會影響生活。"
  },
  {
    id: "writtenPlan",
    severity: "warning",
    warning: "本次操作未能對應原訂計畫：先寫下操作理由與判斷依據。"
  },
  {
    id: "allocationFit",
    severity: "warning",
    warning: "操作後的資產配置尚未確認：檢查是否讓單一資產或市場比重過高。"
  },
  {
    id: "holdingPeriod",
    severity: "warning",
    warning: "持有期間尚未確認：先決定要用多長時間檢驗這項投資。"
  },
  {
    id: "independentDecision",
    severity: "warning",
    warning: "決策可能受到新聞、社群或他人推薦影響：先自行確認投資理由。"
  },
  {
    id: "notChasing",
    severity: "warning",
    warning: "決策可能受到近期漲跌影響：先暫停交易，等情緒平穩後再重新判斷。"
  },
  {
    id: "understandsProduct",
    severity: "warning",
    warning: "標的風險與成本尚未確認：先了解投資內容、費用及可能虧損。"
  },
  {
    id: "exitRule",
    severity: "warning",
    warning: "未來調整條件尚未寫下：先定義何時再平衡、減碼或賣出。"
  }
];

const checkButton = document.getElementById("checkButton");
const resetButton = document.getElementById("resetButton");
const statusBox = document.getElementById("disciplineStatus");
const confirmedCount = document.getElementById("confirmedCount");
const criticalCount = document.getElementById("criticalCount");
const warningCount = document.getElementById("warningCount");
const warningList = document.getElementById("warningList");
const nextStep = document.getElementById("nextStep");

function getResult() {
  const uncheckedItems = checklistItems.filter((item) => !document.getElementById(item.id).checked);
  const criticalItems = uncheckedItems.filter((item) => item.severity === "critical");
  const warningItems = uncheckedItems.filter((item) => item.severity === "warning");

  return {
    confirmed: checklistItems.length - uncheckedItems.length,
    uncheckedItems,
    criticalItems,
    warningItems
  };
}

function setStatus(className, title, description) {
  statusBox.className = `discipline-status ${className}`;
  statusBox.querySelector("strong").textContent = title;
  statusBox.querySelector("p").textContent = description;
}

function renderWarnings(items) {
  warningList.replaceChildren();

  if (items.length === 0) {
    const item = document.createElement("li");
    item.className = "all-clear-feedback";
    item.textContent = "目前沒有未確認項目。執行前仍請核對交易金額與標的資料。";
    warningList.appendChild(item);
    return;
  }

  items.forEach((warningItem) => {
    const item = document.createElement("li");
    item.className = warningItem.severity === "critical" ? "critical-feedback" : "warning-feedback";
    item.textContent = warningItem.warning;
    warningList.appendChild(item);
  });
}

function renderResult() {
  const result = getResult();

  confirmedCount.textContent = `${result.confirmed} / ${checklistItems.length}`;
  criticalCount.textContent = String(result.criticalItems.length);
  warningCount.textContent = String(result.warningItems.length);
  renderWarnings(result.uncheckedItems);

  if (result.criticalItems.length > 0) {
    setStatus("pause", "建議暫緩", "資金安全或下跌承受能力仍有關鍵項目未確認，先不要急著執行交易。");
    nextStep.textContent = "先處理所有關鍵警示。確認資金不影響生活、短期內不需使用，且能承受下跌後，再重新檢查。";
  } else if (result.warningItems.length > 0) {
    setStatus("review", "先確認再決定", "資金安全已通過，但投資計畫、情緒或執行條件仍有項目需要補充。");
    nextStep.textContent = "把未確認的理由寫下來，至少隔一段冷靜時間後再檢查一次。若仍無法確認，就維持原計畫。";
  } else {
    setStatus("ready", "符合既定流程", "所有紀律項目都已確認，可以依原訂投資計畫評估是否執行。");
    nextStep.textContent = "依事先設定的金額與規則執行，不因當天市場漲跌臨時增加交易。這不是對報酬或標的適合度的保證。";
  }
}

function resetChecklist() {
  checklistItems.forEach((item) => {
    document.getElementById(item.id).checked = false;
  });

  statusBox.className = "discipline-status neutral";
  statusBox.querySelector("strong").textContent = "尚未完成檢查";
  statusBox.querySelector("p").textContent = "勾選符合的敘述，再查看這次決策需要注意的地方。";
  confirmedCount.textContent = `0 / ${checklistItems.length}`;
  criticalCount.textContent = "-";
  warningCount.textContent = "-";
  warningList.replaceChildren();

  const item = document.createElement("li");
  item.className = "empty-feedback";
  item.textContent = "完成檢查後，這裡會列出尚未確認的事項。";
  warningList.appendChild(item);
  nextStep.textContent = "先完成左側檢查，不需要急著交易。";
}

checkButton.addEventListener("click", renderResult);
resetButton.addEventListener("click", resetChecklist);
