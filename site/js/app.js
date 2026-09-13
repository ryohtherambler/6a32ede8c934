(() => {
  "use strict";

  const state = {
    events: [],
    assignments: [],
    roster: null,
    activeStaff: "すべて",
  };

  const el = {
    timelineView: document.getElementById("view-timeline"),
    detailView: document.getElementById("view-detail"),
    timelineList: document.getElementById("timeline-list"),
    detailContent: document.getElementById("detail-content"),
    staffSelect: document.getElementById("staff-select"),
    backButton: document.getElementById("back-button"),
    imageOverlay: document.getElementById("image-overlay"),
    imageOverlayImg: document.getElementById("image-overlay-img"),
    imageOverlayClose: document.getElementById("image-overlay-close"),
    coverButton: document.getElementById("cover-button"),
  };

  async function loadData() {
    const [events, assignments, roster] = await Promise.all([
      fetch("data/events.json").then((r) => r.json()),
      fetch("data/assignments.json").then((r) => r.json()),
      fetch("data/roster.json").then((r) => r.json()),
    ]);
    state.events = events;
    state.assignments = assignments;
    state.roster = roster;
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
      if (state.activeStaff === "すべて") return true;
      const a = assignmentFor(event.id);
      return a && a.staff.includes(state.activeStaff);
    });

    el.timelineList.innerHTML = "";

    if (filtered.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "この方が担当する種目はありません。";
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
        <p class="layout-image-hint">画像をタップで全画面表示（指でつまんでさらに拡大できます）</p>
      </div>

      ${renderStepSection("② 競技方法", event.method)}
      ${renderStepSection("③ 審判の役割", event.referee)}
      ${renderStepSection("④ 得点", event.scoring)}
      ${renderCourseTable(event.courseGroups)}
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
    const options = ['<option value="すべて">すべて</option>'];

    const group = (label, names) => {
      if (names.length === 0) return "";
      const opts = names.map((name) => `<option value="${name}">${name}</option>`).join("");
      return `<optgroup label="${label}">${opts}</optgroup>`;
    };

    options.push(
      group(
        "体育振興会執行部",
        state.roster.executives.map((e) => e.name)
      )
    );
    for (const town of state.roster.towns) {
      options.push(group(town.name, [town.leader, ...town.staff]));
    }

    el.staffSelect.innerHTML = options.join("");
    el.staffSelect.addEventListener("change", () => {
      state.activeStaff = el.staffSelect.value;
      renderTimeline();
    });
  }

  function setupNav() {
    el.backButton.addEventListener("click", showTimeline);
    el.coverButton.addEventListener("click", () =>
      openImageOverlay("images/cover.png", "審判要項の表紙")
    );
    el.imageOverlayClose.addEventListener("click", closeImageOverlay);
    // 背景（画像の外側）をタップしたときだけ閉じる。画像自体のタップでは
    // 閉じないようにして、ピンチ操作や二本指ズームの邪魔をしない。
    el.imageOverlay.addEventListener("click", (e) => {
      if (e.target === el.imageOverlay) closeImageOverlay();
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* オフライン対応が使えなくても通常表示は続行する */
      });
    }
  }

  async function main() {
    setupNav();
    registerServiceWorker();
    await loadData();
    setupFilterBar();
    renderTimeline();
    // 現在時刻の判定は1分ごとに更新する
    setInterval(renderTimeline, 60 * 1000);
  }

  main();
})();
