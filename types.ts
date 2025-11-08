
export interface AssignmentFeedback {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  formatting: number;
  structure: number;
  plagiarism: number;
}

export interface Assignment {
  prompts: string[];
  userSubmission?: {
    prompt: string;
    text: string;
    file?: File;
  };
  feedback?: AssignmentFeedback;
}

export interface Slide {
  title: string;
  content: string[]; // Array of bullet points or paragraphs
  speakerNotes: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string; // To store the user's selection
}

export interface Resource {
    title: string;
    url: string;
    type: 'course' | 'article' | 'video';
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface LecturePackage {
  slides: Slide[];
  script: string;
  quiz: QuizQuestion[];
  resources: Resource[];
  audioData: Uint8Array | null;
  groundingChunks?: GroundingChunk[];
  assignment?: Assignment;
}

export interface LoadingState {
  isLoading: boolean;
  stage: string;
}

export interface FormValues {
  topic: string;
  audience: string;
  duration: string;
  visualTheme: string;
  persona: string;
  useThinkingMode: boolean;
  file?: File | null;
}