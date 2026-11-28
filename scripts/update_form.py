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
import datetime, difflib, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cricsheet
import highlightly

ROOT = Path(os.environ.get("IPL_ROOT") or Path(__file__).resolve().parent.parent)
DATA, CACHE = ROOT / "data", ROOT / "data" / "cache"
SC_DIR = CACHE / "scorecards"
BASE = "https://api.cricapi.com/v1"
RESERVE = 5          # hits to leave unused each day
LIST_PAGES = 2       # pages of the recent-match list per run (25 matches each, 1 hit per page)
IDS_PER_RUN = 5     # player ids to look up per run for ambiguous names (1 hit each, cached forever)
KEEP = 30            # innings / spells kept per player
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
            if not getattr(self, "shown", False):
                self.shown = True
                print(f"CricketData quota: {info['hitsToday']} of {info['hitsLimit']} used so far today (UTC time now {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d %H:%M}).")
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


NO_ROSTER = {"nepal", "united arab emirates", "uae", "namibia", "oman", "usa", "united states", "united states of america", "canada", "ireland", "scotland",
             "netherlands", "japan", "hong kong", "kuwait", "qatar", "bahrain", "saudi arabia", "malaysia", "singapore", "thailand", "italy", "germany",
             "denmark", "norway", "sweden", "jersey", "guernsey", "uganda", "kenya", "tanzania", "nigeria", "rwanda", "botswana", "malawi", "papua new guinea", "pakistan"}
YOUTH_A = re.compile(r"\b(under[- ]?\d+|u-?\d{2}|emerging|shaheens|a team|\w+ a vs|\w+ a,)\b|\bA vs\b|\bvs [\w ]+ A,", re.I)


def _tok(t):
    return set(norm(t)) - {"cricket", "team", "club", "xi", "the", "of"}


def _same(a, b):
    ta, tb = _tok(a), _tok(b)
    return bool(ta & tb) and (ta <= tb or tb <= ta or len(ta & tb) >= 2 or difflib.SequenceMatcher(None, " ".join(norm(a)), " ".join(norm(b))).ratio() >= 0.8)


def worth_a_hit(todo):
    """Drop matches that cannot add anything: ones Cricsheet already has, youth/A-team games, and games between nations with no roster players."""
    have = cricsheet.covered(CACHE, SINCE) + [((m.get("date") or "")[:10], m.get("teams") or []) for k, m in load_json(CACHE / "matches.json", {}).items() if k.startswith("hl_")]
    by_date = {}
    for d, teams in have:
        by_date.setdefault(d, []).append(teams)
    keep = []
    for m in todo:
        d = (m.get("date") or m.get("dateTimeGMT") or "")[:10]
        teams = m.get("teams") or []
        nm = m.get("name", "")
        a_ok = re.search(r"rising stars|\bindia\b", nm, re.I) and not re.search(r"\b(women|womens|girls)\b|-W\b", nm, re.I)
        if YOUTH_A.search(nm) and not a_ok:
            continue
        if len(teams) == 2 and all(" ".join(norm(t)) in NO_ROSTER for t in teams):
            continue
        if len(teams) == 2:
            day = datetime.date.fromisoformat(d) if d else None
            near = [d] + ([str(day - datetime.timedelta(1)), str(day + datetime.timedelta(1))] if day else [])
            if any(_same(teams[0], c[0]) and _same(teams[1], c[1]) or _same(teams[0], c[1]) and _same(teams[1], c[0])
                   for dd in near for c in by_date.get(dd, [])):
                continue
        keep.append(m)
    return keep, len(todo) - len(keep)


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
    todo, saved = worth_a_hit(todo)
    print(f"{len(todo)} men's matches worth an API hit ({saved} skipped: already in Cricsheet, youth/A sides, or no roster nations).")

    def rank(m):          # India/IPL games first, other white-ball next, red-ball domestic last
        n = m.get("name", "").lower()
        return 2 if re.search(r"ranji|duleep|irani|nayudu", n) else 0 if re.search(r"india|asian games|mushtaq", n) else 1
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


def _same_fig(a, b):
    """Identical innings or spell; a figure one source leaves out (balls, overs) is not held against it."""
    if bool(a.get("dnb")) or bool(b.get("dnb")):
        return False
    ok = lambda f: a.get(f) is None or b.get(f) is None or a.get(f) == b.get(f)
    if "wkts" in a or "wkts" in b:
        return a.get("wkts") == b.get("wkts") and a.get("runs") == b.get("runs") and ok("overs")
    return a.get("runs") == b.get("runs") and ok("balls")


def dup(i, have):
    """Same match already held? `have` = the player's existing entries. Sources name teams differently ("NZ" v "New Zealand", "CR" v
    "Chitwan Rhinos") and dates can differ by a day (time zones), so besides the opponent we also compare the innings itself: same
    day and identical figures, or the next day with identical figures in the same competition. Innings numbers must agree when both have one."""
    d = datetime.date.fromisoformat(i["date"][:10])
    for x in have:
        gap = abs((datetime.date.fromisoformat(x["date"][:10]) - d).days)
        if gap > 1:
            continue
        if i.get("inn") and x.get("inn") and i["inn"] != x["inn"]:
            continue
        if not i.get("inn") and not x.get("inn") and x.get("opponent") == i.get("opponent"):
            return True
        same_fig = _same_fig(x, i)
        # a day apart: same competition, OR the same ground and opponent (Cricsheet and the APIs word Test series differently)
        vx, vi = (x.get("venue") or "").strip().lower(), (i.get("venue") or "").strip().lower()
        same_ground = bool(vx) and vx == vi and x.get("opponent") == i.get("opponent")
        if same_fig and (gap == 0 or same_ground or (x.get("competition") or "")[:12].lower() == (i.get("competition") or "")[:12].lower()):
            return True
    return False


def ipl_last(form, roster):
    """Season totals for the most recent IPL (from every innings and spell held before the per-player trim),
    plus the match-by-match rows for released players."""
    recs = [(w, k, i) for w, v in form.items() for k in ("bat", "bowl") for i in v[k]
            if "indian premier league" in (i.get("competition") or "").lower() and not i.get("dnb")]
    if not recs:
        return {"season": "", "stats": {}, "matches": {}}
    season = max(recs, key=lambda r: r[2]["date"])[2]["competition"]
    recs = [r for r in recs if r[2]["competition"] == season]
    released = {p["name"] for p in roster.get("players", []) if p.get("released")}
    stats, matches = {}, {}
    for who, k, i in recs:
        st = stats.setdefault(who, {"m": set(), "bat": {"inn": 0, "runs": 0, "balls": 0, "outs": 0, "hs": -1, "hsno": False, "f": 0, "h": 0},
                                    "bowl": {"inn": 0, "balls": 0, "runs": 0, "wkts": 0, "best": (-1, 0)}, "potm": set()})
        st["m"].add((i["date"], i.get("opponent")))
        if i.get("potm"):
            st["potm"].add((i["date"], i.get("opponent")))
        if k == "bat":
            b = st["bat"]; r = int(i.get("runs") or 0)
            b["inn"] += 1; b["runs"] += r; b["balls"] += int(i.get("balls") or 0); b["outs"] += 1 if i.get("out") else 0
            b["f"] += 1 if 50 <= r < 100 else 0; b["h"] += 1 if r >= 100 else 0
            if r > b["hs"] or (r == b["hs"] and not i.get("out")):
                b["hs"], b["hsno"] = r, not i.get("out")
        else:
            w = st["bowl"]; ov = i.get("overs") or 0
            legal = int(ov) * 6 + round((ov - int(ov)) * 10)
            w["inn"] += 1; w["balls"] += legal; w["runs"] += int(i.get("runs") or 0); w["wkts"] += int(i.get("wkts") or 0)
            if (i["wkts"], -i["runs"]) > (w["best"][0], -w["best"][1]) if w["best"][0] >= 0 else True:
                w["best"] = (int(i["wkts"]), int(i["runs"]))
        if who in released:
            matches.setdefault(who, {"bat": [], "bowl": []})[k].append(i)
    out = {}
    for who, st in stats.items():
        b, w = st["bat"], st["bowl"]
        row = {"m": len(st["m"]), "potm": len(st["potm"])}
        if b["inn"]:
            row["bat"] = {"inn": b["inn"], "runs": b["runs"], "balls": b["balls"], "outs": b["outs"], "hs": b["hs"], "hsno": b["hsno"], "f": b["f"], "h": b["h"],
                          "avg": round(b["runs"] / b["outs"], 1) if b["outs"] else None, "sr": round(b["runs"] * 100 / b["balls"], 1) if b["balls"] else None}
        if w["inn"] and w["balls"]:
            row["bowl"] = {"inn": w["inn"], "overs": f"{w['balls'] // 6}.{w['balls'] % 6}", "runs": w["runs"], "wkts": w["wkts"],
                           "econ": round(w["runs"] * 6 / w["balls"], 2), "avg": round(w["runs"] / w["wkts"], 1) if w["wkts"] else None,
                           "best": f"{w['best'][0]}/{w['best'][1]}"}
        out[who] = row
    for who, v in matches.items():
        for k in ("bat", "bowl"):
            v[k].sort(key=lambda i: i["date"], reverse=True)
    return {"season": season, "stats": out, "matches": matches}


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
    # The same game can arrive from two APIs under different names ("Pakistan A" v "Pakistan Shaheens"). Keep one copy: the Highlightly one,
    # because CricketData sometimes caches a scorecard taken mid-match.
    _canon = lambda t: frozenset(w for w in ("a" if x == "shaheens" else x for x in norm(t)) if w not in {"team", "the"})
    _hl = [(m.get("date"), {_canon(t) for t in m.get("teams") or []}) for k, m in matches.items()
           if k.startswith("hl_") and isinstance(load_json(SC_DIR / f"{k}.json", {}), dict) and load_json(SC_DIR / f"{k}.json", {}).get("scorecard")]
    def _dup(k, meta):
        if k.startswith("hl_") or len(meta.get("teams") or []) != 2:
            return False
        ts = {_canon(t) for t in meta["teams"]}
        return any(d == meta.get("date") and ts == t2 for d, t2 in _hl)
    dups = 0
    for f in SC_DIR.glob("*.json"):
        sc, meta = load_json(f, {}), matches.get(f.stem, {})
        if _dup(f.stem, meta):
            dups += 1
            continue
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
        _seen, _labels = {}, [str(i.get("inning", "")).lower() for i in innings]
        _bt = [next((t for t in teams if t.lower() in lb), None) for lb in _labels]
        _multi = len([b for b in _bt if b]) > len({b for b in _bt if b})      # a team bats twice (Test / first-class): number the innings
        for inn in innings:
            label = str(inn.get("inning", "")).lower()
            bat_team = next((t for t in teams if t.lower() in label), None)
            bowl_team = next((t for t in teams if t != bat_team), None) if bat_team else None
            _seen[bat_team] = _seen.get(bat_team, 0) + 1
            tag = {"inn": _seen[bat_team]} if _multi and bat_team else {}
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
                    **base, **tag, "team": short(bat_team), "opponent": short(bowl_team), "runs": int(row["r"]), "balls": int(row.get("b") or 0),
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
                    **base, **tag, "team": short(bowl_team), "opponent": short(bat_team), "overs": row.get("o"), "runs": int(row.get("r") or 0),
                    "wkts": int(row["w"])})
    # Cricsheet ball-by-ball data is the base; API scorecards and hand-entered matches only fill dates it lacks
    cs_used, report = 0, []
    if use_cricsheet:
        cs, cs_used, report = cricsheet.collect(CACHE, roster, load_json(DATA / "aliases.json", {}), SINCE)
        merged = cs
        for who, lists in form.items():
            f = merged.setdefault(who, {"bat": [], "bowl": []})
            for k in ("bat", "bowl"):
                have = list(f[k])
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
            have = list(f[k])
            f[k] += [i for i in lists.get(k, []) if not dup(i, have)]
    # nations are shown with their full names too ("India", not "IND"); IPL franchise codes stay as they are
    _full = {v: k for k, v in cricsheet.NAT.items()}
    for v in form.values():
        for k in ("bat", "bowl"):
            for i in v[k]:
                for fld in ("team", "opponent"):
                    if i.get(fld) in _full:
                        i[fld] = _full[i[fld]]
    # different people who share a name (e.g. Afghanistan's Rashid Khan and Nepal's): drop the other person's matches
    for who, rule in load_json(DATA / "identity-guard.json", {}).items():
        if who.startswith("_") or who not in form:
            continue
        bad = lambda i: any(w.lower() in (i.get("competition") or "").lower() for w in rule.get("drop_competitions", [])) or \
                        any(w.lower() in str(i.get(f) or "").lower() for w in rule.get("drop_teams", []) for f in ("team", "opponent")) or \
                        any(w.lower() in str(i.get("team") or "").lower() for w in rule.get("drop_own_teams", []))   # own team only, so real matches against that country stay
        for k in ("bat", "bowl"):
            form[who][k] = [i for i in form[who][k] if not bad(i)]
    last = ipl_last(form, load_json(DATA / "roster.json", {"players": []}))
    for who in form:
        for k in ("bat", "bowl"):
            form[who][k].sort(key=lambda i: (i["date"], i.get("inn", 0)), reverse=True)
            form[who][k] = form[who][k][:KEEP]
    meta = {"updated": datetime.date.today().isoformat(), "since": SINCE, "matches": used + cs_used, "players": len(form)}
    (DATA / "form.js").write_text(
        "// Generated by scripts/update_form.py. Do not edit by hand.\n"
        "window.IPL_FORM = " + json.dumps(form, indent=1) + ";\n"
        "window.IPL_FORM_META = " + json.dumps(meta) + ";\n"
        "window.IPL_LAST = " + json.dumps(last, separators=(",", ":")) + ";\n")
    print(f"Skipped {dups} duplicate scorecards of games held from two sources.") if dups else None
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
    try:        # Highlightly scorecards shipped in data/hl-cache.json (GitHub starts with an empty cache each time)
        _m = load_json(CACHE / "matches.json", {})
        _n = highlightly.import_cache(SC_DIR, _m, DATA / "hl-cache.json")
        if _n:
            (CACHE / "matches.json").write_text(json.dumps(_m))
            print(f"Loaded {_n} Highlightly scorecards from data/hl-cache.json.")
    except Exception as e:
        print(f"hl-cache import problem (ignored): {e}")
    if "--build-only" not in args:
        if "--no-cricsheet" not in args:
            print("Cricsheet:")
            cricsheet.download(CACHE, DATA / "cricsheet.txt")
        if "--no-api" not in args:
            try:
                c = Client(load_key())
            except SystemExit as e:
                print(f"CricketData skipped: {e}")
                c = None
            if c:
                try:
                    fetch(c)
                except Quota:
                    print("CricketData daily free quota reached. Run again tomorrow; progress is saved.")
                except RuntimeError as e:
                    print(f"CricketData problem: {e}")
                if c.left is not None:
                    print(f"CricketData hits left today: about {c.left}.")
            if "--no-hl" not in args:
                try:
                    mj = load_json(CACHE / "matches.json", {})
                    known = [((m.get("date") or "")[:10], m.get("teams") or []) for k, m in mj.items() if not k.startswith("hl_") and (SC_DIR / f"{k}.json").exists()]
                    known += cricsheet.covered(CACHE, SINCE)
                    highlightly.fetch(ROOT, CACHE, SC_DIR, mj, DATA / "hl-follow.txt", known)
                    (CACHE / "matches.json").write_text(json.dumps(mj))
                except Exception as e:
                    print(f"Highlightly problem (ignored): {e}")
            try:
                _m = load_json(CACHE / "matches.json", {})
                print(f"Saved {highlightly.export_cache(SC_DIR, _m, DATA / 'hl-cache.json')} Highlightly scorecards to data/hl-cache.json (upload this file to GitHub).")
            except Exception as e:
                print(f"hl-cache export problem (ignored): {e}")
    build(use_cricsheet="--no-cricsheet" not in args)
