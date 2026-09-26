(() => {
  const common = {
    zh: {
      language: "语言", back: "← 返回作品展", demo: "浏览器试玩", start: "开始试玩 →",
      reload: "重新载入", fullscreen: "全屏", exitFullscreen: "退出全屏", direct: "独立打开 ↗",
      controls: "试玩控制", how: "怎么玩", progress: "进度与存储", about: "关于这份试玩",
      idle: "点击「开始试玩」后载入游戏。", loading: "正在载入游戏页面…", loaded: "游戏页面已载入。可以在画面内开始游戏。",
      failed: "游戏未能载入。请重新载入，或选择「独立打开」。", slow: "载入比预期久。可以继续等待、重新载入，或独立打开。",
      startNote: "按下按钮后才会下载并运行游戏。", gameLanguage: "游戏界面为中文；上方语言切换仅翻译介绍与操作说明。",
      reloadConfirm: "重新载入会结束当前试玩，未保存的关卡或对局进度会丢失。继续吗？",
      fullscreenUnavailable: "此浏览器未能进入全屏。可以使用「独立打开」获得更大的游戏画面。",
      footer: "irop.one · 作品试玩", frame: "游戏试玩", coverAlt: "游戏实际画面截图",
    },
    en: {
      language: "Language", back: "← Back to the exhibition", demo: "Browser demo", start: "Start demo →",
      reload: "Reload", fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", direct: "Open separately ↗",
      controls: "Demo controls", how: "How to play", progress: "Progress & storage", about: "About this demo",
      idle: "Select Start demo to load the game.", loading: "Loading the game page…", loaded: "Game page loaded. Start playing inside the frame.",
      failed: "The game could not load. Try Reload or Open separately.", slow: "Loading is taking longer than expected. Wait, reload, or open the game separately.",
      startNote: "The game downloads and runs only after you press Start.", gameLanguage: "The game interface is in Chinese. The language selector translates this page and its instructions.",
      reloadConfirm: "Reloading ends this demo session. Unsaved level or match progress will be lost. Continue?",
      fullscreenUnavailable: "Fullscreen is unavailable in this browser. Use Open separately for a larger game view.",
      footer: "irop.one · Playable works", frame: "game demo", coverAlt: "Screenshot of the actual game",
    },
    ja: {
      language: "言語", back: "← 作品展示へ戻る", demo: "ブラウザ体験版", start: "プレイを始める →",
      reload: "再読み込み", fullscreen: "全画面", exitFullscreen: "全画面を終了", direct: "別タブで開く ↗",
      controls: "体験版の操作", how: "遊び方", progress: "進行状況と保存", about: "この体験版について",
      idle: "「プレイを始める」を押すとゲームを読み込みます。", loading: "ゲームページを読み込み中…", loaded: "ゲームページを読み込みました。画面内でゲームを始められます。",
      failed: "ゲームを読み込めませんでした。再読み込みするか、別タブで開いてください。", slow: "読み込みに時間がかかっています。そのまま待つか、再読み込み・別タブ表示をお試しください。",
      startNote: "開始ボタンを押した後にゲームを読み込み、実行します。", gameLanguage: "ゲーム画面は中国語です。言語設定はこの紹介ページと遊び方に適用されます。",
      reloadConfirm: "再読み込みすると現在のプレイを終了し、未保存のステージや対戦の進行状況は失われます。続けますか？",
      fullscreenUnavailable: "このブラウザでは全画面表示を利用できません。「別タブで開く」をお試しください。",
      footer: "irop.one · 遊べる作品", frame: "ゲーム体験版", coverAlt: "実際のゲーム画面",
    },
  };
  const games = {
    ranlu: {
      zh: {
        title: "染路", subtitle: "让每一种颜色，找到共同的终点。", category: "RANLU / COLOR PUZZLE", status: "可试玩",
        description: "在步数限制内把棋盘染成同一种颜色。500 个关卡，从一次小小的变色开始，寻找连成一片的路线。",
        cover: "选一种颜色，改变一片区域。", steps: ["先选择颜料颜色，再点击棋盘上的一片同色区域。", "颜色会沿上下左右相连的同色格子扩散；对角线不相连。", "在限定步数内让全盘成为同一种颜色即可过关，最终颜色不限。", "遇到难题可以使用提示、撤销或重开；长按可以预览染色。"],
        storage: "关卡进度保存在当前浏览器本地。清理网站数据、更换浏览器或设备后，进度不会自动跟随；重新载入可能丢失当前关卡的未保存操作。",
        note: "这是可操作的本地浏览器版本。试玩开始后可在游戏中选择关卡，触屏与鼠标均可操作。",
      },
      en: {
        title: "Ranlu", subtitle: "Every color has a path to the same destination.", category: "RANLU / COLOR PUZZLE", status: "Playable",
        description: "Turn the entire board into one color within a move limit. Explore 500 stages by recoloring connected regions, one move at a time.",
        cover: "Choose a color. Transform a connected region.", steps: ["Select a pigment, then click or tap a same-colored region on the board.", "The new color spreads through matching cells connected above, below, left, and right. Diagonal cells are separate.", "Unify the board within the move limit. Any final color wins.", "Use hints, undo, or restart when needed. Press and hold to preview a recolor."],
        storage: "Level progress stays in this browser's local storage. It does not follow you to another browser or device, and clearing site data removes it. Reloading may discard unsaved moves in the current stage.",
        note: "This is an interactive, locally hosted browser build. Choose a stage inside the game and play with a mouse or touchscreen.",
      },
      ja: {
        title: "染路 / Ranlu", subtitle: "すべての色を、ひとつの終点へ。", category: "RANLU / COLOR PUZZLE", status: "プレイ可能",
        description: "手数制限の中で盤面をひとつの色にそろえるパズル。つながった領域を染め替えながら、500 ステージを進みます。",
        cover: "色を選び、つながった領域を染める。", steps: ["先に絵の具の色を選び、盤面の同じ色の領域をクリックまたはタップします。", "上下左右につながる同色のマスが染まります。斜めのマスはつながりません。", "制限手数内に盤面を一色にそろえるとクリア。最後の色は自由です。", "ヒント、取り消し、やり直しが使えます。長押しで染め替えをプレビューできます。"],
        storage: "ステージの進行状況は現在のブラウザ内に保存されます。別のブラウザや端末には引き継がれず、サイトデータの削除で失われます。再読み込みで現在のステージの未保存操作が失われる場合があります。",
        note: "実際に操作できるローカル配信のブラウザ版です。ゲーム内でステージを選択し、マウスやタッチで遊べます。",
      },
    },
    "jingang-guild": {
      zh: {
        title: "晶港商会", subtitle: "宝石、航路与一场商会之间的较量。", category: "CRYSTAL HARBOR GUILD / STRATEGY", status: "可试玩",
        description: "一名玩家与三位 AI 的离线策略对局。收集宝石，购入或预留贸易卡，让永久折扣逐步建立你的商业版图。",
        cover: "从一颗宝石开始，建立你的商会。", steps: ["进入离线对局，与三位 AI 轮流行动。", "收集宝石，或使用宝石购买贸易卡；也可以预留卡牌，为后续回合做准备。", "已购买卡牌提供对应颜色的永久折扣，让之后的购买更容易。", "有人达到 15 点声望后进入最后一轮，完成该轮后结算胜负。"],
        storage: "设置会保存在当前浏览器，但当前对局不提供保存与续玩。重新载入、关闭页面或重新开局会结束这场对局；本地设置不会跨设备同步。",
        note: "这里提供离线单人对三 AI 的浏览器试玩，可直接在画面中开始完整对局。",
      },
      en: {
        title: "Crystal Harbor Guild", subtitle: "Gems, trade routes, and a contest between guilds.", category: "CRYSTAL HARBOR GUILD / STRATEGY", status: "Playable",
        description: "An offline strategy match for one player and three AI rivals. Collect gems, buy or reserve trade cards, and build an economy through permanent discounts.",
        cover: "Build a trading guild, one gem at a time.", steps: ["Start an offline match against three AI opponents and take turns.", "Collect gems, spend them to buy trade cards, or reserve a card for a later turn.", "Purchased cards give permanent discounts in their colors, making future purchases easier.", "When a player reaches 15 prestige, finish the final round before scoring the match."],
        storage: "Settings stay in this browser, but current matches are not saved for later resumption. Reloading, closing the page, or starting over ends the match. Local settings do not sync across devices.",
        note: "This browser demo runs an offline match with one human and three AI players. Start a full match inside the game frame.",
      },
      ja: {
        title: "晶港商会", subtitle: "宝石と交易路から始まる、商会の駆け引き。", category: "CRYSTAL HARBOR GUILD / STRATEGY", status: "プレイ可能",
        description: "プレイヤー 1 人と AI 3 人によるオフライン戦略ゲーム。宝石を集め、交易カードを購入・予約し、永続的な割引で商会を育てます。",
        cover: "ひとつの宝石から、あなたの商会を。", steps: ["オフライン対局を始め、3 人の AI と順番に行動します。", "宝石を集める、宝石で交易カードを購入する、カードを予約する、の中から行動を選びます。", "購入したカードは対応する色の永続割引となり、次の購入を助けます。", "誰かが名声 15 に達したら最終ラウンドへ。そのラウンドを終えて勝敗を決めます。"],
        storage: "設定は現在のブラウザ内に保存されますが、対局の途中保存・再開には対応していません。再読み込み、ページを閉じる操作、やり直しで現在の対局は終了します。設定は端末間で同期されません。",
        note: "プレイヤー 1 人対 AI 3 人のオフライン体験版です。ゲーム画面内で対局を始められます。",
      },
    },
    "naiwa-yuushiya": {
      zh: {
        title: "奶蛙", subtitle: "如果有勇者在的话就好了。", category: "NAIWA / CARD GAME PROTOTYPE", status: "开发中 · 待完善",
        description: "围绕选牌、同时出牌与传牌展开的桌游实验。这份浏览器原型可以和 BOT 进行单人对局，玩法与呈现仍在完善。",
        cover: "和 BOT 坐下来，试一局选牌与传牌。", steps: ["在设置中选择 BOT 数量、难度和选牌配置，点击「开始对战」。", "按界面提示从手牌中选牌，与其他参与者同时出牌。", "将剩余手牌传给下一位参与者，再从新收到的手牌中继续选择。", "跟随回合提示完成结算；这份试玩只包含单人 + BOT 模式。"],
        storage: "当前对局只保存在运行中的页面里。刷新、重新载入或关闭页面会结束对局；此原型不提供本地存档或跨设备续玩。",
        note: "开发中的浏览器玩法原型，使用简化界面展示规则流程。它仍待完善；此页未包含联网多人模式或完整 Cocos 美术版本。",
      },
      en: {
        title: "Naiwa", subtitle: "If only there were a hero.", category: "NAIWA / CARD GAME PROTOTYPE", status: "In development",
        description: "A tabletop experiment built around drafting, simultaneous play, and passing cards. Play this browser prototype solo with bots while its rules and presentation continue to develop.",
        cover: "Take a seat with bots. Pick, play, and pass.", steps: ["Choose the bot count, difficulty, and draft configuration, then press 开始对战 (Start match).", "Follow the interface to choose cards from your hand and play simultaneously with the other participants.", "Pass the remaining cards onward, then choose from the hand you receive.", "Follow the round prompts through scoring. This demo includes solo play with bots only."],
        storage: "The current match lives only in this running page. Refreshing, reloading, or closing the page ends the match. This prototype has no saved games or cross-device resume.",
        note: "An unfinished browser gameplay prototype with a simplified interface. This demo does not include online multiplayer or the full Cocos artwork version.",
      },
      ja: {
        title: "奶蛙 / Naiwa", subtitle: "勇者がいてくれたらよかったのに。", category: "NAIWA / CARD GAME PROTOTYPE", status: "開発中 · 調整中",
        description: "ドラフト、同時出し、カードの受け渡しを中心にしたボードゲーム実験。BOT 相手に遊べるブラウザ試作版で、ルールや演出は調整中です。",
        cover: "BOT と囲む、選んで出して渡すカードゲーム。", steps: ["BOT の人数・難度・ドラフト設定を選び、「开始对战」（対戦開始）を押します。", "画面の案内に従って手札からカードを選び、全員で同時に出します。", "残りの手札を次の参加者へ渡し、受け取った手札から再び選びます。", "ラウンドの案内に従って精算まで進めます。この体験版は 1 人 + BOT 専用です。"],
        storage: "対局は実行中のページ内だけに保持されます。更新、再読み込み、ページを閉じる操作で終了します。この試作版にはセーブや端末をまたぐ再開機能はありません。",
        note: "簡易 UI でルールの流れを体験する、開発中のブラウザ試作版です。オンライン対戦と完全な Cocos アート版は含まれていません。",
      },
    },
  };
  const gameId = document.body.dataset.game;
  const game = games[gameId];
  if (!game) return;
  const params = new URLSearchParams(location.search);
  let locale = Object.hasOwn(common, params.get("lang")) ? params.get("lang") : "zh";
  let frame = null;
  let state = "idle";
  let attempt = 0;
  let timer;
  const stage = document.getElementById("game-stage");
  const cover = document.getElementById("game-cover");
  const start = document.getElementById("start-demo");
  const reload = document.getElementById("reload-demo");
  const fullscreen = document.getElementById("fullscreen-demo");
  const language = document.getElementById("language");
  const status = document.getElementById("load-status");
  const gameURL = new URL("./game/index.html", location.href);

  function setState(next) {
    state = next;
    status.textContent = common[locale][state];
    stage.setAttribute("aria-busy", String(next === "loading"));
  }
  function updateFullscreenLabel() {
    fullscreen.textContent = common[locale][document.fullscreenElement ? "exitFullscreen" : "fullscreen"];
  }
  function translate() {
    const copy = { ...common[locale], ...game[locale] };
    document.documentElement.lang = locale;
    document.title = `${copy.title} · ${copy.demo} · irop.one`;
    document.querySelector('meta[name="description"]').content = copy.description;
    document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = copy[node.dataset.copy]; });
    document.querySelectorAll("[data-label]").forEach((node) => { node.setAttribute("aria-label", copy[node.dataset.label]); });
    document.querySelectorAll("[data-cover-image]").forEach((node) => { node.alt = copy.coverAlt; });
    const instructions = document.getElementById("instructions");
    instructions.replaceChildren(...copy.steps.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }));
    if (frame) frame.title = `${copy.title} · ${copy.frame}`;
    language.value = locale;
    setState(state);
    updateFullscreenLabel();
  }

  async function loadGame() {
    const currentAttempt = ++attempt;
    clearTimeout(timer);
    start.disabled = true;
    reload.disabled = false;
    fullscreen.disabled = true;
    frame?.remove();
    frame = null;
    cover.hidden = false;
    setState("loading");
    timer = setTimeout(() => { if (currentAttempt === attempt) setState("slow"); }, 25000);
    try {
      // An explicit click starts both this lightweight availability check and the game download.
      const response = await fetch(gameURL, { method: "HEAD", cache: "no-cache" });
      if (currentAttempt !== attempt) return;
      if (!response.ok) throw new Error("Game page unavailable");
      const nextFrame = document.createElement("iframe");
      nextFrame.title = `${game[locale].title} · ${common[locale].frame}`;
      nextFrame.allow = "fullscreen";
      nextFrame.allowFullscreen = true;
      nextFrame.addEventListener("load", () => {
        if (currentAttempt !== attempt) return;
        clearTimeout(timer);
        setState("loaded");
        fullscreen.disabled = false;
      }, { once: true });
      nextFrame.addEventListener("error", () => {
        if (currentAttempt !== attempt) return;
        clearTimeout(timer);
        setState("failed");
        start.disabled = false;
        cover.hidden = false;
      }, { once: true });
      nextFrame.src = gameURL.href;
      frame = nextFrame;
      stage.append(nextFrame);
      cover.hidden = true;
    } catch {
      if (currentAttempt !== attempt) return;
      clearTimeout(timer);
      start.disabled = false;
      setState("failed");
    }
  }

  start.addEventListener("click", loadGame);
  reload.addEventListener("click", () => {
    if (!frame || window.confirm(common[locale].reloadConfirm)) void loadGame();
  });
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.requestFullscreen) await stage.requestFullscreen();
      else throw new Error("Fullscreen unavailable");
    } catch {
      status.textContent = common[locale].fullscreenUnavailable;
    }
  });
  document.addEventListener("fullscreenchange", updateFullscreenLabel);
  language.addEventListener("change", () => {
    locale = language.value;
    const url = new URL(location.href);
    url.searchParams.set("lang", locale);
    history.replaceState(null, "", url);
    translate(); // Keep the existing iframe and its current game session intact.
  });
  document.querySelectorAll("[data-cover-image]").forEach((node) => {
    node.addEventListener("error", () => { node.hidden = true; }, { once: true });
  });
  translate();
})();
