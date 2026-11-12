// Be'ati - free edition. All app code in one plain script (works without a server, even by double-click).
(function () {
"use strict";

/* ======================================================= ui.js */
// Small DOM helpers. All dynamic text goes through textContent or escapeHTML.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** Hyperscript-style element builder. Strings become text nodes (safe). */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v; // only used with trusted/static markup
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Inline SVG icon from the sprite in index.html (trusted, static ids). */
function icon(name, cls = "") {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", `ico ${cls}`.trim());
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

function toast(message, type = "info", ms = 4200) {
  const region = $("#toast-region");
  const t = h("div", { class: `toast ${type}`, role: type === "error" ? "alert" : "status" }, message);
  region.append(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 320);
  }, ms);
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arNum = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

function formatTime(ts) {
  try {
    return new Intl.DateTimeFormat("ar-JO", { hour: "numeric", minute: "2-digit" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

/**
 * Minimal, safe Markdown → HTML for chat replies:
 * escapes everything first, then supports **bold**, `code`, bullet/numbered lists and paragraphs.
 */
function miniMarkdown(text) {
  const lines = escapeHTML(text).replace(/\r/g, "").split("\n");
  const out = [];
  let list = null;
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^[-*•]\s+(.*)/))) {
      if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^(?:\d+|[٠-٩]+)[.)]\s+(.*)/))) {
      if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (!line) {
      close();
    } else {
      close();
      out.push(`<p>${inline(line.replace(/^#{1,6}\s*/, ""))}</p>`);
    }
  }
  close();
  return out.join("");
}

/* ======================================================= mascot.js */
// «نبتة» — the Be'ati environmental AI mascot.
// Pure SVG + CSS animations. States: idle | excited | thinking | happy | confused | wave

const STATES = ["idle", "excited", "thinking", "happy", "confused", "wave"];
const registry = new Map();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function mascotSVG({ mini = false } = {}) {
  const extras = mini ? "" : `
    <g class="m-sparkles" aria-hidden="true">
      <path d="M34 78l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#9c5b4a"/>
      <path d="M168 58l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#c3d39a"/>
      <circle cx="172" cy="118" r="3.5" fill="#9c5b4a"/>
    </g>
    <g class="m-orbit" aria-hidden="true">
      <circle cx="100" cy="137" r="84" fill="none" stroke="#9c5b4a" stroke-opacity=".22" stroke-dasharray="2 7" stroke-width="1.5"/>
      <circle cx="100" cy="53" r="5" fill="#9c5b4a"/>
      <circle cx="184" cy="137" r="4" fill="#c3d39a"/>
      <circle cx="41" cy="196" r="3.5" fill="#24402f"/>
    </g>`;

  const shadow = mini ? "" : `<g class="m-shadow"><ellipse cx="100" cy="222" rx="46" ry="6.5" fill="#24402f" opacity=".22"/></g>`;

  return `
<svg class="mascot is-idle" viewBox="${mini ? "18 4 164 210" : "0 0 200 232"}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="نبتة، المساعد البيئي">
  ${shadow}
  <g class="m-float">
    ${extras}
    <g class="m-arm-l"><ellipse cx="24" cy="152" rx="9" ry="16" transform="rotate(28 24 152)" fill="#c3d39a"/></g>
    <g class="m-arm-r"><ellipse cx="176" cy="152" rx="9" ry="16" transform="rotate(-28 176 152)" fill="#c3d39a"/></g>

    <g class="m-sprout">
      <path d="M100 72 C100 60 101.5 50 100 40" stroke="#24402f" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <g class="m-leaf-l"><path d="M100 50 C87 50 75 42 72 27 C87 26 98.5 35 100 50 Z" fill="#9c5b4a"/>
        <path d="M100 50 C92 45 84 38 79 31" stroke="#7f4537" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/></g>
      <g class="m-leaf-r"><path d="M100 42 C111 40 123 30 126 15 C111 15 101 26 100 42 Z" fill="#355a43"/>
        <path d="M100 42 C107 35 114 27 120 20" stroke="#24402f" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/></g>
    </g>

    <g class="m-body">
      <path d="M100 68 C147 68 173 103 173 143 C173 186 142 208 100 208 C58 208 27 186 27 143 C27 103 53 68 100 68 Z" fill="#d5e1b5"/>
      <path d="M100 68 C147 68 173 103 173 143 C173 186 142 208 100 208" fill="none" stroke="#b9c98c" stroke-width="2" opacity=".6"/>
      <ellipse cx="70" cy="96" rx="17" ry="8" transform="rotate(-28 70 96)" fill="#fff" opacity=".45"/>
      <path d="M100 196 c-6 -2 -9 -7 -8 -13 c6 0 10 4 8 13 z M100 196 c6 -2 9 -7 8 -13 c-6 0 -10 4 -8 13 z" fill="#9c5b4a" opacity=".55"/>

      <rect x="50" y="108" width="100" height="64" rx="32" fill="#24402f"/>
      <rect class="m-screen-glow" x="52" y="110" width="96" height="60" rx="30" fill="none" stroke="#d5e1b5" stroke-width="2.5"/>
      <rect class="m-scan" x="62" y="139" width="76" height="2.5" rx="1.25" fill="#d5e1b5" opacity=".75"/>

      <ellipse class="m-cheek" cx="66" cy="157" rx="7.5" ry="4" fill="#c27a66"/>
      <ellipse class="m-cheek" cx="134" cy="157" rx="7.5" ry="4" fill="#c27a66"/>

      <g class="m-eyes">
        <g class="m-eye"><ellipse cx="82" cy="138" rx="7" ry="9.5" fill="#ecf2dc"/><circle cx="84.5" cy="134.5" r="2.2" fill="#fff"/></g>
        <g class="m-eye"><ellipse cx="118" cy="138" rx="7" ry="9.5" fill="#ecf2dc"/><circle cx="120.5" cy="134.5" r="2.2" fill="#fff"/></g>
      </g>

      <g class="m-mouth" fill="none" stroke="#d5e1b5" stroke-width="3" stroke-linecap="round">
        <path class="m-mouth-idle" d="M93 155 Q100 160.5 107 155"/>
        <path class="m-mouth-happy" d="M89 152 Q100 166 111 152" />
        <path class="m-mouth-flat" d="M94 157 L106 157"/>
        <ellipse class="m-mouth-o" cx="100" cy="157" rx="3.6" ry="4.4" fill="#d5e1b5" stroke="none"/>
      </g>
    </g>
  </g>
</svg>`;
}

/** Render mascots into every [data-mascot] host. */
function mountMascots(root = document) {
  root.querySelectorAll("[data-mascot]").forEach((host) => {
    if (host.dataset.mounted) return;
    host.innerHTML = mascotSVG({ mini: host.classList.contains("mascot-xs") });
    host.dataset.mounted = "1";
    const svg = host.querySelector("svg");
    registry.set(host.dataset.mascot, svg);
    if (host.dataset.mascot === "thinking") setState(svg, "thinking");
  });
  if (!reduceMotion) enableEyeTracking();
}

function setState(svg, state) {
  if (!svg) return;
  STATES.forEach((s) => svg.classList.remove(`is-${s}`));
  // restart CSS animations
  void svg.getBoundingClientRect();
  svg.classList.add(`is-${state}`);
}

/**
 * Change a mascot's state. If `revertAfter` (ms) is given, returns to idle afterwards.
 */
function mascot(name, state, revertAfter = 0) {
  const svg = registry.get(name);
  if (!svg) return;
  clearTimeout(svg._revert);
  setState(svg, state);
  if (revertAfter) svg._revert = setTimeout(() => setState(svg, "idle"), revertAfter);
}

let tracking = false;
function enableEyeTracking() {
  if (tracking) return;
  tracking = true;
  let raf = 0;
  window.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      registry.forEach((svg) => {
        if (!svg.classList.contains("is-idle") && !svg.classList.contains("is-wave")) return;
        const r = svg.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.6;
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 400));
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 400));
        const eyes = svg.querySelector(".m-eyes");
        if (eyes) eyes.style.transform = `translate(${(dx * 4).toFixed(2)}px, ${(dy * 3).toFixed(2)}px)`;
      });
    });
  }, { passive: true });
}

/* ======================================================= image.js */
// Client-side image preparation: validate, fix orientation, downscale, re-encode as JPEG.
// Shrinks uploads (faster on mobile networks) and converts formats like HEIC
// where the browser can decode them. The server validates again independently.

const RAW_LIMIT_MB = 25;
const ACCEPTED = /^image\//i;

class ImageError extends Error {}

async function decode(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ImageError("تعذّر قراءة الصورة. جرّب صورة بصيغة JPG أو PNG.")); };
    img.src = url;
  });
}

function draw(src, maxSide) {
  const w = src.width, h = src.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const toBlob = (canvas, q) => new Promise((res) => canvas.toBlob(res, "image/jpeg", q));

/**
 * @returns {Promise<{blob: Blob, previewUrl: string, thumb: string}>}
 */
async function prepareImage(file, { maxSide = 1600, maxBytes = 8 * 1024 * 1024 } = {}) {
  if (!file) throw new ImageError("لم يتم اختيار صورة.");
  if (file.type && !ACCEPTED.test(file.type)) throw new ImageError("هذا الملف ليس صورة. اختر صورة JPG أو PNG أو WEBP.");
  if (file.size > RAW_LIMIT_MB * 1024 * 1024) throw new ImageError(`حجم الصورة كبير جدًا (الحد ${RAW_LIMIT_MB} ميغابايت قبل الضغط).`);

  const src = await decode(file);
  if (Math.min(src.width, src.height) < 64) throw new ImageError("الصورة صغيرة جدًا للتحليل.");

  const canvas = draw(src, maxSide);
  let blob = await toBlob(canvas, 0.88);
  if (blob && blob.size > maxBytes) blob = await toBlob(canvas, 0.7);
  if (!blob) throw new ImageError("تعذّر معالجة الصورة على هذا الجهاز.");
  if (blob.size > maxBytes) throw new ImageError("حجم الصورة كبير جدًا حتى بعد الضغط.");

  const thumb = draw(src, 320).toDataURL("image/jpeg", 0.72);
  if (src.close) src.close();
  return { blob, previewUrl: URL.createObjectURL(blob), thumb };
}

/* ======================================================= store.js */
// Session-scoped storage for analysis history and chat.
// sessionStorage clears when the tab closes — nothing is kept on the server.

const HISTORY_KEY = "beati.history.v1";
const CHAT_KEY = "beati.chat.v1";
const MAX_ITEMS = 12;

function read(key, fallback) {
  try {
    const v = sessionStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded or storage blocked
  }
}

const listeners = new Set();
const onHistoryChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(getHistory()));

const getHistory = () => read(HISTORY_KEY, []);
const getEntry = (id) => getHistory().find((e) => e.id === id) || null;

function addHistory(entry) {
  let items = [entry, ...getHistory().filter((e) => e.id !== entry.id)].slice(0, MAX_ITEMS);
  // If storage is full, drop the oldest items until it fits.
  while (!write(HISTORY_KEY, items) && items.length > 1) items = items.slice(0, -1);
  emit();
}

function clearHistory() {
  try { sessionStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  emit();
}

const getChat = () => read(CHAT_KEY, { messages: [], contextId: null });
const saveChat = (state) => write(CHAT_KEY, state);

/* ======================================================= report.js */
// Renders a structured environmental report (validated JSON from the backend) as RTL UI.

const TRI = { yes: "نعم", no: "لا", conditional: "بشروط", unknown: "غير مؤكد" };
const HARM = { low: "منخفض", moderate: "متوسط", high: "مرتفع", hazardous: "خطِر", unknown: "غير محدد" };
const HARM_COLOR = { low: "#3f7a52", moderate: "#a8742a", high: "#b04a37", hazardous: "#8e2f2a", unknown: "#8f8c83" };
const CONF = { high: "ثقة عالية", medium: "ثقة متوسطة", low: "ثقة منخفضة" };
const RECYCLE = {
  yes: "قابل للتدوير",
  no: "غير قابل للتدوير عادةً",
  conditional: "قابل للتدوير بشروط",
  unknown: "غير مؤكد",
};
const CATEGORY = {
  plastic: ["بلاستيك", "#7a9fb6"], paper: ["ورق", "#c9b38a"], cardboard: ["كرتون", "#a9825a"],
  glass: ["زجاج", "#7fb3a6"], metal: ["معدن", "#8d939b"], organic: ["مادة عضوية", "#6f9a4f"],
  e_waste: ["نفايات إلكترونية", "#4b5563"], textile: ["نسيج", "#b07d9a"], wood: ["خشب", "#8a6a45"],
  ceramic: ["سيراميك", "#c9a48c"], rubber: ["مطاط", "#3d3d3d"], hazardous: ["مواد خطرة", "#8e2f2a"],
  composite: ["مواد مركّبة", "#9c5b4a"], unknown: ["غير محدد", "#b8b4aa"],
};
const CLASS_ITEMS = [
  ["recyclable", "قابل للتدوير", false],
  ["reusable", "قابل لإعادة الاستخدام", false],
  ["biodegradable", "قابل للتحلل الحيوي", false],
  ["eco_friendly", "صديق للبيئة", false],
  ["hazardous", "خطِر", true],
];

const card = (title, ico, body, { terra = false, span = false } = {}) =>
  h("section", { class: `card${span ? " span-2" : ""}` },
    h("header", { class: "card-head" },
      h("span", { class: `c-ico${terra ? " terra" : ""}` }, icon(ico)),
      h("h3", {}, title)),
    body);

const bullets = (items, cls = "") => h("ul", { class: `list ${cls}`.trim(), role: "list" }, items.map((t) => h("li", {}, t)));
const numbered = (items) => h("ol", { class: "steps-list", role: "list" }, items.map((t) => h("li", {}, h("span", {}, t))));
const nonEmpty = (a) => Array.isArray(a) && a.length > 0;

function gauge(level, score) {
  const L = Math.PI * 60;
  const color = HARM_COLOR[level] || HARM_COLOR.unknown;
  const wrap = h("div", { class: "gauge", role: "img", "aria-label": `مستوى الضرر البيئي: ${HARM[level] || "غير محدد"}، ${score} من 100` });
  wrap.innerHTML = `
    <svg viewBox="0 0 150 88" aria-hidden="true">
      <path class="g-track" d="M15 78 A60 60 0 0 1 135 78" fill="none" stroke-width="12" stroke-linecap="round"/>
      <path class="g-val" d="M15 78 A60 60 0 0 1 135 78" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${L}" stroke-dashoffset="${L}"/>
    </svg>`;
  const val = wrap.querySelector(".g-val");
  const pct = level === "unknown" ? 0 : Math.max(0, Math.min(100, Number(score) || 0));
  requestAnimationFrame(() => requestAnimationFrame(() => val.setAttribute("stroke-dashoffset", String(L * (1 - pct / 100)))));
  wrap.append(
    h("div", {},
      h("div", { class: "g-num", style: { color } }, level === "unknown" ? "—" : arNum(pct)),
      h("div", { class: "g-cap" }, "مستوى الضرر البيئي: ", h("strong", { style: { color } }, HARM[level] || "غير محدد"))),
  );
  return wrap;
}

function classificationGrid(c) {
  return h("div", { class: "class-grid" }, CLASS_ITEMS.map(([key, label, inverted]) => {
    const v = c?.[key] || "unknown";
    let ic = { yes: "check", no: "x", conditional: "minus", unknown: "question" }[v];
    if (inverted) ic = { yes: "warn", no: "check", conditional: "minus", unknown: "question" }[v];
    return h("div", { class: `cls ${v}${inverted ? " bad" : ""}` },
      h("span", { class: "cls-ico" }, icon(ic)),
      h("span", { class: "cls-name" }, label),
      h("span", { class: "cls-val" }, TRI[v]));
  }));
}

function materialsList(materials) {
  if (!nonEmpty(materials)) return h("p", { class: "muted" }, "لم يتم تحديد المواد بدقة.");
  return h("div", { class: "materials" }, materials.map((m) => {
    const [catLabel, color] = CATEGORY[m.category] || CATEGORY.unknown;
    return h("div", { class: "material" },
      h("span", { class: "mat-dot", style: { background: color }, title: catLabel }),
      h("div", {},
        h("div", { class: "m-name" }, m.name),
        h("div", { class: "m-en" }, catLabel, m.name_en ? [" · ", h("bdi", { dir: "ltr" }, m.name_en)] : null)),
      m.share ? h("span", { class: "m-share" }, m.share) : null);
  }));
}

function unclearView(entry, { onNew }) {
  const r = entry.report;
  return h("div", { class: "report" },
    h("div", { class: "card unclear" },
      entry.thumb ? h("img", { class: "report-thumb", src: entry.thumb, alt: "" }) : null,
      h("h2", {}, "لم أتمكن من التعرّف على العنصر بثقة"),
      h("p", {}, r.unclear_reason || "الصورة غير واضحة بما يكفي لتحليل المادة."),
      nonEmpty(r.extra_tips) ? bullets(r.extra_tips) : bullets([
        "التقط الصورة في إضاءة جيدة",
        "اجعل العنصر يملأ معظم الإطار",
        "أظهر الملصق أو رمز التدوير إن وُجد",
      ]),
      h("button", { class: "btn btn-primary", type: "button", onclick: onNew }, icon("refresh"), "جرّب صورة أخرى")));
}

/**
 * @param {{report: object, thumb?: string, demo?: boolean, model?: string, createdAt?: number}} entry
 * @param {{onAsk: Function, onNew: Function}} handlers
 */
function renderReport(entry, handlers) {
  const r = entry.report;
  if (!r.is_analyzable) return unclearView(entry, handlers);

  const chips = [
    h("span", { class: `chip conf-${r.confidence}` }, CONF[r.confidence] || ""),
    ...new Set((r.materials || []).map((m) => m.category)),
  ].map((x) => (typeof x === "string" ? h("span", { class: "chip" }, (CATEGORY[x] || CATEGORY.unknown)[0]) : x));
  if (entry.demo) chips.push(h("span", { class: "chip demo" }, "نتيجة تجريبية"));

  const hero = h("section", { class: "card report-hero" },
    entry.thumb ? h("img", { class: "report-thumb", src: entry.thumb, alt: `صورة ${r.item_name}` }) : h("div", { class: "report-thumb" }),
    h("div", { class: "report-title" },
      h("div", { class: "label" }, "اسم العنصر"),
      h("h2", {}, r.item_name),
      r.item_name_en ? h("span", { class: "en" }, r.item_name_en) : null,
      h("div", { class: "chips" }, chips),
      h("p", { class: "summary" }, r.summary)),
    gauge(r.harm_level, r.harm_score));

  const blocks = [hero];

  if (r.confidence_note && r.confidence !== "high") {
    blocks.push(h("div", { class: "alert info", role: "note" }, icon("question"),
      h("div", {}, h("h3", {}, "ملاحظة حول دقة التحليل"), h("p", {}, r.confidence_note))));
  }

  if (r.requires_special_handling || nonEmpty(r.safety_warnings)) {
    blocks.push(h("div", { class: "alert", role: "alert" }, icon("warn"),
      h("div", {},
        h("h3", {}, "تنبيه سلامة: يحتاج هذا العنصر معالجة خاصة"),
        nonEmpty(r.safety_warnings) ? h("ul", {}, r.safety_warnings.map((w) => h("li", {}, w)))
          : h("p", {}, "لا ترمِه مع النفايات المنزلية، وسلّمه لجهة مختصة أو نقطة جمع معتمدة."))));
  }

  // ---- detail cards
  const cards = [];
  cards.push(card("التصنيف البيئي", "shield", classificationGrid(r.classification), { span: true }));
  cards.push(card("نوع المادة", "flask", materialsList(r.materials)));

  const impact = h("div", {}, h("p", {}, r.environmental_impact));
  if (nonEmpty(r.pollution_risks)) impact.append(h("p", { class: "sub-h" }, "مخاطر التلوث المحتملة"), bullets(r.pollution_risks, "terra"));
  const d = r.decomposition || {};
  impact.append(h("div", { class: "decomp" }, icon("history"),
    h("div", {},
      h("strong", {}, "مدة التحلل: "),
      d.known && d.estimate ? d.estimate : "لا توجد تقديرات موثوقة محددة",
      d.note ? h("div", { class: "muted" }, d.note) : null)));
  cards.push(card("لماذا يؤثر على البيئة؟", "leaf", impact, { terra: true }));

  const rc = r.recycling || {};
  const recycleBody = h("div", {},
    h("span", { class: `recycle-status ${rc.status || "unknown"}` }, icon("recycle"), RECYCLE[rc.status] || RECYCLE.unknown),
    h("p", {}, rc.explanation || ""),
    nonEmpty(rc.preparation_steps) ? [h("p", { class: "sub-h" }, "جهّزه للتدوير"), bullets(rc.preparation_steps)] : null,
    rc.local_availability_jordan ? h("div", { class: "local-box" }, icon("pin"),
      h("div", {}, h("strong", {}, "في الأردن"), rc.local_availability_jordan)) : null);
  cards.push(card("هل يمكن إعادة تدويره؟", "recycle", recycleBody));

  if (nonEmpty(r.disposal_steps)) cards.push(card("كيف أتخلص منه بطريقة صحيحة؟", "trash", numbered(r.disposal_steps)));
  if (nonEmpty(r.reuse_ideas)) cards.push(card("أفكار لإعادة استخدامه", "refresh", bullets(r.reuse_ideas)));
  if (nonEmpty(r.alternatives)) {
    cards.push(card("بدائل صديقة للبيئة", "swap", h("div", { class: "alt-list" },
      r.alternatives.map((a) => h("div", { class: "alt" }, h("strong", {}, a.title), h("span", {}, a.why))))));
  }
  if (nonEmpty(r.reduce_tips)) cards.push(card("كيف أقلل استخدامه؟", "minus", bullets(r.reduce_tips)));
  if (nonEmpty(r.extra_tips)) cards.push(card("نصائح بيئية إضافية", "spark", bullets(r.extra_tips), { terra: true }));

  const nonSpan = cards.filter((c) => !c.classList.contains("span-2"));
  if (nonSpan.length % 2 === 1) nonSpan[nonSpan.length - 1].classList.add("span-2");
  blocks.push(h("div", { class: "report-grid" }, cards));

  blocks.push(h("div", { class: "report-actions" },
    h("p", {}, "لديك سؤال عن هذا العنصر؟"),
    h("button", { class: "btn btn-light", type: "button", onclick: handlers.onAsk }, icon("chat"), "اسأل نبتة"),
    h("button", { class: "btn btn-ghost", type: "button", onclick: handlers.onNew }, icon("refresh"), "حلّل صورة أخرى")));

  blocks.push(h("p", { class: "report-meta" },
    "معلومات من قاعدة المعرفة البيئية في «بيئتي»",
    entry.createdAt ? ` · ${formatTime(entry.createdAt)}` : "",
    " · للمواد الخطرة اتبع تعليمات الجهات الرسمية."));

  return h("article", { class: "report", "aria-label": `التقرير البيئي: ${r.item_name}` }, blocks);
}

/* ======================================================= knowledge.js */
// Offline environmental knowledge base: builds reports, searches items, answers questions.
// All data lives in assets/data/knowledge.json — edit that file to add or correct items.

let KB = null;

async function loadKnowledge() {
  if (KB) return KB;
  // The data is loaded by <script src="assets/data/knowledge.js">, which sets window.BEATI_KB.
  // A plain script (not fetch) lets the site work even when index.html is opened by double-click.
  if (!window.BEATI_KB) throw new Error("assets/data/knowledge.js is missing");
  KB = window.BEATI_KB;
  KB.byId = Object.fromEntries(KB.items.map((it) => [it.id, it]));
  // Pre-compute normalized search text for each item.
  for (const it of KB.items) {
    it._terms = [it.name, it.name_en, ...(it.keywords || [])].map(norm).filter(Boolean);
    it._labels = (it.labels || []).map((l) => l.toLowerCase());
  }
  for (const f of KB.faq) f._terms = f.keywords.map(norm);
  return KB;
}

const getItem = (id) => (KB ? KB.byId[id] : null);
const allItems = () => (KB ? KB.items : []);

/* ------------------------------------------------------------ text tools */
// Arabic-aware normalization: strips diacritics/tatweel and unifies common letter variants.
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Drop the Arabic definite article and common prefixes so «البطارية» matches «بطاريه».
const stem = (w) => w.replace(/^(وال|بال|كال|فال|لل|ال)/, "");
const words = (s) => norm(s).split(" ").filter((w) => w.length > 1).map(stem);

/* --------------------------------------------------------------- search */
function searchItems(query, limit = 6) {
  const q = norm(query);
  if (!q || !KB) return [];
  const qWords = words(q);
  const scored = KB.items.map((it) => {
    let score = 0;
    for (const t of it._terms) {
      if (!t) continue;
      if (q === t) score = Math.max(score, 10);
      else if (q.includes(t)) score = Math.max(score, 6 + Math.min(t.length, 12) / 4);
      else if (t.includes(q) && q.length >= 3) score = Math.max(score, 5);
      else {
        const tWords = t.split(" ").map(stem);
        const hits = qWords.filter((w) => w.length >= 3 && tWords.some((tw) => tw === w || (tw.length >= 4 && (tw.startsWith(w) || w.startsWith(tw))))).length;
        if (hits) score = Math.max(score, 1.5 * hits + (hits === tWords.length ? 1.5 : 0));
      }
    }
    return { item: it, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Map image-classifier predictions ({className, probability}) to knowledge items. */
function itemsFromPredictions(preds) {
  if (!KB) return [];
  const totals = new Map();
  for (const p of preds) {
    const names = p.className.toLowerCase().split(",").map((s) => s.trim());
    for (const it of KB.items) {
      if (it._labels.some((l) => names.some((n) => n === l || n.includes(l) || l.includes(n)))) {
        totals.set(it.id, (totals.get(it.id) || 0) + p.probability);
      }
    }
  }
  return [...totals.entries()]
    .map(([id, score]) => ({ item: KB.byId[id], score }))
    .sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------- report builder */
const clone = (x) => JSON.parse(JSON.stringify(x));

function buildReport(item, { confidence = "high", confidenceNote = "" } = {}) {
  const p = clone(KB.profiles[item.profile]);
  const recycling = p.recycling;
  if (item.recycling_status) recycling.status = item.recycling_status;
  const classification = { ...p.classification };
  if (item.recycling_status) classification.recyclable = item.recycling_status;
  return {
    item_id: item.id,
    is_analyzable: true,
    unclear_reason: "",
    item_name: item.name,
    item_name_en: item.name_en || "",
    summary: item.summary || "",
    confidence,
    confidence_note: confidenceNote,
    materials: clone(item.materials || []),
    classification,
    harm_level: p.harm_level,
    harm_score: p.harm_score,
    environmental_impact: p.environmental_impact,
    pollution_risks: p.pollution_risks || [],
    decomposition: p.decomposition,
    recycling,
    disposal_steps: p.disposal_steps || [],
    safety_warnings: p.safety_warnings || [],
    requires_special_handling: !!p.requires_special_handling,
    reuse_ideas: item.reuse_ideas || p.reuse_ideas || [],
    alternatives: item.alternatives || p.alternatives || [],
    reduce_tips: p.reduce_tips || [],
    extra_tips: [...(item.extra_tips || []), ...(p.extra_tips || [])].slice(0, 4),
  };
}

function unclearReport(reason) {
  return {
    is_analyzable: false,
    unclear_reason: reason,
    item_name: "عنصر غير محدد",
    item_name_en: "",
    summary: "",
    confidence: "low",
    confidence_note: "",
    materials: [],
    classification: { recyclable: "unknown", reusable: "unknown", biodegradable: "unknown", hazardous: "unknown", eco_friendly: "unknown" },
    harm_level: "unknown",
    harm_score: 0,
    environmental_impact: "",
    pollution_risks: [],
    decomposition: { known: false, estimate: "", note: "" },
    recycling: { status: "unknown", explanation: "", local_availability_jordan: "", preparation_steps: [] },
    disposal_steps: [],
    safety_warnings: [],
    requires_special_handling: false,
    reuse_ideas: [],
    alternatives: [],
    reduce_tips: [],
    extra_tips: ["اكتب اسم العنصر في خانة البحث لتحصل على تقريره مباشرة", "التقط الصورة في إضاءة جيدة واجعل العنصر يملأ معظم الإطار"],
  };
}

/* ------------------------------------------------------------ assistant */
const INTENTS = [
  { key: "where", words: ["اين", "وين", "اسلم", "تسليم", "اسلمه", "اوديه", "اودي", "جهه", "نقطه", "الاردن", "عمان", "اربد", "الزرقاء", "العقبه", "اشتري", "يشتري", "ابيع", "بيع"] },
  { key: "reuse", words: ["استخدام", "استخدمه", "استفيد", "افكار", "فكره", "اصنع", "اعمل منه", "اعيد"] },
  { key: "alternatives", words: ["بديل", "بدائل", "بدل", "افضل", "صديق للبيئه"] },
  { key: "danger", words: ["خطر", "خطير", "سام", "سمي", "صحه", "صحي", "امان", "امن", "اطفال", "تسمم"] },
  { key: "dispose", words: ["اتخلص", "تخلص", "ارمي", "ارميه", "رمي", "اكب", "زباله", "نفايات"] },
  { key: "recycle", words: ["تدوير", "يدور", "يتدور", "ادور", "ادوره", "recycle"] },
  { key: "decompose", words: ["تحلل", "يتحلل", "يحتاج وقت", "مده", "سنه", "سنين"] },
  { key: "reduce", words: ["اقلل", "تقليل", "اخفف", "استهلاك"] },
  { key: "impact", words: ["اثر", "تاثير", "يضر", "ضرر", "ليش", "لماذا", "مشكله", "يلوث", "تلوث"] },
];

const list = (arr) => arr.map((x) => `- ${x}`).join("\n");

function detectIntents(q) {
  const nq = ` ${norm(q)} `;
  return INTENTS.filter((i) => i.words.some((w) => nq.includes(norm(w)))).map((i) => i.key);
}

function itemAnswer(item, intents) {
  const r = buildReport(item);
  const parts = [];
  const want = (k) => intents.includes(k);
  const name = `**${r.item_name}**`;

  if (want("danger") || r.requires_special_handling) {
    if (r.safety_warnings.length) parts.push(`⚠️ تنبيهات السلامة لـ${name}:\n${list(r.safety_warnings)}`);
    else if (want("danger")) parts.push(`${name} لا يُعد مادة خطرة في الاستخدام العادي، لكن تخلّص منه بالطريقة الصحيحة ولا تحرقه.`);
  }
  if (want("where")) {
    parts.push(`**أين أسلّمه في الأردن؟**\n${r.recycling.local_availability_jordan}`);
    if (r.recycling.preparation_steps.length) parts.push(`قبل التسليم:\n${list(r.recycling.preparation_steps)}`);
  }
  if (want("recycle")) {
    const s = { yes: "نعم، قابل للتدوير.", no: "غالبًا غير قابل للتدوير عمليًا.", conditional: "قابل للتدوير بشروط.", unknown: "غير مؤكد." }[r.recycling.status];
    parts.push(`**هل يُدوَّر؟** ${s}\n${r.recycling.explanation}`);
  }
  if (want("dispose")) parts.push(`**طريقة التخلص الصحيحة:**\n${list(r.disposal_steps)}`);
  if (want("reuse")) {
    parts.push(r.reuse_ideas.length ? `**أفكار لإعادة الاستخدام:**\n${list(r.reuse_ideas)}` : `لا ننصح بإعادة استخدام ${name} لأسباب تتعلق بالسلامة. الأفضل تسليمه لجهة مختصة.`);
  }
  if (want("alternatives") && r.alternatives.length) {
    parts.push(`**بدائل أفضل للبيئة:**\n${list(r.alternatives.map((a) => `**${a.title}**: ${a.why}`))}`);
  }
  if (want("decompose")) {
    const d = r.decomposition;
    parts.push(`**مدة التحلل:** ${d.known && d.estimate ? d.estimate : "لا توجد تقديرات موثوقة محددة"}.\n${d.note}`);
  }
  if (want("reduce")) parts.push(`**كيف تقلل استخدامه:**\n${list(r.reduce_tips)}`);
  if (want("impact")) parts.push(`**أثره على البيئة:**\n${r.environmental_impact}`);

  if (!parts.length) {
    // No specific intent: give a compact overview.
    parts.push(`${name}: ${r.summary}`);
    parts.push(`**التدوير:** ${r.recycling.explanation}`);
    parts.push(`**التخلص الصحيح:**\n${list(r.disposal_steps.slice(0, 4))}`);
    parts.push("يمكنك أن تسألني أيضًا عن: أين أسلّمه، أفكار لإعادة استخدامه، البدائل، أو مدة تحلله.");
  }
  return parts.join("\n\n");
}

/**
 * Answer a question from the knowledge base.
 * @param {string} question
 * @param {object|null} context  the current report (may carry item_id)
 */
function answer(question, context = null) {
  const intents = detectIntents(question);
  const found = searchItems(question, 1)[0];
  const contextItem = context?.item_id ? getItem(context.item_id) : null;

  // A specific item named in the question wins; otherwise use the analysed item.
  const item = found && found.score >= 3 ? found.item : contextItem;
  const faq = bestFaq(question);

  if (item && (intents.length || (found && found.score >= 3))) return itemAnswer(item, intents);
  if (faq) return faq.answer;
  if (item) return itemAnswer(item, intents);

  return "لم أجد إجابة دقيقة لهذا السؤال في قاعدة المعرفة لديّ.\n\nجرّب أن تكتب **اسم العنصر** (مثل: بطارية، كرتون، علبة عصير، زيت قلي)، أو اسألني عن:\n- فرز النفايات في المنزل\n- معنى أرقام التدوير على البلاستيك\n- عمل السماد المنزلي\n- أين أسلّم المواد في الأردن\n- توفير المياه والطاقة";
}

function bestFaq(question) {
  const nq = ` ${norm(question)} `;
  const qWords = words(question);
  let best = null;
  let bestScore = 0;
  for (const f of KB.faq) {
    let s = 0;
    for (const t of f._terms) {
      if (nq.includes(` ${t} `) || nq.includes(t)) s += 2;
      else if (qWords.some((w) => w.length >= 3 && stem(t).startsWith(w))) s += 1;
    }
    if (s > bestScore) { bestScore = s; best = f; }
  }
  return bestScore >= 2 ? best : null;
}

/* ======================================================= vision.js */
// Free, on-device image recognition with TensorFlow.js + MobileNet.
// The model is downloaded once from a public CDN and runs inside the browser:
// no API key, no server, and the photo never leaves the device.

const TFJS = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const MOBILENET = "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js";

let modelPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.append(s);
  });
}

/** Start downloading the model in the background (safe to call many times). */
function preloadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(TFJS);
      await loadScript(MOBILENET);
      return window.mobilenet.load({ version: 2, alpha: 1.0 });
    })().catch((err) => {
      modelPromise = null; // allow retry next time
      throw err;
    });
  }
  return modelPromise;
}

async function toCanvas(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const size = 320;
    const scale = size / Math.max(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** @returns {Promise<Array<{className: string, probability: number}>>} */
async function classify(blob, topK = 8) {
  const model = await preloadModel();
  const canvas = await toCanvas(blob);
  return model.classify(canvas, topK);
}

/* ======================================================= api.js */
// Be'ati free edition: no paid AI and no server.
// - Image recognition: MobileNet running in the browser (vision.js)
// - Environmental facts: the local knowledge base (assets/data/knowledge.json)

class ApiError extends Error {
  constructor(message, code = "unknown", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Date.now().toString(36));
const toCandidates = (list, skipId) => list.filter((c) => c.item.id !== skipId).slice(0, 5).map((c) => ({ id: c.item.id, name: c.item.name }));

const api = {
  async health() {
    await loadKnowledge();
    return { status: "ok", ai_configured: true, demo: false, max_upload_mb: 15 };
  },

  /** Build the report for an item chosen by the user from search or suggestions. */
  async reportFor(itemId) {
    const kb = await loadKnowledge();
    const item = kb.byId[itemId];
    if (!item) throw new ApiError("لم يتم العثور على هذا العنصر.", "not_found", 404);
    return { id: newId(), report: buildReport(item, { confidence: "high" }), model: "knowledge", demo: false, candidates: [] };
  },

  async analyze(blob, note = "") {
    await loadKnowledge();

    // 1) What the user typed is the most reliable signal.
    const byName = note ? searchItems(note, 5) : [];

    // 2) On-device image recognition.
    let byImage = [];
    let visionFailed = false;
    try {
      byImage = itemsFromPredictions(await classify(blob));
    } catch (err) {
      console.warn("vision failed", err);
      visionFailed = true;
    }

    const id = newId();
    if (byName.length && byName[0].score >= 3) {
      const item = byName[0].item;
      const others = [...byImage, ...byName.slice(1)];
      return { id, report: buildReport(item, { confidence: "high" }), model: "knowledge", demo: false, candidates: toCandidates(others, item.id) };
    }

    const top = byImage[0];
    if (top && top.score >= 0.12) {
      const confidence = top.score >= 0.5 ? "high" : top.score >= 0.25 ? "medium" : "low";
      const confidenceNote = confidence === "high" ? "" :
        "التعرّف على الصورة تقريبي. إن لم يكن هذا هو العنصر، اختر الصحيح من الاقتراحات أو ابحث باسمه.";
      return {
        id,
        report: buildReport(top.item, { confidence, confidenceNote }),
        model: "mobilenet",
        demo: false,
        candidates: toCandidates([...byImage, ...byName], top.item.id),
      };
    }

    const reason = visionFailed
      ? "تعذّر تحميل نموذج التعرّف على الصور (تحقق من اتصال الإنترنت). يمكنك كتابة اسم العنصر في خانة البحث."
      : "لم أتمكن من التعرّف على العنصر من الصورة بثقة كافية. اختر من الاقتراحات أو اكتب اسمه في خانة البحث.";
    return { id, report: unclearReport(reason), model: "mobilenet", demo: false, candidates: toCandidates([...byImage, ...byName]) };
  },

  async chat(messages, context = null) {
    await loadKnowledge();
    const last = [...messages].reverse().find((m) => m.role === "user");
    await new Promise((r) => setTimeout(r, 350)); // small pause so the reply feels natural
    return { reply: answer(last?.content || "", context), demo: false };
  },
};

/* ======================================================= chat.js */
// Follow-up assistant chat (context-aware of the latest / selected analysis).

const GENERAL_SUGGESTIONS = [
  "كيف أبدأ بفرز النفايات في المنزل؟",
  "ما الفرق بين البلاستيك القابل للتدوير وغير القابل؟",
  "كيف أتخلص من البطاريات القديمة بأمان؟",
  "ما البدائل الصديقة للبيئة للأكياس البلاستيكية؟",
];

const contextSuggestions = (name) => [
  `أين يمكنني تسليم ${name} في الأردن؟`,
  `ما أفضل طريقة لإعادة استخدام ${name}؟`,
  "ما البدائل الأفضل للبيئة؟",
  "هل هناك خطر صحي عند التعامل معه؟",
];

let state = getChat(); // { messages: [{role, content}], contextId }
let busy = false;
let els = {};

const avatar = () => h("div", { class: "msg-avatar", html: mascotSVG({ mini: true }) });

function bubble(msg) {
  const b = h("div", { class: "bubble" });
  if (msg.role === "assistant") b.innerHTML = miniMarkdown(msg.content); // escaped inside miniMarkdown
  else b.textContent = msg.content;
  return h("div", { class: `msg ${msg.role}` }, msg.role === "assistant" ? avatar() : null, b);
}

function welcome() {
  const entry = state.contextId ? getEntry(state.contextId) : null;
  const text = entry
    ? `حلّلتُ **${entry.report.item_name}** للتو. اسألني أي شيء عنه: كيف تعيد استخدامه، أين تسلّمه، أو ما البدائل الأفضل.`
    : "أهلًا! أنا **نبتة**، مساعدك البيئي. اسألني عن تدوير أي مادة، أو البدائل الصديقة للبيئة، أو كيف تقلل نفاياتك اليومية.";
  return bubble({ role: "assistant", content: text });
}

function renderContext() {
  const entry = state.contextId ? getEntry(state.contextId) : null;
  els.context.replaceChildren();
  if (entry) {
    els.context.hidden = false;
    els.context.append(
      entry.thumb ? h("img", { src: entry.thumb, alt: "" }) : null,
      h("span", {}, "نتحدث عن: ", h("strong", {}, entry.report.item_name)),
      h("button", { type: "button", onclick: () => setContext(null) }, "إزالة السياق"),
    );
    els.label.textContent = "المحادثة مرتبطة بآخر تحليل لك.";
  } else {
    els.context.hidden = true;
    els.label.textContent = "اسأل عن التدوير، البدائل، أو أثر أي مادة.";
  }
  const sug = entry ? contextSuggestions(entry.report.item_name) : GENERAL_SUGGESTIONS;
  els.suggest.replaceChildren(...sug.map((s) => h("button", { class: "suggest", type: "button", onclick: () => send(s) }, s)));
  els.suggest.hidden = state.messages.length > 2;
}

function renderLog() {
  els.log.replaceChildren(welcome(), ...state.messages.map(bubble));
  els.log.scrollTop = els.log.scrollHeight;
}

function setContext(entryId, { resetConversation = false } = {}) {
  if (resetConversation || entryId !== state.contextId) state.messages = [];
  state.contextId = entryId;
  saveChat(state);
  if (els.log) { renderContext(); renderLog(); }
}

async function send(text) {
  const content = (text ?? els.input.value).trim();
  if (!content || busy) return;
  busy = true;
  els.send.disabled = true;
  els.input.value = "";
  autoGrow();

  state.messages.push({ role: "user", content });
  els.log.append(bubble({ role: "user", content }));
  els.suggest.hidden = true;
  const typing = h("div", { class: "msg assistant" }, avatar(),
    h("div", { class: "bubble", "aria-label": "نبتة يكتب" }, h("span", { class: "typing" }, h("span"), h("span"), h("span"))));
  els.log.append(typing);
  els.log.scrollTop = els.log.scrollHeight;

  try {
    const entry = state.contextId ? getEntry(state.contextId) : null;
    const { reply } = await api.chat(state.messages.slice(-16), entry?.report || null);
    state.messages.push({ role: "assistant", content: reply });
    typing.replaceWith(bubble({ role: "assistant", content: reply }));
  } catch (err) {
    state.messages.pop(); // let the user retry the same question
    typing.remove();
    els.input.value = content;
    toast(err.message || "تعذّر إرسال الرسالة.", "error");
  } finally {
    saveChat(state);
    busy = false;
    els.send.disabled = false;
    els.log.scrollTop = els.log.scrollHeight;
    els.input.focus();
  }
}

function autoGrow() {
  els.input.style.height = "auto";
  const full = els.input.scrollHeight;
  els.input.style.height = Math.min(full, 160) + "px";
  els.input.style.overflowY = full > 160 ? "auto" : "hidden";
}

function initChat() {
  els = {
    log: $("#chat-log"), form: $("#chat-form"), input: $("#chat-input"), send: $("#chat-send"),
    suggest: $("#chat-suggest"), context: $("#chat-context"), label: $("#chat-context-label"),
  };
  els.form.addEventListener("submit", (e) => { e.preventDefault(); send(); });
  els.input.addEventListener("input", autoGrow);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  $("#chat-clear").addEventListener("click", () => setContext(state.contextId, { resetConversation: true }));
  renderContext();
  renderLog();
}

function focusChat() {
  renderContext();
  els.log.scrollTop = els.log.scrollHeight;
  if (window.matchMedia("(pointer: fine)").matches) els.input.focus();
}

/* ======================================================= app.js */
// بيئتي — application bootstrap: routing, analysis flow, camera, history.

const config = { maxUploadMb: 8, demo: false };

/* ============================================================== ROUTER */
const VIEWS = ["home", "analyze", "assistant", "history"];

function route() {
  const raw = location.hash.replace(/^#/, "");
  let [view, param] = raw.split("/");
  if (!VIEWS.includes(view) && view !== "report") view = "home";

  const target = view === "report" ? "analyze" : view;
  $$(".view").forEach((v) => { v.hidden = v.dataset.view !== target; });
  $$("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === target;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  closeNav();
  window.scrollTo(0, 0);

  if (view === "report" && param) showSavedReport(param);
  if (target === "assistant") focusChat();
  if (target === "analyze") preloadModel().catch(() => {}); // download the image model early
  if (target === "home") mascot("hero", "wave", 1600);

  const titles = { home: "بيئتي — افهم أثرك البيئي", analyze: "تحليل صورة · بيئتي", assistant: "المساعد البيئي · بيئتي", history: "السجل · بيئتي" };
  document.title = titles[target];
}

/* ============================================================== HEADER */
const navToggle = $("#nav-toggle");
const nav = $("#main-nav");
function closeNav() { nav.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); }
navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
window.addEventListener("scroll", () => $("#site-header").classList.toggle("scrolled", window.scrollY > 8), { passive: true });
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-scroll]");
  if (!a) return;
  e.preventDefault();
  document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
});

/* ============================================================ ANALYZE */
const el = {
  dropzone: $("#dropzone"), empty: $("#dz-empty"), preview: $("#dz-preview"), img: $("#preview-img"),
  remove: $("#preview-remove"), fileInput: $("#file-input"), cameraInput: $("#camera-input"),
  pick: $("#pick-btn"), camera: $("#camera-btn"), note: $("#note-input"), analyze: $("#analyze-btn"),
  say: $("#assistant-say"), placeholder: $("#result-placeholder"), analyzing: $("#analyzing"),
  progress: $("#progress-steps"), error: $("#error-state"), errorMsg: $("#error-message"),
  retry: $("#retry-btn"), reportRoot: $("#report-root"),
};

let current = null; // { blob, previewUrl, thumb }
let analyzing = false;
let progressTimer = null;

const SAY = {
  empty: "أرني ما لديك، وسأخبرك كيف تتعامل معه بطريقة صديقة للبيئة.",
  ready: "صورة رائعة! اضغط «حلّل الصورة» وسأبدأ فورًا.",
  analyzing: "أفحص المواد وأقيّم الأثر البيئي… لحظات من فضلك.",
  done: "جاهز! هذا تقريرك البيئي. يمكنك سؤالي عن أي تفصيل.",
  unclear: "لم أتمكن من رؤية العنصر بوضوح. جرّب صورة أقرب وإضاءة أفضل.",
  error: "حدثت مشكلة صغيرة. لنحاول مرة أخرى.",
};
const say = (k) => { el.say.textContent = SAY[k]; };

function showPanel(name) {
  el.placeholder.hidden = name !== "placeholder";
  el.analyzing.hidden = name !== "analyzing";
  el.error.hidden = name !== "error";
  el.reportRoot.hidden = name !== "report";
}

async function handleFile(file) {
  if (!file || analyzing) return;
  try {
    const prepared = await prepareImage(file, { maxBytes: config.maxUploadMb * 1024 * 1024 });
    if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
    current = prepared;
    el.img.src = prepared.previewUrl;
    el.preview.hidden = false;
    el.empty.hidden = true;
    el.dropzone.classList.add("has-image");
    el.analyze.disabled = false;
    showPanel("placeholder");
    say("ready");
    mascot("analyze", "excited", 1200);
  } catch (err) {
    toast(err instanceof ImageError ? err.message : "تعذّر قراءة الصورة.", "error");
    mascot("analyze", "confused", 2200);
  }
}

function resetUpload() {
  if (analyzing) return;
  if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
  current = null;
  el.img.removeAttribute("src");
  el.preview.hidden = true;
  el.empty.hidden = false;
  el.dropzone.classList.remove("has-image", "scanning");
  el.analyze.disabled = true;
  el.note.value = "";
  el.fileInput.value = "";
  el.cameraInput.value = "";
  showPanel("placeholder");
  el.reportRoot.replaceChildren();
  say("empty");
  mascot("analyze", "idle");
}

function startProgress() {
  const items = $$("li", el.progress);
  items.forEach((li) => li.classList.remove("active", "done"));
  let i = 0;
  items[0].classList.add("active");
  progressTimer = setInterval(() => {
    if (i >= items.length - 1) return;
    items[i].classList.replace("active", "done");
    i += 1;
    items[i].classList.add("active");
  }, 2600);
}
function stopProgress() {
  clearInterval(progressTimer);
  $$("li", el.progress).forEach((li) => { li.classList.remove("active"); li.classList.add("done"); });
}

async function runAnalysis() {
  if (!current || analyzing) return;
  analyzing = true;
  el.analyze.disabled = true;
  el.remove.disabled = true;
  el.dropzone.classList.add("scanning");
  showPanel("analyzing");
  say("analyzing");
  mascot("analyze", "thinking");
  startProgress();
  if (window.innerWidth < 1025) el.analyzing.scrollIntoView({ behavior: "smooth", block: "center" });

  try {
    const res = await api.analyze(current.blob, el.note.value.trim());
    stopProgress();
    const entry = {
      id: res.id,
      createdAt: Date.now(),
      thumb: current.thumb,
      report: res.report,
      demo: !!res.demo,
      model: res.model,
      candidates: res.candidates || [],
    };
    addHistory(entry);
    setContext(entry.id);
    showReport(entry);
    const ok = res.report.is_analyzable;
    say(ok ? "done" : "unclear");
    mascot("analyze", ok ? "happy" : "confused", ok ? 3200 : 3000);
  } catch (err) {
    stopProgress();
    el.errorMsg.textContent = err.message || "حدث خطأ غير متوقع.";
    showPanel("error");
    say("error");
    mascot("analyze", "confused", 3000);
  } finally {
    analyzing = false;
    el.analyze.disabled = !current;
    el.remove.disabled = false;
    el.dropzone.classList.remove("scanning");
  }
}

function showReport(entry) {
  const node = renderReport(entry, {
    onAsk: () => { setContext(entry.id); location.hash = "#assistant"; },
    onNew: () => { resetUpload(); window.scrollTo({ top: 0, behavior: "smooth" }); el.dropzone.focus(); },
  });
  const showPicker = entry.candidates?.length || !entry.report.is_analyzable;
  el.reportRoot.replaceChildren(...(showPicker ? [pickerNode(entry)] : []), node);
  showPanel("report");
  if (window.innerWidth < 1025) requestAnimationFrame(() => el.reportRoot.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function showSavedReport(id) {
  const entry = getEntry(id);
  if (!entry) { toast("لم يعد هذا التحليل متاحًا في الجلسة الحالية."); location.hash = "#history"; return; }
  resetUpload();
  showReport(entry);
  setContext(entry.id);
  say("done");
}

// Upload interactions
el.dropzone.addEventListener("click", (e) => {
  if (e.target.closest("#preview-remove") || current) return;
  el.fileInput.click();
});
el.dropzone.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !current) { e.preventDefault(); el.fileInput.click(); }
});
["dragenter", "dragover"].forEach((t) => el.dropzone.addEventListener(t, (e) => {
  e.preventDefault();
  if (!analyzing) el.dropzone.classList.add("drag");
}));
["dragleave", "dragend", "drop"].forEach((t) => el.dropzone.addEventListener(t, () => el.dropzone.classList.remove("drag")));
el.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith("image/")) || e.dataTransfer?.files?.[0];
  handleFile(file);
});
window.addEventListener("paste", (e) => {
  if ($('[data-view="analyze"]').hidden) return;
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
  if (file) { e.preventDefault(); handleFile(file); }
});
el.fileInput.addEventListener("change", () => handleFile(el.fileInput.files[0]));
el.cameraInput.addEventListener("change", () => handleFile(el.cameraInput.files[0]));
el.pick.addEventListener("click", () => el.fileInput.click());
el.remove.addEventListener("click", (e) => { e.stopPropagation(); resetUpload(); });
el.analyze.addEventListener("click", runAnalysis);
el.retry.addEventListener("click", () => (current ? runAnalysis() : resetUpload()));

/* ============================================================= CAMERA */
const cam = { modal: $("#camera-modal"), video: $("#cam-video"), stream: null, facing: "environment" };
const isTouch = window.matchMedia("(pointer: coarse)").matches;

async function openCamera() {
  // On phones the native camera via <input capture> is the best experience.
  if (isTouch || !navigator.mediaDevices?.getUserMedia || !cam.modal.showModal) {
    el.cameraInput.click();
    return;
  }
  try {
    await startStream();
    cam.modal.showModal();
  } catch {
    toast("تعذّر الوصول إلى الكاميرا. يمكنك اختيار صورة من جهازك بدلًا من ذلك.", "error");
  }
}
async function startStream() {
  stopStream();
  cam.stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: cam.facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false,
  });
  cam.video.srcObject = cam.stream;
  await cam.video.play();
}
function stopStream() {
  cam.stream?.getTracks().forEach((t) => t.stop());
  cam.stream = null;
}
function closeCamera() { stopStream(); if (cam.modal.open) cam.modal.close(); }

el.camera.addEventListener("click", openCamera);
$("#cam-close").addEventListener("click", closeCamera);
cam.modal.addEventListener("close", stopStream);
$("#cam-switch").addEventListener("click", async () => {
  cam.facing = cam.facing === "environment" ? "user" : "environment";
  try { await startStream(); } catch { toast("لا توجد كاميرا أخرى متاحة."); }
});
$("#cam-shoot").addEventListener("click", () => {
  const v = cam.video;
  if (!v.videoWidth) return;
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  c.toBlob((blob) => {
    closeCamera();
    if (blob) handleFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
  }, "image/jpeg", 0.92);
});

/* ============================================================ HISTORY */
function renderHistory(items = getHistory()) {
  const grid = $("#history-grid");
  const count = $("#history-count");
  count.hidden = items.length === 0;
  count.textContent = String(items.length);
  $("#history-empty").hidden = items.length > 0;
  $("#history-clear").hidden = items.length === 0;
  grid.replaceChildren(...items.map((e) => {
    const r = e.report;
    const level = r.is_analyzable ? r.harm_level : "unknown";
    return h("button", { class: "h-card", type: "button", onclick: () => { location.hash = `#report/${e.id}`; } },
      e.thumb ? h("img", { src: e.thumb, alt: "", loading: "lazy" }) : null,
      h("div", { class: "h-body" },
        h("h3", {}, r.is_analyzable ? r.item_name : "صورة غير واضحة"),
        h("div", { class: "h-meta" },
          h("span", { class: `harm-pill ${level}` }, `أثر ${HARM[level]}`),
          h("span", {}, formatTime(e.createdAt)))));
  }));
}
$("#history-clear").addEventListener("click", () => {
  if (confirm("هل تريد مسح سجل التحليلات لهذه الجلسة؟")) { clearHistory(); setContext(null, { resetConversation: true }); }
});
onHistoryChange(renderHistory);

/* ===================================================== SEARCH & PICKER */
// Lets the user confirm or correct what the image model guessed, or skip the photo entirely.
async function pickItem(itemId, thumb = null) {
  try {
    const res = await api.reportFor(itemId);
    const entry = { id: res.id, createdAt: Date.now(), thumb, report: res.report, demo: false, model: res.model, candidates: [] };
    addHistory(entry);
    setContext(entry.id);
    showReport(entry);
    say("done");
    mascot("analyze", "happy", 3200);
  } catch (err) {
    toast(err.message || "تعذّر عرض هذا العنصر.", "error");
  }
}

function pickerNode(entry) {
  const unclear = !entry.report.is_analyzable;
  return h("section", { class: "card picker" },
    h("div", { class: "picker-head" }, icon("question"),
      h("strong", {}, unclear ? "هل هو أحد هذه العناصر؟" : "ليس هذا العنصر؟")),
    entry.candidates?.length
      ? h("div", { class: "picker-chips" }, entry.candidates.map((c) =>
        h("button", { class: "suggest", type: "button", onclick: () => pickItem(c.id, entry.thumb) }, c.name)))
      : null,
    h("p", { class: "muted" }, "أو اكتب اسم العنصر في خانة «ابحث مباشرة بدون صورة»."));
}

const search = { input: $("#search-input"), results: $("#search-results") };
let searchTimer = 0;
function renderSearch() {
  const q = search.input.value.trim();
  if (!q) { search.results.replaceChildren(); return; }
  const found = searchItems(q, 6);
  search.results.replaceChildren(...(found.length
    ? found.map(({ item }) => h("button", {
      class: "search-hit", type: "button", role: "option",
      onclick: () => { pickItem(item.id, current?.thumb || null); search.input.value = ""; search.results.replaceChildren(); },
    }, h("strong", {}, item.name), h("small", {}, item.name_en)))
    : [h("p", { class: "muted" }, "لا توجد نتائج. جرّب كلمة أخرى مثل «بلاستيك» أو «ورق».")]));
}
search.input.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderSearch, 120); });
search.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); search.results.querySelector(".search-hit")?.click(); }
});

/* =============================================================== BOOT */
async function boot() {
  $("#year").textContent = new Intl.NumberFormat("ar-JO", { useGrouping: false }).format(new Date().getFullYear());
  mountMascots();
  initChat();
  renderHistory();
  window.addEventListener("hashchange", route);
  route();

  try {
    const info = await api.health();
    config.maxUploadMb = info.max_upload_mb || config.maxUploadMb;
    config.demo = !!info.demo;
    $("#max-mb").textContent = new Intl.NumberFormat("ar-JO").format(config.maxUploadMb);
  } catch {
    toast("تعذّر تحميل قاعدة المعرفة. تأكد من رفع مجلد assets/data كاملًا.", "error", 7000);
  }
}

boot();
})();
