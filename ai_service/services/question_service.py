import os
import json
import re
import random
import requests
from pathlib import Path

def load_env_file():
    search_paths = [
        Path(".env"),
        Path("../.env"),
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]
    for env_path in search_paths:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and v and not os.getenv(k):
                                os.environ[k] = v
            except Exception:
                pass
            break

load_env_file()

class QuestionService:
    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        load_env_file()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")

    def _call_gemini(self, prompt: str):
        if not self.gemini_api_key or self.gemini_api_key == "your_gemini_api_key_here":
            return None
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"{prompt}\nRespond ONLY in valid raw JSON format."}]}]
        }
        try:
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if content:
                    return {"content": content, "service": "Gemini Cloud"}
            else:
                print(f"❌ [Python AI Service Error] Gemini API HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            print(f"❌ [Python AI Service Error] Gemini connection error: {e}")
        return None

    def _call_groq(self, prompt: str):
        if not self.groq_api_key or self.groq_api_key == "your_groq_api_key_here":
            return None
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "gemma2-9b-it"]
        for model in models:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": f"{prompt}\nRespond ONLY in valid raw JSON format without markdown ticks."}]
            }
            try:
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        return {"content": content, "model": model, "service": "Groq Cloud"}
                else:
                    print(f"❌ [Python AI Service Error] Groq model '{model}' HTTP {res.status_code}: {res.text[:250]}")
            except Exception as e:
                print(f"❌ [Python AI Service Error] Groq connection error on model '{model}': {e}")
        return None

    def _call_llm(self, prompt: str):
        self._refresh_keys()
        res = self._call_gemini(prompt)
        if not res:
            res = self._call_groq(prompt)
        return res

    def generate_question(self, session: dict, candidate_answer_text: str = "", previous_question_text: str = "", resume_skills: list = None):
        company_name = session.get("companyName", "Tech Innovators Inc.")
        job_role = session.get("jobRole", "Software Engineer")
        interview_type = session.get("type", "technical")
        difficulty = session.get("difficulty", "medium")
        skills_str = ", ".join(resume_skills) if resume_skills else "Software Architecture, API Design, System Optimization"

        prompt = f"""You are a Senior Principal Technical Interviewer at {company_name} conducting a {interview_type} round for a {job_role} role (Difficulty: {difficulty}).
Candidate Resume Skills: {skills_str}.
Previous Question: "{previous_question_text}"
Candidate's Previous Answer: "{candidate_answer_text}"

Generate the next highly realistic, organic, and probing interview question. Return ONLY a JSON object in this exact format:
{{
  "text": "Your question here",
  "idealAnswer": "What candidate should ideally cover"
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                try:
                    parsed = json.loads(clean_json, strict=False)
                except Exception:
                    clean_json_fixed = re.sub(r'[\r\n]+', r'\n', clean_json)
                    parsed = json.loads(clean_json_fixed, strict=False)
                if "text" in parsed and "idealAnswer" in parsed:
                    print(f"🤖 [Python AI Service] Question generated via {llm_res['service']} ({llm_res.get('model', '')})")
                    return {"text": parsed["text"], "idealAnswer": parsed["idealAnswer"], "source": f"python_{llm_res['service'].lower().replace(' ', '_')}"}
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse LLM Question JSON response: {e}")

        print("⚡ [Python AI Service] Question generated via Smart Local Heuristic Engine")
        return self._generate_smart_local_question(session, candidate_answer_text, previous_question_text, resume_skills)

    def _generate_smart_local_question(self, session: dict, candidate_answer_text: str, previous_question_text: str, resume_skills: list):
        company_name = session.get("companyName", "Tech Innovators Inc.")
        job_role = session.get("jobRole", "Software Engineer")
        skills = resume_skills if resume_skills and len(resume_skills) > 0 else ['Software Architecture', 'System Optimization', 'API Design', 'Database Management', 'Clean Code']

        target_skill = random.choice(skills)
        text_clean = (candidate_answer_text or "").strip()
        words = text_clean.split()

        tech_terms = re.findall(r'\b(react|node|express|mongodb|python|docker|aws|redis|api|cache|kafka|sql|microservices|graphql|typescript|jwt|security|async|hooks|redux|ci/cd|pipeline)\b', text_clean, re.IGNORECASE)
        mentioned_term = tech_terms[0] if tech_terms else target_skill

        if not previous_question_text:
            return {
                "text": f"At {company_name}, as a {job_role}, how do you leverage your experience in {mentioned_term} to design high-concurrency, scalable systems?",
                "idealAnswer": f"Candidate should outline architectural patterns, caching, database indexing, and performance tradeoffs using {mentioned_term}.",
                "source": "python_local"
            }

        if len(words) < 25:
            return {
                "text": f"In your response regarding {mentioned_term}, your answer was fairly high-level. At {company_name}, as a {job_role}, how would you implement this step-by-step in production with robust error handling?",
                "idealAnswer": f"Candidate should provide concrete implementation steps, exception handling, logging, and production safeguards for {mentioned_term}.",
                "source": "python_local"
            }

        return {
            "text": f"Building on your point about {mentioned_term}, how do you monitor for performance bottlenecks, handle failure degradation, and test edge cases when scaling for {company_name}'s {job_role} requirements?",
            "idealAnswer": f"Candidate should detail telemetry, load testing, unit/integration test suites, and graceful degradation strategies for {mentioned_term}.",
            "source": "python_local"
        }

    def evaluate_answer(self, question_text: str, ideal_answer: str, candidate_answer: str):
        text_clean = (candidate_answer or "").strip()

        # Strict check for improper, single-word, or empty answers
        if not text_clean or re.match(r'^(idk|no|yes|dont know|dunno|abc|test|asdf|na|none|nil)$', text_clean, re.IGNORECASE) or len(text_clean.split()) < 4:
            print("🤖 [Python AI Service] Strict evaluation triggered: Improper or single-word answer detected -> Score: 0/100")
            return {
                "score": 0,
                "feedback": "No meaningful or complete technical answer was provided. Candidate must explain concepts in detail.",
                "factors": {
                    "accuracy": 0,
                    "completeness": 0,
                    "depth": 0,
                    "relevance": 10,
                    "fluency": 0,
                    "clarity": 0,
                    "vocabulary": 10
                },
                "source": "python_strict_guard"
            }

        prompt = f"""You are a strict, objective, and unbiased Senior Principal Technical Interviewer evaluating a candidate's answer.
Question: "{question_text}"
Ideal Target Concepts: "{ideal_answer or ''}"
Candidate's Spoken/Written Answer: "{candidate_answer}"

BE RIGOROUS AND STRICT IN SCORING (Scale 0-100):
- Evaluate Technical Accuracy, Technical Depth, Completeness, and Relevance.
- ALSO EVALUATE COMMUNICATION QUALITY:
  * Fluency (0-100): Smoothness of expression, sentence continuity, and natural flow.
  * Clarity (0-100): How clearly, logically, and coherently the candidate articulates their points.
  * Vocabulary (0-100): Sophistication and precision of domain-specific technical terminology.

Return ONLY a valid raw JSON object in this exact format:
{{
  "score": 75,
  "feedback": "Constructive feedback explaining what was good and missing.",
  "factors": {{
    "accuracy": 75,
    "completeness": 70,
    "depth": 70,
    "relevance": 85,
    "fluency": 80,
    "clarity": 85,
    "vocabulary": 82
  }}
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                try:
                    parsed = json.loads(clean_json, strict=False)
                except Exception:
                    clean_json_fixed = re.sub(r'[\r\n]+', r'\n', clean_json)
                    parsed = json.loads(clean_json_fixed, strict=False)
                if "score" in parsed and "feedback" in parsed:
                    f_acc = parsed.get('factors', {}).get('accuracy', parsed['score'])
                    f_dep = parsed.get('factors', {}).get('depth', parsed['score'])
                    f_flu = parsed.get('factors', {}).get('fluency', parsed['score'])
                    f_cla = parsed.get('factors', {}).get('clarity', parsed['score'])
                    f_voc = parsed.get('factors', {}).get('vocabulary', parsed['score'])
                    print(f"🤖 [Python AI Service] AI Evaluated Answer via {llm_res['service']} ({llm_res.get('model', '')}) | Score: {parsed['score']}/100 | Accuracy: {f_acc}% | Depth: {f_dep}% | Fluency: {f_flu}% | Clarity: {f_cla}% | Vocab: {f_voc}%")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse Evaluation LLM JSON response: {e}")

        print("⚡ [Python AI Service] Answer evaluated via Strict Local Scoring Engine")
        words = text_clean.split()
        word_count = len(words)
        unique_words = len(set([w.lower() for w in words]))
        
        if word_count < 8:
            score = 15
            feedback = "Your response is extremely brief and lacks technical substance. Please elaborate with specific concepts."
            factors = {"accuracy": 15, "completeness": 10, "depth": 10, "relevance": 30, "fluency": 25, "clarity": 30, "vocabulary": 25}
        elif word_count < 20:
            score = 35
            feedback = "Your response is high-level. To achieve a higher score, include concrete implementation details and design trade-offs."
            factors = {"accuracy": 35, "completeness": 30, "depth": 25, "relevance": 50, "fluency": 55, "clarity": 60, "vocabulary": 50}
        elif word_count < 40:
            score = 65
            feedback = "Good core response. Adding error handling or production metrics will make your answer stronger."
            factors = {"accuracy": 68, "completeness": 62, "depth": 60, "relevance": 72, "fluency": 75, "clarity": 78, "vocabulary": 70}
        else:
            score = 85
            feedback = "Detailed and well-structured response covering key architectural principles."
            factors = {"accuracy": 88, "completeness": 82, "depth": 82, "relevance": 88, "fluency": 85, "clarity": 88, "vocabulary": 84}

        return {
            "score": score,
            "feedback": feedback,
            "factors": factors,
            "source": "python_local"
        }

    def generate_session_report_summary(self, session: dict, answers: list):
        job_role = session.get("jobRole", "Software Engineer")
        company_name = session.get("companyName", "Tech Company")
        interview_type = session.get("type", "technical")
        
        answers_summary = []
        for idx, ans in enumerate(answers):
            q_text = ans.get("questionText") or ans.get("questionId", {}).get("text") or f"Question {idx + 1}"
            cand_text = ans.get("candidateAnswer", "")
            eval_data = ans.get("evaluation", {})
            sc = eval_data.get("score", 0)
            answers_summary.append(f"Question #{idx+1}: {q_text}\nCandidate Answer: '{cand_text}'\nEvaluation Score: {sc}/100")

        summary_str = "\n\n".join(answers_summary)

        prompt = f"""You are an Executive Technical Recruiter at {company_name} evaluating a candidate's completed {interview_type} mock interview for a {job_role} role.

Detailed Session Q&A Transcript and Candidate Responses:
{summary_str}

CRITICAL SCORING & STRENGTHS RULES:
- Evaluate Overall Performance Score (0-100), Technical Accuracy (0-100), Technical Depth (0-100), and Communication Clarity (0-100).
- If the candidate gave poor, improper, or brief answers ('idk', 'yes', vague text), set overallScore: 0 - 30.
- If answers were poor, return "strengths": [] (an empty array). DO NOT invent fake praise.
- Only award high scores (>75) if answers were genuinely detailed and technically accurate.

Return ONLY a valid raw JSON object in this exact format:
{{
  "overallScore": 78,
  "technicalAccuracy": 80,
  "technicalDepth": 75,
  "communicationClarity": 82,
  "overallSummary": "3-4 sentence comprehensive evaluation tailored to their exact answers.",
  "strengths": [
    "Specific technical strength demonstrated in their answers"
  ],
  "weaknesses": [
    "Specific area where their answers lacked depth or concrete architecture"
  ],
  "improvementPlan": "1. Step-by-step study item tailored to their weak areas.\\n2. Practical implementation recommendation."
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                try:
                    parsed = json.loads(clean_json, strict=False)
                except Exception:
                    clean_json_fixed = re.sub(r'[\r\n]+', r'\n', clean_json)
                    parsed = json.loads(clean_json_fixed, strict=False)
                if "overallSummary" in parsed and "overallScore" in parsed:
                    print(f"🤖 [Python AI Service] Final Session Report & Scores Generated via {llm_res['service']} ({llm_res.get('model', '')}) | Overall AI Score: {parsed['overallScore']}/100 | Tech Accuracy: {parsed.get('technicalAccuracy', 0)}% | Tech Depth: {parsed.get('technicalDepth', 0)}% | AI Comm Clarity: {parsed.get('communicationClarity', 0)}%")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    
                    if isinstance(parsed.get("improvementPlan"), list):
                        parsed["improvementPlan"] = "\n".join([f"{i+1}. {step}" for i, step in enumerate(parsed["improvementPlan"])])
                        
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse Report Summary LLM JSON response: {e}")

        print("⚡ [Python AI Service] Session Report generated via Local Heuristic Engine")
        
        scores = [ans.get("evaluation", {}).get("score", 0) for ans in answers]
        avg_score = round(sum(scores) / max(len(scores), 1)) if scores else 0

        if avg_score == 0:
            return {
                "overallScore": 0,
                "technicalAccuracy": 0,
                "technicalDepth": 0,
                "communicationClarity": 0,
                "overallSummary": f"The candidate completed a {interview_type} mock interview for the {job_role} position at {company_name}, receiving an overall score of 0/100 as no complete technical answers were provided.",
                "strengths": [],
                "weaknesses": [
                    "No technical answers or explanation details were provided during the interview session.",
                    "Must explain architectural choices, implementation steps, and production tradeoffs to earn score points."
                ],
                "improvementPlan": f"1. Review fundamental technical concepts for the target {job_role} role.\n2. Practice providing structured, step-by-step technical answers to interview questions.",
                "source": "python_zero_score_guard"
            }
        
        all_words = " ".join([ans.get("candidateAnswer", "") for ans in answers]).lower()
        tech_words = list(set(re.findall(r'\b(react|node|express|mongodb|python|docker|aws|redis|api|cache|kafka|sql|microservices|graphql|typescript|jwt|security|async|hooks|redux|ci/cd|pipeline)\b', all_words)))
        
        strengths_list = [f"Demonstrated domain familiarity with {', '.join(tech_words[:3])}."] if (avg_score >= 65 and tech_words) else []

        return {
            "overallScore": avg_score,
            "technicalAccuracy": max(0, avg_score - 2),
            "technicalDepth": max(0, avg_score - 5),
            "communicationClarity": max(0, avg_score + 3),
            "overallSummary": f"The candidate completed a {interview_type} mock interview for the {job_role} position at {company_name}, achieving an overall evaluation score of {avg_score}/100.",
            "strengths": strengths_list,
            "weaknesses": [
                "Include deeper production metrics, error handling, and performance trade-offs in answers.",
                "Cover edge cases and failure recovery mechanisms when explaining architectural choices."
            ],
            "improvementPlan": f"1. Practice step-by-step system design trade-offs under timed conditions.\n2. Review core database indexing, caching strategies, and concurrency patterns for {job_role} roles.\n3. Prepare concrete production metrics from past engineering projects.",
            "source": "python_local"
        }

    # Alias for method compatibility
    generate_report_summary = generate_session_report_summary

question_service = QuestionService()
