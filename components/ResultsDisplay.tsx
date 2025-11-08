
import React, { useState, useEffect, useRef } from 'react';
import { LecturePackage, LoadingState, Resource, QuizQuestion, Assignment } from '../types';
import { LoadingIndicator } from './LoadingIndicator';
import { SlideIcon, ScriptIcon, QuizIcon, BookOpenIcon, AcademicCapIcon, PlayCircleIcon, GlobeIcon, DownloadIcon, RefreshCwIcon, CopyIcon, LanguagesIcon, ClipboardListIcon, LightbulbIcon, CheckCircleIcon, UploadCloudIcon, FileIcon, XIcon, StarIcon } from './icons';
import { decodeAudioData } from '../utils/audio';

declare const html2canvas: any;
declare const jspdf: any;

interface ResultsDisplayProps {
  lecturePackage: LecturePackage | null;
  loadingState: LoadingState;
  visualTheme: string;
  onGenerateMoreQuiz: () => Promise<void>;
  currentLanguage: string;
  onLanguageChange: (newLanguage: string) => void;
  isTranslating: boolean;
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  onGenerateAssignment: () => Promise<void>;
  onGradeSubmission: (submission: string | File, prompt: string) => Promise<void>;
}

type Tab = 'slides' | 'script' | 'quiz' | 'resources' | 'assignment';

const supportedLanguages = [
    'English', 'Hindi', 'Telugu', 'Spanish', 'French', 'German', 
    'Mandarin Chinese', 'Japanese', 'Russian', 'Arabic', 'Portuguese', 'Bengali'
];

const getThemeClasses = (theme: string): { bg: string, text: string, title: string, accent: string } => {
    switch (theme) {
        case 'Professional & Corporate': return { bg: 'bg-gradient-to-br from-slate-700 to-slate-900', text: 'text-slate-200', title: 'text-white', accent: 'text-blue-400' };
        case 'Creative & Playful': return { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', text: 'text-purple-100', title: 'text-white', accent: 'text-yellow-300' };
        case 'Academic & Traditional': return { bg: 'bg-gradient-to-br from-[#4a0e0e] to-[#1e0000]', text: 'text-amber-100', title: 'text-white', accent: 'text-amber-300' };
        default: return { bg: 'bg-gradient-to-br from-gray-900 to-gray-700', text: 'text-gray-300', title: 'text-white', accent: 'text-indigo-400' };
    }
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${ active ? 'bg-brand-primary text-white' : 'text-content/80 hover:bg-base-300' }`} >
    {icon}
    {label}
  </button>
);

const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    let numOfChan = abuffer.numberOfChannels, length = len * numOfChan * 2 + 44, buffer = new ArrayBuffer(length), view = new DataView(buffer), channels = [], i, sample, offset = 0, pos = 0;
    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; }
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; }
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan); setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
};

const AudioPlayer: React.FC<{ audioData: Uint8Array | null, isTranslating: boolean }> = ({ audioData, isTranslating }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (!audioData) { setIsLoading(true); return; };
        setIsLoading(true);
        let objectUrl: string;
        const createAudioUrl = async () => {
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                const wavBlob = bufferToWave(audioBuffer, audioBuffer.length);
                objectUrl = URL.createObjectURL(wavBlob);
                setAudioUrl(objectUrl);
            } catch (error) { console.error("Failed to create audio URL:", error); } 
            finally { setIsLoading(false); }
        };
        createAudioUrl();
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [audioData]);
    if (isLoading || isTranslating) return <div className="text-sm text-content/70 text-center py-2">Preparing audio player...</div>;
    if (!audioUrl) return <div className="text-sm text-red-600 text-center py-2">Could not load audio.</div>;
    return <audio controls key={audioUrl} src={audioUrl} className="w-full" />;
};

const ResourceList: React.FC<{ title: string; resources: Resource[]; icon: React.ReactNode }> = ({ title, resources, icon }) => {
    if (resources.length === 0) return null;
    return (
        <div>
            <h4 className="text-xl font-semibold mb-3 flex items-center gap-2 text-content/90">{icon}{title}</h4>
            <ul className="space-y-2">
                {resources.map((res, i) => (
                    <li key={i} className="bg-base-100 p-3 rounded-lg hover:bg-base-300/50 transition-colors border border-base-300">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-medium">{res.title}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const InteractiveQuiz: React.FC<{ questions: QuizQuestion[]; onGenerateMore: () => Promise<void>; }> = ({ questions, onGenerateMore }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [score, setScore] = useState(0);
    const [isGeneratingMore, setIsGeneratingMore] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);

    useEffect(() => {
        setAnswers({});
        setScore(0);
        setQuizCompleted(false);
    }, [questions]);

    const handleAnswer = (questionIndex: number, option: string) => {
        const newAnswers = { ...answers, [questionIndex]: option };
        setAnswers(newAnswers);

        let correctAnswers = 0;
        questions.forEach((q, i) => {
            if (newAnswers[i] === q.correctAnswer) {
                correctAnswers++;
            }
        });
        setScore(correctAnswers);

        if (Object.keys(newAnswers).length === questions.length) {
            setQuizCompleted(true);
        }
    };

    const handleTryAgain = () => {
        setAnswers({});
        setScore(0);
        setQuizCompleted(false);
    };

    const handleGenerateClick = async () => {
        setIsGeneratingMore(true);
        await onGenerateMore();
        setIsGeneratingMore(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">Knowledge Check Quiz</h3>
                <p className="text-lg font-bold text-brand-primary">Score: {score} / {questions.length}</p>
            </div>
            <div className="space-y-6">
                {(questions || []).map((q, i) => {
                    const userAnswer = answers[i];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = isAnswered && userAnswer === q.correctAnswer;

                    return (
                        <div key={q.question + i} className="p-4 bg-base-100 rounded-lg border border-base-300">
                            <p className="font-semibold">{i + 1}. {q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                                {(q.options || []).map((opt, j) => {
                                    let buttonClass = 'p-3 text-left rounded-lg transition-colors border text-content/90 bg-base-200 hover:bg-base-300/50 border-base-300';
                                    if (isAnswered) {
                                        if (opt === q.correctAnswer) buttonClass = 'p-3 text-left rounded-lg border bg-green-100 border-green-300 text-green-900 font-semibold';
                                        else if (opt === userAnswer) buttonClass = 'p-3 text-left rounded-lg border bg-red-100 border-red-300 text-red-900';
                                    }
                                    return <button key={j} onClick={() => handleAnswer(i, opt)} disabled={isAnswered} className={`${buttonClass} disabled:cursor-not-allowed`}>{opt}</button>;
                                })}
                            </div>
                            {isAnswered && (
                                <div className={`mt-3 text-xs p-3 rounded-lg border ${isCorrect ? 'bg-green-100/50 border-green-200' : 'bg-red-100/50 border-red-200'}`}>
                                    <p><span className="font-bold">Explanation:</span> {q.explanation}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 flex justify-center gap-4">
                {quizCompleted && (
                    <button onClick={handleTryAgain} className="flex items-center gap-2 px-5 py-2.5 bg-base-300 text-content/90 rounded-md transition-colors hover:bg-base-300/70">
                        <RefreshCwIcon className="h-5 w-5"/>Try Again
                    </button>
                )}
                <button onClick={handleGenerateClick} disabled={isGeneratingMore} className="flex items-center gap-2 px-5 py-2.5 bg-brand-secondary text-white rounded-md disabled:opacity-50 disabled:bg-base-300 transition-colors hover:bg-brand-secondary/90">
                    {isGeneratingMore ? 'Generating...' : <><RefreshCwIcon className="h-5 w-5"/>Generate More Questions</>}
                </button>
            </div>
        </div>
    );
};

const FeedbackMeter: React.FC<{ label: string; score: number; colorClass: string }> = ({ label, score, colorClass }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-content/80">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{score}/100</span>
    </div>
    <div className="w-full bg-base-300 rounded-full h-2.5">
      <div className={`${colorClass.replace('text', 'bg')} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
    </div>
  </div>
);

const StarRating: React.FC<{ score: number }> = ({ score }) => {
    const totalStars = 5;
    const filledStars = Math.round(score / 2);
    return (
        <div className="flex items-center" aria-label={`Rating: ${score} out of 10`}>
            {[...Array(totalStars)].map((_, i) => (
                <StarIcon 
                    key={i} 
                    className={`h-5 w-5 ${i < filledStars ? 'text-yellow-400' : 'text-gray-300'}`} 
                    aria-hidden="true"
                />
            ))}
        </div>
    );
};

const AssignmentTab: React.FC<{ assignment?: Assignment; onGenerate: () => Promise<void>; onGrade: (submission: File, prompt: string) => Promise<void>; }> = ({ assignment, onGenerate, onGrade }) => {
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState<string|null>(null);
    const [copyStatus, setCopyStatus] = useState<Record<number, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!assignment) { onGenerate(); } }, [assignment, onGenerate]);
    
    const handleFileSelect = (selectedFile: File | null) => {
        setFileError(null);
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                setFileError("File size cannot exceed 5MB.");
                return;
            }
            setSubmissionFile(selectedFile);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };
    
    const handlePromptSelect = (prompt: string) => {
      setSelectedPrompt(prompt);
      setSubmissionFile(null);
      setFileError(null);
    };

    const handleCopyPrompt = (promptText: string, index: number) => {
        navigator.clipboard.writeText(promptText);
        setCopyStatus({ [index]: true });
        setTimeout(() => {
            setCopyStatus(prev => ({ ...prev, [index]: false }));
        }, 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!submissionFile || !selectedPrompt) return;
        setIsLoading(true);
        await onGrade(submissionFile, selectedPrompt);
        setIsLoading(false);
    };

    if (!assignment) return <div className="text-center p-8">Generating assignment prompts...</div>;

    if (assignment.feedback && assignment.userSubmission) {
        const feedback = assignment.feedback;
        const plagiarismScore = feedback.plagiarism || 0;
        const plagiarismColorClass = plagiarismScore > 50 ? 'text-red-500' : plagiarismScore > 20 ? 'text-yellow-500' : 'text-green-500';

        return (
            <div>
                <h3 className="text-2xl font-bold mb-4">Your Feedback</h3>
                <div className="p-4 bg-base-100 rounded-lg border border-base-300 mb-6">
                    <p className="text-sm font-semibold text-content/80">Your Submission for: "{assignment.userSubmission.prompt}"</p>
                    <div className="flex items-center gap-2 mt-2 p-2 bg-base-200 rounded">
                      <FileIcon className="h-5 w-5 text-brand-primary flex-shrink-0" />
                      <span className="text-sm italic">{assignment.userSubmission.text}</span>
                    </div>
                </div>
                <div className="p-4 bg-base-100 rounded-lg border border-base-300">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold">AI Evaluation</h4>
                        <div className="flex items-center gap-3">
                            <StarRating score={feedback.score} />
                            <div className="text-2xl font-bold text-brand-primary bg-brand-primary/10 px-4 py-1 rounded-full">{feedback.score}/10</div>
                        </div>
                    </div>
                    <p className="mt-2 text-content/80">{feedback.overall}</p>

                    <div className="mt-6 space-y-4">
                        <FeedbackMeter label="Formatting & Neatness" score={feedback.formatting || 0} colorClass="text-green-500" />
                        <FeedbackMeter label="Structure & Organization" score={feedback.structure || 0} colorClass="text-blue-500" />
                        <FeedbackMeter label="Plagiarism Risk (Lower is better)" score={plagiarismScore} colorClass={plagiarismColorClass} />
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-green-100/50 rounded-lg">
                            <h5 className="font-semibold flex items-center gap-2 text-green-800"><CheckCircleIcon className="h-5 w-5"/>Strengths</h5>
                            <ul className="list-disc list-inside mt-2 text-sm text-green-700 space-y-1">
                                {(feedback.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="p-3 bg-yellow-100/50 rounded-lg">
                            <h5 className="font-semibold flex items-center gap-2 text-yellow-800"><LightbulbIcon className="h-5 w-5"/>Areas for Improvement</h5>
                             <ul className="list-disc list-inside mt-2 text-sm text-yellow-700 space-y-1">
                                {(feedback.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-2xl font-bold mb-4">Critical Thinking Assignment</h3>
            <p className="text-content/80 mb-6">Choose one of the AI-generated prompts below and submit your response for automated feedback.</p>
            <div className="space-y-3 mb-6">
                {(assignment.prompts || []).map((prompt, index) => (
                    <div key={prompt} className={`flex items-center justify-between w-full p-3 rounded-lg border transition-colors ${selectedPrompt === prompt ? 'bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary' : 'bg-base-100 border-base-300'}`}>
                      <p className="flex-grow text-left cursor-pointer mr-4" onClick={() => handlePromptSelect(prompt)}>
                        {prompt}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPrompt(prompt, index);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-base-300 hover:bg-base-300/70 text-content/80 transition-colors"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                        {copyStatus[index] ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                ))}
            </div>
            {selectedPrompt && (
                <form onSubmit={handleSubmit}>
                    {fileError && <div className="p-3 mb-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-center">{fileError}</div>}
                     {submissionFile ? (
                        <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg border border-base-300">
                            <div className="flex items-center gap-3">
                                <FileIcon className="h-6 w-6 text-brand-primary flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{submissionFile.name}</span>
                            </div>
                            <button type="button" onClick={() => { setSubmissionFile(null); }} className="p-1 rounded-full hover:bg-base-200 text-content/70">
                                <XIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    ) : (
                       <div 
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex justify-center w-full px-6 pt-5 pb-6 border-2 border-base-300 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'bg-brand-primary/10 border-brand-primary' : 'hover:border-content/50'}`}
                        >
                            <div className="space-y-1 text-center">
                                <UploadCloudIcon className="mx-auto h-12 w-12 text-content/50" />
                                <div className="flex text-sm text-content/60">
                                <p className="pl-1">Upload your assignment file or <span className="font-semibold text-brand-primary">browse</span></p>
                                </div>
                                <p className="text-xs text-content/50">Files up to 5MB</p>
                            </div>
                            <input ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </div>
                    )}
                    <button type="submit" disabled={isLoading || !submissionFile} className="mt-4 w-full flex justify-center items-center py-2.5 px-4 bg-brand-primary text-white rounded-md disabled:opacity-50 hover:bg-brand-primary/90">
                        {isLoading ? 'Grading...' : 'Submit for Feedback'}
                    </button>
                </form>
            )}
        </div>
    );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ lecturePackage, loadingState, visualTheme, onGenerateMoreQuiz, currentLanguage, onLanguageChange, isTranslating, currentSlide, setCurrentSlide, onGenerateAssignment, onGradeSubmission }) => {
  const [activeTab, setActiveTab] = useState<Tab>('slides');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const themeClasses = getThemeClasses(visualTheme);

  useEffect(() => {
    if (lecturePackage) {
      setActiveTab('slides');
    }
  }, [lecturePackage]);
  
  const handleDownloadSlides = async () => {
      if (!lecturePackage || !lecturePackage.slides.length) return;
      setIsDownloading(true);
      try {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] });
        for (let i = 0; i < lecturePackage.slides.length; i++) {
            const slideElement = document.getElementById(`slide-capture-${i}`);
            if (slideElement) {
                const canvas = await html2canvas(slideElement, { scale: 2, useCORS: true });
                if (i > 0) pdf.addPage([1280, 720], 'landscape');
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }
        }
        pdf.save('AI-Lecture-Slides.pdf');
      } catch (error) { console.error("Error generating PDF:", error); } 
      finally { setIsDownloading(false); }
  };

  const handleDownloadScript = () => {
    if (!lecturePackage) return;
    const blob = new Blob([lecturePackage.script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lecture-script.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleCopyScript = () => {
    if (!lecturePackage) return;
    navigator.clipboard.writeText(lecturePackage.script).then(() => { setCopyStatus(true); setTimeout(() => setCopyStatus(false), 2000); });
  };

  const handleDownloadAudio = async () => {
    if (!lecturePackage?.audioData) return;
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await decodeAudioData(lecturePackage.audioData, audioContext, 24000, 1);
        const wavBlob = bufferToWave(audioBuffer, audioBuffer.length);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a'); a.href = url; a.download = 'lecture-audio.wav';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (error) { console.error("Failed to prepare audio for download:", error); }
  };

  if (loadingState.isLoading && !lecturePackage) return <LoadingIndicator stage={loadingState.stage} />;
  if (!lecturePackage) return null;
  
  const { slides, script, quiz, audioData, resources, groundingChunks, assignment } = lecturePackage;

  return (
    <div className="max-w-5xl mx-auto mt-12">
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1280px', height: '720px' }}>
          {slides.map((slide, index) => (
              <div id={`slide-capture-${index}`} key={index} className={`${themeClasses.bg} p-20 flex flex-col justify-center items-center text-center w-full h-full font-sans`}>
                  <h3 className={`text-6xl font-bold mb-12 ${themeClasses.title}`}>{slide.title}</h3>
                  <ul className={`space-y-6 text-4xl list-disc list-inside text-left max-w-4xl ${themeClasses.text}`}>
                      {(slide.content || []).map((point, i) => <li key={i}>{point}</li>)}
                  </ul>
              </div>
          ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center p-1 space-x-1 bg-base-200 rounded-lg">
            <TabButton active={activeTab === 'slides'} onClick={() => setActiveTab('slides')} icon={<SlideIcon className="h-5 w-5"/>} label="Slides" />
            <TabButton active={activeTab === 'script'} onClick={() => setActiveTab('script')} icon={<ScriptIcon className="h-5 w-5"/>} label="Script" />
            <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<QuizIcon className="h-5 w-5"/>} label="Quiz" />
            <TabButton active={activeTab === 'assignment'} onClick={() => setActiveTab('assignment')} icon={<ClipboardListIcon className="h-5 w-5"/>} label="Assignment" />
            <TabButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<BookOpenIcon className="h-5 w-5"/>} label="Resources" />
          </div>
          <div className="flex items-center gap-2">
            {isTranslating && <div className="flex items-center gap-2 text-sm text-content/70"><span>Translating...</span></div>}
            <LanguagesIcon className="h-5 w-5 text-content/70" />
            <select value={currentLanguage} onChange={(e) => onLanguageChange(e.target.value)} disabled={isTranslating} className="bg-base-300 border-base-300 rounded-md shadow-sm text-sm focus:ring-brand-primary focus:border-brand-primary h-9 pl-2 pr-8">
                {supportedLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
      </div>

      <div className="bg-base-200/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-base-300 min-h-[500px]">
        {activeTab === 'slides' && (
          slides && slides.length > 0 && slides[currentSlide] ? (
            <div>
              <div className={`relative aspect-video rounded-lg p-8 sm:p-12 flex flex-col justify-center items-center text-center shadow-inner ${themeClasses.bg}`}>
                <h3 className={`text-2xl sm:text-4xl font-bold mb-6 ${themeClasses.title}`}>{slides[currentSlide].title}</h3>
                <ul className={`space-y-3 text-base sm:text-lg list-disc list-inside text-left max-w-2xl ${themeClasses.text}`}>
                  {(slides[currentSlide].content || []).map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
              <div className="mt-4 text-sm bg-base-100 p-4 rounded-lg border border-base-300">
                  <h4 className="font-semibold text-content/80 mb-2">Speaker Notes:</h4>
                  <p className="text-content/70 italic">{slides[currentSlide].speakerNotes}</p>
              </div>
              <div className="flex justify-between items-center mt-6">
                  <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="px-4 py-2 bg-base-300 rounded-md disabled:opacity-50 transition-opacity hover:bg-base-300/70">Prev</button>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-content/80">Slide {currentSlide + 1} of {slides.length}</span>
                     <button onClick={handleDownloadSlides} disabled={isDownloading} className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-md disabled:opacity-50 disabled:bg-base-300 transition-colors hover:bg-brand-secondary/90">
                        {isDownloading ? 'Generating...' : <><DownloadIcon className="h-5 w-5"/>Download (PDF)</>}
                      </button>
                  </div>
                  <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1} className="px-4 py-2 bg-base-300 rounded-md disabled:opacity-50 transition-opacity hover:bg-base-300/70">Next</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 flex flex-col items-center justify-center min-h-[400px]">
                <SlideIcon className="h-16 w-16 text-content/30 mb-4" />
                <p className="text-lg font-semibold text-content/90">No Slides Available</p>
                <p className="text-sm text-content/70 mt-2 max-w-md">
                    It seems there was an issue generating the slides for this lecture. This can sometimes happen with very complex topics or due to a temporary service issue.
                </p>
            </div>
          )
        )}

        {activeTab === 'script' && (
          <div>
              <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold">Narration Script & Voiceover</h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyScript} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-content/80 bg-base-300 hover:bg-base-300/70"><CopyIcon className="h-4 w-4" />{copyStatus ? 'Copied!' : 'Copy'}</button>
                    <button onClick={handleDownloadScript} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-content/80 bg-base-300 hover:bg-base-300/70"><DownloadIcon className="h-4 w-4" />Download</button>
                </div>
              </div>
              <div className="mb-6 p-4 bg-base-100 rounded-lg border border-base-300">
                <AudioPlayer audioData={audioData} isTranslating={isTranslating} />
                <button onClick={handleDownloadAudio} disabled={!audioData || isTranslating} className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-content/80 bg-base-300 hover:bg-base-300/70 disabled:opacity-50 disabled:cursor-not-allowed"><DownloadIcon className="h-4 w-4" />Download Audio (.wav)</button>
              </div>
              <div className="max-h-80 overflow-y-auto p-4 bg-base-100 rounded-lg space-y-4 text-content/80 whitespace-pre-wrap border border-base-300">{script}</div>
              {groundingChunks && groundingChunks.length > 0 && (
                <div className="mt-6 border-t border-base-300 pt-4">
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-content/90"><GlobeIcon className="h-5 w-5" />Content Sources</h4>
                  <ul className="space-y-1 text-sm list-disc list-inside pl-2 text-content/80">
                    {groundingChunks.map((chunk, i) => chunk.web && <li key={i}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">{chunk.web.title || chunk.web.uri}</a></li>)}
                  </ul>
                </div>
              )}
          </div>
        )}

        {activeTab === 'quiz' && <InteractiveQuiz questions={quiz} onGenerateMore={onGenerateMoreQuiz} /> }
        {activeTab === 'assignment' && <AssignmentTab assignment={assignment} onGenerate={onGenerateAssignment} onGrade={onGradeSubmission} /> }

        {activeTab === 'resources' && (
             <div>
              <h3 className="text-2xl font-bold mb-4">Further Learning Resources</h3>
              <p className="text-content/80 mb-6">Here are some AI-curated resources to help you dive deeper into the topic.</p>
              <div className="space-y-6">
                 <ResourceList title="Online Courses" resources={resources.filter(r => r.type === 'course')} icon={<AcademicCapIcon className="h-6 w-6" />} />
                 <ResourceList title="Web Articles" resources={resources.filter(r => r.type === 'article')} icon={<BookOpenIcon className="h-6 w-6" />} />
                 <ResourceList title="YouTube Videos" resources={resources.filter(r => r.type === 'video')} icon={<PlayCircleIcon className="h-6 w-6" />} />
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
