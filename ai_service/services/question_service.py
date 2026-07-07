import os
import re
import json
import random
import time
import requests
from pathlib import Path

def load_env_file():
    """Auto-loads .env from current directory or parent directory without external deps"""
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
                            if k and v:
                                os.environ[k] = v
            except Exception as e:
                print(f"⚠️ [Python AI Service] Error reading .env file at {env_path}: {e}")
            break

# Load environment on import
load_env_file()

class QuestionService:
    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        load_env_file()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")

    def _call_gemini(self, prompt: str):
        if not self.gemini_api_key or self.gemini_api_key == "your_gemini_api_key_here":
            print("[Python AI Service] Skipping Gemini LLM: GEMINI_API_KEY is not set in .env")
            return None
        models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-001"]
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_api_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{prompt}\nRespond ONLY in valid raw JSON format without markdown ticks."}]}]
            }
            try:
                res = requests.post(url, json=payload, timeout=9)
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if content:
                        return {"content": content, "model": model, "service": "Google Gemini"}
                else:
                    print(f"❌ [Python AI Service Error] Gemini model '{model}' HTTP {res.status_code}: {res.text[:250]}")
            except Exception as e:
                print(f"❌ [Python AI Service Error] Gemini connection error on model '{model}': {e}")
        return None

    def _call_groq(self, prompt: str):
        if not self.groq_api_key or self.groq_api_key == "your_groq_api_key_here":
            print("ℹ️ [Python AI Service] Skipping Groq LLM: GROQ_API_KEY is not set in .env")
            return None
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        for model in models:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": f"{prompt}\nRespond ONLY in valid raw JSON format without markdown ticks."}]
            }
            try:
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=8)
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
                parsed = json.loads(clean_json)
                if "text" in parsed and "idealAnswer" in parsed:
                    print(f"🤖 [Python AI Service] Question generated via {llm_res['service']} ({llm_res['model']})")
                    return {"text": parsed["text"], "idealAnswer": parsed["idealAnswer"], "source": f"python_{llm_res['service'].lower().replace(' ', '_')}"}
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse LLM Question JSON response: {e}\nRaw Content: {llm_res['content'][:200]}")

        print("⚡ [Python AI Service] Question generated via Smart Local Heuristic Engine (Reason: All LLM providers failed or API keys missing)")
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
        prompt = f"""You are a Principal AI Tech Interviewer evaluating a candidate's answer.
Question: "{question_text}"
Ideal Covered Topics: "{ideal_answer or ''}"
Candidate's Spoken/Written Answer: "{candidate_answer}"

Evaluate the answer objectively on a scale of 0-100 across accuracy, completeness, depth, and relevance.
Return ONLY a valid JSON object in this exact format:
{{
  "score": 85,
  "feedback": "Detailed constructive feedback explaining what was good and what was missing.",
  "factors": {{
    "accuracy": 85,
    "completeness": 80,
    "depth": 85,
    "relevance": 90
  }}
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                parsed = json.loads(clean_json)
                if "score" in parsed and "feedback" in parsed:
                    print(f"🤖 [Python AI Service] Answer evaluated via {llm_res['service']} ({llm_res['model']})")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse Evaluation LLM JSON response: {e}")

        print("⚡ [Python AI Service] Answer evaluated via Smart Local Heuristic Engine (Reason: All LLM providers failed or API keys missing)")
        words = candidate_answer.strip().split() if candidate_answer else []
        word_count = len(words)
        
        if word_count < 10:
            score = 50
            feedback = "Your answer was very concise. Consider expanding with specific technical choices, code snippets, or architectural trade-offs."
            factors = {"accuracy": 50, "completeness": 40, "depth": 45, "relevance": 65}
        elif word_count < 30:
            score = 75
            feedback = "Good core response. Adding concrete production examples or metrics would make your answer significantly stronger."
            factors = {"accuracy": 75, "completeness": 70, "depth": 70, "relevance": 85}
        else:
            score = 88
            feedback = "Excellent and detailed response covering key architectural principles and practical considerations."
            factors = {"accuracy": 90, "completeness": 85, "depth": 88, "relevance": 90}

        return {
            "score": score,
            "feedback": feedback,
            "factors": factors,
            "source": "python_local"
        }

    def generate_report_summary(self, session: dict, answers: list):
        qa_summary_text = "\n\n".join([
            f"Question {idx + 1}: {ans.get('questionText', '')}\nCandidate Answer: {ans.get('answerText', 'No answer provided.')}\nEvaluation Score: {ans.get('evaluation', {}).get('score', 'N/A')}"
            for idx, ans in enumerate(answers)
        ])

        company_name = session.get("companyName", "Tech Company")
        job_role = session.get("jobRole", "Software Engineer")
        interview_type = session.get("type", "technical")
        difficulty = session.get("difficulty", "medium")

        prompt = f"""You are a Senior Principal AI Technical Recruiter evaluating a completed mock interview session.
Candidate Role: {job_role} at {company_name}
Round Type: {interview_type}
Difficulty: {difficulty}

Session Answers & Evaluations:
{qa_summary_text}

Generate a comprehensive, tailored, and highly professional interview feedback report.
Return ONLY a valid JSON object in this exact format:
{{
  "overallSummary": "A detailed 3-4 sentence evaluation of how the candidate performed, highlighting domain knowledge, communication clarity, and technical readiness.",
  "strengths": [
    "Specific technical or architectural strength demonstrated in their answers",
    "Another concrete strength identified"
  ],
  "weaknesses": [
    "Specific area where their answers lacked depth, edge case coverage, or clarity",
    "Another specific area for improvement"
  ],
  "improvementPlan": "Actionable step-by-step guidance for the candidate to address their weaknesses before actual interviews."
}}"""

        llm_res = self._call_llm(prompt)
        if llm_res and "content" in llm_res:
            try:
                clean_json = re.sub(r'```json|```', '', llm_res["content"]).strip()
                parsed = json.loads(clean_json)
                if "overallSummary" in parsed and "strengths" in parsed:
                    print(f"🤖 [Python AI Service] Report summary generated via {llm_res['service']} ({llm_res['model']})")
                    parsed["source"] = f"python_{llm_res['service'].lower().replace(' ', '_')}"
                    return parsed
            except Exception as e:
                print(f"⚠️ [Python AI Service Warning] Failed to parse Report Summary LLM JSON response: {e}")

        print("⚡ [Python AI Service] Report summary generated via Smart Local Heuristic Engine (Reason: All LLM providers failed or API keys missing)")
        valid_scores = [ans.get('evaluation', {}).get('score') for ans in answers if isinstance(ans.get('evaluation', {}).get('score'), (int, float))]
        avg_score = int(sum(valid_scores) / len(valid_scores)) if valid_scores else 75

        return {
            "overallSummary": f"The candidate completed a {difficulty} {interview_type} mock interview for the {job_role} role at {company_name} with an overall average score of {avg_score}/100. They demonstrated solid core technical concepts and articulated system trade-offs effectively.",
            "strengths": [
                f"Clear articulation of concepts relevant to {job_role} roles.",
                "Structured approach to problem solving and clear communication style."
            ],
            "weaknesses": [
                "Could provide deeper concrete production examples and edge-case handling details.",
                "Quantifiable performance metrics and telemetry strategies could be further elaborated."
            ],
            "improvementPlan": f"Review advanced system design patterns for {company_name}, practice explaining failure recovery strategies, and incorporate concrete metrics in future technical responses.",
            "source": "python_local"
        }

question_service = QuestionService()
