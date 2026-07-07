const pdfParse = require('pdf-parse');
const resumeRepository = require('./resume.repository');
const AppError = require('../../utils/appError');

class ResumeService {
  /**
   * Helper dictionary of common technical & soft skills for keyword matching
   */
  static SKILL_DICTIONARY = [
    'JavaScript', 'TypeScript', 'React', 'React.js', 'Node.js', 'Express', 'Express.js',
    'MongoDB', 'PostgreSQL', 'SQL', 'Python', 'Java', 'C++', 'Go', 'Docker',
    'Kubernetes', 'AWS', 'Azure', 'GCP', 'HTML', 'CSS', 'Tailwind CSS', 'Redux',
    'GraphQL', 'REST API', 'Git', 'GitHub', 'CI/CD', 'Agile', 'Scrum', 'Linux',
    'Microservices', 'System Design', 'Data Structures', 'Algorithms', 'Jest', 'Vite'
  ];

  /**
   * Parse PDF text and extract contact info & matched skills
   */
  parseResumeText(text) {
    const cleanText = text || '';

    // Extract email
    const emailMatch = cleanText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const email = emailMatch ? emailMatch[0] : null;

    // Extract phone number
    const phoneMatch = cleanText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Extract matched skills (case-insensitive search with proper regex escaping)
    const matchedSkills = [];
    ResumeService.SKILL_DICTIONARY.forEach((skill) => {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}(?![a-zA-Z0-9_])`, 'i');
      if (regex.test(cleanText) && !matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
      }
    });

    // Detect section headings
    const hasEducation = /education|university|college|bachelor|master|degree/i.test(cleanText);
    const hasExperience = /experience|work history|employment|job|position/i.test(cleanText);
    const hasProjects = /projects|portfolio|personal projects/i.test(cleanText);

    return {
      email,
      phone,
      matchedSkills,
      hasEducation,
      hasExperience,
      hasProjects,
    };
  }

  /**
   * Calculate simulated ATS Score (0-100) and generate feedback
   */
  calculateATSScoreAndFeedback(parsed, rawText) {
    let score = 50; // Base score
    const strengths = [];
    const weaknesses = [];

    // Check contact info
    if (parsed.email && parsed.phone) {
      score += 10;
      strengths.push('Contact information (email and phone) is clearly specified.');
    } else {
      weaknesses.push('Missing explicit phone number or email address in header.');
    }

    // Check sections
    if (parsed.hasExperience) {
      score += 10;
      strengths.push('Includes a dedicated Work Experience section.');
    } else {
      weaknesses.push('Work Experience section is unclear or missing.');
    }

    if (parsed.hasEducation) {
      score += 10;
      strengths.push('Education history is identified.');
    } else {
      weaknesses.push('Education section is missing or hard for ATS scanners to read.');
    }

    if (parsed.hasProjects) {
      score += 5;
      strengths.push('Key projects section included.');
    }

    // Check skill count
    const skillCount = parsed.matchedSkills.length;
    if (skillCount >= 8) {
      score += 15;
      strengths.push(`Strong technical keyword density (${skillCount} keywords detected).`);
    } else if (skillCount >= 4) {
      score += 10;
      strengths.push(`Good keyword foundation (${skillCount} keywords detected).`);
    } else {
      weaknesses.push('Low keyword density. Consider explicitly listing modern technical skills.');
    }

    // Check text length
    if (rawText.length > 500 && rawText.length < 5000) {
      score += 0; // ideal length range
    } else if (rawText.length <= 500) {
      score -= 10;
      weaknesses.push('Resume content appears too brief for complete ATS indexing.');
    }

    // Cap score between 0 and 100
    const finalScore = Math.min(Math.max(score, 0), 100);

    // Format markdown feedback
    let feedback = `### ATS Score Breakdown: ${finalScore}/100\n\n`;

    feedback += `#### 💡 Key Strengths:\n`;
    if (strengths.length > 0) {
      strengths.forEach((s) => (feedback += `- ${s}\n`));
    } else {
      feedback += `- Standard layout detected.\n`;
    }

    feedback += `\n#### ⚠️ Areas for Improvement:\n`;
    if (weaknesses.length > 0) {
      weaknesses.forEach((w) => (feedback += `- ${w}\n`));
    } else {
      feedback += `- Great job! Your resume passes standard ATS parsing metrics cleanly.\n`;
    }

    feedback += `\n#### 🎯 Recommendations:\n`;
    feedback += `- Ensure bullet points in experience highlight quantifiable metrics (e.g. "Increased performance by 35%").\n`;
    feedback += `- Keep formatting clean: avoid tables or heavy graphics which confuse ATS parser agents.\n`;

    return { atsScore: finalScore, atsFeedback: feedback };
  }

  /**
   * Upload and process PDF resume
  /**
   * Universal PDF text extractor supporting both pdf-parse v1 and v2 API exports
   */
  async extractTextFromPDF(buffer) {
    const pdfModule = require('pdf-parse');

    // Handle v1 function export
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return data.text || '';
    }

    // Handle v2 PDFParse class export
    const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return typeof res === 'string' ? res : (res.text || '');
    }

    return buffer.toString('utf-8');
  }

  /**
   * Upload and process PDF resume
   */
  async uploadAndProcessResume(userId, file) {
    if (!file) {
      throw new AppError('Please select a PDF file to upload.', 400);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new AppError('Only PDF files are supported.', 400);
    }

    let rawText = '';
    try {
      rawText = await this.extractTextFromPDF(file.buffer);
    } catch (err) {
      console.error('PDF Parsing Error:', err);
      throw new AppError('Failed to parse PDF file. Please ensure it is a valid PDF.', 400);
    }

    const parsed = this.parseResumeText(rawText);
    let { atsScore, atsFeedback } = this.calculateATSScoreAndFeedback(parsed, rawText);
    let extractedSkills = parsed.matchedSkills;

    // Call AI Engine for live LLM ATS resume evaluation
    const aiEngine = require('../../utils/aiEngine');
    const aiAtsResult = await aiEngine.analyzeResumeWithAI(rawText, 'Software Engineer');
    if (aiAtsResult && aiAtsResult.atsScore) {
      atsScore = aiAtsResult.atsScore;
      if (aiAtsResult.extractedSkills && aiAtsResult.extractedSkills.length > 0) {
        extractedSkills = Array.from(new Set([...parsed.matchedSkills, ...aiAtsResult.extractedSkills]));
      }

      atsFeedback = `### 🤖 AI ATS Score: ${atsScore}/100\n\n`;
      if (aiAtsResult.strengths && aiAtsResult.strengths.length > 0) {
        atsFeedback += `#### 💡 Key Strengths:\n`;
        aiAtsResult.strengths.forEach((s) => (atsFeedback += `- ${s}\n`));
      }
      if (aiAtsResult.weaknesses && aiAtsResult.weaknesses.length > 0) {
        atsFeedback += `\n#### ⚠️ Areas for Improvement:\n`;
        aiAtsResult.weaknesses.forEach((w) => (atsFeedback += `- ${w}\n`));
      }
      if (aiAtsResult.suggestions && aiAtsResult.suggestions.length > 0) {
        atsFeedback += `\n#### 🎯 AI Recommendations:\n`;
        aiAtsResult.suggestions.forEach((rec) => (atsFeedback += `- ${rec}\n`));
      }
    }

    // Deactivate previous active resumes for this user
    await resumeRepository.deactivateAllResumesForUser(userId);

    // Construct mock parsedData object
    const parsedData = {
      education: parsed.hasEducation ? [{ degree: 'Degree Parsed', institution: 'University' }] : [],
      experience: parsed.hasExperience ? [{ role: 'Role Parsed', company: 'Company' }] : [],
      projects: parsed.hasProjects ? [{ title: 'Project Parsed', description: 'Description' }] : [],
    };

    // Save resume to DB
    const resume = await resumeRepository.createResume({
      userId,
      fileUrl: `data:application/pdf;base64,${file.buffer.toString('base64')}`,
      fileName: file.originalname,
      parsedData,
      skills: extractedSkills,
      atsScore,
      atsFeedback,
      rawText,
      isActive: true,
    });

    return resume;
  }

  async getActiveResume(userId) {
    return await resumeRepository.findActiveResumeByUserId(userId);
  }

  async getUserResumes(userId) {
    return await resumeRepository.findResumesByUserId(userId);
  }
}

module.exports = new ResumeService();
