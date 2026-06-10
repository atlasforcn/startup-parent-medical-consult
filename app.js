const providers = {
  low: [
    { role: "兒科護理師", name: "林護理師", wait: "約 18 分鐘" },
    { role: "家庭照護藥師", name: "周藥師", wait: "約 25 分鐘" },
    { role: "兒科醫師", name: "陳醫師", wait: "約 45 分鐘" }
  ],
  medium: [
    { role: "兒科護理師", name: "林護理師", wait: "約 10 分鐘" },
    { role: "兒科醫師", name: "陳醫師", wait: "約 30 分鐘" },
    { role: "家庭照護藥師", name: "周藥師", wait: "約 35 分鐘" }
  ],
  high: [
    { role: "兒科醫師", name: "陳醫師", wait: "立即插隊" },
    { role: "急診轉介護理師", name: "許護理師", wait: "同步待命" },
    { role: "家庭照護藥師", name: "周藥師", wait: "後續追蹤" }
  ]
};

const copy = {
  low: {
    label: "低度風險",
    summary: "目前未見明顯急症警訊。建議先完成居家觀察、補水與照護提醒，必要時由護理師確認狀況。",
    nextStep: "18 分鐘內護理師回覆，持續觀察 4 小時內是否惡化。",
    role: "兒科護理師",
    queue: "第 5 位"
  },
  medium: {
    label: "中度風險",
    summary: "建議先由兒科護理師接通，確認退燒、補水與呼吸狀態，再視情況安排醫師。",
    nextStep: "10 分鐘內護理師回覆，30 分鐘內醫師評估。",
    role: "兒科護理師",
    queue: "第 3 位"
  },
  high: {
    label: "高度風險",
    summary: "已出現需要升級處理的警示徵象。請同步準備就近急診，線上醫師會協助整理病況與轉診摘要。",
    nextStep: "立即接通兒科醫師，建議前往急診或撥打緊急電話。",
    role: "兒科醫師",
    queue: "優先插隊"
  }
};

const symptomNames = {
  fever: "發燒",
  cough: "咳嗽/喘",
  rash: "皮疹",
  vomit: "嘔吐/腹瀉",
  pain: "腹痛/耳痛",
  injury: "跌倒/外傷"
};

const state = {
  risk: "medium",
  events: [],
  reminders: []
};

const elements = {
  form: document.querySelector("#triageForm"),
  ageGroup: document.querySelector("#ageGroup"),
  temperature: document.querySelector("#temperature"),
  duration: document.querySelector("#duration"),
  riskMeter: document.querySelector("#riskMeter"),
  riskPanel: document.querySelector(".risk-panel"),
  riskLevel: document.querySelector("#riskLevel"),
  riskSummary: document.querySelector("#riskSummary"),
  nextStep: document.querySelector("#nextStep"),
  recommendedRole: document.querySelector("#recommendedRole"),
  queuePosition: document.querySelector("#queuePosition"),
  primaryRole: document.querySelector("#primaryRole"),
  primaryName: document.querySelector("#primaryName"),
  primaryWait: document.querySelector("#primaryWait"),
  providerList: document.querySelector("#providerList"),
  eventTimeline: document.querySelector("#eventTimeline"),
  reminderList: document.querySelector("#reminderList"),
  currentTime: document.querySelector("#currentTime"),
  resetButton: document.querySelector("#resetButton"),
  demoScenarioButton: document.querySelector("#demoScenarioButton"),
  createReferralButton: document.querySelector("#createReferralButton"),
  referralNote: document.querySelector("#referralNote")
};

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function assessRisk() {
  const symptoms = getCheckedValues("symptom");
  const warnings = getCheckedValues("warning");
  const temperature = Number(elements.temperature.value);
  let score = 0;

  score += symptoms.length;
  score += warnings.length * 4;

  if (temperature >= 40) score += 4;
  else if (temperature >= 38.5) score += 2;

  if (elements.ageGroup.value === "infant") score += 2;
  if (elements.duration.value === "long") score += 2;
  if (symptoms.includes("cough") && warnings.includes("breathing")) score += 3;
  if (symptoms.includes("vomit") && warnings.includes("dehydration")) score += 3;

  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function buildReminders(risk) {
  const symptoms = getCheckedValues("symptom");
  const temperature = Number(elements.temperature.value);
  const reminders = [];

  if (symptoms.includes("fever") || temperature >= 38) {
    reminders.push({
      title: "體溫追蹤",
      detail: "每 30 分鐘記錄體溫、精神與尿量，退燒藥請依既有醫囑或藥袋標示使用。",
      due: "30 分鐘後"
    });
  }

  if (symptoms.includes("vomit")) {
    reminders.push({
      title: "補水觀察",
      detail: "少量多次補充水分或口服補液，若持續嘔吐或尿量下降需升級諮詢。",
      due: "15 分鐘後"
    });
  }

  if (symptoms.includes("cough")) {
    reminders.push({
      title: "呼吸狀態",
      detail: "觀察胸凹、喘鳴、嘴唇顏色與睡眠呼吸，異常時立即轉急診。",
      due: "持續觀察"
    });
  }

  if (symptoms.includes("rash")) {
    reminders.push({
      title: "皮疹照片",
      detail: "在自然光下拍攝皮疹範圍，供線上醫護判讀變化。",
      due: "接通前"
    });
  }

  if (symptoms.includes("pain") || symptoms.includes("injury")) {
    reminders.push({
      title: "疼痛與活動",
      detail: "記錄疼痛位置、活動受限與是否持續哭鬧，避免自行按壓疑似受傷處。",
      due: "20 分鐘後"
    });
  }

  if (risk === "high") {
    reminders.unshift({
      title: "急診準備",
      detail: "準備健保卡、過敏史、目前用藥與體溫紀錄，必要時立即出發。",
      due: "立即"
    });
  }

  if (reminders.length === 0) {
    reminders.push({
      title: "安心回報",
      detail: "若精神、食慾或睡眠有明顯改變，回到分流表重新評估。",
      due: "4 小時後"
    });
  }

  return reminders.map((reminder, index) => ({
    id: `${Date.now()}-${index}`,
    done: false,
    ...reminder
  }));
}

function addEvent(type, customText) {
  const eventText = {
    triage: "完成症狀分流並更新候診安排",
    connect: "已接通值班醫護，開始確認病況",
    photo: "家長補充照片與體溫紀錄",
    note: "醫護新增用藥與居家照護提醒",
    close: "完成本次線上諮詢，保留 24 小時追蹤入口",
    referral: "已建立急診摘要，可提供給現場醫護參考"
  };

  state.events.unshift({
    type,
    title: customText || eventText[type],
    time: formatClock()
  });

  state.events = state.events.slice(0, 6);
  renderEvents();
}

function renderRisk() {
  const details = copy[state.risk];
  elements.riskMeter.className = `risk-meter ${state.risk}`;
  elements.riskPanel.classList.remove("low", "medium", "high");
  elements.riskPanel.classList.add(state.risk);
  elements.riskLevel.textContent = details.label;
  elements.riskSummary.textContent = details.summary;
  elements.nextStep.textContent = details.nextStep;
  elements.recommendedRole.textContent = details.role;
  elements.queuePosition.textContent = details.queue;
}

function renderProviders() {
  const list = providers[state.risk];
  const [primary, ...others] = list;

  elements.primaryRole.textContent = primary.role;
  elements.primaryName.textContent = primary.name;
  elements.primaryWait.textContent = primary.wait;

  elements.providerList.innerHTML = others.map((provider) => `
    <article class="queue-card">
      <div>
        <span class="provider-role">${provider.role}</span>
        <strong>${provider.name}</strong>
      </div>
      <span class="wait-time">${provider.wait}</span>
    </article>
  `).join("");
}

function renderEvents() {
  elements.eventTimeline.innerHTML = state.events.map((event) => `
    <li>
      <strong>${event.title}</strong>
      <span>${event.time} · ${event.type === "referral" ? "風險升級" : "線上諮詢"}</span>
    </li>
  `).join("");
}

function renderReminders() {
  elements.reminderList.innerHTML = state.reminders.map((reminder) => `
    <article class="reminder ${reminder.done ? "done" : ""}">
      <input type="checkbox" data-reminder="${reminder.id}" ${reminder.done ? "checked" : ""} aria-label="標記 ${reminder.title} 完成">
      <div>
        <strong>${reminder.title}</strong>
        <p>${reminder.detail}</p>
        <p><strong>提醒：</strong>${reminder.due}</p>
      </div>
      <button type="button" data-delay="${reminder.id}">延後 15 分鐘</button>
    </article>
  `).join("");
}

function updateDashboard({ logEvent = true } = {}) {
  state.risk = assessRisk();
  state.reminders = buildReminders(state.risk);
  renderRisk();
  renderProviders();
  renderReminders();

  if (logEvent) {
    const symptoms = getCheckedValues("symptom").map((key) => symptomNames[key]).join("、") || "未選擇症狀";
    addEvent("triage", `完成分流：${symptoms}`);
  }
}

function resetForm() {
  elements.form.reset();
  elements.temperature.value = "37.8";
  document.querySelector('input[name="symptom"][value="fever"]').checked = true;
  state.events = [];
  updateDashboard({ logEvent: true });
}

function applyDemoScenario() {
  elements.form.reset();
  elements.ageGroup.value = "toddler";
  elements.temperature.value = "39.4";
  elements.duration.value = "day";
  ["fever", "cough"].forEach((value) => {
    document.querySelector(`input[name="symptom"][value="${value}"]`).checked = true;
  });
  addEvent("connect", "夜間發燒情境已帶入，等待護理師接通");
  updateDashboard({ logEvent: true });
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDashboard({ logEvent: true });
});

elements.resetButton.addEventListener("click", resetForm);
elements.demoScenarioButton.addEventListener("click", applyDemoScenario);

document.querySelectorAll("[data-event]").forEach((button) => {
  button.addEventListener("click", () => {
    addEvent(button.dataset.event);
  });
});

elements.createReferralButton.addEventListener("click", () => {
  addEvent("referral");
  elements.referralNote.textContent = state.risk === "high"
    ? "急診摘要已包含警示徵象、體溫、候診接通紀錄與建議前往急診。"
    : "已建立照護摘要；若症狀惡化，可快速轉為急診摘要。";
});

elements.reminderList.addEventListener("click", (event) => {
  const delayButton = event.target.closest("[data-delay]");
  if (!delayButton) return;

  state.reminders = state.reminders.map((reminder) => {
    if (reminder.id !== delayButton.dataset.delay) return reminder;
    return { ...reminder, due: "已延後 15 分鐘" };
  });
  renderReminders();
  addEvent("note", "已延後一筆照護提醒");
});

elements.reminderList.addEventListener("change", (event) => {
  if (!event.target.matches("[data-reminder]")) return;

  state.reminders = state.reminders.map((reminder) => {
    if (reminder.id !== event.target.dataset.reminder) return reminder;
    return { ...reminder, done: event.target.checked };
  });
  renderReminders();
  addEvent("note", event.target.checked ? "已完成一筆照護提醒" : "已恢復一筆照護提醒");
});

function tickClock() {
  elements.currentTime.textContent = formatClock();
}

tickClock();
setInterval(tickClock, 30000);
updateDashboard({ logEvent: true });
