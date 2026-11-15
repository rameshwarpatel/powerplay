#!/usr/bin/env python3
"""Download match scorecards from CricketData.org (CricAPI) and rebuild data/form.js.

Sources of matches, in priority order:
  1. every tournament listed in data/follow.txt (searched by name, e.g. "Indian Premier League 2026")
  2. the API's rolling list of recent matches worldwide
Only men's matches are used (the roster is men's squads). Everything downloaded is cached in
data/cache/, and the script stops before the daily free quota runs out. Run it once a day.

Usage:  python3 scripts/update_form.py              (fetch new matches, then rebuild)
        python3 scripts/update_form.py --build-only (no network, just rebuild the site data)
        python3 scripts/update_form.py --no-api     (Cricsheet only, no API key/quota)
"""
import datetime, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cricsheet

ROOT = Path(os.environ.get("IPL_ROOT") or Path(__file__).resolve().parent.parent)
DATA, CACHE = ROOT / "data", ROOT / "data" / "cache"
SC_DIR = CACHE / "scorecards"
BASE = "https://api.cricapi.com/v1"
RESERVE = 5          # hits to leave unused each day
LIST_PAGES = 2       # pages of the recent-match list per run (25 matches each, 1 hit per page)
IDS_PER_RUN = 15     # player ids to look up per run for ambiguous names (1 hit each, cached forever)
KEEP = 15            # innings / spells kept per player
SKIP = re.compile(r"\b(women|womens|girls|ladies)\b", re.I)


class Quota(Exception):
    pass


def load_key():
    key = os.environ.get("CRICAPI_KEY", "").strip()
    f = ROOT / "api-key.txt"
    if not key and f.exists():
        lines = [l.strip() for l in f.read_text().splitlines() if l.strip() and not l.startswith("#")]
        key = lines[0] if lines else ""
    if not key or "PASTE" in key.upper():
        sys.exit("No API key found. Put your CricketData.org key on the first line of api-key.txt.")
    return key


class Client:
    def __init__(self, key):
        self.key, self.left = key, None

    def get(self, path, **params):
        if self.left is not None and self.left <= RESERVE:
            raise Quota()
        url = f"{BASE}/{path}?" + urllib.parse.urlencode({**params, "apikey": self.key})
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                j = json.load(r)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"HTTP {e.code} from {path}")
        info = j.get("info") or {}
        if "hitsLimit" in info and "hitsToday" in info:
            self.left = info["hitsLimit"] - info["hitsToday"]
        if j.get("status") != "success":
            reason = str(j.get("reason", "unknown error"))
            if "limit" in reason.lower() or "quota" in reason.lower():
                raise Quota()
            raise RuntimeError(reason)
        return j


def load_json(p, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def norm(s):
    return re.sub(r"[^a-z ]", "", s.lower().replace(".", " ").replace("-", " ")).split()


def follow_terms():
    f = DATA / "follow.txt"
    if not f.exists():
        return []
    return [l.strip() for l in f.read_text().splitlines() if l.strip() and not l.lstrip().startswith("#")]


SINCE = "2026-03-28"      # ignore anything older (IPL 2026 started then)


def fresh(s):
    end = str(s.get("endDate") or "")
    return end[:10] >= SINCE or ("2026" in s.get("name", "") and not end)


def pull_followed(client, matches):
    """Search each followed tournament, then add its match list to the cache."""
    known = load_json(CACHE / "follow_series.json", {})
    for term in follow_terms():
        if term not in known:
            found = client.get("series", search=term).get("data") or []
            words = norm(term)
            hits = [s for s in found if all(w in " ".join(norm(s.get("name", ""))) for w in words)] or found[:1]
            known[term] = [{"id": s["id"], "name": s.get("name", term), "endDate": s.get("endDate", "")} for s in hits[:3]]
            print(f"  '{term}' -> " + (", ".join(s["name"] for s in known[term]) or "NO SERIES FOUND"))
            (CACHE / "follow_series.json").write_text(json.dumps(known))
        for s in known[term]:
            if not fresh(s):
                continue
            done_flag = CACHE / f"series_done_{s['id']}"
            if done_flag.exists():
                continue
            data = client.get("series_info", id=s["id"]).get("data") or {}
            ml = data.get("matchList") or []
            for m in ml:
                if m.get("id"):
                    m["series_id"], m["series_name"] = s["id"], s["name"]
                    matches[m["id"]] = {**matches.get(m["id"], {}), **m}
            if ml and all(m.get("matchEnded") for m in ml):
                done_flag.write_text("1")     # finished tournament: never refetch
            print(f"  {s['name']}: {len(ml)} matches, {sum(1 for m in ml if m.get('matchEnded'))} finished")


def fetch(client):
    matches = load_json(CACHE / "matches.json", {})
    try:
        pull_followed(client, matches)
        for page in range(LIST_PAGES):
            rows = client.get("matches", offset=page * 25).get("data") or []
            for m in rows:
                if m.get("id"):
                    matches[m["id"]] = {**matches.get(m["id"], {}), **m}
            if len(rows) < 25:
                break
    finally:
        (CACHE / "matches.json").write_text(json.dumps(matches))
    todo = [m for m in matches.values() if m.get("matchEnded") and not SKIP.search(m.get("name", ""))
            and not (SC_DIR / f"{m['id']}.json").exists()]
    todo = [m for m in todo if (m.get("date") or m.get("dateTimeGMT") or "")[:10] >= SINCE]

    def rank(m):          # India/IPL games first, other white-ball next, red-ball domestic last
        n = m.get("name", "").lower()
        return 2 if re.search(r"ranji|duleep|irani|nayudu", n) else 0 if re.search(r"india|asian games", n) else 1
    todo.sort(key=lambda m: m.get("dateTimeGMT") or m.get("date") or "", reverse=True)
    todo.sort(key=rank)
    got = 0
    try:
        for m in todo:
            try:
                j = client.get("match_scorecard", id=m["id"])
            except RuntimeError as e:
                print(f"  skipped {m.get('name')}: {e}")
                (SC_DIR / f"{m['id']}.json").write_text(json.dumps({"error": str(e)}))
                continue
            (SC_DIR / f"{m['id']}.json").write_text(json.dumps(j.get("data") or {}))
            got += 1
    finally:
        print(f"Fetched {got} new scorecards ({len(todo) - got} men's matches still waiting for tomorrow's quota).")
    # player ids, only for roster names that share first initial + surname with someone else
    roster = load_json(DATA / "roster.json", {"players": []})
    groups = {}
    for p in roster["players"]:
        t = norm(p["name"])
        if t:
            groups.setdefault((t[0][0], t[-1]), []).append(p["name"])
    ids = load_json(CACHE / "player_ids.json", {})
    try:
        for n in [n for g in groups.values() if len(g) > 1 for n in g if n not in ids][:IDS_PER_RUN]:
            try:
                found = client.get("players", search=n).get("data") or []
            except RuntimeError:
                continue
            ids[n] = next((r["id"] for r in found if norm(r.get("name", "")) == norm(n)), "")
    finally:
        (CACHE / "player_ids.json").write_text(json.dumps(ids))


def competition(meta):
    if meta.get("series_name"):
        return meta["series_name"]
    parts = [p.strip() for p in str(meta.get("name", "")).split(",")][2:]
    parts = [p for p in parts if not re.match(r"^(group|pool|\d+(st|nd|rd|th)\b|final|semi|quarter|qualifier|eliminator)", p, re.I)]
    return ", ".join(parts)


def dup(i, have):
    """Same match already present? Same opponent and the date within a day (sources differ by time zone)."""
    d = datetime.date.fromisoformat(i["date"][:10])
    return not i.get("inn") and any(o == i.get("opponent") and abs((datetime.date.fromisoformat(x[:10]) - d).days) <= 1 for x, o in have)


def build(use_cricsheet=True):
    roster = load_json(DATA / "roster.json", {"players": [], "teams": {}})
    (DATA / "roster.js").write_text("window.IPL_ROSTER = " + json.dumps(roster, indent=1) + ";\n")
    names = sorted({p["name"] for p in roster["players"]})
    exact = {" ".join(norm(n)): n for n in names}
    by_key = {}
    for n in names:
        t = norm(n)
        if t:
            by_key.setdefault((t[0][0], t[-1]), []).append(n)
    abbr = {v.lower(): k for k, v in roster.get("teams", {}).items()}
    id_to_name = {v: k for k, v in load_json(CACHE / "player_ids.json", {}).items() if v}

    def match_name(api_name, api_id=None):
        if api_id and api_id in id_to_name:
            return id_to_name[api_id]
        t = norm(api_name or "")
        if not t:
            return None
        if " ".join(t) in exact:
            return exact[" ".join(t)]
        c = by_key.get((t[0][0], t[-1]), [])
        if len(t[0]) > 2:                       # a full first name was given: it must be the same name
            c = [n for n in c if norm(n)[0] == t[0]]
        return c[0] if len(c) == 1 else None    # initials only ("M Yadav") and still ambiguous: skip

    matches = load_json(CACHE / "matches.json", {})
    form, unmatched, used = {}, {}, 0
    for f in SC_DIR.glob("*.json"):
        sc, meta = load_json(f, {}), matches.get(f.stem, {})
        innings = sc.get("scorecard") if isinstance(sc, dict) else None
        if not innings or SKIP.search(str(sc.get("name", "")) + " " + str(meta.get("name", ""))):
            continue
        used += 1
        teams = meta.get("teams") or sc.get("teams") or []
        date = meta.get("date") or sc.get("date") or (meta.get("dateTimeGMT") or "")[:10]
        base = {"date": date, "format": str(meta.get("matchType") or sc.get("matchType", "")).upper(),
                "competition": competition({**sc, **meta}),
                "venue": str(sc.get("venue") or meta.get("venue") or ""), "result": str(sc.get("status") or meta.get("status") or "")}
        short = lambda t: abbr.get(t.lower(), t) if t else ""
        for inn in innings:
            label = str(inn.get("inning", "")).lower()
            bat_team = next((t for t in teams if t.lower() in label), None)
            bowl_team = next((t for t in teams if t != bat_team), None) if bat_team else None
            scores = [int(r["r"]) for r in inn.get("batting") or [] if r.get("r") is not None]
            best = max(scores) if scores else 0      # top score of this team's innings, whoever scored it
            for row in inn.get("batting") or []:
                b = row.get("batsman")
                name = b.get("name") if isinstance(b, dict) else b
                if not name or row.get("r") is None:
                    continue
                who = match_name(name, b.get("id") if isinstance(b, dict) else None)
                if not who:
                    unmatched[name] = unmatched.get(name, 0) + 1
                    continue
                text = str(row.get("dismissal-text") or row.get("dismissal") or "")
                form.setdefault(who, {"bat": [], "bowl": []})["bat"].append({
                    **base, "team": short(bat_team), "opponent": short(bowl_team), "runs": int(row["r"]), "balls": int(row.get("b") or 0),
                    "out": bool(text) and "not out" not in text.lower() and text.lower() != "batting",
                    **({"top": True} if best > 0 and int(row["r"]) == best else {})})
            for row in inn.get("bowling") or []:
                b = row.get("bowler")
                name = b.get("name") if isinstance(b, dict) else b
                if not name or row.get("w") is None:
                    continue
                who = match_name(name, b.get("id") if isinstance(b, dict) else None)
                if not who:
                    continue
                form.setdefault(who, {"bat": [], "bowl": []})["bowl"].append({
                    **base, "team": short(bowl_team), "opponent": short(bat_team), "overs": row.get("o"), "runs": int(row.get("r") or 0),
                    "wkts": int(row["w"])})
    # Cricsheet ball-by-ball data is the base; API scorecards and hand-entered matches only fill dates it lacks
    cs_used, report = 0, []
    if use_cricsheet:
        cs, cs_used, report = cricsheet.collect(CACHE, roster, load_json(DATA / "aliases.json", {}), SINCE)
        merged = cs
        for who, lists in form.items():
            f = merged.setdefault(who, {"bat": [], "bowl": []})
            for k in ("bat", "bowl"):
                have = {(i["date"], i.get("opponent")) for i in f[k]}
                f[k] += [i for i in lists[k] if not dup(i, have)]
        form = merged
    # players with nothing recent: fall back to their last-played matches from the full archive
    if use_cricsheet:
        hist, hrep = cricsheet.history(CACHE, roster, load_json(DATA / "aliases.json", {}), set(form) | set(load_json(DATA / "manual-form.json", {})), SINCE)
        for who, lists in hist.items():
            form[who] = lists
        report += hrep
        if hist:
            print(f"Last-played history filled in for {len(hist)} players with no recent matches.")
    for who, lists in load_json(DATA / "manual-form.json", {}).items():
        f = form.setdefault(who, {"bat": [], "bowl": []})
        for k in ("bat", "bowl"):
            have = {(i["date"], i.get("opponent")) for i in f[k]}
            f[k] += [i for i in lists.get(k, []) if not dup(i, have)]
    for who in form:
        for k in ("bat", "bowl"):
            form[who][k].sort(key=lambda i: (i["date"], i.get("inn", 0)), reverse=True)
            form[who][k] = form[who][k][:KEEP]
    meta = {"updated": datetime.date.today().isoformat(), "since": SINCE, "matches": used + cs_used, "players": len(form)}
    (DATA / "form.js").write_text(
        "// Generated by scripts/update_form.py. Do not edit by hand.\n"
        "window.IPL_FORM = " + json.dumps(form, indent=1) + ";\n"
        "window.IPL_FORM_META = " + json.dumps(meta) + ";\n")
    print(f"Wrote form for {len(form)} roster players from {used} API scorecards + {cs_used} Cricsheet matches.")
    for line in report:
        print(line)
    if unmatched:
        top = sorted(unmatched.items(), key=lambda x: -x[1])[:8]
        print("Most common batters not in your roster (skipped):", ", ".join(f"{n} ({c})" for n, c in top))


if __name__ == "__main__":
    CACHE.mkdir(parents=True, exist_ok=True)
    SC_DIR.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    if "--build-only" not in args:
        if "--no-cricsheet" not in args:
            print("Cricsheet:")
            cricsheet.download(CACHE, DATA / "cricsheet.txt")
        if "--no-api" not in args:
            c = Client(load_key())
            try:
                fetch(c)
            except Quota:
                print("Daily free quota reached. Run again tomorrow; progress is saved.")
            except RuntimeError as e:
                print(f"API problem: {e}")
            if c.left is not None:
                print(f"Hits left today: about {c.left}.")
    build(use_cricsheet="--no-cricsheet" not in args)
