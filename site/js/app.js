(() => {
  "use strict";

  const state = {
    events: [],
    assignments: [],
    equipment: {},
    activeTown: "すべて",
  };

  const el = {
    timelineView: document.getElementById("view-timeline"),
    detailView: document.getElementById("view-detail"),
    timelineList: document.getElementById("timeline-list"),
    detailContent: document.getElementById("detail-content"),
    filterBar: document.getElementById("filter-bar"),
    backButton: document.getElementById("back-button"),
    imageOverlay: document.getElementById("image-overlay"),
    imageOverlayImg: document.getElementById("image-overlay-img"),
  };

  async function loadData() {
    const [events, assignments, equipment] = await Promise.all([
      fetch("data/events.json").then((r) => r.json()),
      fetch("data/assignments.json").then((r) => r.json()),
      fetch("data/equipment.json").then((r) => r.json()),
    ]);
    state.events = events;
    state.assignments = assignments;
    state.equipment = equipment;
  }

  function timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function assignmentFor(eventId) {
    return state.assignments.find((a) => a.eventId === eventId);
  }

  function eventStatus(event) {
    const start = timeToMinutes(event.timeStart);
    const end = timeToMinutes(event.timeEnd);
    const now = nowMinutes();
    if (start === null || end === null) return "upcoming";
    if (now >= start && now < end) return "now";
    if (now >= end) return "done";
    return "upcoming";
  }

  function renderTimeline() {
    const filtered = state.events.filter((event) => {
      if (state.activeTown === "すべて") return true;
      const a = assignmentFor(event.id);
      return a && a.towns.includes(state.activeTown);
    });

    el.timelineList.innerHTML = "";

    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "この町のスタッフが割り当てられている種目はありません。";
      el.timelineList.appendChild(li);
      return;
    }

    let nowCard = null;

    for (const event of filtered) {
      const status = eventStatus(event);
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event-card";
      if (status === "now") button.classList.add("is-now");
      if (status === "done") button.classList.add("is-done");

      button.innerHTML = `
        <div class="event-card__time">${event.timeStart}〜${event.timeEnd}</div>
        <div class="event-card__name">${event.id}. ${event.name}</div>
        <div class="event-card__meta">${event.target ?? ""}</div>
      `;
      button.addEventListener("click", () => showDetail(event.id));
      li.appendChild(button);
      el.timelineList.appendChild(li);

      if (status === "now") nowCard = button;
    }

    if (nowCard) {
      nowCard.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function infoItem(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `
      <div class="info-grid__item">
        <span class="info-grid__label">${label}</span>
        <span class="info-grid__value">${value}</span>
      </div>
    `;
  }

  function renderCourseTable(courseGroups) {
    if (!courseGroups) return "";
    const headerCells = courseGroups.blockLabels.map((label) => `<th>${label}</th>`).join("");
    const rows = courseGroups.rows
      .map((row) => {
        const cells = row.values.map((v) => `<td>${v ?? ""}</td>`).join("");
        return `<tr><td>${row.label}</td>${cells}</tr>`;
      })
      .join("");
    return `
      <div class="section-block">
        <h2 class="section-block__title">⑤ コース・チーム構成</h2>
        <div style="overflow-x:auto;">
          <table class="course-table">
            <thead><tr><th></th>${headerCells}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderStepSection(title, items) {
    if (!items || items.length === 0) return "";
    const lis = items.map((item) => `<li>${item}</li>`).join("");
    return `
      <div class="section-block">
        <h2 class="section-block__title">${title}</h2>
        <ol class="step-list">${lis}</ol>
      </div>
    `;
  }

  function renderEquipment(eventId) {
    const items = state.equipment[String(eventId)];
    if (!items || items.length === 0) return "";
    const lis = items.map((item) => `<li>${item}</li>`).join("");
    return `
      <div class="section-block">
        <h2 class="section-block__title">用具</h2>
        <ul class="equipment-list">${lis}</ul>
      </div>
    `;
  }

  function renderAssignedStaff(eventId) {
    const a = assignmentFor(eventId);
    if (!a || a.staff.length === 0) return "";
    return `
      <div class="section-block">
        <h2 class="section-block__title">担当スタッフ</h2>
        <p>${a.staff.join("、")}</p>
      </div>
    `;
  }

  function showDetail(eventId) {
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;

    el.detailContent.innerHTML = `
      <div class="detail-title">${event.id}. ${event.name}</div>
      <div class="detail-time">${event.timeStart}〜${event.timeEnd}</div>

      <div class="target-line">
        <span class="info-grid__label">対象</span>
        <span class="target-line__value">${event.target ?? ""}${
          event.totalCount ? `（総数 ${event.totalCount}名）` : ""
        }</span>
      </div>

      <div class="info-grid">
        ${infoItem("集合場所", event.meetingPlace)}
        ${infoItem("入場", event.entryMethod)}
        ${infoItem("ビブス", event.bibs)}
        ${infoItem("スコアカード", event.scorecard)}
        ${infoItem("黄旗", event.flag)}
        ${infoItem("その他", event.otherNote)}
      </div>

      <div class="section-block">
        <h2 class="section-block__title">配置図</h2>
        <button type="button" class="layout-image-button" id="layout-image-button">
          <img src="${event.layoutImage}" alt="${event.name} 配置図" />
        </button>
        <p class="layout-image-hint">画像をタップで拡大</p>
      </div>

      ${renderStepSection("② 競技方法", event.method)}
      ${renderStepSection("③ 審判の役割", event.referee)}
      ${renderStepSection("④ 得点", event.scoring)}
      ${renderCourseTable(event.courseGroups)}
      ${renderEquipment(event.id)}
      ${renderAssignedStaff(event.id)}
    `;

    const imageButton = document.getElementById("layout-image-button");
    imageButton.addEventListener("click", () => openImageOverlay(event.layoutImage, event.name));

    el.timelineView.classList.add("is-hidden");
    el.detailView.classList.remove("is-hidden");
    el.detailView.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }

  function showTimeline() {
    el.detailView.classList.add("is-hidden");
    el.timelineView.classList.remove("is-hidden");
  }

  function openImageOverlay(src, alt) {
    el.imageOverlayImg.src = src;
    el.imageOverlayImg.alt = alt + " 配置図拡大表示";
    el.imageOverlay.classList.remove("is-hidden");
  }

  function closeImageOverlay() {
    el.imageOverlay.classList.add("is-hidden");
  }

  function setupFilterBar() {
    el.filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      state.activeTown = chip.dataset.town;
      for (const c of el.filterBar.querySelectorAll(".filter-chip")) {
        c.classList.toggle("is-active", c === chip);
      }
      renderTimeline();
    });
  }

  function setupNav() {
    el.backButton.addEventListener("click", showTimeline);
    el.imageOverlay.addEventListener("click", closeImageOverlay);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* オフライン対応が使えなくても通常表示は続行する */
      });
    }
  }

  async function main() {
    setupFilterBar();
    setupNav();
    registerServiceWorker();
    await loadData();
    renderTimeline();
    // 現在時刻の判定は1分ごとに更新する
    setInterval(renderTimeline, 60 * 1000);
  }

  main();
})();
