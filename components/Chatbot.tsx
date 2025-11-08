import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { MessageIcon, SendIcon, CloseIcon } from './icons';
import { LecturePackage } from '../types';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface ChatbotProps {
  lecturePackage: LecturePackage | null;
  currentSlideIndex: number;
}

export const Chatbot: React.FC<ChatbotProps> = ({ lecturePackage, currentSlideIndex }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socraticSystemInstruction = `You are a helpful AI assistant with a Socratic tutoring style. 
Your goal is to guide users to their own conclusions rather than giving direct answers.
When a user asks a question, especially if context from a lecture slide is provided, ask probing questions that encourage them to think critically.
Keep your responses concise and conversational.
If the user's question is not related to the lecture context, you can answer it directly but maintain a helpful and encouraging tone.`;

  useEffect(() => {
    if (isOpen && !chatRef.current) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash-lite',
          config: {
            systemInstruction: socraticSystemInstruction,
          }
        });
        setMessages([{ sender: 'bot', text: "Hello! How can I help you with your lecture today?" }]);
      } catch (error) {
        console.error("Failed to initialize chatbot:", error);
        setMessages([{ sender: 'bot', text: "Sorry, I'm unable to connect right now." }]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let prompt = input;
    if (lecturePackage && lecturePackage.slides[currentSlideIndex]) {
      const currentSlide = lecturePackage.slides[currentSlideIndex];
      const context = `
        ---
        Current Lecture Context (Slide ${currentSlideIndex + 1}):
        Title: ${currentSlide.title}
        Content: ${currentSlide.content.join(', ')}
        Speaker Notes: ${currentSlide.speakerNotes}
        ---
        Based on this context, guide me on my question: "${input}"
      `;
      prompt = context;
    }

    try {
      const result = await chatRef.current.sendMessageStream({ message: prompt });
      
      let botResponse = '';
      setMessages(prev => [...prev, { sender: 'bot', text: '...' }]);

      for await (const chunk of result) {
        botResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { sender: 'bot', text: botResponse };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { sender: 'bot', text: "Oops! Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-brand-primary h-16 w-16 rounded-full text-white shadow-lg flex items-center justify-center hover:bg-brand-primary/90 transition-transform hover:scale-110"
        aria-label="Open chat"
      >
        <MessageIcon className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[70vh] flex flex-col bg-base-200 rounded-2xl shadow-2xl border border-base-300 z-50">
      <header className="flex items-center justify-between p-4 border-b border-base-300">
        <h3 className="font-bold text-lg">AI Assistant</h3>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-base-300">
          <CloseIcon className="h-6 w-6" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-brand-primary text-white' : 'bg-base-300'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
         {isLoading && messages[messages.length-1].sender === 'user' && (
          <div className="flex justify-start">
             <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-2xl bg-base-300">
                <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-content/50 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-content/50 animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 rounded-full bg-content/50 animate-pulse [animation-delay:0.4s]"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-base-300">
        <div className="flex items-center bg-base-100 rounded-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 text-brand-primary disabled:text-content/50">
            <SendIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
