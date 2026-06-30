/* =========================================================
   Fraction Escape Island
   No framework. Works offline after first Google Font load.
   ========================================================= */

const SCREENS = {
  start: document.getElementById("startScreen"),
  how: document.getElementById("howScreen"),
  map: document.getElementById("mapScreen"),
  game: document.getElementById("gameScreen"),
  end: document.getElementById("endScreen"),
};

const places = [
  "ชายหาดเริ่มต้น",
  "สะพานไม้",
  "ป่าปริศนา",
  "น้ำตกสายรุ้ง",
  "ถ้ำสมบัติ",
  "หน้าผาลมแรง",
  "หมู่บ้านนกแก้ว",
  "ภูเขาไฟเงียบ",
  "ทะเลหมอก",
  "ท่าเรืออิสรภาพ"
];

const placeIcons = ["🏖️","🌉","🌴","🌈","💎","⛰️","🦜","🌋","☁️","⚓"];

const fractionPool = [
  "1/2","1/3","2/3","1/4","2/4","3/4","1/5","2/5","3/5","4/5",
  "1/6","2/6","3/6","4/6","5/6","1/8","3/8","5/8","7/8","1/10",
  "5/12","7/15","2/7","3/7","5/7","7/9","11/12","13/12","5/4","7/4",
  "4/3","5/3","7/6"
];

const hintTexts = [
  "ลองเปรียบเทียบกับ 1/2 ก่อน",
  "เศษส่วนที่มากกว่า 1 มักอยู่ด้านท้าย",
  "ถ้าตัวส่วนเท่ากัน ให้ดูตัวเศษ",
  "ลองทำตัวส่วนให้เท่ากัน หรือคิดเป็นค่าใกล้เคียง",
  "เศษส่วนที่ตัวเศษใกล้ตัวส่วน มักมีค่าใกล้ 1"
];

let state = {
  level: 0,
  score: 0,
  keys: 0,
  usedHints: 0,
  currentFractions: [],
  solvedLevels: Array(10).fill(false),
  timer: 60,
  timerId: null,
  startedAt: 0,
  locked: false
};

function showScreen(name){
  Object.values(SCREENS).forEach(s => s.classList.remove("active"));
  SCREENS[name].classList.add("active");
}

function parseFraction(frac){
  const [n,d] = frac.split("/").map(Number);
  return n / d;
}

function shuffle(arr){
  const copy = [...arr];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleFractions(count = 5){
  return shuffle(fractionPool).slice(0, count);
}

function updateHud(){
  document.getElementById("keyCount").textContent = state.keys;
  document.getElementById("scoreMap").textContent = state.score;
  document.getElementById("scoreGame").textContent = state.score;
  document.getElementById("keysGame").textContent = state.keys;
}

function buildMap(){
  const map = document.getElementById("mapPath");
  map.innerHTML = "";

  const coords = [
    [8,78],[18,48],[31,66],[42,36],[53,58],
    [62,28],[72,48],[82,25],[90,54],[94,78]
  ];

  places.forEach((place, i) => {
    const node = document.createElement("button");
    node.className = "map-node";
    if(state.solvedLevels[i]) node.classList.add("done");
    if(i === state.level && !state.solvedLevels[i]) node.classList.add("current");
    node.style.left = coords[i][0] + "%";
    node.style.top = coords[i][1] + "%";
    node.innerHTML = `<span>${state.solvedLevels[i] ? "🔑" : placeIcons[i]}</span><small>${i+1}. ${place}</small>`;
    node.title = place;
    node.addEventListener("click", () => {
      if(i <= state.level){
        state.level = i;
        startLevel();
      }
    });
    map.appendChild(node);
  });
  updateHud();
}

function startLevel(){
  stopTimer();
  state.locked = false;
  state.currentFractions = sampleFractions(5);
  document.getElementById("levelTitle").textContent = `ภารกิจที่ ${state.level + 1}`;
  document.getElementById("levelPlace").textContent = places[state.level];
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "feedback";

  renderCards();
  createSlots();
  showScreen("game");
  startTimer();
}

function renderCards(){
  const bank = document.getElementById("fractionBank");
  bank.innerHTML = "";
  shuffle(state.currentFractions).forEach(frac => {
    const card = makeCard(frac);
    bank.appendChild(card);
  });
}

function makeCard(frac){
  const card = document.createElement("div");
  card.className = "fraction-card";
  card.draggable = true;
  card.textContent = frac;
  card.dataset.value = frac;

  card.addEventListener("dragstart", e => {
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", frac);
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));

  // Touch support: tap card then tap slot
  card.addEventListener("click", () => {
    document.querySelectorAll(".fraction-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
  });

  return card;
}

function createSlots(){
  const slots = document.getElementById("dropSlots");
  slots.innerHTML = "";
  for(let i=0;i<5;i++){
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = i;

    slot.addEventListener("dragover", e => e.preventDefault());
    slot.addEventListener("drop", e => {
      e.preventDefault();
      const value = e.dataTransfer.getData("text/plain");
      placeCardInSlot(value, slot);
    });

    slot.addEventListener("click", () => {
      const selected = document.querySelector(".fraction-card.selected");
      if(selected) placeCardInSlot(selected.dataset.value, slot);
    });

    slots.appendChild(slot);
  }
}

function placeCardInSlot(value, slot){
  if(state.locked) return;

  // If card already in another slot, remove it there.
  document.querySelectorAll(".slot .fraction-card").forEach(c => {
    if(c.dataset.value === value) c.parentElement.innerHTML = "";
  });

  // Clear slot and place a cloned card.
  slot.innerHTML = "";
  const clone = makeCard(value);
  clone.classList.remove("selected");
  slot.appendChild(clone);

  // Remove original from bank.
  document.querySelectorAll("#fractionBank .fraction-card").forEach(c => {
    if(c.dataset.value === value) c.remove();
  });
}

function checkAnswer(){
  if(state.locked) return;
  const slots = [...document.querySelectorAll(".slot")];
  const values = slots.map(slot => {
    const card = slot.querySelector(".fraction-card");
    return card ? card.dataset.value : null;
  });

  const feedback = document.getElementById("feedback");
  slots.forEach(s => s.classList.remove("correct","wrong"));

  if(values.some(v => !v)){
    feedback.textContent = "ยังวางการ์ดไม่ครบทุกช่อง";
    feedback.className = "feedback bad";
    return;
  }

  const sorted = [...state.currentFractions].sort((a,b) => parseFraction(a) - parseFraction(b));
  const correct = values.every((v,i) => v === sorted[i]);

  if(correct){
    state.locked = true;
    stopTimer();
    slots.forEach(s => s.classList.add("correct"));
    feedback.textContent = "พบกุญแจแล้ว! เรียงถูกต้อง";
    feedback.className = "feedback good";

    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    let add = 10;
    if(elapsed <= 30) add += 5;
    state.score += add;

    if(!state.solvedLevels[state.level]){
      state.solvedLevels[state.level] = true;
      state.keys += 1;
    }

    updateHud();

    setTimeout(() => {
      if(state.keys >= 10){
        endGame();
      }else{
        state.level = Math.min(state.level + 1, 9);
        buildMap();
        showScreen("map");
      }
    }, 1200);
  }else{
    slots.forEach(s => s.classList.add("wrong"));
    feedback.textContent = "กุญแจยังเรียงไม่ถูก ลองตรวจใหม่อีกครั้ง";
    feedback.className = "feedback bad";
  }
}

function useHint(){
  if(state.locked) return;
  state.usedHints += 1;
  state.score = Math.max(0, state.score - 2);
  updateHud();
  const feedback = document.getElementById("feedback");
  feedback.textContent = "💡 " + hintTexts[Math.floor(Math.random() * hintTexts.length)];
  feedback.className = "feedback info";
}

function startTimer(){
  state.timer = 60;
  state.startedAt = Date.now();
  updateTimerUI();
  state.timerId = setInterval(() => {
    state.timer -= 1;
    updateTimerUI();
    if(state.timer <= 0){
      stopTimer();
      revealAnswer();
    }
  }, 1000);
}

function stopTimer(){
  if(state.timerId){
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUI(){
  const text = document.getElementById("timerText");
  const circle = document.getElementById("timerCircle");
  text.textContent = state.timer;
  const deg = Math.max(0, state.timer / 60 * 360);
  const color = state.timer <= 10 ? "var(--red)" : "var(--green)";
  circle.style.background = `conic-gradient(${color} ${deg}deg, #eee 0deg)`;
}

function revealAnswer(){
  state.locked = true;
  const sorted = [...state.currentFractions].sort((a,b) => parseFraction(a) - parseFraction(b));
  const slots = [...document.querySelectorAll(".slot")];
  slots.forEach((slot, i) => {
    slot.innerHTML = "";
    slot.appendChild(makeCard(sorted[i]));
    slot.classList.add("correct");
  });
  const bank = document.getElementById("fractionBank");
  bank.innerHTML = "";
  const feedback = document.getElementById("feedback");
  feedback.textContent = "หมดเวลา! เฉลยเรียงจากน้อยไปมากแล้ว เล่นด่านนี้ใหม่ได้";
  feedback.className = "feedback bad";
  setTimeout(() => {
    state.locked = false;
    startLevel();
  }, 2600);
}

function shuffleCurrent(){
  if(state.locked) return;
  state.currentFractions = sampleFractions(5);
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "feedback";
  renderCards();
  createSlots();
}

function resetGame(){
  stopTimer();
  state = {
    level: 0,
    score: 0,
    keys: 0,
    usedHints: 0,
    currentFractions: [],
    solvedLevels: Array(10).fill(false),
    timer: 60,
    timerId: null,
    startedAt: 0,
    locked: false
  };
  buildMap();
  showScreen("start");
}

function rank(score){
  if(score >= 130) return "ราชาแห่งเกาะเศษส่วน";
  if(score >= 90) return "กัปตันเศษส่วน";
  if(score >= 50) return "นักล่าสมบัติ";
  return "นักสำรวจฝึกหัด";
}

function endGame(){
  stopTimer();
  document.getElementById("finalScore").textContent = state.score;
  document.getElementById("finalHints").textContent = state.usedHints;
  document.getElementById("finalRank").textContent = rank(state.score);
  showScreen("end");
}

/* Button bindings */
document.getElementById("startBtn").addEventListener("click", () => { buildMap(); showScreen("map"); });
document.getElementById("howBtn").addEventListener("click", () => showScreen("how"));
document.getElementById("howStartBtn").addEventListener("click", () => { buildMap(); showScreen("map"); });
document.getElementById("backStartBtn").addEventListener("click", () => showScreen("start"));
document.getElementById("playCurrentBtn").addEventListener("click", startLevel);
document.getElementById("toMapBtn").addEventListener("click", () => { stopTimer(); buildMap(); showScreen("map"); });
document.getElementById("resetBtn").addEventListener("click", resetGame);
document.getElementById("checkBtn").addEventListener("click", checkAnswer);
document.getElementById("hintBtn").addEventListener("click", useHint);
document.getElementById("shuffleBtn").addEventListener("click", shuffleCurrent);
document.getElementById("playAgainBtn").addEventListener("click", resetGame);

/* Build first map in memory */
buildMap();
