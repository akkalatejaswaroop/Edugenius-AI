import { GoogleGenAI, Type, Modality, GenerateContentResponse } from '@google/genai';
import { FormValues, Slide, QuizQuestion, Resource, LecturePackage, Assignment, AssignmentFeedback } from '../types';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

async function retryWithBackoff<T>(apiCall: () => Promise<T>): Promise<T> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      return await apiCall();
    } catch (e: any) {
      attempts++;
      const isRateLimitError = e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimitError && attempts < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempts - 1) + (Math.random() * 1000);
        console.warn(`Rate limit exceeded. Retrying in ${Math.round(delay)}ms... (Attempt ${attempts}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("API call failed after multiple retries or with a non-retriable error.", e);
        throw e;
      }
    }
  }
  throw new Error('Exceeded maximum retries for API call.');
}

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set.");
}

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const sanitizeJsonString = (jsonString: string): string => {
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    
    let startIndex = -1;

    if (firstBrace === -1 && firstBracket === -1) return jsonString;
    
    if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
        startIndex = firstBrace;
    } else {
        startIndex = firstBracket;
    }

    const lastBrace = jsonString.lastIndexOf('}');
    const lastBracket = jsonString.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);
    
    if (startIndex === -1 || endIndex === -1) return jsonString;

    let sanitized = jsonString.substring(startIndex, endIndex + 1).trim();

    const scriptPattern = /("script"\s*:\s*".*?"\s*)\],(\s*"quiz"\s*:)/s;
    if (scriptPattern.test(sanitized)) {
        sanitized = sanitized.replace(scriptPattern, '$1,$2');
    }
    return sanitized;
};
const toCamelCase = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const convertKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(v => convertKeysToCamelCase(v));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      (result as any)[toCamelCase(key)] = convertKeysToCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

const parseAndTransformContent = (rawText: string) => {
  if (!rawText) throw new Error("The AI returned an empty response.");
  const sanitizedText = sanitizeJsonString(rawText);
  try {
    const parsedContent = JSON.parse(sanitizedText);
    const camelCased = convertKeysToCamelCase(parsedContent);

    if (camelCased.slides && Array.isArray(camelCased.slides)) {
      camelCased.slides.forEach((slide: any) => {
        if (slide.bulletPoints && !slide.content) {
          slide.content = slide.bulletPoints;
          delete slide.bulletPoints;
        }
      });
    }

    if (camelCased.resources && Array.isArray(camelCased.resources)) {
      camelCased.resources.forEach((res: any) => {
        if (res.name && !res.title) {
          res.title = res.name;
          delete res.name;
        }
        if (res.type && typeof res.type === 'string') {
          const lowerType = res.type.toLowerCase();
          if (lowerType.includes('video')) res.type = 'video';
          else if (lowerType.includes('course') || lowerType.includes('lab')) res.type = 'course';
          else res.type = 'article';
        }
      });
    }

    return camelCased;
// FIX: Corrected syntax error in catch block.
  } catch (e) {
    console.error("Failed to parse JSON. Raw text:", rawText, "Sanitized:", sanitizedText, "Error:", e);
    throw new Error("The AI returned an invalid response format. Please try again.");
  }
};

const fileToGenerativePart = async (file: File | Blob, mimeType?: string) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: await base64EncodedDataPromise, mimeType: mimeType || file.type } };
};

// FIX: Add explicit return type to fix a type inference issue in App.tsx.
export const generateScriptStream = async (values: FormValues): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const ai = getAI();
    const model = 'gemini-2.5-flash-lite';
    
    const basePrompt = `You are an expert curriculum designer, adopting the persona of a "${values.persona}". Generate a complete and detailed narration script for a lecture.
    - Topic: ${values.topic || 'the provided file'}
    - Target Audience: ${values.audience}
    - Desired Length: ${values.duration}
    Your output MUST be ONLY the raw script text. Do not include any titles, headings, JSON formatting, markdown, or conversational text. Just the script itself.`;

    let contents: any;
    if (values.file) {
        const filePart = await fileToGenerativePart(values.file);
        contents = { parts: [filePart, { text: `Analyze the provided file (${values.file.name}) and generate the lecture script based on it.\n\n${basePrompt}` }] };
    } else {
        contents = basePrompt;
    }

    const responseStream = await retryWithBackoff(() => ai.models.generateContentStream({ model, contents }));
    return responseStream;
};

export const generateSlidesFromScript = async (script: string, theme: string, useThinkingMode: boolean): Promise<{ slides: Slide[] }> => {
    const ai = getAI();
    const model = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const prompt = `Based on the following narration script, generate a series of presentation slides.
    - Visual Theme: ${theme}
    The output MUST be a single, valid JSON object with the structure: { "slides": [{ "title": "...", "content": ["..."], "speakerNotes": "..." }] }.
    - The "content" array should contain the key bullet points for the slide.
    - "speakerNotes" should be a concise summary for the presenter for that slide.
    - Ensure all keys are in camelCase.
    Narration Script:
    ---
    ${script}
    ---`;

    // FIX: Correctly place thinkingConfig inside the config object.
    const config = useThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : undefined;
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model, contents: prompt, config }));
    if (!response.text) throw new Error("AI returned no slide data.");
    return parseAndTransformContent(response.text);
};

export const generateQuizAndResourcesFromScript = async (script: string, useThinkingMode: boolean): Promise<{ quiz: QuizQuestion[]; resources: Resource[], groundingChunks?: any[] }> => {
    const ai = getAI();
    const model = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    const prompt = `Based on the following narration script, generate a quiz and a list of further learning resources.
    Use Google Search to find relevant, up-to-date resources.
    The output MUST be a single, valid JSON object with the structure: {
        "quiz": [{ "question": "...", "options": ["..."], "correctAnswer": "...", "explanation": "..." }],
        "resources": [{ "title": "...", "url": "...", "type": "article" | "video" | "course" }]
    }.
    - Provide at least 4 quiz questions.
    - Provide at least 8 resources, with a mix of videos, articles, and courses.
    - Ensure all keys are in camelCase.
    Narration Script:
    ---
    ${script}
    ---`;

    const config: { tools: any[]; thinkingConfig?: object } = { tools: [{googleSearch: {}}] };
    if (useThinkingMode) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model, contents: prompt, config }));
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    if (!response.text) throw new Error("AI returned no quiz or resource data.");
    
    const parsed = parseAndTransformContent(response.text);
    return { ...parsed, groundingChunks };
};

export const generateMoreQuizQuestions = async (topic: string, script: string, persona: string): Promise<QuizQuestion[]> => {
    const ai = getAI();
    const prompt = `Based on the lecture topic "${topic}" and script, generate 3 new, unique quiz questions in the style of a "${persona}".
        Your output MUST be a single, valid JSON array of question objects, with camelCase keys.`;
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    if (!response.text) throw new Error("AI returned no content for additional quiz questions.");
    const newQuestions = parseAndTransformContent(response.text);
    return Array.isArray(newQuestions) ? newQuestions : [];
};

export const translateLecturePackage = async (originalPackage: LecturePackage, targetLanguage: string): Promise<{ slides: Slide[]; script: string; quiz: QuizQuestion[]; assignment?: Assignment; }> => {
  const ai = getAI();
  const contentToTranslate = { slides: originalPackage.slides, script: originalPackage.script, quiz: originalPackage.quiz, assignment: originalPackage.assignment };
  const prompt = `You are an expert translator. Translate the text content in the following JSON object into ${targetLanguage}, maintaining the original persona and tone.
    Do NOT translate keys or change the JSON structure. Your output must be a single, valid JSON object with camelCase keys.
    JSON to translate: ${JSON.stringify(contentToTranslate, null, 2)}`;
  const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt }));
  if (!response.text) throw new Error("AI returned no content for translation.");
  return parseAndTransformContent(response.text);
};

export const generateAssignment = async (topic: string, script: string): Promise<{ prompts: string[] }> => {
    const ai = getAI();
    const prompt = `You are a university professor. Based on the lecture topic '${topic}', generate 3 distinct, open-ended assignment prompts that encourage critical thinking.
    Your output MUST be a valid JSON object: { "prompts": ["prompt1", "prompt2", "prompt3"] }. Use camelCase keys.`;
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }));
    if (!response.text) throw new Error("AI returned no assignment prompts.");
    return parseAndTransformContent(response.text);
};

export const gradeAssignment = async (submission: string | File, assignmentPrompt: string, script: string): Promise<AssignmentFeedback> => {
    const ai = getAI();
    const basePrompt = `You are a helpful teaching assistant. A student was given the prompt: '${assignmentPrompt}'.
    Evaluate the submission based on the original lecture script for context.
    Your evaluation should assess the following criteria:
    1.  **Formatting & Neatness**: How well is the document formatted? Is it clean and easy to read?
    2.  **Structure**: Does the submission have a logical flow (introduction, body, conclusion)? Is it well-organized?
    3.  **Plagiarism**: Compare the submission against the provided lecture script. A low score (e.g., < 20) is good here.
    4.  **Content Quality**: How well does it answer the prompt? Is the reasoning sound?

    Provide a final score out of 10. Also provide separate scores for formatting, structure, and plagiarism, each out of 100.
    Your output MUST be a valid JSON object with camelCase keys: {
      "score": number,
      "overall": "...",
      "strengths": ["..."],
      "improvements": ["..."],
      "formatting": number,
      "structure": number,
      "plagiarism": number
    }.`;

    let contents: any;
    if (typeof submission === 'string') {
        contents = `The student submitted the following text: '${submission}'. The original lecture script is:\n---\n${script}\n---\n${basePrompt}`;
    } else {
        const filePart = await fileToGenerativePart(submission);
        contents = { parts: [ { text: `The student's submission is in the attached file. The original lecture script is:\n---\n${script}\n---\n${basePrompt}` }, filePart ] };
    }

    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model: 'gemini-2.5-pro', contents }));
    if (!response.text) throw new Error("AI returned no grading feedback.");
    return parseAndTransformContent(response.text);
};

const getTtsPromptForPersona = (script: string, persona: string): string => {
    switch (persona) {
        case 'Calm Teacher': return `Say in a calm, patient, and encouraging tone: ${script}`;
        case 'Funny Teacher': return `Say in a cheerful, humorous, and engaging tone, with energetic delivery: ${script}`;
        case 'IIT Professor': return `Say in a formal, knowledgeable, and precise tone, suitable for a university lecture: ${script}`;
        case 'CBSE Teacher': return `Say in a clear, structured, and slightly formal tone, as if explaining concepts for a board exam: ${script}`;
        default: return `Please read the following text aloud: ${script}`;
    }
};

export const generateVoiceover = async (script: string, persona: string): Promise<Uint8Array> => {
    const ai = getAI();
    const MAX_TTS_CHARS = 3000;
    const truncatedScript = script.length > MAX_TTS_CHARS ? script.substring(0, MAX_TTS_CHARS) : script;
    const ttsPrompt = getTtsPromptForPersona(truncatedScript, persona);
    
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: ttsPrompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received from API.");
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const ai = getAI();
  const audioPart = await fileToGenerativePart(audioBlob);
  const contents = { parts: [ { text: "Transcribe the following audio accurately." }, audioPart ] };
  const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({ model: 'gemini-2.5-flash', contents }));
  if (!response.text) throw new Error("Failed to transcribe audio. The model returned an empty response.");
  return response.text;
};