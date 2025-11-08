import React, { useState, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { SparklesIcon, UploadCloudIcon, FileIcon, XIcon, KeyIcon, InfoIcon } from './icons';
import { ApiKeySelector } from './ApiKeySelector';

export const VideoTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError("Image size cannot exceed 10MB.");
        return;
      }
      setError(null);
      setImageFile(selectedFile);
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

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a video.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setVideoUrl(null);
    
    try {
      let imagePayload: { imageBytes: string, mimeType: string } | undefined = undefined;
      if (imageFile) {
        const reader = new FileReader();
        const base64String = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
        imagePayload = { imageBytes: base64String, mimeType: imageFile.type };
      }

      const url = await generateVideo(prompt, imagePayload);
      setVideoUrl(url);
    } catch (e: any) {
      console.error("Video generation error:", e);
      if (e.message?.includes('Requested entity was not found')) {
        setError("API Key error. Please re-select your API key and try again.");
        setApiKeySelected(false); // Reset key selection state
      } else {
        setError(`An error occurred during video generation: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-6 bg-base-200 p-8 rounded-2xl shadow-lg border border-base-300">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-content/90 mb-2">
            Video Prompt
          </label>
          <div className="mt-1">
            <textarea
              rows={3}
              name="prompt"
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full bg-base-300 border-base-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-4"
              placeholder="e.g., A majestic lion roaring on a rocky outcrop at sunset."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-content/90 mb-2">Starting Image (Optional)</label>
          {imageFile ? (
            <div className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <FileIcon className="h-6 w-6 text-brand-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{imageFile.name}</span>
              </div>
              <button type="button" onClick={() => setImageFile(null)} className="p-1 rounded-full hover:bg-base-200 text-content/70">
                <XIcon className="h-5 w-5" />
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
                  <p className="pl-1">Use an image to start the video or <span className="font-semibold text-brand-primary">browse</span></p>
                </div>
                <p className="text-xs text-content/50">Images up to 10MB</p>
              </div>
              <input ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" />
            </div>
          )}
        </div>

        <ApiKeySelector apiKeySelected={apiKeySelected} setApiKeySelected={setApiKeySelected} onProceed={handleSubmit}>
          {null}
        </ApiKeySelector>

      </div>

      {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-center text-red-800">
            <p><strong>Error:</strong> {error}</p>
          </div>
      )}

      {isLoading && (
        <div className="text-center p-8 bg-base-200 rounded-2xl border border-base-300">
            <div className="flex justify-center items-center mb-4">
                <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 * 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p className="text-lg font-medium text-content/90">Generating video...</p>
            <p className="text-sm text-content/70 mt-2">This may take a few minutes. Please be patient.</p>
        </div>
      )}

      {videoUrl && (
        <div className="bg-base-200 p-4 rounded-2xl shadow-lg border border-base-300">
            <h3 className="text-xl font-bold text-center mb-4">Your Generated Video</h3>
            <video controls src={videoUrl} className="w-full rounded-lg" />
        </div>
      )}

    </div>
  );
};
