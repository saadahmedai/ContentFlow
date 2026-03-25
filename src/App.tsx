import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  CheckSquare, 
  Kanban, 
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Star,
  Trash2,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  Database,
  AlertTriangle,
  LogIn,
  Clock
} from 'lucide-react';
import { USERS, DEFAULT_CHANNELS, WEEKLY_SCHEDULE } from './constants';
import { User, UserKey, AppData, Settings, Idea, PipelineItem, CompletedItem, PipelineStage } from './types';
import { getInitialSettings, saveLocalSettings } from './lib/store';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  auth, 
  db, 
  messaging,
  googleProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType,
  FirebaseUser,
  getToken,
  onMessage
} from './firebase';

// --- Components ---

const PIN_DOTS = [0, 1, 2, 3];

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('cf_user');
    return stored ? USERS[stored] : null;
  });
  const [pinUser, setPinUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [data, setData] = useState<AppData>({ ideas: [], pipeline: [], completed: [] });
  const [settings, setSettings] = useState<Settings>(getInitialSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const dataRef = useRef(data);
  const settingsRef = useRef(settings);
  const isSyncingRef = useRef(isSyncing);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

  // --- PWA Effects ---

  useEffect(() => {
    // Check if on mobile and not already in standalone mode
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isMobile && !isStandalone) {
      setShowPwaPrompt(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setIsAuthReady(true);
      
      if (u && u.email) {
        // Automatically map firebase user to local user based on email
        const mappedUser = Object.values(USERS).find(user => user.emails.includes(u.email!));
        if (mappedUser) {
          setUser(mappedUser);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Effects ---

  useEffect(() => {
    if (!user) return;

    const unsubIdeas = onSnapshot(query(collection(db, 'ideas'), orderBy('createdAt', 'desc')), (snapshot) => {
      const ideas = snapshot.docs.map(doc => doc.data() as Idea);
      setData(prev => ({ ...prev, ideas }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ideas'));

    const unsubPipeline = onSnapshot(query(collection(db, 'pipeline'), orderBy('updatedAt', 'desc')), (snapshot) => {
      const pipeline = snapshot.docs.map(doc => doc.data() as PipelineItem);
      setData(prev => ({ ...prev, pipeline }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pipeline'));

    const unsubCompleted = onSnapshot(query(collection(db, 'completed'), orderBy('completedAt', 'desc')), (snapshot) => {
      const completed = snapshot.docs.map(doc => doc.data() as CompletedItem);
      setData(prev => ({ ...prev, completed }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'completed'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as Settings);
      } else {
        const initialSettings = getInitialSettings();
        setDoc(doc(db, 'settings', 'global'), initialSettings)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/global'));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));

    return () => {
      unsubIdeas();
      unsubPipeline();
      unsubCompleted();
      unsubSettings();
    };
  }, [firebaseUser, user]);

  useEffect(() => {
    // Inject PWA Manifest
    const manifest = {
      name: "ContentFlow",
      short_name: "ContentFlow",
      description: "Content Production Pipeline for Saad & Sarim",
      start_url: ".",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#0a0a0a",
      icons: [
        {
          src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTI4IiB5PSIxMjgiIHdpZHRoPSIxMTIiIGhlaWdodD0iMTEyIiByeD0iOCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIyNzIiIHk9IjEyOCIgd2lkdGg9IjExMiIgaGVpZ2h0PSIxMTIiIHJ4PSI4IiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHg9IjEyOCIgeT0iMjcyIiB3aWR0aD0iMTEyIiBoZWlnaHQ9IjExMiIgcng9IjgiIGZpbGw9IndoaXRlIi8+PHJlY3QgeD0iMjcyIiB5PSIyNzIiIHdpZHRoPSIxMTIiIGhlaWdodD0iMTEyIiByeD0iOCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    };
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    // Auto-delete uploaded items older than 24 hours
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const itemsToDelete = data.pipeline.filter(p => 
      p.stage === 'uploaded' && p.uploadedAt && now - p.uploadedAt > oneDay
    );

    if (itemsToDelete.length > 0) {
      itemsToDelete.forEach(async (item) => {
        try {
          await deleteDoc(doc(db, 'pipeline', item.id));
        } catch (err) {
          console.error('Auto-delete failed:', err);
        }
      });
    }
  }, [data.pipeline]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('cf_user', user.key);
    }
  }, [user]);

  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, { 
              // Replace with your actual VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
              vapidKey: 'BM4WeyX43BkPmC1qV2Q1xe2M2Edsy-dmCP78INrgYYkThBsa7nwAXXj0nfSqmi3uQdJgi1413gWuhOWNvqUm27o'
            });
            if (token) {
              setFcmToken(token);
              // Store token in user's document
              await updateDoc(doc(db, 'users', user.key), {
                fcmToken: token,
                updatedAt: Date.now()
              });
            }
          }
        } catch (err) {
          console.error('Notification permission error:', err);
        }
      };
      requestPermission();

      const unsubMessage = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        if (payload.notification) {
          addToast(payload.notification.title || 'Notification', payload.notification.body || '', 'info');
        }
      });
      return () => unsubMessage();
    }
  }, [user]);

  // --- Handlers ---

  const addToast = (title: string, body: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handlePinEntry = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    
    if (newPin.length === 4) {
      if (pinUser && newPin === pinUser.pin) {
        setUser(pinUser);
        setPinUser(null);
        setPin('');
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      sessionStorage.removeItem('cf_user');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // --- Render Helpers ---

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      addToast('Error', 'Failed to sign in with Google', 'error');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-1 w-12 h-12">
                <div className="bg-white rounded-[1px]"></div>
                <div className="bg-white rounded-[1px]"></div>
                <div className="bg-white rounded-[1px]"></div>
                <div className="bg-white rounded-[1px]"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">ContentFlow</h1>
            <p className="text-zinc-500">Secure Cloud Sync Required</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 transition-all"
          >
            <LogIn size={20} /> Sign in with Google
          </button>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Authorized users only (nagharasad@gmail.com)
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-1 w-12 h-12">
              <div className="bg-white rounded-[1px]"></div>
              <div className="bg-white rounded-[1px]"></div>
              <div className="bg-white rounded-[1px]"></div>
              <div className="bg-white rounded-[1px]"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-zinc-500">
            Your email ({firebaseUser.email}) is not authorized to access ContentFlow.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-3 p-4 bg-zinc-800 text-white rounded-lg font-bold hover:bg-zinc-700 transition-all"
          >
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-[220px] flex-col border-right border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 h-screen p-4 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
            <div className="bg-white rounded-[1px]"></div>
            <div className="bg-white rounded-[1px]"></div>
            <div className="bg-white rounded-[1px]"></div>
            <div className="bg-white rounded-[1px]"></div>
          </div>
          <span className="font-bold text-lg tracking-tight">ContentFlow</span>
        </div>

          <nav className="flex-1 space-y-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavItem active={activeTab === 'ideation'} onClick={() => setActiveTab('ideation')} icon={<Lightbulb size={20} />} label="Ideation" />
            <NavItem active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} icon={<CheckSquare size={20} />} label="Approved" />
            <NavItem active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={<Kanban size={20} />} label="Pipeline" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Settings" />
          </nav>

        <div className="space-y-4 px-2">
          {isSyncing && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
              Syncing
            </div>
          )}
          <div className="flex items-center gap-3 p-2 bg-[#111] border border-[#2a2a2a] rounded-lg">
            <div className="text-2xl">{user.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{user.role}</div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-2 text-zinc-500 hover:text-white transition-colors text-sm"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#2a2a2a] flex items-center justify-between px-4 py-3 z-50">
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
            <div className="bg-white rounded-[0.5px]"></div>
            <div className="bg-white rounded-[0.5px]"></div>
            <div className="bg-white rounded-[0.5px]"></div>
            <div className="bg-white rounded-[0.5px]"></div>
          </div>
          <span className="font-bold tracking-tight">ContentFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 font-medium">{user.name}</div>
          <div className="text-lg">{user.avatar}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 pt-20 md:pt-8 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard user={user} data={data} setActiveTab={setActiveTab} />}
            {activeTab === 'ideation' && <Ideation user={user} data={data} setData={setData} settings={settings} addToast={addToast} />}
            {activeTab === 'approved' && <ApprovedIdeas user={user} data={data} setData={setData} settings={settings} addToast={addToast} />}
            {activeTab === 'pipeline' && <Pipeline user={user} data={data} setData={setData} settings={settings} addToast={addToast} />}
            {activeTab === 'settings' && <SettingsPage user={user} data={data} setData={setData} settings={settings} setSettings={setSettings} addToast={addToast} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Tab Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-[#2a2a2a] flex justify-around p-2 z-50">
        <TabItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} />
        <TabItem active={activeTab === 'ideation'} onClick={() => setActiveTab('ideation')} icon={<Lightbulb size={20} />} />
        <TabItem active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} icon={<CheckSquare size={20} />} />
        <TabItem active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={<Kanban size={20} />} />
        <TabItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} />
      </nav>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="pointer-events-auto bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-lg shadow-2xl min-w-[280px] flex gap-3"
            >
              {t.type === 'success' && <CheckCircle2 className="text-green-500 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="text-red-500 shrink-0" />}
              <div>
                <div className="font-bold text-sm">{t.title}</div>
                <div className="text-xs text-zinc-400">{t.body}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active ? 'bg-[#1a1a1a] text-white' : 'text-zinc-500 hover:text-white hover:bg-[#111]'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function TabItem({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg transition-all ${
        active ? 'text-white bg-[#1a1a1a]' : 'text-zinc-500'
      }`}
    >
      {icon}
    </button>
  );
}

// --- Pages ---

function Dashboard({ user, data, setActiveTab }: { user: User; data: AppData; setActiveTab: (t: string) => void }) {
  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem('cf_tasks');
    if (saved) {
      try {
        const { date, tasks } = JSON.parse(saved);
        if (date === new Date().toDateString()) return tasks;
      } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('cf_tasks', JSON.stringify({
      date: new Date().toDateString(),
      tasks: completedTasks
    }));
  }, [completedTasks]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const schedule = WEEKLY_SCHEDULE[today as keyof typeof WEEKLY_SCHEDULE];
  
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
        <p className="text-zinc-500">It's {today}. Let's get to work.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Ideas" value={data.ideas.filter(i => i.status === 'pending').length} />
        <StatCard label="Approved Ideas" value={data.ideas.filter(i => i.status === 'approved').length} />
        <StatCard label="In Production" value={data.pipeline.filter(p => p.stage !== 'uploaded').length} />
        <StatCard label="Completed" value={data.completed.length + data.pipeline.filter(p => p.stage === 'uploaded').length} />
      </div>

      <section className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckSquare size={24} className="text-zinc-500" />
            Today's Tasks
          </h2>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            {schedule?.tasks.filter(t => t.assignee === 'both' || t.assignee === user.key).map((task, i) => {
              const taskId = `${today}-${i}`;
              const isCompleted = completedTasks.includes(taskId);
              return (
                <div key={i} className="flex gap-4 group">
                  <div className="mt-1">
                    <input 
                      type="checkbox" 
                      checked={isCompleted}
                      onChange={() => toggleTask(taskId)}
                      className="w-5 h-5 rounded border-[#2a2a2a] bg-[#0a0a0a] checked:bg-white checked:border-white transition-all cursor-pointer" 
                    />
                  </div>
                  <div className={isCompleted ? 'opacity-40' : ''}>
                    <div className="font-bold flex items-center gap-2">
                      <span className={isCompleted ? 'line-through' : ''}>{task.title}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-zinc-500 uppercase tracking-tighter border border-[#2a2a2a]">
                        {task.assignee === 'both' ? 'BOTH' : 'YOU'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{task.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Upload Details</h3>
            {schedule?.upload.split(' + ').map(ch => {
              const channel = DEFAULT_CHANNELS.find(c => c.name === ch);
              return (
                <div key={ch} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel?.color || '#fff' }}></div>
                  <div className="flex-1 font-medium">{ch}</div>
                  <div className="text-xs text-green-500 font-bold">Ready for publishing</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="bg-white text-black rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-2xl font-bold">Production Pipeline</h2>
          <p className="text-zinc-600">Track your content from scripting to final upload.</p>
        </div>
        <button 
          onClick={() => setActiveTab('pipeline')}
          className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform"
        >
          View Pipeline
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] p-6 rounded-xl space-y-1">
      <div className="text-zinc-500 text-sm font-medium">{label}</div>
      <div className="text-4xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Ideation({ user, data, setData, settings, addToast }: any) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', channel: DEFAULT_CHANNELS[0].id, desc: '' });

  const filteredIdeas = data.ideas.filter((i: Idea) => 
    i.status === 'pending' && 
    (i.title.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()))
  );

  const triggerNotification = async (targetUserKey: UserKey, title: string, body: string) => {
    if (!settings.notificationsEnabled) return;
    
    try {
      // Write to a 'notifications' collection that the server listens to
      const notificationId = crypto.randomUUID();
      await setDoc(doc(db, 'notifications', notificationId), {
        id: notificationId,
        targetUserKey,
        title,
        body,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('Failed to trigger notification:', err);
    }
  };

  const handleAddIdea = async () => {
    if (!newIdea.title) return;
    const idea: Idea = {
      id: crypto.randomUUID(),
      title: newIdea.title,
      channel: newIdea.channel,
      desc: newIdea.desc,
      status: 'pending',
      ratings: { saad: 0, sarim: 0 },
      addedBy: user.key,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    try {
      await setDoc(doc(db, 'ideas', idea.id), idea);
      setShowAddModal(false);
      setNewIdea({ title: '', channel: DEFAULT_CHANNELS[0].id, desc: '' });
      addToast('Idea Added', `'${idea.title}' has been added to the ideation pool.`, 'success');
      
      // Notify the other user
      const otherUserKey = user.key === 'saad' ? 'sarim' : 'saad';
      triggerNotification(otherUserKey, 'New Idea Added', `${user.name} added: ${idea.title}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `ideas/${idea.id}`);
    }
  };

  const handleRate = async (ideaId: string, rating: number) => {
    try {
      const ideaRef = doc(db, 'ideas', ideaId);
      await updateDoc(ideaRef, {
        [`ratings.${user.key}`]: rating,
        updatedAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ideas/${ideaId}`);
    }
  };

  const handleApprove = async (idea: Idea) => {
    try {
      const ideaRef = doc(db, 'ideas', idea.id);
      await updateDoc(ideaRef, {
        status: 'approved',
        approvedAt: Date.now(),
        updatedAt: Date.now()
      });
      addToast('Idea Approved', `'${idea.title}' is now in Approved Ideas.`, 'success');
      
      // Notify the other user
      const otherUserKey = user.key === 'saad' ? 'sarim' : 'saad';
      triggerNotification(otherUserKey, 'Idea Approved', `${user.name} approved: ${idea.title}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ideas/${idea.id}`);
    }
  };

  const handleDiscard = async (idea: Idea) => {
    try {
      const ideaRef = doc(db, 'ideas', idea.id);
      await updateDoc(ideaRef, {
        status: 'discarded',
        updatedAt: Date.now()
      });
      addToast('Idea Discarded', `'${idea.title}' has been archived.`, 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ideas/${idea.id}`);
    }
  };

  const handleDelete = async (ideaId: string) => {
    if (user.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'ideas', ideaId));
      addToast('Idea Deleted', 'The idea has been permanently removed.', 'error');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ideas/${ideaId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Ideation</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search ideas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm focus:border-white outline-none transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <Plus size={18} /> Add Idea
          </button>
        </div>
      </header>

      {filteredIdeas.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl">💡</div>
          <div className="text-zinc-500">No pending ideas found. Start brainstorming!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredIdeas.map((idea: Idea) => {
            const channel = DEFAULT_CHANNELS.find(c => c.id === idea.channel);
            const otherUserKey = user.key === 'saad' ? 'sarim' : 'saad';
            const otherUser = USERS[otherUserKey];
            const bothRated = idea.ratings.saad > 0 && idea.ratings.sarim > 0;
            const avgScore = bothRated ? (idea.ratings.saad + idea.ratings.sarim) / 2 : 0;

            return (
              <div key={idea.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel?.color }}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{channel?.name}</span>
                  </div>
                  {user.role === 'admin' && (
                    <button onClick={() => handleDelete(idea.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-lg leading-tight">{idea.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-3">{idea.desc}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#2a2a2a]">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Your Rating</span>
                    <span className="font-bold text-white">{idea.ratings[user.key] || 'Not rated'}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                      <button 
                        key={star} 
                        onClick={() => handleRate(idea.id, star)}
                        className={`flex-1 aspect-square rounded-sm transition-colors ${
                          idea.ratings[user.key] >= star ? 'bg-white' : 'bg-[#1a1a1a] hover:bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs">
                      {bothRated ? (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 uppercase tracking-widest font-bold text-[10px]">Avg Score</span>
                          <span className={`font-bold ${avgScore >= 7 ? 'text-green-500' : 'text-zinc-400'}`}>{avgScore.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">Waiting for {otherUser.name}...</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {bothRated && avgScore >= 7 && (
                        <button 
                          onClick={() => handleApprove(idea)}
                          className="bg-green-500/10 text-green-500 p-2 rounded-lg hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      {(idea.ratings.saad > 0 || idea.ratings.sarim > 0) && (
                        <button 
                          onClick={() => handleDiscard(idea)}
                          className="bg-red-500/10 text-red-500 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Idea Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#111] border border-[#2a2a2a] w-full max-w-lg rounded-xl p-8 space-y-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold">Add New Idea</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Title</label>
                  <input 
                    type="text" 
                    value={newIdea.title}
                    onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                    placeholder="Enter a catchy title..."
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Channel</label>
                  <select 
                    value={newIdea.channel}
                    onChange={(e) => setNewIdea({ ...newIdea, channel: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:border-white outline-none transition-colors appearance-none"
                  >
                    {DEFAULT_CHANNELS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Description</label>
                  <textarea 
                    value={newIdea.desc}
                    onChange={(e) => setNewIdea({ ...newIdea, desc: e.target.value })}
                    placeholder="Describe the concept..."
                    rows={4}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:border-white outline-none transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-[#1a1a1a] text-white font-bold py-3 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddIdea}
                  className="flex-1 bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Add Idea
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ApprovedIdeas({ user, data, setData, settings, addToast }: any) {
  const [filter, setFilter] = useState('all');

  const approvedIdeas = data.ideas
    .filter((i: Idea) => i.status === 'approved' && (filter === 'all' || i.channel === filter))
    .sort((a: Idea, b: Idea) => {
      const avgA = (a.ratings.saad + a.ratings.sarim) / 2;
      const avgB = (b.ratings.saad + b.ratings.sarim) / 2;
      return avgB - avgA;
    });

  const handleSendToPipeline = async (idea: Idea) => {
    let dueDate = '';
    const now = new Date();
    
    if (idea.channel === 'mrglintbone') {
      now.setDate(now.getDate() + 3);
      dueDate = now.toISOString().split('T')[0];
    } else if (idea.channel === 'secondperson') {
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      dueDate = nextSunday.toISOString().split('T')[0];
    } else if (idea.channel === 'fruittlore') {
      const nextThu = new Date();
      nextThu.setDate(now.getDate() + (4 - now.getDay() + 7) % 7);
      const nextSun = new Date();
      nextSun.setDate(now.getDate() + (7 - now.getDay() + 7) % 7);
      dueDate = (nextThu < nextSun ? nextThu : nextSun).toISOString().split('T')[0];
    }

    const pipelineItem: PipelineItem = {
      id: crypto.randomUUID(),
      ideaId: idea.id,
      title: idea.title,
      channel: idea.channel,
      stage: 'scripting',
      dueDate,
      movedBy: user.key,
      movedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await Promise.all([
        updateDoc(doc(db, 'ideas', idea.id), {
          status: 'in_pipeline',
          updatedAt: Date.now()
        }),
        setDoc(doc(db, 'pipeline', pipelineItem.id), pipelineItem)
      ]);

      addToast('Sent to Pipeline', `'${idea.title}' is now in Scripting.`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pipeline/${pipelineItem.id}`);
    }
  };

  const handleDelete = async (ideaId: string) => {
    if (user.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'ideas', ideaId));
      addToast('Idea Deleted', 'The idea has been permanently removed.', 'error');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ideas/${ideaId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold">Approved Ideas</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {DEFAULT_CHANNELS.map(c => (
            <FilterTab 
              key={c.id} 
              active={filter === c.id} 
              onClick={() => setFilter(c.id)} 
              label={c.name} 
              color={c.color} 
            />
          ))}
        </div>
      </header>

      {approvedIdeas.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl">✨</div>
          <div className="text-zinc-500">No approved ideas yet. Rate some ideas!</div>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedIdeas.map((idea: Idea, index: number) => {
            const channel = DEFAULT_CHANNELS.find(c => c.id === idea.channel);
            const avgScore = (idea.ratings.saad + idea.ratings.sarim) / 2;
            let priority = { label: 'OK', color: 'text-zinc-400 bg-zinc-400/10' };
            if (avgScore > 9) priority = { label: 'TOP', color: 'text-yellow-500 bg-yellow-500/10' };
            else if (avgScore > 7) priority = { label: 'GOOD', color: 'text-green-500 bg-green-500/10' };

            return (
              <div key={idea.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4 group">
                <div className="w-8 text-center font-mono text-zinc-600 font-bold">{index + 1}</div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: channel?.color }}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{idea.title}</h3>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${priority.color}`}>
                      {priority.label}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Avg: <span className="text-white font-bold">{avgScore.toFixed(1)}</span>/10 · {channel?.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(idea.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleSendToPipeline(idea)}
                    className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                  >
                    Pipeline <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, label, color }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap border ${
        active ? 'bg-white text-black border-white' : 'bg-[#111] text-zinc-500 border-[#2a2a2a] hover:border-zinc-500'
      }`}
    >
      {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>}
      {label}
    </button>
  );
}

function Pipeline({ user, data, setData, settings, addToast, isShared }: any) {
  const [moveModal, setMoveModal] = useState<{ item: PipelineItem; nextStage: any } | null>(null);
  const [moveMessage, setMoveMessage] = useState('');

  const stages: { id: any; label: string }[] = [
    { id: 'scripting', label: 'Scripting' },
    { id: 'editing', label: 'Editing' },
    { id: 'ready', label: 'Ready' },
    { id: 'uploaded', label: 'Uploaded' },
  ];

  const canMoveForward = (item: PipelineItem) => {
    if (item.stage === 'scripting') return user.key === 'sarim';
    if (item.stage === 'editing') return user.key === 'saad';
    if (item.stage === 'ready') return user.key === 'sarim';
    return false;
  };

  const handleMove = (item: PipelineItem, direction: 'forward' | 'backward') => {
    const currentIndex = stages.findIndex(s => s.id === item.stage);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex < 0 || nextIndex >= stages.length) return;
    
    const nextStage = stages[nextIndex].id as any;

    if (direction === 'forward') {
      if (!canMoveForward(item)) {
        addToast('Permission Denied', `Only ${item.stage === 'editing' ? 'Saad' : 'Sarim'} can move items to ${stages[nextIndex].label}.`, 'error');
        return;
      }

      setMoveModal({ item, nextStage });
    } else {
      updateStage(item.id, nextStage);
    }
  };

  const updateStage = async (itemId: string, nextStage: any, message?: string) => {
    try {
      const item = data.pipeline.find((p: PipelineItem) => p.id === itemId);
      if (!item) return;

      const isUploaded = nextStage === 'uploaded';
      const updates: any = {
        stage: nextStage,
        movedBy: user.key,
        movedAt: Date.now(),
        updatedAt: Date.now()
      };
      if (isUploaded) updates.uploadedAt = Date.now();

      await updateDoc(doc(db, 'pipeline', itemId), updates);

      const stageLabel = nextStage.charAt(0).toUpperCase() + nextStage.slice(1);
      
      setMoveModal(null);
      setMoveMessage('');
      addToast('Stage Updated', `Item moved to ${stageLabel}.`, 'success');

      // Notify the other user
      const otherUserKey = user.key === 'saad' ? 'sarim' : 'saad';
      triggerNotification(otherUserKey, 'Pipeline Update', `${user.name} moved '${item.title}' to ${stageLabel.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pipeline/${itemId}`);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'pipeline', itemId));
      addToast('Item Removed', 'Pipeline item has been deleted.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pipeline/${itemId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Production Pipeline</h1>
          {isShared && (
            <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Shared Connection (Saad)</span>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map(stage => {
          const items = data.pipeline.filter((p: PipelineItem) => p.stage === stage.id);
          return (
            <div key={stage.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-zinc-500 uppercase tracking-widest text-xs flex items-center gap-2">
                  {stage.label}
                  <span className="bg-[#111] border border-[#2a2a2a] px-2 py-0.5 rounded-full text-[10px] text-white">
                    {items.length}
                  </span>
                </h3>
              </div>

              <div className="bg-[#111]/50 border border-dashed border-[#2a2a2a] rounded-xl p-2 min-h-[400px] space-y-3">
                {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-700 text-sm italic py-20">
                    Empty
                  </div>
                ) : (
                  items.map((item: PipelineItem) => (
                    <PipelineCard 
                      key={item.id} 
                      item={item} 
                      onMove={handleMove} 
                      onDelete={handleDelete}
                      canMoveForward={canMoveForward(item)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Move Modal */}
      <AnimatePresence>
        {moveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoveModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#111] border border-[#2a2a2a] w-full max-w-md rounded-xl p-8 space-y-6 shadow-2xl"
            >
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Move to {moveModal.nextStage.charAt(0).toUpperCase() + moveModal.nextStage.slice(1)}</h2>
                <p className="text-sm text-zinc-500">Add an optional message for the other user.</p>
              </div>
              
              <textarea 
                value={moveMessage}
                onChange={(e) => setMoveMessage(e.target.value)}
                placeholder="e.g. Script is ready! Check the doc."
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:border-white outline-none transition-colors resize-none"
              />

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setMoveModal(null)}
                  className="flex-1 bg-[#1a1a1a] text-white font-bold py-3 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => updateStage(moveModal.item.id, moveModal.nextStage, moveMessage)}
                  className="flex-1 bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Move Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PipelineCard({ item, onMove, onDelete, canMoveForward }: any) {
  const channel = DEFAULT_CHANNELS.find(c => c.id === item.channel);
  const dueDate = new Date(item.dueDate);
  
  // Timezone handling: Assume due date is end of day in Dallas (UTC-5)
  // Dallas is 10 hours behind Karachi.
  const now = new Date();
  const dallasOffset = -5; // Central Daylight Time
  const dallasNow = new Date(now.getTime() + (dallasOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
  
  // Set due date to 11:59:59 PM in Dallas on that day
  const dallasDueDate = new Date(item.dueDate);
  dallasDueDate.setHours(23, 59, 59, 999);
  
  const diffMs = dallasDueDate.getTime() - dallasNow.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let priority = { label: 'MEDIUM', color: 'text-zinc-400 bg-zinc-400/10' };
  if (diffMs < 0) priority = { label: 'OVERDUE', color: 'text-red-500 bg-red-500/10' };
  else if (diffDays < 1) priority = { label: 'HIGH', color: 'text-orange-500 bg-orange-500/10' };
  else if (diffDays > 4) priority = { label: 'LOW', color: 'text-green-500 bg-green-500/10' };

  const timeRemainingLabel = diffMs < 0 
    ? 'Overdue' 
    : diffDays > 0 
      ? `${diffDays}d ${diffHours}h left` 
      : `${diffHours}h left`;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-3 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel?.color }}></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{channel?.name}</span>
        </div>
        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${priority.color}`}>
          {priority.label}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-sm leading-tight">{item.title}</h4>
        <div className="text-[9px] text-zinc-500 font-medium">
          Due: {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Dallas Time)
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className={`flex items-center gap-1 text-[10px] font-bold ${diffMs < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
          <Clock size={12} />
          {timeRemainingLabel}
        </div>
        
        <div className="flex items-center gap-1">
          {item.stage === 'uploaded' ? (
            <button 
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <>
              <button 
                onClick={() => onMove(item, 'backward')}
                disabled={item.stage === 'scripting'}
                className="p-1.5 bg-[#111] border border-[#2a2a2a] rounded-md text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={() => onMove(item, 'forward')}
                className={`p-1.5 border rounded-md transition-colors ${
                  canMoveForward 
                    ? 'bg-white border-white text-black hover:bg-zinc-200' 
                    : 'bg-[#111] border-[#2a2a2a] text-zinc-500 opacity-50'
                }`}
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {item.stage === 'uploaded' && item.uploadedAt && (
        <div className="text-[9px] text-green-500/70 italic pt-1">
          Uploaded {new Date(item.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
function SettingsPage({ user, data, setData, settings, setSettings, addToast }: any) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('cf_user');
      window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleResetData = async () => {
    if (confirm('Are you sure? This will clear all data in Firestore (if you have permission).')) {
      try {
        // This is a dangerous operation, usually you'd want a backend script
        // For now, we'll just clear the local storage and reload
        localStorage.removeItem('contentflow');
        window.location.reload();
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  const toggleNotifications = async () => {
    const newStatus = !settings.notificationsEnabled;
    setSettings({ ...settings, notificationsEnabled: newStatus });
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        notificationsEnabled: newStatus
      });
      addToast('Settings Updated', `Notifications ${newStatus ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-20">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      {/* Notifications Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-xs font-bold">
          <AlertCircle size={14} />
          Preferences
        </div>
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold">Push Notifications</h3>
              <p className="text-xs text-zinc-500">Receive alerts when the other user updates the pipeline or adds ideas.</p>
            </div>
            <button 
              onClick={toggleNotifications}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-white' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.notificationsEnabled ? 'right-1 bg-black' : 'left-1 bg-zinc-500'}`}></div>
            </button>
          </div>
          
          {settings.notificationsEnabled && (
            <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Test Notification</h3>
                <p className="text-[10px] text-zinc-500">Send a test alert to yourself to verify it's working.</p>
              </div>
              <button 
                onClick={() => triggerNotification(user.key, 'Test Alert', 'This is a test notification from ContentFlow!')}
                className="px-3 py-1.5 bg-[#1a1a1a] text-white text-xs font-bold rounded hover:bg-zinc-800 transition-colors"
              >
                Send Test
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Firebase Info Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-xs font-bold">
          <Database size={14} />
          Database Status
        </div>
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold">Real-time Sync</h3>
              <p className="text-xs text-zinc-500">Connected to Firebase Firestore.</p>
            </div>
            <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Active
            </div>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono">
            Project: {firebaseConfig.projectId}
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-red-500/50 uppercase tracking-widest text-xs font-bold">
          <AlertTriangle size={14} />
          Danger Zone
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleSignOut}
            className="flex-1 bg-[#1a1a1a] text-white font-bold py-3 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </section>

      <div className="text-center space-y-2">
        <div className="text-[10px] text-zinc-700 font-mono">CONTENTFLOW v1.0.0</div>
        <div className="text-[10px] text-zinc-800">Built for Saad & Sarim</div>
      </div>
    </div>
  );
}
