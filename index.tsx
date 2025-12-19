
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { Quest, UserStats } from './types';
import { INITIAL_PLACEHOLDERS, PLAYER_TITLES } from './constants';
import { generateId, triggerHaptic } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    ThinkingIcon, 
    SparklesIcon, 
    ArrowUpIcon,
    CodeIcon,
    GridIcon,
    TimerIcon
} from './components/Icons';

function App() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('lifequest_stats');
    return saved ? JSON.parse(saved) : {
      level: 1,
      xp: 0,
      maxXp: 100,
      title: "El Buscador"
    };
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLevelingUp, setIsLevelingUp] = useState<boolean>(false);
  const [isEvolving, setIsEvolving] = useState<boolean>(false);
  const [isSyncOpen, setIsSyncOpen] = useState<boolean>(false);
  const [syncCode, setSyncCode] = useState<string>('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
  
  // Pomodoro States
  const [timerMode, setTimerMode] = useState<'none' | 'work' | 'break'>('none');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef<number>(stats.level);

  // Evolución y Mundos
  const evolutionStage = useMemo(() => {
    if (stats.level >= 15) return 4;
    if (stats.level >= 10) return 3;
    if (stats.level >= 5) return 2;
    return 1;
  }, [stats.level]);

  const prevStage = useRef<number>(evolutionStage);

  const worldName = useMemo(() => {
    const worlds = ["El Vacío Primordial", "El Jardín de los Ecos", "El Santuario de Cristal", "La Ciudad de las Estrellas"];
    return worlds[evolutionStage - 1];
  }, [evolutionStage]);

  const worldColors = useMemo(() => {
    const palettes = [
        { color: "rgba(255,255,255,0.05)", glow: "rgba(255,255,255,0.1)" },
        { color: "rgba(100,255,150,0.05)", glow: "rgba(100,255,150,0.2)" },
        { color: "rgba(100,200,255,0.05)", glow: "rgba(100,200,255,0.2)" },
        { color: "rgba(255,215,100,0.05)", glow: "rgba(255,215,100,0.3)" }
    ];
    return palettes[evolutionStage - 1];
  }, [evolutionStage]);

  // Pomodoro Logic
  const startPomodoro = (mode: 'work' | 'break') => {
    setTimerMode(mode);
    setTimerSeconds(mode === 'work' ? 25 * 60 : 5 * 60);
    setIsTimerRunning(true);
    triggerHaptic(20);
  };

  const stopPomodoro = () => {
    setIsTimerRunning(false);
    setTimerMode('none');
    setTimerSeconds(0);
  };

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      const finishedMode = timerMode;
      
      if (finishedMode === 'work') {
          triggerHaptic([100, 200, 100, 200, 500]);
          setStats(prev => {
              let newXp = prev.xp + 5;
              let newLevel = prev.level;
              let newMaxXp = prev.maxXp;
              if (newXp >= prev.maxXp) { newLevel += 1; newXp -= prev.maxXp; newMaxXp = Math.floor(prev.maxXp * 1.2); }
              return {...prev, level: newLevel, xp: newXp, maxXp: newMaxXp};
          });
          startPomodoro('break');
      } else {
          triggerHaptic([300, 100, 300]);
          setTimerMode('none');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync Handling
  const generateSoulFragment = () => {
    const data = { stats, quests };
    const blob = btoa(encodeURIComponent(JSON.stringify(data)));
    setSyncCode(blob);
  };

  const importSoulFragment = () => {
    try {
        const decoded = JSON.parse(decodeURIComponent(atob(syncCode)));
        if (decoded.stats && decoded.quests) {
            setStats(decoded.stats);
            setQuests(decoded.quests);
            triggerHaptic([100, 50, 100]);
            setIsSyncOpen(false);
            setSyncCode('');
        }
    } catch (e) {
        alert("El Código del Espíritu no es válido.");
    }
  };

  useEffect(() => {
    if (stats.level > prevLevel.current) {
        setIsLevelingUp(true);
        triggerHaptic([50, 30, 50, 30, 100]);
        
        // Detectar si el nivel nuevo implica un cambio de plano
        if (evolutionStage > prevStage.current) {
            setIsEvolving(true);
            triggerHaptic([200, 100, 200, 100, 500]);
            setTimeout(() => setIsEvolving(false), 3000);
        }

        const timer = setTimeout(() => setIsLevelingUp(false), 2500);
        prevLevel.current = stats.level;
        prevStage.current = evolutionStage;
        return () => clearTimeout(timer);
    }
  }, [stats.level, evolutionStage]);

  useEffect(() => {
    localStorage.setItem('lifequest_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    const savedQuests = localStorage.getItem('lifequest_history');
    if (savedQuests) setQuests(JSON.parse(savedQuests));
  }, []);

  useEffect(() => {
    localStorage.setItem('lifequest_history', JSON.stringify(quests));
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [quests]);

  useEffect(() => {
      const interval = setInterval(() => {
          setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
      }, 4000);
      return () => clearInterval(interval);
  }, [placeholders.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);

  const handleConquest = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setInputValue('');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza este logro: "${trimmed}". RPG Zen. Rango (E-S), XP (15-60), Título poético ES, Resumen ES, Aura hex, Icono RAW HTML/CSS. Solo JSON.`;
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
        const newQuest: Quest = {
            id: generateId(),
            timestamp: Date.now(),
            input: trimmed,
            title: data.title || "Ritual Diario",
            summary: data.summary || "Un paso hacia la maestría.",
            rank: (data.rank as any) || 'D',
            xpAwarded: data.xp || 20,
            auraColor: data.auraColor || '#ffffff',
            iconHtml: data.iconHtml || '<div></div>'
        };
        triggerHaptic(40);
        setQuests(prev => [...prev, newQuest]);
        setStats(prev => {
            let newXp = prev.xp + newQuest.xpAwarded;
            let newLevel = prev.level;
            let newMaxXp = prev.maxXp;
            if (newXp >= prev.maxXp) { newLevel += 1; newXp -= prev.maxXp; newMaxXp = Math.floor(prev.maxXp * 1.2); }
            const titles = ["El Buscador", "Novicio de Luz", "Adepto del Enfoque", "Pionero", "Centinela del Hábito", "Maestro de Disciplina", "Gran Arquitecto del Ser", "Espíritu Ascendido"];
            return { ...prev, level: newLevel, xp: newXp, maxXp: newMaxXp, title: titles[Math.min(newLevel - 1, titles.length - 1)] };
        });
    } catch (e) { console.error(e); } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputValue, isLoading, stats]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConquest();
    if (e.key === 'Tab' && !inputValue) {
        e.preventDefault();
        setInputValue(placeholders[placeholderIndex]);
        triggerHaptic(10);
    }
  };

  return (
    <div className={`lifequest-app world-stage-${evolutionStage} mode-${timerMode}`}>
        <DottedGlowBackground 
            key={`bg-${evolutionStage}-${timerMode}`}
            gap={evolutionStage === 4 ? 40 : 32} 
            radius={evolutionStage === 1 ? 1 : 2} 
            color={timerMode === 'work' ? "rgba(212,175,55,0.05)" : worldColors.color} 
            glowColor={timerMode === 'work' ? "rgba(212,175,55,0.2)" : worldColors.glow} 
            speedScale={(0.2 + (evolutionStage * 0.1)) * (timerMode === 'break' ? 0.5 : 1)} 
            evolutionStage={evolutionStage}
        />

        <div className="world-announcement">
            <span className="world-label">Plano Actual</span>
            <h1 className="world-title">{timerMode !== 'none' ? (timerMode === 'work' ? 'Estado de Enfoque' : 'Estado de Descanso') : worldName}</h1>
        </div>

        <header className="player-header">
            <div className="player-info">
                <span className="player-rank-tag">NIVEL {stats.level}</span>
                <div className="player-title-box">
                    <h2 className="player-name">El Viajero</h2>
                    <p className="player-subtitle">{stats.title}</p>
                </div>
            </div>
            <div className="header-actions">
                <button 
                    className={`ritual-trigger-btn ${timerMode !== 'none' ? 'active' : ''}`} 
                    onClick={() => timerMode === 'none' ? startPomodoro('work') : stopPomodoro()}
                    title="Ritual de Enfoque"
                >
                    <TimerIcon />
                    {timerMode !== 'none' && <span className="timer-display">{formatTime(timerSeconds)}</span>}
                </button>
                <button className="sync-trigger-btn" onClick={() => setIsSyncOpen(true)}>
                    <GridIcon />
                </button>
                <div className="xp-container">
                    <div className="xp-bar">
                        <div className="xp-fill" style={{ width: `${(stats.xp / stats.maxXp) * 100}%` }}></div>
                    </div>
                    <span className="xp-text">{stats.xp} / {stats.maxXp} XP</span>
                </div>
            </div>
        </header>

        <main className="spirit-stage">
            <div className={`spirit-avatar evolution-${evolutionStage} ${isLevelingUp ? 'level-up-flash' : ''} ${isEvolving ? 'evolution-burst' : ''} timer-${timerMode}`} style={{ 
                boxShadow: `0 0 100px -30px ${quests[quests.length - 1]?.auraColor || 'rgba(255,255,255,0.1)'}`,
                border: `1px solid ${quests[quests.length - 1]?.auraColor || 'rgba(255,255,255,0.05)'}`
            }}>
                <div className="spirit-core"></div>
                {evolutionStage >= 2 && <div className="spirit-ring ring-1"></div>}
                {evolutionStage >= 3 && <div className="spirit-ring ring-2"></div>}
                {evolutionStage >= 4 && <div className="spirit-geometry"></div>}
                <div className="spirit-pulse"></div>
                
                {timerMode !== 'none' && (
                    <svg className="timer-ring-svg">
                        <circle 
                            className="timer-ring-circle"
                            cx="70" cy="70" r="68"
                            style={{ 
                                strokeDashoffset: 427 - (427 * (timerSeconds / (timerMode === 'work' ? 25*60 : 5*60)))
                            }}
                        />
                    </svg>
                )}
            </div>

            <div className="scroll-history" ref={scrollRef}>
                {quests.length === 0 && !isLoading && (
                    <div className="empty-history">
                        <p>Tu viaje comienza con un solo paso.</p>
                        <span>Completa una misión para despertar tu espíritu.</span>
                    </div>
                )}
                {quests.map(quest => (
                    <div key={quest.id} className="quest-card">
                        <div className="quest-icon-box" dangerouslySetInnerHTML={{ __html: quest.iconHtml }} />
                        <div className="quest-details">
                            <div className="quest-top">
                                <span className="quest-rank">{quest.rank}</span>
                                <h3 className="quest-title">{quest.title}</h3>
                                <span className="quest-xp">+{quest.xpAwarded} XP</span>
                            </div>
                            <p className="quest-summary">{quest.summary}</p>
                            <span className="quest-input-meta">"{quest.input}"</span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="quest-card loading">
                        <ThinkingIcon />
                        <span>Evaluando tu disciplina...</span>
                    </div>
                )}
            </div>
        </main>

        <footer className="action-hub">
            <div className={`input-vessel ${isLoading ? 'locked' : ''}`}>
                {!inputValue && !isLoading && (
                    <div className="action-placeholder">
                        <span className="placeholder-txt">{placeholders[placeholderIndex]}</span>
                        <span className="hint">Tab para aceptar</span>
                    </div>
                )}
                <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} disabled={isLoading} />
                <button className="conquer-btn" onClick={handleConquest} disabled={isLoading || !inputValue.trim()}>
                    <ArrowUpIcon />
                </button>
            </div>
            <p className="input-prompt">¿Qué has conquistado hoy?</p>
        </footer>

        <SideDrawer isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} title="Vincular Espíritu">
            <div className="sync-drawer-content">
                <p className="sync-description">Lleva tu progreso a cualquier dispositivo mediante un Fragmento de Alma.</p>
                <div className="sync-section">
                    <h3>Generar Fragmento</h3>
                    <p>Obtén el código actual para copiarlo en otro lugar.</p>
                    <button className="sync-action-btn gold" onClick={generateSoulFragment}>Crear Fragmento</button>
                </div>
                <div className="sync-section">
                    <h3>Inyectar Fragmento</h3>
                    <p>Pega un código de otro dispositivo para sincronizar.</p>
                    <textarea 
                        className="sync-textarea" 
                        placeholder="Pega tu código aquí..."
                        value={syncCode}
                        onChange={(e) => setSyncCode(e.target.value)}
                    ></textarea>
                    <button className="sync-action-btn" onClick={importSoulFragment} disabled={!syncCode.trim()}>Vincular Progreso</button>
                </div>
            </div>
        </SideDrawer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
