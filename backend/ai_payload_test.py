# Test script for Gemini payload previous-exercise extraction
# Run: python backend/ai_payload_test.py

import json
import re

# Paste sample generated_plan text (trimmed) from your log
sample_text = '''Titlu: Sesiune U9 — Fokus: tranziție, dribling (60 minute)

1) Încălzire (10 min)
- 4 min — Mobilitate dinamică în cerc: alergare ușoară, genunchi sus, călcâie la fesă, fandări ușoare.
- 6 min — Joc: Cățelușul și Osul cu Minge (joc de reacție cu minge — "finder/tag" în care ceilalți protejează o minge).
    Instrucțiuni: un jucător e "cățeluș", are o minge mică; ceilalți încearcă să o atingă/recupereze fără să iasă din zona marcată.
    Coaching points: menține mingea aproape, privește în jur, decizii rapide.

2) Drill tehnic 1 — Pătratul Paselor și Mișcării (15 min)
- Config: patrulater 10x10m, jucători poziționați în colțuri și 2 jucători interni care circulă.
- Seturi: 3 x 4 minute, 1 min pauză între seturi.
- Obiectiv: pase precise, primire orientată, mișcare imediată după pasă.

3) Drill tehnic 2 — Atac și Apărare 1v1 la Poartă Mică (12 min)
- Config: două mini-porți la 12–15m, două rânduri de jucători; 1 atacant vs 1 apărător.
- Seturi: 6 runde x ~1.5 min (rotire rapidă).

4) Jocuri mici (Small-Sided Games) — Focus Tranziție & Dribling (18 min)
- 2 x 9 minute (pauză 2 min)
- Format: 5v5 sau 6v6 cu jokers laterali (în funcție de număr).

5) Revenire / Cool-down (5 min)
- 3 min — Alergare ușoară + exerciții respiratorii.
- 2 min — Stretching static scurt (cvadriceps, gambă, adduktor).

## Urmărire pentru următoarea sesiune
- Consolidare: exerciții scurte de tranziție 2v1 → 3v2 (focus pe decizii imediate).
- Introduceți variații ale „Pătratul Paselor” cu constrângere 1 atingere.
- Măsurați progres: observați 2–3 jucători la dribling/decizie și notați îmbunătățirile.
'''


def extract_exercise_names(plan_text):
    if not plan_text:
        return []
    lines = plan_text.splitlines()
    bullet_re = re.compile(r"^\s*[-\*•]\s*(.+)")
    num_re = re.compile(r"^\s*\d+[\.)]\s*(.+)")
    heading_re = re.compile(r"^\s*#{1,6}\s*(.+)")

    def clean_title(s: str):
        s = s.strip()
        s = re.sub(r"\*+", "", s).strip()
        s = re.sub(r"^[A-Za-z]\.[\s\-]*", "", s)
        # If there's an em-dash or long dash, prefer the right-hand side (likely the name)
        if '—' in s or '–' in s:
            parts = re.split(r"[—–-]", s)
            # take the last non-empty part
            for p in reversed(parts):
                p = p.strip()
                if p:
                    s = p
                    break
        # remove trailing parenthetical times if present
        s = re.sub(r"\(.*?min.*?\)", "", s, flags=re.IGNORECASE).strip()
        if ':' in s:
            s = s.split(':', 1)[0].strip()
        s = s.strip("\t \n\r-–—:")
        if not s:
            return None
        sl = s.lower()
        block_tokens = [
            "plan de antrenament", "data", "echipa", "vârsta",
            "număr", "numar", "obiective", "descriere", "coaching",
            "puncte", "durata", "timp", "urmărire", "follow-up",
            "config", "seturi", "seturi:", "obiectiv", "format", "revenire", "cool-down",
            "consolidare", "pauză", "pauza", "min", "minute", "alergare", "stretching",
            "încălzire",
        ]
        for tok in block_tokens:
            if tok in sl:
                return None
        if len(s) < 3 or len(s) > 80:
            return None
        words = s.split()
        if len(words) > 8:
            return None
        if not re.search(r"[A-Za-zĂÂÎȘȚăâîșț]", s):
            return None
        punct_ratio = sum(1 for ch in s if not ch.isalnum() and not ch.isspace()) / max(1, len(s))
        if punct_ratio > 0.35:
            return None
        return s

    candidates = []
    for ln in lines:
        m = bullet_re.match(ln) or num_re.match(ln) or heading_re.match(ln)
        if m:
            title = m.group(1).strip()
            # if title contains a dash/em-dash, prefer RHS
            if '—' in title or '–' in title or ' - ' in title:
                parts = re.split(r"[—–-]", title)
                rhs = parts[-1].strip()
                cleaned = clean_title(rhs)
                if cleaned:
                    candidates.append(cleaned[:120])
                    continue
            cleaned = clean_title(title)
            if cleaned:
                candidates.append(cleaned[:120])
    if not candidates:
        for ln in lines:
            if ':' in ln:
                left = ln.split(':', 1)[0].strip()
                cleaned = clean_title(left)
                if cleaned:
                    candidates.append(cleaned[:120])

    seen = set()
    out = []
    for c in candidates:
        key = c.lower()
        if key not in seen:
            seen.add(key)
            out.append(c)
    return out


def build_payload(system_prompt, user_message, previous_plans):
    # previous_plans is a list of strings for this test
    recent = previous_plans[:2]
    flat = []
    for plan in reversed(recent):
        names = extract_exercise_names(plan)
        if names:
            flat.extend([n[:120] for n in names])
    seen = set()
    exercise_names = []
    for n in flat:
        nl = n.lower()
        if nl and nl not in seen:
            seen.add(nl)
            exercise_names.append(n)
    history_block = ""
    if exercise_names:
        lines = ["\n\nPREVIOUS EXERCISES (do not repeat these in the new session):"]
        lines += [f"- {n}" for n in exercise_names]
        history_block = "\n".join(lines)
        max_bytes = 5 * 1024
        while len(history_block.encode('utf-8')) > max_bytes and exercise_names:
            exercise_names = exercise_names[:-1]
            lines = ["\n\nPREVIOUS EXERCISES (do not repeat these in the new session):"]
            lines += [f"- {n}" for n in exercise_names]
            history_block = "\n".join(lines)
    user_text = user_message + history_block + "\n\nPlease generate a complete, detailed training session plan."
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {"temperature": 0.7},
    }
    return payload, exercise_names


if __name__ == '__main__':
    system_prompt = 'SYSTEM PROMPT PLACEHOLDER'
    user_message = 'Team info and user message placeholder.'
    payload, names = build_payload(system_prompt, user_message, [sample_text])
    print('Extracted names:')
    print(json.dumps(names, ensure_ascii=False, indent=2))
    print('\nPayload user text size (bytes):', len(payload['contents'][0]['parts'][0]['text'].encode('utf-8')))
    print('\nPayload excerpt:\n')
    print(payload['contents'][0]['parts'][0]['text'][:1000])
