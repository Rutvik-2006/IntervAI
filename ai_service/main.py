from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from services.voice_service import voice_service
from services.ats_service import ats_service
from services.vision_service import vision_service
from services.question_service import question_service
from services.coding_service import coding_service

app = FastAPI(
    title="AI InterviewOS Python Microservice",
    description="Python FastAPI engine for Question Generation, Answer Evaluation, Voice Metrics, Speech-to-Text (Whisper), Vision Analysis, and ATS Matching.",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceAnalysisRequest(BaseModel):
    text: str
    duration_seconds: Optional[float] = 30.0

class AtsAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str

class VisionAnalysisRequest(BaseModel):
    frame_data: Optional[str] = None

class QuestionGenerateRequest(BaseModel):
    session: Dict[str, Any]
    candidateAnswerText: Optional[str] = ""
    previousQuestionText: Optional[str] = ""
    resumeSkills: Optional[List[str]] = None

class AnswerEvaluateRequest(BaseModel):
    questionText: str
    idealAnswer: Optional[str] = ""
    candidateAnswer: str

class ReportSummaryRequest(BaseModel):
    session: Dict[str, Any]
    answers: List[Dict[str, Any]]

class CodingExecuteRequest(BaseModel):
    source_code: str
    language: Optional[str] = "python"
    test_cases: Optional[List[Dict[str, Any]]] = None

class CodingEvaluateRequest(BaseModel):
    problem_title: str
    source_code: str
    language: str
    pass_count: int
    total_count: int

@app.get("/")
def health_check():
    return {"status": "ok", "service": "AI InterviewOS Python Microservice"}

@app.post("/api/coding/generate")
def generate_coding_question(req: QuestionGenerateRequest):
    try:
        return coding_service.generate_coding_question(req.session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coding/execute")
def execute_coding_solution(req: CodingExecuteRequest):
    try:
        return coding_service.execute_code(req.source_code, req.language, req.test_cases)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coding/evaluate")
def evaluate_coding_solution(req: CodingEvaluateRequest):
    try:
        return coding_service.evaluate_code_quality(
            problem_title=req.problem_title,
            source_code=req.source_code,
            language=req.language,
            pass_count=req.pass_count,
            total_count=req.total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/analyze")
def analyze_voice(req: VoiceAnalysisRequest):
    try:
        return voice_service.analyze_audio_text(req.text, req.duration_seconds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        return voice_service.transcribe_audio_file(contents, file.filename or "audio.webm")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ats/analyze")
def analyze_ats(req: AtsAnalysisRequest):
    try:
        return ats_service.analyze_ats(req.resume_text, req.job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vision/analyze")
def analyze_vision(req: VisionAnalysisRequest):
    try:
        return vision_service.analyze_webcam_frame(req.frame_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/questions/generate")
def generate_question(req: QuestionGenerateRequest):
    try:
        return question_service.generate_question(
            session=req.session,
            candidate_answer_text=req.candidateAnswerText,
            previous_question_text=req.previousQuestionText,
            resume_skills=req.resumeSkills
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/questions/evaluate")
def evaluate_answer(req: AnswerEvaluateRequest):
    try:
        return question_service.evaluate_answer(
            question_text=req.questionText,
            ideal_answer=req.idealAnswer,
            candidate_answer=req.candidateAnswer
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/questions/report-summary")
def generate_report_summary(req: ReportSummaryRequest):
    try:
        return question_service.generate_session_report_summary(
            session=req.session,
            answers=req.answers
        )
    except Exception as e:
        print(f"❌ [Python Main Error] report-summary endpoint exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
