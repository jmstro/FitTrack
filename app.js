import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FITTRACK_CONFIG = window.FITTRACK_CONFIG || {};
const SUPABASE_URL = FITTRACK_CONFIG.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = FITTRACK_CONFIG.SUPABASE_ANON_KEY || "";

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function supabaseEnabled() {
  return !!supabase;
}

const STORAGE_KEY = "workout_ledger_v3";
const LEGACY_STORAGE_KEY = "daily_fitness_tracker_v2";
const PENDING_PROFILE_KEY = "fittrack_pending_profile_v1";
const KG_IN_LB = 2.20462;

const DEFAULT_DAY = { pushups: 0, lunges: 0, situps: 0, weight: null, notes: "" };
const EXERCISES = [
  { key: "pushups", label: "Pushups", hint: "Upper body", abbr: "P" },
  { key: "lunges", label: "Lunges", hint: "Legs + balance", abbr: "L" },
  { key: "situps", label: "Situps", hint: "Core", abbr: "S" }
];

let state = loadState();
let selectedDate = startOfDay(new Date());
let chartRange = 30;
let saveTimer = null;
let lastSavedAt = null;
let syncTimer = null;
let currentLbMetric = "total_reps";
let leaderboardCache = [];
let currentLbScope = "all";
let rivalsIds = new Set();
let lastViewedProfile = null;

let currentUser = null;
let currentProfile = null;
let authMode = "signin";

const exerciseListEl = document.getElementById("exerciseList");
const statsGridEl = document.getElementById("statsGrid");
const goalGridEl = document.getElementById("goalGrid");
const historyListEl = document.getElementById("historyList");
const todayTitleEl = document.getElementById("todayTitle");
const todaySubEl = document.getElementById("todaySub");
const dateInputEl = document.getElementById("dateInput");
const saveNowBtn = document.getElementById("saveNowBtn");
const savedTinyEl = document.getElementById("savedTiny");
const saveStatusEl = document.getElementById("saveStatus");
const saveText = document.getElementById("saveText");
const toastEl = document.getElementById("toast");

const weightInput = document.getElementById("weightInput");
const notesInput = document.getElementById("notesInput");
const streakChip = document.getElementById("streakChip");

const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const searchNotesEl = document.getElementById("searchNotes");

const chartCanvas = document.getElementById("chart");
const chartCtx = chartCanvas ? chartCanvas.getContext("2d") : null;

const accountBtn = document.getElementById("accountBtn");
const authBackdrop = document.getElementById("authBackdrop");
const authCloseBtn = document.getElementById("authCloseBtn");
const authModeEl = document.getElementById("authMode");
const authEmailEl = document.getElementById("authEmail");
const authPasswordEl = document.getElementById("authPassword");
const authUsernameEl = document.getElementById("authUsername");
const authDisplayNameEl = document.getElementById("authDisplayName");
const signupExtraEl = document.getElementById("signupExtra");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMsgEl = document.getElementById("authMsg");

const refreshLeaderboardsBtn = document.getElementById("refreshLeaderboardsBtn");
const leaderboardListEl = document.getElementById("leaderboardList");
const lbRangeEl = document.getElementById("lbRange");
const lbMetricEl = document.getElementById("lbMetric");
const lbSearchInput = document.getElementById("lbSearchInput");
const lbScopeEl = document.getElementById("lbScope");

const profileLookupInput = document.getElementById("profileLookupInput");
const profileLookupBtn = document.getElementById("profileLookupBtn");
const profileViewEl = document.getElementById("profileView");
const myProfileLinkEl = document.getElementById("myProfileLink");
const shareProfileBtn = document.getElementById("shareProfileBtn");
const shareDailyBtn = document.getElementById("shareDailyBtn");
const shareCanvas = document.getElementById("shareCanvas");

const exerciseEls = new Map();
const goalEls = new Map();

const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const jumpTodayBtn = document.getElementById("jumpTodayBtn");
const resetDayBtn = document.getElementById("resetDayBtn");
const wipeAllBtn = document.getElementById("wipeAllBtn");
const copyBtn = document.getElementById("copyBtn");
const exportBtn = document.getElementById("exportBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importBtn = document.getElementById("importBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

if (prevDayBtn) prevDayBtn.addEventListener("click", () => shiftDay(-1));
if (nextDayBtn) nextDayBtn.addEventListener("click", () => shiftDay(1));
if (jumpTodayBtn) jumpTodayBtn.addEventListener("click", () => {
  selectedDate = startOfDay(new Date());
  render();
  toast("Jumped to today");
});

if (dateInputEl) {
  dateInputEl.addEventListener("change", () => {
    if (!dateInputEl.value) return;
    selectedDate = startOfDay(new Date(dateInputEl.value + "T00:00:00"));
    render();
    toast("Opened " + prettyDate(selectedDate));
  });
}

if (saveNowBtn) {
  saveNowBtn.addEventListener("click", () => {
    flushSaveNow();
    toast("Saved");
  });
}

if (resetDayBtn) resetDayBtn.addEventListener("click", resetDay);
if (wipeAllBtn) wipeAllBtn.addEventListener("click", wipeAll);
if (copyBtn) copyBtn.addEventListener("click", copySummary);
if (exportBtn) exportBtn.addEventListener("click", exportJSON);
if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportCSV);
if (importBtn) importBtn.addEventListener("click", importJSON);
if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

document.querySelectorAll('[aria-label="Theme"] button').forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.theme));
});

document.querySelectorAll("#unitToggle button").forEach((btn) => {
  btn.addEventListener("click", () => setWeightUnit(btn.dataset.unit));
});

document.querySelectorAll('[aria-label="Chart range"] button').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('[aria-label="Chart range"] button').forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    chartRange = btn.dataset.range === "all" ? "all" : Number(btn.dataset.range);
    renderChart();
  });
});

[fromDateEl, toDateEl, searchNotesEl].filter(Boolean).forEach((el) => {
  el.addEventListener("input", renderHistory);
});

if (weightInput) {
  weightInput.addEventListener("input", () => {
    const key = isoDateLocal(selectedDate);
    const valueLb = parseWeightInput(weightInput.value);
    setDayField(key, "weight", valueLb, false);
    renderStats();
    renderChart();
    renderHistory();
  });
}

if (notesInput) {
  notesInput.addEventListener("input", () => {
    const key = isoDateLocal(selectedDate);
    setDayField(key, "notes", notesInput.value.slice(0, 2000), false);
    renderHistory();
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
  renderChart();
});

if (exerciseListEl) initExercises();
if (goalGridEl) initGoals();
applySavedTheme();
applySavedUnit();
initAuthAndCommunity();
if (chartCanvas) resizeCanvas();
render();
updateSavedTiny();
document.body.classList.add("loaded");

// -------------------- helpers --------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDateLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toDateObj(key) {
  return new Date(key + "T00:00:00");
}

function prettyDate(d) {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d) - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function fullDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function shortDate(key) {
  const d = toDateObj(key);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sumReps(dayObj) {
  return EXERCISES.reduce((acc, ex) => acc + (Number(dayObj?.[ex.key]) || 0), 0);
}

function hasAnyActivity(dayObj) {
  if (!dayObj) return false;
  return sumReps(dayObj) > 0 || Number.isFinite(dayObj.weight) || String(dayObj.notes || "").trim().length > 0;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}

function haptic(ms = 10) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
  }
}

function buildFreshState() {
  return {
    days: {},
    settings: { theme: "auto", weightUnit: "lb" },
    goals: { pushups: 0, lunges: 0, situps: 0 }
  };
}

function loadState() {
  const keys = [STORAGE_KEY, LEGACY_STORAGE_KEY];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") continue;
      const next = buildFreshState();
      next.days = parsed.days && typeof parsed.days === "object" ? parsed.days : {};
      next.settings = parsed.settings && typeof parsed.settings === "object" ? { ...next.settings, ...parsed.settings } : next.settings;
      next.goals = parsed.goals && typeof parsed.goals === "object" ? { ...next.goals, ...parsed.goals } : next.goals;
      for (const k of Object.keys(next.days)) {
        next.days[k] = { ...DEFAULT_DAY, ...(next.days[k] || {}) };
      }
      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    } catch (e) {
      continue;
    }
  }
  return buildFreshState();
}

function saveState(immediate = false) {
  setSaving("saving");
  clearTimeout(saveTimer);
  if (immediate) {
    flushSaveNow();
    return;
  }
  saveTimer = setTimeout(flushSaveNow, 150);
}

function flushSaveNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    lastSavedAt = new Date();
    updateSavedTiny();
    setSaving("saved");
  } catch (e) {
    setSaving("error");
    toast("Save failed");
  }
}

function setSaving(status) {
  if (saveStatusEl) saveStatusEl.dataset.state = status;
  if (!saveText) return;
  if (status === "saving") {
    saveText.textContent = "Saving";
  } else if (status === "error") {
    saveText.textContent = "Error";
  } else {
    saveText.textContent = "Saved";
  }
}

function updateSavedTiny() {
  if (!savedTinyEl) return;
  if (!lastSavedAt) {
    savedTinyEl.textContent = "Not saved yet";
    return;
  }
  const hh = String(lastSavedAt.getHours()).padStart(2, "0");
  const mm = String(lastSavedAt.getMinutes()).padStart(2, "0");
  savedTinyEl.textContent = `Saved ${hh}:${mm}`;
}

function setTheme(theme) {
  state.settings.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll('[aria-label="Theme"] button').forEach((b) => {
    const on = b.dataset.theme === theme;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  saveState(true);
}

function applySavedTheme() {
  const theme = state.settings.theme || "auto";
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll('[aria-label="Theme"] button').forEach((b) => {
    const on = b.dataset.theme === theme;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
}

function setWeightUnit(unit) {
  if (unit !== "lb" && unit !== "kg") return;
  state.settings.weightUnit = unit;
  applySavedUnit();
  saveState(true);
  render();
}

function getWeightUnit() {
  return state.settings.weightUnit === "kg" ? "kg" : "lb";
}

function applySavedUnit() {
  const unit = getWeightUnit();
  document.querySelectorAll("#unitToggle button").forEach((b) => {
    const on = b.dataset.unit === unit;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
}

function parseWeightInput(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const unit = getWeightUnit();
  const lb = unit === "kg" ? n * KG_IN_LB : n;
  return clamp(lb, 0, 2000);
}

function formatWeight(valueLb, digits = 1) {
  if (!Number.isFinite(valueLb)) return "";
  const unit = getWeightUnit();
  const value = unit === "kg" ? valueLb / KG_IN_LB : valueLb;
  return value.toFixed(digits);
}

function formatWeightWithUnit(valueLb, digits = 1) {
  const formatted = formatWeight(valueLb, digits);
  if (!formatted) return "";
  return `${formatted} ${getWeightUnit()}`;
}

function formatSignedWeight(deltaLb) {
  if (!Number.isFinite(deltaLb)) return "--";
  const unit = getWeightUnit();
  const value = unit === "kg" ? deltaLb / KG_IN_LB : deltaLb;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

function ensureDay(dateKey) {
  if (!state.days[dateKey]) state.days[dateKey] = { ...DEFAULT_DAY };
  else state.days[dateKey] = { ...DEFAULT_DAY, ...(state.days[dateKey] || {}) };
  return state.days[dateKey];
}

function getDay(dateKey) {
  return ensureDay(dateKey);
}

function shiftDay(delta) {
  const d = new Date(selectedDate);
  d.setDate(d.getDate() + delta);
  selectedDate = startOfDay(d);
  render();
}

function setDayField(dateKey, field, value, doRender = true) {
  const day = ensureDay(dateKey);
  day[field] = value;
  saveState();
  scheduleSyncUp(dateKey);
  if (doRender) render();
}

function setRep(dateKey, exKey, newVal) {
  const day = ensureDay(dateKey);
  day[exKey] = clamp(Math.trunc(newVal), 0, 999999);
  saveState();
  scheduleSyncUp(dateKey);
  renderExercises();
  renderStats();
  renderHistory();
  renderStreak();
  renderChart();
}

function render() {
  const key = isoDateLocal(selectedDate);
  if (dateInputEl) dateInputEl.value = key;

  const day = ensureDay(key);
  if (todayTitleEl) todayTitleEl.textContent = prettyDate(selectedDate);
  if (todaySubEl) todaySubEl.textContent = fullDate(selectedDate);

  if (exerciseListEl) renderExercises();
  if (goalGridEl) renderGoals(day);

  if (weightInput) weightInput.value = formatWeight(day.weight);
  if (notesInput) notesInput.value = String(day.notes || "");

  renderStats();
  renderHistory();
  renderStreak();
  renderChart();
}

function initExercises() {
  if (!exerciseListEl) return;
  exerciseListEl.innerHTML = "";
  EXERCISES.forEach((ex) => {
    const row = document.createElement("div");
    row.className = "exercise";

    const info = document.createElement("div");
    info.className = "exercise-info";
    const title = document.createElement("h3");
    title.textContent = ex.label;
    const hint = document.createElement("p");
    hint.textContent = ex.hint;
    info.appendChild(title);
    info.appendChild(hint);

    const controls = document.createElement("div");
    controls.className = "exercise-controls";

    const stepper = document.createElement("div");
    stepper.className = "stepper";
    const minus = document.createElement("button");
    minus.className = "btn ghost";
    minus.type = "button";
    minus.textContent = "-";
    minus.addEventListener("click", () => {
      const key = isoDateLocal(selectedDate);
      const current = Number(getDay(key)[ex.key]) || 0;
      setRep(key, ex.key, current - 1);
    });

    const input = document.createElement("input");
    input.className = "numInput";
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "0";
    input.step = "1";
    input.addEventListener("input", () => {
      const n = parseInt(input.value, 10);
      if (!Number.isFinite(n)) return;
      setRep(isoDateLocal(selectedDate), ex.key, n);
    });

    const plus = document.createElement("button");
    plus.className = "btn ghost";
    plus.type = "button";
    plus.textContent = "+";
    plus.addEventListener("click", () => {
      const key = isoDateLocal(selectedDate);
      const current = Number(getDay(key)[ex.key]) || 0;
      setRep(key, ex.key, current + 1);
    });

    addHoldRepeat(plus, () => {
      const key = isoDateLocal(selectedDate);
      const current = Number(getDay(key)[ex.key]) || 0;
      setRep(key, ex.key, current + 1);
    });
    addHoldRepeat(minus, () => {
      const key = isoDateLocal(selectedDate);
      const current = Number(getDay(key)[ex.key]) || 0;
      setRep(key, ex.key, current - 1);
    });

    stepper.appendChild(minus);
    stepper.appendChild(input);
    stepper.appendChild(plus);

    const quick = document.createElement("div");
    quick.className = "quick";
    [5, 10, 25].forEach((amount) => {
      const chip = document.createElement("button");
      chip.className = "chip-btn";
      chip.type = "button";
      chip.textContent = `+${amount}`;
      chip.addEventListener("click", () => {
        const key = isoDateLocal(selectedDate);
        const current = Number(getDay(key)[ex.key]) || 0;
        setRep(key, ex.key, current + amount);
      });
      quick.appendChild(chip);
    });

    const progress = document.createElement("div");
    progress.className = "mini-progress";
    const progressFill = document.createElement("span");
    progress.appendChild(progressFill);

    const meta = document.createElement("div");
    meta.className = "mini-meta";

    controls.appendChild(stepper);
    controls.appendChild(quick);
    controls.appendChild(progress);
    controls.appendChild(meta);

    row.appendChild(info);
    row.appendChild(controls);
    exerciseListEl.appendChild(row);

    exerciseEls.set(ex.key, { input, progressFill, meta });
  });
}

function renderExercises() {
  const key = isoDateLocal(selectedDate);
  const day = ensureDay(key);
  EXERCISES.forEach((ex) => {
    const el = exerciseEls.get(ex.key);
    if (!el) return;
    const value = Number(day[ex.key]) || 0;
    if (document.activeElement !== el.input) {
      el.input.value = String(value);
    }
    const goal = Number(state.goals?.[ex.key]) || 0;
    const pct = goal > 0 ? clamp(value / goal, 0, 1) : 0;
    el.progressFill.style.width = `${Math.round(pct * 100)}%`;
    el.meta.textContent = goal > 0 ? `${value} of ${goal}` : "Set a daily goal";
  });
}

function initGoals() {
  if (!goalGridEl) return;
  goalGridEl.innerHTML = "";
  EXERCISES.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "goal-card";

    const title = document.createElement("div");
    title.className = "goal-title";
    const label = document.createElement("span");
    label.textContent = ex.label;
    const value = document.createElement("span");
    value.textContent = "--";
    title.appendChild(label);
    title.appendChild(value);

    const input = document.createElement("input");
    input.className = "goal-input";
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "0";
    input.step = "1";
    input.placeholder = "Goal";
    input.addEventListener("input", () => {
      const v = parseInt(input.value, 10);
      state.goals[ex.key] = Number.isFinite(v) ? clamp(v, 0, 999999) : 0;
      saveState(true);
      renderExercises();
      renderGoals(ensureDay(isoDateLocal(selectedDate)));
      renderStats();
    });

    const progress = document.createElement("div");
    progress.className = "mini-progress";
    const progressFill = document.createElement("span");
    progress.appendChild(progressFill);

    const meta = document.createElement("div");
    meta.className = "goal-meta";

    card.appendChild(title);
    card.appendChild(input);
    card.appendChild(progress);
    card.appendChild(meta);
    goalGridEl.appendChild(card);

    goalEls.set(ex.key, { input, progressFill, meta, value });
  });
}

function renderGoals(day) {
  if (!goalGridEl) return;
  EXERCISES.forEach((ex) => {
    const el = goalEls.get(ex.key);
    if (!el) return;
    const goal = Number(state.goals?.[ex.key]) || 0;
    const current = Number(day?.[ex.key]) || 0;
    const pct = goal > 0 ? clamp(current / goal, 0, 1) : 0;
    if (document.activeElement !== el.input) {
      el.input.value = goal ? String(goal) : "";
    }
    el.progressFill.style.width = `${Math.round(pct * 100)}%`;
    el.meta.textContent = goal > 0 ? `${current} of ${goal} today` : "Set a daily target";
    el.value.textContent = goal > 0 ? `${Math.round(pct * 100)}%` : "--";
  });
}

function totalsForLastNDays(days) {
  const today = startOfDay(new Date());
  let total = 0;
  let weightSum = 0;
  let weightCount = 0;
  let activeDays = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDateLocal(d);
    const day = state.days[key];
    if (day && hasAnyActivity(day)) activeDays++;
    total += sumReps(day);
    if (day && Number.isFinite(day.weight)) {
      weightSum += day.weight;
      weightCount++;
    }
  }

  return {
    total,
    avg: total / days,
    weightAvg: weightCount ? weightSum / weightCount : null,
    activeDays
  };
}

function totalsForRange(startAgo, endAgo) {
  const today = startOfDay(new Date());
  let total = 0;
  for (let i = startAgo; i <= endAgo; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDateLocal(d);
    const day = state.days[key];
    total += sumReps(day);
  }
  return { total };
}

function getBestDay() {
  const keys = Object.keys(state.days || {});
  let bestKey = null;
  let bestTotal = -1;
  keys.forEach((k) => {
    const total = sumReps(state.days[k]);
    if (total > bestTotal) {
      bestTotal = total;
      bestKey = k;
    }
  });
  if (!bestKey || bestTotal <= 0) return null;
  return { key: bestKey, total: bestTotal };
}

function weightTrend(days) {
  const today = startOfDay(new Date());
  let first = null;
  let last = null;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDateLocal(d);
    const w = state.days[key]?.weight;
    if (!Number.isFinite(w)) continue;
    if (!first) first = { key, weight: w };
    last = { key, weight: w };
  }
  if (!first || !last || first.key === last.key) return null;
  return { delta: last.weight - first.weight, first, last };
}

function renderStats() {
  if (!statsGridEl) return;
  const todayKey = isoDateLocal(selectedDate);
  const today = getDay(todayKey);
  const repsTotal = sumReps(today);
  const goals = state.goals || { pushups: 0, lunges: 0, situps: 0 };
  const goalTotal = EXERCISES.reduce((acc, ex) => acc + (Number(goals[ex.key]) || 0), 0);
  const pct = goalTotal > 0 ? Math.round((repsTotal / goalTotal) * 100) : null;

  const last7 = totalsForLastNDays(7);
  const prev7 = totalsForRange(7, 13);
  const delta7 = last7.total - prev7.total;
  const deltaText = prev7.total > 0 ? `${delta7 >= 0 ? "+" : ""}${delta7} vs prev 7d` : "First week logged";

  const last30 = totalsForLastNDays(30);
  const best = getBestDay();
  const trend = weightTrend(14);

  statsGridEl.innerHTML = "";
  statsGridEl.appendChild(statCard(
    "Today total",
    String(repsTotal),
    pct === null ? "Set goals for progress" : `${pct}% of daily goal`
  ));
  statsGridEl.appendChild(statCard(
    "7 day average",
    String(Math.round(last7.avg)),
    deltaText
  ));
  statsGridEl.appendChild(statCard(
    "30 day volume",
    String(last30.total),
    `${last30.activeDays} days logged`
  ));
  statsGridEl.appendChild(statCard(
    "Best day",
    best ? String(best.total) : "--",
    best ? shortDate(best.key) : "Log reps to set a PR"
  ));
  statsGridEl.appendChild(statCard(
    "Weight trend",
    trend ? formatSignedWeight(trend.delta) : "--",
    trend ? `${shortDate(trend.first.key)} to ${shortDate(trend.last.key)}` : "Log weight to see change"
  ));
}

function statCard(title, value, meta) {
  const el = document.createElement("div");
  el.className = "stat-card";
  const titleEl = document.createElement("div");
  titleEl.className = "stat-title";
  titleEl.textContent = title;
  const valueEl = document.createElement("div");
  valueEl.className = "stat-value";
  valueEl.textContent = value;
  const metaEl = document.createElement("div");
  metaEl.className = "stat-meta";
  metaEl.textContent = meta;
  el.appendChild(titleEl);
  el.appendChild(valueEl);
  el.appendChild(metaEl);
  return el;
}

function computeHistoryRows() {
  const keys = Object.keys(state.days || {}).sort().reverse();
  let filtered = keys;

  const from = fromDateEl?.value ? fromDateEl.value : null;
  const to = toDateEl?.value ? toDateEl.value : null;
  if (from) filtered = filtered.filter((k) => k >= from);
  if (to) filtered = filtered.filter((k) => k <= to);

  const q = (searchNotesEl?.value || "").trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((k) => String(state.days[k]?.notes || "").toLowerCase().includes(q));
  }

  filtered = filtered.filter((k) => hasAnyActivity(state.days[k]));

  return filtered.map((k) => {
    const obj = state.days[k] || {};
    const reps = sumReps(obj);
    const parts = [];
    if (reps > 0) parts.push(`${reps} reps`);
    if (Number.isFinite(obj.weight)) parts.push(formatWeightWithUnit(obj.weight));
    if (String(obj.notes || "").trim()) parts.push("notes");
    return {
      key: k,
      label: prettyDate(toDateObj(k)),
      subtitle: parts.length ? parts.join(" | ") : "No details",
      pushups: Number(obj.pushups) || 0,
      lunges: Number(obj.lunges) || 0,
      situps: Number(obj.situps) || 0
    };
  });
}

function renderHistory() {
  if (!historyListEl) return;
  const rows = computeHistoryRows();
  historyListEl.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent = "No matching entries yet. Log a day or adjust filters.";
    historyListEl.appendChild(empty);
    return;
  }

  rows.slice(0, 200).forEach((r) => {
    const row = document.createElement("div");
    row.className = "history-row";

    const left = document.createElement("div");
    const date = document.createElement("p");
    date.className = "date";
    date.textContent = r.label;
    const mini = document.createElement("p");
    mini.className = "mini";
    mini.textContent = r.subtitle;
    left.appendChild(date);
    left.appendChild(mini);

    const right = document.createElement("div");
    right.className = "history-tags";
    right.innerHTML = `
      <span>P ${r.pushups}</span>
      <span>L ${r.lunges}</span>
      <span>S ${r.situps}</span>
    `;

    row.addEventListener("click", () => {
      selectedDate = startOfDay(new Date(r.key + "T00:00:00"));
      render();
      toast("Opened " + r.label);
    });

    row.appendChild(left);
    row.appendChild(right);
    historyListEl.appendChild(row);
  });

  if (rows.length > 200) {
    const more = document.createElement("p");
    more.className = "note";
    more.textContent = `Showing newest 200 matches (you have ${rows.length}). Tighten filters to narrow down.`;
    historyListEl.appendChild(more);
  }
}

function renderStreak() {
  if (!streakChip) return;
  const today = startOfDay(new Date());
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDateLocal(d);
    const obj = state.days[key] || null;
    if (sumReps(obj) > 0) streak++;
    else break;
  }
  streakChip.textContent = `Streak: ${streak}`;
}

function resetDay() {
  const key = isoDateLocal(selectedDate);
  if (!confirm("Reset this day to empty values?")) return;
  state.days[key] = { ...DEFAULT_DAY };
  saveState();
  scheduleSyncUp(key);
  render();
  toast("Day reset");
  haptic();
}

function wipeAll() {
  if (!confirm("This will delete all saved days on this device. Continue?")) return;
  state = buildFreshState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
  }
  setSaving("saved");
  render();
  toast("All data wiped");
  haptic(18);
}

async function copySummary() {
  const key = isoDateLocal(selectedDate);
  const d = toDateObj(key);
  const day = getDay(key);
  const reps = sumReps(day);
  const weight = Number.isFinite(day.weight) ? formatWeightWithUnit(day.weight) : "--";
  const notes = String(day.notes || "").trim();
  const text = [
    `Workout Ledger - ${prettyDate(d)} (${key})`,
    `Pushups: ${Number(day.pushups) || 0}`,
    `Lunges: ${Number(day.lunges) || 0}`,
    `Situps: ${Number(day.situps) || 0}`,
    `Total: ${reps} reps`,
    `Weight: ${weight}`,
    `Notes: ${notes || "--"}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    toast("Copied");
    haptic();
  } catch (e) {
    prompt("Copy this:", text);
  }
}

function exportJSON() {
  const payload = JSON.stringify(state, null, 2);
  downloadBlob(payload, "application/json", "workout-ledger-export.json");
  toast("Exported");
  haptic();
}

function exportCSV() {
  const keys = Object.keys(state.days || {}).sort();
  const header = ["date", "pushups", "lunges", "situps", "total_reps", "weight_lb", "notes"];
  const lines = [header.join(",")];
  for (const k of keys) {
    const d = state.days[k] || {};
    if (!hasAnyActivity(d)) continue;
    const row = [
      k,
      Number(d.pushups) || 0,
      Number(d.lunges) || 0,
      Number(d.situps) || 0,
      sumReps(d),
      Number.isFinite(d.weight) ? d.weight.toFixed(1) : "",
      csvEscape(String(d.notes || ""))
    ];
    lines.push(row.join(","));
  }
  downloadBlob(lines.join("\n"), "text/csv", "workout-ledger.csv");
  toast("CSV exported");
  haptic();
}

function csvEscape(s) {
  const needs = /[",\n]/.test(s);
  const t = s.replace(/"/g, "\"\"");
  return needs ? `"${t}"` : t;
}

function downloadBlob(text, mime, filename) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.days || typeof parsed.days !== "object") {
        alert("Invalid file format.");
        return;
      }
      state = buildFreshState();
      state.days = parsed.days;
      state.settings = parsed.settings && typeof parsed.settings === "object" ? { ...state.settings, ...parsed.settings } : state.settings;
      state.goals = parsed.goals && typeof parsed.goals === "object" ? { ...state.goals, ...parsed.goals } : state.goals;
      for (const k of Object.keys(state.days)) {
        state.days[k] = { ...DEFAULT_DAY, ...(state.days[k] || {}) };
      }
      saveState(true);
      applySavedTheme();
      applySavedUnit();
      render();
      toast("Imported");
      haptic();
    } catch (e) {
      alert("Import failed.");
    }
  };
  input.click();
}

function clearFilters() {
  fromDateEl.value = "";
  toDateEl.value = "";
  searchNotesEl.value = "";
  renderHistory();
  toast("Filters cleared");
}

function addHoldRepeat(btn, action) {
  let t = null;
  let interval = null;
  const start = () => {
    action();
    t = setTimeout(() => {
      interval = setInterval(action, 70);
    }, 350);
  };
  const stop = () => {
    clearTimeout(t);
    clearInterval(interval);
    t = null;
    interval = null;
  };
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    start();
  });
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
}

// -------------------- chart --------------------
function resizeCanvas() {
  if (!chartCanvas || !chartCtx) return;
  const rect = chartCanvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  chartCanvas.width = Math.floor(rect.width * dpr);
  chartCanvas.height = Math.floor(rect.height * dpr);
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getChartKeys() {
  const keys = Object.keys(state.days || {}).sort();
  if (keys.length === 0) return [];
  if (chartRange === "all") return keys;
  const today = startOfDay(new Date());
  const min = new Date(today);
  min.setDate(min.getDate() - (chartRange - 1));
  const minKey = isoDateLocal(min);
  return keys.filter((k) => k >= minKey);
}

function renderChart() {
  if (!chartCanvas || !chartCtx) return;
  const rect = chartCanvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  if (!W || !H) return;

  const keys = getChartKeys().filter((k) => hasAnyActivity(state.days[k]));
  chartCtx.clearRect(0, 0, W, H);

  const cs = getComputedStyle(document.documentElement);
  const text = cs.getPropertyValue("--text").trim() || "#fff";
  const muted = cs.getPropertyValue("--muted-2").trim() || "rgba(255,255,255,.55)";
  const stroke = cs.getPropertyValue("--stroke").trim() || "rgba(255,255,255,.1)";
  const pushupsColor = cs.getPropertyValue("--accent").trim() || "#f06b4f";
  const lungesColor = cs.getPropertyValue("--accent-2").trim() || "#f4b13c";
  const situpsColor = cs.getPropertyValue("--accent-3").trim() || "#45b5b0";

  const padL = 44;
  const padR = 14;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  chartCtx.globalAlpha = 1;
  chartCtx.lineWidth = 1;
  chartCtx.strokeStyle = stroke;
  chartCtx.beginPath();
  chartCtx.moveTo(padL, padT);
  chartCtx.lineTo(padL, padT + innerH);
  chartCtx.lineTo(padL + innerW, padT + innerH);
  chartCtx.stroke();

  if (keys.length === 0) {
    chartCtx.fillStyle = muted;
    chartCtx.font = "12px " + getComputedStyle(document.body).fontFamily;
    chartCtx.fillText("No chart data yet. Log reps or weight to see trends.", padL, padT + 24);
    return;
  }

  const series = keys.map((k) => {
    const d = state.days[k] || {};
    const p = Number(d.pushups) || 0;
    const l = Number(d.lunges) || 0;
    const s = Number(d.situps) || 0;
    const total = p + l + s;
    const w = Number.isFinite(d.weight) ? d.weight : null;
    return { k, p, l, s, total, w };
  });

  const maxReps = Math.max(10, ...series.map((x) => x.total));
  const weights = series.map((x) => x.w).filter((v) => Number.isFinite(v));
  const wMin = weights.length ? Math.min(...weights) : null;
  const wMax = weights.length ? Math.max(...weights) : null;
  const wSpan = weights.length && wMin != null && wMax != null ? Math.max(1e-6, wMax - wMin) : null;

  const n = series.length;
  const gap = Math.max(2, Math.min(10, innerW / n * 0.15));
  const barW = Math.max(6, Math.min(18, (innerW - gap * (n - 1)) / n));

  chartCtx.fillStyle = muted;
  chartCtx.font = "11px " + getComputedStyle(document.body).fontFamily;
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const t = i / ticks;
    const y = padT + innerH - t * innerH;
    chartCtx.strokeStyle = stroke;
    chartCtx.beginPath();
    chartCtx.moveTo(padL, y);
    chartCtx.lineTo(padL + innerW, y);
    chartCtx.stroke();
    const val = Math.round(t * maxReps);
    chartCtx.fillText(String(val), 8, y + 4);
  }

  for (let i = 0; i < n; i++) {
    const x = padL + i * (barW + gap);
    const item = series[i];
    const scaleY = (v) => (v / maxReps) * innerH;
    const hp = scaleY(item.p);
    const hl = scaleY(item.l);
    const hs = scaleY(item.s);

    let yBase = padT + innerH;

    chartCtx.fillStyle = situpsColor;
    chartCtx.globalAlpha = 0.65;
    chartCtx.fillRect(x, yBase - hs, barW, hs);
    yBase -= hs;

    chartCtx.fillStyle = lungesColor;
    chartCtx.globalAlpha = 0.6;
    chartCtx.fillRect(x, yBase - hl, barW, hl);
    yBase -= hl;

    chartCtx.fillStyle = pushupsColor;
    chartCtx.globalAlpha = 0.6;
    chartCtx.fillRect(x, yBase - hp, barW, hp);

    chartCtx.globalAlpha = 1;
  }

  if (weights.length) {
    chartCtx.strokeStyle = text;
    chartCtx.lineWidth = 2;
    chartCtx.globalAlpha = 0.9;
    chartCtx.beginPath();

    let started = false;
    for (let i = 0; i < n; i++) {
      const item = series[i];
      if (!Number.isFinite(item.w)) {
        started = false;
        continue;
      }
      const x = padL + i * (barW + gap) + barW / 2;
      const y = padT + innerH - ((item.w - wMin) / wSpan) * innerH;
      if (!started) {
        chartCtx.moveTo(x, y);
        started = true;
      } else {
        chartCtx.lineTo(x, y);
      }
    }
    chartCtx.stroke();

    chartCtx.fillStyle = muted;
    chartCtx.globalAlpha = 1;
    chartCtx.fillText(formatWeightWithUnit(wMax), padL + innerW - 70, padT + 12);
    chartCtx.fillText(formatWeightWithUnit(wMin), padL + innerW - 70, padT + innerH);
  }

  chartCtx.fillStyle = muted;
  const first = series[0].k;
  const last = series[series.length - 1].k;
  chartCtx.fillText(shortDate(first), padL, padT + innerH + 18);
  const lastW = chartCtx.measureText(shortDate(last)).width;
  chartCtx.fillText(shortDate(last), padL + innerW - lastW, padT + innerH + 18);
}

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

// -------------------- auth + community --------------------
function initAuthAndCommunity() {
  if (accountBtn) {
    accountBtn.addEventListener("click", openAuthModal);
  }
  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", closeAuthModal);
  }
  if (authBackdrop) {
    authBackdrop.addEventListener("click", (e) => {
      if (e.target === authBackdrop) closeAuthModal();
    });
  }

  if (authModeEl) {
    authModeEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        authMode = btn.dataset.mode;
        authModeEl.querySelectorAll("button").forEach((b) => {
          const on = b.dataset.mode === authMode;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        updateAuthUI();
        setAuthMessage("");
      });
    });
  }

  if (authSubmitBtn) {
    authSubmitBtn.addEventListener("click", async () => {
      await handleAuthSubmit();
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!supabaseEnabled()) return;
      await supabase.auth.signOut();
      toast("Signed out");
    });
  }

  if (lbRangeEl) {
    lbRangeEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        lbRangeEl.querySelectorAll("button").forEach((b) => {
          const on = b.dataset.range === btn.dataset.range;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        await loadLeaderboards();
      });
    });
  }
  if (lbMetricEl) {
    currentLbMetric = lbMetricEl.querySelector("button.active")?.dataset?.metric || currentLbMetric;
    lbMetricEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        lbMetricEl.querySelectorAll("button").forEach((b) => {
          const on = b.dataset.metric === btn.dataset.metric;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        currentLbMetric = btn.dataset.metric || "total_reps";
        renderLeaderboards(leaderboardCache);
      });
    });
  }
  if (lbScopeEl) {
    currentLbScope = lbScopeEl.querySelector("button.active")?.dataset?.scope || currentLbScope;
    lbScopeEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        lbScopeEl.querySelectorAll("button").forEach((b) => {
          const on = b.dataset.scope === btn.dataset.scope;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        currentLbScope = btn.dataset.scope || "all";
        if (currentLbScope === "rivals") {
          await loadRivals();
        }
        renderLeaderboards(leaderboardCache);
      });
    });
  }
  if (lbSearchInput) {
    lbSearchInput.addEventListener("input", () => {
      renderLeaderboards(leaderboardCache);
    });
  }
  if (refreshLeaderboardsBtn) {
    refreshLeaderboardsBtn.addEventListener("click", async () => {
      await loadLeaderboards();
      toast("Leaderboards refreshed");
    });
  }
  if (profileLookupBtn) {
    profileLookupBtn.addEventListener("click", async () => {
      const u = (profileLookupInput?.value || "").trim();
      await loadPublicProfile(u);
    });
  }
  if (profileLookupInput) {
    profileLookupInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const u = (profileLookupInput.value || "").trim();
        await loadPublicProfile(u);
      }
    });
  }
  if (shareProfileBtn) {
    shareProfileBtn.addEventListener("click", () => {
      handleShareProfile();
    });
  }
  if (shareDailyBtn) {
    shareDailyBtn.addEventListener("click", () => {
      handleShareDailyStory();
    });
  }

  if (!supabaseEnabled()) {
    if (leaderboardListEl) {
      leaderboardListEl.innerHTML = '<p class="note">Add your Supabase URL and anon key in index.html to enable accounts and leaderboards.</p>';
    }
    if (profileViewEl) {
      profileViewEl.innerHTML = "<p class=\"note\">Supabase not configured.</p>";
    }
    if (myProfileLinkEl) {
      myProfileLinkEl.textContent = "Sign in to generate";
    }
    updateAuthUI();
    return;
  }

  supabase.auth.getSession().then(({ data }) => {
    currentUser = data?.session?.user || null;
    onAuthStateChanged();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    onAuthStateChanged();
  });
}

function openAuthModal() {
  if (!authBackdrop) return;
  authBackdrop.hidden = false;
  updateAuthUI();
  setAuthMessage("");
  if (!supabaseEnabled()) {
    setAuthMessage("Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY in index.html.");
  }
}

function closeAuthModal() {
  if (!authBackdrop) return;
  authBackdrop.hidden = true;
}

function updateAuthUI() {
  const isSignup = authMode === "signup";
  if (signupExtraEl) signupExtraEl.hidden = !isSignup;
  if (authSubmitBtn) {
    authSubmitBtn.textContent = currentUser && isSignup ? "Save Profile" : "Continue";
  }
  if (authEmailEl) {
    authEmailEl.disabled = !!currentUser && isSignup;
  }
  if (authPasswordEl) {
    authPasswordEl.disabled = !!currentUser && isSignup;
  }
  if (logoutBtn) {
    logoutBtn.hidden = !currentUser;
  }
  if (accountBtn) {
    accountBtn.textContent = currentUser ? "Account (Signed in)" : "Account";
  }
}

function setAuthMessage(msg) {
  if (authMsgEl) authMsgEl.textContent = msg || "";
}

async function handleAuthSubmit() {
  if (!supabaseEnabled()) return;

  const email = (authEmailEl?.value || "").trim();
  const password = (authPasswordEl?.value || "").trim();

  if (currentUser && authMode === "signup") {
    const username = normalizeUsername(authUsernameEl?.value || "");
    const displayName = (authDisplayNameEl?.value || "").trim();
    const err = validateProfile(username, displayName);
    if (err) {
      setAuthMessage(err);
      return;
    }
    await upsertMyProfile({ username, display_name: displayName });
    setAuthMessage("Profile saved.");
    updateMyProfileLink();
    await loadLeaderboards();
    return;
  }

  if (!email || !password) {
    setAuthMessage("Enter email and password.");
    return;
  }

  try {
    setAuthMessage("");
    if (authMode === "signup") {
      const username = normalizeUsername(authUsernameEl?.value || "");
      const displayName = (authDisplayNameEl?.value || "").trim();
      const err = validateProfile(username, displayName);
      if (err) {
        setAuthMessage(err);
        return;
      }
      savePendingProfile({ username, display_name: displayName });
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: displayName } }
      });
      if (error) throw error;
      setAuthMessage("Check your email to confirm, then sign in to finish setup.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeAuthModal();
    }
  } catch (err) {
    setAuthMessage(err?.message || "Auth failed");
  }
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "");
}

const REACTION_OPTIONS = [
  { key: "fire", label: "Fire", codepoint: 128293 },
  { key: "flex", label: "Strong", codepoint: 128170 },
  { key: "clap", label: "Clap", codepoint: 128079 }
];

function reactionEmoji(key) {
  const match = REACTION_OPTIONS.find((opt) => opt.key === key);
  if (!match) return "";
  try {
    return String.fromCodePoint(match.codepoint);
  } catch (e) {
    return match.label;
  }
}

function reactionLabel(key) {
  const match = REACTION_OPTIONS.find((opt) => opt.key === key);
  return match ? match.label : key;
}

function leaderboardMetricLabel(metricKey) {
  switch (metricKey) {
    case "total_pushups":
      return "Pushups";
    case "total_lunges":
      return "Lunges";
    case "total_situps":
      return "Situps";
    case "days_logged":
      return "Days";
    case "total_reps":
    default:
      return "Reps";
  }
}

function leaderboardMetricValue(row, metricKey) {
  return Number(row?.[metricKey]) || 0;
}

function buildReactionMap(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const dateKey = row.workout_date || row.date;
    const emoji = row.emoji;
    if (!dateKey || !emoji) return;
    if (!map.has(dateKey)) map.set(dateKey, {});
    const entry = map.get(dateKey);
    entry[emoji] = Number(row.reaction_count) || 0;
  });
  return map;
}

function buildReactionBar(dateKey, map, mySet, canReact) {
  const counts = map?.get(dateKey) || {};
  return `
    <div class="reaction-bar" data-date="${dateKey}">
      ${REACTION_OPTIONS.map((opt) => {
        const count = counts[opt.key] || 0;
        const active = mySet?.has(`${dateKey}|${opt.key}`) ? " active" : "";
        const disabled = canReact ? "" : " disabled";
        const emoji = reactionEmoji(opt.key);
        return `
          <button class="reaction-btn${active}" data-reaction="${opt.key}" data-date="${dateKey}"${disabled} aria-label="${escapeHTML(reactionLabel(opt.key))}">
            <span class="reaction-emoji">${emoji}</span>
            <span class="reaction-count">${count}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

async function toggleReaction(btn, profileId) {
  if (!supabaseEnabled() || !currentUser) {
    toast("Sign in to react");
    return;
  }
  const dateKey = btn.dataset.date;
  const emoji = btn.dataset.reaction;
  const countEl = btn.querySelector(".reaction-count");
  const currentCount = parseInt(countEl?.textContent || "0", 10) || 0;
  const isActive = btn.classList.contains("active");
  if (isActive) {
    const { error } = await supabase
      .from("workout_reactions")
      .delete()
      .eq("workout_user_id", profileId)
      .eq("workout_date", dateKey)
      .eq("reactor_id", currentUser.id)
      .eq("emoji", emoji);
    if (error) {
      toast("Unable to remove reaction");
      return;
    }
    btn.classList.remove("active");
    if (countEl) countEl.textContent = String(Math.max(0, currentCount - 1));
  } else {
    const { error } = await supabase
      .from("workout_reactions")
      .insert({
        workout_user_id: profileId,
        workout_date: dateKey,
        reactor_id: currentUser.id,
        emoji
      });
    if (error && error.code !== "23505") {
      toast("Unable to react");
      return;
    }
    btn.classList.add("active");
    if (!error && countEl) countEl.textContent = String(currentCount + 1);
  }
}

function getShareCanvas(width, height) {
  const canvas = shareCanvas || document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawShareCard(canvas, payload) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0e13");
  bg.addColorStop(0.5, "#131a24");
  bg.addColorStop(1, "#0f151f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(240, 107, 79, 0.18)";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.2, W * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(69, 181, 176, 0.16)";
  ctx.beginPath();
  ctx.arc(W * 0.2, H * 0.8, W * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7f1e8";
  ctx.font = "700 52px Space Grotesk, sans-serif";
  ctx.fillText(payload.title, 60, 110);

  ctx.fillStyle = "rgba(247, 241, 232, 0.7)";
  ctx.font = "20px Space Grotesk, sans-serif";
  ctx.fillText(payload.subtitle, 60, 150);

  const cardTop = 200;
  const cardGap = 20;
  const cardW = (W - 160) / 2;
  const cardH = 120;
  payload.stats.forEach((stat, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 60 + col * (cardW + cardGap);
    const y = cardTop + row * (cardH + cardGap);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, cardW, cardH, 18);
    } else {
      roundedRect(ctx, x, y, cardW, cardH, 18);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(247, 241, 232, 0.6)";
    ctx.font = "14px Space Grotesk, sans-serif";
    ctx.fillText(stat.label, x + 18, y + 34);

    ctx.fillStyle = "#f7f1e8";
    ctx.font = "600 30px Space Grotesk, sans-serif";
    ctx.fillText(stat.value, x + 18, y + 78);
  });

  ctx.fillStyle = "rgba(247, 241, 232, 0.55)";
  ctx.font = "16px Space Grotesk, sans-serif";
  ctx.fillText(payload.footer, 60, H - 60);
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function downloadCanvasImage(canvas, filename) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

function handleShareProfile() {
  if (!lastViewedProfile) {
    toast("Open a profile to share.");
    return;
  }
  const canvas = getShareCanvas(1200, 628);
  drawShareCard(canvas, {
    title: lastViewedProfile.displayName,
    subtitle: "@" + lastViewedProfile.username,
    stats: [
      { label: "Total reps", value: String(lastViewedProfile.totals.total_reps || 0) },
      { label: "Days logged", value: String(lastViewedProfile.totals.days_logged || 0) },
      { label: "Best day", value: String(lastViewedProfile.highlights.bestTotal || 0) },
      { label: "7d volume", value: String(lastViewedProfile.highlights.last7Total || 0) }
    ],
    footer: "FitTrack - Workout Ledger"
  });
  downloadCanvasImage(canvas, `fittrack-profile-${lastViewedProfile.username}.png`);
  toast("Profile card downloaded");
}

function handleShareDailyStory() {
  const key = isoDateLocal(new Date());
  const day = state.days[key] || null;
  if (!day || !hasAnyActivity(day)) {
    toast("Log a workout to share a story.");
    return;
  }
  const reps = sumReps(day);
  const canvas = getShareCanvas(1080, 1920);
  drawShareCard(canvas, {
    title: "Daily Story",
    subtitle: fullDate(new Date()),
    stats: [
      { label: "Total reps", value: String(reps) },
      { label: "Pushups", value: String(Number(day.pushups) || 0) },
      { label: "Lunges", value: String(Number(day.lunges) || 0) },
      { label: "Situps", value: String(Number(day.situps) || 0) }
    ],
    footer: "FitTrack - Workout Ledger"
  });
  downloadCanvasImage(canvas, "fittrack-daily-story.png");
  toast("Daily story downloaded");
}

function validateProfile(username, displayName) {
  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return "Username must be 3-20 chars: letters, numbers, underscore.";
  }
  if (!displayName) {
    return "Add a display name.";
  }
  return "";
}

function loadPendingProfile() {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function savePendingProfile(profile) {
  try {
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
  }
}

function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch (e) {
  }
}

async function onAuthStateChanged() {
  updateAuthUI();
  if (!currentUser) {
    currentProfile = null;
    rivalsIds = new Set();
    if (myProfileLinkEl) myProfileLinkEl.textContent = "Sign in to generate";
    await loadLeaderboards();
    await loadPublicProfileFromUrl();
    return;
  }

  await ensureProfile();
  updateMyProfileLink();
  await loadRivals();
  await syncDownMyWorkouts();
  await syncUpAllLocalDays();
  render();
  await loadLeaderboards();
  await loadPublicProfileFromUrl();
}

async function loadPublicProfileFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const u = params.get("u");
  if (u) await loadPublicProfile(u);
}

async function ensureProfile() {
  await loadMyProfile();
  if (currentProfile) return;
  const pending = loadPendingProfile();
  const meta = currentUser?.user_metadata || {};
  const username = normalizeUsername(pending?.username || meta.username || "");
  const displayName = (pending?.display_name || meta.display_name || "").trim();
  if (username && displayName) {
    await upsertMyProfile({ username, display_name: displayName });
    clearPendingProfile();
    await loadMyProfile();
  } else {
    setAuthMessage("Complete your profile to appear on leaderboards.");
  }
}

async function loadMyProfile() {
  if (!supabaseEnabled() || !currentUser) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_public")
    .eq("id", currentUser.id)
    .maybeSingle();
  if (error) {
    console.warn("Profile load error", error);
    return;
  }
  currentProfile = data || null;
}

async function upsertMyProfile({ username, display_name }) {
  if (!supabaseEnabled() || !currentUser) return;
  const payload = { id: currentUser.id, username, display_name, is_public: true };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    setAuthMessage(error.message || "Profile save failed");
  } else {
    await loadMyProfile();
  }
}

function updateMyProfileLink() {
  if (!myProfileLinkEl) return;
  if (currentProfile?.username) {
    const url = new URL(window.location.href);
    url.searchParams.set("u", currentProfile.username);
    myProfileLinkEl.textContent = url.toString();
  } else {
    myProfileLinkEl.textContent = "Complete your profile to share";
  }
}

async function loadRivals() {
  rivalsIds = new Set();
  if (!supabaseEnabled() || !currentUser) return;
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUser.id);
  if (error) {
    console.warn("Rivals load error", error);
    return;
  }
  for (const row of data || []) {
    if (row.following_id) rivalsIds.add(row.following_id);
  }
  rivalsIds.add(currentUser.id);
}

async function getFollowCounts(username) {
  if (!supabaseEnabled()) return { followers: 0, following: 0 };
  const { data, error } = await supabase.rpc("profile_follow_counts", { p_username: username });
  if (error || !data || !data.length) {
    if (error) console.warn("Follow counts error", error);
    return { followers: 0, following: 0 };
  }
  return {
    followers: Number(data[0].followers_count) || 0,
    following: Number(data[0].following_count) || 0
  };
}

async function isFollowingUser(userId) {
  if (!supabaseEnabled() || !currentUser) return false;
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUser.id)
    .eq("following_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

async function toggleFollowUser(userId, username, followBtn) {
  if (!supabaseEnabled() || !currentUser) return;
  const isFollowing = followBtn?.dataset?.following === "true";
  const nextFollowing = !isFollowing;
  if (isFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUser.id)
      .eq("following_id", userId);
    if (error) {
      toast("Unable to update rival");
      return;
    }
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: currentUser.id, following_id: userId });
    if (error) {
      toast("Unable to update rival");
      return;
    }
  }
  await loadRivals();
  const counts = await getFollowCounts(username);
  updateFollowUI(userId, username, counts, nextFollowing);
  if (currentLbScope === "rivals") renderLeaderboards(leaderboardCache);
}

function updateFollowUI(userId, username, counts, isFollowingOverride) {
  if (!profileViewEl) return;
  const followBtn = profileViewEl.querySelector("#followBtn");
  const followersEl = profileViewEl.querySelector("#followersCount");
  const followingEl = profileViewEl.querySelector("#followingCount");
  if (followersEl) followersEl.textContent = String(counts.followers ?? 0);
  if (followingEl) followingEl.textContent = String(counts.following ?? 0);
  if (followBtn) {
    const isFollowing = isFollowingOverride ?? (followBtn.dataset.following === "true");
    followBtn.dataset.following = isFollowing ? "true" : "false";
    followBtn.textContent = isFollowing ? "Rivaled" : "Rival";
    followBtn.classList.toggle("primary", isFollowing);
  }
}

async function syncDownMyWorkouts() {
  if (!supabaseEnabled() || !currentUser) return;
  const { data, error } = await supabase
    .from("workouts")
    .select("date, pushups, lunges, situps, weight_lb, notes")
    .eq("user_id", currentUser.id);
  if (error) {
    console.warn("Sync down error", error);
    return;
  }
  for (const row of data || []) {
    const key = row.date;
    const local = state.days[key] || null;
    const remote = {
      ...DEFAULT_DAY,
      pushups: row.pushups || 0,
      lunges: row.lunges || 0,
      situps: row.situps || 0,
      weight: Number.isFinite(row.weight_lb) ? Number(row.weight_lb) : (row.weight_lb ?? null),
      notes: row.notes || ""
    };
    if (!local || !hasAnyActivity(local)) {
      state.days[key] = remote;
    }
  }
  saveState(true);
}

async function syncUpAllLocalDays() {
  if (!supabaseEnabled() || !currentUser) return;
  const keys = Object.keys(state.days || {});
  for (const key of keys) {
    const day = state.days[key];
    if (!hasAnyActivity(day)) continue;
    await syncUpDay(key);
  }
}

function scheduleSyncUp(dateKey) {
  if (!supabaseEnabled() || !currentUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncUpDay(dateKey), 400);
}

async function syncUpDay(dateKey) {
  if (!supabaseEnabled() || !currentUser) return;
  const day = ensureDay(dateKey);
  const payload = {
    user_id: currentUser.id,
    date: dateKey,
    pushups: Number(day.pushups) || 0,
    lunges: Number(day.lunges) || 0,
    situps: Number(day.situps) || 0,
    weight_lb: Number.isFinite(day.weight) ? day.weight : null,
    notes: String(day.notes || "").slice(0, 2000)
  };
  const { error } = await supabase.from("workouts").upsert(payload, { onConflict: "user_id,date" });
  if (error) {
    console.warn("Sync up error", error);
    toast("Cloud sync failed");
  }
}

async function loadLeaderboards() {
  if (!supabaseEnabled()) return;
  const range = lbRangeEl?.querySelector("button.active")?.dataset?.range || "7d";
  const fnName = range === "all" ? "leaderboard_all_time" : "leaderboard_7d";
  if (leaderboardListEl) leaderboardListEl.innerHTML = '<p class="note">Loading...</p>';

  const limitCount = currentLbScope === "rivals" ? 200 : 50;
  const { data, error } = await supabase.rpc(fnName, { limit_count: limitCount });
  if (error) {
    if (leaderboardListEl) {
      leaderboardListEl.innerHTML = '<p class="note">Leaderboard not configured yet. Check the SQL functions.</p>';
    }
    console.warn("Leaderboard error", error);
    leaderboardCache = [];
    return;
  }
  leaderboardCache = data || [];
  renderLeaderboards(leaderboardCache);
}

function renderLeaderboards(rows) {
  if (!leaderboardListEl) return;
  if (!supabaseEnabled()) return;
  const allRows = Array.isArray(rows) ? rows : [];
  const query = normalizeSearch(lbSearchInput?.value || "");
  let filtered = allRows;
  if (query) {
    filtered = allRows.filter((r) => {
      const name = normalizeSearch(r.display_name || "");
      const username = normalizeSearch(r.username || "");
      return name.includes(query) || username.includes(query);
    });
  }
  if (currentLbScope === "rivals") {
    if (!currentUser) {
      leaderboardListEl.innerHTML = '<p class="note">Sign in to view rivals.</p>';
      return;
    }
    if (!rivalsIds.size) {
      leaderboardListEl.innerHTML = '<p class="note">Add rivals to compare your progress.</p>';
      return;
    }
    filtered = filtered.filter((r) => rivalsIds.has(r.user_id));
  }
  const metricKey = currentLbMetric || "total_reps";
  const metricLabel = leaderboardMetricLabel(metricKey);
  const sorted = [...filtered].sort((a, b) => {
    const diff = leaderboardMetricValue(b, metricKey) - leaderboardMetricValue(a, metricKey);
    if (diff !== 0) return diff;
    return leaderboardMetricValue(b, "total_reps") - leaderboardMetricValue(a, "total_reps");
  });
  if (!sorted.length) {
    leaderboardListEl.innerHTML = query
      ? '<p class="note">No matches found.</p>'
      : '<p class="note">No leaderboard data yet.</p>';
    return;
  }
  leaderboardListEl.innerHTML = "";
  sorted.forEach((r, idx) => {
    const el = document.createElement("div");
    el.className = "lb-row";
    if (currentUser && r.user_id === currentUser.id) {
      el.classList.add("me");
    }
    const name = r.display_name || r.username || "Anonymous";
    const handle = r.username ? "@" + r.username : "";
    const daysLogged = Number(r.days_logged) || 0;
    const totalReps = Number(r.total_reps) || 0;
    const metricValue = leaderboardMetricValue(r, metricKey);
    el.innerHTML = `
      <div class="lb-left">
        <div class="lb-name"><span class="lb-rank">${idx + 1}.</span> ${escapeHTML(name)} <span class="mono lb-handle">${escapeHTML(handle)}</span></div>
        <div class="lb-meta">${daysLogged} days logged | ${totalReps} reps</div>
      </div>
      <div class="lb-right">
        <div class="lb-score">
          <div class="lb-score-label">${escapeHTML(metricLabel)}</div>
          <div class="lb-score-value">${metricValue}</div>
        </div>
        <div class="lb-tags">
          <span class="lb-pill">P ${Number(r.total_pushups) || 0}</span>
          <span class="lb-pill">L ${Number(r.total_lunges) || 0}</span>
          <span class="lb-pill">S ${Number(r.total_situps) || 0}</span>
        </div>
      </div>
    `;
    el.addEventListener("click", async () => {
      if (r.username) await loadPublicProfile(r.username);
    });
    leaderboardListEl.appendChild(el);
  });
}

async function loadPublicProfile(username) {
  if (!profileViewEl) return;
  const u = normalizeUsername(username || "");
  if (!u) {
    if (profileViewEl) profileViewEl.innerHTML = "<p class=\"note\">Enter a username.</p>";
    return;
  }
  if (!supabaseEnabled()) {
    if (profileViewEl) profileViewEl.innerHTML = "<p class=\"note\">Supabase not configured.</p>";
    return;
  }
  if (profileViewEl) profileViewEl.innerHTML = "<p class=\"note\">Loading...</p>";

  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_public")
    .eq("username", u)
    .maybeSingle();
  if (pErr || !prof) {
    if (profileViewEl) profileViewEl.innerHTML = "<p class=\"note\">Profile not found.</p>";
    return;
  }
  if (!prof.is_public) {
    if (profileViewEl) profileViewEl.innerHTML = "<p class=\"note\">This profile is private.</p>";
    return;
  }

  const { data: allRows } = await supabase.rpc("leaderboard_all_time", { limit_count: 500 });
  const sums = (allRows || []).find((r) => r.user_id === prof.id) || null;
  const totals = sums || { total_pushups: 0, total_lunges: 0, total_situps: 0, total_reps: 0, days_logged: 0 };
  const followCounts = await getFollowCounts(prof.username);
  const isSelf = currentUser && currentUser.id === prof.id;
  const canFollow = !!currentUser && !isSelf;
  const isFollowing = canFollow ? await isFollowingUser(prof.id) : false;

  let workoutRows = [];
  let workoutNote = "";
  const { data: workoutData, error: workoutErr } = await supabase.rpc("profile_workouts", {
    p_username: prof.username,
    limit_count: 120
  });
  if (workoutErr) {
    console.warn("Profile workouts error", workoutErr);
    workoutNote = "Workout list unavailable.";
  } else {
    workoutRows = workoutData || [];
  }

  let reactionMap = new Map();
  let myReactionSet = new Set();
  const { data: reactionData, error: reactionErr } = await supabase.rpc("profile_workout_reactions", {
    p_username: prof.username,
    limit_count: 120
  });
  if (reactionErr) {
    console.warn("Profile reactions error", reactionErr);
  } else {
    reactionMap = buildReactionMap(reactionData || []);
  }
  if (currentUser) {
    const { data: myReactions } = await supabase
      .from("workout_reactions")
      .select("workout_date, emoji")
      .eq("reactor_id", currentUser.id)
      .eq("workout_user_id", prof.id);
    (myReactions || []).forEach((row) => {
      if (row.workout_date && row.emoji) {
        myReactionSet.add(`${row.workout_date}|${row.emoji}`);
      }
    });
  }

  const highlights = buildProfileHighlights(workoutRows);
  const name = prof.display_name || prof.username;
  const workoutListHtml = workoutRows.map((row) => {
    const dateKey = row.workout_date || row.date;
    const dateLabel = dateKey ? fullDate(toDateObj(dateKey)) : "Unknown date";
    const pushups = Number(row.pushups) || 0;
    const lunges = Number(row.lunges) || 0;
    const situps = Number(row.situps) || 0;
    const total = pushups + lunges + situps;
    const weightLabel = Number.isFinite(Number(row.weight_lb)) ? formatWeightWithUnit(Number(row.weight_lb)) : "";
    const notes = String(row.notes || "").trim();
    return `
      <div class="profile-workout-row">
        <div class="profile-workout-date">${escapeHTML(dateLabel)}</div>
        <div class="profile-workout-tags">
          <span>P ${pushups}</span>
          <span>L ${lunges}</span>
          <span>S ${situps}</span>
          <span class="total">Total ${total}</span>
          ${weightLabel ? `<span class="weight">${escapeHTML(weightLabel)}</span>` : ""}
        </div>
        ${buildReactionBar(dateKey, reactionMap, myReactionSet, !!currentUser)}
        ${notes ? `<div class="profile-note">${escapeHTML(notes)}</div>` : ""}
      </div>
    `;
  }).join("");

  const workoutsHtml = workoutNote
    ? `<p class="note">${escapeHTML(workoutNote)}</p>`
    : workoutRows.length
      ? `<div class="profile-workouts-list">${workoutListHtml}</div>`
      : '<p class="note">No workouts logged yet.</p>';

  profileViewEl.innerHTML = `
    <div class="profile-title">
      <div>
        <h4>${escapeHTML(name)}</h4>
        <div class="handle">@${escapeHTML(prof.username)}</div>
      </div>
      <div class="profile-actions">
        <button class="btn ${isFollowing ? "primary" : ""}" id="followBtn" data-following="${isFollowing ? "true" : "false"}"${canFollow ? "" : " disabled"}>${isSelf ? "You" : (isFollowing ? "Rivaled" : "Rival")}</button>
      </div>
    </div>
    <div class="profile-counts">
      <span><strong id="followersCount">${followCounts.followers}</strong> followers</span>
      <span><strong id="followingCount">${followCounts.following}</strong> following</span>
    </div>
    ${!currentUser ? '<p class="note">Sign in to rival or react to workouts.</p>' : ""}
    <div class="profile-stats">
      <div class="profile-stat"><div class="k">Total reps</div><div class="v">${Number(totals.total_reps) || 0}</div></div>
      <div class="profile-stat"><div class="k">Days logged</div><div class="v">${Number(totals.days_logged) || 0}</div></div>
      <div class="profile-stat"><div class="k">Best category</div><div class="v">${bestCategoryLabel(totals)}</div></div>
    </div>
    <div class="profile-highlights">
      <div class="profile-highlight">
        <div class="k">Best day</div>
        <div class="v">${highlights.bestTotal || 0}</div>
        <div class="meta">${highlights.bestDate ? escapeHTML(shortDate(highlights.bestDate)) : "No PR yet"}</div>
      </div>
      <div class="profile-highlight">
        <div class="k">Avg per day</div>
        <div class="v">${highlights.avgPerDay || 0}</div>
        <div class="meta">Across ${workoutRows.length || 0} days</div>
      </div>
      <div class="profile-highlight">
        <div class="k">Last 7d</div>
        <div class="v">${highlights.last7Total || 0}</div>
        <div class="meta">Recent volume</div>
      </div>
    </div>
    <div class="profile-workouts">
      <div class="profile-workouts-title">Recent activity</div>
      ${workoutsHtml}
    </div>
  `;
  lastViewedProfile = {
    username: prof.username,
    displayName: name,
    totals,
    highlights
  };
  const followBtn = profileViewEl.querySelector("#followBtn");
  if (followBtn && canFollow) {
    followBtn.addEventListener("click", async () => {
      await toggleFollowUser(prof.id, prof.username, followBtn);
    });
  }
  profileViewEl.querySelectorAll(".reaction-btn").forEach((btn) => {
    if (!currentUser) return;
    btn.addEventListener("click", async () => {
      await toggleReaction(btn, prof.id);
    });
  });
  profileViewEl.scrollIntoView({ behavior: "smooth", block: "start" });

  const url = new URL(window.location.href);
  url.searchParams.set("u", prof.username);
  window.history.replaceState({}, "", url.toString());
}

function bestCategoryLabel(t) {
  const p = Number(t.total_pushups) || 0;
  const l = Number(t.total_lunges) || 0;
  const s = Number(t.total_situps) || 0;
  const arr = [["Pushups", p], ["Lunges", l], ["Situps", s]];
  arr.sort((a, b) => b[1] - a[1]);
  return arr[0][0];
}

function buildProfileHighlights(rows) {
  let bestTotal = 0;
  let bestDate = null;
  let totalReps = 0;
  let last7Total = 0;
  const today = startOfDay(new Date());

  (rows || []).forEach((row) => {
    const dateKey = row.workout_date || row.date;
    const pushups = Number(row.pushups) || 0;
    const lunges = Number(row.lunges) || 0;
    const situps = Number(row.situps) || 0;
    const total = pushups + lunges + situps;
    totalReps += total;
    if (total > bestTotal) {
      bestTotal = total;
      bestDate = dateKey || bestDate;
    }
    if (dateKey) {
      const d = new Date(dateKey + "T00:00:00");
      const diff = Math.floor((today - d) / 86400000);
      if (diff >= 0 && diff < 7) last7Total += total;
    }
  });

  return {
    bestTotal,
    bestDate,
    avgPerDay: rows.length ? Math.round(totalReps / rows.length) : 0,
    last7Total
  };
}
