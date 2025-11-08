import React, { useEffect } from 'react';
import { Slide } from '../types';
import { CloseIcon } from './icons';

interface FullscreenSliderProps {
  slides: Slide[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onClose: () => void;
  themeClasses: { bg: string; text: string; title: string; accent: string };
}

export const FullscreenSlider: React.FC<FullscreenSliderProps> = ({ slides, currentIndex, setCurrentIndex, onClose, themeClasses }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]); // Re-bind to get latest currentIndex

  const handleNext = () => {
    setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1));
  };
  
  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const currentSlide = slides[currentIndex];
  if (!currentSlide) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-50 p-2 rounded-full bg-white/10 hover:bg-white/20" aria-label="Close fullscreen view">
        <CloseIcon className="h-8 w-8" />
      </button>

      <div className={`relative w-full h-full max-w-6xl max-h-[80vh] aspect-video rounded-lg p-12 flex flex-col justify-center items-center text-center shadow-2xl ${themeClasses.bg}`}>
        <h3 className={`text-5xl font-bold mb-8 ${themeClasses.title}`}>{currentSlide.title}</h3>
        <ul className={`space-y-4 text-2xl list-disc list-inside text-left max-w-4xl ${themeClasses.text}`}>
          {(currentSlide.content || []).map((point, i) => <li key={i}>{point}</li>)}
        </ul>
      </div>

      <div className="mt-4 flex justify-between items-center w-full max-w-6xl text-white">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="px-6 py-2 bg-white/10 rounded-md disabled:opacity-50 hover:bg-white/20">Prev</button>
        <span className="font-medium">Slide {currentIndex + 1} of {slides.length}</span>
        <button onClick={handleNext} disabled={currentIndex === slides.length - 1} className="px-6 py-2 bg-white/10 rounded-md disabled:opacity-50 hover:bg-white/20">Next</button>
      </div>
    </div>
  );
};
