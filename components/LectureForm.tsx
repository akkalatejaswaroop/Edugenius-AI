import React, { useState, useRef } from 'react';
import { FormValues } from '../types';
import { SparklesIcon, InfoIcon, BrainIcon, UploadCloudIcon, FileIcon, XIcon, MicrophoneIcon, StopCircleIcon } from './icons';
import { transcribeAudio } from '../services/geminiService';

interface LectureFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading: boolean;
}

export const LectureForm: React.FC<LectureFormProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('University Students');
  const [duration, setDuration] = useState('15 minutes');
  const [visualTheme, setVisualTheme] = useState('Modern & Minimalist');
  const [persona, setPersona] = useState('Calm Teacher');
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
        // Basic validation for common types. More can be added.
        if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
            setError("File size cannot exceed 10MB.");
            return;
        }
        setFile(selectedFile);
        // Clear topic if a file is uploaded to avoid confusion
        setTopic(''); 
    }
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartRecording = async () => {
    setError(null);
    setTopic('');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            setIsTranscribing(true);
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            
            try {
                const result = await transcribeAudio(audioBlob);
                setTopic(result);
                if (file) setFile(null);
            } catch (err: any) {
                setError(`Transcription failed: ${err.message}`);
            } finally {
                setIsTranscribing(false);
                stream.getTracks().forEach(track => track.stop());
            }
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Could not access microphone. Please ensure permissions are granted.");
    }
  };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !file) {
      setError('Please enter a topic, article link, or upload a file to generate a lecture.');
      return;
    }
    setError(null);
    onSubmit({ topic, audience, duration, visualTheme, persona, useThinkingMode, file });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-base-200 p-8 rounded-2xl shadow-lg border border-base-300">
      {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">{error}</div>}

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-content/90 mb-2">
          Topic or Article Link
        </label>
        <div className="mt-1 relative">
          <input
            type="text"
            name="topic"
            id="topic"
            value={topic}
            onChange={(e) => {
                setTopic(e.target.value);
                if (e.target.value) setFile(null); // Clear file if user types a topic
            }}
            className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm h-12 px-4 pr-12"
            placeholder={isTranscribing ? "AI is transcribing..." : "e.g., Quantum Computing or use the mic"}
            disabled={!!file || isRecording || isTranscribing}
          />
           <div className="absolute inset-y-0 right-0 flex items-center pr-3">
             {!isRecording ? (
                <button 
                    type="button" 
                    onClick={handleStartRecording} 
                    disabled={isLoading || !!file || isTranscribing}
                    className="p-1 rounded-full text-content/60 hover:text-brand-primary hover:bg-base-100 disabled:text-content/30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Start recording topic"
                >
                    <MicrophoneIcon className="h-6 w-6"/>
                </button>
            ) : (
                <button 
                    type="button" 
                    onClick={handleStopRecording} 
                    className="p-1 rounded-full text-red-500 bg-red-500/10"
                    aria-label="Stop recording topic"
                >
                    <StopCircleIcon className="h-6 w-6 animate-pulse"/>
                </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-base-300" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-base-200 px-2 text-sm text-content/60">OR</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-content/90 mb-2">Upload Content</label>
        {file ? (
            <div className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-6 w-6 text-brand-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1 rounded-full hover:bg-base-200 text-content/70">
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
                    <p className="pl-1">Drag and drop a file or <span className="font-semibold text-brand-primary">browse</span></p>
                    </div>
                    <p className="text-xs text-content/50">Images or text files up to 10MB</p>
                </div>
                <input ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} id="file-upload" name="file-upload" type="file" className="sr-only" />
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-content/90 mb-2">Target Audience</label>
          <select id="audience" name="audience" value={audience} onChange={e => setAudience(e.target.value)} className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm h-12 px-4">
            <option>High School Students</option>
            <option>University Students</option>
            <option>Industry Professionals</option>
            <option>General Public</option>
          </select>
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-content/90 mb-2">Desired Length</label>
          <select id="duration" name="duration" value={duration} onChange={e => setDuration(e.target.value)} className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm h-12 px-4">
            <option>5 minutes</option>
            <option>15 minutes</option>
            <option>30 minutes</option>
          </select>
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
                <label htmlFor="visualTheme" className="block text-sm font-medium text-content/90 mb-2">Visual Theme</label>
                <select id="visualTheme" name="visualTheme" value={visualTheme} onChange={e => setVisualTheme(e.target.value)} className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm h-12 px-4">
                    <option>Modern & Minimalist</option>
                    <option>Professional & Corporate</option>
                    <option>Creative & Playful</option>
                    <option>Academic & Traditional</option>
                </select>
            </div>
            <div>
                <label htmlFor="persona" className="block text-sm font-medium text-content/90 mb-2">Instructor Persona</label>
                <select id="persona" name="persona" value={persona} onChange={e => setPersona(e.target.value)} className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm h-12 px-4">
                    <option>Calm Teacher</option>
                    <option>Funny Teacher</option>
                    <option>IIT Professor</option>
                    <option>CBSE Teacher</option>
                </select>
            </div>
        </div>

      <div className="relative flex items-start">
        <div className="flex items-center h-5">
          <input
            id="thinking-mode"
            aria-describedby="thinking-mode-description"
            name="thinking-mode"
            type="checkbox"
            checked={useThinkingMode}
            onChange={(e) => setUseThinkingMode(e.target.checked)}
            className="focus:ring-brand-secondary h-4 w-4 text-brand-primary bg-base-300 border-gray-500 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="thinking-mode" className="font-medium text-content/90 flex items-center">
             <BrainIcon className="h-5 w-5 mr-2 text-brand-secondary" />
             Enable Thinking Mode
          </label>
          <p id="thinking-mode-description" className="text-content/70 flex items-start gap-2 mt-1">
            <InfoIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Uses a more powerful model for deeper analysis of complex topics. Ideal for nuanced or technical subjects. Generation will take longer.</span>
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-primary disabled:bg-base-300 disabled:cursor-not-allowed transition-all duration-200 mt-6"
        >
          {isLoading ? (
             <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 * 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
             <>
              <SparklesIcon className="h-5 w-5 mr-2"/>
              Generate Lecture
            </>
          )}
        </button>
      </div>
    </form>
  );
};
