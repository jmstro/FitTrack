import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KG_IN_LB = 2.20462;
const DAY_MS = 86400000;

const DEFAULT_STATE = {
  user: {
    id: null,
    name: "",
    goal: "",
    frequency: "",
    todayFocus: "",
    units: "lb",
    theme: "auto",
    prefersMorning: false,
    onboarded: false,
    age: null,
    gender: "",
    heightCm: null,
    insightIntensity: "strict",
    startingWeightLb: null
  },
  workouts: {
    templates: {},
    lastTemplateId: null
  },
  workoutLogs: {},
  workoutDrafts: {},
  weightLogs: {},
  groups: {
    byId: {},
    order: []
  },
  feed: [],
  ui: {
    activeTab: "today",
    logMode: "workout",
    metric: "weight",
    progressBody: "all",
    exerciseBody: "all",
    exerciseCategory: "all",
    exerciseSearch: "",
    logDate: "",
    liveStarted: false,
    liveSplit: "",
    liveMuscle: "",
    liveDate: "",
    selectedGroupId: null,
    expandedExercise: null,
    groupMetric: "consistency",
    groupRange: 7,
    groupFilter: "all",
    commentOpenId: null
  }
};

const FITTRACK_CONFIG = window.FITTRACK_CONFIG || {};
const SUPABASE_URL = FITTRACK_CONFIG.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = FITTRACK_CONFIG.SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

let authUser = null;
let currentProfile = null;

const BODY_PART_OPTIONS = [
  "All",
  "Full Body",
  "Chest",
  "Shoulders",
  "Back",
  "Biceps",
  "Triceps",
  "Legs",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Cardio"
];

const LIVE_SPLITS = {
  push: { label: "Push", primary: ["Chest", "Shoulders", "Triceps"], secondary: [] },
  pull: { label: "Pull", primary: ["Back", "Biceps"], secondary: ["Shoulders"] },
  legs: { label: "Legs", primary: ["Quads", "Hamstrings", "Glutes", "Calves"], secondary: ["Core"] },
  upper: { label: "Upper", primary: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"], secondary: ["Core"] },
  lower: { label: "Lower", primary: ["Quads", "Hamstrings", "Glutes", "Calves"], secondary: ["Core"] },
  full: { label: "Full Body", primary: ["Full Body"], secondary: ["Core", "Cardio"] },
  custom: { label: "Custom", primary: [], secondary: [] }
};

const MUSCLE_PAIRINGS = {
  chest: ["Shoulders", "Triceps"],
  shoulders: ["Chest", "Triceps"],
  triceps: ["Chest", "Shoulders"],
  back: ["Biceps", "Shoulders"],
  biceps: ["Back"],
  quads: ["Hamstrings", "Glutes"],
  hamstrings: ["Glutes", "Quads"],
  glutes: ["Hamstrings", "Quads"],
  calves: ["Core"],
  core: ["Legs"],
  cardio: ["Core"],
  "full body": ["Core"]
};

const INSIGHT_PROFILES = {
  strict: {
    maxInsights: 2,
    maxWarn: 1,
    allowLowConfidence: false,
    requireConsecutive: true,
    thresholds: {
      plateau: 1.01,
      plateauMinSessions: 4,
      plateauWindow: 8,
      regression: 0.97,
      volumeJump: 1.35,
      volumeDrop: 0.55,
      underSets: 4,
      underSetsWeeks: 2,
      underFreqWeeks: 2,
      restStreak: 10,
      pushPullHigh: 1.3,
      pushPullLow: 0.77,
      quadHamHigh: 1.5,
      quadHamLow: 0.67,
      repDominance: 0.9,
      repDominanceWeeks: 8,
      weightLossRate: -0.01,
      weightGainRate: 0.01,
      strengthDrop: -0.03,
      strengthFlat: 0.01
    }
  },
  aggressive: {
    maxInsights: 7,
    maxWarn: 2,
    allowLowConfidence: true,
    requireConsecutive: false,
    thresholds: {
      plateau: 1.015,
      plateauMinSessions: 3,
      plateauWindow: 8,
      regression: 0.985,
      volumeJump: 1.25,
      volumeDrop: 0.7,
      underSets: 6,
      underSetsWeeks: 1,
      underFreqWeeks: 1,
      restStreak: 7,
      pushPullHigh: 1.2,
      pushPullLow: 0.83,
      quadHamHigh: 1.35,
      quadHamLow: 0.74,
      repDominance: 0.8,
      repDominanceWeeks: 4,
      weightLossRate: -0.0075,
      weightGainRate: 0.0075,
      strengthDrop: -0.02,
      strengthFlat: 0.015
    }
  }
};

const BODY_PART_GROUPS = {
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  legs: ["quads", "hamstrings", "glutes", "calves"]
};

const CATEGORY_OPTIONS = [
  "All",
  "Compound",
  "Chest",
  "Shoulders",
  "Back",
  "Biceps",
  "Triceps",
  "Legs",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Bodyweight",
  "Cardio"
];

const EXERCISE_LIBRARY = [
  { name: "Barbell Squat", categories: ["Compound", "Legs", "Quads", "Glutes", "Hamstrings"], bodyParts: ["Quads", "Glutes", "Hamstrings", "Core"] },
  { name: "Back Squat", categories: ["Compound", "Legs", "Quads", "Glutes", "Hamstrings"], bodyParts: ["Quads", "Glutes", "Hamstrings", "Core"] },
  { name: "Front Squat", categories: ["Compound", "Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes", "Core"] },
  { name: "Goblet Squat", categories: ["Compound", "Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes", "Core"] },
  { name: "Deadlift (Conventional)", categories: ["Compound", "Back", "Hamstrings", "Glutes"], bodyParts: ["Back", "Hamstrings", "Glutes", "Core"] },
  { name: "Sumo Deadlift", categories: ["Compound", "Legs", "Glutes", "Hamstrings"], bodyParts: ["Glutes", "Hamstrings", "Quads", "Back"] },
  { name: "Romanian Deadlift (RDL)", categories: ["Compound", "Hamstrings", "Glutes"], bodyParts: ["Hamstrings", "Glutes", "Back"] },
  { name: "Trap Bar Deadlift", categories: ["Compound", "Legs", "Glutes", "Hamstrings"], bodyParts: ["Quads", "Glutes", "Hamstrings", "Back"] },
  { name: "Bench Press (Barbell)", categories: ["Compound", "Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders"] },
  { name: "Bench Press (Dumbbell)", categories: ["Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders"] },
  { name: "Dumbbell Bench Press", categories: ["Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders"] },
  { name: "Incline Bench Press", categories: ["Compound", "Chest", "Shoulders", "Triceps"], bodyParts: ["Chest", "Shoulders", "Triceps"] },
  { name: "Decline Bench Press", categories: ["Chest", "Triceps"], bodyParts: ["Chest", "Triceps"] },
  { name: "Overhead Press (Barbell)", categories: ["Compound", "Shoulders", "Triceps"], bodyParts: ["Shoulders", "Triceps"] },
  { name: "Overhead Press (Dumbbell)", categories: ["Shoulders", "Triceps"], bodyParts: ["Shoulders", "Triceps"] },
  { name: "Clean (Power Clean)", categories: ["Compound"], bodyParts: ["Full Body", "Quads", "Glutes", "Back", "Shoulders"] },
  { name: "Clean and Press", categories: ["Compound", "Shoulders"], bodyParts: ["Full Body", "Shoulders", "Legs", "Back"] },
  { name: "Kettlebell Swing", categories: ["Compound", "Glutes", "Hamstrings"], bodyParts: ["Glutes", "Hamstrings", "Core"] },
  { name: "Farmer's Carry", categories: ["Compound", "Core", "Back"], bodyParts: ["Full Body", "Core", "Back"] },
  { name: "Chest Press Machine", categories: ["Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders"] },
  { name: "Pec Deck / Chest Fly Machine", categories: ["Chest"], bodyParts: ["Chest"] },
  { name: "Cable Chest Fly", categories: ["Chest"], bodyParts: ["Chest"] },
  { name: "Dumbbell Chest Fly", categories: ["Chest"], bodyParts: ["Chest"] },
  { name: "Pushups", categories: ["Bodyweight", "Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders", "Core"] },
  { name: "Weighted Pushups", categories: ["Bodyweight", "Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders", "Core"] },
  { name: "Chest Dips", categories: ["Chest", "Triceps", "Shoulders"], bodyParts: ["Chest", "Triceps", "Shoulders"] },
  { name: "Arnold Press", categories: ["Shoulders"], bodyParts: ["Shoulders"] },
  { name: "Lateral Raises", categories: ["Shoulders"], bodyParts: ["Shoulders"] },
  { name: "Front Raises", categories: ["Shoulders"], bodyParts: ["Shoulders"] },
  { name: "Rear Delt Fly (Dumbbell)", categories: ["Shoulders", "Back"], bodyParts: ["Shoulders", "Back"] },
  { name: "Rear Delt Machine", categories: ["Shoulders", "Back"], bodyParts: ["Shoulders", "Back"] },
  { name: "Upright Rows", categories: ["Shoulders", "Biceps"], bodyParts: ["Shoulders", "Biceps"] },
  { name: "Face Pulls", categories: ["Shoulders", "Back"], bodyParts: ["Shoulders", "Back"] },
  { name: "Machine Shoulder Press", categories: ["Shoulders", "Triceps"], bodyParts: ["Shoulders", "Triceps"] },
  { name: "Pull-Ups", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Assisted Pull-Ups", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Chin-Ups", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Lat Pulldown", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Seated Cable Row", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Bent-Over Row (Barbell)", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Dumbbell Row", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "T-Bar Row", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Machine Row", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Rack Pull", categories: ["Back", "Hamstrings", "Glutes"], bodyParts: ["Back", "Hamstrings", "Glutes"] },
  { name: "Straight-Arm Pulldown", categories: ["Back"], bodyParts: ["Back"] },
  { name: "Inverted Rows", categories: ["Bodyweight", "Back", "Biceps"], bodyParts: ["Back", "Biceps", "Core"] },
  { name: "Single-Arm Cable Row", categories: ["Back", "Biceps"], bodyParts: ["Back", "Biceps"] },
  { name: "Dumbbell Pullover", categories: ["Back", "Chest"], bodyParts: ["Back", "Chest"] },
  { name: "Barbell Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "EZ-Bar Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Dumbbell Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Alternating Dumbbell Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Hammer Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Preacher Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Cable Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Concentration Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Machine Bicep Curl", categories: ["Biceps"], bodyParts: ["Biceps"] },
  { name: "Tricep Pushdown (Cable)", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Rope Pushdown", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Overhead Tricep Extension", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Skull Crushers", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Close-Grip Bench Press", categories: ["Chest", "Triceps"], bodyParts: ["Triceps", "Chest"] },
  { name: "Tricep Dips", categories: ["Triceps", "Chest"], bodyParts: ["Triceps", "Chest"] },
  { name: "Dumbbell Kickbacks", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Machine Tricep Extension", categories: ["Triceps"], bodyParts: ["Triceps"] },
  { name: "Leg Press", categories: ["Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes"] },
  { name: "Hack Squat", categories: ["Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes"] },
  { name: "Bulgarian Split Squat", categories: ["Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes", "Hamstrings"] },
  { name: "Lunges", categories: ["Legs", "Quads", "Glutes", "Bodyweight"], bodyParts: ["Quads", "Glutes", "Hamstrings"] },
  { name: "Walking Lunges", categories: ["Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes", "Hamstrings"] },
  { name: "Step-Ups", categories: ["Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes"] },
  { name: "Leg Extension Machine", categories: ["Quads", "Legs"], bodyParts: ["Quads"] },
  { name: "Lying Leg Curl", categories: ["Hamstrings", "Legs"], bodyParts: ["Hamstrings"] },
  { name: "Seated Leg Curl", categories: ["Hamstrings", "Legs"], bodyParts: ["Hamstrings"] },
  { name: "Good Mornings", categories: ["Hamstrings", "Glutes", "Back"], bodyParts: ["Hamstrings", "Glutes", "Back"] },
  { name: "Nordic Hamstring Curl", categories: ["Hamstrings"], bodyParts: ["Hamstrings"] },
  { name: "Hip Thrust", categories: ["Glutes", "Legs"], bodyParts: ["Glutes", "Hamstrings"] },
  { name: "Glute Bridge", categories: ["Glutes", "Legs"], bodyParts: ["Glutes", "Hamstrings"] },
  { name: "Cable Kickbacks", categories: ["Glutes"], bodyParts: ["Glutes"] },
  { name: "Sumo Squat", categories: ["Legs", "Glutes", "Quads"], bodyParts: ["Glutes", "Quads", "Hamstrings"] },
  { name: "Step-Back Lunges", categories: ["Legs", "Glutes", "Quads"], bodyParts: ["Quads", "Glutes", "Hamstrings"] },
  { name: "Hip Abduction Machine", categories: ["Glutes"], bodyParts: ["Glutes"] },
  { name: "Hip Adduction Machine", categories: ["Legs"], bodyParts: ["Legs"] },
  { name: "Standing Calf Raises", categories: ["Calves", "Legs"], bodyParts: ["Calves"] },
  { name: "Seated Calf Raises", categories: ["Calves", "Legs"], bodyParts: ["Calves"] },
  { name: "Leg Press Calf Raises", categories: ["Calves", "Legs"], bodyParts: ["Calves"] },
  { name: "Single-Leg Calf Raises", categories: ["Calves", "Legs"], bodyParts: ["Calves"] },
  { name: "Donkey Calf Raises", categories: ["Calves", "Legs"], bodyParts: ["Calves"] },
  { name: "Sit-Ups", categories: ["Core", "Bodyweight"], bodyParts: ["Core"] },
  { name: "Crunches", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Plank", categories: ["Core", "Bodyweight"], bodyParts: ["Core"] },
  { name: "Side Plank", categories: ["Core", "Bodyweight"], bodyParts: ["Core"] },
  { name: "Hanging Leg Raises", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Lying Leg Raises", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Russian Twists", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Cable Crunch", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Ab Wheel Rollout", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Bicycle Crunch", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Flutter Kicks", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Dead Bug", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Pallof Press", categories: ["Core"], bodyParts: ["Core"] },
  { name: "Air Squats", categories: ["Bodyweight", "Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes"] },
  { name: "Jump Squats", categories: ["Bodyweight", "Legs", "Quads", "Glutes"], bodyParts: ["Quads", "Glutes"] },
  { name: "Burpees", categories: ["Bodyweight", "Compound"], bodyParts: ["Full Body"] },
  { name: "Mountain Climbers", categories: ["Bodyweight", "Core"], bodyParts: ["Core", "Cardio"] },
  { name: "Jumping Jacks", categories: ["Bodyweight", "Cardio"], bodyParts: ["Cardio"] },
  { name: "Plank Holds", categories: ["Bodyweight", "Core"], bodyParts: ["Core"] },
  { name: "Bear Crawls", categories: ["Bodyweight", "Compound"], bodyParts: ["Full Body", "Core"] },
  { name: "Treadmill (Walk / Jog / Run)", categories: ["Cardio"], bodyParts: ["Cardio"] },
  { name: "Stationary Bike", categories: ["Cardio"], bodyParts: ["Cardio"] },
  { name: "Spin Bike", categories: ["Cardio"], bodyParts: ["Cardio"] },
  { name: "Elliptical", categories: ["Cardio"], bodyParts: ["Cardio"] },
  { name: "Stair Climber", categories: ["Cardio"], bodyParts: ["Cardio"] },
  { name: "Rowing Machine", categories: ["Cardio", "Back"], bodyParts: ["Cardio", "Back"] },
  { name: "Jump Rope", categories: ["Cardio"], bodyParts: ["Cardio"] }
];

const state = loadState();
applyInitialTabFromUrl();

const navButtons = document.querySelectorAll(".nav-item[data-tab]");
const tabPanels = document.querySelectorAll(".tab-panel");

const todayGreetingEl = document.getElementById("todayGreeting");
const todayDateEl = document.getElementById("todayDate");
const todayLogBtn = document.getElementById("todayLogBtn");
const streakPill = document.getElementById("streakPill");
const todayFocusText = document.getElementById("todayFocusText");
const editFocusBtn = document.getElementById("editFocusBtn");
const statWorkouts = document.getElementById("statWorkouts");
const statWorkoutsMeta = document.getElementById("statWorkoutsMeta");
const statWeight = document.getElementById("statWeight");
const statWeightMeta = document.getElementById("statWeightMeta");
const statLastWorkout = document.getElementById("statLastWorkout");
const statLastWorkoutMeta = document.getElementById("statLastWorkoutMeta");
const groupUpdateText = document.getElementById("groupUpdateText");

const accountBtn = document.getElementById("accountBtn");
const accountStatus = document.getElementById("accountStatus");
const mobileAccountBtn = document.getElementById("mobileAccountBtn");

const themeToggle = document.getElementById("themeToggle");
const unitToggle = document.getElementById("unitToggle");

const logMode = document.getElementById("logMode");
const logAuthNotice = document.getElementById("logAuthNotice");
const workoutLogPanel = document.getElementById("workoutLogPanel");
const weightLogPanel = document.getElementById("weightLogPanel");
const workoutNameInput = document.getElementById("workoutNameInput");
const workoutDateInput = document.getElementById("workoutDateInput");
const repeatWorkoutBtn = document.getElementById("repeatWorkoutBtn");
const exerciseList = document.getElementById("exerciseList");
const newExerciseInput = document.getElementById("newExerciseInput");
const newExerciseBody = document.getElementById("newExerciseBody");
const addExerciseBtn = document.getElementById("addExerciseBtn");
const exerciseSearchInput = document.getElementById("exerciseSearchInput");
const exerciseBodyChips = document.getElementById("exerciseBodyChips");
const exercisePicker = document.getElementById("exercisePicker");
const exercisePickerNote = document.getElementById("exercisePickerNote");
const addExerciseFromPickerBtn = document.getElementById("addExerciseFromPicker");
const saveWorkoutBtn = document.getElementById("saveWorkoutBtn");
const weightInput = document.getElementById("weightInput");
const weightUnitLabel = document.getElementById("weightUnitLabel");
const weightNote = document.getElementById("weightNote");
const morningToggle = document.getElementById("morningToggle");
const saveWeightBtn = document.getElementById("saveWeightBtn");
const workoutHistoryList = document.getElementById("workoutHistoryList");

const liveStartBtn = document.getElementById("liveStartBtn");
const liveStatusText = document.getElementById("liveStatusText");
const liveSetup = document.getElementById("liveSetup");
const liveSplitToggle = document.getElementById("liveSplitToggle");
const liveMuscleChips = document.getElementById("liveMuscleChips");
const liveMuscleSelect = document.getElementById("liveMuscleSelect");
const livePairingNote = document.getElementById("livePairingNote");
const liveExercisePicker = document.getElementById("liveExercisePicker");
const liveAddExerciseBtn = document.getElementById("liveAddExerciseBtn");
const liveExerciseNote = document.getElementById("liveExerciseNote");
const liveExerciseList = document.getElementById("liveExerciseList");
const liveSaveBtn = document.getElementById("liveSaveBtn");

const progressMetric = document.getElementById("progressMetric");
const progressChart = document.getElementById("progressChart");
const progressInsight = document.getElementById("progressInsight");
const progressDetailBtn = document.getElementById("progressDetailBtn");
const progressDetail = document.getElementById("progressDetail");
const progressBodySelect = document.getElementById("progressBodySelect");
const progressSummary = document.getElementById("progressSummary");
const progressBodyList = document.getElementById("progressBodyList");
const progressInsightList = document.getElementById("progressInsightList");
const insightIntensityToggle = document.getElementById("insightIntensityToggle");

const groupList = document.getElementById("groupList");
const createGroupBtn = document.getElementById("createGroupBtn");
const groupDetailPanel = document.getElementById("groupDetailPanel");
const groupTitle = document.getElementById("groupTitle");
const groupChallenge = document.getElementById("groupChallenge");
const groupMetricToggle = document.getElementById("groupMetricToggle");
const groupRangeToggle = document.getElementById("groupRangeToggle");
const groupFilterToggle = document.getElementById("groupFilterToggle");
const groupRankNote = document.getElementById("groupRankNote");
const groupLeaderboard = document.getElementById("groupLeaderboard");
const groupFeed = document.getElementById("groupFeed");
const groupMessageInput = document.getElementById("groupMessageInput");
const groupMessageBtn = document.getElementById("groupMessageBtn");
const leaveGroupBtn = document.getElementById("leaveGroupBtn");
const memberSearchInput = document.getElementById("memberSearchInput");
const memberSearchBtn = document.getElementById("memberSearchBtn");
const memberSearchResults = document.getElementById("memberSearchResults");

const feedList = document.getElementById("feedList");

const quickLogBtn = document.getElementById("quickLogBtn");
const quickWeightBtn = document.getElementById("quickWeightBtn");
const railStreak = document.getElementById("railStreak");
const railNextWorkout = document.getElementById("railNextWorkout");
const railGroupStanding = document.getElementById("railGroupStanding");

const onboarding = document.getElementById("onboarding");
const onboardingSteps = onboarding ? onboarding.querySelectorAll(".onboarding-step") : [];
const goalOptions = document.getElementById("goalOptions");
const frequencyOptions = document.getElementById("frequencyOptions");
const displayNameInput = document.getElementById("displayNameInput");
const onboardingBackBtn = document.getElementById("onboardingBackBtn");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingSkipBtn = document.getElementById("onboardingSkipBtn");

const groupModal = document.getElementById("groupModal");
const groupModalClose = document.getElementById("groupModalClose");
const groupNameInput = document.getElementById("groupNameInput");
const groupIconInput = document.getElementById("groupIconInput");
const groupPrivateToggle = document.getElementById("groupPrivateToggle");
const groupChallengeType = document.getElementById("groupChallengeType");
const groupChallengeGoal = document.getElementById("groupChallengeGoal");
const groupCreateSubmit = document.getElementById("groupCreateSubmit");

const authModal = document.getElementById("authModal");
const authCloseBtn = document.getElementById("authCloseBtn");
const authMode = document.getElementById("authMode");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authUsername = document.getElementById("authUsername");
const authAge = document.getElementById("authAge");
const authGender = document.getElementById("authGender");
const authHeight = document.getElementById("authHeight");
const authHeightUnit = document.getElementById("authHeightUnit");
const authStartingWeight = document.getElementById("authStartingWeight");
const authWeightUnit = document.getElementById("authWeightUnit");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const signupExtra = document.getElementById("signupExtra");
const authSubtitle = document.getElementById("authSubtitle");

const toastEl = document.getElementById("toast");

let onboardingStep = 0;
let saveTimer = null;
let profileSyncTimer = null;
let memberSearchTimer = null;

bindEvents();
applyTheme();
applyUnits();
initFilters();
renderAll();
initSupabase();
window.addEventListener("resize", renderProgress);
document.body.classList.add("loaded");

function bindEvents() {
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  if (todayLogBtn) {
    todayLogBtn.addEventListener("click", () => {
      setActiveTab("log");
      setLogMode("workout");
    });
  }

  if (quickLogBtn) {
    quickLogBtn.addEventListener("click", () => {
      setActiveTab("log");
      setLogMode("workout");
    });
  }

  if (quickWeightBtn) {
    quickWeightBtn.addEventListener("click", () => {
      setActiveTab("log");
      setLogMode("weight");
    });
  }

  if (editFocusBtn) {
    editFocusBtn.addEventListener("click", () => {
      if (!requireAuth("Sign in to set your focus.")) return;
      const next = window.prompt("Set today focus", state.user.todayFocus || "");
      if (next === null) return;
      state.user.todayFocus = next.trim();
      saveState();
      scheduleProfileSync();
      renderToday();
    });
  }

  if (accountBtn) {
    accountBtn.addEventListener("click", () => openAuthModal());
  }
  if (mobileAccountBtn) {
    mobileAccountBtn.addEventListener("click", () => openAuthModal());
  }

  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", () => closeAuthModal());
  }

  if (authMode) {
    authMode.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => setAuthMode(btn.dataset.mode));
    });
  }

  if (authSubmitBtn) {
    authSubmitBtn.addEventListener("click", () => handleAuthSubmit());
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => handleSignOut());
  }

  if (themeToggle) {
    themeToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.user.theme = btn.dataset.theme;
        saveState();
        applyTheme();
        scheduleProfileSync();
      });
    });
  }

  if (unitToggle) {
    unitToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.user.units = btn.dataset.unit;
        saveState();
        applyUnits();
        renderLog();
        renderProgress();
        renderToday();
        scheduleProfileSync();
      });
    });
  }

  if (logMode) {
    logMode.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        setLogMode(btn.dataset.mode);
      });
    });
  }

  if (logAuthNotice) {
    logAuthNotice.addEventListener("click", (event) => {
      const target = event.target.closest("#logAuthLink");
      if (target) {
        event.preventDefault();
        openAuthModal();
      }
    });
  }

  if (workoutNameInput) {
    workoutNameInput.addEventListener("input", () => {
      const draft = getDraft(getActiveWorkoutDateKey());
      draft.name = workoutNameInput.value.slice(0, 80);
      scheduleSave();
    });
  }

  if (workoutDateInput) {
    workoutDateInput.addEventListener("change", () => {
      const selected = (workoutDateInput.value || "").trim();
      state.ui.logDate = selected || "";
      saveState();
      renderLog();
    });
  }

  if (exerciseSearchInput) {
    exerciseSearchInput.addEventListener("input", () => {
      state.ui.exerciseSearch = exerciseSearchInput.value;
      saveState();
      renderExerciseLibrary();
    });
  }

  if (exerciseBodyChips) {
    exerciseBodyChips.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-body]");
      if (!btn) return;
      state.ui.exerciseBody = btn.dataset.body;
      saveState();
      renderExerciseLibrary();
      renderBodyChips();
    });
  }

  if (addExerciseFromPickerBtn) {
    addExerciseFromPickerBtn.addEventListener("click", () => addExerciseFromPicker());
  }

  if (exercisePicker) {
    exercisePicker.addEventListener("dblclick", () => addExerciseFromPicker());
    exercisePicker.addEventListener("change", () => {
      if (addExerciseFromPickerBtn) {
        addExerciseFromPickerBtn.disabled = !exercisePicker.value;
      }
    });
    exercisePicker.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addExerciseFromPicker();
      }
    });
  }

  if (repeatWorkoutBtn) {
    repeatWorkoutBtn.addEventListener("click", () => repeatLastWorkout());
  }

  if (addExerciseBtn) {
    addExerciseBtn.addEventListener("click", () => addExercise());
  }

  if (newExerciseInput) {
    newExerciseInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addExercise();
      }
    });
  }

  if (exerciseList) {
    exerciseList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.disabled) return;
      const action = btn.dataset.action;
      const exIndex = Number(btn.dataset.exIndex);
      const setIndex = Number(btn.dataset.setIndex);

      if (action === "toggle-exercise") {
        state.ui.expandedExercise = exIndex;
        saveState();
        renderLog();
        return;
      }

      if (action === "add-set") {
        addSet(exIndex);
        return;
      }

      if (action === "remove-set") {
        removeSet(exIndex, setIndex);
        return;
      }

      if (action === "remove-exercise") {
        removeExercise(exIndex);
      }
    });

    exerciseList.addEventListener("input", (event) => {
      if (isLogLocked()) return;
      const target = event.target;
      const exIndex = Number(target.dataset.exIndex);
      const setIndex = Number(target.dataset.setIndex);

      if (target.classList.contains("exercise-name")) {
        const draft = getDraft(getActiveWorkoutDateKey());
        if (!draft.exercises[exIndex]) return;
        const nextName = target.value.slice(0, 60);
        draft.exercises[exIndex].name = nextName;
        draft.exercises[exIndex].bodyParts = deriveBodyParts(nextName);
        scheduleSave();
        return;
      }

      if (target.classList.contains("set-input")) {
        const draft = getDraft(getActiveWorkoutDateKey());
        if (!draft.exercises[exIndex] || !draft.exercises[exIndex].sets[setIndex]) return;
        const field = target.dataset.field;
        const parsed = field === "reps" ? parseInt(target.value, 10) : parseFloat(target.value);
        draft.exercises[exIndex].sets[setIndex][field] = Number.isFinite(parsed) ? parsed : null;
        scheduleSave();
      }
    });
  }

  if (saveWorkoutBtn) {
    saveWorkoutBtn.addEventListener("click", () => saveWorkout());
  }

  if (saveWeightBtn) {
    saveWeightBtn.addEventListener("click", () => saveWeight());
  }

  if (liveStartBtn) {
    liveStartBtn.addEventListener("click", () => toggleLiveSession());
  }

  if (liveSplitToggle) {
    liveSplitToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => setLiveSplit(btn.dataset.split));
    });
  }

  if (liveMuscleChips) {
    liveMuscleChips.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-body]");
      if (!btn) return;
      setLiveMuscle(btn.dataset.body);
    });
  }

  if (liveMuscleSelect) {
    liveMuscleSelect.addEventListener("change", () => {
      setLiveMuscle(liveMuscleSelect.value);
    });
  }

  if (liveAddExerciseBtn) {
    liveAddExerciseBtn.addEventListener("click", () => addLiveExerciseFromPicker());
  }

  if (liveExercisePicker) {
    liveExercisePicker.addEventListener("change", () => {
      if (liveAddExerciseBtn) {
        liveAddExerciseBtn.disabled = !liveExercisePicker.value;
      }
    });
  }

  if (liveSaveBtn) {
    liveSaveBtn.addEventListener("click", () => saveLiveSession());
  }

  if (liveExerciseList) {
    liveExerciseList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.disabled) return;
      const action = btn.dataset.action;
      const exIndex = Number(btn.dataset.exIndex);
      const setIndex = Number(btn.dataset.setIndex);

      if (action === "toggle-exercise") {
        state.ui.expandedExercise = exIndex;
        saveState();
        renderLiveSession();
        return;
      }

      if (action === "add-set") {
        addSet(exIndex, false, getLiveDateKey(), renderLiveSession);
        return;
      }

      if (action === "remove-set") {
        removeSet(exIndex, setIndex, getLiveDateKey(), renderLiveSession);
        return;
      }

      if (action === "remove-exercise") {
        removeExercise(exIndex, getLiveDateKey(), renderLiveSession);
      }
    });

    liveExerciseList.addEventListener("input", (event) => {
      if (isLogLocked()) return;
      const target = event.target;
      const exIndex = Number(target.dataset.exIndex);
      const setIndex = Number(target.dataset.setIndex);
      const dateKey = getLiveDateKey();

      if (target.classList.contains("exercise-name")) {
        const draft = getDraft(dateKey);
        if (!draft.exercises[exIndex]) return;
        const nextName = target.value.slice(0, 60);
        draft.exercises[exIndex].name = nextName;
        draft.exercises[exIndex].bodyParts = deriveBodyParts(nextName);
        scheduleSave();
        return;
      }

      if (target.classList.contains("set-input")) {
        const draft = getDraft(dateKey);
        if (!draft.exercises[exIndex] || !draft.exercises[exIndex].sets[setIndex]) return;
        const field = target.dataset.field;
        const parsed = field === "reps" ? parseInt(target.value, 10) : parseFloat(target.value);
        draft.exercises[exIndex].sets[setIndex][field] = Number.isFinite(parsed) ? parsed : null;
        scheduleSave();
      }
    });
  }

  if (progressMetric) {
    progressMetric.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.metric = btn.dataset.metric;
        saveState();
        renderProgress();
      });
    });
  }

  if (insightIntensityToggle) {
    insightIntensityToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.user.insightIntensity = btn.dataset.intensity || "strict";
        saveState();
        scheduleProfileSync();
        renderProgress();
      });
    });
  }

  if (progressBodySelect) {
    progressBodySelect.addEventListener("change", () => {
      state.ui.progressBody = progressBodySelect.value;
      saveState();
      renderProgress();
    });
  }

  if (progressDetailBtn) {
    progressDetailBtn.addEventListener("click", () => {
      if (!progressDetail) return;
      progressDetail.hidden = !progressDetail.hidden;
    });
  }

  if (createGroupBtn) {
    createGroupBtn.addEventListener("click", () => openGroupModal());
  }

  if (groupModalClose) {
    groupModalClose.addEventListener("click", () => closeGroupModal());
  }

  if (groupCreateSubmit) {
    groupCreateSubmit.addEventListener("click", () => createGroup());
  }

  if (groupList) {
    groupList.addEventListener("click", (event) => {
      const card = event.target.closest(".group-card");
      if (!card) return;
      state.ui.selectedGroupId = card.dataset.groupId;
      saveState();
      renderGroups();
      renderToday();
    });
  }

  if (groupMetricToggle) {
    groupMetricToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.groupMetric = btn.dataset.metric;
        saveState();
        renderGroups();
      });
    });
  }

  if (groupRangeToggle) {
    groupRangeToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.groupRange = Number(btn.dataset.range);
        saveState();
        renderGroups();
      });
    });
  }

  if (groupFilterToggle) {
    groupFilterToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.groupFilter = btn.dataset.filter;
        saveState();
        renderGroups();
      });
    });
  }

  if (groupMessageBtn) {
    groupMessageBtn.addEventListener("click", () => addGroupMessage());
  }

  if (memberSearchBtn) {
    memberSearchBtn.addEventListener("click", () => searchMembers());
  }

  if (memberSearchInput) {
    memberSearchInput.addEventListener("input", () => {
      queueMemberSearch();
    });
    memberSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchMembers();
      }
    });
  }

  if (memberSearchResults) {
    memberSearchResults.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "add-member") {
        addGroupMember(btn.dataset.userId, btn.dataset.displayName, btn.dataset.username);
      }
    });
  }

  if (leaveGroupBtn) {
    leaveGroupBtn.addEventListener("click", () => leaveGroup());
  }

  if (feedList) {
    feedList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.feedId;
      if (!id) return;
      if (btn.dataset.action === "like") {
        toggleLike(id);
      }
      if (btn.dataset.action === "comment") {
        state.ui.commentOpenId = state.ui.commentOpenId === id ? null : id;
        saveState();
        renderFeed();
      }
      if (btn.dataset.action === "submit-comment") {
        submitComment(id);
      }
    });
  }

  if (goalOptions) {
    goalOptions.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => selectGoal(btn.dataset.value, btn));
    });
  }

  if (frequencyOptions) {
    frequencyOptions.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => selectFrequency(btn.dataset.value, btn));
    });
  }

  if (onboardingBackBtn) {
    onboardingBackBtn.addEventListener("click", () => stepOnboarding(-1));
  }

  if (onboardingNextBtn) {
    onboardingNextBtn.addEventListener("click", () => stepOnboarding(1));
  }

  if (onboardingSkipBtn) {
    onboardingSkipBtn.addEventListener("click", () => skipOnboarding());
  }
}

function renderAll() {
  renderNav();
  renderToday();
  renderLog();
  renderWorkoutHistory();
  renderLiveSession();
  renderProgress();
  renderGroups();
  renderFeed();
  renderRail();
}

function initFilters() {
  if (!state.ui.exerciseBody) state.ui.exerciseBody = "all";
  if (!state.ui.progressBody) state.ui.progressBody = "all";
  if (!state.ui.exerciseSearch) state.ui.exerciseSearch = "";
  renderBodyChips();

  if (newExerciseBody) {
    const options = BODY_PART_OPTIONS.map((label) => {
      const value = normalizeFilterValue(label);
      return `<option value="${value}">${label}</option>`;
    }).join("");
    newExerciseBody.innerHTML = `<option value="" disabled selected>Add muscle category</option>${options}`;
    newExerciseBody.value = "";
  }

  if (liveMuscleSelect) {
    const options = BODY_PART_OPTIONS.filter((label) => label !== "All").map((label) => {
      const value = normalizeFilterValue(label);
      return `<option value="${value}">${label}</option>`;
    }).join("");
    liveMuscleSelect.innerHTML = `<option value="">Select a muscle</option>${options}`;
    liveMuscleSelect.value = "";
  }

  if (progressBodySelect) {
    progressBodySelect.innerHTML = BODY_PART_OPTIONS.map((label) => {
      const value = normalizeFilterValue(label);
      return `<option value="${value}">${label}</option>`;
    }).join("");
    progressBodySelect.value = state.ui.progressBody || "all";
  }

  if (exerciseSearchInput && state.ui.exerciseSearch) {
    exerciseSearchInput.value = state.ui.exerciseSearch;
  }

  renderExerciseLibrary();
  saveState();
}

function renderBodyChips() {
  if (!exerciseBodyChips) return;
  const active = state.ui.exerciseBody || "all";
  exerciseBodyChips.innerHTML = BODY_PART_OPTIONS.map((label) => {
    const value = normalizeFilterValue(label);
    const isActive = value === active;
    return `<button class="chip-btn ${isActive ? "active" : ""}" data-body="${value}">${label}</button>`;
  }).join("");
}

function renderNav() {
  const activeTab = state.ui.activeTab || "today";
  navButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  tabPanels.forEach((panel) => {
    const isActive = panel.id === `tab-${activeTab}`;
    panel.classList.toggle("active", isActive);
  });
}

function renderToday() {
  if (todayGreetingEl) todayGreetingEl.textContent = buildGreeting();
  if (todayDateEl) todayDateEl.textContent = formatDateLong(new Date());

  const streak = computeStreak();
  if (streakPill) streakPill.textContent = `Streak: ${streak} ${streak === 1 ? "day" : "days"}`;

  if (todayFocusText) {
    todayFocusText.textContent = state.user.todayFocus || "No plan yet. Choose a focus or log anything.";
  }

  const workoutsThisWeek = countWorkoutsInRange(6);
  const weeklyGoal = weeklyGoalFromFrequency(state.user.frequency);
  if (statWorkouts) statWorkouts.textContent = String(workoutsThisWeek);
  if (statWorkoutsMeta) statWorkoutsMeta.textContent = weeklyGoal ? `Goal: ${weeklyGoal}` : "Set a weekly goal";

  const weightDelta = calcWeightTrend(7);
  if (statWeight) {
    statWeight.textContent = formatSignedWeight(weightDelta);
  }
  if (statWeightMeta) {
    statWeightMeta.textContent = weightDelta === null ? "Log weight to see trend" : "Last 7 days";
  }

  const lastWorkout = getLatestWorkoutLog();
  if (statLastWorkout) {
    statLastWorkout.textContent = lastWorkout ? (lastWorkout.name || "Workout") : "--";
  }
  if (statLastWorkoutMeta) {
    statLastWorkoutMeta.textContent = lastWorkout ? formatDateShort(new Date(lastWorkout.date + "T00:00:00")) : "No recent workout";
  }

  if (groupUpdateText) {
    groupUpdateText.textContent = buildGroupUpdate();
  }
}

function renderLog() {
  const mode = state.ui.logMode || "workout";
  if (logMode) {
    logMode.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  const lockMessage = logLockMessage();
  const locked = !!lockMessage;
  if (logAuthNotice) {
    if (!lockMessage) {
      logAuthNotice.textContent = "";
      logAuthNotice.hidden = true;
    } else if (!authUser && supabaseEnabled()) {
      logAuthNotice.innerHTML = `Sign in to log workouts and weight. <button class="link-btn" id="logAuthLink" type="button">Login here</button>`;
      logAuthNotice.hidden = false;
    } else {
      logAuthNotice.textContent = lockMessage;
      logAuthNotice.hidden = false;
    }
  }
  setLogControlsDisabled(locked);
  if (locked) {
    if (workoutNameInput) workoutNameInput.value = "";
    if (weightInput) weightInput.value = "";
    if (weightNote) weightNote.value = "";
    if (morningToggle) morningToggle.checked = false;
  }

  if (workoutLogPanel) workoutLogPanel.hidden = mode !== "workout";
  if (weightLogPanel) weightLogPanel.hidden = mode !== "weight";

  if (mode === "workout") {
    const activeDate = getActiveWorkoutDateKey();
    if (workoutDateInput && workoutDateInput.value !== activeDate) {
      workoutDateInput.value = activeDate;
    }
    if (!locked) {
      const draft = getDraft(activeDate);
      if (workoutNameInput && document.activeElement !== workoutNameInput) {
        workoutNameInput.value = draft.name || "";
      }
      renderExerciseList(draft);
    } else if (exerciseList) {
      exerciseList.innerHTML = "<p class=\"note\">Sign in to log workouts.</p>";
    }
    renderExerciseLibrary();
  }

  if (mode === "weight") {
    if (!locked) {
      const log = state.weightLogs[todayKey()];
      if (weightInput) weightInput.value = log ? formatWeight(log.weightLb) : formatWeight(getLastWeight());
      if (weightNote) weightNote.value = log ? log.note || "" : "";
      if (morningToggle) morningToggle.checked = log ? !!log.isMorning : !!state.user.prefersMorning;
    }
  }

  if (weightUnitLabel) weightUnitLabel.textContent = state.user.units === "kg" ? "kg" : "lb";
}

function renderWorkoutHistory() {
  if (!workoutHistoryList) return;
  const logs = Object.values(state.workoutLogs || {});
  if (!logs.length) {
    workoutHistoryList.innerHTML = "<p class=\"note\">No workouts logged yet.</p>";
    return;
  }
  logs.sort((a, b) => b.date.localeCompare(a.date));
  const limit = 20;
  const rows = logs.slice(0, limit).map((log) => {
    const dateLabel = formatDateShort(new Date(log.date + "T00:00:00"));
    const sets = countSets(log);
    const volume = formatVolume(workoutVolume(log, "all"));
    const splitLabel = log.splitType ? getSplitLabel(log.splitType) : "";
    const exercises = (log.exercises || []).map((ex) => {
      const setsText = (ex.sets || []).map((set, idx) => {
        const reps = Number.isFinite(set.reps) ? set.reps : 0;
        const weight = Number.isFinite(set.weight) ? set.weight : 0;
        const weightText = weight ? `${formatInputValue(weight)} ${state.user.units}` : "";
        return `Set ${idx + 1}: ${reps || "-"} reps${weightText ? ` @ ${weightText}` : ""}`;
      }).join(" | ");
      return `
        <div class="history-ex">
          <div class="history-ex-title">${escapeHtml(ex.name || "Exercise")}</div>
          <div class="history-ex-sets">${escapeHtml(setsText || "No sets recorded.")}</div>
        </div>
      `;
    }).join("");
    return `
      <details class="history-item">
        <summary>
          <div class="history-title">${escapeHtml(log.name || "Workout")} <span class="history-meta">(${dateLabel})</span></div>
          <div class="history-meta">${splitLabel ? `${splitLabel} | ` : ""}${sets} sets | ${volume}</div>
        </summary>
        <div class="history-body">${exercises || "<p class=\"note\">No exercises logged.</p>"}</div>
      </details>
    `;
  });
  const suffix = logs.length > limit
    ? `<p class="note">Showing latest ${limit} of ${logs.length} workouts.</p>`
    : "";
  workoutHistoryList.innerHTML = rows.join("") + suffix;
}

function getSplitLabel(split) {
  const key = String(split || "").toLowerCase();
  const config = LIVE_SPLITS[key];
  return config ? config.label : "";
}

function toggleLiveSession() {
  const next = !state.ui.liveStarted;
  state.ui.liveStarted = next;
  state.ui.liveDate = todayKey();
  if (next) {
    resetDraftForDate(getLiveDateKey());
    if (!state.ui.liveSplit) state.ui.liveSplit = "push";
    const config = getLiveSplitConfig();
    if (state.ui.liveSplit === "custom") {
      state.ui.liveMuscle = "";
    } else if (config && config.primary.length) {
      const first = normalizeFilterValue(config.primary[0]);
      if (!state.ui.liveMuscle || !config.primary.map(normalizeFilterValue).includes(state.ui.liveMuscle)) {
        state.ui.liveMuscle = first;
      }
    }
  } else {
    state.ui.liveSplit = "";
    state.ui.liveMuscle = "";
  }
  saveState();
  renderLiveSession();
}

function setLiveSplit(split) {
  if (!split) return;
  state.ui.liveSplit = split;
  const config = getLiveSplitConfig();
  if (split === "custom") {
    state.ui.liveMuscle = "";
  } else if (config && config.primary.length) {
    state.ui.liveMuscle = normalizeFilterValue(config.primary[0]);
  }
  saveState();
  renderLiveSession();
}

function setLiveMuscle(muscle) {
  state.ui.liveMuscle = (muscle || "").trim();
  saveState();
  renderLiveSession();
}

function getLiveSplitConfig() {
  const key = String(state.ui.liveSplit || "").toLowerCase();
  return LIVE_SPLITS[key] || null;
}

function getLivePairings(muscle) {
  const key = normalizeFilterValue(muscle);
  return MUSCLE_PAIRINGS[key] || [];
}

function renderLiveSession() {
  if (!liveSetup || !liveStartBtn) return;
  const locked = isLogLocked();
  const started = !!state.ui.liveStarted;
  liveSetup.hidden = !started;
  liveStartBtn.textContent = started ? "End Session" : "Start Session";
  if (liveStatusText) {
    liveStatusText.textContent = started
      ? "Select a split, then log sets as you go."
      : "Log as you lift with smart muscle pairings.";
  }
  if (!started) return;

  if (!state.ui.liveSplit) state.ui.liveSplit = "push";
  const split = state.ui.liveSplit;
  const config = getLiveSplitConfig();

  if (liveSplitToggle) {
    liveSplitToggle.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.split === split;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  const isCustom = split === "custom";
  if (liveMuscleSelect) {
    liveMuscleSelect.hidden = !isCustom;
  }

  if (liveMuscleChips) {
    if (isCustom) {
      liveMuscleChips.innerHTML = "";
    } else if (config) {
      const active = state.ui.liveMuscle;
      liveMuscleChips.innerHTML = config.primary.map((label) => {
        const value = normalizeFilterValue(label);
        const isActive = value === active;
        return `<button class="chip-btn ${isActive ? "active" : ""}" data-body="${value}">${label}</button>`;
      }).join("");
    }
  }

  if (!isCustom && config && config.primary.length) {
    const primaryNormalized = config.primary.map(normalizeFilterValue);
    if (!state.ui.liveMuscle || !primaryNormalized.includes(state.ui.liveMuscle)) {
      state.ui.liveMuscle = primaryNormalized[0];
    }
  }

  if (isCustom && liveMuscleSelect) {
    liveMuscleSelect.value = state.ui.liveMuscle || "";
  }

  if (livePairingNote) {
    if (isCustom) {
      if (!state.ui.liveMuscle) {
        livePairingNote.textContent = "Pick a muscle to see pairings.";
      } else {
        const pairings = getLivePairings(state.ui.liveMuscle);
        livePairingNote.textContent = pairings.length
          ? `Pairs well with: ${pairings.join(" + ")}.`
          : "No pairing suggestions.";
      }
    } else if (config) {
      const primary = config.primary.join(" + ");
      const secondary = config.secondary.length ? ` | Secondary: ${config.secondary.join(" + ")}` : "";
      livePairingNote.textContent = `Primary: ${primary}${secondary}.`;
    }
  }

  renderLiveExercisePicker(locked);
  renderLiveExerciseList();
}

function renderLiveExercisePicker(locked) {
  if (!liveExercisePicker) return;
  const muscle = state.ui.liveMuscle || "";
  if (!muscle) {
    liveExercisePicker.innerHTML = "<option value=\"\">Select a muscle first</option>";
    if (liveExerciseNote) liveExerciseNote.textContent = "Pick a muscle to see exercises.";
    if (liveAddExerciseBtn) liveAddExerciseBtn.disabled = true;
    return;
  }

  const filters = [muscle];
  if (state.ui.liveSplit === "custom") {
    const pairings = getLivePairings(muscle).map(normalizeFilterValue);
    pairings.forEach((pair) => {
      if (!filters.includes(pair)) filters.push(pair);
    });
  }

  const matches = EXERCISE_LIBRARY.filter((item) => {
    return filters.some((filter) => matchesBodyFilter(item.bodyParts, filter));
  }).sort((a, b) => a.name.localeCompare(b.name));

  if (!matches.length) {
    liveExercisePicker.innerHTML = "<option value=\"\">No exercises found</option>";
    if (liveExerciseNote) liveExerciseNote.textContent = "No exercises match those muscles.";
    if (liveAddExerciseBtn) liveAddExerciseBtn.disabled = true;
    return;
  }

  const options = matches.slice(0, 40).map((item) => {
    const tags = item.bodyParts.join(" / ");
    const label = tags ? `${item.name} - ${tags}` : item.name;
    return `<option value="${escapeHtml(item.name)}">${escapeHtml(label)}</option>`;
  });
  liveExercisePicker.innerHTML = `<option value="">Select an exercise</option>${options.join("")}`;
  if (liveExerciseNote) {
    liveExerciseNote.textContent = state.ui.liveSplit === "custom"
      ? "Includes pairings to balance your session."
      : "Select an exercise and tap Add.";
  }
  if (liveAddExerciseBtn) {
    liveAddExerciseBtn.disabled = locked || !liveExercisePicker.value;
  }
}

function renderLiveExerciseList() {
  if (!liveExerciseList) return;
  const locked = isLogLocked();
  const draft = getDraft(getLiveDateKey());
  if (!draft.name) {
    const config = getLiveSplitConfig();
    if (config) draft.name = `${config.label} Session`;
  }
  applyLiveMetaToDraft(draft);

  if (!draft.exercises.length) {
    liveExerciseList.innerHTML = locked
      ? "<p class=\"note\">Sign in to log workouts.</p>"
      : "<p class=\"note\">Add an exercise to start logging live sets.</p>";
    return;
  }

  if (state.ui.expandedExercise === null || state.ui.expandedExercise >= draft.exercises.length) {
    state.ui.expandedExercise = 0;
  }

  const disabledAttr = locked ? "disabled" : "";
  liveExerciseList.innerHTML = draft.exercises.map((ex, exIndex) => {
    const isExpanded = state.ui.expandedExercise === exIndex;
    const bodyParts = ex.bodyParts && ex.bodyParts.length ? ex.bodyParts : deriveBodyParts(ex.name);
    if (!ex.bodyParts || !ex.bodyParts.length) {
      ex.bodyParts = bodyParts;
    }
    const tags = bodyParts.length ? `<div class="exercise-tags">${escapeHtml(bodyParts.join(" / "))}</div>` : "";
    const setsHtml = ex.sets.map((set, setIndex) => {
      const isNew = state.ui.newSet && state.ui.newSet.exIndex === exIndex && state.ui.newSet.setIndex === setIndex;
      return `
        <div class="set-row ${isNew ? "slide-in" : ""}" data-ex-index="${exIndex}" data-set-index="${setIndex}">
          <div class="set-label">Set ${setIndex + 1}</div>
          <input class="inputText set-input" data-field="reps" data-ex-index="${exIndex}" data-set-index="${setIndex}" inputmode="numeric" placeholder="Reps" value="${formatInputValue(set.reps)}" ${disabledAttr} />
          <input class="inputText set-input" data-field="weight" data-ex-index="${exIndex}" data-set-index="${setIndex}" inputmode="decimal" placeholder="Weight" value="${formatInputValue(formatWeightInput(set.weight))}" ${disabledAttr} />
          <button class="btn ghost" data-action="remove-set" data-ex-index="${exIndex}" data-set-index="${setIndex}" ${disabledAttr}>Remove</button>
        </div>
      `;
    }).join("");

    return `
      <div class="exercise-card ${isExpanded ? "" : "collapsed"}" data-ex-index="${exIndex}">
        <div class="exercise-header">
          <div class="exercise-title">
            <button class="exercise-toggle" data-action="toggle-exercise" data-ex-index="${exIndex}" ${disabledAttr}>${escapeHtml(ex.name || `Exercise ${exIndex + 1}`)}</button>
            <span class="exercise-sub">${ex.sets.length} sets</span>
          </div>
          <button class="btn ghost" data-action="remove-exercise" data-ex-index="${exIndex}" ${disabledAttr}>Remove</button>
        </div>
        <div class="exercise-body">
          <input class="inputText exercise-name" data-ex-index="${exIndex}" placeholder="Exercise name" value="${escapeHtml(ex.name || "")}" ${disabledAttr} />
          ${tags}
          <div class="set-list">${setsHtml}</div>
          <button class="btn ghost" data-action="add-set" data-ex-index="${exIndex}" ${disabledAttr}>Add Set</button>
        </div>
      </div>
    `;
  }).join("");

  state.ui.newSet = null;
}

function applyLiveMetaToDraft(draft) {
  if (!draft || !state.ui.liveSplit) return;
  const split = state.ui.liveSplit;
  const config = getLiveSplitConfig();
  let primary = [];
  let secondary = [];
  if (split === "custom") {
    if (state.ui.liveMuscle) primary = [labelFromFilter(state.ui.liveMuscle)];
    secondary = getLivePairings(state.ui.liveMuscle);
  } else if (config) {
    primary = config.primary || [];
    secondary = config.secondary || [];
  }
  draft.splitType = split;
  draft.primaryMuscles = primary;
  draft.secondaryMuscles = secondary;
}

function addLiveExerciseFromPicker() {
  if (isLogLocked()) {
    toast("Sign in to add exercises.");
    return;
  }
  if (!liveExercisePicker) return;
  const name = (liveExercisePicker.value || "").trim();
  if (!name) {
    toast("Select an exercise first.");
    return;
  }
  addExerciseFromLibrary(name, getLiveDateKey(), renderLiveSession);
}

function saveLiveSession() {
  if (!requireAuth("Sign in to save live sessions.")) return;
  const dateKey = getLiveDateKey();
  applyLiveMetaToDraft(getDraft(dateKey));
  saveWorkoutForDate(dateKey, renderLiveSession, "live");
  resetLiveSession();
}

function resetLiveSession() {
  state.ui.liveStarted = false;
  state.ui.liveSplit = "";
  state.ui.liveMuscle = "";
  state.ui.liveDate = todayKey();
  state.ui.expandedExercise = null;
  resetDraftForDate(getLiveDateKey());
  saveState();
  renderLiveSession();
}

function renderExerciseList(draft) {
  if (!exerciseList) return;
  const locked = isLogLocked();
  if (!draft.exercises.length) {
    exerciseList.innerHTML = locked
      ? "<p class=\"note\">Sign in to log workouts.</p>"
      : "<p class=\"note\">No exercises yet. Add one below to start logging sets.</p>";
    return;
  }

  if (state.ui.expandedExercise === null || state.ui.expandedExercise >= draft.exercises.length) {
    state.ui.expandedExercise = 0;
  }

  const disabledAttr = locked ? "disabled" : "";
  exerciseList.innerHTML = draft.exercises.map((ex, exIndex) => {
    const isExpanded = state.ui.expandedExercise === exIndex;
    const bodyParts = ex.bodyParts && ex.bodyParts.length ? ex.bodyParts : deriveBodyParts(ex.name);
    if (!ex.bodyParts || !ex.bodyParts.length) {
      ex.bodyParts = bodyParts;
    }
    const tags = bodyParts.length ? `<div class="exercise-tags">${escapeHtml(bodyParts.join(" / "))}</div>` : "";
    const setsHtml = ex.sets.map((set, setIndex) => {
      const isNew = state.ui.newSet && state.ui.newSet.exIndex === exIndex && state.ui.newSet.setIndex === setIndex;
      return `
        <div class="set-row ${isNew ? "slide-in" : ""}" data-ex-index="${exIndex}" data-set-index="${setIndex}">
          <div class="set-label">Set ${setIndex + 1}</div>
          <input class="inputText set-input" data-field="reps" data-ex-index="${exIndex}" data-set-index="${setIndex}" inputmode="numeric" placeholder="Reps" value="${formatInputValue(set.reps)}" ${disabledAttr} />
          <input class="inputText set-input" data-field="weight" data-ex-index="${exIndex}" data-set-index="${setIndex}" inputmode="decimal" placeholder="Weight" value="${formatInputValue(formatWeightInput(set.weight))}" ${disabledAttr} />
          <button class="btn ghost" data-action="remove-set" data-ex-index="${exIndex}" data-set-index="${setIndex}" ${disabledAttr}>Remove</button>
        </div>
      `;
    }).join("");

    return `
      <div class="exercise-card ${isExpanded ? "" : "collapsed"}" data-ex-index="${exIndex}">
        <div class="exercise-header">
          <div class="exercise-title">
            <button class="exercise-toggle" data-action="toggle-exercise" data-ex-index="${exIndex}" ${disabledAttr}>${escapeHtml(ex.name || `Exercise ${exIndex + 1}`)}</button>
            <span class="exercise-sub">${ex.sets.length} sets</span>
          </div>
          <button class="btn ghost" data-action="remove-exercise" data-ex-index="${exIndex}" ${disabledAttr}>Remove</button>
        </div>
        <div class="exercise-body">
          <input class="inputText exercise-name" data-ex-index="${exIndex}" placeholder="Exercise name" value="${escapeHtml(ex.name || "")}" ${disabledAttr} />
          ${tags}
          <div class="set-list">${setsHtml}</div>
          <button class="btn ghost" data-action="add-set" data-ex-index="${exIndex}" ${disabledAttr}>Add Set</button>
        </div>
      </div>
    `;
  }).join("");

  state.ui.newSet = null;
}

function getActiveWorkoutDateKey() {
  const selected = (state.ui.logDate || "").trim();
  if (selected) return selected;
  return todayKey();
}

function getLiveDateKey() {
  const selected = (state.ui.liveDate || "").trim();
  if (selected) return selected;
  return todayKey();
}

function renderExerciseLibrary() {
  if (!exercisePicker) return;
  const locked = isLogLocked();
  const search = normalizeName(state.ui.exerciseSearch || "");
  const bodyFilter = (state.ui.exerciseBody || "all").toLowerCase();

  const matches = EXERCISE_LIBRARY.filter((item) => {
    if (search && !normalizeName(item.name).includes(search)) return false;
    if (bodyFilter !== "all" && !matchesBodyFilter(item.bodyParts, bodyFilter)) return false;
    return true;
  });
  matches.sort((a, b) => a.name.localeCompare(b.name));

  if (!matches.length) {
    exercisePicker.innerHTML = `<option value="">No exercises found</option>`;
    if (exercisePickerNote) {
      exercisePickerNote.textContent = locked
        ? "Sign in to add exercises."
        : "No exercises match those filters.";
    }
    if (addExerciseFromPickerBtn) addExerciseFromPickerBtn.disabled = true;
    return;
  }

  const options = matches.map((item) => {
    const tags = item.bodyParts.join(" / ");
    const label = tags ? `${item.name} - ${tags}` : item.name;
    return `<option value="${escapeHtml(item.name)}">${escapeHtml(label)}</option>`;
  });
  exercisePicker.innerHTML = `<option value="">Select an exercise</option>${options.join("")}`;
  if (exercisePickerNote) {
    exercisePickerNote.textContent = locked
      ? "Sign in to add exercises."
      : "Select an exercise and tap Add.";
  }
  if (addExerciseFromPickerBtn) {
    addExerciseFromPickerBtn.disabled = locked || !exercisePicker.value;
  }
  if (!locked && exercisePicker.options.length) {
    exercisePicker.selectedIndex = 0;
  }
}

function getInsightProfile() {
  const key = state.user.insightIntensity === "aggressive" || state.user.insightIntensity === "coach" ? "aggressive" : "strict";
  return INSIGHT_PROFILES[key];
}

function getProgressBodyParts() {
  return BODY_PART_OPTIONS
    .filter((label) => label !== "All")
    .map((label) => normalizeFilterValue(label));
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekKeys(weeksBack) {
  const keys = [];
  const base = startOfWeek(new Date());
  for (let i = weeksBack - 1; i >= 0; i -= 1) {
    const next = new Date(base);
    next.setDate(base.getDate() - i * 7);
    keys.push(formatDateKey(next));
  }
  return keys;
}

function getSortedWeightLogs() {
  const logs = Object.values(state.weightLogs || {});
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs;
}

function getWeightForDate(dateKey, logs) {
  const weightLogs = logs || getSortedWeightLogs();
  if (!weightLogs.length) return null;
  for (let i = weightLogs.length - 1; i >= 0; i -= 1) {
    if (weightLogs[i].date <= dateKey) return weightLogs[i].weightLb;
  }
  return weightLogs[0].weightLb;
}

function isBodyweightExercise(exercise) {
  const meta = findExerciseMeta(exercise.name || "");
  if (meta && Array.isArray(meta.categories)) {
    return meta.categories.some((cat) => normalizeFilterValue(cat) === "bodyweight");
  }
  const name = normalizeName(exercise.name || "");
  return ["pushup", "situp", "lunge", "plank", "burpee", "mountain", "jumping jack"].some((token) => name.includes(token));
}

function isWorkingSet(set, exercise) {
  const reps = Number(set.reps) || 0;
  const weight = Number(set.weight) || 0;
  if (reps < 3) return false;
  if (weight > 0) return true;
  return isBodyweightExercise(exercise);
}

function getEffectiveSetWeight(set, exercise, bodyweight) {
  const weight = Number(set.weight) || 0;
  if (weight > 0) return weight;
  if (isBodyweightExercise(exercise) && Number.isFinite(bodyweight) && bodyweight > 0) return bodyweight;
  return 0;
}

function getBodyPartWeights(exercise) {
  let parts = exercise.bodyParts && exercise.bodyParts.length ? exercise.bodyParts : deriveBodyParts(exercise.name);
  parts = parts.filter((part) => part && part !== "All");
  if (!parts.length) return [{ part: "other", weight: 1 }];
  const normalized = parts.map((part) => normalizeFilterValue(part));
  if (normalized.length === 1 && normalized[0] === "full body") {
    const fullParts = ["chest", "back", "legs", "shoulders", "core"];
    const weight = 1 / fullParts.length;
    return fullParts.map((part) => ({ part, weight }));
  }
  if (normalized.length === 1) return [{ part: normalized[0], weight: 1 }];
  const primary = normalized[0];
  const secondary = normalized.slice(1);
  const secondaryWeight = secondary.length ? 0.4 / secondary.length : 0;
  return [
    { part: primary, weight: 0.6 },
    ...secondary.map((part) => ({ part, weight: secondaryWeight }))
  ];
}

function computeSessionStats(log, weightLogs) {
  const bodyweight = getWeightForDate(log.date, weightLogs) || state.user.startingWeightLb || 0;
  const bodyStats = {};
  const repBuckets = { low: 0, mid: 0, high: 0, total: 0 };
  const exercises = [];
  let totalSets = 0;
  let totalTonnage = 0;
  let exercisesCount = 0;
  let hasMainLift = false;
  let hasMissingBodyPart = false;
  let hasBodyweightNoReps = false;
  let loadedZeroWeight = false;

  (log.exercises || []).forEach((ex) => {
    const allSets = ex.sets || [];
    const workingSets = allSets.filter((set) => isWorkingSet(set, ex));
    if (!workingSets.length) return;
    exercisesCount += 1;
    const bodyWeights = getBodyPartWeights(ex);
    const partList = bodyWeights.map((item) => item.part);
    let exerciseSets = 0;
    let exerciseReps = 0;
    let exerciseTonnage = 0;
    let bestE1RM = 0;
    let totalLoad = 0;
    let weightTotal = 0;
    let usedZeroWeight = false;
    if (isBodyweightExercise(ex) && allSets.some((set) => (Number(set.reps) || 0) === 0)) {
      hasBodyweightNoReps = true;
    }
    if (!isBodyweightExercise(ex) && allSets.some((set) => (Number(set.weight) || 0) === 0 && (Number(set.reps) || 0) > 0)) {
      usedZeroWeight = true;
    }
    allSets.forEach((set) => {
      const reps = Number(set.reps) || 0;
      const rawWeight = Number(set.weight) || 0;
      if (rawWeight <= 0 || reps < 1 || reps > 12) return;
      const e1rm = rawWeight * (1 + reps / 30);
      if (e1rm > bestE1RM) bestE1RM = e1rm;
    });
    workingSets.forEach((set) => {
      const reps = Number(set.reps) || 0;
      const rawWeight = Number(set.weight) || 0;
      const effectiveWeight = getEffectiveSetWeight(set, ex, bodyweight);
      exerciseSets += 1;
      exerciseReps += reps;
      const tonnage = reps * effectiveWeight;
      exerciseTonnage += tonnage;
      totalLoad += tonnage;
      weightTotal += reps;
      repBuckets.total += 1;
      if (reps <= 5) repBuckets.low += 1;
      else if (reps <= 12) repBuckets.mid += 1;
      else repBuckets.high += 1;
    });
    if (exerciseSets >= 3) hasMainLift = true;
    if (usedZeroWeight) loadedZeroWeight = true;
    if (!ex.bodyParts || !ex.bodyParts.length || ex.bodyParts.includes("Other")) {
      hasMissingBodyPart = true;
    }
    totalSets += exerciseSets;
    totalTonnage += exerciseTonnage;
    const avgLoad = weightTotal ? totalLoad / weightTotal : 0;
    exercises.push({
      name: ex.name || "Exercise",
      sets: exerciseSets,
      reps: exerciseReps,
      tonnage: exerciseTonnage,
      e1rm: bestE1RM,
      avgLoad,
      bodyParts: partList
    });
    bodyWeights.forEach(({ part, weight }) => {
      if (!bodyStats[part]) bodyStats[part] = { sets: 0, tonnage: 0 };
      bodyStats[part].sets += exerciseSets * weight;
      bodyStats[part].tonnage += exerciseTonnage * weight;
    });
  });

  return {
    date: log.date,
    totalSets,
    totalTonnage,
    exercises,
    exercisesCount,
    bodyStats,
    repBuckets,
    hasMainLift,
    hasMissingBodyPart,
    hasBodyweightNoReps,
    loadedZeroWeight
  };
}

function collectSessionStats(weightLogs) {
  const sessions = Object.values(state.workoutLogs || {})
    .map((log) => computeSessionStats(log, weightLogs))
    .filter((session) => session.totalSets > 0);
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return sessions;
}

function buildWeeklyStats(sessions, weeksBack) {
  const weekKeys = buildWeekKeys(weeksBack);
  const weeks = {};
  weekKeys.forEach((key) => {
    weeks[key] = {
      key,
      workouts: 0,
      totalSets: 0,
      totalTonnage: 0,
      bodySets: {},
      bodyTonnage: {},
      bodyDays: {}
    };
  });
  sessions.forEach((session) => {
    const weekKey = formatDateKey(startOfWeek(new Date(session.date + "T00:00:00")));
    const entry = weeks[weekKey];
    if (!entry) return;
    entry.workouts += 1;
    entry.totalSets += session.totalSets;
    entry.totalTonnage += session.totalTonnage;
    Object.entries(session.bodyStats || {}).forEach(([part, stats]) => {
      entry.bodySets[part] = (entry.bodySets[part] || 0) + stats.sets;
      entry.bodyTonnage[part] = (entry.bodyTonnage[part] || 0) + stats.tonnage;
      if (!entry.bodyDays[part]) entry.bodyDays[part] = new Set();
      if (stats.sets > 0) entry.bodyDays[part].add(session.date);
    });
  });
  return weekKeys.map((key) => {
    const entry = weeks[key];
    const bodyFreq = {};
    Object.entries(entry.bodyDays).forEach(([part, days]) => {
      bodyFreq[part] = days.size;
    });
    return { ...entry, bodyFreq };
  });
}

function buildExerciseHistory(sessions) {
  const history = {};
  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const key = normalizeName(exercise.name || "exercise");
      if (!history[key]) {
        history[key] = { name: exercise.name || "Exercise", sessions: [], totalSets: 0 };
      }
      history[key].sessions.push({
        date: session.date,
        e1rm: exercise.e1rm,
        sets: exercise.sets,
        reps: exercise.reps
      });
      history[key].totalSets += exercise.sets;
    });
  });
  Object.values(history).forEach((item) => {
    item.sessions.sort((a, b) => a.date.localeCompare(b.date));
  });
  return history;
}

function calcAverage(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcPercentChange(current, prev) {
  if (!Number.isFinite(prev) || prev === 0) return null;
  return (current - prev) / prev;
}

function computeConfidence(weeksWithWorkouts, workoutsPerWeek) {
  if (weeksWithWorkouts >= 4 && workoutsPerWeek >= 2) return "high";
  if (weeksWithWorkouts >= 2) return "medium";
  return "low";
}

function computeWorkoutStreaks(sessions) {
  if (!sessions.length) return { maxStreak: 0, maxGap: 0, lastGap: 0 };
  const dates = sessions.map((session) => session.date).sort();
  let maxStreak = 1;
  let currentStreak = 1;
  let maxGap = 0;
  let lastGap = 0;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.round((curr - prev) / DAY_MS);
    if (diff === 1) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
      if (diff > maxGap) maxGap = diff;
    }
    lastGap = diff;
  }
  return { maxStreak, maxGap, lastGap };
}

function computeProgressMetrics() {
  const weightLogs = getSortedWeightLogs();
  const sessions = collectSessionStats(weightLogs);
  const weeklyStats = buildWeeklyStats(sessions, 12);
  const recentWeeks = weeklyStats.slice(-4);
  const baselineWeeks = weeklyStats.slice(-8, -4);
  const workoutsPerWeek = calcAverage(recentWeeks.map((week) => week.workouts));
  const totalSetsRecent = recentWeeks.reduce((sum, week) => sum + week.totalSets, 0);
  const totalWorkoutsRecent = recentWeeks.reduce((sum, week) => sum + week.workouts, 0);
  const setsPerSession = totalWorkoutsRecent ? totalSetsRecent / totalWorkoutsRecent : 0;
  const weeklyGoal = weeklyGoalFromFrequency(state.user.frequency);
  const adherence = weeklyGoal ? workoutsPerWeek / weeklyGoal : 0;
  const weeksWithWorkouts = weeklyStats.filter((week) => week.workouts > 0).length;
  const confidence = computeConfidence(weeksWithWorkouts, workoutsPerWeek);
  const totalSetsMa4 = calcAverage(recentWeeks.map((week) => week.totalSets));
  const totalSetsBaseline = calcAverage(baselineWeeks.map((week) => week.totalSets));
  const totalSetsChange = calcPercentChange(totalSetsMa4, totalSetsBaseline);

  const bodyParts = {};
  getProgressBodyParts().forEach((part) => {
    const weeklySets = weeklyStats.map((week) => week.bodySets[part] || 0);
    const weeklyTonnage = weeklyStats.map((week) => week.bodyTonnage[part] || 0);
    const weeklyFreq = weeklyStats.map((week) => week.bodyFreq[part] || 0);
    const ma4Sets = calcAverage(weeklySets.slice(-4));
    const ma8Sets = calcAverage(weeklySets.slice(-8, -4));
    bodyParts[part] = {
      weeklySets,
      weeklyFreq,
      ma4Sets,
      ma8Sets,
      lastWeekSets: weeklySets[weeklySets.length - 1] || 0,
      lastWeekFreq: weeklyFreq[weeklyFreq.length - 1] || 0,
      tonnageMa4: calcAverage(weeklyTonnage.slice(-4))
    };
  });

  const recentSessions = sessions.filter((session) => {
    const sessionDate = new Date(session.date + "T00:00:00");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    return sessionDate >= cutoff;
  });

  const exerciseHistory = buildExerciseHistory(sessions);
  const mainExercise = Object.values(exerciseHistory)
    .sort((a, b) => b.totalSets - a.totalSets)[0] || null;

  let mainE1RMTrend = null;
  if (mainExercise && mainExercise.sessions.length >= 2) {
    const entries = mainExercise.sessions.filter((session) => session.e1rm > 0);
    const recent = entries.slice(-4);
    const prev = entries.slice(-8, -4);
    const bestRecent = recent.length ? Math.max(...recent.map((row) => row.e1rm)) : null;
    const bestPrev = prev.length ? Math.max(...prev.map((row) => row.e1rm)) : null;
    if (Number.isFinite(bestRecent) && Number.isFinite(bestPrev) && bestPrev > 0) {
      mainE1RMTrend = (bestRecent - bestPrev) / bestPrev;
    }
  }

  const lastWeight = Number.isFinite(getLastWeight()) ? getLastWeight() : state.user.startingWeightLb;
  const weightTrend7 = calcWeightTrend(7);
  const weightTrendPct = Number.isFinite(lastWeight) && Number.isFinite(weightTrend7) ? weightTrend7 / lastWeight : null;
  const bmi = Number.isFinite(lastWeight) && Number.isFinite(state.user.heightCm)
    ? (lastWeight / KG_IN_LB) / Math.pow(state.user.heightCm / 100, 2)
    : null;

  const pushSets = BODY_PART_GROUPS.push.reduce((sum, part) => sum + (bodyParts[part]?.ma4Sets || 0), 0);
  const pullSets = BODY_PART_GROUPS.pull.reduce((sum, part) => sum + (bodyParts[part]?.ma4Sets || 0), 0);
  const quadSets = bodyParts.quads?.ma4Sets || 0;
  const hamSets = bodyParts.hamstrings?.ma4Sets || 0;
  const upperSets = BODY_PART_GROUPS.upper.reduce((sum, part) => sum + (bodyParts[part]?.ma4Sets || 0), 0);
  const lowerSets = BODY_PART_GROUPS.lower.reduce((sum, part) => sum + (bodyParts[part]?.ma4Sets || 0), 0);

  const exercisesPerSession = recentSessions.map((session) => session.exercisesCount);
  const maxExercises = exercisesPerSession.length ? Math.max(...exercisesPerSession) : 0;
  const sessionsWithMainLift = recentSessions.filter((session) => session.hasMainLift).length;
  const hasMissingBodyPart = recentSessions.some((session) => session.hasMissingBodyPart);
  const hasBodyweightNoReps = recentSessions.some((session) => session.hasBodyweightNoReps);
  const hasLoadedZeroWeight = recentSessions.some((session) => session.loadedZeroWeight);
  const streaks = computeWorkoutStreaks(sessions);
  const lastSessionDate = sessions.length ? new Date(sessions[sessions.length - 1].date + "T00:00:00") : null;
  const daysSinceLastWorkout = lastSessionDate ? Math.round((new Date() - lastSessionDate) / DAY_MS) : null;

  return {
    sessions,
    weeklyStats,
    workoutsPerWeek,
    adherence,
    weeklyGoal,
    setsPerSession,
    totalSetsChange,
    bodyParts,
    exerciseHistory,
    mainExercise,
    mainE1RMTrend,
    weightLogsIn14: weightLogsInRange(14).length,
    weightTrend7,
    weightTrendPct,
    lastWeight,
    bmi,
    confidence,
    maxExercises,
    sessionsWithMainLift,
    hasMissingBodyPart,
    hasBodyweightNoReps,
    hasLoadedZeroWeight,
    maxWorkoutStreak: streaks.maxStreak,
    maxGapDays: streaks.maxGap,
    lastGapDays: streaks.lastGap,
    daysSinceLastWorkout,
    pushSets,
    pullSets,
    quadSets,
    hamSets,
    upperSets,
    lowerSets
  };
}

function buildRepDistribution(sessions, weeks) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const totals = sessions.reduce((acc, session) => {
    const sessionDate = new Date(session.date + "T00:00:00");
    if (sessionDate < cutoff) return acc;
    acc.low += session.repBuckets.low;
    acc.mid += session.repBuckets.mid;
    acc.high += session.repBuckets.high;
    acc.total += session.repBuckets.total;
    return acc;
  }, { low: 0, mid: 0, high: 0, total: 0 });
  return {
    lowPct: totals.total ? totals.low / totals.total : 0,
    midPct: totals.total ? totals.mid / totals.total : 0,
    highPct: totals.total ? totals.high / totals.total : 0,
    total: totals.total
  };
}

function renderProgressSummary(metrics) {
  if (!progressSummary) return;
  if (!metrics.sessions.length) {
    progressSummary.innerHTML = "<p class=\"note\">Log workouts to unlock your progress report.</p>";
    return;
  }
  const adherencePct = metrics.weeklyGoal ? Math.round(metrics.adherence * 100) : null;
  const volumeChange = metrics.totalSetsChange !== null ? `${Math.round(metrics.totalSetsChange * 100)}%` : "--";
  const volumeTrendValue = metrics.totalSetsChange !== null ? `${Math.round(metrics.totalSetsChange * 100)}%` : "--";
  const weightChange = Number.isFinite(metrics.weightTrend7)
    ? formatSignedWeight(metrics.weightTrend7)
    : "--";
  const strengthTrend = metrics.mainE1RMTrend !== null ? `${Math.round(metrics.mainE1RMTrend * 100)}%` : "--";
  const bmi = Number.isFinite(metrics.bmi) ? metrics.bmi.toFixed(1) : "--";
  const profileBits = [];
  if (Number.isFinite(state.user.age)) profileBits.push(`${state.user.age} yrs`);
  if (state.user.gender) {
    profileBits.push(state.user.gender.charAt(0).toUpperCase() + state.user.gender.slice(1));
  }
  if (Number.isFinite(state.user.heightCm)) profileBits.push(formatHeight(state.user.heightCm));
  if (Number.isFinite(metrics.lastWeight)) profileBits.push(`${formatWeight(metrics.lastWeight)} ${state.user.units}`);
  const profileSummary = profileBits.length ? profileBits.join(" | ") : "Add age, sex, height, weight";

  progressSummary.innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Consistency</div>
      <div class="summary-value">${metrics.workoutsPerWeek.toFixed(1)} / wk</div>
      <div class="summary-meta">${adherencePct !== null ? `Adherence: ${adherencePct}%` : "Set a weekly goal"}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Volume</div>
      <div class="summary-value">${volumeTrendValue} <span>trend</span></div>
      <div class="summary-meta">${volumeChange === "--" ? "Need 8 weeks data" : `4w vs 8w: ${volumeChange}`}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Strength</div>
      <div class="summary-value">${strengthTrend}</div>
      <div class="summary-meta">${metrics.mainExercise ? metrics.mainExercise.name : "Log main lifts"}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Weight trend</div>
      <div class="summary-value">${weightChange}</div>
      <div class="summary-meta">${Number.isFinite(metrics.bmi) ? `BMI: ${bmi}` : "Add height for BMI"}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Profile</div>
      <div class="summary-value">Snapshot</div>
      <div class="summary-meta">${escapeHtml(profileSummary)}</div>
    </div>
  `;
}

function renderProgressBodyList(metrics) {
  if (!progressBodyList) return;
  const rows = Object.entries(metrics.bodyParts)
    .filter(([part]) => part !== "full body")
    .map(([part, stats]) => ({
      part,
      label: labelFromFilter(part),
      sets: stats.ma4Sets || 0,
      freq: stats.lastWeekFreq || 0
    }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 8);
  const totalSets = rows.reduce((sum, row) => sum + row.sets, 0);
  if (!rows.length || totalSets === 0) {
    progressBodyList.innerHTML = "<p class=\"note\">No body part data yet.</p>";
    return;
  }
  progressBodyList.innerHTML = rows.map((row) => {
    const status = row.sets < 4 ? "Low" : row.sets < 9 ? "Building" : "On track";
    return `
      <div class="body-stat">
        <div>
          <div class="body-stat-title">${escapeHtml(row.label)}</div>
          <div class="body-stat-meta">${row.sets.toFixed(1)} sets/wk | ${row.freq} days</div>
        </div>
        <span class="pill">${status}</span>
      </div>
    `;
  }).join("");
}

function renderProgressInsights(metrics) {
  if (!progressInsightList) return;
  const insights = buildInsights(metrics);
  if (!insights.length) {
    progressInsightList.innerHTML = "<p class=\"note\">Log more sessions to unlock insights.</p>";
    return;
  }
  progressInsightList.innerHTML = insights.map((insight) => {
    const confidence = insight.confidence ? ` | ${insight.confidence}` : "";
    return `
      <div class="insight-card ${insight.severity}">
        <div class="insight-header">
          <span class="insight-badge">${escapeHtml(insight.severity)}</span>
          <span class="insight-title">${escapeHtml(insight.title)}</span>
          <span class="insight-meta">${escapeHtml(insight.category)}${escapeHtml(confidence)}</span>
        </div>
        <div class="insight-body">${escapeHtml(insight.message)}</div>
        ${insight.action ? `<div class="insight-action">${escapeHtml(insight.action)}</div>` : ""}
      </div>
    `;
  }).join("");
}

function buildInsights(metrics) {
  const profile = getInsightProfile();
  const thresholds = profile.thresholds;
  const age = Number(state.user.age) || 0;
  const restThreshold = Math.max(3, thresholds.restStreak - (age >= 50 ? 1 : 0));
  const insights = [];
  const addInsight = (entry) => {
    if (entry.severity === "warn" && metrics.confidence === "low") return;
    if (metrics.confidence === "low" && !profile.allowLowConfidence) return;
    insights.push(entry);
  };

  if (metrics.weightLogsIn14 < 2) {
    addInsight({
      id: "A01",
      severity: "info",
      title: "Log weight more often",
      message: "Log weight 2-3x/week to improve trend accuracy.",
      action: "Add quick weigh-ins to tighten the trend line.",
      category: "Data",
      confidence: metrics.confidence,
      priority: 1
    });
  }

  if (metrics.workoutsPerWeek < 1 && metrics.confidence !== "high") {
    addInsight({
      id: "A02",
      severity: "warn",
      title: "Logs are sparse",
      message: "Your data is too sparse for reliable trends.",
      action: "Aim for at least 2 workouts per week.",
      category: "Data",
      confidence: metrics.confidence,
      priority: 1
    });
  }

  if (metrics.hasLoadedZeroWeight) {
    addInsight({
      id: "A05",
      severity: "info",
      title: "Missing load entries",
      message: "Some loaded exercises are logged with 0 weight.",
      action: "Enter the load to unlock better strength insights.",
      category: "Data",
      confidence: metrics.confidence,
      priority: 2
    });
  }

  if (metrics.hasBodyweightNoReps) {
    addInsight({
      id: "A06",
      severity: "info",
      title: "Bodyweight reps missing",
      message: "Some bodyweight sets have 0 reps logged.",
      action: "Add reps to track progress on bodyweight moves.",
      category: "Data",
      confidence: metrics.confidence,
      priority: 2
    });
  }

  if (metrics.maxExercises >= 12) {
    addInsight({
      id: "A09",
      severity: "nudge",
      title: "Sessions feel packed",
      message: "Some sessions are logging 12+ exercises.",
      action: "Try focusing on fewer lifts to stay consistent.",
      category: "Logging",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  if (metrics.sessionsWithMainLift === 0 && metrics.sessions.length >= 3) {
    addInsight({
      id: "A11",
      severity: "nudge",
      title: "Pick a main lift",
      message: "No exercise has 3+ working sets in recent sessions.",
      action: "Choose a main lift to track strength progress.",
      category: "Logging",
      confidence: metrics.confidence,
      priority: 3
    });
  }

  if (metrics.hasMissingBodyPart) {
    addInsight({
      id: "A12",
      severity: "info",
      title: "Missing muscle tags",
      message: "Some exercises have no body part assigned.",
      action: "Assign a body part for cleaner analytics.",
      category: "Logging",
      confidence: metrics.confidence,
      priority: 5
    });
  }

  if (metrics.maxWorkoutStreak >= restThreshold) {
    addInsight({
      id: "A10",
      severity: "warn",
      title: "Recovery day needed",
      message: `You logged workouts ${metrics.maxWorkoutStreak} days in a row.`,
      action: "Add a rest day to protect recovery.",
      category: "Recovery",
      confidence: metrics.confidence,
      priority: 1
    });
  }

  if (metrics.maxGapDays >= 10) {
    addInsight({
      id: "B04",
      severity: "nudge",
      title: "Long gap detected",
      message: `There was a ${metrics.maxGapDays}-day gap recently.`,
      action: "Restart with 10-20% less volume for a week.",
      category: "Consistency",
      confidence: metrics.confidence,
      priority: 3
    });
  }

  if (Number.isFinite(metrics.daysSinceLastWorkout) && metrics.daysSinceLastWorkout > 7) {
    addInsight({
      id: "D09",
      severity: "nudge",
      title: "Time since last session",
      message: "It has been over a week since your last workout.",
      action: "Ease back in with a lighter session.",
      category: "Frequency",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  if (metrics.weeklyGoal && metrics.adherence < 0.7) {
    addInsight({
      id: "B01",
      severity: "warn",
      title: "Below your goal",
      message: "Recent adherence is below your weekly goal.",
      action: "Reduce your goal or shorten sessions to stay consistent.",
      category: "Consistency",
      confidence: metrics.confidence,
      priority: 2
    });
  }

  if (metrics.adherence >= 1.2 && metrics.weeklyGoal) {
    addInsight({
      id: "B02",
      severity: "success",
      title: "Consistency up",
      message: "You are beating your weekly goal. Keep it going.",
      action: "Lock in the days you are already hitting.",
      category: "Consistency",
      confidence: metrics.confidence,
      priority: 6
    });
  }

  if (metrics.sessions.length >= 3) {
    const weekendCount = metrics.sessions.filter((session) => {
      const day = new Date(session.date + "T00:00:00").getDay();
      return day === 0 || day === 6;
    }).length;
    if (weekendCount / metrics.sessions.length >= 0.7) {
      addInsight({
        id: "B03",
        severity: "nudge",
        title: "Weekend-heavy pattern",
        message: "Most workouts are on the weekend.",
        action: "Add one midweek session to stabilize momentum.",
        category: "Consistency",
        confidence: metrics.confidence,
        priority: 4
      });
    }
  }

  if (metrics.workoutsPerWeek > 0 && metrics.workoutsPerWeek < 2) {
    addInsight({
      id: "B05",
      severity: "nudge",
      title: "Streak is fragile",
      message: "Training once a week makes progress harder to sustain.",
      action: "Aim for a simple second session each week.",
      category: "Consistency",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  const totalSetsLastWeek = metrics.weeklyStats[metrics.weeklyStats.length - 1]?.totalSets || 0;
  const totalSetsPrev = metrics.weeklyStats[metrics.weeklyStats.length - 2]?.totalSets || 0;
  if (totalSetsPrev > 0 && totalSetsLastWeek > totalSetsPrev * thresholds.volumeJump) {
    addInsight({
      id: "C05",
      severity: "warn",
      title: "Volume jump",
      message: "Weekly sets jumped sharply.",
      action: "Cap increases to protect recovery.",
      category: "Volume",
      confidence: metrics.confidence,
      priority: 1
    });
  }
  if (totalSetsPrev > 0 && totalSetsLastWeek < totalSetsPrev * thresholds.volumeDrop) {
    addInsight({
      id: "C06",
      severity: "nudge",
      title: "Volume dropped",
      message: "Weekly sets dipped significantly.",
      action: "Add a few sets next week to stay on track.",
      category: "Volume",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  Object.entries(metrics.bodyParts).forEach(([part, stats]) => {
    if (part === "cardio" || part === "full body") return;
    const recentSets = stats.weeklySets.slice(-thresholds.underSetsWeeks);
    const underSets = recentSets.length && recentSets.every((value) => value < thresholds.underSets);
    if (underSets) {
      addInsight({
        id: `C01-${part}`,
        severity: "nudge",
        title: `${labelFromFilter(part)} needs more volume`,
        message: `Weekly sets are below ${thresholds.underSets} for ${labelFromFilter(part)}.`,
        action: "Add 2-6 sets per week.",
        category: "Volume",
        confidence: metrics.confidence,
        priority: 3
      });
    }
    if (stats.lastWeekFreq === 0 && stats.weeklyFreq.slice(-thresholds.underFreqWeeks).every((v) => v === 0)) {
      addInsight({
        id: `D01-${part}`,
        severity: "nudge",
        title: `${labelFromFilter(part)} missing`,
        message: `No sessions for ${labelFromFilter(part)} recently.`,
        action: "Add 1-2 short touch points.",
        category: "Frequency",
        confidence: metrics.confidence,
        priority: 4
      });
    }
    if (age >= 65 && stats.ma4Sets > 18) {
      addInsight({
        id: `C20-${part}`,
        severity: "nudge",
        title: `${labelFromFilter(part)} volume high`,
        message: "Older adults often benefit from smaller volume jumps.",
        action: "Consider trimming volume by 10-20%.",
        category: "Recovery",
        confidence: metrics.confidence,
        priority: 4
      });
    }
  });

  const coreFreq = calcAverage((metrics.bodyParts.core?.weeklyFreq || []).slice(-4));
  if (coreFreq === 0 && metrics.sessions.length >= 4) {
    addInsight({
      id: "B14",
      severity: "nudge",
      title: "Core is missing",
      message: "No core work logged in the last 4 weeks.",
      action: "Add a short core finisher 2x/week.",
      category: "Balance",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  const cardioSets = metrics.bodyParts.cardio?.ma4Sets || 0;
  if (state.user.goal === "stay" && cardioSets === 0) {
    addInsight({
      id: "B15",
      severity: "nudge",
      title: "Cardio is missing",
      message: "No cardio logged in the last 4 weeks.",
      action: "Add 1-2 short cardio sessions.",
      category: "Balance",
      confidence: metrics.confidence,
      priority: 4
    });
  }


  if (metrics.pushSets && metrics.pullSets) {
    const ratio = metrics.pushSets / metrics.pullSets;
    if (ratio > thresholds.pushPullHigh || ratio < thresholds.pushPullLow) {
      addInsight({
        id: "G01",
        severity: "warn",
        title: "Push/pull imbalance",
        message: `Your push-to-pull ratio is ${ratio.toFixed(2)}.`,
        action: "Add rows or pulls to balance shoulders.",
        category: "Balance",
        confidence: metrics.confidence,
        priority: 2
      });
    }
  }

  if (metrics.quadSets && metrics.hamSets) {
    const ratio = metrics.quadSets / metrics.hamSets;
    if (ratio > thresholds.quadHamHigh || ratio < thresholds.quadHamLow) {
      addInsight({
        id: "G03",
        severity: "nudge",
        title: "Quad/ham balance",
        message: `Quad-to-ham ratio is ${ratio.toFixed(2)}.`,
        action: "Add RDLs or leg curls to even it out.",
        category: "Balance",
        confidence: metrics.confidence,
        priority: 3
      });
    }
  }

  if (metrics.upperSets && metrics.lowerSets) {
    const ratio = metrics.upperSets / metrics.lowerSets;
    if (ratio > 1.3 || ratio < 0.77) {
      addInsight({
        id: "G05",
        severity: "nudge",
        title: "Upper/lower balance",
        message: `Upper vs lower ratio is ${ratio.toFixed(2)}.`,
        action: "Bring the lower body up for balance.",
        category: "Balance",
        confidence: metrics.confidence,
        priority: 4
      });
    }
  }

  const repDist = buildRepDistribution(metrics.sessions, thresholds.repDominanceWeeks);
  if (repDist.total > 0) {
    const dominant = Math.max(repDist.lowPct, repDist.midPct, repDist.highPct);
    if (dominant >= thresholds.repDominance) {
      addInsight({
        id: "H01",
        severity: "nudge",
        title: "Rep range is narrow",
        message: "Most sets sit in one rep range.",
        action: "Blend 6-12 reps with heavier or lighter blocks.",
        category: "Intensity",
        confidence: metrics.confidence,
        priority: 4
      });
    }
  }

  if (metrics.mainE1RMTrend !== null) {
    if (metrics.mainE1RMTrend <= thresholds.strengthDrop) {
      addInsight({
        id: "E10",
        severity: "warn",
        title: "Strength trending down",
        message: "Estimated 1RM trend is down.",
        action: "Consider a deload or reduce volume 10-20%.",
        category: "Strength",
        confidence: metrics.confidence,
        priority: 1
      });
    } else if (metrics.mainE1RMTrend >= 0.03) {
      addInsight({
        id: "E08",
        severity: "success",
        title: "Strength trending up",
        message: "Estimated 1RM is climbing.",
        action: "Keep the progression steady.",
        category: "Strength",
        confidence: metrics.confidence,
        priority: 6
      });
    } else if (Math.abs(metrics.mainE1RMTrend) <= thresholds.strengthFlat) {
      addInsight({
        id: "E09",
        severity: "nudge",
        title: "Strength plateau",
        message: "Estimated 1RM is flat over recent sessions.",
        action: "Add a set or tweak the rep range.",
        category: "Strength",
        confidence: metrics.confidence,
        priority: 3
      });
    }
  }

  if (metrics.totalSetsChange !== null && Math.abs(metrics.totalSetsChange) <= 0.03 && metrics.mainE1RMTrend !== null && Math.abs(metrics.mainE1RMTrend) <= thresholds.strengthFlat) {
    addInsight({
      id: "C08",
      severity: "nudge",
      title: "Progress feels flat",
      message: "Volume and strength are both holding steady.",
      action: "Try a small progression: +1 set or +2.5-5 lb.",
      category: "Volume",
      confidence: metrics.confidence,
      priority: 4
    });
  }

  if (metrics.weightTrendPct !== null && metrics.mainE1RMTrend !== null) {
    if (metrics.weightTrendPct <= thresholds.weightLossRate && metrics.mainE1RMTrend <= thresholds.strengthDrop) {
      addInsight({
        id: "J05",
        severity: "warn",
        title: "Fast loss + strength drop",
        message: "Weight is dropping quickly while strength is down.",
        action: "Slow the rate of loss or deload.",
        category: "Weight",
        confidence: metrics.confidence,
        priority: 1
      });
    }
    if (metrics.weightTrendPct >= thresholds.weightGainRate && metrics.mainE1RMTrend < thresholds.strengthFlat) {
      addInsight({
        id: "J06",
        severity: "nudge",
        title: "Gain without strength",
        message: "Weight is up but strength hasn't moved.",
        action: "Focus on progression and quality sets.",
        category: "Weight",
        confidence: metrics.confidence,
        priority: 3
      });
    }
    if (Math.abs(metrics.weightTrendPct || 0) < 0.002 && metrics.mainE1RMTrend > 0.01) {
      addInsight({
        id: "J07",
        severity: "success",
        title: "Recomposition signal",
        message: "Weight is stable while strength improves.",
        action: "Keep your current rhythm.",
        category: "Weight",
        confidence: metrics.confidence,
        priority: 6
      });
    }
  }

  if (metrics.weightTrendPct !== null && metrics.mainE1RMTrend === null) {
    if (metrics.weightTrendPct <= thresholds.weightLossRate) {
      addInsight({
        id: "J04",
        severity: "info",
        title: "Weight trending down",
        message: "The 7-day trend is moving down.",
        action: "Confirm this matches your goal.",
        category: "Weight",
        confidence: metrics.confidence,
        priority: 4
      });
    }
    if (metrics.weightTrendPct >= thresholds.weightGainRate) {
      addInsight({
        id: "J03",
        severity: "info",
        title: "Weight trending up",
        message: "The 7-day trend is moving up.",
        action: "Confirm this matches your goal.",
        category: "Weight",
        confidence: metrics.confidence,
        priority: 4
      });
    }
  }

  insights.sort((a, b) => (a.priority || 10) - (b.priority || 10));
  const output = [];
  let warnCount = 0;
  insights.forEach((insight) => {
    if (output.length >= profile.maxInsights) return;
    if (insight.severity === "warn" && warnCount >= profile.maxWarn) return;
    output.push(insight);
    if (insight.severity === "warn") warnCount += 1;
  });
  return output;
}

function buildStrengthSeriesFromSessions(sessions, limit, bodyFilter) {
  const rows = sessions.map((session) => {
    const best = session.exercises.reduce((max, exercise) => {
      if (!exercise.e1rm) return max;
      if (bodyFilter !== "all" && !matchesBodyFilter(exercise.bodyParts || [], bodyFilter)) return max;
      return Math.max(max, exercise.e1rm);
    }, 0);
    return {
      label: formatDateShort(new Date(session.date + "T00:00:00")),
      value: best
    };
  }).filter((row) => row.value > 0);
  return rows.slice(-limit);
}

function buildVolumeSeries(weeklyStats, limit, bodyFilter) {
  const rows = weeklyStats.slice(-limit).map((week) => {
    const value = bodyFilter === "all"
      ? week.totalTonnage
      : (week.bodyTonnage[bodyFilter] || 0);
    return {
      label: formatDateShort(new Date(week.key + "T00:00:00")),
      value
    };
  });
  return rows;
}

function formatLoad(valueLb) {
  if (!Number.isFinite(valueLb)) return "--";
  const unit = state.user.units === "kg" ? "kg" : "lb";
  const display = state.user.units === "kg" ? valueLb / KG_IN_LB : valueLb;
  return `${Math.round(display)} ${unit}`;
}

function renderProgress() {
  if (!progressMetric) return;
  const metrics = computeProgressMetrics();

  if (insightIntensityToggle) {
    const intensity = state.user.insightIntensity || "strict";
    insightIntensityToggle.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.intensity === intensity;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  progressMetric.querySelectorAll("button").forEach((btn) => {
    const isActive = btn.dataset.metric === state.ui.metric;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const metric = state.ui.metric;
  const bodyFilter = state.ui.progressBody || "all";
  if (progressBodySelect && progressBodySelect.value !== bodyFilter) {
    progressBodySelect.value = bodyFilter;
  }
  if (progressBodySelect) {
    progressBodySelect.disabled = !(metric === "strength" || metric === "volume");
  }
  renderProgressSummary(metrics);
  renderProgressBodyList(metrics);
  renderProgressInsights(metrics);

  let series = [];
  let insight = "No data yet.";
  let detail = "";

  if (metric === "weight") {
    series = buildWeightSeries(30);
    const delta = calcWeightTrend(30);
    if (delta !== null) {
      const change = formatSignedWeight(delta);
      insight = `Weight trend: ${change} in the last 30 days.`;
    }
    detail = buildWeightDetail();
  }

  if (metric === "workouts") {
    series = buildWorkoutSeries(8);
    const diff = workoutsComparedToLastWeek();
    if (diff !== null) {
      if (diff > 0) insight = `Up ${diff} workouts vs last week.`;
      if (diff === 0) insight = "Same number of workouts as last week.";
      if (diff < 0) insight = `Down ${Math.abs(diff)} workouts vs last week.`;
    }
    detail = buildWorkoutDetail();
  }

  if (metric === "strength") {
    series = buildStrengthSeriesFromSessions(metrics.sessions, 10, bodyFilter);
    const best = series.length ? Math.max(...series.map((row) => row.value)) : 0;
    if (best > 0) {
      const label = bodyFilter === "all" ? "Best e1RM" : `Best e1RM (${labelFromFilter(bodyFilter)})`;
      insight = `${label}: ${formatLoad(best)}.`;
    }
    detail = series.length ? "Strength shows your best estimated 1RM per session." : "Log weighted sets to estimate strength.";
  }

  if (metric === "volume") {
    series = buildVolumeSeries(metrics.weeklyStats, 8, bodyFilter);
    const last = series.length ? series[series.length - 1].value : 0;
    if (last > 0) {
      const label = bodyFilter === "all" ? "Weekly tonnage" : `Weekly tonnage (${labelFromFilter(bodyFilter)})`;
      insight = `${label}: ${formatVolume(last)}.`;
    }
    detail = "Volume tracks weekly tonnage from working sets.";
  }

  if (progressInsight) progressInsight.textContent = insight;
  if (progressDetail) progressDetail.textContent = detail;
  drawLineChart(progressChart, series);
}

function renderGroups() {
  renderGroupList();
  renderGroupDetail();
}

function renderGroupList() {
  if (!groupList) return;
  const groups = state.groups.order.map((id) => state.groups.byId[id]).filter(Boolean);
  if (!groups.length) {
    groupList.innerHTML = "<p class=\"note\">No groups yet. Create one to start competing.</p>";
    return;
  }
  groupList.innerHTML = groups.map((group) => {
    const isActive = group.id === state.ui.selectedGroupId;
    const rank = getRankForGroup(group, "consistency", 7, state.user.id);
    const rankText = rank ? `Rank #${rank}` : "Not ranked";
    return `
      <div class="group-card ${isActive ? "active" : ""}" data-group-id="${group.id}">
        <div class="group-title">${escapeHtml(group.name)}</div>
        <div class="group-meta">${escapeHtml(group.challenge.label)} | ${rankText}</div>
      </div>
    `;
  }).join("");
}

function renderGroupDetail() {
  if (!groupDetailPanel) return;
  const group = getSelectedGroup();
  if (!group) {
    if (groupTitle) groupTitle.textContent = "Select a group";
    if (groupChallenge) groupChallenge.textContent = "";
    if (groupRankNote) groupRankNote.textContent = "Select a group to see standings.";
    if (groupLeaderboard) groupLeaderboard.innerHTML = "";
    if (groupFeed) groupFeed.innerHTML = "<p class=\"note\">Group activity will appear here.</p>";
    if (leaveGroupBtn) leaveGroupBtn.hidden = true;
    return;
  }

  if (groupTitle) groupTitle.textContent = group.name;
  if (groupChallenge) groupChallenge.textContent = group.challenge.label;
  if (leaveGroupBtn) leaveGroupBtn.hidden = false;

  const metric = state.ui.groupMetric;
  const range = state.ui.groupRange;
  if (groupMetricToggle) {
    groupMetricToggle.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.metric === metric;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }
  if (groupRangeToggle) {
    groupRangeToggle.querySelectorAll("button").forEach((btn) => {
      const isActive = Number(btn.dataset.range) === range;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }
  if (groupFilterToggle) {
    groupFilterToggle.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.filter === state.ui.groupFilter;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  if (groupRankNote) {
    const change = rankChangeForGroup(group);
    if (change === null) groupRankNote.textContent = "No rank movement yet.";
    if (change === 0) groupRankNote.textContent = "Holding steady this period.";
    if (change > 0) groupRankNote.textContent = `You moved up ${change} spots this period.`;
    if (change < 0) groupRankNote.textContent = `Down ${Math.abs(change)} spots this period.`;
  }

  if (groupLeaderboard) {
    const rows = buildGroupLeaderboard(group, metric, range);
    if (!rows.length) {
      groupLeaderboard.innerHTML = "<p class=\"note\">No leaderboard data yet.</p>";
    } else {
      groupLeaderboard.innerHTML = rows.map((row, idx) => {
        const value = formatMetricValue(metric, row.stats, group);
        return `
          <div class="leaderboard-row ${row.isMe ? "me" : ""}">
            <div>
              <div class="leaderboard-name">${idx + 1}. ${escapeHtml(row.name)}</div>
              <div class="leaderboard-meta">${escapeHtml(value.label)}</div>
            </div>
            <div class="leaderboard-name">${escapeHtml(value.value)}</div>
          </div>
        `;
      }).join("");
    }
  }

  if (groupFeed) {
    const feedItems = group.feed || [];
    if (!feedItems.length) {
      groupFeed.innerHTML = "<p class=\"note\">No group activity yet.</p>";
    } else {
      groupFeed.innerHTML = feedItems.slice(0, 6).map((item) => renderFeedCard(item, true)).join("");
    }
  }
  if (memberSearchResults && !memberSearchResults.innerHTML) {
    memberSearchResults.innerHTML = "<p class=\"note\">Search by username to add members.</p>";
  }
}

function renderFeed() {
  if (!feedList) return;
  if (!state.feed.length) {
    feedList.innerHTML = "<p class=\"note\">No posts yet. Your logged workouts will show here.</p>";
    return;
  }
  feedList.innerHTML = state.feed.slice(0, 30).map((item) => {
    const commentOpen = state.ui.commentOpenId === item.id;
    return renderFeedCard(item, false, commentOpen);
  }).join("");
}

function renderFeedCard(item, isGroup, commentOpen = false) {
  const likes = item.likes || 0;
  const liked = item.liked ? "Liked" : "Like";
  const comments = item.comments || [];
  const commentsHtml = comments.map((c) => `<div>${escapeHtml(c.text)}</div>`).join("");
  const commentBox = isGroup ? "" : `
    <div class="feed-comments" ${commentOpen ? "" : "style=\"display:none;\""}>
      <div>${commentsHtml || "No comments yet."}</div>
      <div class="inline">
        <input class="inputText" data-comment-input="${item.id}" placeholder="Add a comment" />
        <button class="btn ghost" data-action="submit-comment" data-feed-id="${item.id}">Send</button>
      </div>
    </div>
  `;

  return `
    <div class="feed-card">
      <div class="feed-title">${escapeHtml(item.title)}</div>
      <div class="feed-meta">${escapeHtml(item.subtitle)}</div>
      <div class="feed-actions">
        ${isGroup ? "" : `<button class="btn ghost" data-action="like" data-feed-id="${item.id}">${liked} (${likes})</button>`}
        ${isGroup ? "" : `<button class="btn ghost" data-action="comment" data-feed-id="${item.id}">Comment</button>`}
      </div>
      ${commentBox}
    </div>
  `;
}

function renderRail() {
  if (railStreak) railStreak.textContent = `${computeStreak()} days`;
  if (railNextWorkout) {
    const last = getLatestWorkoutLog();
    railNextWorkout.textContent = last ? `Repeat ${last.name || "Workout"}` : "No workouts logged yet.";
  }
  if (railGroupStanding) {
    const group = getSelectedGroup();
    if (!group) {
      railGroupStanding.textContent = "No group selected.";
    } else {
      const rank = getRankForGroup(group, "consistency", 7, state.user.id);
      railGroupStanding.textContent = rank ? `Rank #${rank} in ${group.name}` : `In ${group.name}`;
    }
  }
}

function setActiveTab(tab) {
  state.ui.activeTab = tab;
  saveState();
  renderNav();
  updateLocationHash(tab);
}

function setLogMode(mode) {
  state.ui.logMode = mode;
  saveState();
  renderLog();
}

function addExerciseToDraft(name, bodyParts, dateKey = getActiveWorkoutDateKey(), renderFn = renderLog) {
  const draft = getDraft(dateKey);
  const exercise = { name, bodyParts: bodyParts && bodyParts.length ? bodyParts : deriveBodyParts(name), sets: [] };
  draft.exercises.push(exercise);
  state.ui.expandedExercise = draft.exercises.length - 1;
  addSet(draft.exercises.length - 1, true, dateKey, renderFn);
  saveState();
  if (renderFn) renderFn();
}

function addExercise() {
  const name = (newExerciseInput && newExerciseInput.value || "").trim();
  if (!name) {
    toast("Enter an exercise name");
    return;
  }
  const bodyValue = (newExerciseBody && newExerciseBody.value || "").trim();
  if (!bodyValue) {
    toast("Select a body part.");
    return;
  }
  const bodyParts = [labelFromFilter(bodyValue)];
  addExerciseToDraft(name, bodyParts, getActiveWorkoutDateKey(), renderLog);
  if (newExerciseInput) newExerciseInput.value = "";
  if (newExerciseBody) newExerciseBody.value = "";
}

function addExerciseFromLibrary(name, dateKey = getActiveWorkoutDateKey(), renderFn = renderLog) {
  const entry = buildExerciseEntry(name);
  addExerciseToDraft(entry.name, entry.bodyParts, dateKey, renderFn);
}

function addExerciseFromPicker() {
  if (isLogLocked()) {
    toast("Sign in to add exercises.");
    return;
  }
  if (!exercisePicker) return;
  const name = (exercisePicker.value || "").trim();
  if (!name) {
    toast("Select an exercise first.");
    return;
  }
  addExerciseFromLibrary(name);
}

function addSet(exIndex, skipRender = false, dateKey = getActiveWorkoutDateKey(), renderFn = renderLog) {
  const draft = getDraft(dateKey);
  const ex = draft.exercises[exIndex];
  if (!ex) return;
  const defaults = getDefaultSet(ex.name, ex.sets);
  ex.sets.push({ reps: defaults.reps, weight: defaults.weight });
  state.ui.newSet = { exIndex, setIndex: ex.sets.length - 1 };
  saveState();
  if (!skipRender && renderFn) renderFn();
}

function removeSet(exIndex, setIndex, dateKey = getActiveWorkoutDateKey(), renderFn = renderLog) {
  const draft = getDraft(dateKey);
  const ex = draft.exercises[exIndex];
  if (!ex) return;
  ex.sets.splice(setIndex, 1);
  saveState();
  if (renderFn) renderFn();
}

function removeExercise(exIndex, dateKey = getActiveWorkoutDateKey(), renderFn = renderLog) {
  const draft = getDraft(dateKey);
  draft.exercises.splice(exIndex, 1);
  state.ui.expandedExercise = 0;
  saveState();
  if (renderFn) renderFn();
}

function saveWorkout() {
  if (!requireAuth("Sign in to save workouts.")) return;
  saveWorkoutForDate(getActiveWorkoutDateKey(), renderLog, "today");
}

function saveWorkoutForDate(dateKey, renderFn, redirectTab) {
  const draft = getDraft(dateKey);
  if (!hasWorkoutActivity(draft)) {
    toast("Add at least one set before saving.");
    return;
  }
  const cleaned = normalizeDraft(draft, dateKey);
  state.workoutLogs[dateKey] = cleaned;
  resetDraftForDate(dateKey);
  saveTemplate(cleaned);
  addWorkoutFeed(cleaned);
  addGroupFeed(cleaned);
  const logEntry = {
    date: cleaned.date,
    totalVolume: workoutVolume(cleaned, "all"),
    totalSets: countSets(cleaned)
  };
  Object.values(state.groups.byId || {}).forEach((group) => {
    group.members.forEach((member) => {
      if (member.id === state.user.id) {
        member.logs = member.logs || [];
        const idx = member.logs.findIndex((row) => row.date === cleaned.date);
        if (idx >= 0) member.logs[idx] = logEntry;
        else member.logs.push(logEntry);
      }
    });
  });
  saveState();
  renderToday();
  renderWorkoutHistory();
  renderProgress();
  renderGroups();
  renderFeed();
  renderRail();
  if (renderFn) renderFn();
  if (renderFn !== renderLog) renderLog();
  haptic();
  toast(`Workout logged. Streak: ${computeStreak()} days.`);
  if (redirectTab) setActiveTab(redirectTab);
  if (supabaseEnabled() && authUser) {
    syncWorkoutToSupabase(cleaned);
  }
}

function saveWeight() {
  if (!requireAuth("Sign in to save weight logs.")) return;
  const dateKey = todayKey();
  const parsed = parseWeight(weightInput ? weightInput.value : "");
  if (!Number.isFinite(parsed)) {
    toast("Enter a valid weight.");
    return;
  }
  const log = {
    date: dateKey,
    weightLb: parsed,
    note: (weightNote && weightNote.value || "").slice(0, 240),
    isMorning: !!(morningToggle && morningToggle.checked)
  };
  state.user.prefersMorning = log.isMorning;
  state.weightLogs[dateKey] = log;
  Object.values(state.groups.byId || {}).forEach((group) => {
    group.members.forEach((member) => {
      if (member.id === state.user.id) {
        member.weightLb = log.weightLb;
      }
    });
  });
  saveState();
  renderToday();
  renderProgress();
  haptic();
  toast("Weight logged. Consistency matters more than perfection.");
  setActiveTab("today");
  scheduleProfileSync();
  if (supabaseEnabled() && authUser) {
    syncWeightToSupabase(log);
  }
}

function repeatLastWorkout() {
  if (!requireAuth("Sign in to repeat workouts.")) return;
  const template = getLastTemplate();
  if (!template) {
    toast("No previous workout to repeat.");
    return;
  }
  const dateKey = getActiveWorkoutDateKey();
  const draft = {
    id: createId("log"),
    date: dateKey,
    name: template.name,
    exercises: template.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((set) => ({ reps: set.reps, weight: set.weight }))
    }))
  };
  state.workoutDrafts[dateKey] = draft;
  state.ui.expandedExercise = 0;
  saveState();
  renderLog();
  toast("Repeated last workout.");
}

function createGroup() {
  if (!requireAuth("Sign in to create a group.")) return;
  const name = (groupNameInput && groupNameInput.value || "").trim();
  if (!name) {
    toast("Group name is required.");
    return;
  }
  const icon = (groupIconInput && groupIconInput.value || "").trim().slice(0, 2).toUpperCase();
  const challengeType = groupChallengeType ? groupChallengeType.value : "workouts";
  const goal = Number(groupChallengeGoal && groupChallengeGoal.value) || 4;
  const id = createUuid();
  const group = {
    id,
    name,
    icon: icon || "GR",
    isPrivate: !!(groupPrivateToggle && groupPrivateToggle.checked),
    ownerId: state.user.id,
    createdAt: new Date().toISOString(),
    challenge: buildChallenge(challengeType, goal),
    members: [
      {
        id: state.user.id,
        name: state.user.name || "You",
        type: "local",
        joinedAt: new Date().toISOString(),
        logs: getMemberLogs({ id: state.user.id })
      }
    ],
    feed: []
  };
  state.groups.byId[id] = group;
  state.groups.order.unshift(id);
  state.ui.selectedGroupId = id;
  saveState();
  closeGroupModal();
  renderGroups();
  renderToday();
  toast("Group created.");
  if (supabaseEnabled() && authUser) {
    syncGroupToSupabase(group);
  }
}

function addGroupMessage() {
  if (!requireAuth("Sign in to post a message.")) return;
  const group = getSelectedGroup();
  if (!group) return;
  const text = (groupMessageInput && groupMessageInput.value || "").trim();
  if (!text) {
    toast("Write a message first.");
    return;
  }
  group.feed.unshift({
    id: createId("gmsg"),
    type: "message",
    title: `${state.user.name || "You"}: ${text}`,
    subtitle: "Group message",
    createdAt: new Date().toISOString()
  });
  if (groupMessageInput) groupMessageInput.value = "";
  saveState();
  renderGroups();
  if (supabaseEnabled() && authUser) {
    syncGroupMessage(group, text);
  }
}

async function searchMembers() {
  if (!memberSearchResults) return;
  const query = (memberSearchInput && memberSearchInput.value || "").trim();
  const group = getSelectedGroup();
  if (!group) {
    memberSearchResults.innerHTML = "<p class=\"note\">Select a group first.</p>";
    return;
  }
  if (!query) {
    memberSearchResults.innerHTML = "<p class=\"note\">Enter a username to search.</p>";
    return;
  }
  if (!supabaseEnabled() || !authUser) {
    memberSearchResults.innerHTML = "<p class=\"note\">Sign in to search members.</p>";
    return;
  }
  memberSearchResults.innerHTML = "<p class=\"note\">Searching...</p>";
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .ilike("username", `%${query}%`)
    .limit(12);
  if (error) {
    memberSearchResults.innerHTML = "<p class=\"note\">Search failed.</p>";
    return;
  }
  const existing = new Set((group?.members || []).map((member) => member.id));
  const rows = (data || []).filter((row) => !existing.has(row.id) && row.id !== authUser.id);
  if (!rows.length) {
    memberSearchResults.innerHTML = "<p class=\"note\">No matching members.</p>";
    return;
  }
  memberSearchResults.innerHTML = rows.map((row) => {
    const label = row.display_name || row.username || "Member";
    const handle = row.username ? `@${row.username}` : "";
    return `
      <div class="library-card">
        <div>
          <div class="library-title">${escapeHtml(label)}</div>
          <div class="library-tags">${escapeHtml(handle)}</div>
        </div>
        <button class="btn ghost" data-action="add-member" data-user-id="${row.id}" data-display-name="${escapeHtml(label)}" data-username="${escapeHtml(row.username || "")}">Add</button>
      </div>
    `;
  }).join("");
}

function queueMemberSearch() {
  if (!memberSearchInput) return;
  clearTimeout(memberSearchTimer);
  memberSearchTimer = setTimeout(() => {
    const query = (memberSearchInput.value || "").trim();
    if (!query) {
      if (memberSearchResults) {
        memberSearchResults.innerHTML = "<p class=\"note\">Search by username to add members.</p>";
      }
      return;
    }
    searchMembers();
  }, 250);
}

async function addGroupMember(userId, displayName, username) {
  const group = getSelectedGroup();
  if (!group || !userId) return;
  if (!supabaseEnabled() || !authUser) {
    toast("Sign in to add members.");
    return;
  }
  const payload = { group_id: group.id, user_id: userId };
  const { error } = await supabase.from("group_members").insert(payload);
  if (error) {
    toast("Unable to add member.");
    return;
  }
  group.members.push({
    id: userId,
    name: displayName || username || "Member",
    username: username || "",
    joinedAt: new Date().toISOString(),
    logs: []
  });
  if (memberSearchInput) memberSearchInput.value = "";
  if (memberSearchResults) {
    memberSearchResults.innerHTML = "<p class=\"note\">Member added.</p>";
  }
  await loadMemberWeights([userId], state.groups.byId);
  await loadGroupActivity([userId], state.groups.byId);
  saveState();
  renderGroups();
  toast("Member added.");
}

function leaveGroup() {
  if (!requireAuth("Sign in to manage groups.")) return;
  const group = getSelectedGroup();
  if (!group) return;
  delete state.groups.byId[group.id];
  state.groups.order = state.groups.order.filter((id) => id !== group.id);
  state.ui.selectedGroupId = state.groups.order[0] || null;
  saveState();
  renderGroups();
  renderToday();
  toast("Left group.");
  if (supabaseEnabled() && authUser) {
    removeGroupMember(group.id, authUser.id);
  }
}

function toggleLike(id) {
  const item = state.feed.find((entry) => entry.id === id);
  if (!item) return;
  item.liked = !item.liked;
  item.likes = Math.max(0, (item.likes || 0) + (item.liked ? 1 : -1));
  saveState();
  renderFeed();
}

function submitComment(id) {
  const input = feedList.querySelector(`[data-comment-input="${id}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const item = state.feed.find((entry) => entry.id === id);
  if (!item) return;
  item.comments = item.comments || [];
  item.comments.push({ id: createId("comment"), text, createdAt: new Date().toISOString() });
  input.value = "";
  saveState();
  renderFeed();
}

function openGroupModal() {
  if (!groupModal) return;
  groupModal.hidden = false;
  if (groupNameInput) groupNameInput.focus();
}

function closeGroupModal() {
  if (!groupModal) return;
  groupModal.hidden = true;
  if (groupNameInput) groupNameInput.value = "";
  if (groupIconInput) groupIconInput.value = "";
  if (groupChallengeGoal) groupChallengeGoal.value = "";
}

function openOnboardingIfNeeded() {
  if (!onboarding) return;
  if (!authUser) return;
  if (!currentProfile) return;
  if (currentProfile.onboarded) return;
  onboarding.hidden = false;
  onboardingStep = 0;
  renderOnboarding();
}

function renderOnboarding() {
  onboardingSteps.forEach((step, idx) => {
    step.hidden = idx !== onboardingStep;
  });
  if (onboardingBackBtn) onboardingBackBtn.disabled = onboardingStep === 0;
  if (onboardingNextBtn) onboardingNextBtn.textContent = onboardingStep === 2 ? "Finish" : "Next";

  if (goalOptions) {
    goalOptions.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.value === state.user.goal);
    });
  }
  if (frequencyOptions) {
    frequencyOptions.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.value === state.user.frequency);
    });
  }
  if (displayNameInput && state.user.name && !displayNameInput.value) {
    displayNameInput.value = state.user.name;
  }
}

function stepOnboarding(delta) {
  if (delta > 0) {
    if (onboardingStep === 0 && !state.user.goal) {
      toast("Pick a goal to continue.");
      return;
    }
    if (onboardingStep === 1 && !state.user.frequency) {
      toast("Pick a frequency to continue.");
      return;
    }
    if (onboardingStep === 2) {
      state.user.name = (displayNameInput && displayNameInput.value || "").trim();
      state.user.onboarded = true;
      saveState();
      scheduleProfileSync();
      onboarding.hidden = true;
      renderToday();
      return;
    }
  }

  onboardingStep = clamp(onboardingStep + delta, 0, 2);
  renderOnboarding();
}

function skipOnboarding() {
  state.user.onboarded = true;
  saveState();
  scheduleProfileSync();
  if (onboarding) onboarding.hidden = true;
}

function selectGoal(value, btn) {
  state.user.goal = value;
  saveState();
  scheduleProfileSync();
  if (goalOptions) {
    goalOptions.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("selected", b === btn);
    });
  }
}

function selectFrequency(value, btn) {
  state.user.frequency = value;
  saveState();
  scheduleProfileSync();
  if (frequencyOptions) {
    frequencyOptions.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("selected", b === btn);
    });
  }
}

function applyTheme() {
  const theme = state.user.theme || "auto";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.querySelectorAll("button").forEach((btn) => {
      const on = btn.dataset.theme === theme;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
}

function applyUnits() {
  const unit = state.user.units || "lb";
  if (unitToggle) {
    unitToggle.querySelectorAll("button").forEach((btn) => {
      const on = btn.dataset.unit === unit;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  if (weightUnitLabel) weightUnitLabel.textContent = unit;
  if (authWeightUnit) authWeightUnit.textContent = unit;
  if (authHeightUnit) authHeightUnit.textContent = unit === "kg" ? "cm" : "in";
}

function logLockMessage() {
  if (!supabaseEnabled()) return "Supabase is not configured. Add your keys to enable logging.";
  if (!authUser) return "Sign in to log workouts and weight. Nothing is stored locally.";
  return "";
}

function isLogLocked() {
  return !!logLockMessage();
}

function setLogControlsDisabled(locked) {
  const controls = [
    workoutNameInput,
    workoutDateInput,
    repeatWorkoutBtn,
    newExerciseInput,
    newExerciseBody,
    addExerciseBtn,
    exerciseSearchInput,
    exercisePicker,
    addExerciseFromPickerBtn,
    saveWorkoutBtn,
    weightInput,
    weightNote,
    morningToggle,
    saveWeightBtn
  ];
  controls.forEach((el) => {
    if (!el) return;
    el.disabled = locked;
  });
  if (exerciseBodyChips) {
    exerciseBodyChips.classList.toggle("disabled", locked);
  }
}

function requireAuth(message) {
  if (!supabaseEnabled()) {
    toast("Supabase is not configured.");
    return false;
  }
  if (!authUser) {
    toast(message || "Sign in to continue.");
    openAuthModal();
    return false;
  }
  return true;
}

function scheduleProfileSync() {
  if (!supabaseEnabled() || !authUser) return;
  clearTimeout(profileSyncTimer);
  profileSyncTimer = setTimeout(() => {
    syncProfileSettings();
  }, 300);
}

async function syncProfileSettings() {
  if (!supabaseEnabled() || !authUser) return;
  const payload = buildProfilePayload();
  const keys = Object.keys(payload);
  if (!keys.length) return;
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", authUser.id);
  if (error) return;
  currentProfile = { ...(currentProfile || {}), id: authUser.id, ...payload };
}

function buildProfilePayload() {
  const payload = {
    goal: state.user.goal || null,
    frequency: state.user.frequency || null,
    today_focus: state.user.todayFocus || null,
    age: Number.isFinite(state.user.age) ? state.user.age : null,
    gender: state.user.gender || null,
    height_cm: Number.isFinite(state.user.heightCm) ? state.user.heightCm : null,
    starting_weight_lb: Number.isFinite(state.user.startingWeightLb) ? state.user.startingWeightLb : null,
    units: state.user.units || "lb",
    theme: state.user.theme || "auto",
    prefers_morning: !!state.user.prefersMorning,
    onboarded: !!state.user.onboarded,
    insight_intensity: state.user.insightIntensity || "strict"
  };
  const displayName = (state.user.name || "").trim();
  if (displayName) payload.display_name = displayName;
  return payload;
}

function applyProfileToState(profile) {
  if (!profile) return;
  state.user.name = profile.display_name || "";
  state.user.goal = profile.goal || "";
  state.user.frequency = profile.frequency || "";
  state.user.todayFocus = profile.today_focus || "";
  state.user.age = Number.isFinite(Number(profile.age)) ? Number(profile.age) : null;
  state.user.gender = profile.gender || "";
  state.user.heightCm = Number.isFinite(Number(profile.height_cm)) ? Number(profile.height_cm) : null;
  state.user.startingWeightLb = Number.isFinite(Number(profile.starting_weight_lb)) ? Number(profile.starting_weight_lb) : null;
  state.user.units = profile.units || "lb";
  state.user.theme = profile.theme || "auto";
  state.user.prefersMorning = !!profile.prefers_morning;
  state.user.onboarded = !!profile.onboarded;
  const intensity = profile.insight_intensity || state.user.insightIntensity || "strict";
  state.user.insightIntensity = intensity === "coach" ? "aggressive" : intensity;
}

function resetStateForSignOut() {
  state.user = clone(DEFAULT_STATE.user);
  state.workouts = clone(DEFAULT_STATE.workouts);
  state.workoutLogs = {};
  state.workoutDrafts = {};
  state.weightLogs = {};
  state.groups = { byId: {}, order: [] };
  state.feed = [];
  state.ui.selectedGroupId = null;
  state.ui.expandedExercise = null;
  state.ui.commentOpenId = null;
  state.ui.logDate = todayKey();
  state.ui.liveDate = todayKey();
  state.ui.liveStarted = false;
  state.ui.liveSplit = "";
  state.ui.liveMuscle = "";
  if (onboarding) onboarding.hidden = true;
  applyTheme();
  applyUnits();
  renderAll();
}

function supabaseEnabled() {
  return !!supabase;
}

async function initSupabase() {
  if (!supabaseEnabled()) return;
  const { data } = await supabase.auth.getSession();
  authUser = data?.session?.user || null;
  if (authUser) {
    state.user.id = authUser.id;
    saveState();
    await bootstrapRemote();
  } else {
    resetStateForSignOut();
  }
  updateAccountUI();
  supabase.auth.onAuthStateChange(async (_event, session) => {
    authUser = session?.user || null;
    if (authUser) {
      state.user.id = authUser.id;
      saveState();
      await bootstrapRemote();
    } else {
      currentProfile = null;
      resetStateForSignOut();
    }
    updateAccountUI();
  });
}

async function bootstrapRemote() {
  if (!authUser) return;
  await ensureProfile();
  await syncLocalToSupabase();
  await loadRemoteData();
  openOnboardingIfNeeded();
}

function updateAccountUI() {
  if (!accountStatus) return;
  if (!supabaseEnabled()) {
    accountStatus.textContent = "Supabase not configured";
    if (logoutBtn) logoutBtn.hidden = true;
    if (mobileAccountBtn) mobileAccountBtn.textContent = "Account";
    return;
  }
  if (!authUser) {
    accountStatus.textContent = "Not signed in";
    if (logoutBtn) logoutBtn.hidden = true;
    if (mobileAccountBtn) mobileAccountBtn.textContent = "Sign in";
    return;
  }
  accountStatus.textContent = currentProfile?.display_name
    ? `Signed in as ${currentProfile.display_name}`
    : "Signed in";
  if (logoutBtn) logoutBtn.hidden = false;
  if (mobileAccountBtn) mobileAccountBtn.textContent = "Account";
}

function openAuthModal() {
  if (!authModal) return;
  authModal.hidden = false;
  setAuthMessage("");
  setAuthMode("signin");
}

function closeAuthModal() {
  if (!authModal) return;
  authModal.hidden = true;
  setAuthMessage("");
}

function setAuthMode(mode) {
  const nextMode = mode === "signup" ? "signup" : "signin";
  if (authMode) {
    authMode.querySelectorAll("button").forEach((btn) => {
      const on = btn.dataset.mode === nextMode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  if (signupExtra) signupExtra.hidden = nextMode !== "signup";
  if (authSubtitle) {
    authSubtitle.textContent = nextMode === "signup" ? "Create your Momentum profile." : "Sign in to sync your data.";
  }
}

async function handleAuthSubmit() {
  if (!supabaseEnabled()) {
    setAuthMessage("Supabase is not configured.");
    return;
  }
  const mode = authMode?.querySelector("button.active")?.dataset?.mode || "signin";
  const email = (authEmail && authEmail.value || "").trim();
  const password = (authPassword && authPassword.value || "").trim();
  if (!email || !password) {
    setAuthMessage("Email and password are required.");
    return;
  }

  if (mode === "signup") {
    const username = normalizeUsername((authUsername && authUsername.value || "").trim());
    if (!username) {
      setAuthMessage("Username is required.");
      return;
    }
    const displayName = username;
    const ageValue = parseInt((authAge && authAge.value || "").trim(), 10);
    if (!Number.isFinite(ageValue) || ageValue <= 0) {
      setAuthMessage("Enter a valid age.");
      return;
    }
    const genderValue = ((authGender && authGender.value) || "").trim().toLowerCase();
    if (!genderValue) {
      setAuthMessage("Select a gender.");
      return;
    }
    const heightInput = (authHeight && authHeight.value || "").trim();
    const heightCm = parseHeightCm(heightInput);
    if (!Number.isFinite(heightCm) || heightCm <= 0) {
      setAuthMessage("Enter a valid height.");
      return;
    }
    const startingWeightInput = (authStartingWeight && authStartingWeight.value || "").trim();
    const startingWeight = parseWeight(startingWeightInput);
    if (!Number.isFinite(startingWeight) || startingWeight <= 0) {
      setAuthMessage("Enter a valid starting weight.");
      return;
    }
    state.user.name = displayName;
    state.user.age = ageValue;
    state.user.gender = genderValue;
    state.user.heightCm = heightCm;
    state.user.startingWeightLb = startingWeight;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
          age: ageValue,
          gender: genderValue,
          height_cm: heightCm,
          starting_weight_lb: startingWeight
        }
      }
    });
    if (error) {
      setAuthMessage(error.message || "Sign up failed.");
      return;
    }
    setAuthMessage("Check your email to confirm your account.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthMessage(error.message || "Sign in failed.");
    return;
  }
  closeAuthModal();
}

async function handleSignOut() {
  if (!supabaseEnabled()) return;
  await supabase.auth.signOut();
  authUser = null;
  currentProfile = null;
  updateAccountUI();
  toast("Signed out.");
}

function setAuthMessage(message) {
  if (!authMessage) return;
  authMessage.textContent = message || "";
}

function normalizeUsername(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

async function ensureProfile() {
  if (!supabaseEnabled() || !authUser) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, goal, frequency, today_focus, age, gender, height_cm, starting_weight_lb, units, theme, prefers_morning, onboarded, insight_intensity")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error) {
    setAuthMessage("Profile lookup failed.");
    return;
  }
  if (data) {
    currentProfile = data;
    applyProfileToState(data);
    applyTheme();
    applyUnits();
    saveState();
    return;
  }
  await createProfileFromMetadata();
}

async function createProfileFromMetadata() {
  if (!supabaseEnabled() || !authUser) return;
  const meta = authUser.user_metadata || {};
  const emailPrefix = (authUser.email || "user").split("@")[0];
  let username = normalizeUsername(meta.username || emailPrefix);
  let displayName = (meta.display_name || "").trim();
  const metaAge = Number(meta.age);
  const metaGender = String(meta.gender || "").trim().toLowerCase();
  const metaHeight = Number(meta.height_cm ?? meta.heightCm);
  const metaStartingWeight = Number(meta.starting_weight_lb ?? meta.startingWeightLb);
  if (!displayName) displayName = username || emailPrefix;
  let attempts = 0;
  while (attempts < 5) {
    const payload = {
      id: authUser.id,
      username,
      display_name: displayName,
      age: Number.isFinite(metaAge) ? metaAge : (Number.isFinite(state.user.age) ? state.user.age : null),
      gender: metaGender || state.user.gender || null,
      height_cm: Number.isFinite(metaHeight)
        ? metaHeight
        : (Number.isFinite(state.user.heightCm) ? state.user.heightCm : null),
      starting_weight_lb: Number.isFinite(metaStartingWeight)
        ? metaStartingWeight
        : (Number.isFinite(state.user.startingWeightLb) ? state.user.startingWeightLb : null),
      goal: state.user.goal || null,
      frequency: state.user.frequency || null,
      today_focus: state.user.todayFocus || null,
      units: state.user.units || "lb",
      theme: state.user.theme || "auto",
      prefers_morning: !!state.user.prefersMorning,
      onboarded: !!state.user.onboarded,
      insight_intensity: state.user.insightIntensity || "strict"
    };
    const { error } = await supabase.from("profiles").insert(payload);
    if (!error) {
      currentProfile = payload;
      applyProfileToState(payload);
      applyTheme();
      applyUnits();
      saveState();
      return;
    }
    if (error.code === "23505") {
      username = normalizeUsername(`${username}${Math.floor(Math.random() * 90 + 10)}`);
      attempts += 1;
      continue;
    }
    setAuthMessage("Unable to create profile.");
    return;
  }
  setAuthMessage("Pick a different username and try again.");
}

async function syncLocalToSupabase() {
  if (!supabaseEnabled() || !authUser) return;
  const logs = Object.values(state.workoutLogs || {});
  for (const log of logs) {
    await syncWorkoutToSupabase(log);
  }
  const weights = Object.values(state.weightLogs || {});
  for (const weight of weights) {
    await syncWeightToSupabase(weight);
  }
  const templates = Object.values(state.workouts.templates || {});
  for (const template of templates) {
    await syncTemplateToSupabase(template);
  }
  const groups = state.groups.order.map((id) => state.groups.byId[id]).filter(Boolean);
  for (const group of groups) {
    await syncGroupToSupabase(group);
  }
}

async function loadRemoteData() {
  if (!supabaseEnabled() || !authUser) return;
  await loadWorkoutLogsFromSupabase();
  await loadWeightLogsFromSupabase();
  await seedStartingWeightLog();
  await loadWorkoutTemplatesFromSupabase();
  await loadGroupsFromSupabase();
  saveState();
  renderAll();
}

async function loadWorkoutLogsFromSupabase() {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("log_date, name, exercises, total_volume, total_sets, created_at, split_type, primary_muscles, secondary_muscles")
    .eq("user_id", authUser.id);
  if (error) return;
  const logs = {};
  (data || []).forEach((row) => {
    logs[row.log_date] = {
      id: createId("log"),
      date: row.log_date,
      name: row.name,
      exercises: Array.isArray(row.exercises) ? row.exercises : [],
      splitType: row.split_type || "",
      primaryMuscles: Array.isArray(row.primary_muscles) ? row.primary_muscles : [],
      secondaryMuscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles : [],
      totalVolume: Number(row.total_volume) || 0,
      totalSets: Number(row.total_sets) || 0,
      createdAt: row.created_at || new Date().toISOString()
    };
    ensureExerciseBodyParts(logs[row.log_date]);
  });
  state.workoutLogs = logs;
  state.workoutDrafts = {};
  Object.keys(logs).forEach((key) => {
    state.workoutDrafts[key] = clone(logs[key]);
    ensureExerciseBodyParts(state.workoutDrafts[key]);
  });
}

async function loadWeightLogsFromSupabase() {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("log_date, weight_lb, note, is_morning")
    .eq("user_id", authUser.id);
  if (error) return;
  const logs = {};
  (data || []).forEach((row) => {
    logs[row.log_date] = {
      date: row.log_date,
      weightLb: Number(row.weight_lb),
      note: row.note || "",
      isMorning: !!row.is_morning
    };
  });
  state.weightLogs = logs;
}

async function seedStartingWeightLog() {
  if (!supabaseEnabled() || !authUser) return;
  if (!Number.isFinite(state.user.startingWeightLb)) return;
  const existing = Object.keys(state.weightLogs || {});
  if (existing.length) return;
  const dateKey = todayKey();
  const log = {
    date: dateKey,
    weightLb: state.user.startingWeightLb,
    note: "Starting weight",
    isMorning: false
  };
  state.weightLogs[dateKey] = log;
  await syncWeightToSupabase(log);
}

async function loadWorkoutTemplatesFromSupabase() {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, name, exercises, updated_at")
    .eq("user_id", authUser.id)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) return;
  const templates = {};
  (data || []).forEach((row) => {
    templates[row.id] = {
      id: row.id,
      name: row.name,
      exercises: Array.isArray(row.exercises) ? row.exercises : []
    };
  });
  state.workouts.templates = templates;
  state.workouts.lastTemplateId = data && data.length ? data[0].id : null;
}

async function loadGroupsFromSupabase() {
  const { data: membership, error } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, icon, is_private, challenge_type, challenge_goal, owner_id, created_at)")
    .eq("user_id", authUser.id);
  if (error) return;
  const groups = {};
  const order = [];
  (membership || []).forEach((row) => {
    if (!row.groups) return;
    const group = {
      id: row.groups.id,
      name: row.groups.name,
      icon: row.groups.icon || "GR",
      isPrivate: row.groups.is_private,
      ownerId: row.groups.owner_id,
      createdAt: row.groups.created_at,
      challenge: buildChallenge(row.groups.challenge_type, row.groups.challenge_goal),
      members: [],
      feed: []
    };
    groups[group.id] = group;
    order.push(group.id);
  });
  state.groups.byId = groups;
  state.groups.order = order;
  state.ui.selectedGroupId = state.ui.selectedGroupId && groups[state.ui.selectedGroupId]
    ? state.ui.selectedGroupId
    : order[0] || null;

  const groupIds = order;
  if (!groupIds.length) return;
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id, user_id, joined_at, profiles(id, username, display_name)")
    .in("group_id", groupIds);
  const memberIds = new Set();
  (memberRows || []).forEach((row) => {
    const group = groups[row.group_id];
    if (!group) return;
    const profile = row.profiles || {};
    group.members.push({
      id: row.user_id,
      name: profile.display_name || profile.username || "Member",
      username: profile.username || "",
      joinedAt: row.joined_at,
      logs: []
    });
    memberIds.add(row.user_id);
  });

  await loadMemberWeights(Array.from(memberIds), groups);
  await loadGroupActivity(Array.from(memberIds), groups);
  await loadGroupFeed(groupIds, groups);
}

async function loadMemberWeights(memberIds, groups) {
  if (!memberIds.length) return;
  const { data } = await supabase
    .from("weight_logs")
    .select("user_id, log_date, weight_lb")
    .in("user_id", memberIds);
  const latest = {};
  (data || []).forEach((row) => {
    if (!row.user_id) return;
    const existing = latest[row.user_id];
    if (!existing || row.log_date > existing.date) {
      latest[row.user_id] = { date: row.log_date, weight: Number(row.weight_lb) };
    }
  });
  Object.values(groups).forEach((group) => {
    group.members.forEach((member) => {
      const weight = latest[member.id];
      if (weight) member.weightLb = weight.weight;
    });
  });
}

async function loadGroupActivity(memberIds, groups) {
  if (!memberIds.length) return;
  const startDate = formatDateKey(new Date(Date.now() - 29 * DAY_MS));
  const { data } = await supabase
    .from("workout_logs")
    .select("user_id, log_date, total_volume, total_sets")
    .in("user_id", memberIds)
    .gte("log_date", startDate);
  const logsByUser = {};
  (data || []).forEach((row) => {
    if (!logsByUser[row.user_id]) logsByUser[row.user_id] = [];
    logsByUser[row.user_id].push({
      date: row.log_date,
      totalVolume: Number(row.total_volume) || 0,
      totalSets: Number(row.total_sets) || 0
    });
  });
  Object.values(groups).forEach((group) => {
    group.members.forEach((member) => {
      member.logs = logsByUser[member.id] || [];
    });
  });
}

async function loadGroupFeed(groupIds, groups) {
  const { data } = await supabase
    .from("group_feed")
    .select("group_id, user_id, type, message, created_at")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(80);
  (data || []).forEach((row) => {
    const group = groups[row.group_id];
    if (!group) return;
    group.feed.push({
      id: createId("gfeed"),
      type: row.type,
      title: row.message || "Group update",
      subtitle: "Group feed",
      createdAt: row.created_at
    });
  });
}

async function syncWorkoutToSupabase(log) {
  if (!supabaseEnabled() || !authUser || !log) return;
  const payload = buildWorkoutPayload(log);
  await supabase.from("workout_logs").upsert(payload, { onConflict: "user_id,log_date" });
}

function buildWorkoutPayload(log) {
  const totalSets = countSets(log);
  const totalVolume = workoutVolume(log, "all");
  return {
    user_id: authUser.id,
    log_date: log.date,
    name: log.name || "Workout",
    exercises: log.exercises || [],
    split_type: log.splitType || null,
    primary_muscles: Array.isArray(log.primaryMuscles) ? log.primaryMuscles : [],
    secondary_muscles: Array.isArray(log.secondaryMuscles) ? log.secondaryMuscles : [],
    total_volume: totalVolume,
    total_sets: totalSets
  };
}

async function syncWeightToSupabase(weight) {
  if (!supabaseEnabled() || !authUser || !weight) return;
  const payload = {
    user_id: authUser.id,
    log_date: weight.date,
    weight_lb: Number.isFinite(weight.weightLb) ? weight.weightLb : null,
    note: weight.note || "",
    is_morning: !!weight.isMorning
  };
  await supabase.from("weight_logs").upsert(payload, { onConflict: "user_id,log_date" });
}

async function syncTemplateToSupabase(template) {
  if (!supabaseEnabled() || !authUser || !template) return;
  const payload = {
    id: template.id,
    user_id: authUser.id,
    name: template.name || "Workout",
    exercises: template.exercises || []
  };
  await supabase.from("workout_templates").upsert(payload, { onConflict: "id" });
}

async function syncGroupToSupabase(group) {
  if (!supabaseEnabled() || !authUser || !group) return;
  const payload = {
    id: group.id,
    owner_id: authUser.id,
    name: group.name,
    icon: group.icon,
    is_private: group.isPrivate,
    challenge_type: group.challenge.type,
    challenge_goal: group.challenge.goal
  };
  await supabase.from("groups").upsert(payload, { onConflict: "id" });
  await supabase.from("group_members").upsert({
    group_id: group.id,
    user_id: authUser.id
  }, { onConflict: "group_id,user_id" });
}

async function removeGroupMember(groupId, userId) {
  if (!supabaseEnabled() || !authUser) return;
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
}

async function syncGroupMessage(group, text) {
  if (!supabaseEnabled() || !authUser || !group) return;
  await supabase.from("group_feed").insert({
    group_id: group.id,
    user_id: authUser.id,
    type: "message",
    message: text
  });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 150);
}

function saveState() {
  // Supabase is the source of truth; avoid local persistence.
}

function loadState() {
  const base = clone(DEFAULT_STATE);
  base.ui.logDate = todayKey();
  base.ui.liveDate = todayKey();
  return base;
}

function deepMerge(target, source) {
  if (!source || typeof source !== "object") return;
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureUserId() {
  if (supabaseEnabled() && authUser) {
    state.user.id = authUser.id;
  }
}

function applyInitialTabFromUrl() {
  const hashTab = window.location.hash.replace("#", "").trim().toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const queryTab = (params.get("tab") || "").trim().toLowerCase();
  const tab = queryTab || hashTab;
  const allowed = ["today", "log", "live", "progress", "groups", "feed"];
  if (allowed.includes(tab)) {
    state.ui.activeTab = tab;
  }
}

function updateLocationHash(tab) {
  if (!tab) return;
  const current = window.location.hash.replace("#", "");
  if (current === tab) return;
  try {
    window.history.replaceState(null, "", `#${tab}`);
  } catch (err) {
  }
}

function createUuid() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rnd = Math.random() * 16 | 0;
    const value = char === "x" ? rnd : (rnd & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createId(prefix) {
  if (window.crypto && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLong(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDateShort(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  if (hour >= 18) greeting = "Good evening";
  return state.user.name ? `${greeting}, ${state.user.name}` : greeting;
}

function getDraft(dateKey) {
  if (!state.workoutDrafts[dateKey]) {
    const existing = state.workoutLogs[dateKey];
    state.workoutDrafts[dateKey] = existing ? clone(existing) : {
      id: createId("log"),
      date: dateKey,
      name: "",
      exercises: []
    };
    ensureExerciseBodyParts(state.workoutDrafts[dateKey]);
  }
  return state.workoutDrafts[dateKey];
}

function resetDraftForDate(dateKey) {
  state.workoutDrafts[dateKey] = {
    id: createId("log"),
    date: dateKey,
    name: "",
    exercises: []
  };
  state.ui.expandedExercise = null;
}

function normalizeDraft(draft, dateKey) {
  const splitType = (draft.splitType || "").trim().toLowerCase();
  const primaryMuscles = Array.isArray(draft.primaryMuscles)
    ? draft.primaryMuscles.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const secondaryMuscles = Array.isArray(draft.secondaryMuscles)
    ? draft.secondaryMuscles.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  return {
    id: draft.id || createId("log"),
    date: dateKey,
    name: (draft.name || "Workout").slice(0, 80),
    exercises: draft.exercises.map((ex) => ({
      name: (ex.name || "Exercise").slice(0, 60),
      bodyParts: ex.bodyParts && ex.bodyParts.length ? ex.bodyParts : deriveBodyParts(ex.name),
      sets: ex.sets.map((set) => ({
        reps: Number.isFinite(set.reps) ? set.reps : 0,
        weight: Number.isFinite(set.weight) ? set.weight : 0
      }))
    })),
    splitType: splitType || "",
    primaryMuscles,
    secondaryMuscles,
    createdAt: draft.createdAt || new Date().toISOString()
  };
}

function ensureExerciseBodyParts(log) {
  if (!log || !Array.isArray(log.exercises)) return;
  log.exercises.forEach((ex) => {
    if (!ex.bodyParts || !ex.bodyParts.length) {
      ex.bodyParts = deriveBodyParts(ex.name);
    }
  });
}

function getDefaultSet(name, currentSets) {
  if (currentSets && currentSets.length) {
    const last = currentSets[currentSets.length - 1];
    return { reps: last.reps || 0, weight: last.weight || 0 };
  }
  const fromHistory = findLastSet(name);
  if (fromHistory) return fromHistory;
  return { reps: null, weight: null };
}

function findLastSet(name) {
  const logs = Object.values(state.workoutLogs || {});
  logs.sort((a, b) => a.date.localeCompare(b.date));
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const log = logs[i];
    for (const ex of log.exercises || []) {
      if (normalizeName(ex.name) === normalizeName(name)) {
        const last = ex.sets && ex.sets[ex.sets.length - 1];
        if (last) return { reps: last.reps || 0, weight: last.weight || 0 };
      }
    }
  }
  return null;
}

function hasWorkoutActivity(draft) {
  return draft.exercises.some((ex) => ex.sets.some((set) => (Number(set.reps) || 0) > 0 || (Number(set.weight) || 0) > 0));
}

function saveTemplate(log) {
  const id = state.workouts.lastTemplateId || createUuid();
  const template = {
    id,
    name: log.name,
    exercises: log.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((set) => ({ reps: set.reps, weight: set.weight }))
    }))
  };
  state.workouts.templates[id] = template;
  state.workouts.lastTemplateId = id;
  if (supabaseEnabled() && authUser) {
    syncTemplateToSupabase(template);
  }
}

function getLastTemplate() {
  const id = state.workouts.lastTemplateId;
  if (id && state.workouts.templates[id]) return state.workouts.templates[id];
  const last = getLatestWorkoutLog();
  if (!last) return null;
  return {
    id: createId("workout"),
    name: last.name,
    exercises: last.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((set) => ({ reps: set.reps, weight: set.weight }))
    }))
  };
}

function addWorkoutFeed(log) {
  const existing = state.feed.find((item) => item.type === "workout" && item.date === log.date);
  if (existing) return;
  const item = {
    id: createId("feed"),
    type: "workout",
    date: log.date,
    title: `${log.name || "Workout"} completed`,
    subtitle: `${countSets(log)} sets logged`,
    likes: 0,
    liked: false,
    comments: [],
    createdAt: new Date().toISOString()
  };
  state.feed.unshift(item);

  const streak = computeStreak();
  if ([3, 7, 14, 30].includes(streak)) {
    state.feed.unshift({
      id: createId("feed"),
      type: "streak",
      date: log.date,
      title: `Streak milestone: ${streak} days`,
      subtitle: "Keep the momentum going.",
      likes: 0,
      liked: false,
      comments: [],
      createdAt: new Date().toISOString()
    });
  }
}

function addGroupFeed(log) {
  const groups = state.groups.order.map((id) => state.groups.byId[id]).filter(Boolean);
  groups.forEach((group) => {
    const item = {
      id: createId("gfeed"),
      type: "workout",
      title: `${state.user.name || "You"} completed a workout`,
      subtitle: `${log.name || "Workout"} logged`,
      createdAt: new Date().toISOString()
    };
    group.feed.unshift(item);
    if (supabaseEnabled() && authUser) {
      supabase.from("group_feed").insert({
        group_id: group.id,
        user_id: authUser.id,
        type: "workout",
        message: item.title
      });
    }
  });
}

function countSets(log) {
  return (log.exercises || []).reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);
}

function countWorkoutsInRange(daysBack) {
  const today = new Date();
  const cutoff = new Date(today.getTime() - daysBack * DAY_MS);
  return Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= cutoff;
  }).length;
}

function weeklyGoalFromFrequency(freq) {
  if (freq === "2-3") return 3;
  if (freq === "4-5") return 5;
  if (freq === "6+") return 6;
  return 0;
}

function calcWeightTrend(days) {
  const logs = weightLogsInRange(days);
  if (logs.length < 2) return null;
  return logs[logs.length - 1].weightLb - logs[0].weightLb;
}

function weightLogsInRange(days) {
  const today = new Date();
  const cutoff = new Date(today.getTime() - (days - 1) * DAY_MS);
  const logs = Object.values(state.weightLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= cutoff;
  });
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs;
}

function getLastWeight() {
  const logs = Object.values(state.weightLogs || {});
  if (!logs.length) return null;
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs[logs.length - 1].weightLb;
}

function parseWeight(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  if (state.user.units === "kg") return n * KG_IN_LB;
  return n;
}

function parseHeightCm(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  if (state.user.units === "kg") return n;
  return n * 2.54;
}

function formatWeight(valueLb) {
  if (!Number.isFinite(valueLb)) return "";
  const value = state.user.units === "kg" ? valueLb / KG_IN_LB : valueLb;
  return value.toFixed(1);
}

function formatHeight(valueCm) {
  if (!Number.isFinite(valueCm)) return "";
  if (state.user.units === "kg") return `${Math.round(valueCm)} cm`;
  const inches = valueCm / 2.54;
  return `${Math.round(inches)} in`;
}

function formatWeightInput(value) {
  if (!Number.isFinite(value)) return "";
  return value;
}

function formatSignedWeight(delta) {
  if (delta === null) return "--";
  const value = state.user.units === "kg" ? delta / KG_IN_LB : delta;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${state.user.units}`;
}

function buildWeightSeries(days) {
  return weightLogsInRange(days).map((log) => ({
    label: log.date,
    value: state.user.units === "kg" ? log.weightLb / KG_IN_LB : log.weightLb
  }));
}

function buildWorkoutSeries(weeks) {
  const today = new Date();
  const series = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(today.getTime() - i * 7 * DAY_MS);
    const start = new Date(end.getTime() - 6 * DAY_MS);
    const count = Object.values(state.workoutLogs || {}).filter((log) => {
      const date = new Date(log.date + "T00:00:00");
      return date >= start && date <= end;
    }).length;
    series.push({ label: formatDateShort(end), value: count });
  }
  return series;
}

function workoutsComparedToLastWeek() {
  const now = new Date();
  const endCurrent = new Date(now);
  const startCurrent = new Date(now.getTime() - 6 * DAY_MS);
  const endPrev = new Date(startCurrent.getTime() - DAY_MS);
  const startPrev = new Date(endPrev.getTime() - 6 * DAY_MS);

  const current = Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= startCurrent && date <= endCurrent;
  }).length;

  const prev = Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= startPrev && date <= endPrev;
  }).length;

  if (!current && !prev) return null;
  return current - prev;
}

function buildStrengthSeries(limit, bodyFilter = "all") {
  const logs = Object.values(state.workoutLogs || {});
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs.slice(-limit).map((log) => ({
    label: formatDateShort(new Date(log.date + "T00:00:00")),
    value: workoutVolume(log, bodyFilter)
  }));
}

function workoutVolume(log, bodyFilter = "all") {
  return (log.exercises || []).reduce((acc, ex) => {
    if (!exerciseMatchesBodyFilter(ex, bodyFilter)) return acc;
    return acc + (ex.sets || []).reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
  }, 0);
}

function bestVolume(bodyFilter = "all") {
  return Object.values(state.workoutLogs || {}).reduce((max, log) => Math.max(max, workoutVolume(log, bodyFilter)), 0);
}

function buildWeightDetail() {
  const logs = weightLogsInRange(30);
  if (!logs.length) return "Log weight to see detailed trends.";
  const values = logs.map((log) => log.weightLb);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `30-day average: ${formatWeight(avg)} ${state.user.units}. Range: ${formatWeight(min)} to ${formatWeight(max)}.`;
}

function buildWorkoutDetail() {
  const total = Object.keys(state.workoutLogs || {}).length;
  if (!total) return "Log workouts to see details.";
  return `Total workouts logged: ${total}. Longest streak: ${computeLongestStreak()} days.`;
}

function buildStrengthDetail(bodyFilter = "all") {
  const logs = Object.values(state.workoutLogs || {});
  if (!logs.length) return "Log workouts with weight to see strength details.";
  const volumes = logs.map((log) => workoutVolume(log, bodyFilter));
  const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const label = bodyFilter === "all" ? "" : ` for ${labelFromFilter(bodyFilter)}`;
  return `Average volume per workout${label}: ${formatVolume(avg)}. Best: ${formatVolume(bestVolume(bodyFilter))}.`;
}

function formatVolume(value) {
  const unit = state.user.units === "kg" ? "kg" : "lb";
  const display = state.user.units === "kg" ? value / KG_IN_LB : value;
  return `${Math.round(display)} ${unit}`;
}

function drawLineChart(canvas, series) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (!series.length) {
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.font = "13px Space Grotesk";
    ctx.fillText("No data yet", 10, height / 2);
    return;
  }

  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = max === min ? 1 : (max - min) * 0.15;
  const low = min - pad;
  const high = max + pad;
  const stepX = series.length === 1 ? 0 : width / (series.length - 1);

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ctx.lineWidth = 2;
  ctx.beginPath();
  series.forEach((point, idx) => {
    const x = idx * stepX;
    const y = height - ((point.value - low) / (high - low)) * height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  series.forEach((point, idx) => {
    const x = idx * stepX;
    const y = height - ((point.value - low) / (high - low)) * height;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function computeStreak() {
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = formatDateKey(cursor);
    const log = state.workoutLogs[key];
    if (log && hasWorkoutActivity(log)) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak() {
  const dates = Object.keys(state.workoutLogs || {}).sort();
  if (!dates.length) return 0;
  let max = 0;
  let current = 0;
  let prevDate = null;
  dates.forEach((key) => {
    const log = state.workoutLogs[key];
    if (!log || !hasWorkoutActivity(log)) return;
    if (!prevDate) {
      current = 1;
    } else {
      const prev = new Date(prevDate + "T00:00:00");
      const curr = new Date(key + "T00:00:00");
      const diff = Math.round((curr - prev) / DAY_MS);
      if (diff === 1) current += 1;
      else current = 1;
    }
    max = Math.max(max, current);
    prevDate = key;
  });
  return max;
}

function getLatestWorkoutLog() {
  const logs = Object.values(state.workoutLogs || {});
  if (!logs.length) return null;
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs[logs.length - 1];
}

function buildGroupUpdate() {
  const group = getSelectedGroup();
  if (!group) return "Join a group to unlock friendly competition.";
  const change = rankChangeForGroup(group);
  if (change === null) return `Tracking progress in ${group.name}.`;
  if (change === 0) return `Holding steady in ${group.name}.`;
  if (change > 0) return `You moved up ${change} spots in ${group.name}.`;
  return `Down ${Math.abs(change)} spots in ${group.name}.`;
}

function getSelectedGroup() {
  const id = state.ui.selectedGroupId;
  if (!id) return null;
  return state.groups.byId[id] || null;
}

function buildChallenge(type, goal) {
  if (type === "streak") {
    return { type, goal, label: `Streak goal: ${goal} days` };
  }
  if (type === "volume") {
    return { type, goal, label: `Volume goal: ${goal}` };
  }
  return { type: "workouts", goal, label: `Workouts per week: ${goal}` };
}

function buildGroupLeaderboard(group, metric, range) {
  const rows = group.members.map((member) => {
    const stats = computeMemberStats(member, group, range);
    return {
      id: member.id,
      name: member.id === state.user.id ? "You" : member.name,
      isMe: member.id === state.user.id,
      stats
    };
  });
  return applyGroupFilter(rows).sort((a, b) => metricSort(metric, a.stats, b.stats));
}

function metricSort(metric, a, b) {
  const diff = metricValue(metric, b) - metricValue(metric, a);
  if (diff !== 0) return diff;
  return (b.workouts || 0) - (a.workouts || 0);
}

function metricValue(metric, stats) {
  if (metric === "streak") return stats.streak || 0;
  if (metric === "improved") return stats.improved || 0;
  if (metric === "volume") return stats.volume || 0;
  if (metric === "goal") return stats.goalPct || 0;
  return stats.workouts || 0;
}

function formatMetricValue(metric, stats, group) {
  if (metric === "streak") return { label: "Streak", value: `${stats.streak || 0} days` };
  if (metric === "improved") return { label: "Improved", value: `+${stats.improved || 0}` };
  if (metric === "volume") return { label: "Volume", value: formatVolume(stats.volume || 0) };
  if (metric === "goal") return { label: "Goal", value: `${Math.round(stats.goalPct || 0)}%` };
  return { label: group.challenge.label, value: `${stats.workouts || 0} workouts` };
}

function computeMemberStats(member, group, range) {
  if (member.type === "manual") {
    const stats = member.stats || {};
    const workouts = range === 7 ? stats.workouts7d || 0 : stats.workouts30d || 0;
    const volume = range === 7 ? stats.volume7d || 0 : stats.volume30d || 0;
    const goalPct = group.challenge.goal ? (workouts / group.challenge.goal) * 100 : 0;
    return {
      workouts,
      streak: stats.streak || 0,
      volume,
      improved: stats.improved || 0,
      goalPct,
      weightLb: member.weightLb
    };
  }
  const logs = getMemberLogs(member);
  const workouts = workoutsForRange(logs, range, 0);
  const volume = volumeForRangeLogs(logs, range, 0);
  const goalPct = group.challenge.goal ? (workouts / group.challenge.goal) * 100 : 0;
  return {
    workouts,
    streak: streakFromLogs(logs),
    volume,
    improved: workoutsDeltaForRange(logs, range),
    goalPct,
    weightLb: getMemberWeight(member)
  };
}

function countWorkoutsForRange(range) {
  const today = new Date();
  const cutoff = new Date(today.getTime() - (range - 1) * DAY_MS);
  return Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= cutoff;
  }).length;
}

function getMemberLogs(member) {
  if (member && Array.isArray(member.logs) && member.logs.length) return member.logs;
  if (member && member.id === state.user.id) {
    return Object.values(state.workoutLogs || {}).map((log) => ({
      date: log.date,
      totalVolume: workoutVolume(log, "all"),
      totalSets: countSets(log)
    }));
  }
  return [];
}

function workoutsForRange(logs, range, offsetDays) {
  const end = new Date(Date.now() - offsetDays * DAY_MS);
  const start = new Date(end.getTime() - (range - 1) * DAY_MS);
  return (logs || []).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= start && date <= end;
  }).length;
}

function volumeForRangeLogs(logs, range, offsetDays) {
  const end = new Date(Date.now() - offsetDays * DAY_MS);
  const start = new Date(end.getTime() - (range - 1) * DAY_MS);
  return (logs || []).reduce((acc, log) => {
    const date = new Date(log.date + "T00:00:00");
    if (date < start || date > end) return acc;
    return acc + (Number(log.totalVolume) || 0);
  }, 0);
}

function workoutsDeltaForRange(logs, range) {
  const current = workoutsForRange(logs, range, 0);
  const prev = workoutsForRange(logs, range, range);
  return current - prev;
}

function streakFromLogs(logs) {
  const dateSet = new Set((logs || []).map((log) => log.date));
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = formatDateKey(cursor);
    if (dateSet.has(key)) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    } else {
      break;
    }
  }
  return streak;
}

function getMemberWeight(member) {
  if (member && Number.isFinite(member.weightLb)) return member.weightLb;
  if (member && member.id === state.user.id) return getLastWeight();
  return null;
}

function volumeForRange(range) {
  const today = new Date();
  const cutoff = new Date(today.getTime() - (range - 1) * DAY_MS);
  return Object.values(state.workoutLogs || {}).reduce((acc, log) => {
    const date = new Date(log.date + "T00:00:00");
    if (date < cutoff) return acc;
    return acc + workoutVolume(log);
  }, 0);
}

function workoutsComparedToPrevRange(range) {
  const today = new Date();
  const endCurrent = new Date(today);
  const startCurrent = new Date(today.getTime() - (range - 1) * DAY_MS);
  const endPrev = new Date(startCurrent.getTime() - DAY_MS);
  const startPrev = new Date(endPrev.getTime() - (range - 1) * DAY_MS);

  const current = Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= startCurrent && date <= endCurrent;
  }).length;

  const prev = Object.values(state.workoutLogs || {}).filter((log) => {
    const date = new Date(log.date + "T00:00:00");
    return date >= startPrev && date <= endPrev;
  }).length;

  return current - prev;
}

function rankChangeForGroup(group) {
  if (!group) return null;
  const current = buildGroupLeaderboard(group, "consistency", 7);
  const prev = buildGroupLeaderboardForPrev(group, "consistency", 7);
  const currentRank = current.findIndex((row) => row.id === state.user.id);
  const prevRank = prev.findIndex((row) => row.id === state.user.id);
  if (currentRank < 0 || prevRank < 0) return null;
  return prevRank - currentRank;
}

function buildGroupLeaderboardForPrev(group, metric, range) {
  const rows = group.members.map((member) => {
    const stats = computeMemberStatsPrev(member, group, range);
    return {
      id: member.id,
      name: member.id === state.user.id ? "You" : member.name,
      isMe: member.id === state.user.id,
      stats
    };
  });
  return applyGroupFilter(rows).sort((a, b) => metricSort(metric, a.stats, b.stats));
}

function computeMemberStatsPrev(member, group, range) {
  if (member.type === "manual") {
    const stats = member.stats || {};
    const workouts = Math.max(0, (range === 7 ? stats.workouts7d : stats.workouts30d) - (stats.improved || 0));
    const volume = range === 7 ? stats.volume7d || 0 : stats.volume30d || 0;
    const goalPct = group.challenge.goal ? (workouts / group.challenge.goal) * 100 : 0;
    return {
      workouts,
      streak: stats.streak || 0,
      volume,
      improved: stats.improved || 0,
      goalPct,
      weightLb: member.weightLb
    };
  }

  const logs = getMemberLogs(member);
  const workouts = workoutsForRange(logs, range, range);
  const volume = volumeForRangeLogs(logs, range, range);
  const goalPct = group.challenge.goal ? (workouts / group.challenge.goal) * 100 : 0;
  return {
    workouts,
    streak: streakFromLogs(logs),
    volume,
    improved: 0,
    goalPct,
    weightLb: getMemberWeight(member)
  };
}

function getRankForGroup(group, metric, range, userId) {
  const rows = buildGroupLeaderboard(group, metric, range);
  const idx = rows.findIndex((row) => row.id === userId);
  return idx >= 0 ? idx + 1 : null;
}

function applyGroupFilter(rows) {
  const filter = state.ui.groupFilter || "all";
  if (filter === "all") return rows;
  return rows.filter((row) => weightClassFromLb(row.stats.weightLb) === filter);
}

function weightClassFromLb(weightLb) {
  if (!Number.isFinite(weightLb)) return "unknown";
  if (weightLb < 160) return "light";
  if (weightLb < 200) return "middle";
  return "heavy";
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function normalizeFilterValue(label) {
  return String(label || "").trim().toLowerCase();
}

function labelFromFilter(filter) {
  const match = BODY_PART_OPTIONS.find((label) => normalizeFilterValue(label) === filter);
  return match || "All";
}

function matchesBodyFilter(bodyParts, filter) {
  if (!filter || filter === "all") return true;
  const parts = (bodyParts || []).map((part) => normalizeFilterValue(part));
  if (filter === "legs") {
    return ["legs", "quads", "hamstrings", "glutes", "calves"].some((part) => parts.includes(part));
  }
  return parts.includes(filter);
}

function exerciseMatchesBodyFilter(exercise, filter) {
  if (!exercise) return false;
  const parts = exercise.bodyParts && exercise.bodyParts.length ? exercise.bodyParts : deriveBodyParts(exercise.name);
  return matchesBodyFilter(parts, filter);
}

function matchesCategoryFilter(categories, filter) {
  if (!filter || filter === "all") return true;
  return (categories || []).some((category) => normalizeFilterValue(category) === filter);
}

function findExerciseMeta(name) {
  const target = normalizeName(name);
  return EXERCISE_LIBRARY.find((item) => normalizeName(item.name) === target) || null;
}

function deriveBodyParts(name) {
  const meta = findExerciseMeta(name);
  if (meta && meta.bodyParts && meta.bodyParts.length) return meta.bodyParts;
  return ["Other"];
}

function buildExerciseEntry(name) {
  const meta = findExerciseMeta(name);
  if (meta) {
    return { name: meta.name, bodyParts: meta.bodyParts };
  }
  return { name, bodyParts: deriveBodyParts(name) };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char];
  });
}

function formatInputValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2400);
}

function haptic(ms = 10) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (err) {
  }
}
