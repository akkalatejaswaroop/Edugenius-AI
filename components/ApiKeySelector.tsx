
import React, { useEffect } from 'react';
import { KeyIcon, InfoIcon } from './icons';

interface ApiKeySelectorProps {
  apiKeySelected: boolean;
  setApiKeySelected: React.Dispatch<React.SetStateAction<boolean>>;
  onProceed: () => void;
  children: React.ReactNode;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ apiKeySelected, setApiKeySelected, onProceed, children }) => {
  
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
      } else {
        setApiKeySelected(false);
      }
    };
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success to avoid race conditions and let the API call confirm.
      setApiKeySelected(true);
    }
  };

  const handleGenerate = () => {
    if (apiKeySelected) {
      onProceed();
    } else {
        handleSelectKey();
    }
  }

  return (
    <div className="space-y-4">
        <div className="p-4 rounded-lg bg-base-100 border border-base-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-grow">
                <h4 className="font-semibold">Veo Video Generation</h4>
                <p className="text-sm text-content/70 mt-1">
                    Video generation with Veo requires selecting an API key. This may incur costs. 
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline ml-1">Learn about billing</a>.
                </p>
            </div>
            <button
                onClick={handleGenerate}
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-secondary hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
            >
                <KeyIcon className="h-5 w-5 mr-2" />
                {apiKeySelected ? 'Generate Video' : 'Select API Key & Generate'}
            </button>
        </div>

        {apiKeySelected ? (
            children
        ) : (
            <div className="text-center p-8 bg-base-300/50 rounded-lg flex flex-col items-center justify-center min-h-[200px]">
                <InfoIcon className="h-8 w-8 text-content/60 mb-2"/>
                <p className="text-content/80">Please select an API key to proceed with video generation.</p>
            </div>
        )}
    </div>
  );
};
