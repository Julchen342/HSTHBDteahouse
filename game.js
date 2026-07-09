(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const overlay = document.getElementById("overlay");
  const panels = {
    story: document.getElementById("storyPanel"),
    menu: document.getElementById("menuPanel"),
    tutorial: document.getElementById("tutorialPanel"),
    about: document.getElementById("aboutPanel"),
    gameOver: document.getElementById("gameOverPanel"),
  };

  const buttons = {
    storyOk: document.getElementById("storyOkBtn"),
    start: document.getElementById("startBtn"),
    tutorial: document.getElementById("tutorialBtn"),
    about: document.getElementById("aboutBtn"),
    tutorialStart: document.getElementById("tutorialStartBtn"),
    backFromTutorial: document.getElementById("backFromTutorialBtn"),
    backFromAbout: document.getElementById("backFromAboutBtn"),
    restart: document.getElementById("restartBtn"),
    share: document.getElementById("shareBtn"),
    mute: document.getElementById("muteBtn"),
    left: document.getElementById("leftBtn"),
    right: document.getElementById("rightBtn"),
    pause: document.getElementById("pauseBtn"),
  };

  const finalScore = document.getElementById("finalScore");
  const finalTitle = document.getElementById("finalTitle");
  const bestScoreEl = document.getElementById("bestScore");

  const W = canvas.width;
  const H = canvas.height;
  const groundY = H - 74;

  const GOOD_ITEMS = [
    { emoji: "🥟", name: "虾饺", points: 120 },
    { emoji: "🍤", name: "烧卖", points: 130 },
    { emoji: "🍵", name: "茶", points: 100 },
    { emoji: "🥮", name: "点心", points: 150 },
    { emoji: "🍚", name: "糯米鸡", points: 140 },
    { emoji: "🥬", name: "青菜", points: 90 },
  ];

  const BAD_ITEMS = [
    { emoji: "🧦", name: "袜子", penalty: 1 },
    { emoji: "👞", name: "鞋子", penalty: 1 },
    { emoji: "🪨", name: "石头", penalty: 1 },
    { emoji: "🧻", name: "纸巾", penalty: 1 },
    { emoji: "🍔", name: "汉堡", penalty: 1 },
    { emoji: "💣", name: "炸弹", penalty: 2 },
  ];

  const POWER_ITEMS = [
    { emoji: "⭐", name: "双倍积分", effect: "double", weight: 3 },
    { emoji: "⏰", name: "加时", effect: "time", weight: 3 },
    { emoji: "❤️", name: "回复生命", effect: "heal", weight: 2 },
    { emoji: "🧲", name: "自动吸附", effect: "magnet", weight: 2 },
    { emoji: "🐢", name: "减速", effect: "slow", weight: 2 },
  ];

  const FRIEND_EVENTS = [
    {
      emoji: "💙",
      name: "喻文州",
      text: "队长来鼓励我了！接下来积分 ×2！",
      duration: 12,
      apply: () => {
        state.effects.double = Math.max(state.effects.double, 12);
      },
    },
    {
      emoji: "☀️",
      name: "苏沐橙",
      text: "还是苏妹子可靠！错误物品减少。",
      duration: 12,
      apply: () => {
        state.effects.safe = Math.max(state.effects.safe, 12);
      },
    },
    {
      emoji: "🌿",
      name: "王杰希",
      text: "微草全队下了奇怪订单！豆汁乱入。",
      duration: 10,
      apply: () => {
        spawnSpecialBeanJuice();
      },
    },
    {
      emoji: "😐",
      name: "韩文清",
      text: "韩队检查卫生！错误扣分加重。",
      duration: 10,
      apply: () => {
        state.effects.strict = Math.max(state.effects.strict, 10);
      },
    },
    {
      emoji: "😏",
      name: "叶修",
      text: "老叶顺手拿走好食材！正确食材减少。",
      duration: 10,
      apply: () => {
        state.effects.chaos = Math.max(state.effects.chaos, 10);
      },
    },
    {
      emoji: "😊",
      name: "周泽楷",
      text: "小周送来了点心和加时道具。",
      duration: 10,
      apply: () => {
        state.effects.clockRain = Math.max(state.effects.clockRain, 10);
        spawnPowerAt("⏰", "time");
      },
    },
  ];

  const state = {
    status: "story",
    score: 0,
    lives: 3,
    timeLeft: 90,
    combo: 0,
    maxCombo: 0,
    objects: [],
    particles: [],
    player: {
      x: W / 2,
      y: groundY,
      width: 78,
      height: 62,
      speed: 390,
      emoji: "😄",
    },
    keys: {
      left: false,
      right: false,
    },
    spawnTimer: 0,
    eventTimer: 7,
    eventMessageTimer: 0,
    eventMessage: "",
    difficultyTimer: 0,
    speedFactor: 1,
    effects: {
      double: 0,
      magnet: 0,
      slow: 0,
      safe: 0,
      strict: 0,
      chaos: 0,
      clockRain: 0,
    },
    muted: false,
    lastTime: 0,
    pointerActive: false,
  };

  function showPanel(name) {
    Object.values(panels).forEach((panel) => {
      if (panel) panel.classList.add("hidden");
    });
    if (panels[name]) panels[name].classList.remove("hidden");
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function startGame() {
    state.status = "playing";
    state.score = 0;
    state.lives = 3;
    state.timeLeft = 90;
    state.combo = 0;
    state.maxCombo = 0;
    state.objects = [];
    state.particles = [];
    state.player.x = W / 2;
    state.spawnTimer = 0;
    state.eventTimer = 7;
    state.eventMessageTimer = 0;
    state.eventMessage = "";
    state.difficultyTimer = 0;
    state.speedFactor = 1;
    Object.keys(state.effects).forEach((key) => {
      state.effects[key] = 0;
    });
    if (buttons.pause) buttons.pause.textContent = "⏸️";
    hideOverlay();
  }

  function endGame() {
    state.status = "gameOver";
    const best = Math.max(getBestScore(), Math.floor(state.score));
    localStorage.setItem("shaotianTeahouseBest", String(best));
    finalScore.textContent = Math.floor(state.score).toString();
    finalTitle.textContent = getTitle(state.score);
    bestScoreEl.textContent = best.toString();
    showPanel("gameOver");
  }

  function getBestScore() {
    return Number(localStorage.getItem("shaotianTeahouseBest") || 0);
  }

  function getTitle(score) {
    if (score >= 25000) return "💛 黄少天今天超开心！";
    if (score >= 20000) return "🌟 剑圣指定店长";
    if (score >= 15000) return "👑 荣誉店长";
    if (score >= 10000) return "🥢 早茶大师";
    if (score >= 6000) return "🥟 点心学徒";
    if (score >= 3000) return "🍵 泡茶能手";
    if (score >= 1000) return "🥢 新手店员";
    return "🫖 临时帮工";
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedPower() {
    const total = POWER_ITEMS.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of POWER_ITEMS) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return POWER_ITEMS[0];
  }

  function spawnObject() {
    let goodChance = 0.68;
    let badChance = 0.23;
    let powerChance = 0.09;

    if (state.effects.safe > 0) {
      goodChance += 0.12;
      badChance -= 0.10;
    }
    if (state.effects.chaos > 0) {
      goodChance -= 0.18;
      badChance += 0.14;
    }
    if (state.effects.clockRain > 0) {
      powerChance += 0.10;
      goodChance -= 0.05;
    }

    goodChance = Math.max(0.35, Math.min(0.85, goodChance));
    badChance = Math.max(0.08, Math.min(0.5, badChance));

    const roll = Math.random();
    let data;
    let kind;

    if (roll < goodChance) {
      data = pick(GOOD_ITEMS);
      kind = "good";
    } else if (roll < goodChance + badChance) {
      data = pick(BAD_ITEMS);
      kind = "bad";
    } else {
      data = weightedPower();
      kind = "power";
    }

    const baseSpeed = randomBetween(120, 210) * state.speedFactor;
    const slowMultiplier = state.effects.slow > 0 ? 0.62 : 1;

    state.objects.push({
      kind,
      emoji: data.emoji,
      name: data.name,
      points: data.points || 0,
      penalty: data.penalty || 0,
      effect: data.effect || null,
      x: randomBetween(34, W - 34),
      y: -40,
      radius: 25,
      speed: baseSpeed * slowMultiplier,
      wobble: randomBetween(0, Math.PI * 2),
      caught: false,
    });
  }

  function spawnPowerAt(emoji, effect) {
    state.objects.push({
      kind: "power",
      emoji,
      name: emoji === "⏰" ? "加时" : "特殊道具",
      points: 0,
      penalty: 0,
      effect,
      x: randomBetween(40, W - 40),
      y: -40,
      radius: 25,
      speed: 135,
      wobble: randomBetween(0, Math.PI * 2),
      caught: false,
    });
  }

  function spawnSpecialBeanJuice() {
    state.objects.push({
      kind: "bean",
      emoji: "🥤",
      name: "豆汁",
      points: 0,
      penalty: 0,
      effect: "bean",
      x: randomBetween(40, W - 40),
      y: -40,
      radius: 25,
      speed: 150,
      wobble: randomBetween(0, Math.PI * 2),
      caught: false,
    });
  }

  function triggerFriendEvent() {
    const event = pick(FRIEND_EVENTS);
    state.eventMessage = `${event.emoji} ${event.name}：${event.text}`;
    state.eventMessageTimer = event.duration;
    event.apply();
    beep(660, 0.05);
  }

  function applyPower(effect) {
    if (effect === "double") {
      state.effects.double = Math.max(state.effects.double, 10);
      addParticle("⭐ 双倍积分！", state.player.x, state.player.y - 60);
    }
    if (effect === "time") {
      state.timeLeft += 8;
      addParticle("⏰ +8秒！", state.player.x, state.player.y - 60);
    }
    if (effect === "heal") {
      state.lives = Math.min(5, state.lives + 1);
      addParticle("❤️ 生命+1！", state.player.x, state.player.y - 60);
    }
    if (effect === "magnet") {
      state.effects.magnet = Math.max(state.effects.magnet, 8);
      addParticle("🧲 自动吸附！", state.player.x, state.player.y - 60);
    }
    if (effect === "slow") {
      state.effects.slow = Math.max(state.effects.slow, 8);
      addParticle("🐢 减速！", state.player.x, state.player.y - 60);
    }
    if (effect === "bean") {
      if (Math.random() < 0.5) {
        state.score += 888;
        addParticle("🥤 豆汁奖励 +888！", state.player.x, state.player.y - 60);
      } else {
        state.effects.slow = Math.max(state.effects.slow, 5);
        addParticle("🥤 味道很怪，世界变慢了！", state.player.x, state.player.y - 60);
      }
    }
    beep(880, 0.06);
  }

  function addParticle(text, x, y, color = "#3d2c1a") {
    state.particles.push({
      text,
      x,
      y,
      vy: -38,
      life: 1,
      color,
    });
  }

  function catchObject(obj) {
    obj.caught = true;

    if (obj.kind === "good") {
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const comboBonus = Math.min(80, state.combo * 6);
      const multiplier = state.effects.double > 0 ? 2 : 1;
      const gained = (obj.points + comboBonus) * multiplier;
      state.score += gained;
      addParticle(`+${Math.floor(gained)}`, obj.x, obj.y, "#2d7c42");
      beep(520, 0.04);
    } else if (obj.kind === "bad") {
      state.combo = 0;
      const strict = state.effects.strict > 0 ? 2 : 1;
      const lost = obj.penalty * strict;
      state.lives -= lost;
      addParticle(`-${lost}生命`, obj.x, obj.y, "#d73a31");
      shakeScreen();
      beep(180, 0.08);
      if (state.lives <= 0) endGame();
    } else {
      applyPower(obj.effect);
    }
  }

  function missObject(obj) {
    obj.caught = true;
    if (obj.kind === "good") {
      state.combo = 0;
      state.score = Math.max(0, state.score - 30);
      addParticle("漏接 -30", obj.x, H - 40, "#d98200");
    }
  }

  function update(dt) {
    if (state.status !== "playing") return;

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endGame();
      return;
    }

    state.difficultyTimer += dt;
    if (state.difficultyTimer >= 9) {
      state.difficultyTimer = 0;
      state.speedFactor = Math.min(1.9, state.speedFactor + 0.045);
    }

    updateEffects(dt);
    updatePlayer(dt);
    updateSpawning(dt);
    updateObjects(dt);
    updateParticles(dt);
  }

  function updateEffects(dt) {
    Object.keys(state.effects).forEach((key) => {
      state.effects[key] = Math.max(0, state.effects[key] - dt);
    });
    state.eventMessageTimer = Math.max(0, state.eventMessageTimer - dt);
  }

  function updatePlayer(dt) {
    let direction = 0;
    if (state.keys.left) direction -= 1;
    if (state.keys.right) direction += 1;

    state.player.x += direction * state.player.speed * dt;
    state.player.x = Math.max(44, Math.min(W - 44, state.player.x));
  }

  function updateSpawning(dt) {
    const interval = Math.max(0.42, 0.9 - (state.speedFactor - 1) * 0.22);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObject();
      state.spawnTimer = interval;
    }

    state.eventTimer -= dt;
    if (state.eventTimer <= 0) {
      triggerFriendEvent();
      state.eventTimer = randomBetween(12, 18);
    }
  }

  function updateObjects(dt) {
    const player = state.player;

    for (const obj of state.objects) {
      if (obj.caught) continue;

      obj.wobble += dt * 3;
      obj.y += obj.speed * dt;
      obj.x += Math.sin(obj.wobble) * 16 * dt;

      if (state.effects.magnet > 0 && (obj.kind === "good" || obj.kind === "power" || obj.kind === "bean")) {
        const dx = player.x - obj.x;
        const dy = player.y - obj.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 145 && dist > 1) {
          obj.x += (dx / dist) * 170 * dt;
          obj.y += (dy / dist) * 110 * dt;
        }
      }

      const hitX = Math.abs(obj.x - player.x) < player.width * 0.48;
      const hitY = Math.abs(obj.y - player.y) < player.height * 0.54;
      if (hitX && hitY) catchObject(obj);

      if (obj.y > H + 40) missObject(obj);
    }

    state.objects = state.objects.filter((obj) => !obj.caught);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function resetCanvasState() {
    // 防止上一轮绘制残留透明度 / 阴影 / 滤镜。
    // 安卓和部分桌面浏览器在 canvas 里渲染 Emoji 时，对这些状态会更敏感。
    ctx.globalAlpha = 1;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalCompositeOperation = "source-over";
    if ("filter" in ctx) ctx.filter = "none";
  }

  function draw() {
    resetCanvasState();
    drawBackground();

    resetCanvasState();
    drawHud();

    resetCanvasState();
    drawObjects();

    resetCanvasState();
    drawPlayer();

    resetCanvasState();
    drawParticles();

    resetCanvasState();
    if (state.status === "paused") {
      drawPauseScreen();
    }

    resetCanvasState();
  }

  function drawBackground() {
    resetCanvasState();
    ctx.clearRect(0, 0, W, H);

    // 游戏区域：纯天蓝色背景
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, W, H);

    // 底部站立区域，稍微加深一点，方便看清人物位置
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(0, H - 64, W, 64);
  }

  function drawHud() {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    roundRect(14, 14, W - 28, 72, 18);
    ctx.fill();

    ctx.fillStyle = "#3d2c1a";
    ctx.font = "800 23px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⭐ ${Math.floor(state.score)}`, 28, 46);

    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillText(`⏰ ${Math.ceil(state.timeLeft)}s`, 28, 74);

    ctx.textAlign = "right";
    ctx.fillText("❤️".repeat(Math.max(0, Math.min(5, state.lives))), W - 28, 46);
    ctx.fillText(`Combo ${state.combo}`, W - 28, 74);

    const effectLabels = [];
    if (state.effects.double > 0) effectLabels.push("⭐x2");
    if (state.effects.magnet > 0) effectLabels.push("🧲");
    if (state.effects.slow > 0) effectLabels.push("🐢");
    if (state.effects.safe > 0) effectLabels.push("☀️");
    if (state.effects.strict > 0) effectLabels.push("😐");
    if (state.effects.chaos > 0) effectLabels.push("😏");
    if (effectLabels.length > 0) {
      ctx.textAlign = "center";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.fillStyle = "rgba(61, 44, 26, 0.78)";
      ctx.fillText(effectLabels.join("  "), W / 2, 102);
    }

    if (state.eventMessageTimer > 0) {
      ctx.fillStyle = "rgba(61, 44, 26, 0.78)";
      roundRect(20, 112, W - 40, 44, 18);
      ctx.fill();
      ctx.fillStyle = "#fffdf3";
      ctx.font = "800 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      wrapText(state.eventMessage, W / 2, 139, W - 62, 18);
    }

    ctx.restore();
  }

function drawObjects() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if ("filter" in ctx) ctx.filter = "none";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 掉落物阴影：让 emoji 在天蓝背景上更清楚
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    for (const obj of state.objects) {
      ctx.globalAlpha = 1;
      ctx.font = `${obj.kind === "bad" ? 38 : 40}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.fillText(obj.emoji, obj.x, obj.y);
    }

    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if ("filter" in ctx) ctx.filter = "none";

    ctx.fillStyle = "rgba(61, 44, 26, 0.18)";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 30, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.font = "56px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 人物 emoji 阴影
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillText(player.emoji, player.x, player.y);

    // 画文字前关掉阴影，避免“少天”两个字糊掉
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;

    ctx.font = "800 14px system-ui, sans-serif";
    ctx.fillStyle = "#3d2c1a";
    ctx.fillText("少天", player.x, player.y + 44);
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.fillStyle = particle.color;
      ctx.fillText(particle.text, particle.x, particle.y);
    }
    ctx.restore();
  }

  function drawPauseScreen() {
    ctx.save();
    ctx.fillStyle = "rgba(61, 44, 26, 0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fffdf3";
    ctx.font = "900 44px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("暂停中", W / 2, H / 2);
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillText("按空格或右上角按钮继续", W / 2, H / 2 + 40);
    ctx.restore();
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    let line = "";
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 1) {
      const testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  function togglePause() {
    if (state.status === "playing") {
      state.status = "paused";
      buttons.pause.textContent = "▶️";
    } else if (state.status === "paused") {
      state.status = "playing";
      buttons.pause.textContent = "⏸️";
      state.lastTime = performance.now();
    }
  }

  let audioContext = null;
  function beep(frequency, duration) {
    if (state.muted) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.05, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // 音效不是核心功能，浏览器禁用时直接忽略。
    }
  }

  function shakeScreen() {
    canvas.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 160, iterations: 1 }
    );
  }

  function gameLoop(timestamp) {
    const rawDt = (timestamp - state.lastTime) / 1000 || 0;
    const dt = Math.min(rawDt, 0.033);
    state.lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }

  function setKey(key, value) {
    if (key === "ArrowLeft" || key === "a" || key === "A") state.keys.left = value;
    if (key === "ArrowRight" || key === "d" || key === "D") state.keys.right = value;
  }

  window.addEventListener("keydown", (event) => {
    setKey(event.key, true);
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      togglePause();
    }
  });

  window.addEventListener("keyup", (event) => {
    setKey(event.key, false);
  });

  function bindHoldButton(button, direction) {
    if (!button) return;

    const start = (event) => {
      event.preventDefault();
      if (direction === "left") state.keys.left = true;
      if (direction === "right") state.keys.right = true;
    };
    const end = (event) => {
      event.preventDefault();
      if (direction === "left") state.keys.left = false;
      if (direction === "right") state.keys.right = false;
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);
  }

  bindHoldButton(buttons.left, "left");
  bindHoldButton(buttons.right, "right");

  canvas.addEventListener("pointerdown", (event) => {
    state.pointerActive = true;
    movePlayerToPointer(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (state.pointerActive) movePlayerToPointer(event);
  });
  canvas.addEventListener("pointerup", () => {
    state.pointerActive = false;
  });
  canvas.addEventListener("pointercancel", () => {
    state.pointerActive = false;
  });

  function movePlayerToPointer(event) {
    if (state.status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const x = (event.clientX - rect.left) * scaleX;
    state.player.x = Math.max(44, Math.min(W - 44, x));
  }

  buttons.storyOk.addEventListener("click", () => showPanel("menu"));
  buttons.start.addEventListener("click", startGame);
  buttons.tutorial.addEventListener("click", () => showPanel("tutorial"));
  buttons.about.addEventListener("click", () => showPanel("about"));
  buttons.tutorialStart.addEventListener("click", startGame);
  buttons.backFromTutorial.addEventListener("click", () => showPanel("menu"));
  buttons.backFromAbout.addEventListener("click", () => showPanel("menu"));
  buttons.restart.addEventListener("click", startGame);
  buttons.pause.addEventListener("click", togglePause);
  buttons.mute.addEventListener("click", () => {
    state.muted = !state.muted;
    buttons.mute.textContent = state.muted ? "🔇" : "🔊";
  });

  buttons.share.addEventListener("click", async () => {
    const text = `我在《黄少天早茶店》拿到了 ${Math.floor(state.score)} 分，称号是「${getTitle(state.score)}」！🍵⚔️`;
    try {
      await navigator.clipboard.writeText(text);
      buttons.share.textContent = "✅ 已复制分享文案";
    } catch (error) {
      buttons.share.textContent = "复制失败，请手动截图分享";
    }
    setTimeout(() => {
      buttons.share.textContent = "📸 复制分享文案";
    }, 1800);
  });

  draw();
  requestAnimationFrame((timestamp) => {
    state.lastTime = timestamp;
    requestAnimationFrame(gameLoop);
  });
})();
