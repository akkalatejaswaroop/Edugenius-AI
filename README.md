# ⚡ Edu Genius AI  
**AI-Powered Lecture Generator for the Future of Learning**

Edu Genius AI transforms a **simple topic prompt** into a complete **interactive educational package** — including beautifully designed **slides**, **AI voiceover**, **multilingual translation**, **interactive quizzes**, and **curated learning resources**.  
Built for educators, learners, and content creators who want to **generate professional lectures in minutes** using the power of **AI and automation**.

---

## 🧠 Core Features

### 🎓 Lecture Package Generation
- **AI-Generated Slides** — Professionally designed with theme-based layouts, typography, and visuals.
- **Narration Script** — Auto-generated structured lecture script with speaker notes.
- **AI Voiceover** — Realistic narration using Google Text-to-Speech.
- **Interactive Quiz** — Multiple-choice questions with explanations, instant feedback, and “Generate More” option.
- **Further Reading Resources** — Curated list of 10+ high-quality YouTube videos, articles, and online courses.

---

### 🌍 Multilingual Intelligence
- **Automatic Translation** — Translate full lectures into 12+ languages.
- **Multilingual Voiceovers** — Generate new AI voices matching the selected language.
- **Subtitles/Closed Captions** — Auto-synced caption generation for accessibility.

---

### 🧩 Interactive Learning
- **Answer-First Quiz Flow** — Answers hidden until attempted; instant correctness feedback.
- **Dynamic Question Generation** — Generate additional quizzes on the same topic.
- **AI Tutor Chatbot** — Ask questions and receive Socratic-style guidance for deeper understanding.
- **Real-Time Feedback** — Collect and analyze audience feedback post-lecture.

---

### ⚙️ Customization & Branding
- **Custom Visual Themes** — Choose or upload your own color palette, background, and logo.
- **Personalized Learning Paths** — Generate connected lecture series based on user objectives.
- **Custom Templates** — Integrate with Canva or Slides API for branded deck templates.

---

### 📦 Export & Integration
- **Download Slides as PDF** (via jsPDF + html2canvas)
- **Export Narration Script** (.txt)
- **Export Voiceover** (.wav)
- **LMS Integration** — Export to Google Classroom, Moodle, or Blackboard.
- **Public Shareable URLs** for generated lectures.

---

## ⚙️ Tech Stack

| Layer | Technology |
|:------|:------------|
| **Frontend** | React (Next.js optional), TypeScript |
| **Styling** | Tailwind CSS — utility-first, responsive, accessible |
| **Routing** | React Router v6 |
| **AI Engine** | Google Gemini 2.5 Pro / Flash models |
| **Voiceover** | Google Text-to-Speech API |
| **PDF Rendering** | jsPDF + html2canvas |
| **API Handling** | Axios / Fetch with exponential retry & caching |
| **Hosting** | Vercel / Netlify (CI/CD ready) |
| **Storage** | Firebase / AWS S3 / IPFS |

---

## 🧩 Project Structure

EduGeniusAI/
├── public/
├── src/
│ ├── components/
│ │ ├── Header.tsx # Top navigation bar
│ │ ├── LectureForm.tsx # Input form for topic, audience, theme
│ │ ├── ResultsDisplay.tsx # Slide deck, script, quiz, resources
│ │ ├── Chatbot.tsx # AI tutor chat interface
│ │ ├── Highlights.tsx # Home page feature showcase
│ │ └── LoadingIndicator.tsx
│ ├── services/
│ │ └── geminiService.ts # All AI API calls & response parsing
│ ├── utils/
│ │ └── audio.ts # TTS & audio helpers
│ ├── types/
│ │ └── index.ts # Global TypeScript types
│ └── App.tsx # Main entry component
├── index.html
├── metadata.json
└── README.md

yaml
Copy code

---

## 🚀 Getting Started

### 1️⃣ Prerequisites
- Node.js v18+  
- A valid **Google Gemini API key**  
- Modern browser (Chrome, Edge, or Firefox recommended)

### 2️⃣ Setup

```bash
# Clone the repository
git clone https://github.com/your-username/edugenius-ai.git
cd edugenius-ai

# Install dependencies
npm install
3️⃣ Environment Variables
Create a .env.local file in the project root:

bash
Copy code
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_TTS_API_KEY=your_google_tts_key
NEXT_PUBLIC_FIREBASE_CONFIG=your_firebase_config
4️⃣ Run the App
bash
Copy code
npm run dev
Open http://localhost:3000 🌐 in your browser.

💡 User Experience Design
Clean White UI with color accents and modern gradients.

Home Screen Overview featuring:

Header with Feedback Email (clickable mailto link)

Feature Descriptions

Highlight Section at Bottom with icons and hover animations.

Fully Responsive Layout (desktop, tablet, mobile)

Accessible per WCAG 2.1 — Keyboard navigation, ARIA roles, color contrast checks.

Microinteractions — Smooth hover, focus, and button animations powered by Framer Motion.

🧠 AI Integration Logic
Gemini 2.5 Pro for deep reasoning content generation (slides, script, quiz)

Gemini Flash Lite for instant chat responses in the AI tutor

Grounded by Google Search — Ensures factual accuracy using web data

Smart JSON Parser — Auto-corrects malformed JSON and converts snake_case → camelCase

Rate Limit Protection — Exponential backoff retry mechanism for stability

🧪 Testing
Unit Tests: Jest + React Testing Library

Integration Tests: Cypress

Accessibility Audits: Lighthouse

Load Testing: K6 / Postman Collections

Run:

bash
Copy code
npm run test
🖥️ Deployment
Frontend: Deploy seamlessly on Vercel or Netlify

Backend: Deploy via serverless functions (Firebase Cloud Functions / AWS Lambda)

CI/CD: GitHub Actions integrated for automated builds and deploys

Environment Secrets: Managed securely via project settings (Vercel / Netlify UI)

🧭 Roadmap
 Add collaborative lecture editing (multi-user real-time)

 Add text-to-sign-language avatar support

 Add live translation subtitles in video mode

 LMS API connectors for automatic course sync

 Add plagiarism detection for student submissions

🧑‍💻 Contributing
We welcome contributions!
To contribute:

Fork the repo

Create a feature branch (feature/your-feature-name)

Commit and push your changes

Submit a pull request 🚀

📧 Feedback
💌 Have feedback or ideas?
Send us a message at feedback@edugenius.ai

⚖️ License
MIT License © 2025 [Akkala Teja Swaroop]
Feel free to use, modify, and distribute with attribution.

🌟 Acknowledgments
Powered by Google Gemini 2.5 Pro

Built with ❤️ using React + Tailwind CSS

Inspired by educators shaping the future of AI learning