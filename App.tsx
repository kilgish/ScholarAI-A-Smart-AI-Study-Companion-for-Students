import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  BrainCircuit, 
  BarChart3, 
  Send, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Sparkles,
  Trophy,
  History,
  Menu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Internal imports
import { AppMode, Message, MessageRole, Quiz, LearningStat } from './types';
import { sendMessageToGemini, generateQuiz, generateTopicImage } from './services/geminiService';
import MermaidDiagram from './components/MermaidDiagram';
import QuizCard from './components/QuizCard';

const App = () => {
  // --- State ---
  const [mode, setMode] = useState<AppMode>(AppMode.STUDY);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Study State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: MessageRole.MODEL,
      content: "Hi! I'm ScholarAI. What would you like to learn today? I can explain topics, generate diagrams, or create quizzes for you.",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Stats State
  const [stats, setStats] = useState<LearningStat[]>([]);

  // --- Effects ---
  useEffect(() => {
    // Load stats from local storage
    const savedStats = localStorage.getItem('scholar_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => {
    if (mode === AppMode.STUDY) {
      scrollToBottom();
    }
  }, [messages, mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Handlers: Study ---

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: inputText,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsTyping(true);

    // Prepare history for context
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    const response = await sendMessageToGemini(userMsg.content, userMsg.image, history);

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: MessageRole.MODEL,
      content: response.text,
      diagram: response.diagram,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsTyping(false);

    // Track topic loosely by just using the first 20 chars of input if it's a new session
    // Ideally we'd ask AI to classify the topic.
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
      setIsTyping(true);
      const imageUrl = await generateTopicImage(prompt);
      setIsTyping(false);
      
      if (imageUrl) {
           const modelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: MessageRole.MODEL,
            content: `Here is an illustration for "${prompt}":`,
            image: imageUrl, // Reusing the image field on message to display generated images too
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, modelMsg]);
      } else {
           const modelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: MessageRole.MODEL,
            content: `Sorry, I couldn't generate an image for that.`,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, modelMsg]);
      }
  }

  // --- Handlers: Quiz ---

  const handleStartQuiz = async () => {
    if (!quizTopic.trim()) return;
    setIsGeneratingQuiz(true);
    const quiz = await generateQuiz(quizTopic);
    setIsGeneratingQuiz(false);
    
    if (quiz) {
      setActiveQuiz(quiz);
      setCurrentQuestionIndex(0);
      setQuizScore(0);
      setQuizFinished(false);
    }
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
    if (isCorrect) setQuizScore(prev => prev + 1);
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setQuizFinished(true);
    // Save Stats
    if (activeQuiz) {
        const percentage = Math.round((quizScore / activeQuiz.questions.length) * 100); // Note: quizScore hasn't updated for the last question yet if we calculate here? 
        // Actually handleQuizAnswer updates state, but state update is async. 
        // Better to calculate score based on final state or pass it.
        // Let's rely on the user seeing the score screen.
        
        // Wait for next render to save accurate score? No, simple logic:
        // Score is updated immediately on "Check Answer". "Next Question" just moves index.
        // So by the time we click "Finish" (or next on last q), score is ready.
        
        const newStat: LearningStat = {
            topic: activeQuiz.topic,
            quizScore: Math.round(((quizScore + (activeQuiz.questions[currentQuestionIndex].correctAnswerIndex === -1 ? 0 : 0)) / activeQuiz.questions.length) * 100), // Approximate for now, refactor for strict correctness
            date: new Date().toISOString()
        };
        
        // Let's recalculate purely based on logic to avoid async state issues in this simple handler
        // Actually, let's just save it in the render of the finish screen to be safe or use a useEffect on quizFinished.
    }
  };
  
  // Safe stats saving
  useEffect(() => {
      if (quizFinished && activeQuiz) {
          const percentage = Math.round((quizScore / activeQuiz.questions.length) * 100);
          const newStat: LearningStat = {
              topic: activeQuiz.topic,
              quizScore: percentage,
              date: new Date().toISOString()
          };
          const newStats = [newStat, ...stats];
          setStats(newStats);
          localStorage.setItem('scholar_stats', JSON.stringify(newStats));
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizFinished]);

  // --- Renderers ---

  const renderSidebar = () => (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-20`}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
        </div>
        {isSidebarOpen && <span className="font-bold text-xl text-slate-800 tracking-tight">ScholarAI</span>}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <button 
          onClick={() => setMode(AppMode.STUDY)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${mode === AppMode.STUDY ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <BookOpen className="w-5 h-5" />
          {isSidebarOpen && <span className="font-medium">Study Chat</span>}
        </button>
        <button 
          onClick={() => setMode(AppMode.QUIZ)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${mode === AppMode.QUIZ ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <BrainCircuit className="w-5 h-5" />
          {isSidebarOpen && <span className="font-medium">Quiz Mode</span>}
        </button>
        <button 
          onClick={() => setMode(AppMode.PROGRESS)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${mode === AppMode.PROGRESS ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <BarChart3 className="w-5 h-5" />
          {isSidebarOpen && <span className="font-medium">Progress</span>}
        </button>
      </nav>

      <div className="p-4 border-t border-slate-100">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-slate-600">
              <Menu className="w-5 h-5" />
          </button>
      </div>
    </div>
  );

  const renderStudyMode = () => (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-2xl rounded-2xl p-5 shadow-sm ${msg.role === MessageRole.USER ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}>
              
              {/* Image attachment display */}
              {msg.image && (
                <div className="mb-4 rounded-lg overflow-hidden border border-white/20">
                  <img src={msg.image} alt="User upload" className="max-h-64 object-cover" />
                </div>
              )}

              <div className={`prose ${msg.role === MessageRole.USER ? 'prose-invert' : 'prose-slate'} max-w-none text-sm md:text-base leading-relaxed`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Diagram display */}
              {msg.diagram && (
                 <MermaidDiagram chart={msg.diagram} />
              )}
              
              {/* Optional: Action buttons for AI messages */}
              {msg.role === MessageRole.MODEL && !msg.content.includes("image") && (
                 <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <button 
                        onClick={() => handleGenerateImage(msg.content.slice(0, 50))} 
                        className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium"
                    >
                        <ImageIcon className="w-3 h-3" /> Generate Visual
                    </button>
                    {/* Could add 'Create Quiz from this' button here */}
                 </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span className="text-sm text-slate-500">ScholarAI is thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          {selectedImage && (
            <div className="absolute bottom-full mb-2 left-0 bg-white p-1 rounded-lg border border-slate-200 shadow-md">
                <div className="relative">
                    <img src={selectedImage} alt="Selected" className="h-20 w-20 object-cover rounded-md" />
                    <button 
                        onClick={() => setSelectedImage(null)} 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
          )}
          
          <label className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ImageIcon className="w-5 h-5" />
          </label>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask anything... (e.g., 'Explain Photosynthesis' or 'Analyze this image')"
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none py-2.5 max-h-32 min-h-[44px]"
            rows={1}
          />
          
          <button 
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isTyping}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderQuizMode = () => (
    <div className="h-full bg-slate-50 p-6 overflow-y-auto flex flex-col items-center justify-center">
      {!activeQuiz ? (
        <div className="max-w-md w-full text-center">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BrainCircuit className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Generator</h2>
            <p className="text-slate-500 mb-6">Enter a topic to generate a custom AI-powered quiz.</p>
            
            <input
              type="text"
              value={quizTopic}
              onChange={(e) => setQuizTopic(e.target.value)}
              placeholder="e.g., World War II, Calculus, Python Basics"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4 bg-slate-50"
            />
            
            <button
              onClick={handleStartQuiz}
              disabled={isGeneratingQuiz || !quizTopic.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isGeneratingQuiz ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {isGeneratingQuiz ? 'Generating...' : 'Create Quiz'}
            </button>
          </div>
        </div>
      ) : !quizFinished ? (
        <div className="w-full max-w-3xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6 px-4">
                 <button onClick={() => setActiveQuiz(null)} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
                    ← Exit Quiz
                 </button>
                 <span className="text-slate-800 font-bold">{activeQuiz.topic}</span>
                 <div className="w-16"></div> 
            </div>
            <QuizCard
                question={activeQuiz.questions[currentQuestionIndex]}
                questionIndex={currentQuestionIndex}
                totalQuestions={activeQuiz.questions.length}
                onAnswer={handleQuizAnswer}
                onNext={handleNextQuestion}
            />
        </div>
      ) : (
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Complete!</h2>
            <p className="text-slate-500 mb-8">You scored</p>
            
            <div className="text-6xl font-black text-indigo-600 mb-8">
              {Math.round((quizScore / activeQuiz.questions.length) * 100)}%
            </div>
            
            <div className="flex gap-3">
                <button
                onClick={() => {
                    setActiveQuiz(null);
                    setQuizTopic('');
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                >
                New Topic
                </button>
                <button
                onClick={() => setMode(AppMode.PROGRESS)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
                >
                See Progress
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProgressMode = () => (
    <div className="h-full bg-slate-50 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Progress</h2>
            <p className="text-slate-500">Track your learning journey and quiz performance.</p>
        </div>

        {stats.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">No stats yet</h3>
                <p className="text-slate-500">Complete quizzes to see your progress here.</p>
            </div>
        ) : (
            <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Recent Quiz Scores</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={stats.slice(0, 10).reverse()}>
                            <XAxis dataKey="topic" tick={{fontSize: 12}} interval={0} height={40} tickFormatter={(val) => val.length > 10 ? val.substring(0,10)+'...' : val} />
                            <YAxis />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: '#f1f5f9'}}
                            />
                            <Bar dataKey="quizScore" radius={[4, 4, 0, 0]}>
                                {stats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.quizScore >= 80 ? '#4f46e5' : entry.quizScore >= 50 ? '#818cf8' : '#cbd5e1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">Learning History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="p-4 font-medium">Topic</th>
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Score</th>
                                    <th className="p-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800">{stat.topic}</td>
                                        <td className="p-4 text-slate-500">{new Date(stat.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-slate-700">{stat.quizScore}%</td>
                                        <td className="p-4">
                                            {stat.quizScore >= 80 ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Mastered</span>
                                            ) : stat.quizScore >= 50 ? (
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">Learning</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">Needs Review</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white">
      {renderSidebar()}
      
      <main className="flex-1 flex flex-col min-w-0">
        {mode === AppMode.STUDY && renderStudyMode()}
        {mode === AppMode.QUIZ && renderQuizMode()}
        {mode === AppMode.PROGRESS && renderProgressMode()}
      </main>
    </div>
  );
};

export default App;
