const body = document.body;

/* ---------- Smooth scroll for data-scroll ---------- */

document.querySelectorAll("[data-scroll]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const target = el.getAttribute("href") || el.dataset.scroll;
    const section = document.querySelector(target);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    drainBattery(5);
  });
});

/* ---------- Sensory Filter + Accessibility + Experience start ---------- */

const modeToggle = document.getElementById("modeToggle");
const modeLabel = modeToggle?.querySelector("[data-mode-label]");
const accessToggle = document.getElementById("accessToggle");
const startExperienceBtn = document.getElementById("startExperienceBtn");

const sensoryPanel = document.getElementById("sensoryPanel");
const noiseSlider = document.getElementById("noiseSlider");
const sensoryOffBtn = document.getElementById("sensoryOff");
const sensoryCloseBtn = document.getElementById("sensoryClose");

let sensoryIntensity = 0.6; // 0–1
let experienceStarted = false;

function applySensoryIntensity() {
  const blurPx = 0.7 + sensoryIntensity * 6.3; // ~0.7–7px
  const noiseOpacity = 0.2 + sensoryIntensity * 0.8; // 0.2–1.0

  document.documentElement.style.setProperty(
    "--blur-strength",
    blurPx + "px"
  );
  document.documentElement.style.setProperty(
    "--noise-strength",
    noiseOpacity.toString()
  );
}

function openSensoryPanel() {
  if (!sensoryPanel) return;
  sensoryPanel.classList.add("is-open");
  sensoryPanel.setAttribute("aria-hidden", "false");
}

function closeSensoryPanel() {
  if (!sensoryPanel) return;
  sensoryPanel.classList.remove("is-open");
  sensoryPanel.setAttribute("aria-hidden", "true");
}

function startAutisticExperience(source = "interaction") {
  if (body.dataset.accessibility === "on") return;

  if (body.dataset.mode === "autistic") {
    openSensoryPanel();
    return;
  }

  body.dataset.mode = "autistic";
  experienceStarted = true;
  if (modeLabel) modeLabel.textContent = "Autistic experience";
  showToast(
    "Autistic experience on. Use Sensory Filter to adjust or turn it off."
  );
  openSensoryPanel();
}

function endAutisticExperience() {
  body.dataset.mode = "nt";
  experienceStarted = false;
  if (modeLabel) modeLabel.textContent = "Neurotypical";
  stopAllNoise();
  exitFlowState();
  showToast("Simulation turned off. Page back in neurotypical mode.");
}

/* Sensory Filter pill now opens settings instead of toggling */
if (modeToggle) {
  modeToggle.addEventListener("click", () => {
    openSensoryPanel();
  });
}

/* Accessibility toggle */
if (accessToggle) {
  accessToggle.addEventListener("click", () => {
    const current = body.dataset.accessibility || "off";
    const next = current === "off" ? "on" : "off";
    body.dataset.accessibility = next;
    accessToggle.classList.toggle("pill-access", next === "on");
    if (next === "on") {
      enableAccessibilityMode();
    } else {
      showToast(
        "Accessibility mode off. Simulation effects and timers are active again."
      );
    }
  });
}

/* Sensory panel slider + buttons */
if (noiseSlider) {
  noiseSlider.value = sensoryIntensity * 100;
  applySensoryIntensity();

  noiseSlider.addEventListener("input", (e) => {
    const v = parseInt(e.target.value || "0", 10);
    sensoryIntensity = Math.max(0, Math.min(100, v)) / 100;
    applySensoryIntensity();
  });
}

if (sensoryOffBtn) {
  sensoryOffBtn.addEventListener("click", () => {
    endAutisticExperience();
    closeSensoryPanel();
  });
}

if (sensoryCloseBtn) {
  sensoryCloseBtn.addEventListener("click", () => {
    closeSensoryPanel();
  });
}

/* Start button triggers experience */
if (startExperienceBtn) {
  startExperienceBtn.addEventListener("click", () => {
    startAutisticExperience("button");
  });
}

/* ---------- Social Battery mechanic ---------- */

let socialBattery = 100;
const batteryLevelEl = document.getElementById("batteryLevel");
const batteryValueEl = document.getElementById("batteryValue");

function renderBattery() {
  const clamped = Math.max(0, Math.min(100, socialBattery));
  if (batteryLevelEl) {
    batteryLevelEl.style.transform = `scaleX(${clamped / 100})`;
  }
  if (batteryValueEl) {
    batteryValueEl.textContent = `${clamped}%`;
  }
}

function checkBurnout() {
  if (socialBattery <= 20 && !body.classList.contains("burnout-mode")) {
    body.classList.add("burnout-mode");
    garbleVisibleText();
    showToast(
      "Burnout mode: options feel harder to find and text may stop making sense."
    );
  } else if (socialBattery > 25 && body.classList.contains("burnout-mode")) {
    body.classList.remove("burnout-mode");
  }
  renderBattery();
}

function drainBattery(amount) {
  if (body.dataset.accessibility === "on") return;
  socialBattery = Math.max(0, socialBattery - amount);
  checkBurnout();
}

/* global click drain (except inside quiet room) */
document.addEventListener("click", (e) => {
  if (body.dataset.accessibility === "on") return;
  if (e.target.closest("#quiet-room")) return;
  drainBattery(5);
});

/* scroll drain every 1000px + auto-start on first real scroll */

let lastScrollY = window.scrollY;
let scrollAccumulator = 0;
let firstScrollTriggered = false;

window.addEventListener("scroll", () => {
  const nowY = window.scrollY;
  const delta = Math.abs(nowY - lastScrollY);
  const prevY = lastScrollY;
  lastScrollY = nowY;

  if (
    !firstScrollTriggered &&
    prevY < 40 &&
    nowY > 120 &&
    body.dataset.accessibility !== "on"
  ) {
    firstScrollTriggered = true;
    startAutisticExperience("scroll");
  }

  scrollAccumulator += delta;
  if (scrollAccumulator >= 1000) {
    const chunks = Math.floor(scrollAccumulator / 1000);
    scrollAccumulator -= chunks * 1000;
    drainBattery(2 * chunks);
  }
  checkScrollInvisibleRule(nowY);
});

/* quiet room recharge when idle */

let lastActivityTime = Date.now();

["scroll", "click", "keydown", "mousemove"].forEach((evt) => {
  document.addEventListener(evt, () => {
    lastActivityTime = Date.now();
  });
});

function isMostlyVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  return visible / rect.height > 0.6;
}

const quietRoom = document.getElementById("quiet-room");
setInterval(() => {
  if (body.dataset.accessibility === "on") return;
  if (!quietRoom) return;
  const idle = Date.now() - lastActivityTime > 1000;
  if (idle && isMostlyVisible(quietRoom)) {
    socialBattery = Math.min(100, socialBattery + 10);
    checkBurnout();
  }
}, 1000);

/* ---------- World dots + global stat ---------- */

const worldDots = document.getElementById("worldDots");
if (worldDots) {
  const obs = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          worldDots.classList.add("is-active");
          o.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  obs.observe(worldDots);
}

const globalStatEl = document.querySelector(
  ".stat-hero-value[data-global-stat-target]"
);
if (globalStatEl) {
  const target = parseInt(globalStatEl.dataset.globalStatTarget || "75", 10);
  const obs = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const duration = 1200;
        const start = performance.now();
        function step(now) {
          const t = Math.min((now - start) / duration, 1);
          const value = Math.round(target * t);
          globalStatEl.textContent = `${value}M+`;
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        o.unobserve(entry.target);
      });
    },
    { threshold: 0.7 }
  );
  obs.observe(globalStatEl);
}

/* ---------- Hyperfocus size-order game ---------- */

const sizeGrid = document.getElementById("sizeGrid");
const hyperStatus = document.getElementById("hyperStatus");
const hyperStart = document.getElementById("hyperStart");

let sizePattern = [];
let sizeStep = 0;
let sizeActive = false;
let flowStreak = 0;

function buildSizeRound() {
  if (!sizeGrid) return;
  sizeGrid.innerHTML = "";
  const sizes = [
    { r: 18, tag: "1" },
    { r: 26, tag: "2" },
    { r: 34, tag: "3" },
    { r: 44, tag: "4" }
  ];
  for (let i = sizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }
  sizes.forEach((s) => {
    const div = document.createElement("div");
    div.className = "size-circle";
    div.style.width = `${s.r * 2}px`;
    div.style.height = `${s.r * 2}px`;
    div.dataset.sizeRank = s.tag;
    sizeGrid.appendChild(div);
  });
  sizePattern = ["1", "2", "3", "4"];
  sizeStep = 0;
  sizeActive = true;
}

if (hyperStart && sizeGrid && hyperStatus) {
  hyperStart.addEventListener("click", () => {
    buildSizeRound();
    flowStreak = 0;
    body.dataset.flow = "off";
    body.classList.remove("flow-state");
    stopLofi();
    hyperStatus.textContent =
      "Round started. Click circles from smallest to largest.";
    drainBattery(3);
  });

  sizeGrid.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("size-circle")) return;
    if (!sizeActive) return;
    const rank = target.dataset.sizeRank;
    const expected = sizePattern[sizeStep];
    if (rank === expected) {
      sizeStep++;
      target.style.background = "#38bdf8";
      if (sizeStep === sizePattern.length) {
        sizeActive = false;
        flowStreak++;
        if (flowStreak >= 5) {
          enterFlowState();
        } else {
          hyperStatus.textContent = `Nice. That’s ${
            flowStreak
          } round(s) correct in a row. Start again to build your streak.`;
        }
      }
    } else {
      sizeActive = false;
      flowStreak = 0;
      hyperStatus.textContent =
        "That broke the pattern. Flow snapped. Start again when ready.";
      exitFlowState();
      drainBattery(4);
    }
  });
}

/* flow breaks when leaving section */

const experienceSection = document.getElementById("experience");
if (experienceSection) {
  const expObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && body.dataset.flow === "on") {
          exitFlowState();
        }
      });
    },
    { threshold: 0.3 }
  );
  expObs.observe(experienceSection);
}

function enterFlowState() {
  if (body.dataset.flow === "on") return;
  body.dataset.flow = "on";
  body.classList.add("flow-state");
  showToast("Hyperfocus flow: noise fades out, everything feels sharp.");
  stopAllNoise();
  playLofi();
}

function exitFlowState() {
  if (body.dataset.flow === "off") return;
  body.dataset.flow = "off";
  body.classList.remove("flow-state");
  stopLofi();
}

/* ---------- Math problem drift ---------- */

const mathProblem = document.getElementById("mathProblem");
if (mathProblem) {
  const nums = mathProblem.querySelectorAll(".math-num");
  setInterval(() => {
    if (body.dataset.mode !== "autistic" || body.dataset.accessibility === "on")
      return;
    nums.forEach((span) => {
      const dx = (Math.random() - 0.5) * 4;
      const dy = (Math.random() - 0.5) * 2;
      span.style.transform = `translate(${dx}px, ${dy}px)`;
    });
  }, 750);

  mathProblem.addEventListener("mouseenter", () => {
    drainBattery(2);
  });
}

/* ---------- Reading passage flashlight ---------- */

const readingPassage = document.getElementById("readingPassage");
if (readingPassage) {
  readingPassage.style.background =
    "repeating-linear-gradient(transparent, transparent 24px, rgba(209,213,219,0.4) 25px)";

  readingPassage.addEventListener("mousemove", (e) => {
    if (
      body.dataset.mode !== "autistic" ||
      body.dataset.accessibility === "on"
    ) {
      readingPassage.style.background =
        "repeating-linear-gradient(transparent, transparent 24px, rgba(209,213,219,0.4) 25px)";
      return;
    }
    const rect = readingPassage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    readingPassage.style.background = `
      radial-gradient(circle at ${x}px ${y}px, rgba(249,250,251,1) 0, rgba(249,250,251,1) 80px, rgba(148,163,184,0.7) 120px, rgba(148,163,184,0.9) 140px),
      repeating-linear-gradient(transparent, transparent 24px, rgba(209,213,219,0.8) 25px)
    `;
  });

  readingPassage.addEventListener("mouseleave", () => {
    readingPassage.style.background =
      "repeating-linear-gradient(transparent, transparent 24px, rgba(209,213,219,0.4) 25px)";
  });
}

/* ---------- Executive Function form ---------- */

const execForm = document.getElementById("execForm");
const execError = document.getElementById("execError");
const execLabels = document.querySelectorAll(".exec-label");
const cursorFields = ["fieldA", "fieldB", "fieldC"];

let cursorTimer = null;
if (execForm) {
  cursorTimer = setInterval(() => {
    if (
      body.dataset.mode !== "autistic" ||
      body.dataset.accessibility === "on"
    )
      return;
    const id =
      cursorFields[Math.floor(Math.random() * cursorFields.length)];
    const field = document.getElementById(id);
    if (field) field.focus();
  }, 4000 + Math.random() * 4000);

  execForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (execError) execError.textContent = "";
    const a = document.getElementById("fieldA").value.trim();
    const b = document.getElementById("fieldB").value.trim();
    const c = document.getElementById("fieldC").value.trim();

    if (!a || !b || !c) {
      triggerWaitingGlitch("Error: Incorrect format.");
      drainBattery(6);
      return;
    }
    triggerWaitingGlitch("Processing your request…");
    drainBattery(6);
  });
}

function triggerWaitingGlitch(message) {
  if (execError) execError.textContent = message;
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15,23,42,0.55)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "50";
  overlay.innerHTML =
    '<div style="background:#0b1120;color:#e5e7eb;padding:1.4rem 1.8rem;border-radius:16px;font-size:0.9rem;">Please wait 10 seconds…<br/><br/><span style="font-size:0.8rem;opacity:0.8;">You cannot interact while waiting.</span></div>';
  document.body.appendChild(overlay);
  document.body.style.pointerEvents = "none";

  setTimeout(() => {
    document.body.style.pointerEvents = "";
    overlay.remove();
    if (execError)
      execError.textContent =
        "Finished. That felt longer than it looked, right?";
  }, 10000);
}

/* ---------- Lunch menu ---------- */

const lunchMenu = document.getElementById("lunchMenu");
const menuTimerEl = document.getElementById("menuTimer");
const menuStatusEl = document.getElementById("menuStatus");
let menuTimer = null;
let menuTimeLeft = 0;

function updateMenuTimer() {
  if (!menuTimerEl) return;
  menuTimerEl.textContent = `Time left: ${
    menuTimeLeft > 0 ? menuTimeLeft + "s" : "0s"
  }`;
}

function startMenuTimer() {
  if (!menuTimerEl || !menuStatusEl) return;
  menuTimeLeft = 10;
  updateMenuTimer();
  menuStatusEl.textContent = "";
  if (menuTimer) clearInterval(menuTimer);
  menuTimer = setInterval(() => {
    menuTimeLeft--;
    updateMenuTimer();
    if (menuTimeLeft <= 0) {
      clearInterval(menuTimer);
      menuTimer = null;
      menuStatusEl.textContent =
        "Time’s up. Sensory overwhelm and time pressure make choices harder.";
      drainBattery(4);
    }
  }, 1000);
}

if (lunchMenu && menuTimerEl && menuStatusEl) {
  lunchMenu.addEventListener("mouseenter", () => {
    if (
      body.dataset.mode === "autistic" &&
      body.dataset.accessibility === "off" &&
      !menuTimer
    ) {
      startMenuTimer();
      drainBattery(2);
    }
  });
  lunchMenu.querySelectorAll("[data-menu-option]").forEach((li) => {
    li.addEventListener("click", () => {
      if (!menuTimer) return;
      clearInterval(menuTimer);
      menuTimer = null;
      menuStatusEl.textContent =
        "You chose: " +
        li.textContent.trim() +
        ". For many autistic people, the sensory description matters more than the flavor.";
      drainBattery(3);
    });
  });
}

/* ---------- Literal Interpreter chatbot ---------- */

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

function addChatMessage(sender, text) {
  if (!chatMessages) return;
  const div = document.createElement("div");
  div.className = `chat-message ${sender}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatMessages) {
  addChatMessage(
    "bot",
    "System ready. Try to obtain the link. I respond literally."
  );
}

if (chatForm && chatInput && chatMessages) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage("user", text);
    chatInput.value = "";
    drainBattery(10);

    const lower = text.toLowerCase();

    if (/^can you\b/.test(lower) || /^could you\b/.test(lower)) {
      addChatMessage("bot", "Yes, I have the capacity to do that.");
      return;
    }
    if (/^i want\b/.test(lower) || /^i need\b/.test(lower)) {
      addChatMessage(
        "bot",
        "Acknowledged. That is a statement of desire."
      );
      return;
    }
    if (lower.includes("where is the link")) {
      addChatMessage("bot", "It is located on the server.");
      return;
    }
    if (lower.includes("send me the link")) {
      addChatMessage(
        "bot",
        "Here is the link: https://example.com/contact"
      );
      return;
    }

    addChatMessage(
      "bot",
      "I did not detect a specific command. Please phrase your request precisely."
    );
  });
}

/* ---------- Invisible Rules popups ---------- */

let fastScrollStart = null;
function checkScrollInvisibleRule(scrollY) {
  const docHeight = document.documentElement.scrollHeight;
  const winHeight = window.innerHeight;
  const atTop = scrollY < 40;
  const nearBottom = scrollY + winHeight > docHeight - 40;

  if (atTop) {
    fastScrollStart = Date.now();
  }
  if (
    fastScrollStart &&
    nearBottom &&
    Date.now() - fastScrollStart < 2000 &&
    body.dataset.accessibility === "off"
  ) {
    alert("Invisible rule: Skimming this fast is considered disrespectful here.");
    drainBattery(5);
    fastScrollStart = null;
  }
}

/* 2) Sequence: contact before learn/about */

let aboutVisited = false;
document.querySelectorAll(".nav-links a").forEach((a) => {
  const role = a.dataset.role;
  if (role === "about") {
    a.addEventListener("click", () => {
      aboutVisited = true;
    });
  }
  if (role === "contact") {
    a.addEventListener("click", (e) => {
      if (!aboutVisited && body.dataset.accessibility === "off") {
        e.preventDefault();
        alert(
          "Invisible rule: You must introduce yourself (Learn section) before asking for help (Simulations)."
        );
        drainBattery(5);
      }
    });
  }
});

/* ---------- Sensory audio & mouse velocity ---------- */

const audioHum = document.getElementById("audioHum");
const audioChatter = document.getElementById("audioChatter");
const audioHigh = document.getElementById("audioHigh");
const audioLofi = document.getElementById("audioLofi");
let audioReady = false;

function ensureNoisePlaying() {
  if (audioReady) return;
  const tracks = [audioHum, audioChatter, audioHigh].filter(Boolean);
  tracks.forEach((a) => {
    a.volume = 0;
    a.play().catch(() => {});
  });
  audioReady = true;
}

function stopAllNoise() {
  [audioHum, audioChatter, audioHigh].forEach((a) => {
    if (!a) return;
    a.volume = 0;
    a.pause();
    a.currentTime = 0;
  });
  audioReady = false;
}

function playLofi() {
  if (!audioLofi) return;
  audioLofi.volume = 0.5;
  audioLofi.play().catch(() => {});
}

function stopLofi() {
  if (!audioLofi) return;
  audioLofi.pause();
  audioLofi.currentTime = 0;
}

/* mouse velocity → volume */

let lastMouseX = null;
let lastMouseY = null;
let lastMouseTime = null;

document.addEventListener("mousemove", (e) => {
  document.documentElement.style.setProperty("--spot-x", e.clientX + "px");
  document.documentElement.style.setProperty("--spot-y", e.clientY + "px");
  if (
    body.dataset.mode !== "autistic" ||
    body.dataset.accessibility === "on" ||
    body.dataset.flow === "on"
  )
    return;

  ensureNoisePlaying();
  const now = performance.now();
  if (lastMouseX == null) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMouseTime = now;
    return;
  }
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  const dt = now - lastMouseTime || 1;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  lastMouseTime = now;

  const dist = Math.sqrt(dx * dx + dy * dy);
  let speed = dist / dt;
  speed = Math.min(0.8, speed);

  const humVol = 0.05 + speed * 0.25;
  const chatterVol = 0.02 + speed * 0.35;
  const highVol = 0.01 + speed * 0.4;

  if (audioHum) audioHum.volume = humVol;
  if (audioChatter) audioChatter.volume = chatterVol;
  if (audioHigh) audioHigh.volume = highVol;
});

/* scroll speed → pitch */

let lastScrollTime = performance.now();
let lastScrollPos = window.scrollY;

window.addEventListener("scroll", () => {
  if (
    body.dataset.mode !== "autistic" ||
    body.dataset.accessibility === "on" ||
    body.dataset.flow === "on"
  )
    return;
  ensureNoisePlaying();
  const now = performance.now();
  const dy = window.scrollY - lastScrollPos;
  const dt = now - lastScrollTime || 1;
  lastScrollPos = window.scrollY;
  lastScrollTime = now;

  const speed = Math.min(1, Math.abs(dy) / dt);
  if (audioHigh) audioHigh.playbackRate = 1 + speed * 0.6;
});

/* ---------- Garbled text in burnout ---------- */

function garbleVisibleText() {
  const targets = document.querySelectorAll(".garble-target");
  targets.forEach((el) => {
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = garbleString(node.textContent);
      }
    });
  });
}

function garbleString(str) {
  const map = { a: "e", e: "a", i: "o", o: "i", u: "u" };
  return str
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (map[lower]) {
        const repl = map[lower];
        return ch === lower ? repl : repl.toUpperCase();
      }
      return ch;
    })
    .join("");
}

/* ---------- Accessibility / curb-cut reset ---------- */

function enableAccessibilityMode() {
  if (cursorTimer) clearInterval(cursorTimer);
  if (menuTimer) clearInterval(menuTimer);

  stopAllNoise();
  stopLofi();
  body.classList.remove("burnout-mode");
  body.dataset.mode = "nt";
  body.dataset.flow = "off";
  experienceStarted = false;

  execLabels.forEach((label) => {
    const standard = label.dataset.standardLabel;
    if (standard) label.textContent = standard;
  });

  showToast(
    "Accessibility mode on. Noise, timers, and vague labels are removed to lower cognitive load."
  );
}

/* ---------- Toast helper ---------- */

const toast = document.getElementById("toast");
let toastTimeout = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

/* ---------- Init ---------- */

renderBattery();
applySensoryIntensity();
