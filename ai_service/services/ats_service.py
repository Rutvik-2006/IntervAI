import re

class AtsService:
    def analyze_ats(self, resume_text: str, job_description: str):
        """
        Extracts skills and scores semantic match between resume text and job description.
        """
        tech_keywords = [
            "python", "javascript", "typescript", "react", "node", "express", "fastapi",
            "mongodb", "postgresql", "sql", "docker", "aws", "redis", "rest api", "graphql",
            "git", "ci/cd", "microservices", "html", "css", "tailwind", "pytest", "jest"
        ]
        
        resume_lower = resume_text.lower()
        jd_lower = job_description.lower()
        
        extracted_skills = [kw for kw in tech_keywords if re.search(r'\b' + re.escape(kw) + r'\b', resume_lower)]
        jd_skills = [kw for kw in tech_keywords if re.search(r'\b' + re.escape(kw) + r'\b', jd_lower)]
        
        matched_skills = list(set(extracted_skills).intersection(set(jd_skills)))
        missing_skills = list(set(jd_skills) - set(extracted_skills))
        
        if jd_skills:
            ats_score = int((len(matched_skills) / len(jd_skills)) * 100)
        else:
            ats_score = min(100, int(len(extracted_skills) * 15))
            
        return {
            "atsScore": max(30, min(100, ats_score)),
            "extractedSkills": extracted_skills,
            "matchedSkills": matched_skills,
            "missingSkills": missing_skills,
            "suggestions": [
                f"Consider adding key skills to your resume: {', '.join(missing_skills[:3])}" if missing_skills else "Your resume aligns well with target skills."
            ]
        }

ats_service = AtsService()
