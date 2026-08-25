(() => {
  const storageKey = "karina-life-checklist-v1";
  const items = [...document.querySelectorAll("[data-life-item]")];
  const done = document.querySelector("#lifeDoneCount");
  const total = document.querySelector("#lifeTotalCount");
  const bar = document.querySelector("#lifeProgressBar");
  const status = document.querySelector("#lifeFilterStatus");
  const filters = [...document.querySelectorAll("[data-life-filter]")];
  const reset = document.querySelector("#resetLifeList");
  let saved = {};

  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { saved = {}; }
  const hasSavedState = Object.keys(saved).length > 0;
  items.forEach((item) => {
    if (hasSavedState && Object.prototype.hasOwnProperty.call(saved, item.dataset.lifeItem)) item.checked = Boolean(saved[item.dataset.lifeItem]);
  });

  function persist() {
    const state = Object.fromEntries(items.map((item) => [item.dataset.lifeItem, item.checked]));
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { /* Checklist still works during this visit. */ }
  }

  function updateProgress() {
    const completed = items.filter((item) => item.checked).length;
    total.textContent = items.length;
    done.textContent = completed;
    bar.style.width = `${items.length ? Math.round((completed / items.length) * 100) : 0}%`;
  }

  function setFilter(filter) {
    document.querySelectorAll(".life-checklist li").forEach((row) => {
      row.hidden = filter !== "all" && !row.dataset.scope.split(" ").includes(filter);
    });
    document.querySelectorAll(".life-category").forEach((category) => {
      category.hidden = ![...category.querySelectorAll("li")].some((row) => !row.hidden);
    });
    filters.forEach((button) => button.classList.toggle("is-active", button.dataset.lifeFilter === filter));
    const labels = { all: "显示全部项目。", carry: "显示应随身带上飞机的项目。", checked: "显示适合装进行李箱的项目。", arrival: "显示抵达意大利后办理的事项。" };
    status.textContent = labels[filter];
  }

  items.forEach((item) => item.addEventListener("change", () => { persist(); updateProgress(); }));
  filters.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.lifeFilter)));
  reset.addEventListener("click", () => {
    if (!window.confirm("要清空本设备上的勾选进度吗？")) return;
    items.forEach((item) => { item.checked = false; });
    persist();
    updateProgress();
  });
  updateProgress();
})();
