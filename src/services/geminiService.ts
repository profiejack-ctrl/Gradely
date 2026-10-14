import { Subject, LearningPlan, WeeklyTopic, GradingPeriod } from '../types';

export const GEMINI_STORAGE_KEY = 'gradely_gemini_api_key';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

/**
 * Retrieves the configured Google Gemini API Key from localStorage or environment variables
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return '';
}

/**
 * Stores custom Gemini API key into browser localStorage
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  }
}

/**
 * Clears custom Gemini API key
 */
export function clearGeminiApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  }
}

export const GEMINI_MODEL_STORAGE_KEY = 'gradely_gemini_model';

/**
 * Retrieves the preferred Gemini model (defaults to gemini-3.5-flash-lite)
 */
export function getPreferredGeminiModel(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  }
  return DEFAULT_GEMINI_MODEL;
}

/**
 * Sets the preferred Gemini model
 */
export function setPreferredGeminiModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
  }
}

/**
 * Checks whether an API key is available
 */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

/**
 * Fast test ping to verify Gemini API key validity
 */
export async function testGeminiApiKey(keyToTest?: string): Promise<{ success: boolean; message: string; model?: string }> {
  const apiKey = keyToTest || getGeminiApiKey();
  if (!apiKey) {
    return { success: false, message: 'No Gemini API key provided.' };
  }

  const preferredModel = getPreferredGeminiModel();
  const modelsToTry = [preferredModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== preferredModel)];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Respond with exactly the word "CONNECTED" in all caps.' }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 10,
          },
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: `API key verified successfully using ${model}.`,
          model,
        };
      }

      const errorData = await response.json().catch(() => null);
      const errMsg = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;

      // If it's a 404 or model not found, try next model in fallback list
      if (response.status === 404 || errMsg.toLowerCase().includes('not found')) {
        continue;
      }

      // If invalid API key (400 or 403), stop and report error
      return { success: false, message: errMsg };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network connection failed.' };
    }
  }

  return { success: false, message: 'Could not connect with tested Gemini models. Please check your API key.' };
}

export interface SyllabusAnalysisInput {
  syllabusText?: string;
  pdfBase64?: string;
  fileName?: string;
  customInstructions?: string;
  totalWeeks?: number; // Defaults to 18 weeks (6 Prelim, 6 Midterm, 6 Finals)
}

/**
 * Cleans markdown code fences or backticks from JSON string responses
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * AI Agent: Analyzes course syllabus and generates structured 18-week learning plan
 */
export async function analyzeSyllabusWithGemini(
  subject: Subject,
  input: SyllabusAnalysisInput,
  apiKeyOverride?: string
): Promise<LearningPlan> {
  const apiKey = apiKeyOverride || getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please configure your API key in the settings modal.');
  }

  const totalWeeks = input.totalWeeks || 18;
  const prelimWeeks = Math.round(totalWeeks * 0.33); // e.g. 6 weeks
  const midtermWeeks = Math.round(totalWeeks * 0.33); // e.g. 6 weeks
  const finalsWeeks = totalWeeks - prelimWeeks - midtermWeeks; // e.g. 6 weeks

  const systemInstruction = `You are an expert collegiate Curriculum Director & Instructional Design AI Agent.
Your task is to analyze an uploaded course syllabus, course description, or curriculum outline for a collegiate academic course.
You must generate a comprehensive, highly-structured, week-by-week learning plan divided into three grading periods:
- Prelim Period (Weeks 1 to ${prelimWeeks})
- Midterm Period (Weeks ${prelimWeeks + 1} to ${prelimWeeks + midtermWeeks})
- Finals Period (Weeks ${prelimWeeks + midtermWeeks + 1} to ${totalWeeks}, lasting ${finalsWeeks} weeks)

You must output STRICT JSON matching this schema:
{
  "courseTitle": "Full title of the course",
  "courseCode": "Course code (e.g. ${subject.code})",
  "description": "Comprehensive course description and rationale",
  "targetAudience": "Year level and intended student cohort",
  "prerequisites": "Prerequisites or none",
  "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3", "Outcome 4", "Outcome 5"],
  "weeklyTopics": [
    {
      "weekNumber": 1,
      "period": "prelim",
      "title": "Clear concise topic title",
      "learningOutcomes": ["Weekly specific objective 1", "Weekly specific objective 2"],
      "topics": ["Key sub-topic 1", "Key sub-topic 2", "Key sub-topic 3"],
      "activities": ["Lab/Activity 1", "Suggested reading or quiz"],
      "notes": "Comprehensive teacher lecture note, essential concepts summary, and key takeaways for students"
    }
  ]
}

Ensure all ${totalWeeks} weeks are generated without placeholders, ellipses, or truncated items.
Each weekly topic's notes should provide high-value, educational study material and explanations for students.`;

  const userPrompt = `Course Code: ${subject.code}
Course Name: ${subject.name}
Credit Units: ${subject.units || 3}
Schedule: ${subject.schedule || 'N/A'}

${input.customInstructions ? `Special Instructor Instructions: ${input.customInstructions}\n` : ''}

${input.syllabusText ? `--- SYLLABUS CONTENT --- \n${input.syllabusText}\n------------------------` : 'Please design a standard, high-standard collegiate syllabus and 18-week learning plan matching this course code and subject name.'}

Please analyze this syllabus and return the structured JSON learning plan for all ${totalWeeks} weeks.`;

  // Prepare request parts
  const parts: any[] = [];

  // If PDF attachment was provided, add base64 inlineData
  if (input.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: input.pdfBase64,
      },
    });
  }

  // Add the text prompt
  parts.push({ text: userPrompt });

  let lastError: Error | null = null;

  const preferredModel = getPreferredGeminiModel();
  const modelsToTry = [preferredModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== preferredModel)];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;

        // If 404 or model not found, try fallback model
        if (response.status === 404 || errorMsg.toLowerCase().includes('not found')) {
          continue;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Received empty response from Gemini API.');
      }

      const cleanedJson = cleanJsonResponse(rawText);
      const parsed = JSON.parse(cleanedJson);

      // Validate & map weekly topics
      const weeklyTopics: WeeklyTopic[] = (parsed.weeklyTopics || []).map((wt: any, index: number) => {
        const weekNum = wt.weekNumber || index + 1;
        let period: GradingPeriod = 'prelim';
        if (weekNum > prelimWeeks + midtermWeeks) {
          period = 'finals';
        } else if (weekNum > prelimWeeks) {
          period = 'midterm';
        }

        return {
          id: `topic-${subject.id}-w${weekNum}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          weekNumber: weekNum,
          period: (wt.period as GradingPeriod) || period,
          title: wt.title || `Week ${weekNum}: Core Competencies & Topic`,
          learningOutcomes: Array.isArray(wt.learningOutcomes) ? wt.learningOutcomes : [wt.learningOutcomes || 'Master course competencies'],
          topics: Array.isArray(wt.topics) ? wt.topics : [wt.topics || 'Lecture & discussion'],
          activities: Array.isArray(wt.activities) ? wt.activities : wt.activities ? [wt.activities] : [],
          notes: wt.notes || 'Lecture notes and reference guidelines prepared for this module.',
          isPublished: false, // Default to unpublished (draft) so teacher can toggle public switch!
          updatedAt: new Date().toISOString(),
        };
      });

      const learningPlan: LearningPlan = {
        id: `plan-${subject.id}`,
        subjectId: subject.id,
        courseTitle: parsed.courseTitle || subject.name,
        courseCode: parsed.courseCode || subject.code,
        description: parsed.description || `Comprehensive 18-week learning plan and curriculum structure for ${subject.name}.`,
        targetAudience: parsed.targetAudience || 'Undergraduate Collegiate Students',
        prerequisites: parsed.prerequisites || 'None specified',
        learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes : [],
        weeklyTopics,
        rawSyllabusText: input.syllabusText ? input.syllabusText.slice(0, 1000) : undefined,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return learningPlan;
    } catch (err: any) {
      lastError = err;
      // If error is not a model not-found error, throw immediately
      if (!err.message?.toLowerCase().includes('not found') && !err.message?.includes('404')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Failed to analyze syllabus with Gemini API.');
}

/**
 * Built-in Sample Generator: Creates an authentic 18-week learning plan for demo purposes
 */
export function generateDemoLearningPlan(subject: Subject): LearningPlan {
  const weeks: WeeklyTopic[] = [];

  const prelimTopics = [
    { title: 'Course Orientation, Policies & Foundations', topics: ['Course Overview & Grading System', 'Prerequisite Review', 'Learning Objectives'] },
    { title: 'Core Theoretical Frameworks & Concepts', topics: ['Fundamental Principles', 'Standard Architectural Models', 'Historical Evolution'] },
    { title: 'Methodologies & Standard Implementations', topics: ['System Lifecycle', 'Design Methodologies', 'Workflow Pipelines'] },
    { title: 'Applied Fundamentals & Practical Tools', topics: ['Tooling & Setup', 'Environment Configuration', 'Initial Laboratory Exercises'] },
    { title: 'Mid-Prelim Integration & Case Analysis', topics: ['Case Study Investigation', 'Problem Solving Techniques', 'Group Brainstorming'] },
    { title: 'Prelim Assessment & Synthesis Review', topics: ['Comprehensive Review of Weeks 1-5', 'Prelim Examination Preparation', 'Consolidation of Outputs'] },
  ];

  const midtermTopics = [
    { title: 'Intermediate Architectures & Advanced Concepts', topics: ['Modular Design', 'Component Interoperability', 'Data Flow Optimization'] },
    { title: 'Hands-on Implementation & Lab Exercise 1', topics: ['Practical Application', 'Testing Frameworks', 'Code Quality & Refactoring'] },
    { title: 'Industry Best Practices & Security Guidelines', topics: ['Security Vulnerabilities', 'Standardization', 'Defensive Approaches'] },
    { title: 'Collaborative Project Phase 1: Planning', topics: ['Requirements Engineering', 'Milestone Definition', 'Prototyping & Feedback'] },
    { title: 'Performance Metrics & Benchmark Analysis', topics: ['Efficiency Evaluation', 'Optimization Strategies', 'Performance Profiling'] },
    { title: 'Midterm Evaluation & Progress Defense', topics: ['Midterm Period Review', 'Laboratory Milestone Review', 'Midterm Examination'] },
  ];

  const finalsTopics = [
    { title: 'Contemporary Trends & Modern Paradigms', topics: ['Emerging Technologies', 'Cloud & Scalability', 'Next-Gen Architectures'] },
    { title: 'Capstone Project Development & Integration', topics: ['System Integration', 'Cross-Component Testing', 'Issue Tracking & Triage'] },
    { title: 'Real-world Deployment & DevOps Pipeline', topics: ['CI/CD Pipelines', 'Deployment Environments', 'Monitoring & Maintenance'] },
    { title: 'Peer Review, Quality Assurance & Audit', topics: ['Code & Design Audit', 'User Acceptance Testing', 'Final Polish & Bug Fixes'] },
    { title: 'Final Project Defense & Presentation', topics: ['Oral Defense', 'System Demonstration', 'Documentation Submission'] },
    { title: 'Course Wrap-up, Grade Review & Outcomes Evaluation', topics: ['Final Examination', 'Curriculum Retrospective', 'Post-Course Assessment'] },
  ];

  const allTopicGroups = [
    ...prelimTopics.map((t, i) => ({ ...t, weekNumber: i + 1, period: 'prelim' as GradingPeriod })),
    ...midtermTopics.map((t, i) => ({ ...t, weekNumber: i + 7, period: 'midterm' as GradingPeriod })),
    ...finalsTopics.map((t, i) => ({ ...t, weekNumber: i + 13, period: 'finals' as GradingPeriod })),
  ];

  allTopicGroups.forEach((group) => {
    weeks.push({
      id: `topic-${subject.id}-w${group.weekNumber}`,
      weekNumber: group.weekNumber,
      period: group.period,
      title: `Week ${group.weekNumber}: ${group.title}`,
      learningOutcomes: [
        `Demonstrate comprehensive understanding of ${group.title.toLowerCase()}`,
        'Apply theoretical knowledge into concrete academic and practical solutions',
        'Formulate analytical conclusions based on real-world case scenarios',
      ],
      topics: group.topics,
      activities: [
        `Laboratory / Discussion Worksheet ${group.weekNumber}`,
        `Reading Assignment & Practical Exercise ${group.weekNumber}`,
      ],
      notes: `Essential Study Guide:
In this module, students investigate ${group.title}. Focus on the core principles of ${group.topics.join(', ')}. Review lecture slides and practice the provided worksheets before next session.`,
      isPublished: group.weekNumber <= 3, // Weeks 1-3 published for demo, remainder draft!
      updatedAt: new Date().toISOString(),
    });
  });

  return {
    id: `plan-${subject.id}`,
    subjectId: subject.id,
    courseTitle: subject.name,
    courseCode: subject.code,
    description: `Official 18-week academic curriculum for ${subject.name} (${subject.code}), aligned with collegiate standards and outcomes-based education.`,
    targetAudience: 'Collegiate Degree Students',
    prerequisites: 'Foundational coursework in computing or departmental consent',
    learningOutcomes: [
      'Master the core theoretical models, nomenclature, and paradigms of the course',
      'Design, build, and evaluate real-world solutions adhering to industry standards',
      'Synthesize multi-period concepts into an integrated capstone demonstration',
      'Demonstrate ethical and professional engineering competencies',
    ],
    weeklyTopics: weeks,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
