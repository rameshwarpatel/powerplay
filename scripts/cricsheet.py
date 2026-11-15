"""Read open ball-by-ball data from cricsheet.org and turn it into per-player innings (no API quota)."""
import difflib, io, json, re, time, zipfile, urllib.request, urllib.error
from pathlib import Path

BASE = "https://cricsheet.org/downloads/"
MAX_AGE = 6 * 3600            # re-download a zip only if it is older than this
FMT = {"T20": "T20", "IT20": "T20I", "ODI": "ODI", "ODM": "List A", "Test": "Test", "MDM": "FC"}
NAT = {"India": "IND", "Australia": "AUS", "England": "ENG", "South Africa": "SA", "New Zealand": "NZ",
       "West Indies": "WI", "Pakistan": "PAK", "Sri Lanka": "SL", "Bangladesh": "BAN", "Afghanistan": "AFG",
       "Zimbabwe": "ZIM", "Ireland": "IRE", "Netherlands": "NED", "Scotland": "SCO", "Nepal": "NEP",
       "United Arab Emirates": "UAE", "United States of America": "USA", "Namibia": "NAM", "Oman": "OMA", "Canada": "CAN"}
FRANCHISE = {"royal challengers bangalore": "RCB", "punjab kings": "PBKS", "kings xi punjab": "PBKS",
             "delhi daredevils": "DC", "rising pune supergiants": "RPS"}
NOT_BOWLER_WICKET = {"run out", "retired hurt", "retired out", "obstructing the field", "retired not out"}


def norm(s):
    return re.sub(r"[^a-z ]", "", str(s).lower().replace(".", " ").replace("-", " ")).split()


def terms(path):
    if not path.exists():
        return []
    return [l.strip() for l in path.read_text().splitlines() if l.strip() and not l.lstrip().startswith("#")]


def download(cache, listfile):
    """Fetch the zips named in data/cricsheet.txt (e.g. ipl, odis). Failures are reported, never fatal."""
    d = cache / "cricsheet"
    d.mkdir(parents=True, exist_ok=True)
    for t in terms(listfile):
        f = d / f"{t}_json.zip"
        if f.exists() and time.time() - f.stat().st_mtime < MAX_AGE:
            print(f"  cricsheet {t}: up to date")
            continue
        try:
            req = urllib.request.Request(BASE + f"{t}_json.zip", headers={"User-Agent": "ipl-form-site/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            f.write_bytes(data)
            print(f"  cricsheet {t}: downloaded {len(data) // 1024} KB")
        except Exception as e:
            print(f"  cricsheet {t}: could not download ({e})")


class Matcher:
    def __init__(self, names, aliases):
        self.names = names
        self.exact = {" ".join(norm(n)): n for n in names}
        self.alias = {" ".join(norm(k)): v for k, v in aliases.items() if v in names}
        self.cache, self.ambiguous, self.misses = {}, {}, {}

    def __call__(self, cs_name):
        if cs_name in self.cache:
            return self.cache[cs_name]
        r = self.cache[cs_name] = self._find(cs_name)
        return r

    def _find(self, cs_name):
        t = norm(cs_name)
        if not t:
            return None
        key = " ".join(t)
        if key in self.alias:
            return self.alias[key]
        if key in self.exact:
            return self.exact[key]
        pool = []
        for n in self.names:
            rt = norm(n)
            if rt and rt[-1] == t[-1]:
                pool.append((n, rt))
        # roster name is the tail of the Cricsheet name ("B Sai Sudharsan" -> "Sai Sudharsan") or vice versa
        tail = [n for n, rt in pool if len(rt) > 1 and (t[-len(rt):] == rt or rt[-len(t):] == t)]
        if len(tail) == 1:
            return tail[0]
        init = t[0] if len(t[0]) <= 3 and len(t) > 1 else None
        if init:                                   # "RG Sharma": first letter of the given name + surname
            c = [n for n, rt in pool if rt[0].startswith(init[0]) and len(rt) > 1]
            if len(c) == 1:
                return c[0]
            if len(c) > 1:
                self.ambiguous[cs_name] = c
                return None
        else:                                      # full first name, maybe spelled differently ("Mohammad" / "Mohammed")
            c = [n for n, rt in pool if len(rt) > 1 and difflib.SequenceMatcher(None, rt[0], t[0]).ratio() >= 0.82]
            if len(c) == 1:
                return c[0]
        return None


CC = {"in": "India", "za": "South Africa", "au": "Australia", "gb-eng": "England", "nz": "New Zealand", "lk": "Sri Lanka",
      "af": "Afghanistan", "bd": "Bangladesh", "zw": "Zimbabwe", "pk": "Pakistan", "ie": "Ireland",
      "tt": "West Indies", "gy": "West Indies", "bb": "West Indies", "jm": "West Indies"}


# Indian players under BCCI contract don't play these, so a match here is a namesake (e.g. another "Abdul Samad")
OVERSEAS_LEAGUES = ("pakistan super league", "bangladesh premier", "big bash", "caribbean premier", "sa20", "lanka premier",
                    "major league cricket", "ilt20", "international league t20", "hundred", "super smash", "sheffield", "european t20",
                    "global t20", "abu dhabi t10", "nepal premier", "legends", "qualifier", "continental cup", "challenge league", "asia pacific cricket")


def wrong_namesake(rec, country):
    """National-team matches (and 'tour of' series) only count for a player of that country: stops a
    different 'Rohit Sharma' in Indonesia's side from landing on the Indian star."""
    if country == "in" and any(k in rec["competition"].lower() for k in OVERSEAS_LEAGUES):
        return True
    intl = rec["format"] in ("T20I", "ODI", "Test") or " tour of " in rec["competition"].lower()
    return intl and rec["_team"] != CC.get(country, "India")


def head_date(b):
    m = re.search(rb'"dates"\s*:\s*\[\s*"(\d{4}-\d{2}-\d{2})"', b)
    return m.group(1).decode() if m else ""


def parse(d, match, abbr, since):
    info = d.get("info", {})
    if info.get("gender") != "male" or not info.get("dates"):
        return []
    date = info["dates"][0]
    if date < since:
        return []
    teams = info.get("teams", [])
    code = lambda n: abbr.get(n.lower()) or FRANCHISE.get(n.lower()) or NAT.get(n) or "".join(w[0] for w in n.split()).upper()
    ev = info.get("event") or {}
    comp = " ".join(x for x in [ev.get("name") if isinstance(ev, dict) else str(ev), str(info.get("season", ""))
                                if isinstance(ev, dict) and ev.get("name") and str(info.get("season", "")) not in str(ev.get("name")) else ""] if x)
    ven = info.get("venue", "")
    if ven and info.get("city") and info["city"] not in ven:
        ven = f"{ven}, {info['city']}"
    o = info.get("outcome", {})
    if o.get("winner"):
        by = o.get("by", {})
        res = f"{o['winner']} won" + (f" by {by['runs']} runs" if "runs" in by else f" by {by['wickets']} wickets" if "wickets" in by else "")
    else:
        res = str(o.get("result", ""))
    fmt = FMT.get(info.get("match_type"), str(info.get("match_type", "")))
    if fmt == "T20" and info.get("team_type") == "international":
        fmt = "T20I"                      # Cricsheet labels international T20s plain "T20"
    base = {"date": date, "format": fmt,
            "competition": comp, "venue": ven, "result": res}
    pom = set(info.get("player_of_match") or [])
    out, seen_inn = [], {}
    multi = info.get("match_type") in ("Test", "MDM")
    for inn in d.get("innings", []):
        if inn.get("super_over"):
            continue
        team = inn.get("team", "")
        seen_inn[team] = seen_inn.get(team, 0) + 1
        tag = {"inn": seen_inn[team]} if multi else {}
        opp = next((t for t in teams if t != team), "")
        bat, bowl = {}, {}
        for ov in inn.get("overs", []):
            for dl in ov.get("deliveries", []):
                ex, runs = dl.get("extras", {}), dl.get("runs", {})
                s = bat.setdefault(dl["batter"], [0, 0, False])
                bat.setdefault(dl.get("non_striker", dl["batter"]), [0, 0, False])
                s[0] += runs.get("batter", 0)
                if "wides" not in ex:
                    s[1] += 1
                w = bowl.setdefault(dl["bowler"], [0, 0, 0])
                w[1] += runs.get("total", 0) - ex.get("byes", 0) - ex.get("legbyes", 0)
                if "wides" not in ex and "noballs" not in ex:
                    w[0] += 1
                for k in dl.get("wickets", []):
                    if k.get("kind") not in ("retired hurt", "retired not out"):
                        bat.setdefault(k["player_out"], [0, 0, False])[2] = True
                    if k.get("kind") not in NOT_BOWLER_WICKET:
                        w[2] += 1
        best = max((v[0] for v in bat.values()), default=0)
        for n, (r, b, outf) in bat.items():
            out.append(("bat", n, {**base, "team": code(team), "opponent": code(opp), "runs": r, "balls": b, "out": outf, "_team": team, **tag,
                                   **({"top": True} if best > 0 and r == best else {}), **({"potm": True} if n in pom else {})}))
        for n, (legal, r, wk) in bowl.items():
            ov = legal // 6 if legal % 6 == 0 else float(f"{legal // 6}.{legal % 6}")
            out.append(("bowl", n, {**base, "team": code(opp), "opponent": code(team), "overs": ov, "runs": r, "wkts": wk, "_team": opp, **tag, **({"potm": True} if n in pom else {})}))
    return out


def collect(cache, roster, aliases, since):
    """Return ({roster name: {bat, bowl}}, matches_used, report lines)."""
    names = sorted({p["name"] for p in roster.get("players", [])})
    ctry = {p["name"]: p.get("country", "in") for p in roster.get("players", [])}
    abbr = {v.lower(): k for k, v in roster.get("teams", {}).items()}
    match = Matcher(names, aliases)
    form, seen, near = {}, set(), {}
    for z in sorted((cache / "cricsheet").glob("*.zip")) if (cache / "cricsheet").exists() else []:
        try:
            zf = zipfile.ZipFile(z)
        except Exception as e:
            print(f"  cricsheet: cannot read {z.name} ({e})")
            continue
        for n in zf.namelist():
            if not n.endswith(".json") or n in seen:
                continue
            with zf.open(n) as fh:
                head = fh.read(4000)
                if head_date(head) < since:
                    continue
                d = json.loads(head + fh.read())
            rows = parse(d, n, abbr, since)
            if not rows:
                continue
            seen.add(n)
            for kind, cs_name, rec in rows:
                who = match(cs_name)
                if who and wrong_namesake(rec, ctry.get(who, "in")):
                    continue
                rec.pop("_team", None)
                if who:
                    form.setdefault(who, {"bat": [], "bowl": []})[kind].append(rec)
                elif kind == "bat":
                    near[cs_name] = near.get(cs_name, 0) + 1
    rep = []
    if match.ambiguous:
        rep.append("Cricsheet names that fit several roster players (add to data/aliases.json): " +
                   "; ".join(f"{k} -> {' / '.join(v)}" for k, v in list(match.ambiguous.items())[:12]))
    sur = {}
    for n in names:
        sur.setdefault(norm(n)[-1], []).append(n)
    close = [f"{c} ~ {'/'.join(sur[norm(c)[-1]])}" for c, k in sorted(near.items(), key=lambda x: -x[1])
             if norm(c) and norm(c)[-1] in sur][:12]
    if close:
        rep.append("Unmatched names sharing a surname with a roster player (possible aliases): " + "; ".join(close))
    return form, len(seen), rep


def history(cache, roster, aliases, have, since, keep=15):
    """Last-played matches for players with nothing since `since`, from the all-matches archive
    (data/cache/history/all_json.zip). Cached until the zip or the list of players changes."""
    z = cache / "history" / "all_json.zip"
    if not z.exists():
        return {}, []
    names = sorted({p["name"] for p in roster.get("players", [])})
    need = [n for n in names if n not in have]
    key = {"zip": z.stat().st_mtime, "since": since, "need": need, "alias": aliases}
    out_f = cache / "history" / "last_played.json"
    try:
        c = json.loads(out_f.read_text())
        if c.get("key") == key:
            return c["form"], c.get("report", [])
    except Exception:
        pass
    ctry = {p["name"]: p.get("country", "in") for p in roster.get("players", [])}
    abbr = {v.lower(): k for k, v in roster.get("teams", {}).items()}
    match = Matcher(names, aliases)
    toks = {t for n in need for t in norm(n)[-1:] if len(t) >= 4}
    toks |= {t for k, v in aliases.items() if v in need for t in norm(k)[-1:] if len(t) >= 3}
    pat = re.compile("|".join(re.escape(t) for t in sorted(toks)).encode(), re.I) if toks else None
    form = {}
    if pat:
        zf = zipfile.ZipFile(z)
        for n in zf.namelist():
            if not n.endswith(".json"):
                continue
            raw = zf.read(n)
            cut = raw.find(b'"innings"')
            if not pat.search(raw[:cut] if cut > 0 else raw):
                continue
            # cheap pre-check on the names listed in the match header, so only matches with a wanted player are fully parsed
            if not any(who in need for who in {match(s.decode("utf8", "ignore")) for s in re.findall(rb'"([^"]{3,40})"', raw[:cut]) if pat.search(s)}):
                continue
            d = json.loads(raw)
            for kind, cs_name, rec in parse(d, n, abbr, "1900-01-01"):
                who = match(cs_name)
                if not who or who not in need or wrong_namesake(rec, ctry.get(who, "in")):
                    continue
                rec.pop("_team", None)
                form.setdefault(who, {"bat": [], "bowl": []})[kind].append(rec)
        for who, v in form.items():
            for k in ("bat", "bowl"):
                v[k].sort(key=lambda i: (i["date"], i.get("inn", 0)), reverse=True)
                v[k] = v[k][:keep]
    rep = []
    nf = [n for n in need if n not in form]
    if nf:
        rep.append(f"No matches found in the full archive for {len(nf)} players (name spelling or never played in Cricsheet-covered matches): " + ", ".join(nf))
    try:
        out_f.write_text(json.dumps({"key": key, "form": form, "report": rep}))
    except Exception:
        pass
    return form, rep
