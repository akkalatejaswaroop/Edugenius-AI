import React from 'react';
import { FileTextIcon, SlidersIcon, RocketIcon, TelescopeIcon } from './icons';

const steps = [
  {
    icon: <FileTextIcon className="h-8 w-8 text-brand-secondary" />,
    title: 'Provide Your Input',
    description: 'Start with a topic, an article link, or upload your own content. The AI can process text and even analyze images to kickstart the creation process.'
  },
  {
    icon: <SlidersIcon className="h-8 w-8 text-brand-secondary" />,
    title: 'Customize Your Lecture',
    description: 'Tailor the content for your specific needs. Define the target audience, desired lecture length, visual theme, and even the instructor\'s persona.'
  },
  {
    icon: <RocketIcon className="h-8 w-8 text-brand-secondary" />,
    title: 'Generate with a Click',
    description: 'Our AI, powered by Google\'s advanced Gemini models, crafts a complete educational package including slides, narration scripts, and quizzes in seconds.'
  },
  {
    icon: <TelescopeIcon className="h-8 w-8 text-brand-secondary" />,
    title: 'Explore & Refine',
    description: 'Review the generated slide deck, listen to the audio voiceover, test your knowledge with the quiz, and interact with our AI tutor for deeper understanding.'
  }
];

export const ProjectInfo: React.FC = () => {
  return (
    <section className="py-16 sm:py-24 bg-base-100">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-content">
                How Edu Genius AI Works
            </h2>
            <p className="mt-4 text-lg text-content/70 max-w-3xl mx-auto">
                Transform your ideas into comprehensive learning experiences in four simple steps. Our intuitive workflow makes lecture creation effortless and efficient.
            </p>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative p-8 bg-base-200/50 rounded-2xl border border-base-300 overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-extrabold text-base-300/80 -z-0">
                    0{index + 1}
                </div>
                <div className="relative z-10">
                    <div className="flex-shrink-0 bg-brand-secondary/10 p-4 rounded-xl inline-block">
                        {step.icon}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-content">{step.title}</h3>
                    <p className="mt-2 text-sm text-content/70">{step.description}</p>
                </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 text-center p-8 bg-gradient-to-r from-brand-primary/10 via-brand-secondary/10 to-purple-500/10 rounded-2xl border border-base-300">
             <h3 className="text-2xl font-bold text-content">Powered by Advanced Technology</h3>
             <p className="mt-3 text-content/70 max-w-2xl mx-auto">
                Edu Genius AI is built with <span className="font-semibold text-brand-primary">React</span> and <span className="font-semibold text-brand-primary">TailwindCSS</span> for a modern, responsive user experience. All intelligent features are powered by cutting-edge AI technology.
             </p>
        </div>

      </div>
    </section>
  );
};