import os, json, re, time
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# ======== CONFIG ========
OPENROUTER_API_KEY = "OPENROUTER_API_KEY" 
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_FREE = "meta-llama/llama-3.3-70b-instruct:free"  # chosen free model


LAST_CONTEXT = {
    "mode": None,         # "analyze" | "compare"
    "payload": None,      # raw user payload
    "result": None        # last JSON result we rendered
}

def call_openrouter(messages, model=MODEL_FREE, temperature=0.2, max_tokens=2000):
    """
    Safe OpenRouter call via requests. Return string content or raise.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("Missing OPENROUTER_API_KEY environment variable.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "TruthLens"
    }
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    r = requests.post(OPENROUTER_URL, headers=headers, json=body, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"OpenRouter error {r.status_code}: {r.text}")

    data = r.json()
    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        raise RuntimeError(f"Bad completion schema: {json.dumps(data)[:500]}")

def extract_json(text):
    """
    Extract JSON from raw LLM text (handles fenced code blocks).
    """
    if not text:
        return None
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Try ```json ... ```
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.S | re.I)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass

    # Fallback: first {...} block
    m2 = re.search(r"(\{.*\})", text, re.S)
    if m2:
        try:
            return json.loads(m2.group(1))
        except Exception:
            pass
    return None

# ================== ROUTES ==================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])  # case-insensitive safeguard (Flask accepts methods)

def analyze():
    """
    Single-document analysis → returns JSON that frontend expects.
    """
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    legal_mode = bool(data.get("legal_mode", False))
    if not text:
        return jsonify({"error": "No text provided"}), 400

    sys = (
        "You are TruthLens, an AI that audits text for bias, tone, manipulative phrasing, "
        "and legal clarity. Return STRICT JSON ONLY with these keys:\n"
        "{\n"
        '  "bias_percentage": number (0-100),\n'
        '  "bias_reason": string,\n'
        '  "tone": string,\n'
        '  "tone_reason": string,\n'
        '  "manipulative_phrases": [string,...],\n'
        '  "legal_clarity": "clear" | "moderate" | "unclear",\n'
        '  "legal_reason": string,\n'
        '  "suggested_improvements": [string,...],\n'
        '  "summary": string\n'
        "}\n"
        "Be concise but specific. If asked for legal suggestions (legal_mode=true), include fair rewrites."
    )

    user = f"Analyze the following text:\n\n{text}\n\nlegal_mode={legal_mode}"

    try:
        raw = call_openrouter(
            messages=[{"role":"system","content":sys}, {"role":"user","content":user}],
            temperature=0.2,
            max_tokens=1200
        )
        parsed = extract_json(raw)
        if not parsed:
            raise RuntimeError("Model did not return JSON")

        # normalize
        parsed["bias_percentage"] = int(max(0, min(100, float(parsed.get("bias_percentage", 0)))))
        parsed["manipulative_phrases"] = parsed.get("manipulative_phrases") or []
        parsed["suggested_improvements"] = parsed.get("suggested_improvements") or []
        parsed["tone"] = (parsed.get("tone") or "Unknown").title()
        lc = (parsed.get("legal_clarity") or "unclear").lower()
        parsed["legal_clarity"] = "clear" if lc.startswith("clear") else ("moderate" if "moderate" in lc else "unclear")

        LAST_CONTEXT["mode"] = "analyze"
        LAST_CONTEXT["payload"] = {"text": text, "legal_mode": legal_mode}
        LAST_CONTEXT["result"] = parsed

        return jsonify({"result": parsed})
    except Exception as e:
        # graceful fallback
        fallback = {
            "bias_percentage": 20,
            "bias_reason": "No strong bias cues detected.",
            "tone": "Neutral",
            "tone_reason": "Language is mostly factual.",
            "manipulative_phrases": [],
            "legal_clarity": "moderate",
            "legal_reason": "Some terms may be broad or undefined.",
            "suggested_improvements": (["Clarify obligations, timelines, and remedies."] if legal_mode else []),
            "summary": "Overall neutral text with a few unclear parts."
        }
        LAST_CONTEXT["mode"] = "analyze"
        LAST_CONTEXT["payload"] = {"text": text, "legal_mode": legal_mode}
        LAST_CONTEXT["result"] = fallback
        return jsonify({"result": fallback, "warning": str(e)}), 200

@app.route("/compare", methods=["POST"])
def compare():
    """
    Multi-doc (or single-doc re-used) comparison.
    Adds domain-aware reasoning based on document type.
    """
    data = request.get_json(force=True) or {}
    user_intent = (data.get("user_intent") or "").strip()
    weights = data.get("weights") or {"cost": 30, "coverage": 40, "transparency": 30}
    documents = data.get("documents") or []

    if not documents:
        return jsonify({"error": "No documents provided"}), 400
    if not user_intent:
        user_intent = "Analyze and select the best document for the user’s needs."

    # Detect domain type
    doc_type = "Insurance Policy"
    low = user_intent.lower()
    if "employment" in low or "job" in low:
        doc_type = "Employment Contract"
    elif "rental" in low or "lease" in low:
        doc_type = "Rental Agreement"
    elif "policy" not in low and "insurance" not in low:
        doc_type = "Other"

    # Dynamic prompt based on document type
    sys = (
        f"You are TruthLens, a comparison AI for legal and contractual documents. "
        f"The current document type is: {doc_type}. "
        "Tailor reasoning to this context:\n"
        "- Insurance Policy → cost, coverage, exclusions, transparency.\n"
        "- Rental Agreement → rent clarity, maintenance, legal fairness, deposit conditions.\n"
        "- Employment Contract → compensation, working hours, benefits, fairness of clauses.\n"
        "- Other → overall clarity, transparency, and fairness.\n\n"
        "Output STRICT JSON ONLY:\n"
        "{\n"
        '  "intent_summary": string,\n'
        '  "weights": {"cost":number,"coverage":number,"transparency":number},\n'
        '  "documents": [\n'
        '    {\n'
        '      "name": string,\n'
        '      "relevant_summary": string,\n'
        '      "fairness_index": number(0-100),\n'
        '      "cost_score": number(0-100),\n'
        '      "coverage_score": number(0-100),\n'
        '      "transparency_score": number(0-100),\n'
        '      "pros": [string,...],\n'
        '      "cons": [string,...],\n'
        '      "key_quotes": [{"quote":string,"reason":string}, ...]\n'
        '    }\n'
        '  ],\n'
        '  "verdict": {\n'
        '    "winner": string | null,\n'
        '    "rationale": string,\n'
        '    "caveats": [string,...],\n'
        '    "evidence": [{"doc":string,"quote":string,"reason":string},...]\n'
        '  }\n'
        "}"
    )

    # User message content
    docs_block = "\n\n".join([
        f"### {i+1}. {d.get('name','Document')}\n{(d.get('content') or '')[:8000]}"
        for i, d in enumerate(documents)
    ])
    user = (
        f"USER_INTENT:\n{user_intent}\n\n"
        f"DOCUMENT_TYPE: {doc_type}\n\n"
        f"WEIGHTS: cost={weights.get('cost',30)} coverage={weights.get('coverage',40)} transparency={weights.get('transparency',30)}\n\n"
        f"DOCUMENTS:\n{docs_block}\n\n"
        "Return STRICT JSON only following the above schema."
    )

    try:
        raw = call_openrouter(
            messages=[{"role": "system", "content": sys}, {"role": "user", "content": user}],
            temperature=0.2,
            max_tokens=2800
        )

        parsed = extract_json(raw)
        if not parsed:
            raise RuntimeError("Model did not return valid JSON")

        # Normalize data
        if "weights" not in parsed or not isinstance(parsed["weights"], dict):
            parsed["weights"] = weights

        norm_docs = []
        for d in parsed.get("documents", []):
            norm_docs.append({
                "name": d.get("name", "Document"),
                "relevant_summary": d.get("relevant_summary", ""),
                "fairness_index": int(max(0, min(100, float(d.get("fairness_index", 0))))),
                "cost_score": int(max(0, min(100, float(d.get("cost_score", 0))))),
                "coverage_score": int(max(0, min(100, float(d.get("coverage_score", 0))))),
                "transparency_score": int(max(0, min(100, float(d.get("transparency_score", 0))))),
                "pros": d.get("pros") or [],
                "cons": d.get("cons") or [],
                "key_quotes": d.get("key_quotes") or []
            })
        parsed["documents"] = norm_docs

        v = parsed.get("verdict") or {}
        parsed["verdict"] = {
            "winner": v.get("winner"),
            "rationale": v.get("rationale") or "",
            "caveats": v.get("caveats") or [],
            "evidence": v.get("evidence") or []
        }

        LAST_CONTEXT["mode"] = "compare"
        LAST_CONTEXT["payload"] = {"user_intent": user_intent, "doc_type": doc_type, "weights": weights}
        LAST_CONTEXT["result"] = parsed

        return jsonify({"result": parsed})

    except Exception as e:
        fallback = {
            "intent_summary": user_intent,
            "weights": weights,
            "documents": [
                {
                    "name": d.get("name", "Document"),
                    "relevant_summary": "Basic summary unavailable (fallback).",
                    "fairness_index": 50,
                    "cost_score": 50,
                    "coverage_score": 50,
                    "transparency_score": 50,
                    "pros": ["—"], "cons": ["—"], "key_quotes": []
                } for d in documents
            ],
            "verdict": {
                "winner": None,
                "rationale": f"Fallback due to error: {str(e)}",
                "caveats": [],
                "evidence": []
            }
        }
        return jsonify({"result": fallback, "warning": str(e)}), 200


@app.route("/chat", methods=["POST"])
def chat():
    """
    Follow-up Q&A constrained to last analysis/comparison.
    """
    data = request.get_json(force=True) or {}
    msg = (data.get("message") or "").strip()
    if not msg:
        return jsonify({"reply": "Ask something about the last analysis/comparison."})

    # If no context, be upfront
    if not LAST_CONTEXT["result"]:
        return jsonify({"reply": "Please run an analysis or comparison first, then ask follow-ups about that result."})

    mode = LAST_CONTEXT["mode"]
    context_json = json.dumps(LAST_CONTEXT["result"], ensure_ascii=False)[:12000]

    sys = (
        "You are TruthLens chat. Only answer questions related to the last analysis/comparison result. "
        "Do NOT expose raw JSON or internal keys; speak naturally and reference findings. "
        "If user asks unrelated questions, politely refuse and ask them to focus on the analysis."
    )
    user = (
        f"CONTEXT (summary of last result; do not reveal JSON):\n{context_json}\n\n"
        f"USER QUESTION:\n{msg}\n\n"
        "Answer briefly and clearly, using bullets when helpful. If referencing a quote/section, cite it by doc name."
    )

    try:
        raw = call_openrouter(messages=[{"role":"system","content":sys},{"role":"user","content":user}], temperature=0.3, max_tokens=700)
        reply = raw.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": f"Could not answer right now. Error: {e}"}), 200

if __name__ == "__main__":
    # You can set host="0.0.0.0" if needed
    app.run(debug=True)
