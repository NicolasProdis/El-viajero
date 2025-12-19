
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { Quest, UserStats } from './types';
import { INITIAL_PLACEHOLDERS } from './constants';
import { generateId, triggerHaptic } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    ThinkingIcon, 
    ArrowUpIcon,
    GridIcon,
    TimerIcon,
    SettingsIcon,
    SparklesIcon
} from './components/Icons';

type ViewState = 'landing' | 'auth' | 'app';

function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userSignature, setUserSignature] = useState<string>('');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<UserStats>({
    level: 1,
    xp: 0,
    maxXp: 100,
    title: "El Buscador"
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLevelingUp, setIsLevelingUp] = useState<boolean>(false);
  const [isEvolving, setIsEvolving] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
  const [xpPopups, setXpPopups] = useState<{id: string, amount: number}[]>([]);
  
  const [timerMode, setTimerMode] = useState<'none' | 'work' | 'break'>('none');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef<number>(1);

  const evolutionStage = useMemo(() => {
    if (stats.level >= 15) return 4;
    if (stats.level >= 10) return 3;
    if (stats.level >= 5) return 2;
    return 1;
  }, [stats.level]);

  const worldColors = useMemo(() => {
    const palettes = [
        { color: "rgba(255,255,255,0.05)", glow: "rgba(255,255,255,0.1)" },
        { color: "rgba(100,255,150,0.05)", glow: "rgba(100,255,150,0.2)" },
        { color: "rgba(100,200,255,0.05)", glow: "rgba(100,200,255,0.2)" },
        { color: "rgba(255,215,100,0.05)", glow: "rgba(255,215,100,0.3)" }
    ];
    return palettes[evolutionStage - 1];
  }, [evolutionStage]);

  const navigateTo = (nextView: ViewState) => {
    setIsTransitioning(true);
    triggerHaptic(15);
    setTimeout(() => {
      setView(nextView);
      setIsTransitioning(false);
    }, 600);
  };

  useEffect(() => {
    const activeSession = localStorage.getItem('lifequest_active_user');
    if (activeSession) {
      loadUserData(activeSession);
      setView('app');
    }
  }, []);

  const loadUserData = (signature: string) => {
    const savedStats = localStorage.getItem(`lifequest_stats_${signature}`);
    const savedQuests = localStorage.getItem(`lifequest_history_${signature}`);
    
    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedQuests) setQuests(JSON.parse(savedQuests));
    setUserSignature(signature);
    localStorage.setItem('lifequest_active_user', signature);
    prevLevel.current = savedStats ? JSON.parse(savedStats).level : 1;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userSignature.trim().length < 3) return;
    loadUserData(userSignature.trim());
    navigateTo('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('lifequest_active_user');
    navigateTo('landing');
    setQuests([]);
    setStats({ level: 1, xp: 0, maxXp: 100, title: "El Buscador" });
    setUserSignature('');
  };

  const worldName = useMemo(() => {
    const worlds = ["El Vacío Primordial", "El Jardín de los Ecos", "El Santuario de Cristal", "La Ciudad de las Estrellas"];
    return worlds[evolutionStage - 1];
  }, [evolutionStage]);

  const startPomodoro = (mode: 'work' | 'break') => {
    setTimerMode(mode);
    setTimerSeconds(mode === 'work' ? 25 * 60 : 5 * 60);
    setIsTimerRunning(true);
    triggerHaptic(20);
  };

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (timerMode === 'work') {
          triggerHaptic([100, 200, 100]);
          addXp(20);
          startPomodoro('break');
      } else {
          setTimerMode('none');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode]);

  const addXp = (amount: number) => {
    const id = generateId();
    setXpPopups(prev => [...prev, {id, amount}]);
    setTimeout(() => {
      setXpPopups(prev => prev.filter(p => p.id !== id));
    }, 2000);

    setStats(prev => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let newMaxXp = prev.maxXp;
      
      while (newXp >= newMaxXp) {
        newLevel += 1;
        newXp -= newMaxXp;
        newMaxXp = Math.floor(100 * Math.pow(1.15, newLevel - 1));
      }
      
      const titles = ["El Buscador", "Novicio de Luz", "Adepto del Enfoque", "Pionero", "Centinela del Hábito", "Maestro de Disciplina", "Gran Arquitecto del Ser", "Espíritu Ascendido"];
      return { 
        ...prev, 
        level: newLevel, 
        xp: newXp, 
        maxXp: newMaxXp, 
        title: titles[Math.min(newLevel - 1, titles.length - 1)] 
      };
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (userSignature) {
      localStorage.setItem(`lifequest_stats_${userSignature}`, JSON.stringify(stats));
      localStorage.setItem(`lifequest_history_${userSignature}`, JSON.stringify(quests));
    }
  }, [stats, quests, userSignature]);

  useEffect(() => {
    if (stats.level > prevLevel.current) {
        setIsLevelingUp(true);
        triggerHaptic([50, 150, 50]);
        if (Math.floor((stats.level-1)/5) > Math.floor((prevLevel.current-1)/5)) {
            setIsEvolving(true);
            setTimeout(() => setIsEvolving(false), 3000);
        }
        setTimeout(() => setIsLevelingUp(false), 2500);
        prevLevel.current = stats.level;
    }
  }, [stats.level]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const handleConquest = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setInputValue('');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza este logro del usuario: "${trimmed}". 
        RPG Zen. Rango (S, A, B, C, D) y XP (20-100). 
        Formato JSON: {rank, xp, title, summary, auraColor, iconHtml}.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rank: { type: Type.STRING },
                        xp: { type: Type.NUMBER },
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        auraColor: { type: Type.STRING },
                        iconHtml: { type: Type.STRING }
                    },
                    required: ['rank', 'xp', 'title', 'summary', 'auraColor', 'iconHtml']
                }
            }
        });
        const data = JSON.parse(response.text || '{}');
        const xpAmount = data.xp || 25;
        
        const newQuest: Quest = {
            id: generateId(),
            timestamp: Date.now(),
            input: trimmed,
            title: data.title || "Ritual de Paso",
            summary: data.summary || "Tu espíritu se fortalece.",
            rank: (data.rank as any) || 'C',
            xpAwarded: xpAmount,
            auraColor: data.auraColor || '#d4af37',
            iconHtml: data.iconHtml || '✨'
        };
        
        triggerHaptic(40);
        setQuests(prev => [...prev, newQuest]);
        addXp(xpAmount);

        if (scrollRef.current) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
    } catch (e) { 
      setInputValue(trimmed);
      console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  const renderView = () => {
    if (view === 'landing') return (
      <div className="landing-view">
          <div className="landing-content glass-effect">
              <header className="landing-header">
                  <span className="landing-badge">MÉTODO ZEN</span>
                  <h1 className="landing-title">El Viajero</h1>
                  <p className="landing-tagline">Convierte tu disciplina en luz.</p>
              </header>
              <div className="landing-features">
                  <div className="feature"><TimerIcon /><h3>Enfoque</h3></div>
                  <div className="feature"><SparklesIcon /><h3>Ascensión</h3></div>
                  <div className="feature"><GridIcon /><h3>Vínculo</h3></div>
              </div>
              <button className="landing-cta" onClick={() => navigateTo('auth')}>Sintonizar Mi Alma</button>
          </div>
      </div>
    );

    if (view === 'auth') return (
      <div className="auth-view">
        <form className="auth-card glass-effect" onSubmit={handleLogin}>
          <div className="auth-header">
            <h2>Signatura de Alma</h2>
            <p>Introduce tu nombre astral.</p>
          </div>
          <input 
            autoFocus
            type="text" 
            placeholder="Ej: ZenMaster" 
            value={userSignature} 
            onChange={(e) => setUserSignature(e.target.value)}
            className="auth-input"
          />
          <div className="auth-actions">
            <button type="submit" className="auth-submit" disabled={userSignature.length < 3}>Vincular</button>
            <button type="button" className="auth-back" onClick={() => navigateTo('landing')}>Volver</button>
          </div>
        </form>
      </div>
    );

    return (
      <div className={`lifequest-app world-stage-${evolutionStage} mode-${timerMode}`}>
          <header className="player-header">
              <div className="player-info">
                  <div className="player-rank-tag">LV {stats.level}</div>
                  <div className="player-title-box">
                      <h2 className="player-name">{userSignature}</h2>
                      <p className="player-subtitle">{stats.title}</p>
                  </div>
              </div>
              <div className="header-actions">
                  <button 
                      className={`ritual-trigger-btn ${timerMode !== 'none' ? 'active' : ''}`} 
                      onClick={() => timerMode === 'none' ? startPomodoro('work') : setTimerMode('none')}
                  >
                      <TimerIcon />
                      {timerMode !== 'none' && <span className="timer-display">{formatTime(timerSeconds)}</span>}
                  </button>
                  <button className="header-btn" onClick={() => setIsAdminOpen(true)}>
                      <SettingsIcon />
                  </button>
              </div>
              <div className="xp-track">
                  <div className="xp-bar-fill" style={{ width: `${(stats.xp / stats.maxXp) * 100}%` }}></div>
              </div>
          </header>

          <main className="spirit-stage">
              <div className="world-header">
                 <h1 className="world-title-fluid">{timerMode !== 'none' ? timerMode.toUpperCase() : worldName}</h1>
              </div>

              <div className={`spirit-avatar evolution-${evolutionStage} ${isLevelingUp ? 'level-up-flash' : ''} ${isEvolving ? 'evolution-burst' : ''}`}>
                  <div className="spirit-core"></div>
                  <div className="spirit-pulse-fluid"></div>
                  {evolutionStage >= 2 && <div className="spirit-orbit ring-1"></div>}
                  {evolutionStage >= 3 && <div className="spirit-orbit ring-2"></div>}
                  {evolutionStage >= 4 && <div className="spirit-divine"></div>}
                  
                  {xpPopups.map(popup => (
                    <div key={popup.id} className="xp-popup">+{popup.amount} XP</div>
                  ))}
              </div>

              <div className="scroll-history-pro" ref={scrollRef}>
                  {quests.length === 0 && !isLoading && (
                      <div className="empty-state">
                          <p>El silencio precede a la creación.</p>
                      </div>
                  )}
                  {quests.slice().reverse().map(quest => (
                      <div key={quest.id} className="quest-card-pro glass-effect" style={{"--aura": quest.auraColor} as any}>
                          <div className="quest-icon" dangerouslySetInnerHTML={{ __html: quest.iconHtml }} />
                          <div className="quest-content">
                              <div className="quest-meta">
                                  <span className="rank-badge">{quest.rank}</span>
                                  <h3 className="quest-label">{quest.title}</h3>
                                  <span className="xp-badge">+{quest.xpAwarded}</span>
                              </div>
                              <p className="quest-desc">{quest.summary}</p>
                          </div>
                      </div>
                  ))}
                  {isLoading && (
                      <div className="quest-loading">
                          <ThinkingIcon />
                          <span>Evaluando voluntad...</span>
                      </div>
                  )}
              </div>
          </main>

          <footer className="action-hub-pro">
              <div className={`input-vessel-pro glass-effect ${isLoading ? 'loading' : ''}`}>
                  <input 
                    ref={inputRef} 
                    type="text" 
                    placeholder=" " 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConquest();
                      if (e.key === 'Tab' && !inputValue) {
                        e.preventDefault();
                        setInputValue(placeholders[placeholderIndex]);
                      }
                    }} 
                    disabled={isLoading} 
                  />
                  <div className="input-hint">{placeholders[placeholderIndex]}</div>
                  <button className="send-btn" onClick={handleConquest} disabled={isLoading || !inputValue.trim()}>
                      <ArrowUpIcon />
                  </button>
              </div>
          </footer>

          <SideDrawer isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} title="Configuración">
              <div className="settings-panel">
                  <div className="settings-group">
                      <h4>Viajero</h4>
                      <p>{userSignature}</p>
                      <button className="logout-btn-pro" onClick={handleLogout}>Cerrar Sesión</button>
                  </div>
                  <div className="settings-group danger">
                      <button className="reset-btn-pro" onClick={() => { if(confirm("¿Reiniciar?")) { localStorage.clear(); window.location.reload(); } }}>Borrar Todo</button>
                  </div>
              </div>
          </SideDrawer>
      </div>
    );
  };

  return (
    <div className={`main-wrapper ${isTransitioning ? 'blur-transition' : ''}`}>
      <div className="bg-container">
        <DottedGlowBackground 
            key={`global-bg-${evolutionStage}-${timerMode}`}
            color={timerMode === 'work' ? "rgba(212,175,55,0.03)" : worldColors.color} 
            glowColor={timerMode === 'work' ? "rgba(212,175,55,0.12)" : worldColors.glow} 
            evolutionStage={evolutionStage}
            opacity={0.7}
        />
      </div>
      {renderView()}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
