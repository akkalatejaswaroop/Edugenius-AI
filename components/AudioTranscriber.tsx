import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { MicrophoneIcon, StopCircleIcon, CopyIcon } from './icons';

export const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setError(null);
        setTranscript('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                setIsLoading(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                
                try {
                    const result = await transcribeAudio(audioBlob);
                    setTranscript(result);
                } catch (err: any) {
                    setError(`Transcription failed: ${err.message}`);
                } finally {
                    setIsLoading(false);
                    // Stop all tracks on the stream to turn off the mic indicator
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
    
    const handleCopyTranscript = () => {
        if (!transcript) return;
        navigator.clipboard.writeText(transcript).then(() => {
            setCopyStatus(true);
            setTimeout(() => setCopyStatus(false), 2000);
        });
    };

    return (
        <div className="max-w-3xl mx-auto p-8 bg-base-200 rounded-2xl shadow-lg border border-base-300">
            <h3 className="text-2xl font-bold text-center mb-1">Audio Transcription Tool</h3>
            <p className="text-content/70 text-center mb-6">Record your voice in any language and get an instant AI-powered transcription.</p>

            <div className="flex justify-center items-center mb-6">
                {!isRecording ? (
                    <button 
                        onClick={handleStartRecording}
                        className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all transform hover:scale-105"
                    >
                        <MicrophoneIcon className="h-6 w-6" />
                        <span className="font-semibold">Start Recording</span>
                    </button>
                ) : (
                    <button 
                        onClick={handleStopRecording}
                        className="flex items-center gap-3 px-6 py-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900 transition-all"
                    >
                        <StopCircleIcon className="h-6 w-6 animate-pulse" />
                        <span className="font-semibold">Stop Recording</span>
                    </button>
                )}
            </div>

            {error && <div className="p-3 mb-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-center">{error}</div>}
            
            <div className="relative">
                <textarea
                    value={isLoading ? "AI is transcribing, please wait..." : transcript}
                    readOnly
                    placeholder="Your transcript will appear here..."
                    className="w-full h-48 p-4 bg-base-100 rounded-lg border border-base-300 resize-none text-content/80"
                />
                {transcript && !isLoading && (
                    <button 
                        onClick={handleCopyTranscript}
                        className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-content/80 bg-base-300 hover:bg-base-300/70"
                    >
                        <CopyIcon className="h-4 w-4" />{copyStatus ? 'Copied!' : 'Copy'}
                    </button>
                )}
            </div>
        </div>
    );
};