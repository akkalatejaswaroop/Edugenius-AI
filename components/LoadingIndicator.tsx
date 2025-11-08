
import React from 'react';

interface LoadingIndicatorProps {
  stage: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ stage }) => {
  return (
    <div className="max-w-3xl mx-auto mt-12 text-center p-8 bg-base-200 rounded-2xl border border-base-300">
      <div className="flex justify-center items-center mb-4">
        <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p className="text-lg font-medium text-content/90">{stage}</p>
      <p className="text-sm text-content/70 mt-2">AI is working its magic. Please be patient.</p>
    </div>
  );
};
