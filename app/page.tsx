'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, where, deleteDoc } from 'firebase/firestore';
import {
  Plus,
  Calendar,
  BookOpen,
  Sparkles,
  Timer,
  Check,
  CheckCircle,
  Clock,
  Settings,
  HelpCircle,
  Search,
  Flame,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Play,
  Pause,
  RotateCcw,
  MoreVertical,
  AlertCircle,
  GraduationCap,
  Music,
  User,
  Activity,
  Award,
  BookMarked,
  Sun,
  Moon,
  Palette,
  Send,
  Trash2
} from 'lucide-react';

// Subject definition helper
interface Subject {
  id: string;
  name: string;
  subtitle: string;
  tasksCount: number;
  workload: 'Alta' | 'Media' | 'Óptima';
  progressVal: number; // 0 - 100
  color: string; // Tailwind bg- classes
  iconName: string;
}

// Task definition helper
interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  duration: number; // in minutes
  workload: 'Alta' | 'Media' | 'Óptima';
  completed: boolean;
  notes?: string;
  dayDistribution?: string; // 'Hoy (Lun)', 'Mañana (Mar)', 'Miércoles', etc.
}

// Calendar event helper
interface CalendarEvent {
  id: string;
  day: number;
  title: string;
  time: string;
  type: 'Exámenes' | 'Trabajos' | 'Deberes';
  subtitle: string;
}

export default function Home() {
  // Screens state
  const [screen, setScreen] = useState<'login' | 'app'>('login');
  
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setScreen('app'); // skip login if already logged in
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setScreen('app');
    } catch (error) {
      console.error('Error logging in', error);
      alert('Hubo un error al iniciar sesión.');
    }
  };

  // Data fetching
  useEffect(() => {
    if (!user) return; // Only sync if authenticated

    const fetchUserDoc = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserName(data.userName);
          if (data.dailyLimitMinutes) setDailyLimitMinutes(data.dailyLimitMinutes);
          if (data.alarms) setAlarms(data.alarms);
        } else {
          // Create initial user doc
          try {
            await setDoc(userRef, {
              userName: user.displayName?.split(' ')[0] || 'Estudiante',
              dailyLimitMinutes: 320,
              alarms: { cambioMateria: true, finSesion: false },
              createdAt: new Date(),
              updatedAt: new Date()
            });
            setUserName(user.displayName?.split(' ')[0] || 'Estudiante');
          } catch (createErr) {
            handleFirestoreError(createErr, OperationType.CREATE, `users/${user.uid}`);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    };
    fetchUserDoc();

    // Subjects Sync
    const subjectsUnsub = onSnapshot(query(collection(db, 'subjects'), where('userId', '==', user.uid)), (snapshot) => {
      const s: Subject[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        s.push({
          id: doc.id,
          name: d.name,
          subtitle: d.subtitle,
          color: d.color,
          // simulated values for metrics
          tasksCount: 0,
          workload: 'Óptima',
          progressVal: 0,
          iconName: 'book'
        });
      });
      if (s.length > 0) setSubjects(s);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subjects'));

    // Tasks Sync
    const tasksUnsub = onSnapshot(query(collection(db, 'tasks'), where('userId', '==', user.uid)), (snapshot) => {
      const t: Task[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        t.push({
          id: doc.id,
          title: d.title,
          subject: d.subject,
          dueDate: d.date,
          duration: d.estimatedMinutes,
          workload: d.workload,
          completed: d.isCompleted,
        });
      });
      if (t.length > 0) setTasks(t);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    // Calendar Events Sync
    const calUnsub = onSnapshot(query(collection(db, 'calendarEvents'), where('userId', '==', user.uid)), (snapshot) => {
      const evs: CalendarEvent[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        evs.push({
          id: doc.id,
          day: d.date,
          title: d.title,
          time: d.time,
          type: d.type as any,
          subtitle: ''
        });
      });
      if (evs.length > 0) setCalendarEvents(evs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'calendarEvents'));

    return () => {
      subjectsUnsub();
      tasksUnsub();
      calUnsub();
    };
  }, [user]);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'subjects' | 'smart_org' | 'study_time'>('dashboard');
  
  // User name input
  const [userName, setUserName] = useState('Alejandro');
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(320);
  
  // Interactive mock Database State
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: 'Matemáticas', subtitle: 'Álgebra y Geometría', tasksCount: 3, workload: 'Media', progressVal: 85, color: 'bg-red-500', iconName: 'calculator' },
    { id: '2', name: 'Historia', subtitle: 'Contemporánea', tasksCount: 1, workload: 'Óptima', progressVal: 60, color: 'bg-amber-500', iconName: 'history' },
    { id: '3', name: 'Lengua', subtitle: 'Literatura y Gramática', tasksCount: 1, workload: 'Óptima', progressVal: 10, color: 'bg-blue-600', iconName: 'book' },
    { id: '4', name: 'Física', subtitle: 'Cinemática y Dinámica', tasksCount: 0, workload: 'Óptima', progressVal: 0, color: 'bg-amber-500', iconName: 'physics' },
    { id: '5', name: 'Inglés', subtitle: 'Grammar & Vocab', tasksCount: 1, workload: 'Óptima', progressVal: 25, color: 'bg-blue-600', iconName: 'globe' },
    { id: '6', name: 'Plástica', subtitle: 'Dibujo y Expresión Artística', tasksCount: 1, workload: 'Óptima', progressVal: 40, color: 'bg-pink-500', iconName: 'palette' },
    { id: '7', name: 'Música', subtitle: 'Lenguaje Musical e Instrumento', tasksCount: 1, workload: 'Óptima', progressVal: 50, color: 'bg-emerald-500', iconName: 'music' },
    { id: '8', name: 'PIAR', subtitle: 'Proyecto Int. de Aprendizaje', tasksCount: 0, workload: 'Óptima', progressVal: 0, color: 'bg-teal-500', iconName: 'lightbulb' },
    { id: '9', name: 'Religión', subtitle: 'Filosofía y Valores', tasksCount: 1, workload: 'Óptima', progressVal: 30, color: 'bg-violet-500', iconName: 'book-open' },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', title: 'Examen de Mates', subject: 'Matemáticas', dueDate: '2026-05-25', duration: 120, workload: 'Alta', completed: false, notes: 'Temas 4 y 5', dayDistribution: 'Hoy (Lun)' },
    { id: 't2', title: 'Deberes de Lengua', subject: 'Lengua', dueDate: '2026-05-26', duration: 30, workload: 'Media', completed: false, notes: 'Comentario de texto - Entregar mañana', dayDistribution: 'Mañana (Mar)' },
    { id: 't3', title: 'Lámina de Dibujo Técnico', subject: 'Plástica', dueDate: '2026-05-25', duration: 45, workload: 'Óptima', completed: false, notes: 'Perspectiva caballera', dayDistribution: 'Hoy (Lun)' },
    { id: 't4', title: 'Ejercicios Mates (1-10)', subject: 'Matemáticas', dueDate: '2026-05-25', duration: 75, workload: 'Media', completed: false, notes: 'Ecuaciones de segundo grado', dayDistribution: 'Hoy (Lun)' },
    { id: 't5', title: 'Repasar Inglés Irregulares', subject: 'Inglés', dueDate: '2026-05-26', duration: 30, workload: 'Media', completed: false, notes: 'Verbos irregulares clase B', dayDistribution: 'Mañana (Mar)' },
    { id: 't6', title: 'Aprender escala de Sol M', subject: 'Música', dueDate: '2026-05-27', duration: 30, workload: 'Media', completed: false, notes: 'Ensayo en flauta o teclado', dayDistribution: 'Miércoles' },
    { id: 't7', title: 'Ensayo de Reflexión Social', subject: 'Religión', dueDate: '2026-05-27', duration: 40, workload: 'Óptima', completed: false, notes: 'Dilemas de justicia social', dayDistribution: 'Miércoles' }
  ]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { id: 'e1', day: 15, title: 'Examen de Matemáticas', time: '10:00 AM', type: 'Exámenes', subtitle: 'Tema 4: Derivadas e Integrales.' },
    { id: 'e2', day: 15, title: 'Entrega Ensayo Historia', time: '23:59 PM', type: 'Trabajos', subtitle: 'Subir a plataforma virtual.' },
    { id: 'e3', day: 15, title: 'Ejercicios de Física', time: 'Por la tarde', type: 'Deberes', subtitle: 'Páginas 45-48 del libro.' },
    { id: 'e4', day: 3, title: 'Repaso Vocabulario Inglés', time: '17:00 PM', type: 'Deberes', subtitle: 'Unidades 1 y 2.' },
    { id: 'e5', day: 6, title: 'Evaluación de Ritmo Musical', time: '09:00 AM', type: 'Exámenes', subtitle: 'Prueba rítmica y afinación.' }
  ]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);

  // ChatGPT-style Gemini Chat States
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; isError?: boolean }[]>([
    { role: 'assistant', text: '¡Hola, crack! Soy Aarikeron AI, tu tutor académico virtual. 🌟\n\nPregúntame sobre cómo estructurar tu tarde de estudio, resolver dudas de Plástica, Música, PIAR, Religión o cualquier otra asignatura, o planificar tus bloques de tiempo. ¿En qué puedo ayudarte hoy, fiera?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // New Subject creation states
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSubtitle, setNewSubjectSubtitle] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('bg-indigo-500');

  // Active Sub-Tab in Smart Org ("org" vs "chat")
  const [smartOrgSubTab, setSmartOrgSubTab] = useState<'estimator' | 'chatgpt'>('estimator');

  // Selected calendar day
  const [selectedDay, setSelectedDay] = useState(15);
  // Extracurricular blocks
  const [extracurriculars, setExtracurriculars] = useState([
    { id: 'extra1', title: 'Entrenamiento Fútbol', days: 'L X V', hours: '18:00 - 20:00', type: 'sports' },
    { id: 'extra2', title: 'Conservatorio', days: 'M J', hours: '17:30 - 19:30', type: 'music' }
  ]);

  // Modals / Inputs states
  const [activeTaskQuery, setActiveTaskQuery] = useState('');
  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    estimatedMinutes: number;
    workloadRating: string;
    subjectSuggestion: string;
    steps: { title: string; minutes: number }[];
  } | null>(null);

  // Form states for creating manually
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDate, setTaskFormDate] = useState('2026-05-25');
  const [taskFormSubject, setTaskFormSubject] = useState('Matemáticas');
  const [taskFormDuration, setTaskFormDuration] = useState(45);
  const [taskFormWorkload, setTaskFormWorkload] = useState<'Alta' | 'Media' | 'Óptima'>('Media');

  // Alarm sound toggles
  const [alarms, setAlarms] = useState({
    cambioMateria: true,
    finSesion: false,
  });

  // Settings Panel state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Pomodoro Timer State
  const [timerMode, setTimerMode] = useState<'study' | 'short' | 'long'>('study');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSetTimerMode = (mode: 'study' | 'short' | 'long') => {
    setTimerMode(mode);
    let mins = 25;
    if (mode === 'short') mins = 5;
    if (mode === 'long') mins = 15;
    setTimeLeft(mins * 60);
    setTotalTime(mins * 60);
    setTimerActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Timer countdown
  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            alert(`¡Tiempo cumplido! Modo ${timerMode === 'study' ? 'Estudio' : 'Descanso'} finalizado.`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive, timerMode]);

  const handleStartTimer = () => setTimerActive(true);
  const handlePauseTimer = () => setTimerActive(false);
  const handleResetTimer = () => {
    setTimerActive(false);
    let mins = 25;
    if (timerMode === 'short') mins = 5;
    if (timerMode === 'long') mins = 15;
    setTimeLeft(mins * 60);
  };

  const formattedTimeLeft = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressOffset = () => {
    const strokeDash = 880;
    const ratio = timeLeft / totalTime;
    return strokeDash - ratio * strokeDash;
  };

  // AI Estimate handler
  const handleAIEstimate = async () => {
    if (!activeTaskQuery.trim()) return;
    setAiEstimating(true);
    setAiResult(null);
    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: activeTaskQuery })
      });
      const data = await response.json();
      setAiResult(data);
      // Auto-fill values in input form
      setTaskFormTitle(activeTaskQuery);
      setTaskFormSubject(data.subjectSuggestion || 'Matemáticas');
      setTaskFormDuration(data.estimatedMinutes || 45);
      setTaskFormWorkload(data.workloadRating || 'Media');
    } catch (e) {
      console.error(e);
    } finally {
      setAiEstimating(false);
    }
  };

  // ChatGPT mode Gemini Chat handlers
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');

    // Add user message locally
    const updatedMessages = [
      ...chatMessages,
      { role: 'user', text: userText } as { role: 'user' | 'assistant'; text: string }
    ];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            parts: [{ text: msg.text }]
          }))
        })
      });

      const data = await response.json();
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.text }
      ]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Vaya fiera, he tenido un pequeño error al conectar con mis procesadores de Gemini. Asegúrate de tener una GEMINI_API_KEY en Ajustes > Secrets o vuelve a intentarlo más tarde.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      { role: 'assistant', text: '¡Conversación reiniciada! ¿Qué dudas académicas o de organización tienes ahora fiera? Estoy listo.' }
    ]);
  };

  // Add Custom Subject Manually
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const nameClean = newSubjectName.trim();
    if (subjects.some(s => s.name.toLowerCase() === nameClean.toLowerCase())) {
      alert(`La asignatura "${nameClean}" ya existe, fiera.`);
      return;
    }

    const icons = ['book', 'palette', 'music', 'calculator', 'globe', 'physics', 'lightbulb'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];

    const newSub: Subject = {
      id: Math.random().toString(),
      name: nameClean,
      subtitle: newSubjectSubtitle.trim() || 'Materia personalizada',
      tasksCount: 0,
      workload: 'Óptima',
      progressVal: 0,
      color: newSubjectColor,
      iconName: randomIcon
    };

    if (user) {
      const subjectRef = doc(collection(db, 'subjects'));
      const subjectId = subjectRef.id;
      newSub.id = subjectId;
      try {
        setDoc(subjectRef, {
          userId: user.uid,
          name: newSub.name,
          subtitle: newSub.subtitle,
          color: newSub.color,
          createdAt: new Date(),
          updatedAt: new Date()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `subjects/${subjectId}`));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `subjects/${subjectId}`);
      }
    } else {
      setSubjects(prev => [...prev, newSub]);
    }
    
    setNewSubjectName('');
    setNewSubjectSubtitle('');
    alert(`¡Perfecto! Hemos añadido la asignatura "${newSub.name}" al plan.`);
  };

  // Adding Custom tasks manually or via AI Suggestion
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) return;
    
    // Choose appropriate distribution day based on active form date
    const distDays = ['Hoy (Lun)', 'Mañana (Mar)', 'Miércoles', 'Jueves', 'Viernes'];
    const randomDist = distDays[Math.floor(Math.random() * distDays.length)];

    const newTask: Task = {
      id: Math.random().toString(),
      title: taskFormTitle,
      subject: taskFormSubject,
      dueDate: taskFormDate,
      duration: taskFormDuration,
      workload: taskFormWorkload,
      completed: false,
      notes: aiResult ? `Dividido en: ${aiResult.steps.map(s => s.title).join(', ')}` : 'Nueva entrada académica',
      dayDistribution: randomDist
    };

    if (user) {
      const taskRef = doc(collection(db, 'tasks'));
      const taskId = taskRef.id;
      newTask.id = taskId;
      try {
        setDoc(taskRef, {
          userId: user.uid,
          title: newTask.title,
          date: newTask.dueDate,
          subject: newTask.subject,
          estimatedMinutes: newTask.duration,
          workload: newTask.workload,
          isCompleted: newTask.completed,
          createdAt: new Date(),
          updatedAt: new Date()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}`));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}`);
      }
      
      // Update subject count locally since we do this on snapshot locally
      // Firestore subject doesn't hold count, local map does.
      setSubjects(prev => prev.map(sub => {
        if (sub.name.toLowerCase() === taskFormSubject.toLowerCase()) {
          const nextCount = sub.tasksCount + 1;
          return {
            ...sub,
            tasksCount: nextCount,
            workload: nextCount > 4 ? 'Alta' : nextCount > 1 ? 'Media' : 'Óptima',
            progressVal: Math.min(100, sub.progressVal + 10)
          };
        }
        return sub;
      }));
    } else {
      setTasks(prev => [newTask, ...prev]);
      setSubjects(prev => prev.map(sub => {
        if (sub.name.toLowerCase() === taskFormSubject.toLowerCase()) {
          const nextCount = sub.tasksCount + 1;
          return {
            ...sub,
            tasksCount: nextCount,
            workload: nextCount > 4 ? 'Alta' : nextCount > 1 ? 'Media' : 'Óptima',
            progressVal: Math.min(100, sub.progressVal + 10)
          };
        }
        return sub;
      }));
    }

    // Reset Form
    setTaskFormTitle('');
    setActiveTaskQuery('');
    setAiResult(null);
    alert(`¡Tarea "${newTask.title}" agregada al plan académico!`);
  };

  // Delete Task
  const handleDeleteTask = async (id: string, subjectName: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
      }
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    setSubjects(prev => prev.map(sub => {
      if (sub.name.toLowerCase() === subjectName.toLowerCase()) {
        const nextCount = Math.max(0, sub.tasksCount - 1);
        return {
          ...sub,
          tasksCount: nextCount,
          workload: nextCount > 4 ? 'Alta' : nextCount > 1 ? 'Media' : 'Óptima',
          progressVal: Math.max(0, sub.progressVal - 10)
        };
      }
      return sub;
    }));
  };

  // Task selection checklist trigger
  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', id), {
          isCompleted: newCompleted,
          updatedAt: new Date()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
      }
    }
    
    setTasks(prev => prev.map(t => {
      if (t.id === id) return { ...t, completed: newCompleted };
      return t;
    }));
  };

  // Automated load balancing visualization
  const [reoptimizing, setReoptimizing] = useState(false);
  const triggerReoptimize = () => {
    setReoptimizing(true);
    setTimeout(() => {
      // Re-organize distribution randomly or intelligently for a visual flourish
      const distDays = ['Hoy (Lun)', 'Mañana (Mar)', 'Miércoles', 'Jueves', 'Viernes'];
      setTasks(prev => prev.map(t => ({
        ...t,
        dayDistribution: distDays[Math.floor(Math.random() * distDays.length)]
      })));
      setReoptimizing(false);
    }, 1500);
  };

  // Interactive Calendar quick scheduler
  const [newCalTitle, setNewCalTitle] = useState('');
  const [newCalType, setNewCalType] = useState<'Exámenes' | 'Trabajos' | 'Deberes'>('Deberes');
  const [newCalTime, setNewCalTime] = useState('16:00 PM');
  
  const handleCreateCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalTitle.trim()) return;
    const newEv: CalendarEvent = {
      id: Math.random().toString(),
      day: selectedDay,
      title: newCalTitle,
      time: newCalTime,
      type: newCalType,
      subtitle: 'Sesión planificada por el usuario.'
    };

    if (user) {
      const evRef = doc(collection(db, 'calendarEvents'));
      const evId = evRef.id;
      newEv.id = evId;
      try {
        setDoc(evRef, {
          userId: user.uid,
          title: newEv.title,
          date: newEv.day,
          type: newEv.type,
          time: newEv.time,
          createdAt: new Date(),
          updatedAt: new Date()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `calendarEvents/${evId}`));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `calendarEvents/${evId}`);
      }
    } else {
      setCalendarEvents(prev => [...prev, newEv]);
    }

    setNewCalTitle('');
    alert(`¡Nueva actividad de ${newCalType} registrada para el día ${selectedDay}!`);
  };

  // Calculated Dashboard statistics
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const totalMinutesStudiedToday = 265 + completedCount * 25; // standard base + bonus mins!

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none overflow-x-hidden ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#faf8ff] text-[#191b23]'}`}>
      
      {/* 1. SECCIÓN INICIAR SESIÓN */}
      <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`min-h-screen w-full flex items-center justify-center p-6 ${darkMode ? 'bg-slate-900' : 'bg-[#faf8ff]'}`}
          >
            <div className={`w-full max-w-[480px] rounded-2xl shadow-[0_4px_30px_rgba(0,74,198,0.06)] p-10 flex flex-col items-center text-center gap-8 ${darkMode ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white border border-[#e1e2ed] text-[#191b23]'}`}>
              <header className="flex flex-col items-center gap-4 w-full">
                {/* Simulated Aarikeron Logo Icon */}
                <div className="h-16 w-16 bg-[#2563eb] rounded-2xl flex items-center justify-center text-white text-3xl font-bold tracking-tight shadow-md">
                  A
                </div>
                <div>
                  <h1 className="font-title text-2xl font-bold text-[#2563eb] tracking-tight">Aarikeron Study</h1>
                  <p className={`font-sans text-xs uppercase tracking-widest mt-1 ${darkMode ? 'text-slate-400' : 'text-[#555]'}`}>Academic Flow</p>
                </div>
                <h2 className={`font-title text-3xl font-bold tracking-tight mt-3 ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>
                  Bienvenido a tu éxito académico
                </h2>
              </header>

              {/* Vector/3D Style Academic Study Illustration */}
              <div className={`w-full aspect-[4/3] relative rounded-xl overflow-hidden flex items-center justify-center p-6 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-[#f3f3fe] border-[#e7e7f3]'}`}>
                <div className="text-center flex flex-col items-center gap-3">
                  <div className="relative">
                    <BookOpen className="h-16 w-16 text-[#2563eb] animate-bounce" />
                    <Sparkles className="h-6 w-6 text-amber-500 absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <p className={`font-sans text-sm max-w-[280px] ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>
                    Sincroniza tus tareas, optimiza tiempos con Pomodoro y distribuye tu calendario con IA.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-[#eeefff] text-[#2563eb] rounded-full text-xs font-semibold">Organizador</span>
                    <span className="px-2.5 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-xs font-semibold">Pomodoro</span>
                  </div>
                </div>
              </div>

              {/* Login Actions */}
              <div className="w-full flex flex-col gap-3">
                {authLoading ? (
                  <div className="w-full h-12 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2563eb]"></div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={handleLogin}
                      className={`w-full h-12 font-title font-bold rounded-full transition-all cursor-pointer active:scale-95 duration-300 flex items-center justify-center gap-2 border ${
                        darkMode ? 'bg-white text-slate-900 hover:bg-slate-200 border-transparent' : 'bg-white text-[#191b23] border-[#e1e2ed] hover:bg-slate-50'
                      }`}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Iniciar Sesión con Google
                    </button>
                    <button 
                      onClick={() => setScreen('app')}
                      className={`w-full h-12 font-title font-bold rounded-full transition-all cursor-pointer active:scale-95 duration-300 flex items-center justify-center gap-2 ${
                        darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[#2563eb] text-white hover:bg-[#004ac6]'
                      }`}
                    >
                      Continuar como Invitado
                    </button>
                  </>
                )}
              </div>

              <footer className={`text-xs ${darkMode ? 'text-slate-400' : 'text-[#737686]'}`}>
                Aarikeron Study v1.2 • Tu foco es nuestra misión
              </footer>
            </div>
          </motion.div>
        )}

        {/* 2. MAIN APPLICATION INTERFACE */}
        {screen === 'app' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#faf8ff] text-[#191b23]'}`}
          >
            {/* DESKTOP SIDE BAR */}
            <aside id="sidebar-menu" className={`hidden lg:flex flex-col w-64 fixed left-0 top-0 bottom-0 p-6 z-40 shadow-sm justify-between ${darkMode ? 'bg-slate-800 border-r border-slate-700 text-slate-100' : 'bg-white border-r border-[#e1e2ed] text-[#191b23]'}`}>
              <div>
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 bg-[#2563eb] text-white rounded-xl flex items-center justify-center font-bold font-title text-xl shadow-sm">
                    A
                  </div>
                  <div>
                    <h1 className={`font-title text-lg font-bold tracking-tight leading-none ${darkMode ? 'text-[#3b82f6]' : 'text-[#004ac6]'}`}>Aarikeron</h1>
                    <p className={`font-sans text-[11px] uppercase tracking-wider mt-1 ${darkMode ? 'text-slate-400' : 'text-[#737686]'}`}>Academic Flow</p>
                  </div>
                </div>

                {/* New Task CTA */}
                <button 
                  onClick={() => {
                    setActiveTab('smart_org');
                    const inputElement = document.getElementById('search-estimator-input');
                    if (inputElement) inputElement.focus();
                  }}
                  className="w-full mb-6 bg-[#2563eb] hover:bg-[#004ac6] text-white font-title font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Tarea
                </button>

                {/* Desktop Tabs */}
                <nav className="flex flex-col gap-1.5">
                  <button 
                    id="tab-dashboard-btn"
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'dashboard' 
                        ? (darkMode ? 'text-blue-400 bg-slate-700/80 border-r-4 border-[#2563eb]' : 'text-[#2563eb] bg-[#eeefff] border-r-4 border-[#2563eb]')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-[#434655] hover:bg-[#f3f3fe]')
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    Dashboard
                  </button>

                  <button 
                    id="tab-calendar-btn"
                    onClick={() => setActiveTab('calendar')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'calendar' 
                        ? (darkMode ? 'text-blue-400 bg-slate-700/80 border-r-4 border-[#2563eb]' : 'text-[#2563eb] bg-[#eeefff] border-r-4 border-[#2563eb]')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-[#434655] hover:bg-[#f3f3fe]')
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendario
                  </button>

                  <button 
                    id="tab-subjects-btn"
                    onClick={() => setActiveTab('subjects')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'subjects' 
                        ? (darkMode ? 'text-blue-400 bg-slate-700/80 border-r-4 border-[#2563eb]' : 'text-[#2563eb] bg-[#eeefff] border-r-4 border-[#2563eb]')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-[#434655] hover:bg-[#f3f3fe]')
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    Asignaturas
                  </button>

                  <button 
                    id="tab-smartorg-btn"
                    onClick={() => setActiveTab('smart_org')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'smart_org' 
                        ? (darkMode ? 'text-blue-400 bg-slate-700/80 border-r-4 border-[#2563eb]' : 'text-[#2563eb] bg-[#eeefff] border-r-4 border-[#2563eb]')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-[#434655] hover:bg-[#f3f3fe]')
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Organización IA
                  </button>

                  <button 
                    id="tab-studytime-btn"
                    onClick={() => setActiveTab('study_time')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'study_time' 
                        ? (darkMode ? 'text-blue-400 bg-slate-700/80 border-r-4 border-[#2563eb]' : 'text-[#2563eb] bg-[#eeefff] border-r-4 border-[#2563eb]')
                        : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-[#434655] hover:bg-[#f3f3fe]')
                    }`}
                  >
                    <Timer className="h-4 w-4" />
                    Tiempo de Estudio
                  </button>
                </nav>
              </div>

              {/* Sidebar Footer Utility */}
              <div className="flex flex-col gap-2 pt-4 border-t border-[#e7e7f3]">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                    darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-[#737686] hover:bg-[#f3f3fe]'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Ajustes
                </button>
                <button 
                  onClick={() => setIsHelpOpen(true)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold text-left cursor-pointer transition-colors ${
                    darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-[#737686] hover:bg-[#f3f3fe]'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  Ayuda
                </button>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    setScreen('login');
                  }}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold mt-1 text-left cursor-pointer transition-colors ${
                    darkMode ? 'text-red-400 hover:bg-red-950/30' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </div>
            </aside>

            {/* MAIN CONTAINER WORKSPACE */}
            <div className="flex-1 flex flex-col lg:ml-64 min-w-0 h-full pb-24 lg:pb-12">
              
              {/* TOP HEADER GLOBAL BAR */}
              <header className={`sticky top-0 z-30 py-3.5 px-6 lg:px-10 flex justify-between items-center shadow-sm border-b transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'}`}>
                <div className="flex items-center gap-2">
                  <span className="lg:hidden h-8 w-8 bg-[#2563eb] text-white rounded-lg flex items-center justify-center font-bold font-title">A</span>
                  <span className={`lg:hidden font-title text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-[#004ac6]'}`}>Aarikeron Study</span>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  {/* Dark Mode Switcher */}
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-yellow-400 hover:bg-slate-600' : 'bg-[#f3f3fe] border-[#e1e2ed] text-slate-700 hover:bg-[#eeefff]'
                    }`}
                    title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                  >
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  {/* Streak Container */}
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs lg:text-sm font-bold shadow-sm ${
                    darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-[#f3f3fe] border-[#e1e2ed] text-[#191b23]'
                  }`}>
                    <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                    7 días seguidos
                  </div>

                  {/* Profile Indicator */}
                  <div className="flex items-center gap-2">
                    <div 
                      onClick={() => setIsSettingsOpen(true)}
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer border transition-all ${
                        darkMode ? 'bg-slate-700 hover:bg-slate-600 text-blue-400 border-slate-600' : 'bg-indigo-100 text-[#004ac6] border-[#2563eb]/20 hover:bg-[#eeefff]'
                      }`}
                    >
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
              </header>

              {/* CONTAINER SCROLL CONTENT CANVAS */}
              <main id="main-content-canvas" className="flex-1 p-6 lg:p-10 max-w-[1240px] mx-auto w-full">
                
                {/* A. VIEW: DASHBOARD (PANEL PRINCIPAL) */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-fadeIn">
                    <header>
                      <h2 className="font-title text-3xl font-bold text-[#191b23] mb-1">¡Hola, {userName}!</h2>
                      <p className="font-sans text-[#434655]">Tienes {pendingCount} tareas pendientes para hoy. Sigamos con el buen ritmo.</p>
                    </header>

                    {/* Quick Access Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div 
                        onClick={() => setActiveTab('calendar')}
                        className="bento-card p-6 p-6 h-40 flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="h-12 w-12 bg-blue-100 text-[#2563eb] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-title text-xl font-bold text-[#191b23]">Calendario</h3>
                          <p className="text-xs text-[#737686] mt-1">Mira tus exámenes y entregas</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setActiveTab('subjects')}
                        className="bento-card p-6 h-40 flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="h-12 w-12 bg-purple-100 text-[#4648d4] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-title text-xl font-bold text-[#191b23]">Asignaturas</h3>
                          <p className="text-xs text-[#737686] mt-1">Organiza materias y carga de estudio</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setActiveTab('smart_org')}
                        className="bento-card p-6 h-40 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-[#ffdbcd]/30 rounded-bl-full -z-10"></div>
                        <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-title text-xl font-bold text-[#191b23]">Distribuidor Inteligente</h3>
                          <p className="text-xs text-[#737686] mt-1">IA estima y asigna tu cronograma semanal</p>
                        </div>
                      </div>
                    </section>

                    {/* Today's Checklist & Quick Overview */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Interactive Study Tasks Checklist */}
                      <div className="lg:col-span-8 bg-white bento-card p-6">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-title text-xl font-bold text-[#191b23]">Resumen de hoy</h3>
                          <span className="text-xs font-semibold bg-[#eeefff] text-[#2563eb] px-3 py-1 rounded-full">{completedCount}/{tasks.length} Completado</span>
                        </div>

                        {tasks.length === 0 ? (
                          <div className="p-8 text-center text-[#737686]">
                            <CheckCircle className="h-12 w-12 text-[#2563eb]/20 mx-auto mb-3" />
                            Sin tareas programadas para hoy. ¡Disfruta tu día!
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {tasks.map(t => (
                              <div 
                                key={t.id}
                                className={`p-4 border border-[#e1e2ed] rounded-xl flex items-center gap-4 transition-all hover:bg-[#faf8ff] group ${
                                  t.completed ? 'opacity-65 bg-gray-50 border-gray-200' : ''
                                }`}
                              >
                                <button 
                                  onClick={() => handleToggleTask(t.id)}
                                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    t.completed 
                                      ? 'border-green-600 bg-green-600 text-white' 
                                      : 'border-[#737686] group-hover:border-[#2563eb]'
                                  }`}
                                >
                                  {t.completed && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
                                </button>
                                
                                <div className="flex-1">
                                  <h4 className={`text-sm font-semibold tracking-tight ${t.completed ? 'line-through text-gray-400' : 'text-[#191b23]'}`}>
                                    {t.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-[#2563eb] px-1.5 py-0.5 bg-[#eeefff] rounded">
                                      {t.subject}
                                    </span>
                                    {t.notes && (
                                      <span className="text-xs text-[#737686] line-clamp-1">{t.notes}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Workload Indicator Pill */}
                                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                    t.workload === 'Alta' 
                                      ? 'bg-red-50 text-red-600' 
                                      : t.workload === 'Media' 
                                      ? 'bg-amber-50 text-amber-600' 
                                      : 'bg-green-50 text-green-600'
                                  }`}>
                                    {t.workload}
                                  </span>

                                  {/* Delete Task */}
                                  <button 
                                    onClick={() => handleDeleteTask(t.id, t.subject)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                    title="Eliminar tarea"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Interactive stats dashboard bar */}
                      <div className="lg:col-span-4 space-y-6">
                        {/* Pomodoro status callout */}
                        <div className="bg-[#eeefff] bento-card p-6 border-none text-[#191b23] relative overflow-hidden">
                          <h4 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider mb-2">Reloj Pomodoro</h4>
                          <p className="font-title text-3xl font-bold tracking-tight mb-2">{formattedTimeLeft()}</p>
                          <p className="text-xs text-[#434655] mb-4">
                            {timerActive ? 'Estudio enfocado en marcha' : 'Timer pausado actualmente'}
                          </p>
                          <button 
                            onClick={() => setActiveTab('study_time')}
                            className="bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Ir al Timer
                          </button>
                        </div>

                        {/* Focus stats summary */}
                        <div className="bg-white bento-card p-6 space-y-4">
                          <h3 className="font-title text-md font-bold text-[#191b23]">Progreso de Hoy</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-[#434655]">
                              <span>Porcentaje de éxito</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-[#e7e7f3] rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-[#f3f3fe] p-3 rounded-lg border border-[#e1e2ed]">
                              <p className="text-xs font-bold uppercase text-[#737686] tracking-wider">Estudiado</p>
                              <p className="font-title text-xl font-bold text-[#004ac6] mt-0.5">{totalMinutesStudiedToday}m</p>
                            </div>
                            <div className="bg-[#f3f3fe] p-3 rounded-lg border border-[#e1e2ed]">
                              <p className="text-xs font-bold uppercase text-[#737686] tracking-wider font-sans">Tareas Ok</p>
                              <p className="font-title text-xl font-bold text-[#004ac6] mt-0.5">{completedCount}</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </section>
                  </div>
                )}

                {/* B. VIEW: CALENDARIO (CALENDAR MATERIAS & ENTREGAS) */}
                {activeTab === 'calendar' && (
                  <div className="space-y-8 animate-fadeIn">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="font-title text-3xl font-bold text-[#191b23] mb-1">Mi Calendario</h2>
                        <p className="font-sans text-[#434655]">Gestiona tus tiempos y maximiza tu enfoque.</p>
                      </div>

                      {/* Calendar Legenda/Legends */}
                      <div className="flex flex-wrap gap-4 bg-white p-3 rounded-xl border border-[#e1e2ed]" id="calendar-types-legend">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 block"></span>
                          <span className="text-xs font-semibold text-[#434655]">Exámenes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4648d4] block"></span>
                          <span className="text-xs font-semibold text-[#434655]">Trabajos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] block"></span>
                          <span className="text-xs font-semibold text-[#434655]">Deberes</span>
                        </div>
                      </div>
                    </header>

                    {/* Desktop Bento Calendar Board Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Interactive Calendar Blocks Grid */}
                      <div className="lg:col-span-8 bg-white bento-card p-6">
                        <div className="flex justify-between items-center mb-6">
                          <button className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <h3 className="font-title text-lg font-bold text-[#191b23]">Octubre 2023</h3>
                          <button className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Days of Week Header */}
                        <div className="grid grid-cols-7 text-center text-xs font-bold text-[#737686] mb-3">
                          <span>Lun</span>
                          <span>Mar</span>
                          <span>Mié</span>
                          <span>Jue</span>
                          <span>Vie</span>
                          <span>Sáb</span>
                          <span>Dom</span>
                        </div>

                        {/* October Days Blocks */}
                        <div className="grid grid-cols-7 gap-2.5">
                          {/* Filler offsets */}
                          {[25, 26, 27, 28, 29, 30].map(day => (
                            <div key={`fill-${day}`} className="aspect-square opacity-20 pointer-events-none p-2 border border-dashed border-gray-200 rounded-lg text-xs">
                              {day}
                            </div>
                          ))}

                          {/* Days of October */}
                          {Array.from({ length: 21 }, (_, index) => {
                            const dayNum = index + 1;
                            const hasEvents = calendarEvents.filter(ev => ev.day === dayNum);
                            const isSelected = selectedDay === dayNum;

                            return (
                              <div 
                                key={`day-${dayNum}`}
                                onClick={() => setSelectedDay(dayNum)}
                                className={`aspect-square p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-[#2563eb] text-[#faf8ff] border-[#2563eb] shadow-md shadow-blue-500/20' 
                                    : 'bg-[#f3f3fe] border-[#e1e2ed] hover:bg-[#e7e7f3]'
                                }`}
                              >
                                <span className="text-xs font-bold">{dayNum}</span>
                                
                                {/* Event category dots */}
                                <div className="flex gap-1 overflow-hidden h-1.5 justify-center">
                                  {hasEvents.map(ev => (
                                    <span 
                                      key={ev.id} 
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        isSelected 
                                          ? 'bg-white' 
                                          : ev.type === 'Exámenes' 
                                          ? 'bg-red-600' 
                                          : ev.type === 'Trabajos' 
                                          ? 'bg-[#4648d4]' 
                                          : 'bg-[#2563eb]'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Detailed Session Panel & Event creation form */}
                      <div className="lg:col-span-4 space-y-6">
                        
                        {/* Day Activities List */}
                        <div className="bg-white bento-card p-6">
                          <header className="border-b border-[#e1e2ed] pb-4 mb-4">
                            <h3 className="font-title text-lg font-bold text-[#191b23]">{selectedDay} de Octubre</h3>
                            <p className="text-xs text-[#737686] mt-0.5">
                              {calendarEvents.filter(e => e.day === selectedDay).length} tareas y eventos para este día
                            </p>
                          </header>

                          {calendarEvents.filter(e => e.day === selectedDay).length === 0 ? (
                            <div className="p-8 text-center text-xs text-[#737686]">
                              No hay exámenes ni entregas marcados. ¡Ideal para repasar libremente!
                            </div>
                          ) : (
                            <div className="divide-y divide-[#e7e7f3] space-y-3.5">
                              {calendarEvents.filter(e => e.day === selectedDay).map(ev => (
                                <div key={ev.id} className="pt-3.5 flex items-start gap-3">
                                  <span className={`w-1.5 h-11 rounded-full shrink-0 ${
                                    ev.type === 'Exámenes' ? 'bg-red-600' : ev.type === 'Trabajos' ? 'bg-[#4648d4]' : 'bg-[#2563eb]'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <h4 className="text-xs font-bold text-[#191b23] truncate">{ev.title}</h4>
                                      <span className="text-[10px] text-[#737686] whitespace-nowrap">{ev.time}</span>
                                    </div>
                                    <p className="text-xs text-[#737686] mt-1 line-clamp-2">{ev.subtitle}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Spaced Repetition Study Box */}
                        <div className="bg-[#eeefff] bento-card p-6 border-none relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-300 opacity-20 rounded-bl-full"></div>
                          <div className="flex items-center gap-1.5 mb-3 text-[#2563eb] font-bold text-xs uppercase tracking-wider">
                            <Clock className="h-4 w-4" />
                            Repetición Espaciada
                          </div>
                          <h4 className="text-xs text-[#434655] mb-1">Tema sugerido para estudiar hoy:</h4>
                          <p className="font-title text-xl font-bold text-[#004ac6] mb-4">Biología Celular</p>
                          <button 
                            onClick={() => {
                              alert("¡Tema 'Biología Celular' marcado como repasado! El algoritmo lo volverá a proponer en 7 días.");
                            }}
                            className="w-full bg-[#2563eb] text-white hover:bg-[#004ac6] text-xs font-bold py-3 rounded-xl transition-all shadow-sm"
                          >
                            Marcar como Repasado
                          </button>
                        </div>

                        {/* Quick Event Addition Form */}
                        <div className="bg-white bento-card p-6">
                          <h3 className="font-title text-sm font-bold text-[#191b23] mb-4">Añadir aviso al día</h3>
                          <form onSubmit={handleCreateCalendarEvent} className="space-y-3">
                            <input 
                              type="text" 
                              required
                              placeholder="Ej. Examen de Historia"
                              value={newCalTitle}
                              onChange={(e) => setNewCalTitle(e.target.value)}
                              className="w-full text-xs p-2.5 border border-[#c3c6d7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              {['Exámenes', 'Trabajos', 'Deberes'].map(cat => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setNewCalType(cat as any)}
                                  className={`p-1.5 text-[10px] font-bold border rounded-lg ${
                                    newCalType === cat 
                                      ? 'bg-[#2563eb] text-white border-[#2563eb]' 
                                      : 'border-[#c3c6d7] hover:bg-[#f3f3fe]'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                            <button 
                              type="submit"
                              className="w-full py-2 bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              Programar
                            </button>
                          </form>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* C. VIEW: ASIGNATURAS (CATEGORIES & LOADS SUMMARY) */}

                {activeTab === 'subjects' && (
                  <div className="space-y-8 animate-fadeIn">
                    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div>
                        <h2 className={`font-title text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>Asignaturas</h2>
                        <p className={`font-sans ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>Gestiona tu carga de trabajo y mantén el flujo académico de forma manual.</p>
                      </div>

                      <div className="flex gap-4">
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block"></span> Óptimo (0-1)
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span> Media (2-3)
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 block"></span> Alta (4+)
                        </div>
                      </div>
                    </header>

                    {/* Subject Bento/Grid Boxes */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subjects.map(sub => {
                        const itemsLength = tasks.filter(t => t.subject === sub.name).length;
                        return (
                          <div 
                            key={sub.id}
                            className={`bento-card p-6 flex flex-col justify-between h-48 hover:shadow-lg transition-all border ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`h-11 w-11 rounded-lg flex items-center justify-center font-bold text-white ${sub.color}`}>
                                {sub.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className={`font-title text-2xl font-bold ${
                                sub.workload === 'Alta' ? 'text-red-500' : sub.workload === 'Media' ? 'text-amber-500' : 'text-[#2563eb]'
                              }`}>
                                {itemsLength}
                              </span>
                            </div>

                            <div className="mt-4">
                              <h3 className={`font-title text-lg font-bold ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>{sub.name}</h3>
                              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>{sub.subtitle}</p>
                            </div>

                            <div className="mt-4">
                              <div className={`flex justify-between text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>
                                <span>Carga de Tareas</span>
                                <span className={
                                  sub.workload === 'Alta' ? 'text-red-500' : sub.workload === 'Media' ? 'text-amber-500' : 'text-[#2563eb]'
                                }>{sub.workload}</span>
                              </div>
                              <div className={`w-full rounded-full h-1.5 ${darkMode ? 'bg-slate-700' : 'bg-[#e7e7f3]'}`}>
                                <span 
                                  className={`h-1.5 block rounded-full ${
                                    sub.workload === 'Alta' ? 'bg-red-500' : sub.workload === 'Media' ? 'bg-amber-500' : 'bg-[#2563eb]'
                                  }`} 
                                  style={{ width: `${itemsLength * 30 || 15}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </section>

                    {/* Add Custom Subject Section */}
                    <section className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white shadow-xl' : 'bg-white border-[#e1e2ed] text-[#191b23] shadow-sm'}`}>
                      <h3 className="font-title text-lg font-bold mb-2 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-[#2563eb]" />
                        Crear Asignatura Personalizada (A Mano)
                      </h3>
                      <p className={`text-xs mb-4 ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>
                        ¿Tienes una nueva materia o taller extracurricular? Añádela de inmediato para organizar tus deberes y planificarlos usando IA.
                      </p>

                      <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className={`text-xs block font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Nombre de la Asignatura</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Filosofía, Tecnología..."
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            className={`w-full text-xs p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#2563eb] h-[42px] ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`text-xs block font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Subtítulo / Curso</label>
                          <input 
                            type="text" 
                            placeholder="Ej. Curso de Ética Social"
                            value={newSubjectSubtitle}
                            onChange={(e) => setNewSubjectSubtitle(e.target.value)}
                            className={`w-full text-xs p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#2563eb] h-[42px] ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="flex gap-4 items-center">
                          <div className="flex-1">
                            <label className={`text-xs block font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Color Identificativo</label>
                            <select
                              value={newSubjectColor}
                              onChange={(e) => setNewSubjectColor(e.target.value)}
                              className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#2563eb] h-[42px] ${
                                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                              }`}
                            >
                              <option value="bg-indigo-500">Indigo</option>
                              <option value="bg-emerald-500">Verde Esmeralda</option>
                              <option value="bg-pink-500">Rosa Plástica</option>
                              <option value="bg-teal-500">Turquesa</option>
                              <option value="bg-purple-500">Púrpura</option>
                              <option value="bg-orange-500">Naranja</option>
                              <option value="bg-rose-500">Rojo Rosa</option>
                            </select>
                          </div>

                          <button 
                            type="submit"
                            className="bg-[#2563eb] hover:bg-[#004ac6] text-white font-title font-bold text-xs py-3 px-6 rounded-xl transition-all h-[42px] cursor-pointer"
                          >
                            Añadir materia
                          </button>
                        </div>
                      </form>
                    </section>

                  </div>
                )}

                {/* D. VIEW: SMART ORG (PLANIFICACIÓN INTELIGENTE) */}
                {activeTab === 'smart_org' && (
                  <div className="space-y-8 animate-fadeIn">
                    <header>
                      <h2 className={`font-title text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>Organización Inteligente</h2>
                      <p className={`font-sans ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>Genera, estima y asigna tu cronograma semanal de forma automatizada por IA.</p>
                    </header>

                    {/* Inner Tabs for Estimator vs. ChatGPT Chatbot */}
                    <div className={`flex flex-wrap gap-2 border-b pb-2 ${darkMode ? 'border-slate-700' : 'border-[#e1e2ed]'}`}>
                      <button 
                        onClick={() => setSmartOrgSubTab('estimator')}
                        className={`px-4.5 py-2 text-xs lg:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                          smartOrgSubTab === 'estimator' 
                            ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' 
                            : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-[#737686] hover:bg-[#eeefff]'
                        }`}
                      >
                        Planificador & Distribuidor Semanal
                      </button>
                      <button 
                        onClick={() => setSmartOrgSubTab('chatgpt')}
                        className={`px-4.5 py-2 text-xs lg:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          smartOrgSubTab === 'chatgpt' 
                            ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/10' 
                            : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-[#737686] hover:bg-[#eeefff]'
                        }`}
                      >
                        <Sparkles className="h-4 w-4" />
                        Tutor Directo IA Aarikeron (Modo ChatGPT)
                      </button>
                    </div>

                    {smartOrgSubTab === 'estimator' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Block: Search Bar Estimator and Add Form */}
                        <section className="lg:col-span-4 space-y-6">
                          {/* Task AI Suggester */}
                          <div className={`bento-card p-6 border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'}`}>
                            <h3 className="font-title text-md font-bold mb-3 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-[#2563eb]" />
                              Estimación IA de Tiempo de Estudio
                            </h3>
                            <div className="space-y-3">
                              <textarea 
                                id="search-estimator-input"
                                placeholder="Ej. Tarea compleja de plástica avanzada, dibujo técnico o examen de PIAR tema 3..."
                                rows={3}
                                value={activeTaskQuery}
                                onChange={(e) => setActiveTaskQuery(e.target.value)}
                                className={`w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                                  darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                                }`}
                              />
                              <button 
                                type="button"
                                onClick={handleAIEstimate}
                                disabled={aiEstimating || !activeTaskQuery.trim()}
                                className="w-full bg-[#2563eb] text-[#faf8ff] hover:bg-blue-700 py-2.5 rounded-lg text-xs font-title font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                              >
                                {aiEstimating ? 'Calculando con IA...' : 'Generar Estimación'}
                              </button>
                            </div>

                            {/* AI Response Card Visualizer */}
                            {aiResult && (
                              <div className={`p-4 rounded-xl border mt-4 space-y-3 ${
                                darkMode ? 'bg-indigo-950/40 border-indigo-500/20' : 'bg-[#eeefff] border-[#2563eb]/20'
                              }`}>
                                <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-blue-300' : 'text-[#004ac6]'}`}>Resultados de IA</h4>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Duración:</p>
                                    <p className="font-bold">{aiResult.estimatedMinutes} Mins</p>
                                  </div>
                                  <div>
                                    <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Carga:</p>
                                    <p className="font-bold">{aiResult.workloadRating}</p>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <p className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Sugerencias de estudio paso a paso:</p>
                                  {aiResult.steps?.map((step, idx) => (
                                    <div key={idx} className={`flex justify-between text-xs ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>
                                      <span>• {step.title}</span>
                                      <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{step.minutes}m</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Add Task Manually Form */}
                          <div className={`bento-card p-6 border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'}`}>
                            <h3 className="font-title text-md font-bold mb-4 flex items-center gap-2">
                              <Plus className="h-4 w-4 text-[#2563eb]" />
                              Detalles de la Tarea
                            </h3>
                            <form onSubmit={handleAddTask} className="space-y-4">
                              <div>
                                <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Título</label>
                                <input 
                                  type="text"
                                  required
                                  value={taskFormTitle}
                                  onChange={(e) => setTaskFormTitle(e.target.value)}
                                  className={`w-full text-xs p-2.5 border rounded-lg ${
                                    darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                                  }`}
                                  placeholder="Ej. Dibujar plano isométrica"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Asignatura</label>
                                  <select 
                                    value={taskFormSubject}
                                    onChange={(e) => setTaskFormSubject(e.target.value)}
                                    className={`w-full text-xs p-2 border rounded-lg ${
                                      darkMode ? 'bg-slate-700 border-slate-600 text-white animate-fadeIn' : 'bg-white border-[#c3c6d7] text-slate-800'
                                    }`}
                                  >
                                    {subjects.map(s => (
                                      <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Carga</label>
                                  <select 
                                    value={taskFormWorkload}
                                    onChange={(e: any) => setTaskFormWorkload(e.target.value)}
                                    className={`w-full text-xs p-2 border rounded-lg ${
                                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                                    }`}
                                  >
                                    <option value="Óptima">Óptima</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Duración (Mins)</label>
                                  <input 
                                    type="number"
                                    value={taskFormDuration}
                                    onChange={(e) => setTaskFormDuration(Number(e.target.value))}
                                    className={`w-full text-xs p-2 border rounded-lg ${
                                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                                    }`}
                                  />
                                </div>

                                <div>
                                  <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Fecha límite</label>
                                  <input 
                                    type="date"
                                    value={taskFormDate}
                                    onChange={(e) => setTaskFormDate(e.target.value)}
                                    className={`w-full text-xs p-1.5 border rounded-lg ${
                                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                                    }`}
                                  />
                                </div>
                              </div>

                              <button 
                                type="submit"
                                className="w-full py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all mt-2 cursor-pointer"
                              >
                                Guardar al Plan Semanal
                              </button>
                            </form>
                          </div>

                          {/* Extra Block List */}
                          <div className={`bento-card p-6 border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'}`}>
                            <h3 className="font-title text-md font-bold mb-4 flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-[#2563eb]" />
                              Bloques Extraescolares
                            </h3>
                            <div className="space-y-3">
                              {extracurriculars.map(ex => (
                                <div key={ex.id} className={`p-3 border rounded-lg flex justify-between items-center text-xs ${
                                  darkMode ? 'bg-slate-700/50 border-slate-600 text-slate-200' : 'bg-[#f3f3fe] border-[#e1e2ed] text-[#191b23]'
                                }`}>
                                  <div>
                                    <p className="font-bold">{ex.title}</p>
                                    <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ex.days} • {ex.hours}</p>
                                  </div>
                                  <span className={`h-7 w-7 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-600' : 'bg-white'}`}>
                                    {ex.type === 'sports' ? <Activity className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>

                        {/* Right Block: Distribution Grid Map */}
                        <section className="lg:col-span-8 space-y-6">
                          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h3 className={`font-title text-lg font-bold ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>Distribución de Tareas por Día</h3>
                              <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>IA y algoritmos para equilibrar tu tiempo libre</p>
                            </div>
                            
                            <button 
                              onClick={triggerReoptimize}
                              disabled={reoptimizing}
                              className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all cursor-pointer disabled:opacity-40 ${
                                darkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-600' : 'bg-[#faf8ff] hover:bg-[#eeefff] text-[#2563eb] border-[#2563eb]/20'
                              }`}
                            >
                              {reoptimizing ? 'Sincronizando...' : 'Reoptimizar Plan'}
                            </button>
                          </header>

                          {/* Schedule Columns */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {['Hoy (Lun)', 'Mañana (Mar)', 'Miércoles'].map((daySlug) => {
                              const dayTasks = tasks.filter(t => t.dayDistribution === daySlug);
                              const occupiedMinutes = dayTasks.reduce((sum, t) => sum + t.duration, 0);
                              const totalFreeMins = 240; // 4 hours standard study slot
                              const displayOccupiedHours = (occupiedMinutes / 60).toFixed(1);
                              const occupiedPercent = Math.min(100, Math.round((occupiedMinutes / totalFreeMins) * 100));

                              return (
                                <div key={daySlug} className={`bento-card p-4 relative overflow-hidden flex flex-col justify-between h-80 border ${
                                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                                }`}>
                                  {/* Visual highlight Accent */}
                                  <div className="absolute top-0 left-0 w-full h-1 bg-[#2563eb]"></div>
                                  
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="font-title text-sm font-bold">{daySlug}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-[#eeefff] text-[#2563eb]'
                                    }`}>
                                      {displayOccupiedHours}h ocupado
                                    </span>
                                  </div>

                                  {/* Task Stack inside Day Slot */}
                                  <div className="flex-1 overflow-y-auto space-y-2 py-2">
                                    {dayTasks.length === 0 ? (
                                      <div className={`text-center py-10 text-xs border border-dashed rounded-lg ${
                                        darkMode ? 'text-slate-400 border-slate-700' : 'text-gray-400 border-gray-100'
                                      }`}>
                                        Arrastra o asigna tareas aquí
                                      </div>
                                    ) : (
                                      dayTasks.map(task => (
                                        <div 
                                          key={task.id} 
                                          className={`p-2 border rounded-lg text-xs hover:shadow-sm transition-all ${
                                            darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-[#f3f3fe] border-[#e1e2ed] text-[#191b23]'
                                          }`}
                                          title={task.notes}
                                        >
                                          <div className="flex justify-between font-bold">
                                            <span className="truncate">{task.title}</span>
                                            <span className={`text-[10px] font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-500'}`}>{task.duration}m</span>
                                          </div>
                                          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                                            <span>{task.subject}</span>
                                            <span>{task.workload}</span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  {/* Busy metrics summary bottom */}
                                  <div className={`pt-2 border-t mt-auto ${darkMode ? 'border-slate-700' : 'border-[#e1e2ed]'}`}>
                                    <div className={`w-full rounded-full h-1.5 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-[#f3f3fe]'}`}>
                                      <div 
                                        className="bg-[#2563eb] h-1.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${occupiedPercent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </div>
                    ) : (
                      /* CHATGPT-STYLE INTERACTIVE CHAT GRADIENT WINDOW */
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left: Chat Area */}
                        <section className="lg:col-span-8 flex flex-col h-[520px] justify-between">
                          <div className={`flex-1 overflow-y-auto p-4 space-y-4 rounded-t-2xl border-t border-l border-r ${
                            darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-[#e1e2ed]'
                          }`}>
                            {chatMessages.map((msg, idx) => (
                              <div 
                                key={idx} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                              >
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                                  msg.role === 'user'
                                    ? 'bg-[#2563eb] text-white rounded-br-none'
                                    : darkMode 
                                      ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
                                      : 'bg-white border border-[#e1e2ed] text-slate-800 rounded-bl-none'
                                }`}>
                                  <p className="font-bold text-[10px] uppercase tracking-wider mb-1 opacity-70">
                                    {msg.role === 'user' ? userName : 'Aarikeron AI Tutor'}
                                  </p>
                                  <p className="whitespace-pre-line">{msg.text}</p>
                                </div>
                              </div>
                            ))}

                            {chatLoading && (
                              <div className="flex justify-start animate-pulse">
                                <div className={`max-w-xs rounded-2xl rounded-bl-none px-4 py-3 text-xs border ${
                                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-500'
                                }`}>
                                  <p className="font-bold text-[10px] uppercase tracking-wider mb-1 opacity-70">Aarikeron AI</p>
                                  <div className="flex items-center gap-1.5 py-1">
                                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce delay-100"></span>
                                    <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce delay-200"></span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Prompts Bar */}
                          <div className={`p-2.5 border-l border-r flex flex-wrap gap-2 text-[10.5px] ${
                            darkMode ? 'bg-slate-850 border-slate-700' : 'bg-[#eeefff]/40 border-[#e1e2ed]'
                          }`}>
                            <span className={`font-semibold self-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Consejos rápidos:</span>
                            {[
                              `¿Cómo organizo un examen de Plástica?`,
                              `Dame tips para el Proyecto PIAR`,
                              `Consejo para estudiar Religión de forma amena`,
                              `Estructura una tarde rítmica de Música`
                            ].map((prompt, pidx) => (
                              <button
                                key={pidx}
                                onClick={() => setChatInput(prompt)}
                                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  darkMode 
                                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                                    : 'bg-white border-gray-200 text-[#004ac6] hover:bg-[#eeefff]'
                                }`}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>

                          {/* Chat Form Lower bounds input */}
                          <form 
                            onSubmit={handleSendChatMessage}
                            className={`p-3 border rounded-b-2xl flex gap-2 ${
                              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#e1e2ed]'
                            }`}
                          >
                            <input 
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder={`Escribe a tu tutor Aarikeron aquí, crack...`}
                              className={`flex-1 text-xs px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-[#c3c6d7] text-slate-800'
                              }`}
                            />
                            
                            <button 
                              type="button"
                              onClick={handleClearChat}
                              className={`h-10 w-10 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                darkMode ? 'bg-slate-700 border-slate-600 text-slate-300 hover:text-red-400' : 'text-gray-400 hover:text-red-500 border-gray-200'
                              }`}
                              title="Reiniciar chat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            <button 
                              type="submit"
                              disabled={!chatInput.trim() || chatLoading}
                              className="px-4.5 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-40"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Enviar</span>
                            </button>
                          </form>
                        </section>

                        {/* Right: Detailed Gemini Key Setup Manual Panel */}
                        <section className="lg:col-span-4 space-y-6">
                          <div className={`bento-card p-6 border ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                          }`}>
                            <div className="flex items-center gap-2 mb-3 text-[#2563eb]">
                              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                              <h3 className="font-title text-sm font-bold">Consigue tu Gemini API Key</h3>
                            </div>
                            
                            <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>
                              Para activar las respuestas inteligentes por IA y recibir recomendaciones adaptadas en tiempo real sin simulaciones offline, sigue estos sencillos pasos:
                            </p>

                            <ol className="space-y-4 text-xs">
                              <li className="flex gap-2.5">
                                <span className="h-4.5 w-4.5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                                <div>
                                  <p className="font-bold">Ir a Google AI Studio</p>
                                  <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Entra en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 underline font-semibold">aistudio.google.com</a> e inicia sesión con tu cuenta de Google.</p>
                                </div>
                              </li>
                              
                              <li className="flex gap-2.5">
                                <span className="h-4.5 w-4.5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                                <div>
                                  <p className="font-bold">Crear API Key básica</p>
                                  <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Pulsa en el menú en <strong>&ldquo;Get API Key&rdquo;</strong> y crea un nuevo token (es totalmente gratis para desarrollo).</p>
                                </div>
                              </li>

                              <li className="flex gap-2.5">
                                <span className="h-4.5 w-4.5 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                                <div>
                                  <p className="font-bold">Configurar en este Workspace</p>
                                  <p className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Ve al panel superior izquierdo, abre el menú de tu bot y entra en <strong>Ajustes &gt; Secrets</strong>. Añade una variable llamada <strong>GEMINI_API_KEY</strong> con la clave que copiaste.</p>
                                </div>
                              </li>
                            </ol>

                            <div className={`mt-5 p-3 rounded-xl border flex gap-2 items-start text-[11px] leading-relaxed ${
                              darkMode ? 'bg-amber-950/20 border-amber-500/10 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <p>
                                <strong>Nota crack:</strong> Si no la configuras, no te preocupes. He integrado un <strong>Modo Simulado por IA</strong> por defecto para que puedas probar la experiencia académica. ¡Estudia duro, máquina!
                              </p>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                )}

                {/* E. VIEW: FOCUS TIMER (POMODORO) */}
                {activeTab === 'study_time' && (
                  <div className="space-y-8 animate-fadeIn">
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <h2 className={`font-title text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>Tiempo de Estudio</h2>
                        <p className={`font-sans ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>Optimiza tus sesiones de estudio y mantén el flujo académico.</p>
                      </div>

                      {/* Top focus analytics */}
                      <div className={`bento-card p-4 flex items-center gap-6 border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#eeefff] border-transparent text-[#191b23]'
                      }`}>
                        <div>
                          <p className={`text-[10px] uppercase font-bold tracking-wide ${darkMode ? 'text-blue-300' : 'text-[#2563eb]'}`}>Hoy estudiado</p>
                          <p className={`font-title text-2xl font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-[#004ac6]'}`}>{totalMinutesStudiedToday}m</p>
                        </div>
                        <div className={`h-8 w-px ${darkMode ? 'bg-slate-700' : 'bg-blue-300'}`}></div>
                        <div>
                          <p className={`text-[10px] uppercase font-bold tracking-wide ${darkMode ? 'text-blue-300' : 'text-[#2563eb]'}`}>Sesiones Completas</p>
                          <p className={`font-title text-2xl font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-[#004ac6]'}`}>6</p>
                        </div>
                      </div>
                    </header>

                    {/* Timer + Alarms Screen panels */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Pomodoro clock circular visualization */}
                      <section className={`bento-card p-8 flex flex-col items-center justify-center min-h-[480px] border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                      }`}>
                        {/* Session Switchers */}
                        <div className={`flex gap-2 mb-8 p-1.5 rounded-full border transition-all ${
                          darkMode ? 'bg-slate-705 border-slate-600' : 'bg-[#f3f3fe] border-[#e1e2ed]'
                        }`}>
                          <button 
                            onClick={() => handleSetTimerMode('study')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              timerMode === 'study' 
                                ? 'bg-[#2563eb] text-white shadow-md' 
                                : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-[#434655] hover:bg-gray-100'
                            }`}
                          >
                            Estudio
                          </button>
                          <button 
                            onClick={() => handleSetTimerMode('short')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              timerMode === 'short' 
                                ? 'bg-[#2563eb] text-white shadow-md' 
                                : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-[#434655] hover:bg-gray-100'
                            }`}
                          >
                            Descanso Corto
                          </button>
                          <button 
                            onClick={() => handleSetTimerMode('long')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              timerMode === 'long' 
                                ? 'bg-[#2563eb] text-white shadow-md' 
                                : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-[#434655] hover:bg-gray-100'
                            }`}
                          >
                            Descanso Largo
                          </button>
                        </div>

                        {/* Circular Timer Ring */}
                        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="50%" cy="50%" fill="transparent" r="44%" stroke={darkMode ? '#334155' : '#f3f3fe'} strokeWidth="8" />
                            <circle 
                              className="timer-circle" 
                              cx="50%" 
                              cy="50%" 
                              fill="transparent" 
                              r="44%" 
                              stroke="#2563eb" 
                              strokeWidth="11" 
                              strokeDasharray="880" 
                              strokeDashoffset={progressOffset()} 
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`font-title text-4xl md:text-6xl font-black tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-[#191b23]'}`}>
                              {formattedTimeLeft()}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-widest mt-2 ${darkMode ? 'text-blue-300 font-bold' : 'text-[#2563eb]'}`}>
                              {timerActive ? 'Sesión Activa' : 'Foco Dormido'}
                            </span>
                          </div>
                        </div>

                        {/* Control actions */}
                        <div className="flex gap-4 mt-8">
                          <button 
                            onClick={handleResetTimer}
                            className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'border-[#c3c6d7] hover:bg-[#f3f3fe] text-[#434655]'
                            }`}
                            title="Reiniciar"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                          
                          {timerActive ? (
                            <button 
                              onClick={handlePauseTimer}
                              className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-red-500/20"
                              title="Pausar"
                            >
                              <Pause className="h-7 w-7" />
                            </button>
                          ) : (
                            <button 
                              onClick={handleStartTimer}
                              className="h-16 w-16 rounded-full bg-[#2563eb] text-white flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
                              title="Iniciar foco"
                            >
                              <Play className="h-7 w-7 ml-1" />
                            </button>
                          )}
                        </div>
                      </section>

                      {/* Right: Alarm Side panels and Motivator quotes block */}
                      <section className="lg:col-span-5 space-y-6">
                        
                        {/* Alarm switch checklist panel */}
                        <div className={`bento-card p-6 border transition-all ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                        }`}>
                          <h3 className="font-title text-md font-bold mb-4 flex items-center gap-2">
                            <Bell className="h-4.5 w-4.5 text-[#2563eb]" />
                            Avisos y Alarmas
                          </h3>
                          <div className="space-y-3.5">
                            
                            {/* Alarm Box 1 */}
                            <div className={`flex items-center justify-between p-3.5 border rounded-xl text-xs transition-colors ${
                              darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-[#f3f3fe] border-[#e1e2ed]'
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-600' : 'bg-white'}`}>
                                  <BookOpen className="h-4 w-4 text-[#2563eb]" />
                                </span>
                                <div>
                                  <p className="font-bold">Cambio de Materia</p>
                                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-[#737686]'}`}>Proyecto PIAR</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${darkMode ? 'text-blue-300' : 'text-[#2563eb]'}`}>16:30</span>
                                <input 
                                  type="checkbox" 
                                  checked={alarms.cambioMateria}
                                  onChange={async () => {
                                    const next = { ...alarms, cambioMateria: !alarms.cambioMateria };
                                    setAlarms(next);
                                    if (user) {
                                      try { await updateDoc(doc(db, 'users', user.uid), { alarms: next }); } catch (e) {}
                                    }
                                  }}
                                  className="h-4 w-7 accent-[#2563eb] cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Alarm Box 2 */}
                            <div className={`flex items-center justify-between p-3.5 border rounded-xl text-xs transition-colors ${
                              darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-[#f3f3fe] border-[#e1e2ed]'
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-600' : 'bg-white'}`}>
                                  <CheckCircle className="h-4 w-4 text-orange-600" />
                                </span>
                                <div>
                                  <p className="font-bold">Fin de Sesión</p>
                                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-[#737686]'}`}>Meta diaria lograda</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${darkMode ? 'text-blue-300' : 'text-[#2563eb]'}`}>19:00</span>
                                <input 
                                  type="checkbox" 
                                  checked={alarms.finSesion}
                                  onChange={async () => {
                                    const next = { ...alarms, finSesion: !alarms.finSesion };
                                    setAlarms(next);
                                    if (user) {
                                      try { await updateDoc(doc(db, 'users', user.uid), { alarms: next }); } catch (e) {}
                                    }
                                  }}
                                  className="h-4 w-7 accent-[#2563eb] cursor-pointer"
                                />
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Progress card quote */}
                        <div className="bg-gradient-to-br from-[#2563eb] to-[#4025ee] p-6 rounded-2xl text-white relative overflow-hidden shadow-lg shadow-blue-500/10">
                          <div className="absolute -bottom-10 -right-10 text-[180px] text-white/5 font-bold pointer-events-none">IA</div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-100 mb-2">Resumen Motivador</h4>
                          <p className="font-sans italic text-sm text-blue-50 mb-4 leading-relaxed font-medium">
                            &ldquo;La constancia supera todo obstáculo intelectual; el éxito consiste en persistir un poco más en tus asignaturas.&rdquo;
                          </p>
                          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-3">
                            <div className="h-1 bg-white rounded-full transition-all duration-700" style={{ width: '85%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-blue-200">
                            <span>Progreso Diario: 85%</span>
                            <span>Completo</span>
                          </div>
                        </div>

                      </section>
                    </div>

                    {/* Weekly analytics chart */}
                    <section className={`bento-card p-6 border transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#e1e2ed] text-[#191b23]'
                    }`}>
                      <h3 className="font-title text-md font-bold mb-6">Actividad de Estudio Semanal</h3>
                      <div className="flex items-end justify-between h-36 px-4">
                        {[
                          { label: 'LUN', pct: 40, active: false },
                          { label: 'MAR', pct: 60, active: false },
                          { label: 'MIÉ', pct: 55, active: false },
                          { label: 'JUE', pct: 90, active: true },
                          { label: 'VIE', pct: 35, active: false },
                          { label: 'SÁB', pct: 20, active: false },
                          { label: 'DOM', pct: 10, active: false }
                        ].map((bar, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div 
                              className={`w-10 rounded-t-md transition-all duration-300 ${
                                bar.active 
                                  ? 'bg-[#2563eb] shadow-md shadow-blue-500/20' 
                                  : darkMode ? 'bg-slate-700 group-hover:bg-[#2563eb]' : 'bg-blue-100 group-hover:bg-[#2563eb]'
                              }`} 
                              style={{ height: `${bar.pct}%` }}
                            />
                            <span className={`text-[10px] uppercase font-bold mt-2 ${
                              bar.active ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                            }`}>{bar.label}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

              </main>

            </div>

            {/* MOBILE BOTTOM TAB BAR */}
            <nav className={`fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center px-4 py-3 border-t lg:hidden rounded-t-xl shadow-lg transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#e1e2ed]'
            }`}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center justify-center flex-1 py-1 ${
                  activeTab === 'dashboard' ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                }`}
              >
                <Activity className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1">Dashboard</span>
              </button>

              <button 
                onClick={() => setActiveTab('calendar')}
                className={`flex flex-col items-center justify-center flex-1 py-1 ${
                  activeTab === 'calendar' ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1 font-sans">Calendario</span>
              </button>

              <button 
                onClick={() => setActiveTab('subjects')}
                className={`flex flex-col items-center justify-center flex-1 py-1 ${
                  activeTab === 'subjects' ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                }`}
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1 font-sans">Materias</span>
              </button>

              <button 
                onClick={() => setActiveTab('smart_org')}
                className={`flex flex-col items-center justify-center flex-1 py-1 ${
                  activeTab === 'smart_org' ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                }`}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1">Planificador</span>
              </button>

              <button 
                onClick={() => setActiveTab('study_time')}
                className={`flex flex-col items-center justify-center flex-1 py-1 ${
                  activeTab === 'study_time' ? 'text-[#2563eb]' : darkMode ? 'text-slate-400' : 'text-[#737686]'
                }`}
              >
                <Timer className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1">Foco</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS DIALOG / MODAL PANEL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border transition-all space-y-4 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#c3c6d7] text-slate-850'
              }`}
            >
              <h3 className="font-title text-xl font-bold">Ajustes de Perfil</h3>
              <div className="space-y-4 pt-2">
                <div>
                  <label className={`text-xs mb-1.5 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Nombre del Estudiante</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className={`w-full text-sm p-3 rounded-xl border focus:ring-1 focus:ring-[#2563eb] focus:outline-none h-[42px] ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
                    }`}
                    placeholder="Tu nombre aquí..."
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1.5 block ${darkMode ? 'text-slate-300' : 'text-[#737686]'}`}>Asigna tu límite de sesión diario (Mins)</label>
                  <input 
                    type="number" 
                    value={dailyLimitMinutes}
                    onChange={(e) => setDailyLimitMinutes(Number(e.target.value))}
                    className={`w-full text-sm p-3 border rounded-xl focus:ring-1 focus:ring-[#2563eb] focus:outline-none h-[42px] ${
                      darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-[#c3c6d7]'
                    }`}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={async () => {
                    if (user) {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), {
                          userName: userName,
                          dailyLimitMinutes: dailyLimitMinutes,
                          alarms: alarms,
                          updatedAt: new Date()
                        });
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                      }
                    }
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-[#2563eb] text-white font-title font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  Guardar Cambios
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className={`flex-1 py-2.5 font-title font-bold text-xs rounded-xl cursor-pointer ${
                    darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border transition-all space-y-4 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-[#c3c6d7] text-slate-800'
              }`}
            >
              <h3 className="font-title text-xl font-bold">Ayuda y Soporte</h3>
              <div className={`text-xs space-y-3 pt-2 ${darkMode ? 'text-slate-300' : 'text-[#434655]'}`}>
                <p><strong>¿Qué es Aarikeron Study?</strong></p>
                <p>Es un organizador académico interactivo que asiste a estudiantes de bachillerato a organizar deberes, planificar exámenes e integrar de manera óptima las actividades de estudio.</p>
                <p><strong>¿Cómo funciona la estimación IA?</strong></p>
                <p>Al introducir el nombre de una tarea en el apartado de Distribuidor Inteligente, la IA analiza la dificultad del tema y sugiere la duración de estudio estimada y una serie de pasos concretos.</p>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="w-full py-2.5 bg-[#2563eb] text-[#faf8ff] font-title font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
