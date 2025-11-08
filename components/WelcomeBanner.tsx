import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, BrainCircuitIcon } from './icons';

const BANNER_SESSION_KEY = 'eduGeniusWelcomeBannerClosed';

export const WelcomeBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const bannerClosed = sessionStorage.getItem(BANNER_SESSION_KEY);
        if (bannerClosed !== 'true') {
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        if (isVisible) {
            closeButtonRef.current?.focus();
        }
    }, [isVisible]);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem(BANNER_SESSION_KEY, 'true');
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="welcome-title" 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
        >
            <div className="bg-base-100 rounded-2xl shadow-2xl p-8 max-w-lg w-full m-4 text-center border border-base-300 relative">
                <button
                    ref={closeButtonRef}
                    onClick={handleClose}
                    aria-label="Dismiss welcome message"
                    className="absolute top-4 right-4 p-2 rounded-full text-content/60 hover:bg-base-200 hover:text-content focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                    <CloseIcon className="h-6 w-6" />
                </button>
                <div className="flex justify-center mb-4">
                    <BrainCircuitIcon className="h-12 w-12 text-brand-primary" />
                </div>
                <h2 id="welcome-title" className="text-3xl font-extrabold tracking-tight text-content">
                    Welcome to Edu Genius AI
                </h2>
                <p className="mt-4 text-content/70">
                    All intelligent features are powered by cutting-edge AI technology.
                </p>
                <button
                    onClick={handleClose}
                    className="mt-8 w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-primary transition-all"
                >
                    Get Started
                </button>
            </div>
        </div>
    );
};