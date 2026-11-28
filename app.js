const R = window.IPL_ROSTER, F = window.IPL_FORM || {}, META = window.IPL_FORM_META || {}, L = window.IPL_LAST || {season: "", stats: {}, matches: {}};
const ink = hex => { const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
  return (0.2126*r + 0.7152*g + 0.0722*b) > 0.6 ? "#1a2233" : "#fff"; };
let team = "HOME", fmt = "ALL", sortBy = "bat", groupBy = "none";
const RORD = ["BAT", "WK", "AR", "BOWL"], RGRP = {BAT: "Batters", WK: "Wicket-keepers", AR: "All-rounders", BOWL: "Bowlers", "": "Role not set"};
const rord = p => { const i = RORD.indexOf(p.role); return i < 0 ? 4 : i; };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const IMG_EXT = "png";  // logos: assets/logos/<TEAM>.png ; photos: assets/players/<player-name>.jpg
const PH_EXT = ["jpg", "jpeg", "png", "webp"];
window.phNext = el => { const i = +el.dataset.i + 1; if (i < PH_EXT.length) { el.dataset.i = i; el.src = el.dataset.b + "." + PH_EXT[i]; } else el.remove(); };
const photo = () => "";   // player photos switched off: every avatar shows initials. Restore by returning the <img> again.
const img = (src, cls) => `<img class="${cls}" src="${src}" alt="" loading="lazy" onerror="this.remove()">`;
// landmark line-art, drawn in currentColor; viewBox 120x80
const S = (b) => `<svg viewBox="0 0 120 80" fill="currentColor" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${b}<path d="M6 72H114" fill="none" stroke-width="2"/></svg>`;
const LM = {
// Chennai: gopuram of a Dravidian temple
CSK: S(`<path d="M30 70V58H90V70ZM36 58V48H84V58ZM42 48V39H78V48ZM48 39V31H72V39ZM53 31V24H67V31Z" stroke="none"/><path d="M60 24V15" fill="none" stroke-width="2"/><circle cx="60" cy="13" r="2.5" stroke="none"/><path d="M52 70V63a8 8 0 0 1 16 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M36 53H84M42 43.5H78M48 35H72" fill="none" stroke="var(--bg,#0b1220)" stroke-width="1.5"/>`),
// Delhi: India Gate
DC: S(`<path d="M32 70V22H88V70Z" stroke="none"/><path d="M26 22H94V14H26Z" stroke="none"/><path d="M42 70V44a18 18 0 0 1 36 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M36 30H84" fill="none" stroke="var(--bg,#0b1220)" stroke-width="1.5"/><path d="M50 14V9H70V14Z" stroke="none"/><path d="M20 70V64H100V70Z" stroke="none"/>`),
// Gujarat: shikhara of a stone temple (Somnath style)
GT: S(`<path d="M34 70V54H86V70Z" stroke="none"/><path d="M40 54V42H80V54Z" stroke="none"/><path d="M46 42L52 20H68L74 42Z" stroke="none"/><path d="M52 20L56 10H64L68 20Z" stroke="none"/><path d="M60 10V3" fill="none" stroke-width="2"/><path d="M60 3L72 7L60 11Z" stroke="none"/><path d="M52 70V62a8 8 0 0 1 16 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M40 48H80M50 34H70" fill="none" stroke="var(--bg,#0b1220)" stroke-width="1.5"/>`),
// Kolkata: Howrah Bridge
KKR: S(`<path d="M4 62H116V67H4Z" stroke="none"/><path d="M26 62L32 14L38 62M82 62L88 14L94 62" fill="none" stroke-width="3"/><path d="M32 14C45 34 75 34 88 14" fill="none" stroke-width="3"/><path d="M32 14L10 62M88 14L110 62" fill="none" stroke-width="2.5"/><path d="M45 30V62M60 33V62M75 30V62M20 40V62M100 40V62" fill="none" stroke-width="1.5"/><path d="M26 62L38 44M38 62L26 44M82 62L94 44M94 62L82 44" fill="none" stroke-width="1.2"/>`),
// Lucknow: Rumi Darwaza
LSG: S(`<path d="M22 70V34H98V70Z" stroke="none"/><path d="M40 70V46a20 20 0 0 1 40 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M48 34V24H72V34Z" stroke="none"/><path d="M52 24V18a8 8 0 0 1 16 0V24Z" stroke="none"/><path d="M26 34V28a4 4 0 0 1 8 0V34ZM86 34V28a4 4 0 0 1 8 0V34Z" stroke="none"/><circle cx="30" cy="25" r="3" stroke="none"/><circle cx="90" cy="25" r="3" stroke="none"/><circle cx="60" cy="14" r="3" stroke="none"/><path d="M26 44H36M84 44H94M26 54H36M84 54H94" fill="none" stroke="var(--bg,#0b1220)" stroke-width="1.5"/>`),
// Mumbai: Gateway of India
MI: S(`<path d="M20 70V34H100V70Z" stroke="none"/><path d="M44 70V48a16 16 0 0 1 32 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M52 34V24H68V34Z" stroke="none"/><path d="M52 24a8 8 0 0 1 16 0Z" stroke="none"/><path d="M20 34V26H32V34ZM88 34V26H100V34Z" stroke="none"/><path d="M20 26a6 6 0 0 1 12 0ZM88 26a6 6 0 0 1 12 0Z" stroke="none"/><path d="M24 70V54a4 4 0 0 1 8 0V70ZM88 70V54a4 4 0 0 1 8 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M60 16V12" fill="none" stroke-width="2"/>`),
// Punjab: Golden Temple
PBKS: S(`<path d="M44 46a16 22 0 0 1 32 0Z" stroke="none"/><path d="M60 24V12" fill="none" stroke-width="2"/><path d="M57 12L60 6L63 12Z" stroke="none"/><path d="M38 52V44H82V52Z" stroke="none"/><path d="M32 52a5 7 0 0 1 10 0ZM78 52a5 7 0 0 1 10 0Z" stroke="none"/><path d="M34 60V52H86V60Z" stroke="none"/><path d="M56 60V54a4 4 0 0 1 8 0V60Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M14 66H106M24 70H96" fill="none" stroke-width="1.5"/>`),
// Bengaluru: Vidhana Soudha
RCB: S(`<path d="M10 70V46H110V70Z" stroke="none"/><path d="M42 46V32H78V46Z" stroke="none"/><path d="M38 32L60 22L82 32Z" stroke="none"/><path d="M48 22V16H72V22Z" stroke="none"/><path d="M52 16a8 8 0 0 1 16 0Z" stroke="none"/><path d="M60 8V3" fill="none" stroke-width="2"/><path d="M16 46V40H30V46ZM90 46V40H104V46Z" stroke="none"/><path d="M20 70V56M32 70V56M44 70V56M56 70V56M64 70V56M76 70V56M88 70V56M100 70V56" fill="none" stroke="var(--bg,#0b1220)" stroke-width="3"/>`),
// Rajasthan: Hawa Mahal
RR: S(`<path d="M16 70V56H104V70Z" stroke="none"/><path d="M26 56V44H94V56Z" stroke="none"/><path d="M34 44V32H86V44Z" stroke="none"/><path d="M42 32V20H78V32Z" stroke="none"/><path d="M50 20V10H70V20Z" stroke="none"/><path d="M50 10a10 6 0 0 1 20 0Z" stroke="none"/><g fill="var(--bg,#0b1220)" stroke="none"><circle cx="26" cy="63" r="3"/><circle cx="40" cy="63" r="3"/><circle cx="54" cy="63" r="3"/><circle cx="66" cy="63" r="3"/><circle cx="80" cy="63" r="3"/><circle cx="94" cy="63" r="3"/><circle cx="36" cy="50" r="2.5"/><circle cx="50" cy="50" r="2.5"/><circle cx="60" cy="50" r="2.5"/><circle cx="70" cy="50" r="2.5"/><circle cx="84" cy="50" r="2.5"/><circle cx="46" cy="38" r="2.5"/><circle cx="60" cy="38" r="2.5"/><circle cx="74" cy="38" r="2.5"/><circle cx="54" cy="26" r="2.5"/><circle cx="66" cy="26" r="2.5"/></g>`),
// Hyderabad: Charminar
SRH: S(`<path d="M36 70V34H84V70Z" stroke="none"/><path d="M46 70V50a14 14 0 0 1 28 0V70Z" fill="var(--bg,#0b1220)" stroke="none"/><path d="M26 70V20H36V70ZM84 70V20H94V70Z" stroke="none"/><path d="M24 20a7 7 0 0 1 14 0ZM82 20a7 7 0 0 1 14 0Z" stroke="none"/><circle cx="31" cy="9" r="3" stroke="none"/><circle cx="89" cy="9" r="3" stroke="none"/><path d="M44 34V24H52V34ZM68 34V24H76V34Z" stroke="none"/><path d="M44 24a4 4 0 0 1 8 0ZM68 24a4 4 0 0 1 8 0Z" stroke="none"/><path d="M36 40H84" fill="none" stroke="var(--bg,#0b1220)" stroke-width="1.5"/>`)
};
const ICON = {
  BAT: '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(45 12 12)"><rect x="10.5" y="0.8" width="3" height="5.5" rx="1.2"/><rect x="8" y="6.5" width="8" height="16" rx="3"/></g></svg>',
  BOWL: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.2 5.2c3.4 3.6 3.4 10 0 13.6M17.8 5.2c-3.4 3.6-3.4 10 0 13.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  WK: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 22v-6.5L4.6 10.2a1.3 1.3 0 0 1 2.3-1.1L8.4 12V4.6a1.3 1.3 0 0 1 2.6 0V10h.5V3.2a1.3 1.3 0 0 1 2.6 0V10h.5V4.4a1.3 1.3 0 0 1 2.6 0V11h.4V7.6a1.3 1.3 0 0 1 2.6 0V16c0 3.4-2.2 6-5.4 6z"/></svg>'};
const ROLE = {BAT: ["Batter", ["BAT"]], BOWL: ["Bowler", ["BOWL"]], AR: ["All-rounder", ["BAT", "BOWL"]], WK: ["Wicket-keeper", ["WK"]]};
const CNAME = {in:"India",au:"Australia",za:"South Africa",nz:"New Zealand","gb-eng":"England",af:"Afghanistan",lk:"Sri Lanka",tt:"Trinidad & Tobago",gy:"Guyana",jm:"Jamaica",bb:"Barbados",bd:"Bangladesh",zw:"Zimbabwe"};
const flag = c => c ? `<img class="flag" src="assets/flags/${c}.svg" alt="${CNAME[c] || c}" title="${CNAME[c] || c}" onerror="this.remove()">` : "";
const capBadge = p => p.captain ? '<span class="cap" title="Captain">C</span>' : "";
const roleBadge = r => ROLE[r] ? `<span class="role" title="${ROLE[r][0]}">${ROLE[r][1].map(k => ICON[k]).join("")}</span>` : "";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const latestMatch = () => { let d = ""; Object.values(F).forEach(p => ["bat", "bowl"].forEach(k => (p[k] || []).forEach(i => { if (i.date && i.date > d) d = i.date; }))); return d.slice(0, 10); };
const list = (name, kind) => ((F[name] || {})[kind] || []).filter(i => !i.dnb && (fmt === "ALL" || i.format === fmt));
const avg = a => a.length ? a.reduce((s, i) => s + i.runs, 0) / a.length : null;
const cls = r => r >= 50 ? "hi" : r >= 30 ? "mid" : r < 10 ? "lo" : "";
const bs = i => i.balls != null ? ` <small>(${i.balls})</small>` : "";
const tip = i => esc(`${i.potm ? "Player of the Match · " : ""}${i.date} · ${i.format} · ${i.competition || "league n/a"} · v ${i.opponent || "?"}${i.venue ? " · " + i.venue : ""}${i.result ? " · " + i.result : ""}`);
const TROPHY = '<svg class="tro" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3.2a5 5 0 0 1-3.6 4.8c-.3.9-.5 1.6-.9 2.2V15h2.7v2.2H8.8V15h2.7v-1.8c-.4-.6-.6-1.3-.9-2.2A5 5 0 0 1 7 6.2zM4.5 4.2H7v2H5a2.1 2.1 0 0 0 2 1.9v1.8A3.9 3.9 0 0 1 3 6.1V5.4a1.2 1.2 0 0 1 1.5-1.2zm15 0A1.2 1.2 0 0 1 21 5.4v.7a3.9 3.9 0 0 1-4 3.8V8.1a2.1 2.1 0 0 0 2-1.9h-2v-2zM8 18.5h8V21H8z"/></svg>';
const potmKeys = name => { const s = new Set(); ["bat", "bowl"].forEach(k => list(name, k).forEach(i => { if (i.potm) s.add([i.date, i.opponent, i.inn || ""].join("|")); })); return s; };
const potmBadge = name => { const n = potmKeys(name).size; return n ? `<span class="potm-n" title="Player of the Match in ${n} of the recent matches shown">${TROPHY}${n > 1 ? "×" + n : ""}</span>` : ""; };
const bat = i => `<span class="chip ${cls(i.runs)}${i.potm ? " potm" : ""}" title="${tip(i)}">${i.runs}${i.out ? "" : "*"}</span>`;
// bowling spell colour: green = 3+ wickets, or 2+ at under 7 an over; mid = 2 wickets, or a wicket at a good rate; red = wicketless and expensive (30+ runs, or over 11 an over)
const bowlCls = i => {
  const ov = +i.overs || 0, eco = ov ? i.runs / ov : null;
  if (i.wkts >= 3 || (i.wkts >= 2 && eco != null && eco <= 7)) return "hi";
  if (i.wkts >= 2 || (i.wkts === 1 && eco != null && eco <= 7.5)) return "mid";
  if (i.wkts === 0 && (i.runs >= 30 || (eco != null && eco >= 11))) return "lo";
  return "";
};
const bowl = i => `<span class="chip ${bowlCls(i)}${i.potm ? " potm" : ""}" title="${tip(i)}">${i.wkts}/${i.runs}</span>`;

const city = v => { const p = String(v || "").split(",").map(x => x.trim()).filter(Boolean); return p.length > 1 ? p[p.length - 1] : (p[0] || "–"); };
const fdate = d => String(d || "–").slice(0, 10);
// season-average colours: batting higher = better, bowling LOWER = better (high bowling average shows red)
const batAvgTier = a => a == null ? "" : a >= 35 ? "t5" : a >= 28 ? "t4" : a >= 20 ? "t3" : a >= 12 ? "t2" : "t1";
const bowlAvgTier = a => a == null ? "" : a <= 15 ? "t5" : a <= 22 ? "t4" : a <= 30 ? "t3" : a <= 40 ? "t2" : "t1";
const batTier = r => r >= 100 ? "t5" : r >= 50 ? "t4" : r >= 30 ? "t3" : r >= 10 ? "t2" : "t1";
const bowlTier = w => w >= 4 ? "t5" : w >= 3 ? "t4" : w >= 2 ? "t3" : w >= 1 ? "t2" : "t1";

// All-rounders: one entry per match, batting and bowling of the same match side by side
function pairs(name) {
  const rows = new Map(), get = i => { const k = [i.date, i.opponent, i.competition, i.inn || ""].join("|");
    if (!rows.has(k)) rows.set(k, {date: i.date, opp: i.opponent, inn: i.inn}); return rows.get(k); };
  list(name, "bat").forEach(i => { get(i).b = i; });
  list(name, "bowl").forEach(i => { get(i).w = i; });
  return [...rows.values()].sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.inn || 0) - (x.inn || 0)).slice(0, 5);
}
const pairChip = m => `<span class="pair${(m.b && m.b.potm) || (m.w && m.w.potm) ? " potm" : ""}" title="${tip((m.b && m.b.potm) ? m.b : (m.w && m.w.potm) ? m.w : (m.b || m.w))}"><i>${esc(fdate(m.date).slice(5))}<em>v ${esc(m.opp || "?")}</em></i>` +
  `<span class="chip ${m.b ? cls(m.b.runs) : "none"}">${m.b ? m.b.runs + (m.b.out ? "" : "*") : "–"}</span>` +
  `<span class="chip ${m.w ? (m.w.wkts >= 3 ? "hi" : "") : "none"}">${m.w ? m.w.wkts + "/" + m.w.runs : "–"}</span></span>`;
function detail(name, all) {
  const rows = new Map();
  let seen = {};   // data without innings numbers (Tests): the 2nd entry with the same key is the 2nd innings, not a duplicate
  const get = i => { const b = [i.date, i.opponent, i.competition, i.inn || ""].join("|"), n = seen[b] = (seen[b] || 0) + 1, k = b + "|" + n;
    if (!rows.has(k)) rows.set(k, {inn: i.inn || (n > 1 ? n : undefined), no: i.matchNo, date: i.date, team: i.team, opp: i.opponent, fmt: i.format, comp: i.competition, venue: i.venue, result: i.result});
    return rows.get(k); };
  list(name, "bat").forEach(i => { const m = get(i); m.bat = `${i.runs}${i.out ? "" : "*"}`; m.batT = batTier(i.runs); m.balls = i.balls; m.top = i.top; if (i.potm) m.potm = true; });
  ((F[name] || {}).bat || []).filter(i => i.dnb && (fmt === "ALL" || i.format === fmt)).forEach(get);
  seen = {};
  list(name, "bowl").forEach(i => { const m = get(i); m.bowl = `${i.wkts}/${i.runs}`; m.bowlT = bowlTier(i.wkts); m.overs = i.overs; if (i.potm) m.potm = true; });
  const ms = [...rows.values()].sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.inn || 0) - (x.inn || 0));
  if (!ms.length) return `<div class="empty">No recent matches found for ${esc(name)}${fmt !== "ALL" ? " in " + fmt : ""} yet.</div>`;
  const shown = all ? ms.slice(0, 30) : ms.slice(0, 5);
  const vs = m => esc(m.team ? m.team + " vs " + (m.opp || "?") : "vs " + (m.opp || "?"));
  const fm = m => esc((m.fmt || "–") + (m.no ? " # " + m.no : "") + (m.inn ? " · inns " + m.inn : ""));
  const body = '<div class="mcards">' + shown.map(m => `<div class="mc ${m.batT || m.bowlT || "t0"}" title="${esc(m.result || "")}">` +
    `<div class="mc-top"><span>${esc(fdate(m.date))}</span><span class="tag">${m.potm ? `<span class="potm-b" title="Player of the Match">${TROPHY}POTM</span> ` : ""}${m.top ? `<span class="star" title="Top scorer for ${esc(m.team || "his team")} in this match">★</span> ` : ""}${fm(m)}</span></div>` +
    `<div class="mc-main"><div><b class="${m.bat ? m.batT : "none"}">${m.bat || (m.bowl ? "DNB" : "--")}</b><small>${m.bat ? "bat" : (m.bowl ? "did not bat" : "no score")}${m.balls != null && m.bat ? " · " + m.balls + " balls" : ""}</small></div>` +
    (m.bowl ? `<div><b class="${m.bowlT}">${m.bowl}</b><small>bowl${m.overs != null ? " · " + m.overs + " ov" : ""}</small></div>` : "") + `</div>` +
    `<div class="mc-vs">${vs(m)}</div><div class="mc-sub">${esc(city(m.venue))}${m.comp ? " · " + esc(m.comp) : ""}</div></div>`).join("") + "</div>";
  return `<div class="recent"><div class="rh"><h3>Recent matches of ${esc(name)}</h3></div>${body}` +
    (ms.length > 5 ? `<button class="vm" data-all="${all ? 0 : 1}">${all ? "Show less" : "View more"}</button>` : "") + "</div>";
}


// Weekly catch-up: who played in the last N days, grouped by team, with their numbers
let catchDays = 7;
function catchup() {
  const sec = document.createElement("section"); sec.className = "catch";
  const ld = t => new Date(t).toLocaleDateString("en-CA");   // viewer's own calendar day, YYYY-MM-DD
  const cut = ld(Date.now() - catchDays * 864e5), today = ld(Date.now());
  const byTeam = {};
  R.players.forEach(p => {
    if (p.released) return;
    const f = F[p.name] || {}, bat = (f.bat || []).filter(i => i.date >= cut), bowl = (f.bowl || []).filter(i => i.date >= cut);
    if (!bat.length && !bowl.length) return;
    const games = new Set([...bat, ...bowl].map(i => i.date + "|" + (i.opponent || "") + "|" + (i.inn || "")));
    const played = bat.filter(i => !i.dnb);
    const runs = played.reduce((s, i) => s + i.runs, 0), outs = played.filter(i => i.out).length;
    const wk = bowl.reduce((s, i) => s + i.wkts, 0), rc = bowl.reduce((s, i) => s + i.runs, 0);
    (byTeam[p.team] = byTeam[p.team] || []).push({p, bat: played, bowl, n: games.size, runs, avg: outs ? runs / outs : null, wk, rc,
      last: [...bat, ...bowl].map(i => i.date).sort().pop()});
  });
  Object.values(byTeam).forEach(a => a.forEach(r => { r.bat = [...r.bat].sort((a, b) => b.date.localeCompare(a.date)); r.bowl = [...r.bowl].sort((a, b) => b.date.localeCompare(a.date)); }));   // newest match first
  const latest = t => byTeam[t].reduce((m, r) => r.last > m ? r.last : m, "");
  const teams = Object.keys(R.teams).filter(t => byTeam[t]).sort((a, b) => latest(b).localeCompare(latest(a)) || R.teams[a].localeCompare(R.teams[b]));
  const total = teams.reduce((s, t) => s + byTeam[t].length, 0);
  const btn = d => `<button class="${d === catchDays ? "on" : ""}" data-d="${d}">${d} days</button>`;
  let h = `<div class="catch-h"><div><h2>Weekly catch-up</h2><p>${total} player${total === 1 ? "" : "s"} played between ${esc(cut)} and ${esc(today)}</p></div><div class="catch-d">${[7, 14, 30].map(btn).join("")}</div></div>`;
  if (!teams.length) h += `<div class="empty">Nobody in the data played in the last ${catchDays} days. Try a longer range, or run the updater for fresher matches.</div>`;
  teams.forEach(t => {
    const col = (R.colors || {})[t] || "#2f6bff";
    byTeam[t].sort((x, y) => y.last.localeCompare(x.last) || (y.runs + y.wk * 20) - (x.runs + x.wk * 20) || x.p.name.localeCompare(y.p.name));
    h += `<div class="ct" style="--c:${col};--ink:${ink(col)}"><div class="ct-h"><span class="ct-mark">${esc(t)}</span><b>${esc(R.teams[t])}</b><small>${byTeam[t].length} player${byTeam[t].length === 1 ? "" : "s"}${byTeam[t].some(r => r.p.released) ? " · " + byTeam[t].filter(r => r.p.released).length + " released" : ""}</small></div>` +
      `<div class="ct-wrap"><table><thead><tr><th>Player</th><th>M</th><th>Batting</th><th>Bowling</th></tr></thead><tbody>` +
      byTeam[t].map(r => {
        const bc = r.bat.length ? r.bat.map(bat).join("") + `<small class="ct-s">${r.runs} runs${r.avg != null ? " · avg " + r.avg.toFixed(1) : ""}</small>` : '<span class="dim">–</span>';
        const bwc = r.bowl.length ? r.bowl.map(bowl).join("") + `<small class="ct-s">${r.wk} wkt${r.wk === 1 ? "" : "s"}${r.wk ? " · avg " + (r.rc / r.wk).toFixed(1) : ""}</small>` : '<span class="dim">–</span>';
        return `<tr data-n="${esc(r.p.name)}" tabindex="0"><td class="ct-p"><b>${esc(r.p.name)}${capBadge(r.p)}${r.p.released ? ' <span class="rl">released</span>' : ""}</b><span>${flag(r.p.country)}${roleBadge(r.p.role)}</span></td><td class="ct-m">${r.n}</td><td>${bc}</td><td>${bwc}</td></tr>`;
      }).join("") + `</tbody></table></div></div>`;
  });
  sec.innerHTML = h;
  sec.querySelectorAll(".catch-d button").forEach(b => b.onclick = () => { catchDays = +b.dataset.d; render(); });
  // tapping a player opens their recent matches right under the row; it stays on this tab
  sec.querySelectorAll("tbody tr").forEach(tr => {
    const wire = (box, all) => { const vm = box.querySelector(".vm"); if (vm) vm.onclick = e => { e.stopPropagation(); box.innerHTML = detail(tr.dataset.n, vm.dataset.all === "1"); wire(box, vm.dataset.all === "1"); }; };
    const go = () => {
      const nxt = tr.nextElementSibling;
      if (nxt && nxt.classList.contains("ct-open")) { nxt.remove(); tr.classList.remove("open"); return; }
      const row = document.createElement("tr"); row.className = "ct-open";
      const td = document.createElement("td"); td.colSpan = 4; td.innerHTML = detail(tr.dataset.n, false);
      row.appendChild(td); tr.after(row); tr.classList.add("open");
      const fit = () => { const w = tr.closest(".ct-wrap"); td.style.setProperty("--vw", (w ? w.clientWidth : 360) - 20 + "px"); };
      fit(); wire(td, false);
      row.onclick = e => e.stopPropagation();
    };
    tr.onclick = go; tr.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  return sec;
}

// Favourite team: remembered on this device; opens first, pinned at the front of the tabs, and tints the header
const FKEY = "pp-fav";
const getFav = () => { try { const t = localStorage.getItem(FKEY); return t && R.teams[t] ? t : null; } catch { return null; } };
const setFav = t => { try { t ? localStorage.setItem(FKEY, t) : localStorage.removeItem(FKEY); } catch {} };
const STAR = '<svg class="fs" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';

// open/close a card's recent-matches panel (shared by team pages and the Released tab)
function wireCards(grid) {
  const wire = (card, m) => {
    const show = () => { m.innerHTML = detail(card.dataset.n, m.dataset.all === "1"); wire(card, m); };
    const vm = m.querySelector(".vm"); if (vm) vm.onclick = e => { e.stopPropagation(); m.dataset.all = vm.dataset.all; show(); };
  };
  grid.querySelectorAll(".card").forEach(card => {
    const toggle = () => {
      const m = card.querySelector(".more");
      if (card.classList.toggle("open")) { m.dataset.all = "0"; m.innerHTML = detail(card.dataset.n, false); wire(card, m); } else m.innerHTML = "";
    };
    card.onclick = e => { if (!e.target.closest(".more")) toggle(); };
    card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
  });
}

// Released tab: everyone let go ahead of the 2027 auction, grouped by the team that released them, with last IPL's numbers
const LSEASON = (L.season || "IPL").replace("Indian Premier League", "IPL");
const lastList = (name, kind) => ((L.matches[name] || {})[kind] || []);
const ssT = (v, l) => `<span><b>${v}</b><small>${l}</small></span>`;
function releasedCard(p) {
  const st = L.stats[p.name], b = st && st.bat, w = st && st.bowl, bowler = p.role === "BOWL";
  const ini = p.name.split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase();
  const last = [list(p.name, "bat")[0], list(p.name, "bowl")[0]].filter(Boolean).sort((x, y) => y.date.localeCompare(x.date))[0];
  const key = !st ? null : (bowler && w) || !b ? (w ? [w.wkts, "IPL wkts"] : null) : [b.runs, "IPL runs"];
  const keyCls = !st ? "" : (bowler && w) || !b ? bowlAvgTier(w && w.avg) : batAvgTier(b && b.avg);
  const meta = st ? `${st.m} match${st.m === 1 ? "" : "es"} in ${esc(LSEASON)}${st.potm ? ` <span class="potm-n" title="Player of the Match">${TROPHY}${st.potm > 1 ? "×" + st.potm : ""}</span>` : ""}`
    : `Did not play in ${esc(LSEASON)}${last ? " · last played " + esc(last.date) : ""}`;
  const dash = '<span class="dim">–</span>';
  const bt = lastList(p.name, "bat"), bw = lastList(p.name, "bowl");
  return `<article class="card rcard" tabindex="0" data-n="${esc(p.name)}">` +
    `<div class="top"><span class="av">${esc(ini)}</span><div class="who"><b class="nm">${esc(p.name)}${capBadge(p)}</b><span class="meta">${flag(p.country)}${roleBadge(p.role)}<small>${meta}${p.note ? ' · <span class="rl">' + esc(p.note) + "</span>" : ""}</small></span></div>` +
    `<div class="avg">${key ? `<b class="${keyCls}">${key[0]}</b><small>${key[1]}</small>` : `<b class="dimv">–</b><small>no ${esc(LSEASON)}</small>`}</div></div>` +
    (b ? `<div class="ss"><em>Batting</em>${ssT(b.runs, "Runs")}${ssT(b.avg == null ? "–" : b.avg.toFixed(1), "Avg")}${ssT(b.sr == null ? "–" : b.sr.toFixed(0), "SR")}${ssT(b.hs + (b.hsno ? "*" : ""), "HS")}${ssT(b.f + "/" + b.h, "50/100")}</div>` : "") +
    (w ? `<div class="ss"><em>Bowling</em>${ssT(w.wkts, "Wkts")}${ssT(w.econ.toFixed(1), "Econ")}${ssT(w.avg == null ? "–" : w.avg.toFixed(1), "Avg")}${ssT(w.best, "Best")}${ssT(w.overs, "Overs")}</div>` : "") +
    (bt.length ? `<div class="row"><span class="lbl">Batting</span><span>${bt.map(bat).join("")}</span></div>` : "") +
    (bw.length ? `<div class="row"><span class="lbl">Bowling</span><span>${bw.map(bowl).join("")}</span></div>` : "") +
    (!st && !last ? `<div class="row"><span class="lbl">Data</span><span>${dash}</span></div>` : "") +
    `<div class="more"></div></article>`;
}
function renderReleased(q, main) {
  const all = R.players.filter(p => p.released), shown = all.filter(p => p.name.toLowerCase().includes(q));
  const played = all.filter(p => L.stats[p.name]).length;
  const head = document.createElement("div"); head.className = "rel-head";
  head.innerHTML = `<h2>Released players</h2><p>${all.length} players were released or retired ahead of the IPL 2027 auction (16 December, Goa). Cards show their ${esc(LSEASON)} season, ${played} of them played, grouped by the team that let them go. Tap a card for recent matches.</p>`;
  main.appendChild(head);
  Object.entries(R.teams).forEach(([c, n]) => {
    const ps = shown.filter(p => p.team === c);
    if (!ps.length) return;
    const key = p => { const st = L.stats[p.name] || {}; return sortBy === "bowl" ? (st.bowl ? st.bowl.wkts : -1) : (st.bat ? st.bat.runs : -1); };
    ps.sort((x, y) => sortBy === "name" ? x.name.localeCompare(y.name) : (key(y) - key(x)) || x.name.localeCompare(y.name));
    const sec = document.createElement("section");
    const col = (R.colors || {})[c]; if (col) { sec.style.setProperty("--c", col); sec.style.setProperty("--ink", ink(col)); }
    sec.innerHTML = `<h2><span class="lm sm" aria-hidden="true">${LM[c] || ""}</span>${esc(n)} (${c}) <small class="rel-n">${ps.length} released</small></h2>`;
    const grid = document.createElement("div"); grid.className = "cards"; grid.innerHTML = ps.map(releasedCard).join("");
    wireCards(grid); sec.appendChild(grid); main.appendChild(sec);
  });
  if (!shown.length) main.insertAdjacentHTML("beforeend", '<p class="b-help">No released player matches that search.</p>');
}

function renderAuction(main) {
  const A = window.IPL_AUCTION; if (!A) { main.innerHTML = '<p class="b-help">Auction data not loaded.</p>'; return; }
  const rows = Object.entries(A.teams).sort(([, x], [, y]) => y.purse - x.purse);
  const tot = rows.reduce((s, [, t]) => ({p: s.p + t.purse, s: s.s + t.slots, o: s.o + t.os}), {p: 0, s: 0, o: 0});
  const OS_MAX = 8, dt = new Date(A.when);
  const hero = document.createElement("div"); hero.className = "au-hero";
  hero.innerHTML = `<div class="au-d"><small>IPL 2027 mini-auction</small><b>${dt.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata"}).replace(/^(\d+)/, "$1")}</b><span>${esc(A.auction.replace(/^[^,]*,\s*/, ""))}</span></div>` +
    `<div class="au-cd" id="au-cd" aria-live="off"></div>`;
  main.appendChild(hero);
  const cd = hero.querySelector("#au-cd");
  const LBL = ["Days", "Hours", "Mins", "Secs"];
  cd.innerHTML = LBL.map(l => `<div class="fl-g"><span class="fl-l">${l}</span><span class="fl-t"><i class="fl-d">0</i><i class="fl-d">0</i></span></div>`).join('<span class="fl-c">:</span>');
  const tiles = [...cd.querySelectorAll(".fl-d")];
  const tick = () => {
    if (!document.body.contains(cd)) { clearInterval(window.__auT); return; }
    const s = Math.floor((dt - Date.now()) / 1000);
    if (s <= 0) { cd.innerHTML = '<div class="au-live">Auction day</div>'; clearInterval(window.__auT); return; }
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    const digits = v.map(n => String(n).padStart(2, "0")).join("");
    [...digits].forEach((ch, k) => { const t = tiles[k]; if (t.textContent !== ch) { t.textContent = ch; t.classList.remove("flip"); void t.offsetWidth; t.classList.add("flip"); } });
  };
  clearInterval(window.__auT); tick(); window.__auT = setInterval(tick, 1000);
  const sl = [...rows].sort(([, x], [, y]) => y.purse - x.purse);
  const seg = (c, held) => `<div class="au-seg" title="${held} of ${A.squadMax} filled">` + Array.from({length: A.squadMax}, (_, i) => `<i class="${i < held ? "f" : ""}"></i>`).join("") + "</div>";
  const tb = document.createElement("div"); tb.className = "au-tb";
  tb.innerHTML = `<h3>Money left and squad slots</h3><p class="au-as">As of ${esc(A.asof)}</p><div class="au-scroll"><table><thead><tr><th>Team</th><th>Money left</th><th>Open slots</th><th class="au-sg">Squad of ${A.squadMax}</th><th>Overseas open</th></tr></thead><tbody>` +
    sl.map(([c, t]) => { const col = (R.colors || {})[c] || "#1d4ea2", held = A.squadMax - t.slots;
      return `<tr style="--c:${col}"><th scope="row"><span class="au-dot"></span>${esc(R.teams[c] || c)}</th><td class="au-money"><span style="--c:${col};--ink:${ink(col)}">₹${t.purse.toFixed(2)} Cr</span></td><td class="au-open">${t.slots}</td><td class="au-sg">${seg(c, held)}</td><td class="au-open">${t.os}</td></tr>`; }).join("") +
    `</tbody><tfoot><tr><th scope="row">All teams</th><td class="au-money"><span class="tot">₹${tot.p.toFixed(2)} Cr</span></td><td class="au-open">${tot.s}</td><td class="au-sg"></td><td class="au-open">${tot.o}</td></tr></tfoot></table></div>`;
  main.appendChild(tb);
  main.insertAdjacentHTML("beforeend", `<p class="au-n">Purse in crore rupees from ₹${A.purseCap} cr. A squad holds up to ${A.squadMax} players, at most ${OS_MAX} of them overseas. </p>`);
}

function render() {
  const q = document.getElementById("q").value.toLowerCase();
  const tabs = document.getElementById("tabs"); tabs.innerHTML = "";
  const rowMain = document.createElement("div"), rowTeams = document.createElement("div");
  rowMain.className = "tg tg-main"; rowTeams.className = "tg tg-teams"; tabs.append(rowMain, rowTeams);
  const FAV = getFav();
  document.documentElement.style.setProperty("--fav", FAV ? ((R.colors || {})[FAV] || "transparent") : "transparent");
  document.documentElement.classList.toggle("has-fav", !!FAV);
  [...(FAV ? [FAV] : []), "HOME", "CATCHUP", "ALL", ...Object.keys(R.teams).filter(c => c !== FAV), ...(R.players.some(p => p.released) ? ["RELEASED"] : []), "AUCTION", "BUILD", "PREDICT", "COMPARE"].sort((x, y) => (R.teams[x] ? 1 : 0) - (R.teams[y] ? 1 : 0)).forEach(t => {
    const b = document.createElement("button"); b.textContent = t === "HOME" ? "Home" : t === "CATCHUP" ? "Weekly catch-up" : t === "ALL" ? "All players" : t === "BUILD" ? "Build XII" : t === "PREDICT" ? "Predict 2027" : t === "COMPARE" ? "Compare" : t === "RELEASED" ? "Released" : t === "AUCTION" ? "Auction 2027" : t; b.className = t === team ? "on" : "";
    if (t === "PREDICT") b.classList.add("predict");
    if (t === "RELEASED") b.classList.add("relt");
    if (t === "AUCTION") b.classList.add("auct");
    if (!R.teams[t]) b.classList.add("sx", "sx-" + t.toLowerCase());
    if (t === "BUILD") { b.classList.add("build"); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>Build XII'; }
    const col = (R.colors || {})[t];
    if (col) { b.style.setProperty("--c", col); b.style.setProperty("--ink", ink(col)); b.classList.add("tm"); }
    if (t === FAV) { b.classList.add("fav"); b.innerHTML = STAR + b.textContent; b.title = "Your favourite team"; }
    if (t === team) setTimeout(() => b.scrollIntoView({inline: "center", block: "nearest"}), 0);
    b.onclick = () => { if (t === "BUILD" && R.teams[team]) window.buildTeam = team; team = t; render(); }; (R.teams[t] ? rowTeams : rowMain).appendChild(b); });
  document.getElementById("banner").innerHTML = Object.keys(F).length ? "" :
    "<b>No form data loaded yet.</b> Put your API key in <code>api-key.txt</code>, then double-click <code>update-form.command</code> and reload this page.";
  document.getElementById("note").textContent = META.updated
    ? `Data refreshed ${META.updated} (UTC) · latest match ${latestMatch() || "n/a"} · ${META.matches} scorecards. Chips: batting runs (* = not out) and bowling wickets/runs, newest first.`
    : "Chips will show batting runs (* = not out) and bowling wickets/runs, newest first.";
  const main = document.getElementById("teams"); main.innerHTML = "";
  let bb = document.getElementById("backbar");
  if (!bb) { bb = document.createElement("div"); bb.id = "backbar"; main.parentNode.insertBefore(bb, main); }
  bb.innerHTML = team === "HOME" ? "" : '<button type="button" class="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Home</button>';
  if (team !== "HOME") bb.firstChild.onclick = () => { document.getElementById("q").value = ""; sgHide(); team = "HOME"; render(); window.scrollTo(0, 0); };
  if (team === "BUILD") { window.renderBuilder(); return; }
  if (team === "PREDICT") { window.renderPredict(); return; }
  if (team === "COMPARE") { window.renderCompare(); return; }
  if (team === "RELEASED") { renderReleased(q, main); return; }
  if (team === "AUCTION") { renderAuction(main); return; }
  if (team === "CATCHUP") { main.appendChild(catchup()); return; }
  if (team === "HOME" && !q) {
    const hero = document.createElement("div"); hero.className = "hero";
    hero.innerHTML = `<img src="assets/final.jpeg" alt="IPL 2026 champions celebrating on the field" onerror="this.parentNode.remove()"><div class="hero-txt"><small>IPL 2026 final</small><h2>Champions</h2><p>Royal Challengers Bengaluru lift the trophy</p></div><span class="credit">Photo: BCCI</span>`;
    main.appendChild(hero);
    const cta = document.createElement("button"); cta.className = "cta";
    cta.innerHTML = `<span class="cta-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg></span><span class="cta-t"><b>Build your playing XII</b><small>Pick 11 + an Impact Player from any squad. Drag and drop, with IPL overseas rules checked for you.</small></span><span class="cta-go"><span>Start </span>→</span>`;
    cta.onclick = () => { team = "BUILD"; render(); window.scrollTo(0, 0); };
    main.appendChild(cta);
    const pc = document.createElement("button"); pc.className = "cta pred";
    pc.innerHTML = `<span class="cta-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-4 4.9V15h3v2H8v-2h3v-3.1A5 5 0 0 1 7 7zM5 5h2v2a3 3 0 0 1-2-2zm14 0a3 3 0 0 1-2 2V5z"/></svg></span><span class="cta-t"><b>Predict IPL 2027</b><small>Pick the bracket, the champion and both caps. No money, only bragging rights.</small></span><span class="cta-go"><span>Predict </span>→</span>`;
    pc.onclick = () => { team = "PREDICT"; render(); window.scrollTo(0, 0); };
    main.appendChild(pc);
    const cc = document.createElement("button"); cc.className = "cta cmpc";
    cc.innerHTML = `<span class="cta-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm7 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 19c0-3 2.7-5 6-5s6 2 6 5v1H3zm13.2-4.8c2.6.2 4.8 1.8 4.8 4.3V20h-4v-1c0-1.7-.3-3-.8-4.8z"/></svg></span><span class="cta-t"><b>Compare with friends</b><small>See everyone's predictions and playing XIs side by side. Share your picks with a link.</small></span><span class="cta-go"><span>Compare </span>→</span>`;
    cc.onclick = () => { team = "COMPARE"; render(); window.scrollTo(0, 0); };
    main.appendChild(cc);
    const g = document.createElement("div"); g.className = "tiles";
    Object.entries(R.teams).sort(([x], [y]) => (y === FAV) - (x === FAV)).forEach(([c, n]) => {
      const col = (R.colors || {})[c] || "#0b1f4d";
      const cnt = R.players.filter(p => p.team === c && !p.released).length;
      const withForm = R.players.filter(p => p.team === c && !p.released && list(p.name, "bat").length + list(p.name, "bowl").length).length;
      const t = document.createElement("button"); t.className = "tile";
      t.style.setProperty("--c", col); t.style.setProperty("--ink", ink(col));
      if (c === FAV) t.classList.add("fav");
      t.innerHTML = `<span class="tfav${c === FAV ? " on" : ""}" role="button" tabindex="0" data-f="${c}" aria-label="${c === FAV ? "Remove favourite" : "Set as favourite"}">${STAR}</span><span class="lm" aria-hidden="true">${LM[c] || ""}</span><b>${esc(n)}</b><small>${cnt} players${Object.keys(F).length ? "<br>" + withForm + " with form data" : ""}</small>`;
      t.onclick = e => { const f = e.target.closest(".tfav"); if (f) { e.stopPropagation(); setFav(FAV === c ? null : c); render(); return; } team = c; render(); window.scrollTo(0, 0); };
      g.appendChild(t);
    });
    main.appendChild(g); return;
  }
  const teamInfo = c => {
    const I = (window.IPL_TEAMINFO || {})[c]; if (!I) return null;
    const ll = I.lat.toFixed(4) + "° N, " + I.lon.toFixed(4) + "° E";
    const url = "https://www.google.com/maps/search/?api=1&query=" + I.lat + "," + I.lon;
    const d = document.createElement("div"); d.className = "tinfo";
    d.innerHTML = `<div class="ti-g"><span class="ti-l">Home ground</span><b>${esc(I.ground)}</b><small>${esc(I.city)}</small>` +
      `<a class="ti-map" href="${url}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg><span>${ll}</span><em>Open in Google Maps</em></a></div>` +
      `<div class="ti-s"><span class="ti-l">Coaching staff</span><ul>${I.staff.map(([r, nm]) => `<li><b>${esc(nm)}</b><small>${esc(r)}</small></li>`).join("")}</ul>` +
      (I.note ? `<p class="ti-n">${esc(I.note)}</p>` : "") + `</div>`;
    return d;
  };
  Object.entries(R.teams).filter(([c]) => team === "ALL" || team === "HOME" || c === team).forEach(([c, n]) => {
    const ps = R.players.filter(p => p.team === c && p.name.toLowerCase().includes(q)).map(p => {
      const b = list(p.name, "bat"), w = list(p.name, "bowl");
      const w5 = w.slice(0, 5), wk = w5.reduce((s, i) => s + i.wkts, 0), rc = w5.reduce((s, i) => s + i.runs, 0);
      return {p, b, w, a: avg(b.slice(0, 5)), k: wk, ba: wk ? rc / wk : null};
    });
    ps.sort((x, y) => (groupBy === "role" ? rord(x.p) - rord(y.p) : 0) || (sortBy === "name" ? x.p.name.localeCompare(y.p.name)
      : sortBy === "bowl" ? (y.k - x.k) || x.p.name.localeCompare(y.p.name)
      : ((y.a ?? -1) - (x.a ?? -1)) || x.p.name.localeCompare(y.p.name)));
    const s = document.createElement("section");
    const col = (R.colors || {})[c]; if (col) { s.style.setProperty("--c", col); s.style.setProperty("--ink", ink(col)); }
    s.innerHTML = `<h2><span class="lm sm" aria-hidden="true">${LM[c] || ""}</span>${esc(n)} (${c})<button class="h2-fav${getFav() === c ? " on" : ""}" data-t="${c}" aria-pressed="${getFav() === c}">${STAR}${getFav() === c ? "Favourite" : "Set as favourite"}</button><button class="h2-build" data-t="${c}">★ Build XII</button></h2>`;
    s.querySelector(".h2-fav").onclick = () => { setFav(getFav() === c ? null : c); render(); };
    s.querySelector(".h2-build").onclick = () => { window.buildTeam = c; team = "BUILD"; render(); window.scrollTo(0, 0); };
    const mkGrid = ps => {
    const grid = document.createElement("div"); grid.className = "cards";
    grid.innerHTML = ps.map(({p, b, w, a, ba}, idx) => {
      const bowler = p.role === "BOWL", stat = bowler ? ba : a;
      const last = [b[0], w[0]].filter(Boolean).sort((x, y) => y.date.localeCompare(x.date))[0];
      const ini = p.name.split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase();
      const dash = '<span class="dim">–</span>';
      const hd = groupBy === "role" && (idx === 0 || rord(ps[idx - 1].p) !== rord(p)) ? `<h3 class="grp">${RGRP[p.role || ""] || RGRP[""]} <small>${ps.filter(x => rord(x.p) === rord(p)).length}</small></h3>` : "";
      const stale = last && META.since && last.date < META.since;
      return hd + `<article class="card${stale ? " stale" : ""}" tabindex="0" data-n="${esc(p.name)}">` +
        `<div class="top"><span class="av">${esc(ini)}${photo(p.name)}</span><div class="who"><b class="nm">${esc(p.name)}${capBadge(p)}${potmBadge(p.name)}</b><span class="meta">${flag(p.country)}${roleBadge(p.role)}` +
        `<small>${last ? "Last played " + esc(last.date) + (stale ? ' · <span class="old">not recent</span>' : "") : "No matches found"}${p.released ? ' · <span class="rl">' + esc(p.note || "released") + "</span>" : p.withdrawn ? ' · <span class="wd">withdrawn</span>' : ""}</small></span></div>` +
        `<div class="avg"><b class="${bowler ? bowlAvgTier(stat) : batAvgTier(stat)}">${stat == null ? "–" : stat.toFixed(1)}</b><small>${bowler ? "bowl avg" : "bat avg"}</small></div></div>` +
        (p.role === "AR"
          ? `<div class="ar"><div class="ar-h"><span>Recent matches</span><span class="ar-k">Bat&nbsp;|&nbsp;Bowl</span></div><div class="pairs">${pairs(p.name).map(pairChip).join("") || dash}</div></div>`
          : `<div class="row"><span class="lbl">Batting</span><span>${b.slice(0, 5).map(bat).join("") || dash}</span></div>` +
            `<div class="row"><span class="lbl">Bowling</span><span>${w.slice(0, 5).map(bowl).join("") || dash}</span></div>`) +
        `<div class="more"></div></article>`;
    }).join("");
    wireCards(grid);
    return grid; };
    const cur = ps.filter(x => !x.p.released), rel = ps.filter(x => x.p.released);
    if (team === c) { const ti = teamInfo(c); if (ti) s.appendChild(ti); }
    const gb = document.createElement("div"); gb.className = "grp-bar";
    gb.innerHTML = `<select class="grp-sel${groupBy !== "none" ? " on" : ""}" aria-label="Group players"><option value="none">No grouping</option><option value="role">Group by role</option></select>`;
    const gs = gb.firstChild; gs.value = groupBy; gs.onchange = () => { groupBy = gs.value; render(); };
    s.appendChild(gb);
    s.appendChild(mkGrid(cur));
    if (rel.length) {
      const d = document.createElement("details"); d.className = "rel"; d.open = !!q;
      d.innerHTML = `<summary>Released ahead of the 2027 auction <small>${rel.length}</small></summary>`;
      d.appendChild(mkGrid(rel)); s.appendChild(d);
    }
    main.appendChild(s);
  });
}
// type-ahead: 3+ characters list matching players; picking one jumps to that player's card
const qEl = document.getElementById("q"), sg = document.createElement("ul");
sg.id = "sugg"; sg.hidden = true; sg.setAttribute("role", "listbox"); qEl.parentNode.appendChild(sg);
let sgIdx = -1, sgList = [];
const sgHide = () => { sg.hidden = true; sgIdx = -1; };
const sgMark = () => [...sg.children].forEach((li, i) => li.classList.toggle("on", i === sgIdx));
function sgShow() {
  const t = qEl.value.trim().toLowerCase();
  if (t.length < 3) return sgHide();
  sgList = R.players.filter(p => p.name.toLowerCase().includes(t))
    .sort((x, y) => (x.name.toLowerCase().startsWith(t) ? 0 : 1) - (y.name.toLowerCase().startsWith(t) ? 0 : 1) || x.name.localeCompare(y.name)).slice(0, 8);
  sg.innerHTML = sgList.length ? sgList.map((p, i) => `<li role="option" data-i="${i}" style="--c:${(R.colors || {})[p.team] || "#2f6bff"};--ink:${ink((R.colors || {})[p.team] || "#2f6bff")}"><b>${esc(p.name)}</b><span>${flag(p.country)}${roleBadge(p.role)}<em>${p.released ? "Released · " + esc(p.team) : esc(p.team)}</em></span></li>`).join("")
    : '<li class="none">No player found</li>';
  sg.hidden = false; sgIdx = -1;
}
function focusPlayer(p) {
  qEl.value = ""; sgHide(); team = p.released ? "RELEASED" : p.team; render();
  const card = [...document.querySelectorAll(".card")].find(c => c.dataset.n === p.name);
  if (!card) return;
  card.scrollIntoView({behavior: "smooth", block: "center"});
  card.classList.add("focus"); setTimeout(() => card.classList.remove("focus"), 2600);
  card.click();                                   // open the recent-matches panel
}
sg.onmousedown = e => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); focusPlayer(sgList[+li.dataset.i]); } };
qEl.oninput = () => { render(); sgShow(); };
qEl.onfocus = sgShow;
qEl.onblur = () => setTimeout(sgHide, 120);
qEl.onkeydown = e => {
  if (sg.hidden || !sgList.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); sgIdx = (sgIdx + 1) % sgList.length; sgMark(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sgIdx = (sgIdx - 1 + sgList.length) % sgList.length; sgMark(); }
  else if (e.key === "Enter") { e.preventDefault(); focusPlayer(sgList[sgIdx >= 0 ? sgIdx : 0]); }
  else if (e.key === "Escape") sgHide();
};
// ---- Players: several people can build XIIs and predictions on one device ----
const PPusers = (() => {
  const K = "pp-users", MAX = 6, FMAX = 8, COLORS = ["#2f6bff", "#ff7a1a", "#1fb86a", "#e0408f", "#8a5cf6", "#0fb5c4"];
  let st = {list: [{id: "u1", name: "Me", c: COLORS[0]}], active: "u1"}, mode = null;
  try { const j = JSON.parse(localStorage.getItem(K) || "null");
    if (j && Array.isArray(j.list) && j.list.length) st = j; } catch {}
  if (!st.list.some(u => u.id === st.active && !u.f)) st.active = (st.list.find(u => !u.f) || st.list[0]).id;
  const persist = () => { try { localStorage.setItem(K, JSON.stringify(st)); } catch {} };
  // the first player keeps the original storage keys, so nothing saved earlier is lost
  const key = (base, id = st.active) => id === "u1" ? base : base + "@" + id;
  const own = () => st.list.filter(u => !u.f), list = () => own(), everyone = () => st.list, active = () => st.list.find(u => u.id === st.active);
  const ini = n => (n.trim()[0] || "?").toUpperCase();
  const wipe = id => { try { Object.keys(localStorage).forEach(k => {
    if (id === "u1" ? (k === "pp-predict-2027" || /^ipl-xii-[A-Za-z0-9]+$/.test(k)) : k.endsWith("@" + id)) localStorage.removeItem(k); }); } catch {} };
  const uniq = (n, skip) => { let b = n, i = 2; while (st.list.some(u => u.id !== skip && u.name.toLowerCase() === n.toLowerCase())) n = b + " " + i++; return n; };
  const bar = () => {
    const a = active();
    const chips = own().map(u => `<button type="button" class="ub-c${u.id === st.active ? " on" : ""}" data-u="${u.id}" style="--c:${u.c};--ink:${ink(u.c)}" aria-pressed="${u.id === st.active}"><i>${esc(ini(u.name))}</i>${esc(u.name)}</button>`).join("");
    const add = own().length < MAX ? `<button type="button" class="ub-add" data-act="add">+ Add player</button>` : "";
    let form = "";
    if (mode === "add") form = `<form class="ub-f" data-form="add"><input name="n" maxlength="14" placeholder="Name, e.g. Dad" aria-label="New player name" autocomplete="off"><button class="ub-go">Add</button><button type="button" class="ub-x" data-act="cancel">Cancel</button></form>`;
    if (mode === "edit") form = `<form class="ub-f" data-form="edit"><input name="n" maxlength="14" value="${esc(a.name)}" aria-label="Player name" autocomplete="off"><button class="ub-go">Rename</button>${own().length > 1 ? `<button type="button" class="ub-del" data-act="del">Remove</button>` : ""}<button type="button" class="ub-x" data-act="cancel">Cancel</button></form>`;
    if (mode === "del") form = `<div class="ub-f"><span class="ub-msg">Remove <b>${esc(a.name)}</b> and all their saved picks?</span><button type="button" class="ub-del solid" data-act="del2">Remove</button><button type="button" class="ub-x" data-act="cancel">Cancel</button></div>`;
    return `<div class="ubar"><div class="ub-row"><span class="ub-l">Playing as</span><div class="ub-chips">${chips}</div>${add}</div>${form}</div>`;
  };
  // draws the bar under a page header; onChange re-draws the page after the player changes
  function mount(root, onChange) {
    const head = root.querySelector(".b-head"); if (!head) return;
    const host = document.createElement("div"); host.className = "ub-host"; head.insertAdjacentElement("afterend", host);
    const paint = (focus) => { host.innerHTML = bar(); wire(); if (focus) { const i = host.querySelector("input"); if (i) { i.focus(); i.select(); } } };
    const wire = () => {
      host.querySelectorAll(".ub-c").forEach(b => b.onclick = () => {
        if (b.dataset.u === st.active) { mode = mode === "edit" ? null : "edit"; return paint(mode === "edit"); }
        st.active = b.dataset.u; mode = null; persist(); onChange(); });
      host.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
        const a = b.dataset.act;
        if (a === "add") { mode = "add"; paint(true); }
        else if (a === "cancel") { mode = null; paint(); }
        else if (a === "del") { mode = "del"; paint(); }
        else if (a === "del2") {
          const id = st.active; wipe(id); st.list = st.list.filter(u => u.id !== id); st.active = own()[0].id; mode = null; persist(); onChange(); } });
      host.querySelectorAll("form").forEach(f => f.onsubmit = e => {
        e.preventDefault(); const n = f.n.value.trim().slice(0, 14); if (!n) return f.n.focus();
        if (f.dataset.form === "add") {
          const used = new Set(st.list.map(u => u.c)), u = {id: "u" + Date.now().toString(36), name: uniq(n), c: COLORS.find(c => !used.has(c)) || COLORS[own().length % COLORS.length]};
          st.list.push(u); st.active = u.id; mode = null; persist(); onChange();
        } else { active().name = uniq(n, st.active); mode = null; persist(); onChange(); } });
    };
    paint();
  }
  // friends: picks that arrived through a shared link; shown in Compare only
  const addFriend = (name, picks, xiByTeam) => {
    name = String(name || "Friend").trim().slice(0, 14) || "Friend";
    let u = st.list.find(x => x.f && x.name.toLowerCase() === name.toLowerCase());
    if (!u) {
      if (st.list.filter(x => x.f).length >= FMAX) return null;
      const used = new Set(st.list.map(x => x.c)), others = COLORS.concat(["#c9a227", "#7a8b99"]);
      u = {id: "f" + Date.now().toString(36), name: uniq(name), c: others.find(c => !used.has(c)) || others[st.list.length % others.length], f: 1};
      st.list.push(u);
    }
    try {
      localStorage.setItem(key("pp-predict-2027", u.id), JSON.stringify(picks));
      Object.keys(localStorage).filter(k => k.startsWith("ipl-xii-") && k.endsWith("@" + u.id)).forEach(k => localStorage.removeItem(k));
      Object.entries(xiByTeam || {}).forEach(([t, x]) => localStorage.setItem(key("ipl-xii-" + t, u.id), JSON.stringify(x)));
    } catch {}
    persist(); return u;
  };
  const removeFriend = id => { wipe(id); st.list = st.list.filter(u => u.id !== id); persist(); };
  return {key, list, everyone, active, mount, ini, addFriend, removeFriend};
})();

// Playing-XII builder: 11 + Impact Player, IPL squad rules, drag-and-drop (desktop) and tap (phone).
(() => {
  const MAX_OS_XI = 4, MAX_OS_12 = 4;       // overseas: 4 maximum across the whole XII
  let bteam = null, slots = Array(12).fill(null), msg = "", mt = 0, q = "", lu = PPusers.active().id;
  const ORDER = ["BAT", "WK", "AR", "BOWL"], GROUP = {BAT: "Batters", WK: "Wicket-keepers", AR: "All-rounders", BOWL: "Bowlers", "": "Role not set"};
  const ORD = p => { const i = ORDER.indexOf(p.role); return i < 0 ? 4 : i; };
  const KEY = t => PPusers.key("ipl-xii-" + t);
  const isOS = p => (p.country || "in") !== "in";
  const byName = n => R.players.find(p => p.name === n);
  const squad = t => R.players.filter(p => p.team === t && !p.withdrawn && !p.released);
  const load = t => { lu = PPusers.active().id; try { const s = JSON.parse(localStorage.getItem(KEY(t)) || "null");
    slots = Array.isArray(s) && s.length === 12 ? s.map(n => byName(n) && byName(n).team === t && !byName(n).released ? n : null) : Array(12).fill(null); } catch { slots = Array(12).fill(null); } };
  const save = () => { try { localStorage.setItem(KEY(bteam), JSON.stringify(slots)); } catch {} };
  const toast = m => { msg = m; clearTimeout(mt); mt = setTimeout(() => { msg = ""; const e = document.querySelector(".b-toast"); if (e) e.remove(); }, 3500); };

  const counts = s => {
    const xi = s.slice(0, 11).map(n => n && byName(n)).filter(Boolean), all = s.map(n => n && byName(n)).filter(Boolean);
    return {xi, all, osXI: xi.filter(isOS).length, os12: all.filter(isOS).length,
      wk: xi.filter(p => p.role === "WK").length, bowl: xi.filter(p => p.role === "BOWL" || p.role === "AR").length};
  };
  const hard = s => { const c = counts(s);
    if (c.osXI > MAX_OS_XI) return `Only ${MAX_OS_XI} overseas players are allowed in the playing XI.`;
    if (c.os12 > MAX_OS_12) return `Only ${MAX_OS_12} overseas players are allowed in the XII, including the Impact Player.`;
    return ""; };

  function place(name, to) {
    const from = slots.indexOf(name), next = slots.slice();
    if (from >= 0) { next[from] = next[to]; next[to] = name; } else next[to] = name;
    const bad = hard(next);
    if (bad) { toast(bad); return render(); }
    slots = next; save(); render();
  }
  const addFirst = name => {
    if (slots.includes(name)) return;
    const i = slots.indexOf(null);
    if (i < 0) { toast("The XII is full. Remove a player first."); return render(); }
    place(name, i);
  };
  const remove = i => { slots[i] = null; save(); render(); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j > 10 || i > 10) return; [slots[i], slots[j]] = [slots[j], slots[i]]; save(); render(); };

  const statOf = p => {
    const b = list(p.name, "bat").slice(0, 5), w = list(p.name, "bowl").slice(0, 5);
    const a = avg(b), wk = w.reduce((s, i) => s + i.wkts, 0), rc = w.reduce((s, i) => s + i.runs, 0);
    const parts = [];
    if (a != null) parts.push(`${a.toFixed(0)} bat`);
    if (wk) parts.push(`${(rc / wk).toFixed(0)} bowl`);
    return parts.join(" · ") || "no recent data";
  };
  const plane = '<svg class="plane" viewBox="0 0 24 24" role="img" aria-label="Overseas player"><title>Overseas player</title><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
  const pill = (p, extra = "") => `<span class="b-av">${esc(p.name.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase())}${photo(p.name)}</span>` +
    `<span class="b-nm"><b>${esc(p.name)}${capBadge(p)}</b><small>${flag(p.country)}${isOS(p) ? plane : ""}${roleBadge(p.role)}<span>${esc(statOf(p))}</span></small></span>${extra}`;

  function checks() {
    const c = counts(slots), n = c.xi.length, imp = slots[11];
    const row = (ok, t) => `<li class="${ok === true ? "ok" : ok === false ? "no" : "warn"}"><i>${ok === true ? "✓" : ok === false ? "✕" : "!"}</i>${t}</li>`;
    return `<ul class="b-rules">` +
      row(n === 11, `Playing XI: ${n}/11`) + row(!!imp, `Impact Player: ${imp ? "chosen" : "not chosen"}`) +
      row(c.osXI <= MAX_OS_XI, `Overseas in XI: ${c.osXI}/${MAX_OS_XI}`) + row(c.os12 <= MAX_OS_12, `Overseas in XII: ${c.os12}/${MAX_OS_12}`) +
      row(c.wk >= 1 ? true : null, `Wicket-keeper in XI: ${c.wk >= 1 ? "yes" : "none yet"}`) +
      row(c.bowl >= 5 ? true : null, `Bowling options (bowlers + all-rounders): ${c.bowl}${c.bowl >= 5 ? "" : " (aim for 5+)"}`) + `</ul>`;
  }

  function render() {
    const main = document.getElementById("teams"); if (!main) return;
    const col = R.colors[bteam] || "#2f6bff";
    const pool = squad(bteam).filter(p => !slots.includes(p.name) && (!q || p.role === q))
      .sort((a, b) => ORD(a) - ORD(b) || a.name.localeCompare(b.name));
    const slotHtml = i => { const n = slots[i], p = n && byName(n);
      const label = i === 11 ? "Impact" : i + 1;
      return `<li class="b-slot${p ? " has" : ""}${i === 11 ? " imp" : ""}" data-i="${i}"><span class="b-pos">${label}</span>` +
        (p ? `<div class="b-p" draggable="true" data-n="${esc(p.name)}">${pill(p,
          `<span class="b-ctl">${i < 11 ? `<button data-up="${i}" aria-label="Move up">▲</button><button data-dn="${i}" aria-label="Move down">▼</button>` : ""}<button data-rm="${i}" aria-label="Remove">✕</button></span>`)}</div>`
          : `<span class="b-empty">${i === 11 ? "Drop or tap a player — the 12th man who can replace someone mid-match" : "Drop a player here"}</span>`) + `</li>`; };
    main.innerHTML = `<div class="builder" style="--c:${col};--ink:${ink(col)}">` +
      `<div class="b-head"><h2>Playing XII builder</h2><div class="b-teams">${Object.keys(R.teams).map(t => {
        const c = R.colors[t] || "#2f6bff";
        return `<button class="${t === bteam ? "on" : ""}" data-t="${t}" style="--c:${c};--ink:${ink(c)}">${t}</button>`; }).join("")}</div></div>` +
      `<p class="b-help">Pick 11 plus an Impact Player. Drag players from the squad into the order you want, or tap a player to add them. Rule: only ${MAX_OS_12} overseas players in the whole XII.</p>` +
      (msg ? `<div class="b-toast" role="alert">${esc(msg)}</div>` : "") +
      `<div class="b-grid"><section class="b-col"><div class="b-sh"><h3>${esc(R.teams[bteam])} squad <small>${pool.length}</small></h3>` +
      `</div><div class="b-roles" role="group" aria-label="Filter squad by role">${[["BAT", "Batters"], ["BOWL", "Bowlers"], ["AR", "All-rounders"], ["WK", "Wicketkeepers"]].map(([r, l]) => `<button type="button" class="b-role${q === r ? " on" : ""}" data-r="${r}" aria-pressed="${q === r}" aria-label="${l}" title="${l}">${roleBadge(r)}</button>`).join("")}</div>` +
      `<ul class="b-pool" data-drop="pool">${pool.map((p, i) => (i === 0 || ORD(pool[i - 1]) !== ORD(p) ? `<li class="b-grp">${GROUP[p.role || ""] || GROUP[""]}</li>` : "") +
        `<li class="b-p" draggable="true" data-n="${esc(p.name)}" tabindex="0">${pill(p)}</li>`).join("") || '<li class="b-none">Everyone is selected.</li>'}</ul></section>` +
      `<section class="b-col"><div class="b-sh"><h3>Your XII</h3><span><button class="b-act share" id="bshare">Share</button><button class="b-act" id="bcopy">Copy</button><button class="b-act" id="bclr">Clear</button></span></div>` +
      checks() + `<ol class="b-xi">${Array.from({length: 11}, (_, i) => slotHtml(i)).join("")}</ol><ol class="b-xi b-impwrap">${slotHtml(11)}</ol></section></div></div>`;
    wire(main);
    PPusers.mount(main, () => window.render());
  }

  function wire(main) {
    main.querySelectorAll(".b-teams button").forEach(b => b.onclick = () => { bteam = b.dataset.t; q = ""; load(bteam); render(); });
    main.querySelectorAll(".b-role").forEach(b => b.onclick = () => { q = q === b.dataset.r ? "" : b.dataset.r; render(); });
    main.querySelectorAll(".b-pool .b-p").forEach(e => { e.onclick = () => addFirst(e.dataset.n);
      e.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); addFirst(e.dataset.n); } }; });
    main.querySelectorAll("[data-rm]").forEach(b => b.onclick = e => { e.stopPropagation(); remove(+b.dataset.rm); });
    main.querySelectorAll("[data-up]").forEach(b => b.onclick = e => { e.stopPropagation(); move(+b.dataset.up, -1); });
    main.querySelectorAll("[data-dn]").forEach(b => b.onclick = e => { e.stopPropagation(); move(+b.dataset.dn, 1); });
    main.querySelector("#bclr").onclick = () => { slots = Array(12).fill(null); save(); render(); };
    main.querySelector("#bshare").onclick = () => window.PPshare.xii(bteam, slots);
    main.querySelector("#bcopy").onclick = () => {
      const t = `${PPusers.list().length > 1 ? PPusers.active().name + "’s " : ""}${R.teams[bteam]} XII\n` + slots.slice(0, 11).map((n, i) => `${i + 1}. ${n || "-"}`).join("\n") + `\nImpact Player: ${slots[11] || "-"}`;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { toast("Copied to clipboard."); render(); }, () => { toast("Copy is not available here."); render(); }); };
    // drag and drop
    let drag = null;
    main.querySelectorAll(".b-p[draggable]").forEach(e => {
      e.ondragstart = ev => { drag = e.dataset.n; ev.dataTransfer.setData("text/plain", drag); ev.dataTransfer.effectAllowed = "move"; e.classList.add("drag"); };
      e.ondragend = () => { e.classList.remove("drag"); main.querySelectorAll(".over").forEach(x => x.classList.remove("over")); };
    });
    main.querySelectorAll(".b-slot").forEach(s => {
      s.ondragover = ev => { if (drag) { ev.preventDefault(); s.classList.add("over"); } };
      s.ondragleave = () => s.classList.remove("over");
      s.ondrop = ev => { ev.preventDefault(); if (drag) { const n = drag; drag = null; place(n, +s.dataset.i); } };
    });
    const pool = main.querySelector(".b-pool");
    pool.ondragover = ev => { if (drag && slots.includes(drag)) ev.preventDefault(); };
    pool.ondrop = ev => { ev.preventDefault(); const i = slots.indexOf(drag); drag = null; if (i >= 0) remove(i); };
  }

  window.renderBuilder = () => {
    const want = window.buildTeam && R.teams[window.buildTeam] ? window.buildTeam : null;
    window.buildTeam = null;
    if (want && want !== bteam) { bteam = want; q = ""; load(bteam); }
    else if (!bteam) { bteam = getFav() || Object.keys(R.teams)[0]; load(bteam); }
    else if (lu !== PPusers.active().id) load(bteam);
    render();
  };
})();

if (getFav()) team = getFav();
render();

(() => {
  const el = document.getElementById("lastup"); if (!el) return;
  const dates = Object.values(F).flatMap(p => [...(p.bat || []), ...(p.bowl || [])].map(i => i.date)).filter(Boolean).sort();
  const latest = dates.length ? dates[dates.length - 1].slice(0, 10) : null;
  el.innerHTML = META.updated ? `<span>Data last updated <b>${esc(META.updated)}</b></span>` + (latest ? `<span>Latest match <b>${esc(latest)}</b></span>` : "") : "";
})();

// dark / light mode toggle (remembered on this device)
(() => {
  const btn = document.getElementById("theme"); if (!btn) return;
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';
  const apply = t => {
    document.documentElement.dataset.theme = t;
    btn.innerHTML = t === "dark" ? SUN : MOON;            // icon shows what you will switch to
    btn.title = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "dark" ? "#000000" : "#f3f6fc";
    const c = document.querySelector('meta[name="color-scheme"]'); if (c) c.content = t;
  };
  apply(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  btn.onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; apply(t); try { localStorage.setItem("pp-theme", t); } catch {} };
})();

// ---------- IPL 2027 predictions: playoff bracket, Orange Cap, Purple Cap ----------
(() => {
  const KEY = () => PPusers.key("pp-predict-2027");
  const blank = () => ({top4: [null, null, null, null], q1: null, el: null, q2: null, fin: null, orange: [null, null, null], orangeRuns: "", purple: [null, null, null], purpleWkts: ""});
  let S = blank(), cq = {orange: "", purple: ""}, copied = "", lu = PPusers.active().id;
  const live = n => { const q = n && R.players.find(x => x.name === n); return q && !q.released && !q.withdrawn ? n : null; };
  const reload = () => { lu = PPusers.active().id; cq = {orange: "", purple: ""}; try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY()) || "{}")); } catch { S = blank(); }
    S.orange = [0, 1, 2].map(i => live(S.orange && S.orange[i])); S.purple = [0, 1, 2].map(i => live(S.purple && S.purple[i])); };
  reload();
  const save = () => { try { localStorage.setItem(KEY(), JSON.stringify(S)); } catch {} };
  const col = t => (R.colors || {})[t] || "#2f6bff";
  const tn = t => t ? R.teams[t] : "";
  const chip = (t, extra = "") => `<span class="pt" style="--c:${col(t)};--ink:${ink(col(t))}"><b>${esc(t)}</b>${extra}</span>`;

  // keep the bracket consistent when an earlier pick changes
  function clean() {
    const [t1, t2, t3, t4] = S.top4;
    if (![t1, t2].includes(S.q1)) S.q1 = null;
    if (![t3, t4].includes(S.el)) S.el = null;
    const lq1 = S.q1 ? (S.q1 === t1 ? t2 : t1) : null;
    if (!(S.q2 && (S.q2 === lq1 || S.q2 === S.el))) S.q2 = null;
    if (!(S.fin && (S.fin === S.q1 || S.fin === S.q2))) S.fin = null;
  }
  const lost = (a, b, w) => w ? (w === a ? b : a) : null;

  function matchCard(title, sub, a, b, key) {
    const side = t => t ? `<button class="pm-t${S[key] === t ? " win" : ""}" data-k="${key}" data-t="${t}" style="--c:${col(t)};--ink:${ink(col(t))}"><b>${esc(t)}</b><small>${esc(tn(t))}</small>${S[key] === t ? "<i>✓</i>" : ""}</button>` : `<div class="pm-t tbd"><b>TBD</b></div>`;
    return `<div class="pm"><div class="pm-h"><b>${title}</b><small>${sub}</small></div>${side(a)}<div class="pm-vs">vs</div>${side(b)}</div>`;
  }

  // players ranked by recent form for the cap lists
  const formScore = (p, kind) => {
    const w = list(p.name, kind).slice(0, 8);
    if (!w.length) return -1;
    return kind === "bat" ? w.reduce((s, i) => s + i.runs, 0) / w.length : w.reduce((s, i) => s + i.wkts, 0) / w.length;
  };
  const formText = (p, kind) => {
    const w = list(p.name, kind).slice(0, 8);
    if (!w.length) return "no recent data";
    return kind === "bat" ? `${(w.reduce((s, i) => s + i.runs, 0) / w.length).toFixed(0)} runs/inns` : `${(w.reduce((s, i) => s + i.wkts, 0) / w.length).toFixed(1)} wkts/match`;
  };
  function capBlock(kind) {
    const orange = kind === "orange", key = orange ? "orange" : "purple", k = orange ? "bat" : "bowl";
    const picks = S[key], q = cq[key].trim().toLowerCase();
    let pool = R.players.filter(p => !p.withdrawn && !p.released && !picks.includes(p.name));
    pool = pool.filter(p => orange ? p.role !== "BOWL" : p.role !== "BAT" && p.role !== "WK");
    if (q) pool = R.players.filter(p => !p.withdrawn && !p.released && !picks.includes(p.name) && p.name.toLowerCase().includes(q));
    pool = pool.sort((x, y) => formScore(y, k) - formScore(x, k) || x.name.localeCompare(y.name)).slice(0, q ? 12 : 10);
    const slot = i => { const n = picks[i], p = n && R.players.find(x => x.name === n); const lab = ["Winner", "2nd", "3rd"][i];
      return `<li class="cp-s${p ? " has" : ""}${i === 0 ? " top" : ""}" data-dz="cap:${key}:${i}"${p ? ` data-dg="cap|${key}|${esc(p.name)}|${i}"` : ""}><span class="cp-r">${lab}</span>` + (p ?
        `<span class="cp-n"><b>${esc(p.name)}</b><small>${flag(p.country)}${chip(p.team)}</small></span><button data-rm="${key}:${i}" aria-label="Remove">✕</button>` : `<span class="cp-e">Tap a player below</span>`) + `</li>`; };
    const num = orange ? S.orangeRuns : S.purpleWkts;
    return `<section class="pcard ${orange ? "ora" : "pur"}"><div class="pc-h"><span class="cap-ic">${orange ? "OC" : "PC"}</span><div><h3>${orange ? "Orange Cap" : "Purple Cap"}</h3><p>${orange ? "Most runs in IPL 2027" : "Most wickets in IPL 2027"}</p></div></div>` +
      `<ol class="cp-slots">${[0, 1, 2].map(slot).join("")}</ol>` +
      `<label class="cp-num">Predicted ${orange ? "runs" : "wickets"} for the winner <input type="number" inputmode="numeric" min="0" max="${orange ? 1200 : 60}" data-num="${key}" value="${esc(num)}" placeholder="${orange ? "e.g. 780" : "e.g. 28"}"></label>` +
      `<input class="cp-q" data-q="${key}" placeholder="Search any ${orange ? "batter" : "bowler"}" value="${esc(cq[key])}" aria-label="Search players">` +
      `<div class="cp-h">${q ? "Search results" : "In form right now"}</div>` +
      `<ul class="cp-pool" data-dz="cappool:${key}">${pool.map(p => `<li><button data-pick="${key}" data-n="${esc(p.name)}" data-dg="cap|${key}|${esc(p.name)}|"><span><b>${esc(p.name)}</b><small>${flag(p.country)}${roleBadge(p.role)}${chip(p.team)}</small></span><em>${esc(formText(p, k))}</em></button></li>`).join("") || '<li class="cp-none">No players found</li>'}</ul></section>`;
  }

  function summary() {
    const ru = S.fin ? lost(S.q1, S.q2, S.fin) : null;
    const o = S.orange[0], p = S.purple[0];
    const row = (l, v) => `<div class="ps-r"><small>${l}</small><b>${v || '<span class="dim">–</span>'}</b></div>`;
    return `<section class="psum"><div class="ps-h"><h3>${esc(PPusers.list().length > 1 ? PPusers.active().name + "’s" : "My")} IPL 2027 predictions</h3><span><button class="b-act share" id="pshare">Share</button><button class="b-act" id="pcopy">${copied || "Copy"}</button><button class="b-act" id="pclr">Clear all</button></span></div>` +
      `<div class="ps-g">${row("Champion", S.fin ? chip(S.fin) + " " + esc(tn(S.fin)) : "")}${row("Runner-up", ru ? chip(ru) + " " + esc(tn(ru)) : "")}` +
      `${row("Orange Cap", o ? esc(o) + (S.orangeRuns ? ` · ${esc(S.orangeRuns)} runs` : "") : "")}${row("Purple Cap", p ? esc(p) + (S.purpleWkts ? ` · ${esc(S.purpleWkts)} wkts` : "") : "")}</div></section>`;
  }

  // Horizontal bracket: Qualifier 1 / Eliminator -> Qualifier 2 -> Final -> Champion, joined by lines
  const mob = () => window.innerWidth < 600;
  function treeHtml() {
    const [t1, t2, t3, t4] = S.top4, lq1 = S.q1 ? lost(t1, t2, S.q1) : null;
    const m = mob(), bw = m ? 72 : 150, gap = m ? 16 : 44, cw = m ? 64 : 150, rh = 34, lh = 16;
    const X = i => i * (bw + gap), W = 3 * (bw + gap) + cw, H = 222;
    const row = (k, t, seed, live) => t ? `<button class="tr-t${S[k] === t ? " win" : ""}" ${live ? `data-k="${k}" data-t="${t}" data-dg="win|${k}|${t}"` : "disabled"} style="--c:${col(t)};--ink:${ink(col(t))}">${seed ? `<i>${seed}</i>` : ""}<b>${esc(t)}</b>${m ? "" : `<small>${esc(tn(t))}</small>`}${S[k] === t ? "<em>✓</em>" : ""}</button>` : `<div class="tr-t tbd"><b>TBD</b></div>`;
    const box = (k, title, a, b, sa, sb, x, y) => `<div class="tr-m" data-dz="win:${k}" style="left:${x}px;top:${y}px;width:${bw}px"><div class="tr-l">${title}</div>${row(k, a, sa, a && b)}${row(k, b, sb, a && b)}</div>`;
    const ln = (x1, y1, x2, y2, on) => {
      const c = on ? " on" : "", xm = Math.round((x1 + x2) / 2);
      const h = (xa, xb, y) => `<i class="ln${c}" style="left:${xa}px;top:${y - 1}px;width:${xb - xa}px;height:2px"></i>`;
      if (y1 === y2) return h(x1, x2, y1);
      return h(x1, xm, y1) + `<i class="ln${c}" style="left:${xm - 1}px;top:${Math.min(y1, y2)}px;width:2px;height:${Math.abs(y2 - y1)}px"></i>` + h(xm, x2, y2);
    };
    const q1y = 0, ely = 130, q2y = 73, fy = 17, mid = y => y + lh + rh;           // right-edge mid of a box
    const lines =
      ln(X(0) + bw, mid(q1y), X(2), fy + lh + rh / 2, !!S.q1) +                         // Q1 winner straight to the final
      ln(X(0) + bw, 50, X(1), q2y + lh + rh / 2, !!S.q1) +                         // Q1 loser to Qualifier 2
      ln(X(0) + bw, 180, X(1), q2y + lh + rh + rh / 2, !!S.el) +                   // Eliminator winner to Qualifier 2
      ln(X(1) + bw, q2y + lh + rh, X(2), fy + lh + rh + rh / 2, !!S.q2) +          // Qualifier 2 winner to the final
      ln(X(2) + bw, fy + lh + rh, X(3), fy + lh + rh, !!S.fin);                    // Final winner to the champion
    const fc = S.fin ? col(S.fin) : null;
    const champ = `<div class="tr-c${S.fin ? " has" : ""}" data-dz="champ" style="left:${X(3)}px;top:${fy + lh + rh - 30}px;width:${cw}px;height:60px;${fc ? `--c:${fc};--ink:${ink(fc)}` : ""}"><small>Champion</small><b>${S.fin ? esc(S.fin) : "?"}</b>${!m && S.fin ? `<span>${esc(tn(S.fin))}</span>` : ""}</div>`;
    return `<div class="tree-wrap"><div class="tree" style="width:${W}px;height:${H}px">` + lines +
      box("q1", "Qualifier 1", t1, t2, t1 ? 1 : "", t2 ? 2 : "", X(0), q1y) + box("el", "Eliminator", t3, t4, t3 ? 3 : "", t4 ? 4 : "", X(0), ely) +
      box("q2", "Qualifier 2", lq1, S.el, "", "", X(1), q2y) + box("fin", "Final", S.q1, S.q2, "", "", X(2), fy) + champ + `</div></div>` +
      `<p class="tr-h">Tap a team in each match to pick the winner. Winners move along the lines.</p>`;
  }
  window.matchMedia("(max-width:599px)").addEventListener("change", () => { if (typeof team !== "undefined" && team === "PREDICT") render_(); });

  function render_() {
    const main = document.getElementById("teams"); if (!main) return;
    if (lu !== PPusers.active().id) reload();
    clean(); save();
    const [t1, t2, t3, t4] = S.top4, used = new Set(S.top4.filter(Boolean));
    const free = Object.keys(R.teams).filter(t => !used.has(t));
    const slot = i => { const t = S.top4[i];
      return `<li class="t4${t ? " has" : ""}" data-dz="t4:${i}" ${t ? `data-dg="team4|${t}|${i}" ` : ""}${t ? `style="--c:${col(t)};--ink:${ink(col(t))}"` : ""}><span class="t4-n">${i + 1}</span>` +
        (t ? `<b>${esc(t)}</b><small>${esc(tn(t))}</small><button data-rm4="${i}" aria-label="Remove">✕</button>` : `<span class="cp-e">Pick team ${i + 1}</span>`) + `</li>`; };
    const lq1 = S.q1 ? lost(t1, t2, S.q1) : null;
    main.innerHTML = `<div class="predict"><div class="b-head"><h2>IPL 2027 predictions</h2></div>` +
      `<p class="b-help"><b class="brag">No money. No prizes. Just bragging rights.</b> Make your calls for next season, saved on this device.</p>` + summary() +
      `<section class="pcard brk"><div class="pc-h"><span class="cap-ic tr">★</span><div><h3>Playoff bracket</h3><p>Choose your top 4 in table order, then pick every winner</p></div></div>` +
      `<h4>1. Your top 4 (1st to 4th)</h4><ol class="t4s">${[0, 1, 2, 3].map(slot).join("")}</ol>` +
      `<div class="t4-pool" data-dz="t4pool">${free.map(t => `<button data-add="${t}" data-dg="team4|${t}|" style="--c:${col(t)};--ink:${ink(col(t))}">${esc(t)}</button>`).join("") || '<small class="dim">All four spots are filled.</small>'}</div>` +
      `<h4>2. Pick the winners</h4>` + treeHtml() + `</section>` +
      `<div class="pgrid">${capBlock("orange")}${capBlock("purple")}</div></div>`;
    wire(main);
    PPusers.mount(main, () => window.render());
  }

  function wire(main) {
    main.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { const i = S.top4.indexOf(null); if (i >= 0) { S.top4[i] = b.dataset.add; render_(); } });
    main.querySelectorAll("[data-rm4]").forEach(b => b.onclick = () => { S.top4[+b.dataset.rm4] = null; render_(); });
    main.querySelectorAll(".tr-t[data-k], .pm-t[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k; S[k] = S[k] === b.dataset.t ? null : b.dataset.t; render_(); });
    main.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { const k = b.dataset.pick, i = S[k].indexOf(null); if (i >= 0) { S[k][i] = b.dataset.n; render_(); } });
    main.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split(":"); S[k][+i] = null; render_(); });
    main.querySelectorAll("[data-num]").forEach(inp => inp.oninput = () => { S[inp.dataset.num === "orange" ? "orangeRuns" : "purpleWkts"] = inp.value; save(); });
    main.querySelectorAll("[data-num]").forEach(inp => inp.onchange = () => render_());
    main.querySelectorAll("[data-q]").forEach(inp => inp.oninput = () => { cq[inp.dataset.q] = inp.value; const k = inp.dataset.q, pos = inp.selectionStart; render_(); const n = document.querySelector(`[data-q="${k}"]`); n.focus(); n.setSelectionRange(pos, pos); });
    main.querySelector("#pshare").onclick = () => window.PPshare.predict(S);
    main.querySelector("#pclr").onclick = () => { S = blank(); cq = {orange: "", purple: ""}; render_(); };
    main.querySelector("#pcopy").onclick = () => {
      const ru = S.fin ? lost(S.q1, S.q2, S.fin) : null;
      const t = `${PPusers.list().length > 1 ? PPusers.active().name + "’s" : "My"} IPL 2027 predictions\nTop 4: ${S.top4.map(x => x || "-").join(", ")}\nChampion: ${S.fin ? tn(S.fin) : "-"}\nRunner-up: ${ru ? tn(ru) : "-"}\nOrange Cap: ${S.orange[0] || "-"}${S.orangeRuns ? " (" + S.orangeRuns + " runs)" : ""}\nPurple Cap: ${S.purple[0] || "-"}${S.purpleWkts ? " (" + S.purpleWkts + " wkts)" : ""}`;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { copied = "Copied ✓"; render_(); setTimeout(() => { copied = ""; if (team === "PREDICT") render_(); }, 1800); }, () => { copied = "Copy unavailable"; render_(); });
    };
  }
  // ---- Drag and drop for every field (mouse and touch). Tap still works everywhere. ----
  const FEEDS = {q1: ["fin"], el: ["q2"], q2: ["fin"], fin: []};
  const parseDg = s => { const p = s.split("|"); return p[0] === "team4" ? {t: "team4", team: p[1], from: p[2] === "" ? null : +p[2]}
    : p[0] === "win" ? {t: "win", k: p[1], team: p[2]} : {t: "cap", kind: p[1], name: p[2], from: p[3] === "" ? null : +p[3]}; };
  const accepts = (z, d) => {
    const p = z.split(":");
    if (p[0] === "t4") return d.t === "team4";
    if (p[0] === "t4pool") return d.t === "team4" && d.from != null;
    if (p[0] === "cap") return d.t === "cap" && d.kind === p[1];
    if (p[0] === "cappool") return d.t === "cap" && d.kind === p[1] && d.from != null;
    if (p[0] === "win") return d.t === "win" && (d.k === p[1] || (FEEDS[d.k] || []).includes(p[1]));
    if (p[0] === "champ") return d.t === "win" && d.k === "fin";
    return false;
  };
  const dropOn = (z, d) => {
    const p = z.split(":");
    if (p[0] === "t4") { const i = +p[1]; if (d.from != null) { const x = S.top4[i]; S.top4[i] = d.team; S.top4[d.from] = x; } else S.top4[i] = d.team; }
    else if (p[0] === "t4pool") S.top4[d.from] = null;
    else if (p[0] === "cap") { const i = +p[2], arr = S[d.kind]; if (d.from != null) { const x = arr[i]; arr[i] = d.name; arr[d.from] = x; } else arr[i] = d.name; }
    else if (p[0] === "cappool") S[d.kind][d.from] = null;
    else if (p[0] === "win") S[d.k] = d.team;
    else if (p[0] === "champ") S.fin = d.team;
    render_();
  };
  (() => {
    let st = null, suppress = false;
    const stop = () => { if (!st) return; clearTimeout(st.timer); if (st.ghost) st.ghost.remove(); document.body.classList.remove("dnd"); document.querySelectorAll(".dz-ok,.dz-over,.dg-src").forEach(e => e.classList.remove("dz-ok", "dz-over", "dg-src")); st = null; };
    const begin = () => {
      const el = st.el, r = el.getBoundingClientRect();
      st.on = true; st.ghost = el.cloneNode(true); st.ghost.removeAttribute("data-dg"); st.ghost.removeAttribute("data-dz");
      st.ghost.classList.add("dg-ghost"); st.ghost.style.cssText += `;position:fixed;left:0;top:0;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none;z-index:300;transform:translate(${st.x - st.dx}px,${st.y - st.dy}px) scale(1.04)`;
      document.body.appendChild(st.ghost); el.classList.add("dg-src"); document.body.classList.add("dnd");
      document.querySelectorAll("[data-dz]").forEach(z => { if (accepts(z.dataset.dz, st.d)) z.classList.add("dz-ok"); });
      if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
    };
    const move = e => {
      if (!st || e.pointerId !== st.id) return;
      st.x = e.clientX; st.y = e.clientY;
      if (!st.on) { if (Math.hypot(st.x - st.sx, st.y - st.sy) > (st.touch ? 10 : 5)) { if (st.touch) return stop(); begin(); } else return; }
      e.preventDefault();
      st.ghost.style.transform = `translate(${st.x - st.dx}px,${st.y - st.dy}px) scale(1.04)`;
      document.querySelectorAll(".dz-over").forEach(z => z.classList.remove("dz-over"));
      const z = document.elementFromPoint(st.x, st.y); const t = z && z.closest("[data-dz].dz-ok"); if (t) t.classList.add("dz-over");
      const h = window.innerHeight; if (st.y < 70) window.scrollBy(0, -14); else if (st.y > h - 70) window.scrollBy(0, 14);
    };
    const up = e => {
      if (!st || e.pointerId !== st.id) return;
      if (st.on) { const z = document.elementFromPoint(e.clientX, e.clientY), t = z && z.closest("[data-dz].dz-ok"); const d = st.d; suppress = true; setTimeout(() => suppress = false, 60); stop(); if (t) dropOn(t.dataset.dz, d); } else stop();
    };
    document.addEventListener("pointerdown", e => {
      if (e.button > 0) return; const el = e.target.closest(".predict [data-dg]"); if (!el || st) return;
      const r = el.getBoundingClientRect(), touch = e.pointerType === "touch";
      st = {id: e.pointerId, el, d: parseDg(el.dataset.dg), sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, touch, on: false};
      if (touch) st.timer = setTimeout(() => { if (st && !st.on) begin(); }, 260);
    }, true);
    document.addEventListener("pointermove", move, {passive: false});
    document.addEventListener("pointerup", up); document.addEventListener("pointercancel", () => stop());
    document.addEventListener("touchmove", e => { if (st && st.on) e.preventDefault(); }, {passive: false});
    document.addEventListener("click", e => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener("contextmenu", e => { if (st && st.on) e.preventDefault(); });
  })();

  window.renderPredict = render_;
})();

// ---- Compare: every player's picks side by side ----
(() => {
  const blankP = () => ({top4: [null, null, null, null], q1: null, el: null, q2: null, fin: null, orange: [null, null, null], orangeRuns: "", purple: [null, null, null], purpleWkts: ""});
  const liveN = n => { const q = n && R.players.find(x => x.name === n); return q && !q.released && !q.withdrawn ? n : null; };
  const readP = id => { let p; try { p = Object.assign(blankP(), JSON.parse(localStorage.getItem(PPusers.key("pp-predict-2027", id)) || "{}")); } catch { p = blankP(); }
    p.orange = [0, 1, 2].map(i => liveN(p.orange && p.orange[i])); p.purple = [0, 1, 2].map(i => liveN(p.purple && p.purple[i])); return p; };
  const readX = (id, t) => { try { const x = JSON.parse(localStorage.getItem(PPusers.key("ipl-xii-" + t, id)) || "null"); return Array.isArray(x) && x.length === 12 && x.some(Boolean) ? x : null; } catch { return null; } };
  const col = t => (R.colors || {})[t] || "#2f6bff";
  const chip = t => t ? `<span class="pt" style="--c:${col(t)};--ink:${ink(col(t))}"><b>${esc(t)}</b></span>` : '<span class="dim">–</span>';
  const pl = (n, extra) => n ? `<b class="cmp-n">${esc(n)}</b>${extra ? `<small>${esc(extra)}</small>` : ""}` : '<span class="dim">–</span>';
  const head = us => `<thead><tr><th></th>${us.map(u => `<th><span class="cmp-u" style="--c:${u.c};--ink:${ink(u.c)}"><i>${esc(PPusers.ini(u.name))}</i>${esc(u.name)}</span></th>`).join("")}</tr></thead>`;
  let tab = "pred", ct = null;

  const pinfo = n => R.players.find(x => x.name === n);
  const planeI = '<svg class="plane" viewBox="0 0 24 24" role="img" aria-label="Overseas player"><title>Overseas player</title><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
  const capCell = (cls, unit) => (v, p) => {
    if (!v) return '<span class="dim">–</span>';
    const q = pinfo(v), num = cls === "ora" ? p.orangeRuns : p.purpleWkts;
    return `<div class="cap-c"><b class="cmp-n">${esc(v)}</b><span class="cap-m">${q ? flag(q.country) + chip(q.team) : ""}</span>` +
      (num ? `<span class="cap-v ${cls}"><b>${esc(num)}</b> ${unit}</span>` : `<span class="cap-v none">no ${unit} guess</span>`) + `</div>`;
  };
  const champ = v => v ? `<span class="cmp-champ">${chip(v)}<small>${esc(R.teams[v] || "")}</small></span>` : '<span class="dim">–</span>';

  function predTable(us) {
    const P = us.map(u => readP(u.id));
    const runner = p => p.fin && p.q1 && p.q2 ? (p.fin === p.q1 ? p.q2 : p.q1) : null;
    const groups = [
      ["Final standings", [
        ...["1st", "2nd", "3rd", "4th"].map((l, i) => [l + " place", p => p.top4[i], chip]),
        ["Champion", p => p.fin, champ, "gold"], ["Runner-up", runner, champ]]],
      ["Caps", [
        ["Orange Cap", p => p.orange[0], capCell("ora", "runs")], ["Purple Cap", p => p.purple[0], capCell("pur", "wkts")]]]];
    const rows = groups.flatMap(g => g[1]);
    let agree = 0;
    const body = groups.map(([title, rs]) => `<tr class="sec"><th colspan="${us.length + 1}">${title}</th></tr>` + rs.map(([label, get, cell, kind]) => {
      const v = P.map(get), same = v.every(Boolean) && v.every(x => x === v[0]);
      if (same) agree++;
      return `<tr class="${same ? "agree" : ""}${kind ? " " + kind : ""}"><th>${label}${same ? "<small>✓ agree</small>" : ""}</th>${v.map((x, i) => `<td>${cell(x, P[i])}</td>`).join("")}</tr>`;
    }).join("")).join("");
    const filled = P.map(p => rows.filter(([, get]) => get(p)).length);
    const empty = us.filter((u, i) => !filled[i]).map(u => u.name);
    return `<p class="cmp-sum">${agree ? `You all agree on <b>${agree}</b> of ${rows.length} calls.` : "No calls match yet."}${empty.length ? ` ${esc(empty.join(", "))} ${empty.length > 1 ? "haven't" : "hasn't"} made predictions yet.` : ""}</p>` +
      `<div class="cmp-wrap"><table class="cmp" style="--n:${us.length}">${head(us)}<tbody>${body}</tbody></table></div>`;
  }

  function xiTable(us) {
    const teams = Object.keys(R.teams).filter(t => us.some(u => readX(u.id, t)));
    if (!teams.length) return '<p class="cmp-sum">Nobody has built a XII yet. Pick Build XII, choose a team and add players. Each player\'s XII is saved under their own name.</p>';
    if (!ct || !teams.includes(ct)) ct = teams.includes(window.buildTeam) ? window.buildTeam : teams[0];
    const X = us.map(u => readX(u.id, ct)), have = X.filter(Boolean);
    const sets = have.map(x => new Set(x.filter(Boolean)));
    const common = have.length > 1 ? [...sets[0]].filter(n => sets.every(s => s.has(n))) : [];
    const pills = `<div class="b-teams cmp-teams">${teams.map(t => `<button type="button" class="${t === ct ? "on" : ""}" data-ct="${t}" style="--c:${col(t)};--ink:${ink(col(t))}">${t}</button>`).join("")}</div>`;
    const rows = Array.from({length: 12}, (_, i) => `<tr class="${i === 11 ? "imp" : ""}"><th>${i === 11 ? "Impact" : i + 1}</th>${X.map(x => { const n = x && x[i];
      return `<td class="${n && common.includes(n) ? "common" : ""}">${n ? `<span class="xi-n"><b class="cmp-n">${esc(n)}</b>${(q => q && (q.country || "in") !== "in" ? planeI : "")(pinfo(n))}</span>` : '<span class="dim">–</span>'}</td>`; }).join("")}</tr>`).join("");
    const missing = us.filter((u, i) => !X[i]).map(u => u.name);
    return pills + `<p class="cmp-sum">${have.length > 1 ? `<b>${common.length}</b> of 12 players picked by everyone who built a ${esc(R.teams[ct])} XII.` : `Only one ${esc(R.teams[ct])} XII so far.`}${missing.length ? ` ${esc(missing.join(", "))} ${missing.length > 1 ? "haven't" : "hasn't"} built one for this team.` : ""}</p>` +
      `<div class="cmp-wrap"><table class="cmp" style="--n:${us.length}">${head(us)}<tbody>${rows}</tbody></table></div>`;
  }

  window.renderCompare = () => {
    const main = document.getElementById("teams"), us = PPusers.everyone();
    main.innerHTML = `<div class="cmp-page"><div class="b-head"><h2>Compare picks</h2><div class="b-teams cmp-tabs" style="--c:var(--primary);--ink:#fff">` +
      `<button type="button" class="${tab === "pred" ? "on" : ""}" data-tab="pred">Predictions</button><button type="button" class="${tab === "xii" ? "on" : ""}" data-tab="xii">Playing XII</button></div></div>` +
      `<p class="b-help">Everyone's picks side by side: players on this device, and friends who sent you a link. Switch player in Build XII or Predict 2027 to change your own picks.</p>` +
      (tab === "pred" ? predTable(us) : xiTable(us)) + window.PPfriends.panel() + `</div>`;
    window.PPfriends.wire(main, () => window.renderCompare());
    main.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab; window.renderCompare(); });
    main.querySelectorAll("[data-ct]").forEach(b => b.onclick = () => { ct = b.dataset.ct; window.renderCompare(); });
  };
})();

// ---- Friends: share picks as a link (nothing is stored on a server) and add friends' links to Compare ----
(() => {
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const b64d = t => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/")))));
  const blank = () => ({top4: [null, null, null, null], q1: null, el: null, q2: null, fin: null, orange: [null, null, null], orangeRuns: "", purple: [null, null, null], purpleWkts: ""});
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  const hasP = p => p.top4.some(Boolean) || p.fin || p.orange.some(Boolean) || p.purple.some(Boolean);
  const mine = () => {
    const u = PPusers.active(), p = Object.assign(blank(), rd(PPusers.key("pp-predict-2027", u.id)) || {}), x = {};
    Object.keys(R.teams).forEach(t => { const v = rd(PPusers.key("ipl-xii-" + t, u.id)); if (Array.isArray(v) && v.length === 12 && v.some(Boolean)) x[t] = v; });
    return {u, p, x, any: hasP(p) || Object.keys(x).length > 0};
  };
  const link = () => { const m = mine(); return location.origin + location.pathname + "#join=" + b64e({v: 1, n: m.u.name, p: m.p, x: m.x}); };
  const tm = t => t && R.teams[t] ? t : null;
  const pn = n => { const q = R.players.find(p => p.name === n); return q ? q.name : null; };
  const clean = j => {          // anything arriving from a link is checked before it is stored
    if (!j || typeof j !== "object" || !j.p) return null;
    const p = blank(), a = j.p;
    p.top4 = [0, 1, 2, 3].map(i => tm(a.top4 && a.top4[i])); ["q1", "el", "q2", "fin"].forEach(k => { p[k] = tm(a[k]); });
    p.orange = [0, 1, 2].map(i => pn(a.orange && a.orange[i])); p.purple = [0, 1, 2].map(i => pn(a.purple && a.purple[i]));
    p.orangeRuns = String(a.orangeRuns || "").replace(/\D/g, "").slice(0, 5); p.purpleWkts = String(a.purpleWkts || "").replace(/\D/g, "").slice(0, 3);
    const x = {};
    Object.entries(j.x || {}).forEach(([t, v]) => { if (R.teams[t] && Array.isArray(v) && v.length === 12) x[t] = v.map(n => (typeof n === "string" ? pn(n) : null)); });
    return {n: String(j.n || "Friend").replace(/[<>]/g, "").trim().slice(0, 14) || "Friend", p, x};
  };
  const parse = text => {
    const m = String(text || "").match(/join=([A-Za-z0-9_-]+)/) || String(text || "").trim().match(/^([A-Za-z0-9_-]{20,})$/);
    if (!m) return null; try { return clean(b64d(m[1])); } catch { return null; }
  };
  const summary = j => {
    const bits = []; if (j.p.fin) bits.push("champion " + j.p.fin); if (j.p.orange[0]) bits.push("Orange Cap " + j.p.orange[0]); if (j.p.purple[0]) bits.push("Purple Cap " + j.p.purple[0]);
    const n = Object.keys(j.x).length; if (n) bits.push(n + " playing XII" + (n === 1 ? "" : "s"));
    return bits.join(" · ") || "no picks yet";
  };
  const add = j => { const u = PPusers.addFriend(j.n, j.p, j.x); return u; };
  const toast = (box, msg, bad) => { box.textContent = msg; box.className = "fr-msg" + (bad ? " bad" : ""); };

  window.PPfriends = {
    panel() {
      const m = mine(), fr = PPusers.everyone().filter(u => u.f);
      return `<section class="fr"><h3>Play with friends</h3>` +
        `<p>Send your picks as a link. Your friend opens it and your predictions and playing XIs appear in their Compare tab. Their picks come to you the same way. Everything stays on each person's own phone.</p>` +
        (m.any ? `<div class="fr-row"><button type="button" class="fr-b main" data-fr="share">Share my picks</button><a class="fr-b" data-fr="wa" target="_blank" rel="noopener">WhatsApp</a><button type="button" class="fr-b" data-fr="copy">Copy link</button></div>`
          : `<p class="fr-note">Make some picks first (Predict 2027 or Build XII), then you can share them from here.</p>`) +
        `<form class="fr-join" data-fr="join"><input name="l" placeholder="Paste a friend's link here" aria-label="Friend's link" autocomplete="off"><button class="fr-b main">Add friend</button></form>` +
        `<div class="fr-msg" role="status"></div>` +
        (fr.length ? `<div class="fr-list">${fr.map(u => `<span class="fr-chip" style="--c:${u.c};--ink:${ink(u.c)}"><i>${esc(PPusers.ini(u.name))}</i>${esc(u.name)}<button type="button" data-fr="rm" data-id="${u.id}" aria-label="Remove ${esc(u.name)}">×</button></span>`).join("")}</div>` : "") + `</section>`;
    },
    wire(root, again) {
      const msg = root.querySelector(".fr-msg"), wa = root.querySelector('[data-fr="wa"]');
      const text = () => `${mine().u.name} wants to compare IPL 2027 predictions on Powerplay. Open this to see my picks and add yours:\n${link()}`;
      if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(text());
      const sh = root.querySelector('[data-fr="share"]');
      if (sh) sh.onclick = async () => { try { if (navigator.share) { await navigator.share({title: "Powerplay picks", text: `${mine().u.name}'s IPL 2027 picks`, url: link()}); return; } } catch { return; } copy(); };
      const copy = async () => { try { await navigator.clipboard.writeText(link()); toast(msg, "Link copied. Paste it into a message to your friend."); } catch { window.prompt("Copy this link", link()); } };
      const cp = root.querySelector('[data-fr="copy"]'); if (cp) cp.onclick = copy;
      const jf = root.querySelector('[data-fr="join"]');
      if (jf) jf.onsubmit = e => { e.preventDefault(); const j = parse(jf.l.value); if (!j) return toast(msg, "That doesn't look like a Powerplay link. Paste the whole link your friend sent.", true);
        if (!add(j)) return toast(msg, "You already have the maximum number of friends. Remove one first.", true); again(); };
      root.querySelectorAll('[data-fr="rm"]').forEach(b => b.onclick = () => { PPusers.removeFriend(b.dataset.id); again(); });
    },
    open() {      // a friend's link was opened: ask before adding
      const m = location.hash.match(/join=([A-Za-z0-9_-]+)/); if (!m) return;
      const j = parse(m[0]), clear = () => { try { history.replaceState(null, "", location.pathname + location.search); } catch {} };
      if (!j) { clear(); return; }
      const ov = document.createElement("div"); ov.className = "fr-ov";
      const have = PPusers.everyone().some(u => u.f && u.name.toLowerCase() === j.n.toLowerCase());
      ov.innerHTML = `<div class="fr-card" role="dialog" aria-modal="true"><h3>${esc(j.n)} shared their picks</h3><p>${esc(summary(j))}</p><p class="fr-s">${have ? "This replaces the picks you saved earlier from " + esc(j.n) + "." : "They will show up in your Compare tab."}</p><div class="fr-row"><button type="button" class="fr-b main" data-a="y">${have ? "Update" : "Add to Compare"}</button><button type="button" class="fr-b" data-a="n">Not now</button></div></div>`;
      document.body.appendChild(ov);
      ov.onclick = e => { const a = e.target.closest("[data-a]"); if (!a && e.target !== ov) return; ov.remove(); clear();
        if (a && a.dataset.a === "y") { add(j); team = "COMPARE"; render(); window.scrollTo(0, 0); } };
    }
  };
  setTimeout(() => window.PPfriends.open(), 60);
  window.addEventListener("hashchange", () => window.PPfriends.open());
})();

// ---------- Share cards: render a picture of the XII or the predictions, then share or download it ----------
(() => {
  const W = 1080, H = 1350, PAD = 64;
  const font = (w, s) => `${w} ${s}px Sora, system-ui, -apple-system, sans-serif`;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (h, f) => "rgb(" + rgb(h).map(v => Math.round(v * f)).join(",") + ")";
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const fit = (c, t, max) => { t = String(t); if (c.measureText(t).width <= max) return t; while (t.length > 2 && c.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; };
  const text = (c, t, x, y, f, fill, align = "left", max) => { c.font = f; c.fillStyle = fill; c.textAlign = align; c.textBaseline = "alphabetic"; c.fillText(max ? fit(c, t, max) : t, x, y); };
  const col = t => (R.colors || {})[t] || "#2f6bff";
  const RL = {BAT: "BAT", WK: "WK", AR: "AR", BOWL: "BOWL"};
  const byName = n => R.players.find(p => p.name === n);

  function drawXII(c, team, slots) {
    const cc = col(team);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(cc, .62)); g.addColorStop(1, shade(cc, .16));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = cc; c.fillRect(0, 0, W, 14);
    text(c, "POWERPLAY", PAD, 96, font(800, 26), "rgba(255,255,255,.7)");
    text(c, R.teams[team], PAD, 178, font(800, 62), "#fff", "left", W - PAD * 2);
    text(c, (PPusers.list().length > 1 ? PPusers.active().name.toUpperCase() + "’S" : "MY") + " PLAYING XII", PAD, 228, font(700, 28), cc === "#000000" ? "#fff" : "rgba(255,255,255,.85)");
    const row = (i, y, label, n, imp) => {
      const p = n && byName(n);
      c.fillStyle = imp ? "rgba(255,213,74,.20)" : "rgba(0,0,0,.30)"; rr(c, PAD, y, W - PAD * 2, 68, 18); c.fill();
      c.fillStyle = imp ? "#ffd54a" : cc; c.beginPath(); c.arc(PAD + 40, y + 34, 22, 0, Math.PI * 2); c.fill();
      text(c, label, PAD + 40, y + 44, font(800, 24), imp ? "#1a2233" : ink(cc), "center");
      if (!p) { text(c, "—", PAD + 88, y + 45, font(600, 32), "rgba(255,255,255,.4)"); return; }
      const nm = p.name + (p.captain ? "  (C)" : "");
      text(c, nm, PAD + 88, y + 45, font(700, 33), "#fff", "left", 600);
      const os = (p.country || "in") !== "in";
      text(c, (RL[p.role] || "") + (os ? "  ·  OS" : ""), W - PAD - 28, y + 44, font(700, 24), "rgba(255,255,255,.75)", "right");
    };
    for (let i = 0; i < 11; i++) row(i, 262 + i * 76, String(i + 1), slots[i]);
    text(c, "IMPACT PLAYER", PAD, 1136, font(800, 22), "#ffd54a");
    row(11, 1152, "IP", slots[11], true);
    const os = slots.map(n => n && byName(n)).filter(p => p && (p.country || "in") !== "in").length;
    text(c, `Overseas ${os} / 4  ·  powerplay`, PAD, 1296, font(600, 24), "rgba(255,255,255,.6)");
  }

  function drawPredict(c, S) {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#2a1450"); g.addColorStop(.55, "#0a0a0c"); g.addColorStop(1, "#3a2000");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const bar = c.createLinearGradient(0, 0, W, 0); bar.addColorStop(0, "#ff9f1c"); bar.addColorStop(1, "#8e44ff");
    c.fillStyle = bar; c.fillRect(0, 0, W, 14);
    text(c, "POWERPLAY", PAD, 96, font(800, 26), "rgba(255,255,255,.7)");
    text(c, (PPusers.list().length > 1 ? PPusers.active().name + "’s" : "My") + " IPL 2027 predictions", PAD, 172, font(800, 56), "#fff", "left", W - PAD * 2);
    // champion banner
    const f = S.fin, runner = f ? (f === S.q1 ? S.q2 : S.q1) : null;
    const cc = f ? col(f) : "#444";
    const cg = c.createLinearGradient(0, 0, W, 0); cg.addColorStop(0, cc); cg.addColorStop(1, shade(cc, .5));
    c.fillStyle = cg; rr(c, PAD, 210, W - PAD * 2, 200, 28); c.fill();
    const ci = f ? ink(cc) : "#fff";
    text(c, "CHAMPION", PAD + 40, 262, font(800, 24), ci);
    text(c, f ? R.teams[f] : "Not picked yet", PAD + 40, 336, font(800, 58), ci, "left", W - PAD * 2 - 80);
    text(c, runner ? "Runner-up: " + R.teams[runner] : "", PAD + 40, 385, font(600, 28), ci);
    // top 4
    text(c, "PLAYOFF FOUR", PAD, 470, font(800, 22), "rgba(255,255,255,.6)");
    const tw = (W - PAD * 2 - 3 * 16) / 4;
    S.top4.forEach((t, i) => {
      const x = PAD + i * (tw + 16), k = t ? col(t) : "#333";
      c.fillStyle = k; rr(c, x, 490, tw, 120, 20); c.fill();
      text(c, String(i + 1), x + 20, 530, font(800, 24), t ? ink(k) : "#999");
      text(c, t || "—", x + tw / 2, 584, font(800, 44), t ? ink(k) : "#999", "center");
    });
    // caps
    const cap = (y, label, arr, num, unit, k1, k2) => {
      c.fillStyle = "rgba(255,255,255,.07)"; rr(c, PAD, y, W - PAD * 2, 300, 28); c.fill();
      c.fillStyle = k1; rr(c, PAD, y, 14, 300, 7); c.fill();
      text(c, label.toUpperCase(), PAD + 44, y + 56, font(800, 24), k2);
      text(c, arr[0] || "Not picked yet", PAD + 44, y + 128, font(800, 56), arr[0] ? "#fff" : "rgba(255,255,255,.4)", "left", W - PAD * 2 - 88);
      if (arr[0] && num) text(c, num + " " + unit + " (predicted)", PAD + 44, y + 176, font(600, 28), "rgba(255,255,255,.75)");
      text(c, "2nd  " + (arr[1] || "—"), PAD + 44, y + 232, font(600, 30), "rgba(255,255,255,.85)", "left", W - PAD * 2 - 88);
      text(c, "3rd  " + (arr[2] || "—"), PAD + 44, y + 274, font(600, 30), "rgba(255,255,255,.85)", "left", W - PAD * 2 - 88);
    };
    cap(650, "Orange Cap", S.orange, S.orangeRuns, "runs", "#ff8a00", "#ffb04a");
    cap(970, "Purple Cap", S.purple, S.purpleWkts, "wickets", "#8e44ff", "#c19bff");
    text(c, "No money. Just bragging rights.", W / 2, 1316, font(700, 26), "rgba(255,255,255,.7)", "center");
  }

  async function make(draw) {
    try { await Promise.all([document.fonts.load("700 20px Sora"), document.fonts.load("800 20px Sora")]); } catch {}
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"); draw(c);
    return new Promise(res => cv.toBlob(res, "image/png"));
  }

  function show(blob, name) {
    const old = document.getElementById("shareov"); if (old) old.remove();
    const url = URL.createObjectURL(blob), file = new File([blob], name, {type: "image/png"});
    const can = !!(navigator.canShare && navigator.canShare({files: [file]}));
    const ov = document.createElement("div"); ov.id = "shareov";
    ov.innerHTML = `<div class="sh-box"><img src="${url}" alt="Share card preview"><div class="sh-act">${can ? '<button class="sh-go" id="shgo">Share</button>' : ""}<a class="sh-dl" id="shdl" href="${url}" download="${name}">Download</a><button class="sh-x" id="shx">Close</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); URL.revokeObjectURL(url); };
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector("#shx").onclick = close;
    const go = ov.querySelector("#shgo"); if (go) go.onclick = () => navigator.share({files: [file], title: "Powerplay"}).catch(() => {});
  }

  const run = async (draw, name) => { try { const b = await make(draw); if (b) show(b, name); } catch (e) { console.error(e); } };
  window.PPshare = {
    xii: (team, slots) => run(c => drawXII(c, team, slots), "powerplay-" + team.toLowerCase() + "-xii.png"),
    predict: S => run(c => drawPredict(c, S), "powerplay-ipl-2027-predictions.png"),
    _draw: {xii: drawXII, predict: drawPredict}
  };
})();

// ---------- Quote of the day, tied to "on this day" in cricket history ----------
(() => {
  // Short quotes, each credited to a cricketer by multiple sources. Add more here any time.
  const Q = [
    ["Whatever level you reach, getting better never stops.", "Sachin Tendulkar"],
    ["Keep it simple and just go out and play.", "Shane Warne"],
    ["I have failed at times, but I never stopped trying.", "Rahul Dravid"],
    ["I was always fiercely determined and driven to succeed.", "Ricky Ponting"],
    ["Frankly speaking, I don't understand Duckworth Lewis. I just wait for the umpire's decision.", "MS Dhoni"],
    ["When people throw stones at you, you turn them into milestones.", "Sachin Tendulkar"],
    ["I have always tried to move on from disappointments as fast as I can.", "Shane Warne"],
    ["I have never tried to compare myself to anyone else.", "Sachin Tendulkar"],
    ["You can't afford to live your life with regrets.", "Shane Warne"],
    ["Never give up; just absolutely never give up.", "Shane Warne"]
  ];
  // Landmark days in cricket history, keyed by month-day. "who" picks a matching quote when we have one.
  const EV = {
    "01-05": [1971, "The first one-day international is played, at the MCG in Melbourne."],
    "01-11": [1973, "Rahul Dravid is born in Indore.", "Rahul Dravid"],
    "02-07": [1999, "Anil Kumble takes all 10 wickets in a Test innings against Pakistan in Delhi."],
    "02-24": [2010, "Sachin Tendulkar scores the first double century in men's ODI cricket, in Gwalior.", "Sachin Tendulkar"],
    "03-15": [1877, "The first Test match begins, Australia v England in Melbourne."],
    "04-02": [2011, "India win the ODI World Cup at the Wankhede in Mumbai."],
    "04-12": [2004, "Brian Lara scores 400 not out against England in Antigua, a Test record."],
    "04-18": [2008, "The first IPL match is played in Bengaluru."],
    "04-24": [1973, "Sachin Tendulkar is born in Mumbai.", "Sachin Tendulkar"],
    "06-04": [1993, "Shane Warne bowls the 'Ball of the Century' to Mike Gatting at Old Trafford.", "Shane Warne"],
    "06-25": [1983, "India win the World Cup at Lord's."],
    "07-07": [1981, "MS Dhoni is born in Ranchi.", "MS Dhoni"],
    "08-14": [1948, "Don Bradman plays his final Test innings at The Oval, finishing on 99.94."],
    "08-15": [2020, "MS Dhoni announces his retirement from international cricket.", "MS Dhoni"],
    "08-27": [1908, "Don Bradman is born in Cootamundra, New South Wales."],
    "09-13": [1969, "Shane Warne is born in Melbourne.", "Shane Warne"],
    "09-24": [2007, "India win the first T20 World Cup, in Johannesburg."],
    "11-05": [1988, "Virat Kohli is born in Delhi."],
    "11-15": [1989, "Sachin Tendulkar makes his Test debut, aged 16, in Karachi.", "Sachin Tendulkar"],
    "12-19": [1974, "Ricky Ponting is born in Launceston.", "Ricky Ponting"]
  };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let shown = "";
  function dayQuote() {
    const d = new Date(), mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0"), key = mm + "-" + dd;
    if (key === shown && document.getElementById("dayq")) return;
    shown = key;
    const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), ev = EV[key];
    const mine = ev && ev[2] ? Q.filter(q => q[1] === ev[2]) : [];
    const q = mine.length ? mine[doy % mine.length] : Q[doy % Q.length];
    let box = document.getElementById("dayq");
    if (!box) { box = document.createElement("aside"); box.id = "dayq"; const f = document.getElementById("note"); f.parentNode.insertBefore(box, f); }
    box.innerHTML = `<small>${ev ? "On this day" : "Quote of the day"} · ${d.getDate()} ${MON[d.getMonth()]}</small>` +
      (ev ? `<p class="dq-ev"><b>${ev[0]}</b> ${esc(ev[1])}</p>` : "") +
      `<blockquote><em>“${esc(q[0])}”</em><cite>${esc(q[1])}</cite></blockquote>`;
  }
  dayQuote(); setInterval(dayQuote, 60000);
})();

// Tapping the "Powerplay" title always returns to Home
(() => {
  const h = document.querySelector("header h1"); if (!h) return;
  h.setAttribute("role", "link"); h.setAttribute("tabindex", "0"); h.setAttribute("aria-label", "Powerplay, go to Home"); h.classList.add("home-link");
  const go = () => { const q = document.getElementById("q"); if (q) q.value = ""; if (typeof sgHide === "function") sgHide(); team = "HOME"; render(); window.scrollTo({top: 0, behavior: "smooth"}); };
  h.onclick = go; h.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
})();
