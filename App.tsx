import React, { useState, useCallback } from 'react';
import { LectureForm } from './components/LectureForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Header } from './components/Header';
import { Chatbot } from './components/Chatbot';
import { Highlights } from './components/Highlights';
import { ProjectInfo } from './components/ProjectInfo';
import { WelcomeBanner } from './components/WelcomeBanner';
import { PlusCircleIcon, FileTextIcon, VideoIcon } from './components/icons';
import { LoadingState, LecturePackage, FormValues, Assignment } from './types';
import { 
  generateScriptStream,
  generateSlidesFromScript,
  generateQuizAndResourcesFromScript,
  generateVoiceover, 
  generateMoreQuizQuestions, 
  translateLecturePackage,
  generateAssignment,
  gradeAssignment,
} from './services/geminiService';
import { VideoTab } from './components/VideoTab';

type AppMode = 'lecture' | 'video';

const App: React.FC = () => {
  const [originalLecturePackage, setOriginalLecturePackage] = useState<LecturePackage | null>(null);
  const [displayLecturePackage, setDisplayLecturePackage] = useState<LecturePackage | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    stage: ''
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [appMode, setAppMode] = useState<AppMode>('lecture');
  
  const handleFormSubmit = useCallback(async (values: FormValues) => {
    setError(null);
    setOriginalLecturePackage(null);
    setDisplayLecturePackage(null);
    setCurrentLanguage('English');
    setFormValues(values);
    setCurrentSlide(0);

    const emptyPackage: LecturePackage = {
        slides: [], script: '', quiz: [], resources: [], audioData: null,
    };

    try {
        setLoadingState({ isLoading: true, stage: 'Generating narration script...' });

        // Step 1: Generate script via stream for rapid initial feedback
        const scriptStream = await generateScriptStream(values);
        
        let script = '';
        const initialPackage = { ...emptyPackage };
        setOriginalLecturePackage(initialPackage);
        setDisplayLecturePackage(initialPackage);

        for await (const chunk of scriptStream) {
            script += chunk.text;
            const streamingPackage = { ...initialPackage, script };
            setOriginalLecturePackage(streamingPackage);
            setDisplayLecturePackage(streamingPackage);
        }

        const packageWithScript = { ...initialPackage, script };

        setLoadingState({ isLoading: true, stage: 'Creating slides, quiz, audio & resources...' });

        // Step 2: Generate everything else in parallel
        const [slidesResult, quizAndResourcesResult, audioResult] = await Promise.allSettled([
            generateSlidesFromScript(script, values.visualTheme, values.useThinkingMode),
            generateQuizAndResourcesFromScript(script, values.useThinkingMode),
            generateVoiceover(script, values.persona)
        ]);

        // Process results and update the package progressively
        const finalPackage = { ...packageWithScript };

        if (slidesResult.status === 'fulfilled') {
            finalPackage.slides = slidesResult.value.slides || [];
        } else {
            console.error("Failed to generate slides:", slidesResult.reason);
        }
        
        if (quizAndResourcesResult.status === 'fulfilled') {
            finalPackage.quiz = quizAndResourcesResult.value.quiz || [];
            finalPackage.resources = quizAndResourcesResult.value.resources || [];
            finalPackage.groundingChunks = quizAndResourcesResult.value.groundingChunks;
        } else {
            console.error("Failed to generate quiz/resources:", quizAndResourcesResult.reason);
        }

        if (audioResult.status === 'fulfilled') {
            finalPackage.audioData = audioResult.value;
        } else {
            console.error("Failed to generate voiceover:", audioResult.reason);
        }
        
        setOriginalLecturePackage(finalPackage);
        setDisplayLecturePackage(finalPackage);
        
    } catch (e: any) {
        console.error(e);
        const message = e.message || '';
        if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
            setError("The AI service is currently busy. Please wait a moment and try again.");
        } else {
            setError(`An error occurred: ${message}`);
        }
    } finally {
        setLoadingState({ isLoading: false, stage: '' });
    }
  }, []);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);
  
  const handleGenerateMoreQuiz = useCallback(async () => {
    if (!displayLecturePackage || !formValues) return;

    try {
      const newQuestions = await generateMoreQuizQuestions(formValues.topic, displayLecturePackage.script, formValues.persona);
      const updatePackage = (pkg: LecturePackage | null) => {
        if (!pkg) return null;
        const existingQuestionTexts = new Set((pkg.quiz || []).map(q => q.question));
        const uniqueNewQuestions = newQuestions.filter(q => !existingQuestionTexts.has(q.question));
        return { ...pkg, quiz: [...(pkg.quiz || []), ...uniqueNewQuestions] };
      };
      
      setDisplayLecturePackage(updatePackage);
      if (currentLanguage === 'English') {
        setOriginalLecturePackage(updatePackage);
      }
    } catch (e: any) {
       console.error("Failed to generate more quiz questions:", e);
       setError("Sorry, we couldn't generate more questions at this time.");
    }
  }, [displayLecturePackage, formValues, currentLanguage]);
  
  const handleLanguageChange = useCallback(async (newLanguage: string) => {
    if (!originalLecturePackage || newLanguage === currentLanguage || !formValues) return;
    
    setError(null);
    setCurrentLanguage(newLanguage);
    
    if (newLanguage === 'English') {
      setDisplayLecturePackage(originalLecturePackage);
      return;
    }
    
    setIsTranslating(true);
    try {
      const translatedTextPackage = await translateLecturePackage(originalLecturePackage, newLanguage);
      
      const partialTranslatedPackage: LecturePackage = {
        ...originalLecturePackage,
        ...translatedTextPackage,
        audioData: null,
      };

      // Sanitize the merged package to prevent crashes from missing array properties from the AI response.
      partialTranslatedPackage.slides = partialTranslatedPackage.slides || [];
      partialTranslatedPackage.quiz = partialTranslatedPackage.quiz || [];
      partialTranslatedPackage.resources = partialTranslatedPackage.resources || [];
      if (partialTranslatedPackage.assignment) {
        partialTranslatedPackage.assignment.prompts = partialTranslatedPackage.assignment.prompts || [];
        if (partialTranslatedPackage.assignment.feedback) {
          partialTranslatedPackage.assignment.feedback.strengths = partialTranslatedPackage.assignment.feedback.strengths || [];
          partialTranslatedPackage.assignment.feedback.improvements = partialTranslatedPackage.assignment.feedback.improvements || [];
        }
      }
      
      setDisplayLecturePackage(partialTranslatedPackage);
      
      const newAudioData = await generateVoiceover(translatedTextPackage.script || originalLecturePackage.script, formValues.persona);
      
      setDisplayLecturePackage(prev => prev ? { ...prev, audioData: newAudioData } : null);
      
    } catch (e: any) {
      console.error("Translation error:", e);
      setError(`Failed to translate to ${newLanguage}. Please try again.`);
      setCurrentLanguage('English');
      setDisplayLecturePackage(originalLecturePackage);
    } finally {
      setIsTranslating(false);
    }
    
  }, [originalLecturePackage, currentLanguage, formValues]);

  const handleGenerateAssignment = useCallback(async () => {
    if (!displayLecturePackage || !formValues || displayLecturePackage.assignment) return;
    try {
        const assignmentPrompts = await generateAssignment(formValues.topic, displayLecturePackage.script);
        const newAssignment: Assignment = { prompts: assignmentPrompts.prompts || [] };
        
        const updatePackage = (pkg: LecturePackage | null) => pkg ? { ...pkg, assignment: newAssignment } : null;
        
        setDisplayLecturePackage(updatePackage);
        if (currentLanguage === 'English') {
            setOriginalLecturePackage(updatePackage);
        }
    } catch (e: any) {
        console.error("Failed to generate assignment:", e);
        setError("Sorry, we couldn't generate an assignment at this time.");
    }
  }, [displayLecturePackage, formValues, currentLanguage]);

  const handleGradeSubmission = useCallback(async (submission: string | File, prompt: string) => {
    if (!displayLecturePackage || !formValues) return;
    try {
        const feedback = await gradeAssignment(submission, prompt, displayLecturePackage.script);
        
        const updatePackage = (pkg: LecturePackage | null) => {
            if (!pkg || !pkg.assignment) return pkg;
            const updatedAssignment: Assignment = {
                ...pkg.assignment,
                userSubmission: {
                  prompt,
                  text: typeof submission === 'string' ? submission : `File: ${submission.name}`,
                  file: typeof submission !== 'string' ? submission : undefined,
                },
                feedback: {
                    score: feedback.score || 0,
                    overall: feedback.overall || '',
                    strengths: feedback.strengths || [],
                    improvements: feedback.improvements || [],
                    formatting: feedback.formatting || 0,
                    structure: feedback.structure || 0,
                    plagiarism: feedback.plagiarism || 0,
                },
            };
            return { ...pkg, assignment: updatedAssignment };
        };

        setDisplayLecturePackage(updatePackage);
        if (currentLanguage === 'English') {
            setOriginalLecturePackage(updatePackage);
        }

    } catch (e: any) {
        console.error("Failed to grade assignment:", e);
        setError("Sorry, we couldn't grade the assignment at this time.");
    }
  }, [displayLecturePackage, formValues, currentLanguage]);

  const renderContent = () => {
    if (appMode === 'video') {
      return <VideoTab />;
    }

    return (
      <>
        <div className="max-w-3xl mx-auto mt-10">
          <LectureForm onSubmit={handleFormSubmit} isLoading={loadingState.isLoading} />
        </div>
        
        {error && (
          <div className="max-w-3xl mx-auto mt-8 p-4 bg-red-100 border border-red-300 rounded-lg text-center text-red-800">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
        
        {displayLecturePackage && !loadingState.isLoading && (
            <div className="max-w-5xl mx-auto my-8 text-center">
                <button 
                    onClick={handleReset} 
                    className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-primary transition-all"
                >
                    <PlusCircleIcon className="h-5 w-5" />
                    Start a New Lecture
                </button>
            </div>
        )}

        <ResultsDisplay
            lecturePackage={displayLecturePackage}
            loadingState={loadingState}
            visualTheme={formValues?.visualTheme || 'Modern & Minimalist'}
            onGenerateMoreQuiz={handleGenerateMoreQuiz}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            isTranslating={isTranslating}
            currentSlide={currentSlide}
            setCurrentSlide={setCurrentSlide}
            onGenerateAssignment={handleGenerateAssignment}
            onGradeSubmission={handleGradeSubmission}
         />
         
        {!displayLecturePackage && !loadingState.isLoading && (
          <>
            <Highlights />
            <ProjectInfo />
          </>
        )}
      </>
    );
  };


  return (
    <div className="min-h-screen bg-base-100 font-sans">
      <WelcomeBanner />
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <section className="text-center max-w-3xl mx-auto">
           <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-content">
              Create Comprehensive Lectures in <span className="text-brand-primary">Seconds</span>
           </h2>
           <p className="mt-6 text-lg text-content/70">
            Welcome to the future of education. Provide a topic, an article link, or a file, and our AI will generate a complete lecture package with slides, script, quiz, and multilingual translations.
          </p>
        </section>

        <div className="flex justify-center my-10">
          <div className="flex items-center p-1 space-x-1 bg-base-200 rounded-lg">
            <button
              onClick={() => setAppMode('lecture')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                appMode === 'lecture' ? 'bg-brand-primary text-white shadow-md' : 'text-content/80 hover:bg-base-300'
              }`}
            >
              <FileTextIcon className="h-5 w-5" />
              Lecture Generator
            </button>
            <button
              onClick={() => setAppMode('video')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                appMode === 'video' ? 'bg-brand-primary text-white shadow-md' : 'text-content/80 hover:bg-base-300'
              }`}
            >
              <VideoIcon className="h-5 w-5" />
              Video Generator
            </button>
          </div>
        </div>

        {renderContent()}

      </main>
      {appMode === 'lecture' && (
        <Chatbot 
          lecturePackage={displayLecturePackage}
          currentSlideIndex={currentSlide}
        />
      )}
    </div>
  );
};

export default App;
