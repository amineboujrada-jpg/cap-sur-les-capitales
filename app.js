"use strict";

const $ = id => document.getElementById(id);
const LATIN_KEYS = ["A", "B", "C", "D"];
const screens = ["menu", "quiz", "results", "stats", "settings"];
const state = {
  screen: "menu", region: "world", mode: "capital", count: 10, level: "medium",
  questions: [], index: 0, score: 0, wrong: [], answered: false, review: false, choices: [],
  streak: 0, bestStreak: 0, timer: null, timeLeft: 0,
};

/* ---------- Stockage local (tolérant si indisponible) ---------- */
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignoré */ } },
};
const bestKey = (level, mode, region, count) => `cap-best:${level}:${mode}:${region}:${count}`;

/* ---------- Réglages ---------- */
const SETTINGS_KEY = "cap-settings";
const DEFAULT_SETTINGS = { lang: "auto", theme: "auto", sound: true, vibrate: true, timer: 15 };
let settings = { ...DEFAULT_SETTINGS, ...(store.get(SETTINGS_KEY) || {}) };
const timerSeconds = () => Number(settings.timer) || 15;
const canVibrate = typeof navigator.vibrate === "function";

/* ---------- Langue ---------- */
// Le français vient de countries.js ; les autres langues de names.js.
countries.forEach(item => { item.fr = [item.country, item.capital, item.decoy]; });

function applyLanguage() {
  currentLang = settings.lang === "auto" ? detectLang() : settings.lang;
  if (!SUPPORTED_LANGS.includes(currentLang)) currentLang = "en";
  const root = document.documentElement;
  root.lang = currentLang;
  root.dir = RTL_LANGS.includes(currentLang) ? "rtl" : "ltr";

  countries.forEach(item => {
    const names = currentLang === "fr" ? item.fr : (NAMES[currentLang] && NAMES[currentLang][item.code]) || NAMES.en[item.code];
    [item.country, item.capital, item.decoy] = names;
  });

  document.querySelectorAll("[data-i]").forEach(node => { node.textContent = t(node.dataset.i); });
  document.querySelectorAll("[data-i-aria]").forEach(node => node.setAttribute("aria-label", t(node.dataset.iAria)));
  document.querySelectorAll("[data-s]").forEach(node => { node.textContent = t("seconds", { s: node.dataset.s }); });
  document.title = t("appName");
  document.querySelector('meta[name="description"]').setAttribute("content", t("metaDescription"));
  $("ref-link").href = t("referenceUrl");
  $("st-mastered").textContent = t("mastered", { n: countries.length });
  fillLanguageSelect();
}

function fillLanguageSelect() {
  const select = $("set-lang");
  const options = [["auto", `${t("langAuto")} · ${LANG_NAMES[detectLang()]}`], ...SUPPORTED_LANGS.map(code => [code, LANG_NAMES[code]])];
  select.replaceChildren(...options.map(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value !== "auto") option.lang = value;
    return option;
  }));
  select.value = settings.lang;
}

const letters = () => currentLang === "ar" ? ["أ", "ب", "ج", "د"] : LATIN_KEYS;

/* ---------- Thème ---------- */
function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  const dark = settings.theme === "dark" || (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#0d1f1b" : "#153a33");
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

/* ---------- Sons et vibrations ---------- */
let audio = null;
function tone(freq, start, duration, type = "sine", volume = 0.18) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.02);
}
function feedbackEffects(right) {
  if (settings.sound) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      if (right) { tone(660, 0, 0.12); tone(990, 0.09, 0.18); }
      else { tone(220, 0, 0.22, "triangle", 0.22); tone(165, 0.12, 0.26, "triangle", 0.2); }
    } catch { /* pas de son disponible */ }
  }
  if (settings.vibrate && !right && canVibrate) {
    try { navigator.vibrate([70, 50, 70]); } catch { /* ignoré */ }
  }
}

/* ---------- Statistiques (stockées par code pays, indépendantes de la langue) ---------- */
const STATS_KEY = "cap-stats";
const loadStats = () => store.get(STATS_KEY) || { games: 0, ok: 0, ko: 0, c: {} };

function recordAnswer(item, right) {
  const stats = loadStats();
  const entry = stats.c[item.code] || [0, 0];
  entry[right ? 0 : 1]++;
  stats.c[item.code] = entry;
  stats[right ? "ok" : "ko"]++;
  store.set(STATS_KEY, stats);
}
function recordGame() {
  const stats = loadStats();
  stats.games++;
  store.set(STATS_KEY, stats);
}

/* ---------- Drapeaux (SVG Twemoji intégrés dans flags.js, données fiables) ---------- */
function setFlag(node, item) {
  node.innerHTML = item && FLAG_SVG[item.code] ? FLAG_SVG[item.code] : "";
}
function flagNode(item) {
  const span = document.createElement("span");
  span.className = "flag";
  span.setAttribute("aria-hidden", "true");
  setFlag(span, item);
  return span;
}

/* ---------- Sélection des questions ---------- */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function poolFor(region, mode, level) {
  let base = region === "world" ? countries : countries.filter(item => item.region === region);
  if (mode === "country") base = base.filter(item => !item.sameName);
  if (mode === "flag") base = base.filter(item => FLAG_SVG[item.code]);
  if (level === "easy") base = base.filter(item => item.famous);
  return base;
}
const totalFor = (region, mode, count, level) => Math.min(count, poolFor(region, mode, level).length);

function selectQuestions(region, mode, count, level) {
  let pool = shuffle(poolFor(region, mode, level));
  // Difficile : les pays rares d'abord, les connus ne servent qu'à compléter.
  if (level === "hard") pool = [...pool.filter(item => !item.famous), ...pool.filter(item => item.famous)];
  const total = Math.min(count, pool.length);
  if (region !== "world") return shuffle(pool.slice(0, total));
  // Monde : au moins un pays de chaque continent, puis on complète.
  const anchors = Object.keys(countryGroups).map(key => pool.find(item => item.region === key)).filter(Boolean);
  const rest = pool.filter(item => !anchors.includes(item)).slice(0, total - anchors.length);
  return shuffle([...anchors, ...rest]);
}

// Les choix sont des objets pays : la comparaison se fait par code, pas par texte.
const correctOf = item => state.mode === "capital" ? item.capital : item.country;

function buildChoices(item) {
  if (state.level === "easy") {
    // Facile : 3 pays connus d'autres continents, sans ville-piège.
    const far = shuffle(countries.filter(other => other.region !== item.region && other.famous)).slice(0, 3);
    return shuffle([item, ...far].map(country => ({ item: country, kind: "main" })));
  }
  const neighbours = shuffle(countries.filter(other => other.region === item.region && other !== item));
  if (state.mode !== "capital" || state.level === "medium") {
    // Moyen (et modes « trouve le pays ») : 3 voisins du même continent.
    return shuffle([item, ...neighbours.slice(0, 3)].map(country => ({ item: country, kind: "main" })));
  }
  // Difficile, Pays → capitale : la capitale, la ville-piège du même pays et 2 capitales voisines.
  return shuffle([
    { item, kind: "main" },
    { item, kind: "decoy" },
    ...neighbours.filter(other => other.capital !== item.decoy).slice(0, 2).map(country => ({ item: country, kind: "main" })),
  ]);
}
const choiceLabel = choice => choice.kind === "decoy" ? choice.item.decoy : correctOf(choice.item);
const isCorrect = (choice, item) => choice.kind === "main" && choice.item === item;

/* ---------- Écran d'accueil ---------- */
function readSetup() {
  const data = new FormData($("setup"));
  return { region: data.get("region"), mode: data.get("mode"), count: Number(data.get("count")), level: data.get("level") };
}

function refreshSetupNote() {
  const { region, mode, count, level } = readSetup();
  const total = totalFor(region, mode, count, level);
  $("note-count").textContent = total;
  $("note-pool").textContent = t("notePool", { n: poolFor(region, mode, level).length });
  $("note-timer").textContent = level === "hard" ? t("perQuestion", { s: timerSeconds() }) : t("noTimer");
  $("level-hint").textContent = t(`levelHint_${level}`, { s: timerSeconds() });
  const best = store.get(bestKey(level, mode, region, count));
  const note = $("note-best");
  note.hidden = !(best && best.total === total);
  if (!note.hidden) note.textContent = t("record", { score: best.score, total: best.total });
}

/* ---------- Chrono ---------- */
function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}
function startTimer() {
  stopTimer();
  const pill = $("timer-pill");
  pill.hidden = state.level !== "hard";
  if (state.level !== "hard") return;
  state.timeLeft = timerSeconds();
  const paint = () => {
    $("timer").textContent = state.timeLeft;
    pill.classList.toggle("urgent", state.timeLeft <= 5);
  };
  paint();
  state.timer = setInterval(() => {
    state.timeLeft--;
    paint();
    if (state.timeLeft <= 0) answer(null, true);
  }, 1000);
}

function switchScreen(name, heading) {
  if (name !== "quiz") stopTimer();
  state.screen = name;
  screens.forEach(id => { $(id).hidden = id !== name; });
  window.scrollTo(0, 0);
  $(heading).focus({ preventScroll: true });
  if (name === "menu") refreshSetupNote();
}

/* ---------- Partie ---------- */
function start(setup, replayItems) {
  Object.assign(state, setup);
  state.review = Boolean(replayItems);
  state.questions = replayItems ? shuffle(replayItems) : selectQuestions(state.region, state.mode, state.count, state.level);
  state.index = 0;
  state.score = 0;
  state.wrong = [];
  state.streak = 0;
  state.bestStreak = 0;
  updateQuestion();
  switchScreen("quiz", "country-title");
}

function renderProgress() {
  const total = state.questions.length;
  const finished = state.index + Number(state.answered);
  const progress = $("progress");
  progress.style.gridTemplateColumns = `repeat(${total},minmax(0,1fr))`;
  progress.setAttribute("aria-valuemax", total);
  progress.setAttribute("aria-valuenow", finished);
  progress.setAttribute("aria-valuetext", t("progressText", { done: finished, total }));
  progress.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const segment = document.createElement("span");
    if (i < finished) segment.className = "done";
    else if (i === state.index) segment.className = "current";
    segment.setAttribute("aria-hidden", "true");
    return segment;
  }));
}

function renderStreak() {
  $("streak").textContent = state.streak;
  $("streak-pill").classList.toggle("hot", state.streak >= 3);
}

const roundLabel = () => state.review ? t("review") : `${t(`region_${state.region}`)} · ${t(`level_${state.level}`)}`;

function updateQuestion() {
  const item = state.questions[state.index];
  const mode = state.mode;
  state.choices = buildChoices(item);
  state.answered = false;
  $("round-label").textContent = roundLabel();
  $("question-count").textContent = t("questionCount", { i: state.index + 1, n: state.questions.length });
  $("score").textContent = state.score;
  renderStreak();
  $("question-prompt").textContent = t(`prompt_${mode}`);
  $("title-text").textContent = mode === "capital" ? item.country : mode === "country" ? item.capital : "";
  // En mode Capitale → pays, le drapeau trahirait la réponse : il n'apparaît qu'après.
  setFlag($("flag"), mode === "country" ? null : item);
  $("flag").classList.toggle("big", mode === "flag");
  if (mode === "flag") $("country-title").setAttribute("aria-label", t("flagToGuess"));
  else $("country-title").removeAttribute("aria-label");
  $("continent").textContent = t(`region_${item.region}`);
  $("feedback").textContent = "";
  delete $("feedback").dataset.status;
  $("next").hidden = true;
  $("pass").hidden = false;
  const keys = letters();
  $("choices").replaceChildren(...state.choices.map((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.choice = index;
    button.setAttribute("aria-keyshortcuts", `${LATIN_KEYS[index]} ${index + 1}`);
    const key = document.createElement("span");
    key.className = "choice-key";
    key.setAttribute("aria-hidden", "true");
    key.textContent = keys[index];
    const name = document.createElement("span");
    name.className = "choice-name";
    name.textContent = choiceLabel(choice);
    button.append(key, name);
    return button;
  }));
  renderProgress();
  startTimer();
}

function answer(index, timedOut = false) {
  if (state.screen !== "quiz" || state.answered) return;
  const skipped = index === null;
  const item = state.questions[state.index];
  const choice = skipped ? null : state.choices[index];
  if (!skipped && !choice) return;
  stopTimer();
  const right = Boolean(choice) && isCorrect(choice, item);
  const correct = correctOf(item);
  state.answered = true;
  if (right) {
    state.score++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else {
    state.streak = 0;
    state.wrong.push({ item, picked: choice });
  }
  recordAnswer(item, right);
  feedbackEffects(right);
  $("score").textContent = state.score;
  renderStreak();
  if (state.mode === "country") setFlag($("flag"), item);
  if (state.mode === "flag") {
    $("title-text").textContent = item.country;
    $("country-title").removeAttribute("aria-label");
  }

  const fact = t(`fact_${state.mode}`, { capital: item.capital, country: item.country });
  const feedback = $("feedback");
  feedback.dataset.status = right ? "right" : "wrong";
  feedback.textContent = right
    ? (state.streak >= 3 ? t("rightStreak", { a: correct, n: state.streak }) : t("right", { a: correct }))
    : t(timedOut ? "timeUp" : skipped ? "skipped" : "wrong", { fact });

  Array.from($("choices").children).forEach((button, i) => {
    button.disabled = true;
    const key = button.querySelector(".choice-key");
    const label = choiceLabel(state.choices[i]);
    if (isCorrect(state.choices[i], item)) {
      button.classList.add("choice-right");
      button.setAttribute("aria-label", t("ariaRight", { a: label }));
      key.textContent = "✓";
    } else if (i === index) {
      button.classList.add("choice-wrong");
      button.setAttribute("aria-label", t("ariaWrong", { a: label }));
      key.textContent = "×";
    }
  });
  renderProgress();
  $("pass").hidden = true;
  $("next-label").textContent = state.index + 1 === state.questions.length ? t("seeResult") : t("next");
  $("next").hidden = false;
  $("next").focus({ preventScroll: true });
}

function next() {
  if (state.screen !== "quiz" || !state.answered) return;
  if (state.index + 1 >= state.questions.length) {
    showResults();
    return;
  }
  state.index++;
  updateQuestion();
  window.scrollTo(0, 0);
  $("country-title").focus({ preventScroll: true });
}

function resultMessage(ratio) {
  if (ratio === 1) return t("msgPerfect");
  if (ratio >= 0.8) return t("msgGreat");
  if (ratio >= 0.5) return t("msgGood");
  return t("msgLow");
}

function showResults() {
  const total = state.questions.length;
  recordGame();
  $("results-region").textContent = state.review ? t("review") : `${roundLabel()} · ${t(`mode_${state.mode}`)}`;
  $("result-score").textContent = `${state.score} / ${total}`;
  $("result-message").textContent = resultMessage(state.score / total);

  const extras = [];
  if (state.bestStreak >= 2) extras.push(t("bestStreak", { n: state.bestStreak }));
  let newRecord = false;
  if (!state.review) {
    const key = bestKey(state.level, state.mode, state.region, state.count);
    const best = store.get(key);
    if (!best || best.total !== total || state.score > best.score) {
      newRecord = Boolean(best && best.total === total) || state.score > 0;
      store.set(key, { score: state.score, total });
    } else {
      extras.push(t("yourRecord", { score: best.score, total: best.total }));
    }
  }
  $("result-extra").textContent = extras.join(" ");
  $("result-stamp-label").textContent = newRecord ? t("newRecord") : t("goodAnswers");

  $("retry").hidden = state.wrong.length === 0;
  $("corrections").hidden = state.wrong.length === 0;
  $("mistakes").replaceChildren(...state.wrong.map(({ item, picked }) => {
    const row = document.createElement("li");
    const country = document.createElement("span");
    country.append(flagNode(item), document.createTextNode(item.country));
    const capital = document.createElement("strong");
    capital.textContent = item.capital;
    row.append(country, capital);
    if (picked) {
      const yours = document.createElement("em");
      yours.textContent = t("yourAnswer", { a: choiceLabel(picked) });
      row.append(yours);
    }
    return row;
  }));
  switchScreen("results", "result-title");
}

/* ---------- Statistiques ---------- */
const byCode = Object.fromEntries(countries.map(item => [item.code, item]));
const isKnown = ([ok, ko]) => ok >= 2 && ok >= 2 * ko;

function weakItems(limit) {
  const stats = loadStats();
  return Object.entries(stats.c)
    .filter(([code, [, ko]]) => ko > 0 && byCode[code])
    .sort(([, a], [, b]) => (b[1] - b[0]) - (a[1] - a[0]) || b[1] - a[1])
    .slice(0, limit)
    .map(([code, counts]) => ({ item: byCode[code], counts }));
}

function showStats() {
  const stats = loadStats();
  const answers = stats.ok + stats.ko;
  $("stats-empty").hidden = answers > 0;
  $("stats-body").hidden = answers === 0;
  $("reset-confirm").hidden = true;
  $("st-games").textContent = stats.games;
  $("st-answers").textContent = answers;
  $("st-rate").textContent = answers ? `${Math.round(100 * stats.ok / answers)} %` : "0 %";
  $("st-known").textContent = Object.values(stats.c).filter(isKnown).length;

  $("st-regions").replaceChildren(...Object.keys(countryGroups).map(region => {
    let ok = 0, ko = 0;
    for (const [code, counts] of Object.entries(stats.c)) {
      if (byCode[code]?.region === region) { ok += counts[0]; ko += counts[1]; }
    }
    const rate = ok + ko ? Math.round(100 * ok / (ok + ko)) : null;
    const row = document.createElement("li");
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = t(`region_${region}`);
    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.width = `${rate ?? 0}%`;
    track.append(fill);
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = rate === null ? "—" : `${rate} %`;
    row.append(label, track, value);
    row.title = t("barTitle", { ok, ko });
    return row;
  }));

  const weak = weakItems(8);
  $("weak-btn").hidden = weak.length === 0;
  $("st-weak").replaceChildren(...(weak.length ? weak.map(({ item, counts }) => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.className = "weak-name";
    name.append(flagNode(item), document.createTextNode(item.country));
    const capital = document.createElement("strong");
    capital.textContent = item.capital;
    const tally = document.createElement("em");
    tally.textContent = t("weakTally", { ko: counts[1], ok: counts[0] });
    row.append(name, capital, tally);
    return row;
  }) : [Object.assign(document.createElement("li"), { className: "weak-empty", textContent: t("noMistakes") })]));
  switchScreen("stats", "stats-title");
}

/* ---------- Écran Réglages ---------- */
function showSettings() {
  const form = $("settings-form");
  fillLanguageSelect();
  form.elements.theme.value = settings.theme;
  form.elements.timer.value = String(settings.timer);
  $("set-sound").checked = settings.sound;
  $("set-vibrate").checked = settings.vibrate;
  $("vibrate-row").hidden = !canVibrate;
  switchScreen("settings", "settings-title");
}

function saveSettings() {
  store.set(SETTINGS_KEY, settings);
}

$("settings-form").addEventListener("change", event => {
  const { name } = event.target;
  if (name === "lang") { settings.lang = event.target.value; saveSettings(); applyLanguage(); }
  if (name === "theme") { settings.theme = event.target.value; saveSettings(); applyTheme(); }
  if (name === "sound") { settings.sound = event.target.checked; saveSettings(); if (settings.sound) feedbackEffects(true); }
  if (name === "vibrate") { settings.vibrate = event.target.checked; saveSettings(); if (settings.vibrate && canVibrate) navigator.vibrate(60); }
  if (name === "timer") { settings.timer = Number(event.target.value); saveSettings(); }
});
$("settings-form").addEventListener("submit", event => {
  event.preventDefault();
  switchScreen("menu", "menu-title");
});

/* ---------- Événements ---------- */
$("setup").addEventListener("submit", event => {
  event.preventDefault();
  start(readSetup());
});
$("setup").addEventListener("change", refreshSetupNote);
$("choices").addEventListener("click", event => {
  const button = event.target.closest("[data-choice]");
  if (button) answer(Number(button.dataset.choice));
});
$("pass").addEventListener("click", () => answer(null));
$("next").addEventListener("click", next);
["back", "results-home", "stats-home", "settings-home"].forEach(id => $(id).addEventListener("click", () => switchScreen("menu", "menu-title")));
$("replay").addEventListener("click", () => start({ region: state.region, mode: state.mode, count: state.count, level: state.level }));
$("retry").addEventListener("click", () => {
  if (state.wrong.length) start({}, state.wrong.map(entry => entry.item));
});
$("stats-btn").addEventListener("click", showStats);
$("settings-btn").addEventListener("click", showSettings);
$("weak-btn").addEventListener("click", () => {
  const items = weakItems(10).map(entry => entry.item);
  const { mode, level } = readSetup();
  if (items.length) start({ mode, level, region: "world", count: 10 }, items);
});
$("reset-btn").addEventListener("click", () => { $("reset-confirm").hidden = false; $("reset-yes").focus(); });
$("reset-no").addEventListener("click", () => { $("reset-confirm").hidden = true; $("reset-btn").focus(); });
$("reset-yes").addEventListener("click", () => {
  try {
    Object.keys(localStorage).filter(key => key.startsWith("cap-") && key !== SETTINGS_KEY).forEach(key => localStorage.removeItem(key));
  } catch { /* ignoré */ }
  showStats();
});
document.addEventListener("keydown", event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || state.screen !== "quiz") return;
  if (state.answered) {
    if (event.key === "Enter" && document.activeElement !== $("next")) { event.preventDefault(); next(); }
    return;
  }
  const index = /^[1-4]$/.test(event.key) ? Number(event.key) - 1 : LATIN_KEYS.indexOf(event.key.toUpperCase());
  if (index !== -1) {
    event.preventDefault();
    answer(index);
  }
});
window.addEventListener("languagechange", () => { if (settings.lang === "auto") { applyLanguage(); refreshSetupNote(); } });

/* ---------- Démarrage ---------- */
applyTheme();
applyLanguage();
refreshSetupNote();

// App installable / hors ligne : le service worker n'est enregistré que là où c'est possible.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* pas de mode hors ligne ici */ });
  });
}

window.render_game_to_text = () => JSON.stringify({
  screen: state.screen, lang: currentLang, dir: document.documentElement.dir, region: state.region, mode: state.mode, level: state.level,
  timeLeft: state.timeLeft, review: state.review,
  question: state.screen === "quiz" ? state.index + 1 : null,
  prompt: state.screen === "quiz" ? $("title-text").textContent : null,
  choices: state.screen === "quiz" ? state.choices.map(choiceLabel) : [],
  correctIndex: state.screen === "quiz" ? state.choices.findIndex(choice => isCorrect(choice, state.questions[state.index])) : null,
  answered: state.screen === "quiz" && state.answered,
  score: state.score, streak: state.streak, total: state.questions.length,
});
