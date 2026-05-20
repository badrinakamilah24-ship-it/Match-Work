import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const GeminiService = {
  async analyzeResume(resumeText: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a bilingual (Indonesian/English) Career Document Validator and Analyzer.
        
        TASK:
        Perform a strict but fair validation on the provided text to see if it is a valid Resume, CV, or Cover Letter (Surat Lamaran Kerja).

        VALIDATION CRITERIA:
        1. Language: Supports both Indonesian and English.
        2. Detection Keywords:
           - Indonesian: "Pengalaman", "Riwayat Kerja", "Pendidikan", "Keahlian", "Tentang Saya", "Data Diri", "Kontak", "Kemampuan".
           - English: "Experience", "Skills", "Education", "About Me", "Profile", "Contact", "Background", "Biography".
        3. Threshold: If the document contains a Name, Contact Info, and at least ONE section related to career (Skills, Bio, or Education), mark as VALID.
        4. Rejection: ONLY mark as INVALID if the text is clearly irrelevant to a job application (e.g., resep masakan, jurnal ilmiah, artikel berita, lirik lagu, dokumen sekolah biasa tanpa riwayat).

        ANALYSIS STEP (Only if VALID):
        - Summarize skills (Keahlian).
        - Suggest improvements for their profile.
        - Identify missing skills based on modern job targets (including for youths and seniors).
        - Suggest a professional job title.

        REJECTION STEP (If INVALID):
        - Provide a SPECIFIC and helpful reason in 'invalidMessage' (e.g., "Teks terlalu singkat untuk sebuah CV", "Informasi karir atau kontak tidak ditemukan", "Dokumen terdeteksi sebagai resep masakan").

        Text to analyze: ${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            invalidMessage: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedTitle: { type: Type.STRING }
          },
          required: ["isValid", "skills", "improvements", "missingSkills", "suggestedTitle"]
        }
      }
    });

    return JSON.parse(response.text);
  },

  async calculateMatch(job: any, seeker: any) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Calculate a match score (0-100) between this job and candidate. The candidate can be anyone from a fresh graduate (SMA/SMK) to an experienced worker.
        Job: ${JSON.stringify(job)}
        Candidate: ${JSON.stringify(seeker)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["score", "reason"]
        }
      }
    });

    return JSON.parse(response.text);
  }
};
