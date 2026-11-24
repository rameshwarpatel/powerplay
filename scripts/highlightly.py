"""Highlightly cricket API (free plan, 100 requests/day): fills in finished matches for the competitions in data/hl-follow.txt.
Thrifty by design: league ids are cached forever, one request lists a whole competition (100 matches a page), and each finished
match scorecard costs one request and is cached forever. Scorecards are saved in the same shape as the CricketData ones,
so update_form.build() reads them with no extra code."""
import datetime, difflib, json, os, re, urllib.error, urllib.parse, urllib.request
from pathlib import Path

BASE = "https://cricket.highlightly.net"
RUN_BUDGET = 60          # most requests one run may spend (free plan allows 100 a day; leave room for a second run)


class Stop(Exception):
    pass


def load_key(root):
    k = os.environ.get("HIGHLIGHTLY_KEY", "").strip()
    if k:
        return k
    f = root / "api-key-2.txt"
    if f.exists():
        ls = [l.strip() for l in f.read_text().splitlines() if l.strip() and not l.startswith("#")]
        return ls[0] if ls else ""
    return ""


class Client:
    def __init__(self, key):
        self.key, self.used = key, 0

    def get(self, path, **params):
        if self.used >= RUN_BUDGET:
            raise Stop("run budget reached")
        url = f"{BASE}/{path}" + (("?" + urllib.parse.urlencode(params)) if params else "")
        req = urllib.request.Request(url, headers={"x-rapidapi-key": self.key, "Accept": "application/json", "User-Agent": "ipl-form-site/1.0"})
        self.used += 1
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429):
                raise Stop(f"HTTP {e.code} (key rejected or daily quota used)")
            raise RuntimeError(f"HTTP {e.code} from {path}")


def terms(path):
    """Lines: 'League name | season' (follow one competition) or 'scan | days' (look at every match of the last N days)."""
    if not path.exists():
        return []
    out = []
    for l in path.read_text().splitlines():
        l = l.strip()
        if l and not l.startswith("#"):
            name, _, season = l.partition("|")
            out.append((name.strip(), int(season) if season.strip().isdigit() else datetime.date.today().year))
    return out


YOUTH = re.compile(r"\b(women|womens|girls|under[- ]?\d+|u-?\d{2}|emerging|academy|shaheens|legends|masters|veterans|e-?sports)\b|\bA\b|-W\b", re.I)
# Men's "India A" games and the Rising Stars Asia Cup are full of IPL players, so they are NOT treated as youth cricket
ALLOW_A = re.compile(r"rising stars|\bindia a\b", re.I)
INDIA = re.compile(r"\bindia\b", re.I)
WOMEN = re.compile(r"\b(women|womens|girls)\b|-W\b", re.I)


def _youth(ln, tm):
    txt = " ".join([ln] + list(tm))
    if WOMEN.search(txt):
        return True
    if INDIA.search(txt) and not re.search(r"under[- ]?\d+|\bu-?\d{2}\b", txt, re.I):
        return False   # every men's India fixture (India, India A/B/C/D, any competition)
    if ALLOW_A.search(txt):
        return False
    return bool(YOUTH.search(ln) or any(YOUTH.search(t) for t in tm))


NO_ROSTER = {"nepal", "united arab emirates", "uae", "namibia", "oman", "usa", "united states", "canada", "ireland", "scotland", "netherlands", "japan",
             "hong kong", "kuwait", "qatar", "bahrain", "saudi arabia", "malaysia", "singapore", "thailand", "italy", "germany", "denmark", "uganda", "kenya",
             "tanzania", "nigeria", "rwanda", "botswana", "malawi", "papua new guinea", "pakistan"}


def _rank(m, followed):
    """0 = a competition you follow, 1 = international or well-known domestic cricket, 2 = anything else (only if requests remain)."""
    ln = str((m.get("league") or {}).get("name") or "").lower()
    if (m.get("league") or {}).get("name") in followed:
        return 0
    return 1 if re.search(r"tour|in india|in new zealand|in england|in australia|in south africa|in pakistan|in sri lanka|in west indies|in bangladesh|in zimbabwe|in afghanistan|"
                          r"shield|ranji|ford trophy|plunket|county|one-day cup|pro20|csa|bbl|big bash|sa20|ilt20|cpl|psl|lpl|bpl|t20 blast|vitality|smash|hundred", ln) else 2


def _tok(t):
    return set(re.sub(r"[^a-z ]", "", str(t).lower()).split())


def _held(f):
    """A scorecard counts as fetched only if it has batting rows (empty ones from an earlier run are fetched again)."""
    try:
        d = json.loads(f.read_text())
    except Exception:
        return False
    return bool(d.get("skipped")) or any(x.get("batting") for x in d.get("scorecard") or [])


def _convert(d):
    """Highlightly match detail -> {scorecard:[{inning, batting:[...], bowling:[...]}], ...} (CricketData shape)."""
    stats = []
    for s in (d.get("statistics") or []):
        if isinstance(s, dict):
            t = s.get("team") if isinstance(s.get("team"), dict) else s        # lists sit inside "team" in the real response
            stats.append({**t, "inningNumber": s.get("inningNumber") or t.get("inningNumber")})
    stats.sort(key=lambda s: s.get("inningNumber") or 0)
    names = [str(s.get("name") or "") for s in stats]
    inn = []
    for i, s in enumerate(stats):
        bat = []
        for b in s.get("inningBatsmen") or []:
            p = (b.get("player") or {}).get("name")
            st = str(b.get("dismissalStatus") or "").lower()
            if not p or b.get("runs") is None or (not st and not b.get("balls") and not b.get("runs")):
                continue
            out = bool(st) and "not out" not in st and "notout" not in st and st not in ("batting", "did not bat", "retired hurt")
            bat.append({"batsman": {"name": p}, "r": b["runs"], "b": b.get("balls") or 0, "dismissal-text": "out" if out else "not out"})
        inn.append({"inning": f"{names[i]} Inning {s.get('inningNumber') or i + 1}", "batting": bat, "bowling": [], "_team": names[i]})
    # verified against a real match: the bowlers listed with a team's batting innings are the ones who bowled AGAINST that team
    for i, s in enumerate(stats):
        inn[i]["bowling"] = [{"bowler": {"name": r["player"]["name"]}, "o": r.get("overs"), "r": r.get("concededRuns") or 0, "w": r["wickets"]}
                             for r in (s.get("inningBowlers") or []) if (r.get("player") or {}).get("name") and r.get("wickets") is not None]
    for x in inn:
        x.pop("_team", None)
    return inn


def fetch(root, cache, sc_dir, matches, follow_file, known_dates):
    """matches = CricketData match cache (dict), updated in place with entries keyed hl_<id>. known_dates = [(date, [teams])] already stored."""
    key = load_key(root)
    if not key:
        print("Highlightly: no key (api-key-2.txt or HIGHLIGHTLY_KEY), skipped.")
        return 0
    c, got, empty = Client(key), 0, 0
    ids = {}
    idf = cache / "hl_leagues.json"
    try:
        ids = json.loads(idf.read_text())
    except Exception:
        pass
    (cache / "hl_days").mkdir(exist_ok=True)
    cands, followed = {}, set()
    try:
        for name, n in terms(follow_file):
            if name.lower() == "scan":
                # every match of the last n days; a finished day is listed once and cached forever
                today = datetime.date.today()
                for back in range(n):
                    d = today - datetime.timedelta(back)
                    f = cache / "hl_days" / f"{d}.json"
                    if f.exists():
                        rows = json.loads(f.read_text())
                    else:
                        rows, off = [], 0
                        while True:
                            j = c.get("matches", date=str(d), limit=100, offset=off)
                            rows += j.get("data") or []
                            off += 100
                            if off >= ((j.get("pagination") or {}).get("totalCount") or len(rows)):
                                break
                        if back >= 2:                       # today and yesterday can still change
                            f.write_text(json.dumps(rows))
                    for m in rows:
                        cands.setdefault(m["id"], m)
                continue
            season = n
            k = f"{name}|{season}"
            if not ids.get(k):
                rows = (c.get("leagues", leagueName=name, season=season).get("data") or [])
                hit = next((l for l in rows if season in [s.get("season") for s in (l.get("seasons") or [])]), None)
                if hit:
                    ids[k] = hit["id"]
                    idf.write_text(json.dumps(ids))
                print(f"  Highlightly league '{name}' {season}: " + (f"id {ids[k]}" if ids.get(k) else "not found"))
            if not ids.get(k):
                continue
            followed.add(name)
            off = 0
            while True:
                j = c.get("matches", leagueId=ids[k], limit=100, offset=off)
                for m in j.get("data") or []:
                    cands.setdefault(m["id"], m)
                off += 100
                if off >= ((j.get("pagination") or {}).get("totalCount") or 0):
                    break
        for m in cands.values():
            if (m.get("league") or {}).get("name") and any(f.lower() in str(m["league"]["name"]).lower() for f in followed):
                followed.add(m["league"]["name"])
        todo = []
        for m in cands.values():
            tm = [(m.get("homeTeam") or {}).get("name", ""), (m.get("awayTeam") or {}).get("name", "")]
            ln = str((m.get("league") or {}).get("name") or "")
            if (m.get("state") or {}).get("description") != "Finished" or _held(sc_dir / f"hl_{m['id']}.json"):
                continue
            if _youth(ln, tm) or all(t.lower() in NO_ROSTER for t in tm):
                continue
            todo.append(m)
        todo.sort(key=lambda m: m.get("startTime") or "", reverse=True)
        todo.sort(key=lambda m: _rank(m, followed))
        print(f"  Highlightly: {len(cands)} matches seen, {len(todo)} finished men's matches not held yet.")
        for m in todo:
            date = str(m.get("startTime") or m.get("startDate"))[:10]
            tm = [(m.get("homeTeam") or {}).get("name", ""), (m.get("awayTeam") or {}).get("name", "")]
            lg = m.get("league") or {}
            d0 = datetime.date.fromisoformat(date)
            near = {str(d0 + datetime.timedelta(x)) for x in (-1, 0, 1)}
            if any(dd in near and sum(1 for a in tm for b in ts if _tok(a) == _tok(b)) >= 2 for dd, ts in known_dates):
                (sc_dir / f"hl_{m['id']}.json").write_text(json.dumps({"skipped": "already held from another source"}))
                continue
            if _rank(m, followed) == 2 and c.used >= RUN_BUDGET // 2:
                continue                                   # keep the second half of the budget for followed / well-known competitions
            try:
                j = c.get(f"matches/{m['id']}")
            except RuntimeError as e:
                print(f"    skipped {tm}: {e}")
                continue
            d = j[0] if isinstance(j, list) and j else j
            (cache / "hl_raw").mkdir(exist_ok=True)
            (cache / "hl_raw" / f"{m['id']}.json").write_text(json.dumps(j))      # raw copy: re-convert later without spending requests
            card = _convert(d if isinstance(d, dict) else {})
            if not any(x["batting"] for x in card):
                empty += 1
                print(f"    {' v '.join(tm)}: Highlightly has no batting data for this match.")
                (sc_dir / f"hl_{m['id']}.json").write_text(json.dumps({"skipped": "no player data at the source"}))
                if empty >= 4 and not got:
                    raise Stop("scorecards come back empty, so no more requests are spent")
                continue
            (sc_dir / f"hl_{m['id']}.json").write_text(json.dumps({
                "scorecard": card, "teams": tm, "status": (m.get("state") or {}).get("report") or "",
                "venue": ((d or {}).get("venue") or {}).get("name", "") if isinstance(d, dict) else "", "name": " vs ".join(tm)}))
            matches[f"hl_{m['id']}"] = {"id": f"hl_{m['id']}", "name": " vs ".join(tm) + f", {lg.get('name', '')} {lg.get('season', '')}", "teams": tm, "date": date,
                                        "matchType": str(m.get("format") or "t20").lower(), "matchEnded": True,
                                        "series_name": f"{lg.get('name', '')} {lg.get('season', '')}".strip()}
            got += 1
    except Stop as e:
        print(f"  Highlightly stopped: {e}")
    finally:
        print(f"Highlightly: {got} new scorecards, {c.used} requests used this run.")
    return got


# ---- a single file (data/hl-cache.json) carries the Highlightly scorecards between your Mac and GitHub ----
def export_cache(sc_dir, matches, path):
    sc, mt = {}, {}
    for f in sc_dir.glob("hl_*.json"):
        try:
            d = json.loads(f.read_text())
        except Exception:
            continue
        if any(x.get("batting") for x in d.get("scorecard") or []):
            sc[f.stem] = d
            if f.stem in matches:
                mt[f.stem] = matches[f.stem]
    path.write_text(json.dumps({"scorecards": sc, "matches": mt}, separators=(",", ":")))
    return len(sc)


def import_cache(sc_dir, matches, path):
    try:
        j = json.loads(path.read_text())
    except Exception:
        return 0
    n = 0
    for k, d in (j.get("scorecards") or {}).items():
        f = sc_dir / f"{k}.json"
        if not _held(f):
            f.write_text(json.dumps(d))
            n += 1
        if k in (j.get("matches") or {}):
            matches.setdefault(k, j["matches"][k])
    return n
