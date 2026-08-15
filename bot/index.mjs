/**
 * 에듀테크 오라클 — 디스코드 프론트엔드.
 *
 * 대화 표면은 디스코드, 근거 표면은 배포된 사이트다. 이 파일은 디스코드 배선만 맡고
 * 실제 일은 `run-claude.mjs`(실행)와 `render.mjs`(변환)가 한다.
 *
 * 두 개의 출력 경로를 쓴다. 위인 발언은 **웹훅**으로 나간다 — 메시지마다 이름과 아바타를
 * 갈아 끼울 수 있는 유일한 방법이다. 버튼이 달린 조작 메시지는 **봇 자신**이 보낸다 —
 * 채널 웹훅은 애플리케이션 소유가 아니라 components가 거부된다.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import matter from "gray-matter";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { join } from "node:path";
import {
  Client,
  GatewayIntentBits,
  WebhookClient,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { loadPages } from "../scripts/wiki-parse.mjs";
import { loadAnswerContext, speakerSections } from "../scripts/check-answer.mjs";
import { runClaude, snapshotAnswers, findAnswer, makeSpeakerWatcher } from "./run-claude.mjs";
import { gateSection, sameText } from "./gate.mjs";
import { claimSingleInstance, DEFAULT_GUARD_PORT } from "./single-instance.mjs";
import { render, checkSummary } from "./render.mjs";

const CONFIG_PATH = new URL("./config.json", import.meta.url);

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    console.error(`bot/config.json을 읽지 못했다: ${e.message}`);
    console.error("bot/config.example.json을 복사해 값을 채워라.");
    process.exit(1);
  }
}

const config = loadConfig();
const answersDir = join(config.repo, "answers");

/**
 * 아바타는 `gen-avatars.py`가 만들어 사이트와 함께 배포한 256px 정사각 이미지다.
 * 출처와 라이선스는 `PORTRAITS.md`와 `web/assets/portraits.json`에 있다.
 */
const avatarDir = join(config.repo, "web", "assets", "avatars");

function avatarFor(slug) {
  const url = `${String(config.baseUrl).replace(/\/+$/, "")}/assets/avatars/${slug}.png`;
  try {
    // 내용 해시를 붙인다. 디스코드는 avatar_url을 **URL 기준으로 캐시**해서, 파일이
    // 바뀌어도 주소가 같으면 옛 이미지를 계속 내보낸다. 이니셜을 사진으로 갈아 끼울 때
    // 실제로 걸린 문제다. 해시를 쓰면 이미지가 바뀔 때만, 바뀐 것만 다시 받아 간다.
    const v = createHash("sha256").update(readFileSync(join(avatarDir, `${slug}.png`))).digest("hex");
    return `${url}?v=${v.slice(0, 8)}`;
  } catch {
    return url;
  }
}

/**
 * 화자 표시 이름은 **위키에서 가져온다.** 설정에 손으로 적으면 위인 페이지의 제목과
 * 갈라지고, 갈라진 쪽이 채널에 나간다. 설정은 덧붙임과 덮어쓰기만 담당한다.
 */
function speakersFromWiki(wikiDir) {
  const out = {};
  for (const p of loadPages(wikiDir)) {
    if (p.fm?.type === "pioneer" && p.fm?.slug) {
      out[p.fm.slug] = { name: p.fm.title, avatarUrl: avatarFor(p.fm.slug) };
    }
  }
  // 사회자는 위인이 아니라 위키에 페이지가 없다. 아바타만 여기서 붙인다(이름은 render가 고정).
  out._orchestrator = { avatarUrl: avatarFor("_orchestrator") };
  for (const [slug, extra] of Object.entries(config.speakers ?? {})) {
    // 객체가 아닌 값은 건너뛴다. 문자열을 펼치면 글자 하나하나가 키가 된 쓰레기 항목이 남는다.
    if (extra && typeof extra === "object") out[slug] = { ...out[slug], ...extra };
  }
  return out;
}

const speakers = speakersFromWiki(join(config.repo, "wiki"));
/** 스트림으로 받은 발언을 검사할 때 쓰는 임시 자리. 프로세스와 함께 사라진다. */
const gateDir = mkdtempSync(join(tmpdir(), "oracle-gate-"));
/** 답변 파일에 들어갈 수 있는 화자. 라우터 같은 다른 서브에이전트를 걸러 낸다. */
const pioneers = new Set(Object.keys(speakers).filter((k) => !k.startsWith("_")));
const webhook = new WebhookClient({ url: config.webhookUrl });

/**
 * 락은 **메모리에만 둔다.**
 *
 * 파일 락은 봇이 죽거나 맥미니가 재부팅되면 남아서 이후 모든 요청을 영원히 거절한다.
 * 프로세스와 함께 사라지는 락은 그 자체로 복구된다.
 *
 * 다만 이 락이 지키는 범위는 **프로세스 하나뿐이다.** 2026-08-16에 봇이 실제로 둘 떠서
 * 디스코드가 같은 인터랙션을 양쪽에 배달했고, 락은 서로를 보지 못했다. 인스턴스가 하나임은
 * 락이 아니라 `single-instance.mjs`가 기동 시점에 보장한다.
 */
let busy = null;

/** 진행 중인 `/debate`. 버튼이 눌렸을 때 어디서 이어 갈지 안다. */
const debates = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 웹훅으로 순서대로 게시한다. 순서가 곧 발언 순서라 병렬로 보내면 안 된다. */
async function postAll(payloads) {
  for (const p of payloads) {
    await webhook.send({
      content: p.content,
      username: p.username,
      ...(p.avatarUrl ? { avatarURL: p.avatarUrl } : {}),
    });
    // 웹훅 레이트리밋(5초에 5건)에 걸리면 discord.js가 알아서 기다리지만,
    // 애초에 부딪히지 않는 편이 답변이 끊겨 보이지 않는다.
    await sleep(400);
  }
}

/** 봇 자신이 보내는 안내·오류. 위인 발언과 섞이지 않게 웹훅을 쓰지 않는다. */
const say = (channel, content, components = []) => channel.send({ content, components });

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`;
};

/** 진행 표시 갱신 주기. 너무 잦으면 디스코드 편집 레이트리밋에 부딪힌다. */
const PROGRESS_MS = config.progressMs ?? 30 * 1000;

/**
 * 오래 걸리는 일 위에 경과 시간을 띄운다.
 *
 * `/ask` 한 번이 실측 7분이었다. 그동안 채널에 아무 신호가 없으면 고장인지 진행 중인지
 * 구분할 수 없다 — 실제로 첫 실행에서 "답변이 안 뜬다"로 나타난 증상이다.
 *
 * 새 메시지를 쌓지 않고 **한 메시지를 고쳐 쓴다.** 끝나면 지운다 — 답변과 검사 요약이
 * 뒤따르므로 진행 표시가 남을 이유가 없다.
 */
async function withProgress(channel, label, fn) {
  const started = Date.now();
  const msg = await say(channel, `${label} · 시작`).catch(() => null);
  const timer = setInterval(() => {
    msg?.edit(`${label} · ${mmss(Date.now() - started)}째 진행 중`).catch(() => {});
  }, PROGRESS_MS);
  try {
    return await fn();
  } finally {
    clearInterval(timer);
    await msg?.delete().catch(() => {});
  }
}

/** 답변을 커밋한다. **푸시하지 않는다** — 질문 하나에 사이트를 재배포하는 것은 과하다. */
function commitAnswer(file, subject) {
  return new Promise((resolve) => {
    const git = (args) =>
      new Promise((done) => execFile("git", args, { cwd: config.repo }, (e, o, err) => done({ e, err })));
    git(["add", join("answers", file)])
      .then(() => git(["commit", "-m", `Record an answer: ${subject}`]))
      .then(({ e, err }) => resolve(e ? `커밋 실패: ${String(err).trim().slice(0, 200)}` : null));
  });
}

/**
 * 한 번의 실행 — claude 호출, 답변 파일 읽기, 새 섹션 게시.
 *
 * `/ask`와 `/debate`가 같은 함수를 쓴다. `/ask`는 라운드가 하나뿐인 경우일 뿐이다.
 *
 * @param {number} since  이미 게시한 섹션 수. 라운드 2 이후는 델타만 올린다
 * @returns {Promise<{ok: boolean, file: string|null, sectionCount: number, sessionId: string|null}>}
 */
async function runAndPost(channel, { prompt, resume, appendSystemPrompt, since = 0, subject }) {
  const before = snapshotAnswers(answersDir);
  // 이미 올린 발언. 키는 `<slug>#<그 화자의 몇 번째 발언인가>` — `/debate`는 같은 위인이
  // 라운드마다 다시 말하므로 slug만으로는 구분되지 않는다.
  const posted = new Map();
  const seen = new Map();
  const nextKey = (slug) => {
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    return `${slug}#${n}`;
  };

  // 게시를 한 줄로 세운다. 위인 둘이 몇 초 차이로 끝나면 웹훅 호출이 겹쳐
  // 한 사람의 1/2·2/2가 다른 사람 사이에 끼어 버린다.
  let queue = Promise.resolve();
  const enqueue = (payloads) => {
    queue = queue.then(() => postAll(payloads)).catch((e) => console.error(`게시 실패: ${e.message}`));
  };

  const ctx = loadAnswerContext({ wikiDir: join(config.repo, "wiki"), sourcesPath: join(config.repo, "sources.json") });
  const onSpeaker = ({ slug, text }) => {
    if (!pioneers.has(slug)) return; // 라우터 등은 답변 파일에 들어가지 않으므로 순번도 세지 않는다
    // 순번은 **게이트 통과 여부와 무관하게** 센다. 건너뛴 발언이 순번을 비우면
    // 마지막 정산에서 화자의 몇 번째 발언인지가 한 칸씩 어긋난다.
    const k = nextKey(slug);
    const { md, skip } = gateSection({ slug, text, ctx, dir: gateDir, pioneers });
    if (skip) {
      // 위조급이 남았으면 여기서 멈춘다. 오케스트레이터가 재호출로 고친 판이
      // 마지막 정산에서 올라간다 — 검사를 통과하지 않은 인용은 채널에 먼저 나가지 않는다.
      console.log(`  보류 ${slug}: ${skip}`);
      return;
    }
    posted.set(k, text);
    console.log(`  게시 ${slug}`);
    enqueue(render(md, { baseUrl: config.baseUrl, speakers }).payloads);
  };

  const run = await withProgress(channel, `\`${subject}\` 처리 중`, () =>
    runClaude({
      prompt,
      cwd: config.repo,
      resume,
      appendSystemPrompt,
      timeoutMs: config.timeoutMs,
      onEvent: makeSpeakerWatcher(onSpeaker),
    }),
  );

  if (!run.ok) {
    // 조용히 죽지 않는다. 레이트리밋도 폴백 없이 메시지를 그대로 전달한다.
    await say(channel, `실행이 실패했다.\n\`\`\`\n${String(run.error).slice(0, 1800)}\n\`\`\``);
    return { ok: false, file: null, sectionCount: since, sessionId: run.sessionId };
  }

  const raw = () => `실행 결과 원문을 대신 올린다.\n\n${String(run.result).slice(0, 1800)}`;

  const { file, created } = findAnswer(answersDir, before);
  if (!file) {
    await say(channel, `답변 파일이 생기지 않았다. ${raw()}`);
    return { ok: false, file: null, sectionCount: since, sessionId: run.sessionId };
  }

  const md = readFileSync(join(answersDir, file), "utf8");
  // 라운드를 이어 가는데 **새 파일**이 생겼다면 커서를 버린다. 앞 파일의 섹션 수를
  // 새 파일에 적용하면 델타가 통째로 비어 라운드 전체가 채널에 올라오지 않는다.
  const from = created ? 0 : since;
  const { payloads, sectionCount } = render(md, { since: from, baseUrl: config.baseUrl, speakers });

  if (sectionCount <= from) {
    // 파일은 있는데 새 섹션이 없다 — "파일이 안 생김"과 같은 실패다. 조용히 넘어가면
    // 몇 분을 기다린 끝에 요약 한 줄만 남는다.
    await say(channel, `답변 파일에 새 발언이 없다(\`${file}\`). ${raw()}`);
    return { ok: false, file, sectionCount: since, sessionId: run.sessionId };
  }

  await queue; // 스트림으로 올린 것들이 다 나간 뒤에 정산한다

  // 정산 — 스트림으로 이미 올린 발언은 다시 올리지 않는다. 다만 게이트가 재호출을
  // 시켜 **본문이 바뀐** 발언은 정정으로 다시 올린다. 틀린 인용이 채널에 남아 있으면
  // 게이트가 잡아 준 의미가 사라진다.
  const tally = new Map();
  const drop = new Set();
  const fixed = new Set();
  for (const [i, s] of speakerSections(matter(md).content).entries()) {
    if (i < from) continue;
    const n = tally.get(s.speaker) ?? 0;
    tally.set(s.speaker, n + 1);
    const k = `${s.speaker}#${n}`;
    if (!posted.has(k)) continue;
    (sameText(posted.get(k), s.text) ? drop : fixed).add(i);
  }

  if (fixed.size) {
    const who = [...fixed].map((i) => speakers[speakerSections(matter(md).content)[i].speaker]?.name).filter(Boolean);
    await say(channel, `-# 게이트 재검에서 고쳐진 발언을 다시 올린다 — ${who.join(" · ")}`);
  }
  await postAll(payloads.filter((p) => !drop.has(p.section)));

  const summary = checkSummary(md);
  if (summary) await say(channel, `-# ${summary} · \`${file}\``);

  const failed = await commitAnswer(file, subject);
  if (failed) await say(channel, `-# ${failed}`);

  return { ok: true, file, sectionCount, sessionId: run.sessionId };
}

/** 라운드 제어 주입. `debate.md`는 고치지 않는다. */
const ROUND_1 = [
  "이번 호출은 라운드 1까지만 진행한다. 그 다음 라운드로 넘어가지 않는다.",
  "사용자에게 되묻지 않는다. 모호하면 가장 그럴듯한 해석을 골라 명시하고 진행한다.",
  "결과를 answers/ 파일에 즉시 쓴다.",
].join(" ");

const ROUND_PROMPT = {
  2: "라운드 2(반박)만 진행하고 같은 answers/ 파일에 이어 쓴다. 되묻지 않는다.",
  3: "라운드 3(쟁점 정리)만 진행하고 같은 answers/ 파일에 이어 쓴다. 되묻지 않는다.",
};

const roundButtons = (id, next) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`debate:go:${id}`)
      .setLabel(`라운드 ${next} 지금 진행`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`debate:end:${id}`).setLabel("종료").setStyle(ButtonStyle.Secondary),
  );

/**
 * 라운드는 **기다렸다 알아서 넘어간다.** 버튼은 그 흐름에 끼어드는 수단이다 —
 * 기다리기 싫으면 "지금 진행", 여기서 멈추려면 "종료".
 *
 * 그래서 이 값은 "포기하기 전 유예"가 아니라 "끼어들 틈"이다. 길게 잡을 이유가 없다.
 * `config.json`의 `debateAutoMs`로 바꾼다.
 */
const DEBATE_AUTO_MS = config.debateAutoMs ?? 90 * 1000;

function armAutoAdvance(id, channel) {
  const state = debates.get(id);
  if (!state) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    if (!debates.has(id)) return;
    advance(id, channel, (next) => stripControls(id, next)).catch((e) => {
      console.error(e);
      say(channel, `자동 진행에서 오류가 났다: ${e.message}`).catch(() => {});
    });
  }, DEBATE_AUTO_MS);
}

/** 타이머가 진행할 때는 응답할 인터랙션이 없다. 남아 있는 버튼을 메시지에서 직접 걷는다. */
async function stripControls(id, next) {
  const control = debates.get(id)?.control;
  if (!control) return;
  await control.edit({ content: `라운드 ${next} 진행 중…`, components: [] }).catch(() => {});
}

/**
 * 다음 라운드로 넘어간다. 버튼과 자동 진행 타이머가 **같은 경로**를 쓴다.
 *
 * @param {(next: number) => Promise<unknown>} ack  버튼을 걷어 내는 방법. 호출자마다 다르다
 * @returns {Promise<"gone"|"busy"|"done">}
 */
async function advance(id, channel, ack) {
  const state = debates.get(id);
  if (!state) return "gone";
  clearTimeout(state.timer);

  if (busy) {
    // 접지 않는다. 돌고 있는 실행이 끝나면 다시 시도한다.
    armAutoAdvance(id, channel);
    return "busy";
  }
  // 락은 검사 직후 동기적으로. `ack`부터 기다리면 그 사이에 다른 요청이 통과한다.
  const next = state.round + 1;
  busy = state.subject;
  try {
    await ack(next);
    const r = await runAndPost(channel, {
      prompt: ROUND_PROMPT[next],
      resume: state.sessionId,
      since: state.sectionCount,
      subject: state.subject,
    });
    if (!r.ok) {
      debates.delete(id);
      return "done";
    }
    if (next >= 3) {
      debates.delete(id);
      await say(channel, "라운드 3까지 끝났다.");
      return "done";
    }
    // `sessionId`는 덮어쓰지 않고 지킨다. resume 실행이 null을 돌려주면 다음 라운드가
    // 새 세션으로 시작해 앞의 토론을 통째로 잊는다.
    debates.set(id, { ...state, ...r, sessionId: r.sessionId ?? state.sessionId, round: next });
    await offerNext(id, channel, next);
    return "done";
  } finally {
    busy = null;
  }
}

/** 라운드가 끝났음을 알리고 다음 라운드 시계를 건다. */
async function offerNext(id, channel, round) {
  const wait = Math.round(DEBATE_AUTO_MS / 1000);
  const control = await say(
    channel,
    `라운드 ${round}이 끝났다. ${wait}초 뒤 라운드 ${round + 1}로 넘어간다.`,
    [roundButtons(id, round + 1)],
  );
  const state = debates.get(id);
  if (state) state.control = control;
  armAutoAdvance(id, channel);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("교육공학 위인들에게 묻는다")
    .addStringOption((o) => o.setName("질문").setDescription("묻고 싶은 것").setRequired(true)),
  new SlashCommandBuilder()
    .setName("debate")
    .setDescription("위인들을 대립축 위에서 토론시킨다")
    .addStringOption((o) => o.setName("주제").setDescription("토론 주제").setRequired(true)),
].map((c) => c.toJSON());

client.once("clientReady", async (c) => {
  const rest = new REST().setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(c.application.id, config.guildId), { body: commands });
  const pioneers = Object.keys(speakers).filter((k) => !k.startsWith("_")).length;
  console.log(`${c.user.tag} 준비됨 · 위인 ${pioneers}명 · 커맨드 ${commands.length}개 등록`);
});

client.on("interactionCreate", async (interaction) => {
  // 비공개 서버지만 본인 것만 받는다. 구독 사용량이 걸린 실행이다.
  if (interaction.user.id !== config.ownerId) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: "이 봇은 소유자만 쓸 수 있다.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  try {
    if (interaction.isChatInputCommand()) await onCommand(interaction);
    else if (interaction.isButton()) await onButton(interaction);
  } catch (e) {
    console.error(e);
    const note = `봇에서 오류가 났다: ${e.message}`;
    if (interaction.channel) await say(interaction.channel, note).catch(() => {});
  }
});

async function onCommand(interaction) {
  const isAsk = interaction.commandName === "ask";
  const subject = interaction.options.getString(isAsk ? "질문" : "주제");
  const channel = interaction.channel;

  if (busy) {
    await interaction.reply({ content: `진행 중이다 — ${busy}`, flags: MessageFlags.Ephemeral });
    return;
  }
  // 락은 검사 직후 **동기적으로** 잡는다. 사이에 `await`가 하나라도 있으면 그 왕복 동안
  // 두 번째 요청이 검사를 똑같이 통과해 같은 작업 트리에 claude 두 개가 돈다.
  busy = subject;
  try {
    // 3초 안에 답해야 한다. 최종 출력은 절대 이 토큰에 걸지 않는다 —
    // 지연 응답은 15분에 만료되는데 `/debate` 3라운드는 그것을 넘길 수 있다.
    await interaction.reply({ content: `${isAsk ? "/ask" : "/debate"} 시작했다: ${subject}` });
    if (isAsk) {
      await runAndPost(channel, { prompt: `/ask ${subject}`, subject });
      return;
    }
    const r = await runAndPost(channel, {
      prompt: `/debate ${subject}`,
      appendSystemPrompt: ROUND_1,
      subject,
    });
    if (!r.ok || !r.sessionId) return;

    const id = interaction.id;
    debates.set(id, { ...r, subject, round: 1, timer: null, control: null });
    await offerNext(id, channel, 1);
  } finally {
    busy = null;
  }
}

async function onButton(interaction) {
  const [, action, id] = interaction.customId.split(":");
  const state = debates.get(id);
  if (!state) {
    await interaction.update({ content: "이미 끝난 토론이다.", components: [] });
    return;
  }

  if (action === "end") {
    clearTimeout(state.timer);
    debates.delete(id);
    await interaction.update({ content: `라운드 ${state.round}에서 토론을 마쳤다.`, components: [] });
    return;
  }

  // "지금 진행"은 시계를 앞당길 뿐이다. 타이머와 같은 함수로 들어가 락도 같이 쓴다.
  // `advance()`는 첫 `await` 전에 락을 잡으므로 여기서 미리 기다리면 안 된다.
  const outcome = await advance(id, interaction.channel, (next) =>
    interaction.update({ content: `라운드 ${next} 진행 중…`, components: [] }),
  );
  if (outcome === "busy") {
    await interaction.reply({ content: `진행 중이다 — ${busy}`, flags: MessageFlags.Ephemeral });
  }
}

// 자리를 먼저 잡는다. **로그인보다 앞이어야 한다** — 게이트웨이에 붙고 나서 물러나면
// 그 사이에 도착한 인터랙션을 두 봇이 함께 집어 진 쪽이 채널에 오류를 남긴다.
if (!(await claimSingleInstance(config.guardPort ?? DEFAULT_GUARD_PORT))) {
  console.error("봇이 이미 떠 있다. 둘을 띄우면 디스코드가 같은 인터랙션을 양쪽에 배달한다.");
  console.error("`ps aux | grep index.mjs`로 확인하고 하나만 남겨라.");
  process.exit(1);
}

client.login(config.token);
