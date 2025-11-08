
import React from 'react';
import { ZapIcon, LayersIcon, LinkIcon, CheckCircleIcon } from './icons';

const highlights = [
  {
    icon: <ZapIcon className="h-8 w-8 text-brand-primary" />,
    title: 'Instant Content Generation',
    description: 'Go from a single topic to a full lecture package in minutes. Our AI handles the heavy lifting, creating slides, scripts, and more.'
  },
  {
    icon: <LayersIcon className="h-8 w-8 text-brand-primary" />,
    title: 'Rich Multimedia Output',
    description: 'Receive a complete slide deck ready for presentation and a high-quality audio voiceover for your script.'
  },
  {
    icon: <LinkIcon className="h-8 w-8 text-brand-primary" />,
    title: 'Curated Learning Resources',
    description: 'Expand your knowledge with a list of relevant articles, courses, and videos, all curated by AI to complement your lecture.'
  },
  {
    icon: <CheckCircleIcon className="h-8 w-8 text-brand-primary" />,
    title: 'Automated Knowledge Checks',
    description: 'Test comprehension with an auto-generated quiz, complete with questions, answers, and explanations.'
  }
];

export const Highlights: React.FC = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center text-content">
          A Powerful Toolkit for Modern Educators
        </h2>
        <p className="mt-4 text-lg text-center text-content/70 max-w-2xl mx-auto">
          Edu Genius AI provides everything you need to build and deliver compelling educational content faster than ever before.
        </p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {highlights.map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-6 bg-base-200/50 rounded-2xl border border-base-300">
              <div className="flex-shrink-0 bg-brand-primary/10 p-3 rounded-full">
                {item.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-content">{item.title}</h3>
                <p className="mt-1 text-sm text-content/70">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};