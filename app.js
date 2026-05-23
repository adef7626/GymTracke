/**
 * ==========================================================================
 * DHRUVISH ADRENALINE - CORE APPLICATION LOGIC
 * ==========================================================================
 */

// Application Constants & Default Database
const STORAGE_KEY = "gym-tracker-inline";
const CUSTOM_EXER_KEY = "gym-tracker-custom-exercises";
const HEADLINE_KEY = "gym-tracker-headline";
const BODYWEIGHT_KEY = "gym-tracker-bodyweight";
const MODE_KEY = "gym-tracker-mode";

const MUSCLES = [
  "Chest & Triceps",
  "Back & Biceps",
  "Abs",
  "Legs",
  "Shoulder and Forearms",
  "Cardio"
];

const DEFAULT_EXERCISES = {
  "Chest & Triceps": [
    { name: "Incline Dumbbell Press", type: "weighted" },
    { name: "Chest Fly Machine", type: "weighted" },
    { name: "Push-ups", type: "bodyweight" },
    { name: "Chest Bench Press", type: "weighted" },
    { name: "Inclined Bench Press", type: "weighted" },
    { name: "Dumbbell Fly", type: "weighted" },
    { name: "Tricep Pushdown", type: "weighted" },
    { name: "Overhead Tricep Extension", type: "weighted" },
    { name: "Triceps Extension", type: "weighted" },
    { name: "Rope Pushdown", type: "weighted" },
    { name: "Dips", type: "bodyweight" }
  ],
  "Back & Biceps": [
    { name: "Lat Pulldown", type: "weighted" },
    { name: "Seated Row", type: "weighted" },
    { name: "Deadlift", type: "weighted" },
    { name: "Pull-ups", type: "bodyweight" },
    { name: "Single Arm Rowing", type: "weighted" },
    { name: "Dumbbell Shrugs", type: "weighted" },
    { name: "Back Extension", type: "bodyweight" },
    { name: "Barbell Curl", type: "weighted" },
    { name: "Pitchers", type: "weighted" },
    { name: "Dumbbell Hammer", type: "weighted" },
    { name: "Zigzag Bar Curl", type: "weighted" }
  ],
  "Abs": [
    { name: "Crunches", type: "bodyweight" },
    { name: "Leg Raise", type: "bodyweight" },
    { name: "Cable Crunch", type: "weighted" },
    { name: "Plank", type: "bodyweight" }
  ],
  "Legs": [
    { name: "Back Squat", type: "weighted" },
    { name: "Leg Press", type: "weighted" },
    { name: "Romanian Deadlift", type: "weighted" },
    { name: "Leg Extension", type: "weighted" },
    { name: "Leg Curl", type: "weighted" },
    { name: "Adductor", type: "weighted" },
    { name: "Squats", type: "bodyweight" },
    { name: "Lunges", type: "bodyweight" },
    { name: "Calf Raise", type: "bodyweight" }
  ],
  "Shoulder and Forearms": [
    { name: "Dumbbell Shoulder Press", type: "weighted" },
    { name: "Lateral Raise", type: "weighted" },
    { name: "Face Pull", type: "weighted" },
    { name: "Reverse Pec Deck", type: "weighted" },
    { name: "Shoulder Press", type: "weighted" },
    { name: "Shoulder Raise", type: "weighted" },
    { name: "Forearm Curl", type: "weighted" },
    { name: "Reverse Wrist Curl", type: "weighted" },
    { name: "Wrist Curl", type: "weighted" }
  ],
  "Cardio": [
    { name: "Treadmill", type: "cardio" },
    { name: "Cycling", type: "cardio" },
    { name: "Running", type: "cardio" },
    { name: "Walking", type: "cardio" },
    { name: "Rowing", type: "cardio" }
  ]
};

// Application State
let state = {
  selectedMuscle: null,
  selectedExercise: null,
  entries: [],
  customExercises: {},
  bodyweightEntries: [],
  headline: "Dhruvish Adrenaline: All‑Out Mode",
  mode: "normal",
  focusMode: false,
  chartInstance: null,
  theme: "orange",
  synthPlaying: false
};

// Haptic & Visual Feedback Helpers
function triggerHaptic(pattern = 15) {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.log("Haptic vibration blocked or not supported on this device:", e);
    }
  }
}

// Math Utility Formulas
function calculate1RM(weight, reps) {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  // Epley Formula
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}

function computeFromSets(sets, type) {
  let totalVolume = 0;
  let topWeight = 0;
  let best1RM = 0;
  let totalDistance = 0;
  let totalTime = 0;

  if (type === "cardio") {
    sets.forEach(s => {
      totalDistance += Number(s.distance || 0);
      totalTime += Number(s.time || 0);
    });
  } else if (type === "bodyweight") {
    sets.forEach(s => {
      totalVolume += Number(s.reps || 0); // volume represents total reps for bodyweight
    });
  } else {
    // Weighted
    sets.forEach(s => {
      const w = Number(s.weight || 0);
      const r = Number(s.reps || 0);
      totalVolume += w * r;
      if (w > topWeight) topWeight = w;
      const current1RM = calculate1RM(w, r);
      if (current1RM > best1RM) best1RM = current1RM;
    });
  }

  return {
    totalVolume: Math.round(totalVolume * 10) / 10,
    topWeight: Math.round(topWeight * 10) / 10,
    best1RM: Math.round(best1RM * 10) / 10,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalTime: Math.round(totalTime * 10) / 10
  };
}

// Data Normalization & Migrations
function normalizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function defaultSetsByType(type) {
  if (type === "cardio") return [{ distance: 2.0, time: 15 }];
  if (type === "bodyweight") return [{ reps: 10 }, { reps: 8 }, { reps: 8 }];
  return [{ weight: 10, reps: 10 }, { weight: 10, reps: 8 }, { weight: 12.5, reps: 8 }];
}

function dedupeExerciseObjects(list) {
  const map = new Map();
  (list || []).forEach(item => {
    const obj = typeof item === "string" ? { name: item, type: inferExerciseType(item) } : item;
    const name = (obj?.name || "").trim();
    if (!name) return;
    const key = normalizeName(name);
    if (!map.has(key)) {
      map.set(key, { name, type: obj.type || inferExerciseType(name) });
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    const ga = (a.type || "weighted").localeCompare(b.type || "weighted");
    return ga || a.name.localeCompare(b.name);
  });
}

function inferExerciseType(name) {
  const n = normalizeName(name);
  const cardioWords = ["run", "running", "treadmill", "cycling", "cycle", "walking", "walk", "rowing", "rower", "cardio", "elliptical"];
  const bodyweightWords = ["push-up", "push up", "pull-up", "pull up", "dip", "dips", "crunch", "plank", "leg raise", "squat", "lunge", "calf raise", "back extension"];
  if (cardioWords.some(w => n.includes(w))) return "cardio";
  if (bodyweightWords.some(w => n.includes(w))) return "bodyweight";
  return "weighted";
}

function getAllExercisesForMuscle(muscle) {
  const base = DEFAULT_EXERCISES[muscle] || [];
  const custom = state.customExercises[muscle] || [];
  return dedupeExerciseObjects([...base, ...custom]);
}

function normalizeSetsByType(sets, type) {
  if (type === "cardio") {
    const normalized = (sets || []).map(s => ({
      distance: Number(s.distance !== undefined ? s.distance : (s.km || 0)) || 0,
      time: Number(s.time || 0) || 0
    })).filter(s => s.distance > 0 || s.time > 0);
    return normalized.length ? normalized : defaultSetsByType(type);
  }
  if (type === "bodyweight") {
    const normalized = (sets || []).map(s => ({ reps: Number(s.reps || 0) || 0 })).filter(s => s.reps > 0);
    return normalized.length ? normalized : defaultSetsByType(type);
  }
  const normalized = (sets || []).map(s => ({
    weight: Number(s.weight || 0) || 0,
    reps: Number(s.reps || 0) || 0
  })).filter(s => s.weight > 0 || s.reps > 0);
  return normalized.length ? normalized : defaultSetsByType(type);
}

// LocalStorage Synchronization
function loadAllData() {
  // 1. Headline
  state.headline = localStorage.getItem(HEADLINE_KEY) || "Dhruvish Adrenaline: All‑Out Mode";
  const headlineEl = document.getElementById("headlineText");
  if (headlineEl) headlineEl.textContent = state.headline;

  // 2. Training Mode
  state.mode = localStorage.getItem(MODE_KEY) || "normal";
  const modeSelect = document.getElementById("modeSelect");
  if (modeSelect) modeSelect.value = state.mode;

  // 3. Custom Exercises
  try {
    state.customExercises = JSON.parse(localStorage.getItem(CUSTOM_EXER_KEY) || "{}");
  } catch {
    state.customExercises = {};
  }
  MUSCLES.forEach(m => {
    state.customExercises[m] = dedupeExerciseObjects(state.customExercises[m] || []);
  });

  // 4. Bodyweight logs
  try {
    state.bodyweightEntries = JSON.parse(localStorage.getItem(BODYWEIGHT_KEY) || "[]");
  } catch {
    state.bodyweightEntries = [];
  }
  state.bodyweightEntries = state.bodyweightEntries
    .filter(item => item && item.date && Number(item.weight) > 0)
    .map(item => ({ date: item.date, weight: Number(item.weight) }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // 5. Workout Logs
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.entries = raw ? JSON.parse(raw) : [];
  } catch {
    state.entries = [];
  }

  // Migrate and normalize workout records
  const renameMap = {
    "Chest & Biceps": "Chest & Triceps",
    "Back & Triceps": "Back & Biceps"
  };
  const merged = new Map();

  state.entries.forEach(entry => {
    if (!entry || !entry.date || !entry.exercise) return;
    const muscle = renameMap[entry.muscle] || entry.muscle;
    const exercise = entry.exercise.trim();
    if (!exercise) return;
    const type = entry.type || inferExerciseType(exercise);
    const sets = normalizeSetsByType(entry.sets || [], type);
    const computed = computeFromSets(sets, type);

    const record = {
      date: entry.date,
      muscle,
      exercise,
      type,
      sets,
      totalVolume: computed.totalVolume,
      topWeight: computed.topWeight,
      best1RM: computed.best1RM,
      totalDistance: computed.totalDistance,
      totalTime: computed.totalTime
    };

    if (exercise === "__muscle_complete__") {
      merged.set(`${muscle}__${entry.date}__complete`, record);
      return;
    }

    const key = `${entry.date}__${muscle}__${normalizeName(exercise)}`;
    if (!merged.has(key)) {
      merged.set(key, record);
    } else {
      const existing = merged.get(key);
      const combinedSets = [...(existing.sets || []), ...(record.sets || [])];
      const finalSets = normalizeSetsByType(combinedSets, type);
      const recomputed = computeFromSets(finalSets, type);
      merged.set(key, {
        ...existing,
        sets: finalSets,
        ...recomputed
      });
    }
  });

  state.entries = Array.from(merged.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 6. Theme
  state.theme = localStorage.getItem("gym-tracker-theme") || "orange";
  document.documentElement.setAttribute("data-theme", state.theme);
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) themeSelect.value = state.theme;

  saveAllData();
  updateAchievements();
}

function saveAllData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  localStorage.setItem(CUSTOM_EXER_KEY, JSON.stringify(state.customExercises));
  localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(state.bodyweightEntries));
  localStorage.setItem(HEADLINE_KEY, state.headline);
  localStorage.setItem(MODE_KEY, state.mode);
  localStorage.setItem("gym-tracker-theme", state.theme);
  updateAchievements();
}

// Navigation & Screen View Controller
function switchView(viewId) {
  triggerHaptic(5);
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// View Initializers and Rendering
function renderMuscleTabs() {
  const container = document.getElementById("muscleTabs");
  if (!container) return;

  container.innerHTML = "";

  // Get last workout date for each muscle
  const lastDates = {};
  state.entries.forEach(e => {
    if (e.exercise === "__muscle_complete__") return;
    if (!lastDates[e.muscle] || new Date(e.date) > new Date(lastDates[e.muscle])) {
      lastDates[e.muscle] = e.date;
    }
  });

  MUSCLES.forEach(m => {
    const tab = document.createElement("button");
    tab.className = "muscle-tab";
    tab.dataset.muscle = m;

    // Apply dynamic muscle fatigue rings based on last log date differences
    const d = lastDates[m];
    let fatigueClass = "cold"; // Cold by default if never trained
    if (d) {
      const lastTime = new Date(d).getTime();
      const todayTime = new Date().getTime();
      const diffDays = (todayTime - lastTime) / (1000 * 60 * 60 * 24);
      if (diffDays < 1) {
        fatigueClass = "fatigued";
      } else if (diffDays <= 4) {
        fatigueClass = "ready";
      } else {
        fatigueClass = "cold";
      }
    }
    tab.classList.add(fatigueClass);

    const name = document.createElement("span");
    name.className = "muscle-name";
    name.textContent = m;

    const last = document.createElement("span");
    last.className = "muscle-last";
    last.textContent = d ? `Last: ${formatDate(d)}` : "Last: –";

    tab.appendChild(name);
    tab.appendChild(last);

    tab.addEventListener("click", () => {
      state.selectedMuscle = m;
      document.querySelectorAll(".muscle-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      initRecapView();
    });

    container.appendChild(tab);
  });
}

function updateMuscleLastTrainedUI() {
  renderMuscleTabs();
}

function initRecapView() {
  const label = document.getElementById("overviewMuscleLabel");
  if (label) label.textContent = `Muscle battlefield: ${state.selectedMuscle}`;

  const container = document.getElementById("overviewList");
  if (!container) return;

  container.innerHTML = "";

  // Find all exercises logged for this muscle
  const allLogs = state.entries.filter(e => e.muscle === state.selectedMuscle && e.exercise !== "__muscle_complete__");
  const uniqueLoggedNames = Array.from(new Set(allLogs.map(l => l.exercise)));

  if (uniqueLoggedNames.length === 0) {
    container.innerHTML = `
      <div class="small-text" style="text-align:center;padding:20px 0;color:var(--text-muted);">
        ⚔️ No workouts logged on this battlefield yet. Let's start attacking!
      </div>`;
  } else {
    // Show cards for each logged exercise showing short recap
    uniqueLoggedNames.forEach(name => {
      const logs = allLogs.filter(l => normalizeName(l.exercise) === normalizeName(name));
      const latest = logs[logs.length - 1];

      const item = document.createElement("div");
      item.className = "overview-item";

      const header = document.createElement("div");
      header.className = "overview-header";

      const title = document.createElement("span");
      title.className = "overview-title";
      title.textContent = name;

      const logBtn = document.createElement("button");
      logBtn.className = "btn btn-cyan btn-sm btn-rect";
      logBtn.innerHTML = "🏋️ Log";
      logBtn.addEventListener("click", () => {
        initWorkoutLoggingView(name);
      });

      header.appendChild(title);
      header.appendChild(logBtn);

      const meta = document.createElement("div");
      meta.className = "overview-meta";
      meta.textContent = `Last Session: ${formatDate(latest.date)} (${latest.type})`;

      const setsDesc = document.createElement("div");
      setsDesc.className = "overview-sets";

      if (latest.type === "cardio") {
        const totalDist = latest.sets.reduce((sum, s) => sum + (s.distance || 0), 0);
        const totalTime = latest.sets.reduce((sum, s) => sum + (s.time || 0), 0);
        setsDesc.textContent = `Completed ${latest.sets.length} set(s) • Total Distance: ${totalDist} km • Time: ${totalTime} mins`;
      } else if (latest.type === "bodyweight") {
        const totalReps = latest.sets.reduce((sum, s) => sum + (s.reps || 0), 0);
        const repsString = latest.sets.map(s => s.reps).join("-");
        setsDesc.textContent = `Completed ${latest.sets.length} set(s) • Reps: [${repsString}] • Total: ${totalReps} reps`;
      } else {
        const vol = latest.totalVolume;
        const setStrings = latest.sets.map(s => `${s.weight}kgx${s.reps}`).join(", ");
        setsDesc.textContent = `Sets: [${setStrings}] • Volume: ${vol} kg`;
      }

      item.appendChild(header);
      item.appendChild(meta);
      item.appendChild(setsDesc);

      container.appendChild(item);
    });
  }

  switchView("view-overview");
}

function initWorkoutLoggingView(preselectedExerciseName = null) {
  const label = document.getElementById("currentMuscleLabel");
  if (label) label.textContent = `${state.selectedMuscle} Battlefield`;

  // Pre-fill session date with today's local date
  const dateInput = document.getElementById("sessionDate");
  if (dateInput) {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    dateInput.value = localToday.toISOString().split("T")[0];
  }

  // Clear new exercise fields
  const newExInput = document.getElementById("newExerciseInput");
  const confirmBtn = document.getElementById("btnConfirmAddExercise");
  if (newExInput) newExInput.style.display = "none";
  if (confirmBtn) confirmBtn.style.display = "none";

  // Rebuild exercises selector
  rebuildExerciseSelect(preselectedExerciseName);
  
  switchView("view-workout");
}

function rebuildExerciseSelect(preselectedName = null) {
  const select = document.getElementById("exerciseSelect");
  if (!select) return;

  select.innerHTML = "";
  const exercises = getAllExercisesForMuscle(state.selectedMuscle);

  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.name;
    opt.textContent = `${ex.name} [${ex.type}]`;
    select.appendChild(opt);
  });

  if (preselectedName) {
    select.value = preselectedName;
  } else if (exercises.length > 0) {
    select.selectedIndex = 0;
  }

  handleExerciseChange();
}

function handleExerciseChange() {
  const select = document.getElementById("exerciseSelect");
  if (!select || !select.value) return;

  state.selectedExercise = select.value;

  const exercises = getAllExercisesForMuscle(state.selectedMuscle);
  const currentMeta = exercises.find(ex => normalizeName(ex.name) === normalizeName(state.selectedExercise));
  
  if (!currentMeta) return;

  // Set the type dropdown in Step 3 automatically
  const typeSelect = document.getElementById("exerciseTypeSelect");
  if (typeSelect) {
    typeSelect.value = currentMeta.type;
  }

  updateLoggingInterface(currentMeta.type);
}

function updateLoggingInterface(type) {
  // Update type description hint
  const hint = document.getElementById("exerciseTypeHint");
  if (hint) {
    if (type === "cardio") {
      hint.textContent = "⚡ Cardio session. Track distance (km) and time (minutes).";
    } else if (type === "bodyweight") {
      hint.textContent = "🤸 Bodyweight session. Track number of reps per set.";
    } else {
      hint.textContent = "🏋️ Weighted session. Track weights (kg) and reps per set.";
    }
  }

  const volumeLabel = document.getElementById("volumeStatLabel");
  if (volumeLabel) {
    volumeLabel.textContent = type === "cardio" ? "Total Time" : (type === "bodyweight" ? "Total Reps" : "Total Volume");
  }

  // Pre-fill sets based on history and training mode
  buildSuggestedSets(type);

  // Update exercise recap / stats (1RM, volume, charts)
  refreshExerciseStats();
}

function buildSuggestedSets(type) {
  const listContainer = document.getElementById("setsList");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  // 1. Fetch last session entries for this specific exercise
  const logs = state.entries.filter(e => 
    e.muscle === state.selectedMuscle && 
    normalizeName(e.exercise) === normalizeName(state.selectedExercise)
  );

  let sourceSets = [];
  let isFromHistory = false;

  if (logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    // Dynamic set type conversion: Convert sets if historical type differs from requested type
    sourceSets = (lastLog.sets || []).map(s => {
      const converted = { ...s };
      if (type === "cardio") {
        converted.distance = Number(s.distance !== undefined ? s.distance : (s.km !== undefined ? s.km : 1.0)) || 1.0;
        converted.time = Number(s.time !== undefined ? s.time : (s.reps || 10)) || 10;
        delete converted.weight;
        delete converted.reps;
      } else if (type === "bodyweight") {
        converted.reps = Number(s.reps !== undefined ? s.reps : (s.time || 10)) || 10;
        delete converted.weight;
        delete converted.distance;
        delete converted.time;
      } else { // weighted
        converted.weight = Number(s.weight !== undefined ? s.weight : 10) || 10;
        converted.reps = Number(s.reps !== undefined ? s.reps : (s.time || 10)) || 10;
        delete converted.distance;
        delete converted.time;
      }
      return converted;
    });
    isFromHistory = true;
  } else {
    // No history, build default empty sets
    sourceSets = defaultSetsByType(type);
  }

  // 2. Adjust target values based on selected training Mode
  const mode = state.mode;
  let setsToRender = [];

  sourceSets.forEach(set => {
    let newSet = { ...set };
    
    if (type === "weighted") {
      if (mode === "easy") {
        newSet.weight = Math.max(0, Math.round((set.weight * 0.9) * 10) / 10);
        newSet.reps = Math.max(1, set.reps - 2);
      } else if (mode === "push") {
        newSet.weight = set.weight + 2.5;
      }
    } else if (type === "bodyweight") {
      if (mode === "easy") {
        newSet.reps = Math.max(1, Math.round(set.reps * 0.8));
      } else if (mode === "push") {
        newSet.reps = set.reps + 2;
      }
    } else if (type === "cardio") {
      if (mode === "easy") {
        newSet.distance = Math.max(0.1, Math.round((set.distance * 0.8) * 100) / 100);
        newSet.time = Math.max(1, Math.round(set.time * 0.8));
      } else if (mode === "push") {
        newSet.distance = Math.round((set.distance * 1.1) * 100) / 100;
        newSet.time = Math.round(set.time * 1.1);
      }
    }
    setsToRender.push(newSet);
  });

  // If push day and no exercises completed, append an extra set to promote progressive overload
  if (mode === "push" && isFromHistory && setsToRender.length < 5) {
    const lastSet = setsToRender[setsToRender.length - 1];
    setsToRender.push({ ...lastSet });
  }

  // 3. Render Set Input Elements
  setsToRender.forEach((set, index) => {
    appendSetRow(type, set, index + 1);
  });

  // 4. Update helpers description
  const helperText = document.getElementById("setsHelperText");
  if (helperText) {
    if (isFromHistory) {
      if (mode === "easy") {
        helperText.textContent = "🔋 Light session targets pre-filled (-10% weight/reps).";
      } else if (mode === "push") {
        helperText.textContent = "🔥 Push session! Target pre-filled with progressive overload.";
      } else {
        helperText.textContent = "📋 Pre-filled from your last successful session.";
      }
    } else {
      helperText.textContent = "💪 No historical data found. Default targets suggested.";
    }
  }
}

function appendSetRow(type, values = {}, setNum) {
  const container = document.getElementById("setsList");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "set-row";
  row.dataset.setNum = setNum;

  // 1. Tactile check-off button
  const checkBtn = document.createElement("div");
  checkBtn.className = "set-checkbox";
  checkBtn.innerHTML = "✔";
  checkBtn.addEventListener("click", (e) => {
    triggerHaptic(10);
    const isChecked = checkBtn.classList.toggle("checked");
    row.classList.toggle("checked-row", isChecked);
    
    // Play Web Audio synth beep
    triggerSetCompleteBeep();
    
    // Spawn CSS spark particle explosion
    triggerExplosionAnimation(e.clientX || (window.innerWidth / 2), e.clientY || (window.innerHeight / 2));
  });
  row.appendChild(checkBtn);

  // Set counter badge
  const numDiv = document.createElement("div");
  numDiv.style.flex = "0 0 45px";
  const numLabel = document.createElement("label");
  numLabel.textContent = "Set";
  const numInput = document.createElement("input");
  numInput.type = "text";
  numInput.value = `#${setNum}`;
  numInput.disabled = true;
  numInput.style.textAlign = "center";
  numInput.style.fontWeight = "700";
  numInput.style.color = "var(--accent)";
  numInput.style.background = "rgba(255, 140, 26, 0.05)";
  numInput.style.borderColor = "rgba(255, 140, 26, 0.15)";
  numDiv.appendChild(numLabel);
  numDiv.appendChild(numInput);
  row.appendChild(numDiv);

  if (type === "cardio") {
    // Distance Input
    const distDiv = document.createElement("div");
    const distLabel = document.createElement("label");
    distLabel.textContent = "Dist (km)";
    const distInput = document.createElement("input");
    distInput.type = "number";
    distInput.className = "set-distance";
    distInput.step = "0.01";
    distInput.min = "0";
    distInput.value = values.distance !== undefined ? values.distance : "";
    distInput.placeholder = "0.00";
    distDiv.appendChild(distLabel);
    distDiv.appendChild(distInput);
    row.appendChild(distDiv);

    // Time Input
    const timeDiv = document.createElement("div");
    const timeLabel = document.createElement("label");
    timeLabel.textContent = "Time (min)";
    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.className = "set-time";
    timeInput.step = "1";
    timeInput.min = "0";
    timeInput.value = values.time !== undefined ? values.time : "";
    timeInput.placeholder = "0";
    timeDiv.appendChild(timeLabel);
    timeDiv.appendChild(timeInput);
    row.appendChild(timeDiv);
  } else if (type === "bodyweight") {
    // Reps Input
    const repsDiv = document.createElement("div");
    const repsLabel = document.createElement("label");
    repsLabel.textContent = "Reps";
    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.className = "set-reps";
    repsInput.step = "1";
    repsInput.min = "0";
    repsInput.value = values.reps !== undefined ? values.reps : "";
    repsInput.placeholder = "0";
    repsDiv.appendChild(repsLabel);
    repsDiv.appendChild(repsInput);
    row.appendChild(repsDiv);
  } else {
    // Weighted
    // Weight Input
    const wDiv = document.createElement("div");
    const wLabel = document.createElement("label");
    wLabel.textContent = "Weight (kg)";
    const wInput = document.createElement("input");
    wInput.type = "number";
    wInput.className = "set-weight";
    wInput.step = "0.5";
    wInput.min = "0";
    wInput.value = values.weight !== undefined ? values.weight : "";
    wInput.placeholder = "0.0";
    wDiv.appendChild(wLabel);
    wDiv.appendChild(wInput);
    row.appendChild(wDiv);

    // Reps Input
    const repsDiv = document.createElement("div");
    const repsLabel = document.createElement("label");
    repsLabel.textContent = "Reps";
    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.className = "set-reps";
    repsInput.step = "1";
    repsInput.min = "0";
    repsInput.value = values.reps !== undefined ? values.reps : "";
    repsInput.placeholder = "0";
    repsDiv.appendChild(repsLabel);
    repsDiv.appendChild(repsInput);
    row.appendChild(repsDiv);
  }

  // Delete Action Button
  const delBtn = document.createElement("button");
  delBtn.className = "set-delete-btn";
  delBtn.innerHTML = "🗑";
  delBtn.type = "button";
  delBtn.addEventListener("click", () => {
    triggerHaptic(8);
    row.remove();
    reindexSets();
  });
  row.appendChild(delBtn);

  container.appendChild(row);
}

function reindexSets() {
  const rows = document.querySelectorAll("#setsList .set-row");
  rows.forEach((row, i) => {
    const numInput = row.querySelector("input[disabled]");
    if (numInput) {
      numInput.value = `#${i + 1}`;
    }
    row.dataset.setNum = i + 1;
  });
}

function addSet() {
  const typeSelect = document.getElementById("exerciseTypeSelect");
  if (!typeSelect) return;
  
  const type = typeSelect.value;
  const currentRows = document.querySelectorAll("#setsList .set-row");
  
  let defaultValues = {};
  if (currentRows.length > 0) {
    // Clone value from last row as standard starting target
    const lastRow = currentRows[currentRows.length - 1];
    if (type === "cardio") {
      defaultValues.distance = Number(lastRow.querySelector(".set-distance")?.value) || 0;
      defaultValues.time = Number(lastRow.querySelector(".set-time")?.value) || 0;
    } else if (type === "bodyweight") {
      defaultValues.reps = Number(lastRow.querySelector(".set-reps")?.value) || 0;
    } else {
      defaultValues.weight = Number(lastRow.querySelector(".set-weight")?.value) || 0;
      defaultValues.reps = Number(lastRow.querySelector(".set-reps")?.value) || 0;
    }
  } else {
    const defaults = defaultSetsByType(type);
    defaultValues = defaults[0];
  }

  triggerHaptic(10);
  appendSetRow(type, defaultValues, currentRows.length + 1);
}

function refreshExerciseStats() {
  // Fetch historical entries for this exercise
  const logs = state.entries.filter(e => 
    e.muscle === state.selectedMuscle && 
    normalizeName(e.exercise) === normalizeName(state.selectedExercise)
  );

  const best1RMEl = document.getElementById("statBest1RM");
  const lastTrainedEl = document.getElementById("statLastTrained");
  const volumeEl = document.getElementById("statTotalVolume");
  const current1RMEl = document.getElementById("current1RM");
  const lastTrainedExercise = document.getElementById("lastTrainedExercise");
  const lastSessionSummary = document.getElementById("lastSessionSummary");
  const suggestionSummary = document.getElementById("suggestionSummary");

  // Determine current metadata
  const exercises = getAllExercisesForMuscle(state.selectedMuscle);
  const currentMeta = exercises.find(ex => normalizeName(ex.name) === normalizeName(state.selectedExercise));
  const type = currentMeta ? currentMeta.type : "weighted";

  // Hide 1RM calculation panel if not weighted exercise type
  const current1RMPanel = document.getElementById("current1RMPanel");
  if (current1RMPanel) {
    if (type === "weighted") {
      current1RMPanel.classList.remove("focus-hidden");
    } else {
      current1RMPanel.classList.add("focus-hidden");
    }
  }

  if (logs.length === 0) {
    // Reset stats views
    if (best1RMEl) best1RMEl.textContent = "-";
    if (lastTrainedEl) lastTrainedEl.textContent = "Never";
    if (volumeEl) volumeEl.textContent = "0";
    if (current1RMEl) current1RMEl.textContent = "-";
    if (lastTrainedExercise) lastTrainedExercise.textContent = "Never trained yet.";
    if (lastSessionSummary) lastSessionSummary.textContent = "";
    if (suggestionSummary) suggestionSummary.textContent = "Complete your first log to trigger AI guidance!";
    
    // Hide chart card if empty
    const chartCard = document.getElementById("cardChart");
    if (chartCard) chartCard.style.display = "none";
    
    renderHistoryList([]);
    return;
  }

  // Active entries present, build recap summaries
  const latestLog = logs[logs.length - 1];
  
  if (lastTrainedEl) lastTrainedEl.textContent = formatDate(latestLog.date);
  if (lastTrainedExercise) lastTrainedExercise.textContent = formatDate(latestLog.date);

  let max1RM = 0;
  let totalSummedVolume = 0;

  logs.forEach(log => {
    if (log.best1RM > max1RM) max1RM = log.best1RM;
    if (type === "cardio") {
      totalSummedVolume += log.totalTime; // volume is total minutes
    } else if (type === "bodyweight") {
      totalSummedVolume += log.totalVolume; // volume is total reps
    } else {
      totalSummedVolume += log.totalVolume;
    }
  });

  if (best1RMEl) {
    best1RMEl.textContent = type === "weighted" ? `${max1RM} kg` : "-";
  }

  if (volumeEl) {
    volumeEl.textContent = type === "cardio" ? `${latestLog.totalTime} min` : (type === "bodyweight" ? `${latestLog.totalVolume} reps` : `${latestLog.totalVolume} kg`);
  }

  if (current1RMEl) {
    current1RMEl.textContent = type === "weighted" ? `${latestLog.best1RM} kg` : "-";
  }

  // Build visual workout summaries in text blocks
  if (lastSessionSummary) {
    if (type === "cardio") {
      const distance = latestLog.sets.reduce((s, row) => s + (row.distance || 0), 0);
      const time = latestLog.sets.reduce((s, row) => s + (row.time || 0), 0);
      lastSessionSummary.textContent = `Completed: ${distance} km in ${time} mins total.`;
    } else if (type === "bodyweight") {
      const repsString = latestLog.sets.map(s => s.reps).join("-");
      lastSessionSummary.textContent = `Sets: [${repsString}] (${latestLog.totalVolume} reps)`;
    } else {
      const setStrings = latestLog.sets.map(s => `${s.weight}kgx${s.reps}`).join(", ");
      lastSessionSummary.textContent = `Last: [${setStrings}] • Vol: ${latestLog.totalVolume}kg`;
    }
  }

  // Suggest dynamic overload guidance
  if (suggestionSummary) {
    if (type === "cardio") {
      suggestionSummary.textContent = "🎯 Run longer! Aim for +5% duration or distance today.";
    } else if (type === "bodyweight") {
      const lastReps = latestLog.sets[0]?.reps || 8;
      suggestionSummary.textContent = `🎯 Aim for [${lastReps + 1}-${lastReps}-${lastReps}] reps to beat your past performance!`;
    } else {
      const topSet = latestLog.sets.sort((a,b) => b.weight - a.weight)[0];
      const nextTargetWeight = topSet.weight + 2.5;
      suggestionSummary.textContent = `🎯 Suggested overloading: Try ${nextTargetWeight}kg for ${Math.max(5, topSet.reps - 2)} reps!`;
    }
  }

  // Render analytics trends graph
  const chartCard = document.getElementById("cardChart");
  if (chartCard) {
    if (!state.focusMode) {
      chartCard.style.display = "block";
      buildProgressChart(logs, type);
    } else {
      chartCard.style.display = "none";
    }
  }

  renderHistoryList(logs);
}

function renderHistoryList(logs) {
  const container = document.getElementById("historyList");
  if (!container) return;

  container.innerHTML = "";

  if (logs.length === 0) {
    container.innerHTML = `<div class="small-text" style="color:var(--text-muted);">No entries yet. Add your workout below!</div>`;
    return;
  }

  // Reverse list to show newest on top
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedLogs.forEach(log => {
    const item = document.createElement("div");
    item.className = "history-item";

    const header = document.createElement("div");
    header.className = "history-header";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-title";
    dateSpan.textContent = formatDate(log.date);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const delBtn = document.createElement("button");
    delBtn.innerHTML = "🗑";
    delBtn.title = "Delete this session entry";
    delBtn.addEventListener("click", () => {
      deleteSessionEntry(log.date, log.exercise);
    });

    actions.appendChild(delBtn);
    header.appendChild(dateSpan);
    header.appendChild(actions);

    const details = document.createElement("div");
    details.className = "history-sets";

    if (log.type === "cardio") {
      const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.distance}km in ${s.time}m`).join("<br>");
      details.innerHTML = setStrings;
    } else if (log.type === "bodyweight") {
      const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.reps} reps`).join("<br>");
      details.innerHTML = setStrings;
    } else {
      const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.weight}kg x ${s.reps} reps (1RM ~${calculate1RM(s.weight, s.reps)}kg)`).join("<br>");
      details.innerHTML = setStrings;
    }

    item.appendChild(header);
    item.appendChild(details);
    container.appendChild(item);
  });
}

// Delete Log Entries
function deleteSessionEntry(dateStr, exerciseName) {
  if (!confirm(`Permanently delete this workout entry for ${exerciseName} on ${formatDate(dateStr)}?`)) {
    return;
  }

  triggerHaptic(20);

  state.entries = state.entries.filter(e => 
    !(e.date === dateStr && normalizeName(e.exercise) === normalizeName(exerciseName))
  );

  saveAllData();
  refreshExerciseStats();
  updateMuscleLastTrainedUI();
}

// Progressive Overload Chart Render
function buildProgressChart(logs, type) {
  const canvas = document.getElementById("progressChart");
  if (!canvas) return;

  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  // Keep latest 8 sessions to avoid crowded visual graphs on mobile
  const subset = logs.slice(-8);

  const labels = subset.map(l => {
    const d = new Date(l.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const dataset1 = []; // Top Weight or Max reps or Distance
  const dataset2 = []; // 1RM or Time

  subset.forEach(log => {
    if (type === "cardio") {
      const totalDist = log.sets.reduce((sum, s) => sum + (s.distance || 0), 0);
      const totalTime = log.sets.reduce((sum, s) => sum + (s.time || 0), 0);
      dataset1.push(totalDist);
      dataset2.push(totalTime);
    } else if (type === "bodyweight") {
      const maxReps = Math.max(...log.sets.map(s => s.reps || 0));
      dataset1.push(maxReps);
    } else {
      const maxWeight = Math.max(...log.sets.map(s => s.weight || 0));
      dataset1.push(maxWeight);
      dataset2.push(log.best1RM);
    }
  });

  const datasets = [];

  // Create canvas neon gradients
  const gradientOrange = ctx.createLinearGradient(0, 0, 0, 200);
  gradientOrange.addColorStop(0, "rgba(255, 140, 26, 0.4)");
  gradientOrange.addColorStop(1, "rgba(255, 140, 26, 0.0)");

  const gradientTeal = ctx.createLinearGradient(0, 0, 0, 200);
  gradientTeal.addColorStop(0, "rgba(0, 229, 255, 0.4)");
  gradientTeal.addColorStop(1, "rgba(0, 229, 255, 0.0)");

  if (type === "cardio") {
    datasets.push({
      label: "Distance (km)",
      data: dataset1,
      borderColor: "#ff8c1a",
      backgroundColor: gradientOrange,
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: "#ff8c1a",
      pointBorderColor: "#ffffff",
      pointHoverRadius: 6
    });
    datasets.push({
      label: "Time (min)",
      data: dataset2,
      borderColor: "#00e5ff",
      backgroundColor: gradientTeal,
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: "#00e5ff",
      pointBorderColor: "#ffffff",
      pointHoverRadius: 6
    });
  } else if (type === "bodyweight") {
    datasets.push({
      label: "Max Reps",
      data: dataset1,
      borderColor: "#ff8c1a",
      backgroundColor: gradientOrange,
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: "#ff8c1a",
      pointBorderColor: "#ffffff",
      pointHoverRadius: 6
    });
  } else {
    datasets.push({
      label: "Top Weight (kg)",
      data: dataset1,
      borderColor: "#ff8c1a",
      backgroundColor: gradientOrange,
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: "#ff8c1a",
      pointBorderColor: "#ffffff",
      pointHoverRadius: 6
    });
    datasets.push({
      label: "Estimated 1RM (kg)",
      data: dataset2,
      borderColor: "#00e5ff",
      backgroundColor: gradientTeal,
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: "#00e5ff",
      pointBorderColor: "#ffffff",
      pointHoverRadius: 6
    });
  }

  state.chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#8d94c0",
            font: { family: "Inter", weight: "600", size: 10 }
          }
        },
        tooltip: {
          backgroundColor: "rgba(10, 12, 34, 0.95)",
          titleColor: "#ffffff",
          bodyColor: "#f5f6fa",
          borderColor: "rgba(255, 140, 26, 0.3)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: "Inter" }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.03)" },
          ticks: { color: "#8d94c0", font: { size: 9 } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.03)" },
          ticks: { color: "#8d94c0", font: { size: 9 } }
        }
      }
    }
  });
}

// Workout Log Savings
function saveWorkoutEntry() {
  const dateInput = document.getElementById("sessionDate");
  const saveError = document.getElementById("saveError");

  if (saveError) {
    saveError.style.display = "none";
    saveError.textContent = "";
  }

  if (!dateInput || !dateInput.value) {
    showSaveError("Date selection is required to track this attack.");
    return;
  }

  const dateStr = dateInput.value;
  const typeSelect = document.getElementById("exerciseTypeSelect");
  const type = typeSelect ? typeSelect.value : "weighted";

  // Parse set inputs
  const rows = document.querySelectorAll("#setsList .set-row");
  const parsedSets = [];

  let validationFailed = false;

  rows.forEach(row => {
    if (type === "cardio") {
      const distanceInput = row.querySelector(".set-distance");
      const timeInput = row.querySelector(".set-time");
      const dist = Number(distanceInput ? distanceInput.value : 0) || 0;
      const mins = Number(timeInput ? timeInput.value : 0) || 0;

      if (dist <= 0 && mins <= 0) {
        validationFailed = true;
        distanceInput.focus();
      } else {
        parsedSets.push({ distance: dist, time: mins });
      }
    } else if (type === "bodyweight") {
      const repsInput = row.querySelector(".set-reps");
      const reps = Number(repsInput ? repsInput.value : 0) || 0;

      if (reps <= 0) {
        validationFailed = true;
        repsInput.focus();
      } else {
        parsedSets.push({ reps });
      }
    } else {
      const weightInput = row.querySelector(".set-weight");
      const repsInput = row.querySelector(".set-reps");
      const weight = Number(weightInput ? weightInput.value : 0) || 0;
      const reps = Number(repsInput ? repsInput.value : 0) || 0;

      if (weight < 0 || reps <= 0) {
        validationFailed = true;
        weightInput.focus();
      } else {
        parsedSets.push({ weight, reps });
      }
    }
  });

  if (validationFailed) {
    showSaveError("Please complete all sets values (non-zero positive digits) or remove unnecessary empty sets.");
    return;
  }

  if (parsedSets.length === 0) {
    showSaveError("Please log at least one target set row for this exercise session.");
    return;
  }

  // Trigger positive success feedback
  triggerHaptic([30, 20, 30]);

  const computed = computeFromSets(parsedSets, type);
  const newEntry = {
    date: dateStr,
    muscle: state.selectedMuscle,
    exercise: state.selectedExercise,
    type: type,
    sets: parsedSets,
    totalVolume: computed.totalVolume,
    topWeight: computed.topWeight,
    best1RM: computed.best1RM,
    totalDistance: computed.totalDistance,
    totalTime: computed.totalTime
  };

  // Remove existing duplicate entry if any matching date and exercise
  state.entries = state.entries.filter(e => 
    !(e.date === dateStr && 
      e.muscle === state.selectedMuscle && 
      normalizeName(e.exercise) === normalizeName(state.selectedExercise))
  );

  state.entries.push(newEntry);
  state.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  saveAllData();
  
  // Show standard visual success banner animation on saving
  const btnSave = document.getElementById("btnSaveWorkout");
  if (btnSave) {
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = "🎉 ATTACK SAVED!";
    btnSave.className = "btn btn-success";
    btnSave.disabled = true;
    setTimeout(() => {
      btnSave.innerHTML = originalText;
      btnSave.className = "btn btn-primary";
      btnSave.disabled = false;
    }, 1500);
  }

  refreshExerciseStats();
  updateMuscleLastTrainedUI();
}

function showSaveError(msg) {
  triggerHaptic([50, 50]);
  const err = document.getElementById("saveError");
  if (err) {
    err.textContent = msg;
    err.style.display = "block";
  }
}

// Complete Workout for This Muscle
function completeWorkout() {
  triggerHaptic([40, 30, 40, 30, 50]);
  
  // Calculate total workout metrics for the summary screen
  const today = new Date().toISOString().split("T")[0];
  const activeEntries = state.entries.filter(e => e.muscle === state.selectedMuscle && e.date === today && e.exercise !== "__muscle_complete__");

  if (activeEntries.length === 0) {
    // Just return to muscles view if no logs were saved today
    switchView("view-muscles");
    return;
  }

  // Create a special complete marker in state logs
  const completeMarker = {
    date: today,
    muscle: state.selectedMuscle,
    exercise: "__muscle_complete__",
    type: "meta",
    sets: []
  };

  state.entries = state.entries.filter(e => 
    !(e.date === today && e.muscle === state.selectedMuscle && e.exercise === "__muscle_complete__")
  );

  state.entries.push(completeMarker);
  saveAllData();
  updateMuscleLastTrainedUI();

  // Render a gorgeous overlay complete screen!
  renderWorkoutSummaryScreen(activeEntries);
}

function renderWorkoutSummaryScreen(activeEntries) {
  // Let's dynamically inject a beautiful summary view
  let summaryView = document.getElementById("view-summary");
  if (!summaryView) {
    summaryView = document.createElement("div");
    summaryView.id = "view-summary";
    summaryView.className = "view card";
    document.querySelector(".app").appendChild(summaryView);
  }

  let totalVolume = 0;
  let totalSets = 0;
  let summaryHTML = "";

  activeEntries.forEach(entry => {
    totalSets += entry.sets.length;
    if (entry.type === "weighted") {
      totalVolume += entry.totalVolume;
    }
  });

  const quotes = [
    "Overload is the law of growth. Attack completed successfully!",
    "No shortcuts. No mercy. The muscle has been destroyed and rebuilt.",
    "Adrenaline is the catalyst. You fought, you conquered, you grew.",
    "Champions don't count the days, they make the days count. Outstanding session!"
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  summaryHTML = `
    <div class="summary-screen">
      <div class="summary-icon">🔥</div>
      <div class="summary-title">Battlefield Conquered!</div>
      <div class="summary-quote">"${randomQuote}"</div>
      
      <div class="card-header" style="justify-content:center;margin-top:16px;">
        <span class="chip" style="background:rgba(0, 230, 118, 0.1);color:var(--success);border-color:rgba(0,230,118,0.25);">
          ${state.selectedMuscle} Conquered
        </span>
      </div>

      <div class="stats-row" style="margin:20px 0;">
        <div class="stat">
          <div class="stat-label">Exercises Done</div>
          <div class="stat-value info">${activeEntries.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Sets Hit</div>
          <div class="stat-value success">${totalSets}</div>
        </div>
        ${totalVolume > 0 ? `
        <div class="stat">
          <div class="stat-label">Total Volume Lifted</div>
          <div class="stat-value" style="color:var(--accent);">${totalVolume} kg</div>
        </div>` : ""}
      </div>

      <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px;">
        <button id="btnDismissSummary" class="btn btn-primary" style="width:100%;">
          ⚔️ Head Back to Choose Battlefield
        </button>
      </div>
    </div>
  `;

  summaryView.innerHTML = summaryHTML;
  
  // Bind completion button dismissal
  const dismissBtn = summaryView.querySelector("#btnDismissSummary");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      switchView("view-muscles");
    });
  }

  switchView("view-summary");
}

// Add Custom Exercises
function showAddExerciseUI() {
  triggerHaptic(5);
  const inputField = document.getElementById("newExerciseInput");
  const confirmBtn = document.getElementById("btnConfirmAddExercise");
  
  if (inputField && confirmBtn) {
    const isHidden = inputField.style.display === "none";
    inputField.style.display = isHidden ? "block" : "none";
    confirmBtn.style.display = isHidden ? "block" : "none";
    if (isHidden) inputField.focus();
  }
}

function confirmAddExercise() {
  const input = document.getElementById("newExerciseInput");
  if (!input) return;

  const rawName = input.value.trim();
  if (!rawName) return;

  const currentTypeSelect = document.getElementById("exerciseTypeSelect");
  const type = currentTypeSelect ? currentTypeSelect.value : "weighted";

  const exercises = getAllExercisesForMuscle(state.selectedMuscle);
  const match = exercises.find(ex => normalizeName(ex.name) === normalizeName(rawName));

  if (match) {
    alert(`The exercise "${rawName}" already exists on this battlefield.`);
    return;
  }

  triggerHaptic([20, 20]);

  // Append new custom exercises
  if (!state.customExercises[state.selectedMuscle]) {
    state.customExercises[state.selectedMuscle] = [];
  }

  state.customExercises[state.selectedMuscle].push({
    name: rawName,
    type: type
  });

  saveAllData();
  
  input.value = "";
  input.style.display = "none";
  document.getElementById("btnConfirmAddExercise").style.display = "none";

  rebuildExerciseSelect(rawName);
}

function deleteCustomExercise() {
  const select = document.getElementById("exerciseSelect");
  if (!select || !select.value) return;

  const selectedName = select.value;
  
  // Check if it is a default or custom exercise
  const defaults = DEFAULT_EXERCISES[state.selectedMuscle] || [];
  const isDefault = defaults.some(ex => normalizeName(ex.name) === normalizeName(selectedName));

  if (isDefault) {
    alert("Standard exercises of the battlefield cannot be deleted. Custom exercises only!");
    return;
  }

  if (!confirm(`Permanently delete the custom exercise "${selectedName}" from your database? This will NOT delete past logs.`)) {
    return;
  }

  triggerHaptic(20);

  if (state.customExercises[state.selectedMuscle]) {
    state.customExercises[state.selectedMuscle] = state.customExercises[state.selectedMuscle].filter(ex => 
      normalizeName(ex.name) !== normalizeName(selectedName)
    );
  }

  saveAllData();
  rebuildExerciseSelect();
}

// Copy Last Sets Quick Actions
function copyLastWorkoutSets() {
  const logs = state.entries.filter(e => 
    e.muscle === state.selectedMuscle && 
    normalizeName(e.exercise) === normalizeName(state.selectedExercise)
  );

  if (logs.length === 0) {
    alert("No previous logs exist for this exercise. Pre-filling with default configurations!");
    return;
  }

  triggerHaptic(15);
  const sourceSets = logs[logs.length - 1].sets || [];
  const typeSelect = document.getElementById("exerciseTypeSelect");
  const type = typeSelect ? typeSelect.value : "weighted";

  const listContainer = document.getElementById("setsList");
  if (listContainer) listContainer.innerHTML = "";

  sourceSets.forEach((set, index) => {
    appendSetRow(type, set, index + 1);
  });

  const helperText = document.getElementById("setsHelperText");
  if (helperText) {
    helperText.textContent = "📋 Successfully copied exact sets from the previous session.";
  }
}

// Focus Mode Toggle (distraction-free logger)
function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  triggerHaptic(5);

  const focusBtn = document.getElementById("btnFocusMode");
  const hCard = document.getElementById("cardHistory");
  const cCard = document.getElementById("cardChart");

  if (focusBtn) {
    focusBtn.innerHTML = state.focusMode ? "🎯 Focus: On" : "🎯 Focus: Off";
    focusBtn.className = state.focusMode ? "btn btn-cyan btn-sm" : "btn btn-secondary btn-sm";
  }

  if (hCard) {
    if (state.focusMode) hCard.classList.add("focus-hidden");
    else hCard.classList.remove("focus-hidden");
  }

  if (cCard) {
    if (state.focusMode) cCard.classList.add("focus-hidden");
    else cCard.classList.remove("focus-hidden");
  }

  // Redraw progress graph if turning off focus mode
  if (!state.focusMode) {
    refreshExerciseStats();
  }
}

// Date-wise History View Manager
function initDateHistoryView() {
  const dateInput = document.getElementById("dateHistoryInput");
  if (dateInput) {
    // Defaults to today's local date
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    dateInput.value = localToday.toISOString().split("T")[0];
  }

  renderDatewiseHistory();
  switchView("view-date-history");
}

function renderDatewiseHistory() {
  const dateInput = document.getElementById("dateHistoryInput");
  const summary = document.getElementById("dateHistorySummary");
  const container = document.getElementById("dateHistoryList");

  if (!dateInput || !summary || !container) return;

  const targetDate = dateInput.value;
  container.innerHTML = "";

  if (!targetDate) {
    summary.textContent = "Please select a date to analyze history logs.";
    return;
  }

  const logs = state.entries.filter(e => e.date === targetDate);
  const completions = logs.filter(l => l.exercise === "__muscle_complete__");
  const activeWorkouts = logs.filter(l => l.exercise !== "__muscle_complete__");

  if (activeWorkouts.length === 0) {
    summary.textContent = `No workouts completed on ${formatDate(targetDate)}. Keep active!`;
    container.innerHTML = `
      <div class="small-text" style="text-align:center;padding:40px 0;color:var(--text-muted);">
        🏖️ Rest Day. No active logs discovered.
      </div>`;
    return;
  }

  // Update summary header
  const completedMuscles = Array.from(new Set(completions.map(c => c.muscle))).join(", ") || "None";
  summary.innerHTML = `Conquered: <strong>${activeWorkouts.length} exercises</strong> across <strong>${Array.from(new Set(activeWorkouts.map(w => w.muscle))).length} muscle battlefield(s)</strong>. Completion targets met: [${completedMuscles}].`;

  // Group workout logs by muscle groups
  const grouped = {};
  activeWorkouts.forEach(log => {
    if (!grouped[log.muscle]) grouped[log.muscle] = [];
    grouped[log.muscle].push(log);
  });

  for (const muscle in grouped) {
    const section = document.createElement("div");
    section.style.marginBottom = "14px";

    const label = document.createElement("label");
    label.textContent = muscle;
    label.style.color = "var(--accent)";
    label.style.fontWeight = "700";
    label.style.borderBottom = "1px solid rgba(255, 140, 26, 0.15)";
    label.style.paddingBottom = "4px";
    label.style.marginBottom = "8px";
    section.appendChild(label);

    grouped[muscle].forEach(log => {
      const item = document.createElement("div");
      item.className = "date-history-item";

      const header = document.createElement("div");
      header.className = "date-history-header";

      const title = document.createElement("span");
      title.className = "date-history-title";
      title.textContent = log.exercise;

      const typeBadge = document.createElement("span");
      typeBadge.className = "chip";
      typeBadge.style.fontSize = "0.6rem";
      typeBadge.style.padding = "2px 8px";
      typeBadge.textContent = log.type;

      header.appendChild(title);
      header.appendChild(typeBadge);

      const setsDiv = document.createElement("div");
      setsDiv.className = "date-history-sets";

      if (log.type === "cardio") {
        const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.distance} km in ${s.time} mins`).join("<br>");
        setsDiv.innerHTML = setStrings;
      } else if (log.type === "bodyweight") {
        const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.reps} reps`).join("<br>");
        setsDiv.innerHTML = setStrings;
      } else {
        const setStrings = log.sets.map((s, idx) => `Set ${idx + 1}: ${s.weight} kg x ${s.reps} reps`).join("<br>");
        setsDiv.innerHTML = setStrings;
      }

      item.appendChild(header);
      item.appendChild(setsDiv);
      section.appendChild(item);
    });

    container.appendChild(section);
  }
}

// Body Weight Analytics Screen Manager
function initBodyweightView() {
  const dateInput = document.getElementById("bodyweightDate");
  const weightInput = document.getElementById("bodyweightInput");
  const err = document.getElementById("bodyweightError");

  if (dateInput) {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    dateInput.value = localToday.toISOString().split("T")[0];
  }
  if (weightInput) weightInput.value = "";
  if (err) err.style.display = "none";

  renderBodyweightDashboard();
  switchView("view-bodyweight");
}

function renderBodyweightDashboard() {
  const latestEl = document.getElementById("bwLatest");
  const prevEl = document.getElementById("bwPrevious");
  const changeEl = document.getElementById("bwChange");
  const avgEl = document.getElementById("bwAverage");
  const listContainer = document.getElementById("bodyweightHistoryList");

  if (!latestEl || !prevEl || !changeEl || !avgEl || !listContainer) return;

  listContainer.innerHTML = "";

  if (state.bodyweightEntries.length === 0) {
    latestEl.textContent = "-";
    prevEl.textContent = "-";
    changeEl.textContent = "-";
    changeEl.style.color = "var(--text-main)";
    avgEl.textContent = "-";
    listContainer.innerHTML = `<div class="small-text" style="color:var(--text-muted);text-align:center;padding:20px 0;">No weight logs found. Create your target weight today!</div>`;
    return;
  }

  // 1. Render Metrics Dashboard
  const sorted = [...state.bodyweightEntries].sort((a,b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  latestEl.textContent = `${latest.weight} kg`;
  
  if (previous) {
    prevEl.textContent = `${previous.weight} kg`;
    const diff = Math.round((latest.weight - previous.weight) * 10) / 10;
    
    if (diff > 0) {
      changeEl.textContent = `+${diff} kg`;
      changeEl.style.color = "var(--danger)"; // dynamic weight gain indicator
    } else if (diff < 0) {
      changeEl.textContent = `${diff} kg`;
      changeEl.style.color = "var(--success)"; // weight loss indicator
    } else {
      changeEl.textContent = "0.0 kg";
      changeEl.style.color = "var(--text-main)";
    }
  } else {
    prevEl.textContent = "-";
    changeEl.textContent = "-";
    changeEl.style.color = "var(--text-main)";
  }

  // 7-entry moving average calculation
  const subsetForAvg = sorted.slice(-7);
  const sumAvg = subsetForAvg.reduce((sum, item) => sum + item.weight, 0);
  const avgVal = Math.round((sumAvg / subsetForAvg.length) * 100) / 100;
  avgEl.textContent = `${avgVal} kg`;

  // 2. Render Weights History Log
  const newestOnTop = [...state.bodyweightEntries].sort((a,b) => new Date(b.date) - new Date(a.date));

  newestOnTop.forEach(entry => {
    const item = document.createElement("div");
    item.className = "bodyweight-item";

    const header = document.createElement("div");
    header.className = "bodyweight-header";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-title";
    dateSpan.textContent = formatDate(entry.date);

    const weightValSpan = document.createElement("span");
    weightValSpan.style.fontWeight = "700";
    weightValSpan.style.color = "var(--cyan)";
    weightValSpan.textContent = `${entry.weight} kg`;

    const delBtn = document.createElement("button");
    delBtn.className = "set-delete-btn";
    delBtn.style.width = "28px";
    delBtn.style.height = "28px";
    delBtn.style.fontSize = "0.75rem";
    delBtn.innerHTML = "🗑";
    delBtn.addEventListener("click", () => {
      deleteBodyweightLog(entry.date);
    });

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.alignItems = "center";
    actions.style.gap = "12px";

    actions.appendChild(weightValSpan);
    actions.appendChild(delBtn);

    header.appendChild(dateSpan);
    header.appendChild(actions);
    item.appendChild(header);

    listContainer.appendChild(item);
  });
}

function saveBodyweightLog() {
  const dateInput = document.getElementById("bodyweightDate");
  const weightInput = document.getElementById("bodyweightInput");
  const err = document.getElementById("bodyweightError");

  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }

  if (!dateInput || !dateInput.value || !weightInput || !weightInput.value) {
    showBodyweightError("Both date and valid weight values are required.");
    return;
  }

  const dateStr = dateInput.value;
  const wt = Number(weightInput.value);

  if (wt <= 0) {
    showBodyweightError("Body weight must be a positive non-zero digit.");
    return;
  }

  triggerHaptic([30, 20]);

  // Remove existing entries on that date to prevent duplicates
  state.bodyweightEntries = state.bodyweightEntries.filter(b => b.date !== dateStr);

  state.bodyweightEntries.push({ date: dateStr, weight: wt });
  state.bodyweightEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

  saveAllData();
  
  if (weightInput) weightInput.value = "";
  
  renderBodyweightDashboard();
}

function deleteBodyweightLog(dateStr) {
  if (!confirm(`Permanently delete body weight logs for ${formatDate(dateStr)}?`)) {
    return;
  }

  triggerHaptic(20);
  state.bodyweightEntries = state.bodyweightEntries.filter(b => b.date !== dateStr);
  saveAllData();
  renderBodyweightDashboard();
}

function showBodyweightError(msg) {
  triggerHaptic([50, 50]);
  const err = document.getElementById("bodyweightError");
  if (err) {
    err.textContent = msg;
    err.style.display = "block";
  }
}

// App Title Inline Editing
function toggleHeadlineEdit() {
  triggerHaptic(5);
  const row = document.getElementById("headlineEditRow");
  const input = document.getElementById("headlineInput");
  
  if (row && input) {
    const isHidden = window.getComputedStyle(row).display === "none";
    row.style.display = isHidden ? "flex" : "none";
    if (isHidden) {
      input.value = state.headline;
      input.focus();
    }
  }
}

function saveHeadlineTitle() {
  const input = document.getElementById("headlineInput");
  if (!input) return;

  const rawTitle = input.value.trim();
  if (!rawTitle) return;

  triggerHaptic([20, 20]);
  state.headline = rawTitle;
  saveAllData();

  const titleEl = document.getElementById("headlineText");
  if (titleEl) titleEl.textContent = state.headline;

  document.getElementById("headlineEditRow").style.display = "none";
}

function cancelHeadlineTitle() {
  triggerHaptic(5);
  document.getElementById("headlineEditRow").style.display = "none";
}

// Reset Database Functions
function confirmResetAllData() {
  triggerHaptic([100, 100, 100]);
  
  // Wipe all LocalStorage keys
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CUSTOM_EXER_KEY);
  localStorage.removeItem(HEADLINE_KEY);
  localStorage.removeItem(BODYWEIGHT_KEY);
  localStorage.removeItem(MODE_KEY);

  // Re-initialize state
  state = {
    selectedMuscle: null,
    selectedExercise: null,
    entries: [],
    customExercises: {},
    bodyweightEntries: [],
    headline: "Dhruvish Adrenaline: All‑Out Mode",
    mode: "normal",
    focusMode: false,
    chartInstance: null
  };

  // Rebuild defaults
  saveAllData();
  loadAllData();
  initApp();
  switchView("view-muscles");
}

// Import & Export JSON Logic
function exportWorkoutData() {
  triggerHaptic(10);
  
  const payload = {
    app: "DhruvishAdrenaline",
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    headline: state.headline,
    mode: state.mode,
    customExercises: state.customExercises,
    bodyweightEntries: state.bodyweightEntries,
    entries: state.entries
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  
  const cleanHeadline = state.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  downloadAnchor.setAttribute("download", `adrenaline-data-${cleanHeadline}-${new Date().toISOString().split("T")[0]}.json`);
  
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function triggerImportFileInput() {
  triggerHaptic(5);
  const input = document.getElementById("importFileInput");
  if (input) input.click();
}

function importWorkoutData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      
      let entriesToImport = [];
      let customExercisesToImport = {};
      let bodyweightEntriesToImport = [];
      let headlineToImport = state.headline;
      let modeToImport = state.mode;

      // Helper to parse if string, otherwise return as is
      const parseField = (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch (err) {
            return val;
          }
        }
        return val;
      };

      // Format 1: Raw localStorage export format
      if (parsed && (parsed["gym-tracker-inline"] || parsed[STORAGE_KEY])) {
        const rawEntries = parsed["gym-tracker-inline"] || parsed[STORAGE_KEY];
        entriesToImport = parseField(rawEntries) || [];
        
        const rawCustom = parsed["gym-tracker-custom-exercises"] || parsed[CUSTOM_EXER_KEY];
        customExercisesToImport = parseField(rawCustom) || {};
        
        const rawBodyweight = parsed["gym-tracker-bodyweight"] || parsed[BODYWEIGHT_KEY];
        bodyweightEntriesToImport = parseField(rawBodyweight) || [];
        
        const rawHeadline = parsed["gym-tracker-headline"] || parsed[HEADLINE_KEY];
        headlineToImport = parseField(rawHeadline) || state.headline;
        
        const rawMode = parsed["gym-tracker-mode"] || parsed[MODE_KEY];
        modeToImport = parseField(rawMode) || state.mode;
      }
      // Format 2: Old/new nested storage format or root-level payload format
      else if (parsed && typeof parsed === "object") {
        let dataSource = parsed;
        if (parsed.storage) {
          dataSource = parseField(parsed.storage);
        }

        if (Array.isArray(parsed)) {
          entriesToImport = parsed;
        } else if (dataSource && typeof dataSource === "object") {
          entriesToImport = parseField(dataSource.entries) || [];
          customExercisesToImport = parseField(dataSource.customExercises) || {};
          bodyweightEntriesToImport = parseField(dataSource.bodyweightEntries) || [];
          headlineToImport = parseField(dataSource.headline) || parseField(parsed.headline) || state.headline;
          modeToImport = parseField(dataSource.mode) || parseField(parsed.mode) || state.mode;
        }
      }

      // Ensure lists are arrays and objects are objects
      if (!Array.isArray(entriesToImport)) {
        entriesToImport = [];
      }
      if (typeof customExercisesToImport !== "object" || customExercisesToImport === null) {
        customExercisesToImport = {};
      }
      if (!Array.isArray(bodyweightEntriesToImport)) {
        bodyweightEntriesToImport = [];
      }

      if (entriesToImport.length === 0 && bodyweightEntriesToImport.length === 0 && Object.keys(customExercisesToImport).length === 0) {
        alert("No valid workout logs, custom exercises, or weight entries found in this backup file.");
        return;
      }

      if (confirm("Importing this backup package will overwrite your current settings, title, weights, and logs. Do you want to proceed?")) {
        triggerHaptic([30, 20, 30]);

        state.headline = headlineToImport;
        state.mode = modeToImport;
        state.customExercises = customExercisesToImport;
        state.bodyweightEntries = bodyweightEntriesToImport;
        state.entries = entriesToImport;

        saveAllData();
        loadAllData();
        initApp();
        
        alert("Backups imported successfully!");
        switchView("view-muscles");
      }
    } catch (err) {
      alert("Failed to parse JSON file correctly: " + err.message);
    }
  };
  reader.readAsText(file);
}

// App Orchestration Initialization
function initApp() {
  renderMuscleTabs();
  
  // Set default mode in selector
  const modeSelect = document.getElementById("modeSelect");
  if (modeSelect) modeSelect.value = state.mode;

  // Bind change handlers
  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      triggerHaptic(5);
      state.mode = e.target.value;
      saveAllData();
      
      // If we are currently logging, recalculate target pre-fills
      if (state.selectedMuscle && state.selectedExercise) {
        const currentMeta = getAllExercisesForMuscle(state.selectedMuscle).find(ex => 
          normalizeName(ex.name) === normalizeName(state.selectedExercise)
        );
        if (currentMeta) {
          buildSuggestedSets(currentMeta.type);
        }
      }
    });
  }

  // Handle headline title editing triggers
  const btnToggleEdit = document.getElementById("btnToggleHeadlineEdit");
  if (btnToggleEdit) btnToggleEdit.addEventListener("click", toggleFocusMode); // Reuse Focus logic if required or default
}

// DOM Setup Binder
document.addEventListener("DOMContentLoaded", () => {
  // Load data & set up tabs
  loadAllData();
  initApp();

  // Automatically open native calendar picker when tapping anywhere on the date input
  document.querySelectorAll('input[type="date"]').forEach(input => {
    const showCalendar = () => {
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
        } catch (e) {
          console.log("showPicker failed:", e);
        }
      }
    };
    input.addEventListener("click", showCalendar);
    input.addEventListener("focus", showCalendar);
  });

  // Settings Modal open/close binders
  document.getElementById("btnOpenSettings")?.addEventListener("click", () => {
    triggerHaptic(10);
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.display = "flex";
      settingsModal.offsetHeight;
      settingsModal.style.opacity = "1";
      const headlineInput = document.getElementById("headlineInput");
      if (headlineInput) headlineInput.value = state.headline;
    }
  });

  document.getElementById("btnCloseSettings")?.addEventListener("click", () => {
    triggerHaptic(5);
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.opacity = "0";
      setTimeout(() => {
        settingsModal.style.display = "none";
      }, 300);
    }
  });

  // Theme select skin swap binder
  document.getElementById("themeSelect")?.addEventListener("change", (e) => {
    triggerHaptic(5);
    state.theme = e.target.value;
    document.documentElement.setAttribute("data-theme", state.theme);
    localStorage.setItem("gym-tracker-theme", state.theme);
  });

  // Synthbeats procedural sequencer beats binder
  document.getElementById("btnToggleSynthwave")?.addEventListener("click", () => {
    triggerHaptic(10);
    if (state.synthPlaying) {
      stopSynthwaveBeats();
    } else {
      startSynthwaveBeats();
    }
  });

  // Navigation binders
  document.getElementById("btnBackToMuscles")?.addEventListener("click", () => {
    switchView("view-muscles");
  });

  document.getElementById("btnSkipToLogging")?.addEventListener("click", () => {
    initWorkoutLoggingView();
  });

  document.getElementById("btnBackToOverview")?.addEventListener("click", () => {
    initRecapView();
  });

  // Action Binders
  document.getElementById("btnWorkoutComplete")?.addEventListener("click", completeWorkout);
  document.getElementById("btnSaveWorkout")?.addEventListener("click", saveWorkoutEntry);
  document.getElementById("btnAddSet")?.addEventListener("click", addSet);
  document.getElementById("btnCopyLastSets")?.addEventListener("click", copyLastWorkoutSets);
  document.getElementById("btnFocusMode")?.addEventListener("click", toggleFocusMode);

  // Custom Exercises
  document.getElementById("btnAddExercise")?.addEventListener("click", showAddExerciseUI);
  document.getElementById("btnConfirmAddExercise")?.addEventListener("click", confirmAddExercise);
  document.getElementById("btnDeleteExercise")?.addEventListener("click", deleteCustomExercise);
  document.getElementById("exerciseSelect")?.addEventListener("change", handleExerciseChange);
  document.getElementById("exerciseTypeSelect")?.addEventListener("change", (e) => {
    triggerHaptic(5);
    const newType = e.target.value;
    if (state.selectedMuscle && state.selectedExercise) {
      const customs = state.customExercises[state.selectedMuscle] || [];
      const target = customs.find(ex => normalizeName(ex.name) === normalizeName(state.selectedExercise));
      if (target) {
        target.type = newType;
        saveAllData();
      }
    }
    updateLoggingInterface(newType);
  });

  // Date-wise History View
  document.getElementById("btnDatewiseHistory")?.addEventListener("click", initDateHistoryView);
  document.getElementById("btnBackFromDateHistory")?.addEventListener("click", () => {
    switchView("view-muscles");
  });
  document.getElementById("dateHistoryInput")?.addEventListener("change", renderDatewiseHistory);

  // Bodyweight View
  document.getElementById("btnBodyweight")?.addEventListener("click", initBodyweightView);
  document.getElementById("btnBackFromBodyweight")?.addEventListener("click", () => {
    switchView("view-muscles");
  });
  document.getElementById("btnSaveBodyweight")?.addEventListener("click", saveBodyweightLog);

  // Danger Reset Binders
  document.getElementById("btnGoToReset")?.addEventListener("click", () => {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.display = "none";
      settingsModal.style.opacity = "0";
    }
    switchView("view-reset");
  });
  document.getElementById("btnCancelReset")?.addEventListener("click", () => {
    switchView("view-muscles");
  });
  document.getElementById("btnConfirmReset")?.addEventListener("click", confirmResetAllData);

  // Backups Import / Export Binders
  document.getElementById("btnExportData")?.addEventListener("click", exportWorkoutData);
  document.getElementById("btnImportData")?.addEventListener("click", triggerImportFileInput);
  document.getElementById("importFileInput")?.addEventListener("change", (e) => {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.display = "none";
      settingsModal.style.opacity = "0";
    }
    importWorkoutData(e);
  });

  // Title edit triggers in Settings modal
  document.getElementById("btnSaveHeadline")?.addEventListener("click", () => {
    saveHeadlineTitle();
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.style.opacity = "0";
      setTimeout(() => {
        settingsModal.style.display = "none";
      }, 300);
    }
  });
});

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("Service Worker successfully registered with scope:", reg.scope))
      .catch(err => console.log("Service Worker registration failed:", err));
  });
}

// ==========================================================================
// PREMIUM CYBERPUNK ACTION PACK HELPERS
// ==========================================================================

// 1. Achievements & Streak Calculator
function updateAchievements() {
  const streakEl = document.getElementById("badgeStreak");
  const tonEl = document.getElementById("badgeTon");
  const lungEl = document.getElementById("badgeLung");
  const weighEl = document.getElementById("badgeWeigh");
  const rankEl = document.getElementById("conquestRank");
  
  if (!streakEl || !tonEl || !lungEl || !weighEl || !rankEl) return;
  
  // Calculate Streak of workout days (based on unique date tags)
  const activeDates = Array.from(new Set(
    state.entries
      .filter(e => e.exercise !== "__muscle_complete__")
      .map(e => e.date)
  )).sort((a, b) => new Date(b) - new Date(a)); // Newest first
  
  let currentStreak = 0;
  if (activeDates.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    // Streak continues only if there was a workout logged today or yesterday
    if (activeDates[0] === todayStr || activeDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 0; i < activeDates.length - 1; i++) {
        const d1 = new Date(activeDates[i]);
        const d2 = new Date(activeDates[i+1]);
        const diffTime = Math.abs(d1 - d2);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          break; // Streak sequence broken
        }
      }
    }
  }
  
  // Calculate Lifetime Volume
  let totalVolume = 0;
  state.entries.forEach(e => {
    if (e.type === "weighted") {
      totalVolume += Number(e.totalVolume || 0);
    }
  });
  
  // Calculate Lifetime Distance
  let totalDistance = 0;
  state.entries.forEach(e => {
    if (e.type === "cardio") {
      totalDistance += Number(e.totalDistance || 0);
    }
  });
  
  // Weigh-In count
  const weighInCount = state.bodyweightEntries.length;
  
  // Unlock targets
  const streakUnlocked = currentStreak >= 3;
  const tonUnlocked = totalVolume >= 1000;
  const lungUnlocked = totalDistance >= 5.0;
  const weighUnlocked = weighInCount >= 3;
  
  // Visual neon glow toggling
  if (streakUnlocked) streakEl.classList.add("badge-active");
  else streakEl.classList.remove("badge-active");
  
  if (tonUnlocked) tonEl.classList.add("badge-active");
  else tonEl.classList.remove("badge-active");
  
  if (lungUnlocked) lungEl.classList.add("badge-active");
  else lungEl.classList.remove("badge-active");
  
  if (weighUnlocked) weighEl.classList.add("badge-active");
  else weighEl.classList.remove("badge-active");
  
  // Conquest ranks ranking math
  let unlockedCount = 0;
  if (streakUnlocked) unlockedCount++;
  if (tonUnlocked) unlockedCount++;
  if (lungUnlocked) unlockedCount++;
  if (weighUnlocked) unlockedCount++;
  
  const ranks = ["Rookie", "Gladiator", "Slayer", "Titan", "Overlord"];
  rankEl.textContent = ranks[unlockedCount];
  
  // Add descriptive tooltips
  streakEl.title = `Current Streak: ${currentStreak} days (Target: 3 days)`;
  tonEl.title = `Lifetime Volume: ${Math.round(totalVolume)} kg (Target: 1000 kg)`;
  lungEl.title = `Lifetime Cardio: ${Math.round(totalDistance * 10) / 10} km (Target: 5.0 km)`;
  weighEl.title = `Scale Logs: ${weighInCount} weigh-ins (Target: 3 logs)`;
}

// 2. Web Audio Synthesizer sound effect ticks
function triggerSetCompleteBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.log("Web Audio synth beep blocked or not supported on this device:", e);
  }
}

// 3. Spawns Flying CSS Spark particles
function triggerExplosionAnimation(x, y) {
  const particleCount = 12;
  const container = document.body;
  
  for (let i = 0; i < particleCount; i++) {
    const spark = document.createElement("div");
    spark.className = "spark-spark";
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 40 + Math.random() * 50;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--dx", `${dx}px`);
    spark.style.setProperty("--dy", `${dy}px`);
    
    container.appendChild(spark);
    
    setTimeout(() => {
      spark.remove();
    }, 500);
  }
}

// 4. rest Timer engine & Screen Wake Lock API (Removed as requested)


// 5. Procedurally generated Synthwave Beats loop sequencer
let synthwaveAudioCtx = null;
let synthwaveInterval = null;
let synthwaveStep = 0;

function startSynthwaveBeats() {
  if (state.synthPlaying) return;
  state.synthPlaying = true;
  
  try {
    synthwaveAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    synthwaveStep = 0;
    
    const stepDuration = 0.22; // bpm 136 rhythm pulse
    
    const playSequencerStep = () => {
      if (!state.synthPlaying || !synthwaveAudioCtx) return;
      const time = synthwaveAudioCtx.currentTime;
      
      // A. Kick Drum beats (Steps 0 and 4)
      if (synthwaveStep === 0 || synthwaveStep === 4) {
        const kickOsc = synthwaveAudioCtx.createOscillator();
        const kickGain = synthwaveAudioCtx.createGain();
        
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
        
        kickGain.gain.setValueAtTime(0.3, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        
        kickOsc.connect(kickGain);
        kickGain.connect(synthwaveAudioCtx.destination);
        kickOsc.start(time);
        kickOsc.stop(time + 0.12);
      }
      
      // B. White noise snare claps (Steps 2 and 6)
      if (synthwaveStep === 2 || synthwaveStep === 6) {
        const bufferSize = synthwaveAudioCtx.sampleRate * 0.15;
        const buffer = synthwaveAudioCtx.createBuffer(1, bufferSize, synthwaveAudioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noise = synthwaveAudioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = synthwaveAudioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;
        
        const snareGain = synthwaveAudioCtx.createGain();
        snareGain.gain.setValueAtTime(0.12, time);
        snareGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        noise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(synthwaveAudioCtx.destination);
        
        noise.start(time);
        noise.stop(time + 0.15);
      }
      
      // C. Pulses synthesizer bass note on every step (Binaural retro Synthwave)
      const bassNotes = [55.0, 55.0, 65.41, 65.41, 73.42, 73.42, 98.0, 82.41]; // retro scale: A1, A1, C2, C2, D2, D2, G2, E2
      const freq = bassNotes[synthwaveStep % bassNotes.length];
      
      const bassOsc = synthwaveAudioCtx.createOscillator();
      const bassGain = synthwaveAudioCtx.createGain();
      const filter = synthwaveAudioCtx.createBiquadFilter();
      
      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(freq, time);
      
      filter.type = "lowpass";
      const sweepFreq = 300 + Math.sin(time * 0.5) * 150; // Dynamic filter sweep modulation
      filter.frequency.setValueAtTime(sweepFreq, time);
      
      bassGain.gain.setValueAtTime(0.08, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + stepDuration * 0.9);
      
      bassOsc.connect(filter);
      filter.connect(bassGain);
      bassGain.connect(synthwaveAudioCtx.destination);
      
      bassOsc.start(time);
      bassOsc.stop(time + stepDuration * 0.9);
      
      synthwaveStep = (synthwaveStep + 1) % 8;
    };
    
    playSequencerStep();
    synthwaveInterval = setInterval(playSequencerStep, stepDuration * 1000);
    
    const btn = document.getElementById("btnToggleSynthwave");
    if (btn) {
      btn.innerHTML = "🔊 ON";
      btn.className = "btn btn-cyan btn-sm";
    }
  } catch (e) {
    console.log("Procedural synthwave failed to start:", e);
    state.synthPlaying = false;
  }
}

function stopSynthwaveBeats() {
  if (!state.synthPlaying) return;
  state.synthPlaying = false;
  
  if (synthwaveInterval) {
    clearInterval(synthwaveInterval);
    synthwaveInterval = null;
  }
  
  if (synthwaveAudioCtx) {
    synthwaveAudioCtx.close();
    synthwaveAudioCtx = null;
  }
  
  const btn = document.getElementById("btnToggleSynthwave");
  if (btn) {
    btn.innerHTML = "🔇 OFF";
    btn.className = "btn btn-secondary btn-sm";
  }
}
