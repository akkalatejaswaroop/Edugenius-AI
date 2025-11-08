
import React from 'react';
import { BrainCircuitIcon, MailIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="py-4 bg-base-100/80 backdrop-blur-md sticky top-0 z-40 border-b border-base-300">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <BrainCircuitIcon className="h-8 w-8 text-brand-primary" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-brand-primary via-brand-secondary to-purple-500 text-transparent bg-clip-text">
              Edu Genius AI
            </h1>
        </div>
        <nav>
            <a 
              href="mailto:feedback@aistudio.com" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-content/80 hover:bg-base-200 hover:text-content"
            >
              <MailIcon className="h-5 w-5" />
              Feedback
            </a>
        </nav>
      </div>
    </header>
  );
};