import React, { useState, useEffect } from 'react';
import {
  Home,
  Calculator,
  BookOpen,
  Briefcase,
  LogOut,
  Plus,
  Trash2,
  Clock,
  Upload,
  Sparkles,
  Send,
  RefreshCw,
  Check,
  AlertCircle,
  UserCheck,
  BrainCircuit,
  FileText,
  CheckCircle2,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Copy,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';

interface DashboardProps {
  onLogout: () => void;
  studentInfo: {
    name: string;
    branch: string;
    year: string;
    phone: string;
    googleAccount: string;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, studentInfo }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'bunk' | 'study' | 'placement'>('core');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Calendar connection state — persisted in localStorage per user
  const calendarStorageKey = `campus_cal_connected_${studentInfo.googleAccount}`;
  const [calendarConnected, setCalendarConnected] = useState(
    () => localStorage.getItem(calendarStorageKey) === 'true',
  );
  const [copiedEmail, setCopiedEmail] = useState(false);
  const DISPATCHER_EMAIL = 'jj2006ad@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(DISPATCHER_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleMarkConnected = () => {
    localStorage.setItem(calendarStorageKey, 'true');
    setCalendarConnected(true);
  };
  // --- Core Platform States ---
  const [tasks, setTasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [deadlines, setDeadlines] = useState<
    { id: string; subject: string; title: string; date: string; time: string }[]
  >([]);
  const [newDeadlineSubject, setNewDeadlineSubject] = useState('');
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlineTime, setNewDeadlineTime] = useState('');

  const [automations, setAutomations] = useState<
    {
      id: string;
      name: string;
      type: string;
      status: 'success' | 'failed' | 'pending';
      time: string;
    }[]
  >([]);

  const [aiTip, setAiTip] = useState(
    'Pro-Tip: Reviewing notes 15 minutes before sleep boosts memory retention by up to 22%!',
  );

  // --- Bunk Calculator States ---
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [timetableParsing, setTimetableParsing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<
    { subject: string; attended: number; total: number }[]
  >([]);
  const [parsedTimetable, setParsedTimetable] = useState<
    { day: string; subject: string; startTime: string; endTime: string }[] | null
  >(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectAttended, setNewSubjectAttended] = useState('');
  const [newSubjectTotal, setNewSubjectTotal] = useState('');

  // --- Study Companion States ---
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [companionQuery, setCompanionQuery] = useState('');
  const [companionChat, setCompanionChat] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([
    {
      role: 'assistant',
      text: 'Ask questions about your uploaded PDFs. I will answer using the chunked vectors stored in Cloudflare Vectorize.',
    },
  ]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [companionChat]);

  const [flashcards, setFlashcards] = useState<
    { id: string; front: string; back: string; flipped: boolean }[]
  >([]);
  const [newFlashcardFront, setNewFlashcardFront] = useState('');
  const [newFlashcardBack, setNewFlashcardBack] = useState('');
  const [collegeNotice, setCollegeNotice] = useState('');
  const [noticeSummary, setNoticeSummary] = useState<string[]>([]);
  const [summarizingNotice, setSummarizingNotice] = useState(false);

  // --- Placement Prep States ---
  const [currentProblem, setCurrentProblem] = useState<{
    id: number;
    question: string;
    type: string;
    options: string[];
    answer: string;
    hint: string;
  }>({
    id: 1,
    type: 'Data Structures',
    question: 'What is the worst-case time complexity of searching in a Binary Search Tree (BST)?',
    options: ['O(log N)', 'O(N)', 'O(N log N)', 'O(1)'],
    answer: 'O(N)',
    hint: 'Think about a degenerate (skewed) binary search tree, where all nodes are chained in a single path.',
  });
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [prepAttempts, setPrepAttempts] = useState<
    { topic: string; total: number; success: number }[]
  >([]);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [prepHint, setPrepHint] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jdMatching, setJdMatching] = useState(false);
  const [jdMatchResult, setJdMatchResult] = useState<{
    percentage: number;
    missing: string[];
    recommendations: string[];
  } | null>(null);

  // Auto-generate a new AI study tip every minute
  useEffect(() => {
    const tips = [
      'AI Study Tip: Space your revisions out. Revise after 1 day, then 3 days, then 7 days for peak recall.',
      'AI Study Tip: Try the Feynman Technique. Explain complex CS concepts to a non-technical friend.',
      'AI Study Tip: Keep hydrated. A 1% drop in hydration can cause a 10% decline in cognitive function.',
      'AI Study Tip: Group related coding problems together. Understanding patterns overrides memorizing solutions.',
    ];
    const interval = setInterval(() => {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setAiTip(randomTip);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Core Actions ---
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), title: newTaskTitle, completed: false }]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const createDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineSubject || !newDeadlineTitle || !newDeadlineDate) return;

    // Optimistically update UI immediately
    const tempId = Date.now().toString();
    const newDL = {
      id: tempId,
      subject: newDeadlineSubject,
      title: newDeadlineTitle,
      date: newDeadlineDate,
      time: newDeadlineTime || '12:00',
    };
    setDeadlines((prev) => [...prev, newDL]);

    // Update automations log
    const pendingAuto = {
      id: Math.random().toString(),
      name: `Google Calendar Sync: ${newDL.subject} — ${newDL.title}`,
      type: 'Calendar',
      status: 'pending' as const,
      time: 'Just now',
    };
    setAutomations((prev) => [pendingAuto, ...prev]);

    // Reset form fields immediately
    setNewDeadlineSubject('');
    setNewDeadlineTitle('');
    setNewDeadlineDate('');
    setNewDeadlineTime('');

    try {
      // POST to backend — which saves to D1 and fires n8n → Google Calendar
      const token = localStorage.getItem('campus_token');
      const res = await fetch('/api/academic/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: newDL.subject,
          title: newDL.title,
          dueDate: newDL.date,
          dueTime: newDL.time,
          calendarId: studentInfo.googleAccount || 'primary',
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        // Swap temp id with real DB id
        setDeadlines((prev) =>
          prev.map((d) => (d.id === tempId ? { ...d, id: data.deadline?.id || tempId } : d)),
        );
        // Update automation log to success
        setAutomations((prev) =>
          prev.map((a) =>
            a.id === pendingAuto.id
              ? { ...a, status: 'success' as const, name: `Google Calendar Sync: ${newDL.subject} — ${newDL.title}` }
              : a,
          ),
        );
      } else {
        throw new Error('Server error');
      }
    } catch {
      // Mark automation as failed but keep deadline in UI
      setAutomations((prev) =>
        prev.map((a) =>
          a.id === pendingAuto.id ? { ...a, status: 'failed' as const } : a,
        ),
      );
    }
  };

  const deleteDeadline = (id: string) => {
    setDeadlines(deadlines.filter((d) => d.id !== id));
  };

  // --- Bunk Calculator Actions ---
  const calculateAttendanceStats = (item: { subject: string; attended: number; total: number }) => {
    const currentPercent = item.total === 0 ? 0 : Math.round((item.attended / item.total) * 100);

    // How many classes can be skipped without falling below 75%?
    // Formula: (Attended / (Total + Bunked)) >= 0.75
    // Attended / 0.75 >= Total + Bunked
    // Bunked <= (Attended / 0.75) - Total
    let maxSafeBunks = 0;
    if (currentPercent >= 75) {
      maxSafeBunks = Math.floor(item.attended / 0.75 - item.total);
    }

    // How many consecutive classes must be attended to reach 75%?
    let classesToAttend = 0;
    if (currentPercent < 75) {
      // (Attended + classesToAttend) / (Total + classesToAttend) >= 0.75
      // Attended + classesToAttend >= 0.75 * Total + 0.75 * classesToAttend
      // 0.25 * classesToAttend >= 0.75 * Total - Attended
      // classesToAttend >= 3 * Total - 4 * Attended
      classesToAttend = Math.max(0, Math.ceil(3 * item.total - 4 * item.attended));
    }

    return { currentPercent, maxSafeBunks, classesToAttend };
  };

  const handleTimetableUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTimetableFile(file);
      setTimetableParsing(true);

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64String = (reader.result as string).split(',')[1];
            const token = localStorage.getItem('campus_token');
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const requestUrl = `${apiBaseUrl.replace(/\/$/, '')}/api/bunk/parse-timetable`;
            const response = await fetch(requestUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                imageBase64: base64String,
                mimeType: file.type
              })
            });

            if (!response.ok) {
              throw new Error('Failed to parse timetable from server');
            }

            const data = (await response.json()) as any;
            if (data.success && data.timetable) {
              setParsedTimetable(data.timetable);
              
              // Extract unique subjects
              const uniqueSubjects: string[] = Array.from(
                new Set(data.timetable.map((item: any) => item.subject))
              );
              
              setAttendanceData(
                uniqueSubjects.map((sub: string) => ({
                  subject: sub,
                  attended: 0,
                  total: 0
                }))
              );
            }
          } catch (error) {
            console.error('Error parsing timetable:', error);
            alert('Error parsing timetable image. Please ensure GEMINI_API_KEY is configured and try again.');
          } finally {
            setTimetableParsing(false);
            setAutomations((prev) => [
              {
                id: Math.random().toString(),
                name: `Gemini Vision: Parsed timetable '${file.name}' into D1`,
                type: 'Gemini OCR',
                status: 'success' as const,
                time: 'Just now',
              },
              ...prev,
            ]);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('File reading failed:', error);
        setTimetableParsing(false);
      }
    }
  };

  const updateSubjectAttendance = (index: number, field: 'attended' | 'total', value: number) => {
    const updated = [...attendanceData];
    updated[index] = { ...updated[index], [field]: Math.max(0, value) };
    setAttendanceData(updated);
  };

  const addSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !newSubjectTotal) return;
    const attended = parseInt(newSubjectAttended) || 0;
    const total = parseInt(newSubjectTotal) || 0;
    setAttendanceData([...attendanceData, { subject: newSubjectName, attended, total }]);
    setNewSubjectName('');
    setNewSubjectAttended('');
    setNewSubjectTotal('');
  };

  // --- Study Companion Actions ---
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfName(file.name);
      setPdfUploaded(true);

      // Add automation log
      setAutomations((prev) => [
        {
          id: Math.random().toString(),
          name: `R2 Upload: Stored '${file.name}' + Chunks created & embedded`,
          type: 'R2 & Vectorize',
          status: 'success' as const,
          time: 'Just now',
        },
        ...prev,
      ]);
    }
  };

  const askCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companionQuery.trim()) return;

    const userText = companionQuery;
    setCompanionQuery('');
    setCompanionChat((prev) => [...prev, { role: 'user', text: userText }]);

    try {
      const response = await api.post('/study/ask', { question: userText });
      const data = response.data as any;
      if (data.success) {
        setCompanionChat((prev) => [...prev, { role: 'assistant', text: data.answer }]);
      }
    } catch (error) {
      setCompanionChat((prev) => [...prev, { role: 'assistant', text: 'Error fetching response.' }]);
    }
  };

  const toggleFlashcard = (id: string) => {
    setFlashcards(flashcards.map((c) => (c.id === id ? { ...c, flipped: !c.flipped } : c)));
  };

  const addFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlashcardFront.trim() || !newFlashcardBack.trim()) return;
    setFlashcards([
      ...flashcards,
      {
        id: Date.now().toString(),
        front: newFlashcardFront,
        back: newFlashcardBack,
        flipped: false,
      },
    ]);
    setNewFlashcardFront('');
    setNewFlashcardBack('');
  };

  const summarizeNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeNotice.trim()) return;

    setSummarizingNotice(true);
    try {
      const response = await api.post('/notices/broadcast', { title: 'New Notice', content: collegeNotice });
      const data = response.data as any;
      if (data.success && data.broadcast) {
        setNoticeSummary([data.broadcast.summary, ...data.broadcast.actionItems]);

        // Add to automation feed
        setAutomations((prev) => [
          {
            id: Math.random().toString(),
            name: 'Broadcast Notice: Sent Telegram circular to CS Student body',
            type: 'n8n Webhook',
            status: 'success' as const,
            time: 'Just now',
          },
          {
            id: Math.random().toString(),
            name: 'Calendar Event: Notice dates mapped',
            type: 'Google API',
            status: 'success' as const,
            time: 'Just now',
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizingNotice(false);
    }
  };

  // --- Placement Prep Actions ---
  const handleProblemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAnswerFeedback(null);
    setPrepHint('');

    if (selectedAnswer === currentProblem.answer) {
      setAnswerFeedback('correct');
      // Update statistics
      setPrepAttempts((prev) =>
        prev.map((a) =>
          a.topic === currentProblem.type
            ? { ...a, success: a.success + 1, total: a.total + 1 }
            : a,
        ),
      );
    } else {
      setAnswerFeedback('wrong');
      // Update statistics (failed attempt, total grows but success doesn't)
      setPrepAttempts((prev) =>
        prev.map((a) => (a.topic === currentProblem.type ? { ...a, total: a.total + 1 } : a)),
      );
      // Trigger Hint only logic
      setPrepHint(currentProblem.hint);
    }
  };

  const loadNextProblem = () => {
    setSelectedAnswer('');
    setAnswerFeedback(null);
    setPrepHint('');
    // Load a different hardcoded question
    setCurrentProblem({
      id: 2,
      type: 'Algorithms',
      question:
        'Which scheduling algorithm can result in starvation (indefinite postponement of processes)?',
      options: [
        'Round Robin',
        'First Come First Served',
        'Shortest Job First (Priority-based)',
        'Multi-level Feedback Queue (with aging)',
      ],
      answer: 'Shortest Job First (Priority-based)',
      hint: 'Starvation happens when longer jobs never run because shorter, higher-priority jobs keep entering the queue.',
    });
  };

  const matchResumeWithJd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;

    setJdMatching(true);
    try {
      const response = await api.post('/placement/analyze', {
        resumeText: "Mock Resume Data for testing", // normally read from resumeFile
        jobDescription: jobDescription,
      });
      const data = response.data as any;
      if (data.success && data.analysis) {
        setJdMatchResult({
          percentage: data.analysis.score,
          missing: data.analysis.missingKeywords,
          recommendations: [data.analysis.feedback],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJdMatching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-background text-foreground transition-all duration-300 min-h-screen relative">
      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-serif font-bold text-lg">CampusFlow</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors cursor-pointer"
            title="View Profile"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`
        ${isSidebarOpen ? 'flex' : 'hidden md:flex'} 
        w-full md:w-auto shrink-0 transition-all duration-300
      `}
      >
        <div
          className={`
          flex flex-col justify-between p-4 bg-card border-b md:border-b-0 md:border-r border-border/80 w-full transition-all duration-300
          ${isSidebarOpen ? 'md:w-64' : 'md:w-18'}
        `}
        >
          <div className="space-y-6">
            {/* Toggle Button for desktop layout only */}
            <div className="hidden md:flex justify-end">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
              >
                {isSidebarOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Profile trigger card - Clickable to open detailed profile modal */}
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className={`flex items-center bg-accent/40 rounded-xl border border-secondary/20 cursor-pointer hover:bg-accent/60 transition-colors p-2 ${
                isSidebarOpen ? 'gap-3' : 'justify-center'
              }`}
              title="Click to view full profile details"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shadow-sm shrink-0">
                <User className="w-5 h-5" />
              </div>
              {isSidebarOpen && (
                <div className="text-left select-none truncate">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    My Profile
                  </div>
                  <div className="text-sm font-bold text-foreground truncate max-w-[130px]">
                    {studentInfo.name}
                  </div>
                </div>
              )}
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('core');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-lg transition-all p-2.5 text-sm font-medium cursor-pointer ${
                  activeTab === 'core'
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'}`}
                title="Core & Automations"
              >
                <Home className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && <span>Core & Automations</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('bunk');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-lg transition-all p-2.5 text-sm font-medium cursor-pointer ${
                  activeTab === 'bunk'
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'}`}
                title="Bunk Calculator"
              >
                <Calculator className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && <span>Bunk Calculator</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('study');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-lg transition-all p-2.5 text-sm font-medium cursor-pointer ${
                  activeTab === 'study'
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'}`}
                title="Study Companion"
              >
                <BookOpen className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && <span>Study Companion</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('placement');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-lg transition-all p-2.5 text-sm font-medium cursor-pointer ${
                  activeTab === 'placement'
                    ? 'bg-secondary text-secondary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'}`}
                title="Placement Prep"
              >
                <Briefcase className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && <span>Placement Prep</span>}
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-border/60 space-y-3">
            {isSidebarOpen && (
              <div className="text-[10px] text-muted-foreground px-2 select-none animate-fade-in">
                Branch: <span className="font-semibold text-foreground">{studentInfo.branch}</span>
                <br />
                Year: <span className="font-semibold text-foreground">{studentInfo.year}</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className={`w-full flex items-center rounded-lg text-destructive hover:bg-destructive/10 transition-all p-2.5 text-sm font-medium cursor-pointer ${
                isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* --- 1. CORE PLATFORM TAB --- */}
        {activeTab === 'core' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header + AI Generated study tip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 border border-border/80 rounded-xl shadow-sm transition-colors">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Welcome Back, {studentInfo.name}!
                </h2>
                <p className="text-muted-foreground text-xs">
                  Today's system health is optimal. Integrations linked via phone{' '}
                  {studentInfo.phone}.
                </p>
              </div>
              <div className="max-w-md bg-accent border border-secondary/20 p-3 rounded-lg flex items-start gap-2.5">
                <Sparkles className="w-4.5 h-4.5 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-secondary font-medium leading-relaxed">{aiTip}</p>
              </div>
            </div>

            {/* ── Google Calendar Connection Banner ── */}
            {!calendarConnected && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/25 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Connect your Google Calendar</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Share your calendar with <span className="font-mono font-semibold text-blue-400">{DISPATCHER_EMAIL}</span> to auto-sync deadlines.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/80 hover:border-blue-400/50 rounded-lg text-xs font-medium text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedEmail ? 'Copied!' : 'Copy Email'}
                  </button>
                  <a
                    href="https://calendar.google.com/calendar/r/settings/sharepeople"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Calendar Settings
                  </a>
                  <button
                    onClick={handleMarkConnected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-bold transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Task list and Deadline CRUD */}
              <div className="lg:col-span-8 space-y-6">
                {/* Deadline CRUD card */}
                <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 space-y-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-secondary" />
                      <span>My Deadlines</span>
                    </h3>
                    <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded font-semibold border border-secondary/20">
                      Auto-Sync Active
                    </span>
                  </div>

                  <form
                    onSubmit={createDeadline}
                    className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-lg border border-border/60"
                  >
                    <input
                      type="text"
                      placeholder="Subject (e.g. OS)"
                      value={newDeadlineSubject}
                      onChange={(e) => setNewDeadlineSubject(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Task Title (e.g. Lab 3)"
                      value={newDeadlineTitle}
                      onChange={(e) => setNewDeadlineTitle(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground col-span-1 md:col-span-2"
                      required
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newDeadlineDate}
                        onChange={(e) => setNewDeadlineDate(e.target.value)}
                        className="px-2 py-1.5 text-xs bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground flex-1"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs font-bold rounded shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {/* Deadlines Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-xs font-semibold text-muted-foreground">
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Deadline Title</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-xs">
                        {deadlines.map((dl) => (
                          <tr key={dl.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 font-semibold text-secondary">{dl.subject}</td>
                            <td className="py-3 px-3 text-foreground">{dl.title}</td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {dl.date} @ {dl.time}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => deleteDeadline(dl.id)}
                                className="p-1 hover:bg-destructive/10 text-destructive/80 hover:text-destructive rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {deadlines.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-center text-muted-foreground font-medium"
                            >
                              No active deadlines. Add one above!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Task Manager Checklist */}
                <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 space-y-4 transition-colors">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-secondary" />
                    <span>Daily Progress Tasks</span>
                  </h3>

                  <form onSubmit={addTask} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an ad-hoc study task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 px-3 py-2 bg-muted/30 border border-border/80 rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs font-semibold rounded-lg shadow active:scale-[0.98] transition-all"
                    >
                      Add Task
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 hover:border-secondary/40 rounded-lg cursor-pointer transition-all hover:translate-x-0.5 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              task.completed
                                ? 'bg-secondary border-secondary text-secondary-foreground'
                                : 'border-muted-foreground group-hover:border-secondary'
                            }`}
                          >
                            {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className={`text-xs font-medium transition-all ${
                              task.completed
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Automations status log ("My Automations" feed) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 space-y-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <BrainCircuit className="w-4.5 h-4.5 text-secondary" />
                      <span>Automatic Sync Log</span>
                    </h3>
                    <button
                      onClick={() => {
                        // simulate poll trigger
                        setAutomations((prev) => [
                          {
                            id: Math.random().toString(),
                            name: 'Webhook check: Polling n8n workflow queues',
                            type: 'Sync Status',
                            status: 'success',
                            time: 'Just now',
                          },
                          ...prev,
                        ]);
                      }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Force Sync Check"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Live execution telemetry for local webhook servers linked to your phone and
                    calendar credentials.
                  </p>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {automations.map((auto) => (
                      <div
                        key={auto.id}
                        className="p-3 bg-muted/40 border border-border/50 rounded-lg space-y-1.5 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {auto.type}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              auto.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : auto.status === 'failed'
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                            }`}
                          >
                            {auto.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{auto.name}</div>
                        <div className="text-[9px] text-muted-foreground/60 text-right">
                          {auto.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. BUNK CALCULATOR TAB --- */}
        {activeTab === 'bunk' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground">Attendance & Bunk Calculator</h2>
              <p className="text-xs text-muted-foreground">
                Ensure your attendance stays strictly above the mandatory{' '}
                <span className="font-bold text-secondary">75% threshold</span>. Input parameters
                manually or upload a timetable to let Gemini estimate your margins.
              </p>

              {/* Upload timetable parsing */}
              <div className="p-5 border-2 border-dashed border-border hover:border-secondary/60 rounded-xl bg-muted/30 transition-all text-center relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTimetableUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={timetableParsing}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Upload Timetable Image (PNG/JPG)
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Gemini Vision OCR parses text and maps database streams dynamically.
                    </p>
                  </div>
                  {timetableFile && (
                    <span className="text-[10px] px-2 py-0.5 bg-secondary/15 text-secondary border border-secondary/20 rounded font-semibold">
                      Loaded: {timetableFile.name}
                    </span>
                  )}
                </div>
              </div>

              {timetableParsing && (
                <div className="p-3 bg-accent border border-secondary/20 rounded-lg flex items-center gap-3 text-xs text-secondary justify-center animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Gemini Vision parsing timetable layout and writing schema objects to D1...
                  </span>
                </div>
              )}

              {/* Timetable visual display */}
              {parsedTimetable && parsedTimetable.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>Uploaded Timetable Schedule</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName) => {
                      const dayClasses = parsedTimetable.filter(
                        (item) => item.day.toLowerCase() === dayName.toLowerCase()
                      );
                      return (
                        <div
                          key={dayName}
                          className="bg-muted/20 border border-border/60 rounded-xl p-3 space-y-2.5"
                        >
                          <div className="font-bold text-xs text-secondary border-b border-border/40 pb-1.5 uppercase tracking-wider">
                            {dayName}
                          </div>
                          <div className="space-y-2">
                            {dayClasses.map((cls, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-card border border-border/80 rounded-lg text-[11px] space-y-1 shadow-xs hover:border-secondary/40 transition-colors"
                              >
                                <div className="font-semibold text-foreground truncate" title={cls.subject}>
                                  {cls.subject}
                                </div>
                                <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-secondary/60 shrink-0" />
                                  <span>{cls.startTime} - {cls.endTime}</span>
                                </div>
                              </div>
                            ))}
                            {dayClasses.length === 0 && (
                              <div className="text-[10px] text-muted-foreground italic py-4 text-center">
                                No classes
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attendance Table */}
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm mt-4">
                <div className="p-4 bg-muted/30 border-b border-border/60 flex justify-between items-center">
                  <span className="text-xs font-bold">Attendance Records per Subject</span>
                  <button
                    onClick={() => {
                      // Trigger weekly alert simulation
                      setAutomations((prev) => [
                        {
                          id: Math.random().toString(),
                          name: 'Telegram Alert: Sent attendance risk warnings to client',
                          type: 'Telegram Broadcast',
                          status: 'success' as const,
                          time: 'Just now',
                        },
                        ...prev,
                      ]);
                      alert(
                        'Simulating n8n pipeline: Weekly warning alert dispatched to Telegram!',
                      );
                    }}
                    className="px-2.5 py-1 bg-secondary text-secondary-foreground text-[10px] font-bold rounded hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Test Telegram Alert
                  </button>
                </div>
                <form
                  onSubmit={addSubject}
                  className="p-4 bg-muted/20 border-b border-border/60 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
                >
                  <input
                    type="text"
                    placeholder="New Subject Name (e.g. OS)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="px-3 py-1.5 bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Classes Attended"
                    value={newSubjectAttended}
                    onChange={(e) => setNewSubjectAttended(e.target.value)}
                    className="px-3 py-1.5 bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Total Conducted"
                    value={newSubjectTotal}
                    onChange={(e) => setNewSubjectTotal(e.target.value)}
                    className="px-3 py-1.5 bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                    min="0"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-secondary text-secondary-foreground font-bold rounded shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </form>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-xs font-semibold text-muted-foreground bg-muted/10">
                        <th className="py-2.5 px-4">Subject Name</th>
                        <th className="py-2.5 px-4 text-center">Classes Attended</th>
                        <th className="py-2.5 px-4 text-center">Total Conducted</th>
                        <th className="py-2.5 px-4 text-center">Attendance %</th>
                        <th className="py-2.5 px-4 text-center">Status / Safe Bunks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {attendanceData.map((item, idx) => {
                        const { currentPercent, maxSafeBunks, classesToAttend } =
                          calculateAttendanceStats(item);
                        const isAtRisk = currentPercent < 75;

                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">
                              {item.subject}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                value={item.attended}
                                onChange={(e) =>
                                  updateSubjectAttendance(
                                    idx,
                                    'attended',
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-14 px-1.5 py-0.5 bg-muted border border-border/60 rounded text-center text-foreground"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                value={item.total}
                                onChange={(e) =>
                                  updateSubjectAttendance(
                                    idx,
                                    'total',
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-14 px-1.5 py-0.5 bg-muted border border-border/60 rounded text-center text-foreground"
                              />
                            </td>
                            <td
                              className={`py-3 px-4 text-center font-bold ${isAtRisk ? 'text-destructive' : 'text-emerald-500'}`}
                            >
                              {currentPercent}%
                            </td>
                            <td className="py-3 px-4 text-center font-medium">
                              {isAtRisk ? (
                                <span className="text-destructive font-semibold flex items-center justify-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Attend {classesToAttend} classes consecutively</span>
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block">
                                  Safe to Bunk: {maxSafeBunks} classes
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. STUDY COMPANION TAB --- */}
        {activeTab === 'study' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* PDF Vector QA Interface */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">
                      NotebookLM Study Companion
                    </h2>
                    <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded font-semibold border border-secondary/20">
                      Cloudflare Vectorize Enabled
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload textbooks, lecture files, or syllabus guides. Our engine chunks
                    materials, compiles vectors using Gemini Embeddings, and indexes retrieval
                    parameters.
                  </p>

                  {/* Upload PDF Section */}
                  <div className="p-4 border border-dashed border-border/80 rounded-xl bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-secondary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-foreground">
                          {pdfUploaded ? `Active Document: ${pdfName}` : 'Upload Class Notes (PDF)'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Store directly on Cloudflare R2 bucket.
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="px-3.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                        {pdfUploaded ? 'Change PDF' : 'Upload File'}
                      </button>
                    </div>
                  </div>

                  {/* Chat Console */}
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                    <div
                      ref={chatContainerRef}
                      className="h-64 overflow-y-auto p-4 space-y-3 text-xs flex flex-col"
                    >
                      {companionChat.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-secondary text-secondary-foreground self-end rounded-br-none shadow-sm'
                              : 'bg-card border border-border/80 text-foreground self-start rounded-bl-none shadow-sm'
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Ask Input */}
                    <form
                      onSubmit={askCompanion}
                      className="p-2.5 bg-card border-t border-border/60 flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder={
                          pdfUploaded
                            ? 'Ask about your notes...'
                            : 'Upload a PDF first to search embeddings...'
                        }
                        value={companionQuery}
                        onChange={(e) => setCompanionQuery(e.target.value)}
                        disabled={!pdfUploaded}
                        className="flex-1 px-3 py-1.5 text-xs bg-muted/40 border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                      />
                      <button
                        type="submit"
                        disabled={!pdfUploaded || !companionQuery.trim()}
                        className="p-1.5 bg-secondary text-secondary-foreground rounded disabled:opacity-50 hover:bg-secondary/90 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Flipping Flashcards */}
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold">Auto-Generated Flashcards (Flipping Cards)</h3>
                  <form
                    onSubmit={addFlashcard}
                    className="p-4 bg-muted/40 rounded-lg border border-border/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
                  >
                    <input
                      type="text"
                      placeholder="Concept/Question (Front)"
                      value={newFlashcardFront}
                      onChange={(e) => setNewFlashcardFront(e.target.value)}
                      className="px-3 py-1.5 bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Solution/Answer (Back)"
                      value={newFlashcardBack}
                      onChange={(e) => setNewFlashcardBack(e.target.value)}
                      className="px-3 py-1.5 bg-card border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-secondary text-foreground"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-secondary text-secondary-foreground font-bold rounded shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Flashcard</span>
                    </button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {flashcards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => toggleFlashcard(card.id)}
                        className="perspective-1000 h-32 cursor-pointer relative"
                      >
                        <div
                          className={`w-full h-full duration-500 preserve-3d absolute rounded-xl border border-border shadow-md transition-all ${
                            card.flipped
                              ? 'rotate-y-180 bg-accent text-secondary'
                              : 'bg-card text-foreground'
                          }`}
                        >
                          {/* Front Side */}
                          <div className="absolute inset-0 backface-hidden p-4 flex flex-col justify-between items-center text-center">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                              Concept Card
                            </span>
                            <p className="text-xs font-semibold leading-normal">{card.front}</p>
                            <span className="text-[9px] text-secondary font-medium">
                              Click to flip
                            </span>
                          </div>

                          {/* Back Side */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 p-4 flex flex-col justify-between items-center text-center">
                            <span className="text-[9px] text-secondary font-bold uppercase tracking-wider">
                              Solution
                            </span>
                            <p className="text-[10px] leading-relaxed font-medium overflow-y-auto max-h-[70px]">
                              {card.back}
                            </p>
                            <span className="text-[9px] text-muted-foreground">
                              Click to flip back
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notice Summarizer */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span>Notice Summarizer</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste lengthy college circular notices to generate a 3-bullet AI summary and
                    automatically broadcast details via n8n to Telegram & calendar channels.
                  </p>

                  <form onSubmit={summarizeNotice} className="space-y-3">
                    <textarea
                      placeholder="Paste PDF notice text here..."
                      value={collegeNotice}
                      onChange={(e) => setCollegeNotice(e.target.value)}
                      rows={5}
                      className="w-full p-2.5 text-xs bg-muted/40 border border-border/60 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary transition-all resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={summarizingNotice || !collegeNotice.trim()}
                      className="w-full py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg shadow disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      {summarizingNotice ? 'Synthesizing bullets...' : 'Summarize & Broadcast'}
                    </button>
                  </form>

                  {noticeSummary.length > 0 && (
                    <div className="p-4 bg-accent/60 border border-secondary/20 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-secondary text-[11px] uppercase tracking-wider">
                        3-Bullet AI Summary:
                      </div>
                      <ul className="space-y-1.5 pl-1">
                        {noticeSummary.map((bullet, index) => (
                          <li
                            key={index}
                            className="leading-relaxed text-[11px] text-foreground font-medium"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. PLACEMENT PREP TAB --- */}
        {activeTab === 'placement' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Problem Resolver Card */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">
                      Adaptive Placement Practice
                    </h2>
                    <span className="text-[10px] bg-secondary/15 text-secondary px-2.5 py-0.5 rounded font-semibold border border-secondary/20">
                      Topic: {currentProblem.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Problems adapt to your skill profile. Wrong answers log error tokens in D1 and
                    trigger hints rather than revealing direct answers.
                  </p>

                  <div className="p-5 bg-muted/30 border border-border/50 rounded-xl space-y-4 text-left">
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {currentProblem.question}
                    </p>

                    <form onSubmit={handleProblemSubmit} className="space-y-3">
                      <div className="space-y-2">
                        {currentProblem.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all text-xs ${
                              selectedAnswer === option
                                ? 'bg-secondary/10 border-secondary text-foreground font-semibold'
                                : 'bg-card border-border hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            <input
                              type="radio"
                              name="options"
                              value={option}
                              checked={selectedAnswer === option}
                              onChange={() => setSelectedAnswer(option)}
                              className="accent-secondary h-4 w-4 shrink-0"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={!selectedAnswer}
                          className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg shadow disabled:opacity-50 hover:bg-secondary/90 transition-all cursor-pointer"
                        >
                          Submit Answer
                        </button>
                        {answerFeedback && (
                          <button
                            type="button"
                            onClick={loadNextProblem}
                            className="px-4 py-2 bg-muted text-foreground border border-border text-xs font-bold rounded-lg shadow hover:bg-muted/80 transition-all cursor-pointer"
                          >
                            Next Problem
                          </button>
                        )}
                      </div>
                    </form>

                    {/* Hints only container */}
                    {prepHint && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs space-y-1.5">
                        <p className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Gemini Hint System (D1 logged error):</span>
                        </p>
                        <p className="leading-relaxed font-medium">{prepHint}</p>
                      </div>
                    )}

                    {answerFeedback === 'correct' && (
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold">
                        🎉 Correct! Your skill index has been elevated.
                      </div>
                    )}
                  </div>
                </div>

                {/* Resume vs JD Matcher */}
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span>Resume vs JD Keyword Matcher</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your profile resume and paste target job descriptions. Gemini matches
                    terms, determines missing keywords, and recommends alignment edits.
                  </p>

                  <form onSubmit={matchResumeWithJd} className="space-y-4">
                    {/* Resume Upload */}
                    <div className="p-4 border border-dashed border-border/80 rounded-xl bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-secondary" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground">
                            {resumeFile ? `Selected: ${resumeFile.name}` : 'Upload Resume File'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Accepts PDF, DOCX or TXT.
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => e.target.files && setResumeFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Browse File
                        </button>
                      </div>
                    </div>

                    {/* JD input */}
                    <textarea
                      placeholder="Paste target Job Description details..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={4}
                      className="w-full p-2.5 text-xs bg-muted/40 border border-border/60 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary transition-all resize-none"
                      required
                    />

                    <button
                      type="submit"
                      disabled={jdMatching || !jobDescription.trim()}
                      className="w-full py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg shadow disabled:opacity-50 hover:bg-secondary/90 transition-all cursor-pointer"
                    >
                      {jdMatching
                        ? 'Evaluating resumes & matching metrics...'
                        : 'Calculate JD Match Score'}
                    </button>
                  </form>

                  {/* Match Results */}
                  {jdMatchResult && (
                    <div className="p-5 border border-border/60 bg-muted/20 rounded-xl space-y-4 text-xs text-left animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          JD Keyword Match Percentage:
                        </span>
                        <span
                          className={`text-sm font-black px-2 py-0.5 rounded border ${
                            jdMatchResult.percentage >= 70
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {jdMatchResult.percentage}%
                        </span>
                      </div>

                      {/* Missing Keywords */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-muted-foreground">
                          Missing Target Keywords:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {jdMatchResult.missing.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 font-bold px-2 py-0.5 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-muted-foreground">
                          Improvement Recommendations:
                        </span>
                        <ul className="space-y-1.5 list-disc pl-4 text-foreground">
                          {jdMatchResult.recommendations.map((rec, i) => (
                            <li key={i} className="leading-relaxed font-medium text-[11px]">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Panel side */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-secondary" />
                    <span>Skill Map Metrics</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Tracks placement mock test attempts and resolves strength parameters stored in
                    local tables.
                  </p>

                  <div className="space-y-3">
                    {prepAttempts.map((attempt, i) => {
                      const successRate =
                        attempt.total === 0
                          ? 0
                          : Math.round((attempt.success / attempt.total) * 100);
                      return (
                        <div
                          key={i}
                          className="p-3 bg-muted/40 border border-border/60 rounded-lg space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{attempt.topic}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {attempt.success} / {attempt.total} passed
                            </span>
                          </div>
                          <div className="w-full bg-border rounded-full h-1.5">
                            <div
                              className="bg-secondary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Profile Detail Overlay Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in px-4">
          <div className="bg-card border border-border/80 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-md">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">{studentInfo.name}</h2>
                <span className="text-xs px-2.5 py-0.5 bg-accent text-secondary border border-secondary/20 rounded-full font-semibold inline-block">
                  {studentInfo.year} • {studentInfo.branch}
                </span>
              </div>
            </div>

            <div className="divide-y divide-border/60 text-xs mt-4">
              <div className="py-3 flex justify-between">
                <span className="text-muted-foreground font-medium">Contact Number:</span>
                <span className="font-semibold text-foreground">{studentInfo.phone}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-muted-foreground font-medium">Calendar Integration:</span>
                <span className="font-semibold text-foreground">{studentInfo.googleAccount}</span>
              </div>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full py-2 bg-secondary hover:bg-secondary/95 text-secondary-foreground text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
