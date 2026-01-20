import React, { useState, useEffect, useRef } from 'react';
import Uploader from './Uploader';
import StatsBar from './StatsBar';
import Viewer from './Viewer';
import { PWAGenerator } from './PWAGenerator';
import * as storage from '../services/storageService';
import { AppStatus, Project } from '../types';
import { LoaderIcon, CheckCircleIcon, SparklesIcon, CloudSyncIcon, PlusIcon, XIcon } from './Icons';
import { useProjectProcessor } from '../hooks/useProjectProcessor';

const MonofileApp: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
        terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await storage.getAllProjects();
        if (stored && stored.length > 0) {
          setProjects(stored);
          setActiveProjectId(stored[0].id);
        }
      } catch (err) {
        console.error("Storage offline", err);
      }
    };
    loadData();
  }, []);

  const createNewProject = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newProject: Project = {
      id: newId,
      name: `Project_${projects.length + 1}`,
      status: AppStatus.IDLE,
      stats: null,
      knowledgeBridgeEnabled: false,
      outputs: { flattened: '', summary: '', aiContext: '', concepts: [] },
      createdAt: Date.now()
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newId);
    setLogs([]);
    setIsSynced(false);
    storage.saveProject(newProject);
  };

  const updateActiveProject = async (updates: Partial<Project>) => {
    if (!activeProjectId) return;
    setProjects(prev => {
      const updated = prev.map(p => p.id === activeProjectId ? { ...p, ...updates } : p);
      const active = updated.find(p => p.id === activeProjectId);
      if (active) storage.saveProject(active);
      return updated;
    });
  };

  const { handleFilesSelected, handleCloudSync, isSyncing } = useProjectProcessor({
    activeProject,
    updateActiveProject,
    addLog,
    setLogs,
    setIsSynced
  });

  const closeProject = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    await storage.deleteProject(id);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects.length > 0 ? newProjects[0].id : null);
    }
  };

  if (projects.length === 0 && !showPWAModal) {
    return (
      <div className="w-full flex flex-col items-center justify-center pt-32 px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="text-8xl font-black tracking-tighter text-white mb-6 text-gradient-animate">MONOFILE</h1>
            <p className="text-zinc-500 max-w-sm mx-auto uppercase tracking-[0.4em] text-[10px] font-black">Environment Manager</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-8">
            <button onClick={createNewProject} className="group flex items-center gap-8 px-14 py-10 bg-zinc-900 border border-zinc-800 rounded-[3.5rem] hover:border-indigo-500/50 transition-all duration-700 shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><PlusIcon /></div>
              <div className="text-left"><h3 className="text-2xl font-black text-white uppercase tracking-widest">Establish Env</h3><p className="text-sm text-zinc-500 font-bold uppercase">New project partition</p></div>
            </button>
            <button onClick={() => setShowPWAModal(true)} className="group flex items-center gap-8 px-14 py-10 bg-zinc-900 border border-zinc-800 rounded-[3.5rem] hover:border-emerald-500/50 transition-all duration-700 shadow-2xl hover:-translate-y-2">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><SparklesIcon /></div>
              <div className="text-left"><h3 className="text-2xl font-black text-white uppercase tracking-widest">PWA Architect</h3><p className="text-sm text-zinc-500 font-bold uppercase">Asset stack generator</p></div>
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center relative min-h-screen">
      {showPWAModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <PWAGenerator onClose={() => setShowPWAModal(false)} initialName={activeProject?.name} />
            </div>
        </div>
      )}

      <div className="w-full max-w-6xl mt-12 mb-10 px-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
           <button onClick={() => setShowPWAModal(true)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${showPWAModal ? 'bg-zinc-900 border-emerald-500/50 text-emerald-400' : 'bg-black border-zinc-800 text-zinc-500'}`}><SparklesIcon /><span className="text-[10px] font-black uppercase tracking-widest">PWA Architect</span></button>
           {projects.map(p => (
             <div key={p.id} onClick={() => { setActiveProjectId(p.id); setShowPWAModal(false); }} className={`group flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all cursor-pointer ${activeProjectId === p.id && !showPWAModal ? 'bg-zinc-900 border-indigo-500/50 text-white shadow-xl' : 'bg-black border-zinc-800 text-zinc-500'}`}>
               <span className={`w-2 h-2 rounded-full ${p.status === AppStatus.COMPLETE ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
               <span className="text-[10px] font-black uppercase truncate max-w-[140px]">{p.name}</span>
               <button onClick={(e) => closeProject(p.id, e)} className="opacity-40 group-hover:opacity-100 hover:text-red-400 p-1"><XIcon size={14} /></button>
             </div>
           ))}
           <button onClick={createNewProject} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"><PlusIcon /></button>
        </div>
      </div>

      <main className="w-full max-w-6xl z-10 flex flex-col items-center pb-24 px-4">
        {activeProject && (
          <>
            {activeProject.status === AppStatus.IDLE && (
              <div className="w-full py-12 animate-fade-in">
                <div className="text-center mb-16 relative">
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">{activeProject.name}</h2>
                  <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">Provide codebase for extraction</p>
                </div>
                <Uploader onFilesSelected={handleFilesSelected} isProcessing={false} />
              </div>
            )}
            {(activeProject.status === AppStatus.PARSING || activeProject.status === AppStatus.PROCESSING_AI) && (
              <div className="w-full max-w-3xl pt-16">
                <div className="bg-black border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="bg-zinc-900/80 px-6 py-4 border-b border-zinc-800 flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase">
                        <span>Ingestion_Protocol_${activeProject.name.toLowerCase()}.log</span>
                    </div>
                    <div className="h-80 p-8 font-mono text-xs overflow-y-auto space-y-2 bg-[#050505] custom-scrollbar">
                        {logs.map((log, i) => <div key={i} className={`flex gap-3 ${log.includes('!') ? 'text-amber-500/80' : 'text-zinc-500'}`}><span className="text-indigo-500/50 font-bold">>>></span><span className="flex-1">{log}</span></div>)}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            </div>
            )}
            {activeProject.status === AppStatus.COMPLETE && activeProject.stats && (
              <div className="w-full animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-12 w-full max-w-5xl mx-auto">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="font-black text-[10px] uppercase">{activeProject.name} Active</span>
                    </div>
                    
                    <button 
                      onClick={handleCloudSync}
                      disabled={isSyncing || isSynced}
                      className={`flex items-center gap-3 px-5 py-2 rounded-full border transition-all ${isSynced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default' : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'}`}
                    >
                      {isSyncing ? <LoaderIcon /> : isSynced ? <CheckCircleIcon /> : <CloudSyncIcon />}
                      <span className="font-black text-[10px] uppercase">{isSyncing ? 'Syncing...' : isSynced ? 'Cloud Synced' : 'Sync to Cloud'}</span>
                    </button>

                    <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 px-5 py-2 rounded-full">
                       <span className="text-[10px] font-black text-zinc-600 uppercase">Bridge</span>
                       <button onClick={() => updateActiveProject({ knowledgeBridgeEnabled: !activeProject.knowledgeBridgeEnabled })} className={`w-10 h-5 rounded-full relative transition-all ${activeProject.knowledgeBridgeEnabled ? 'bg-indigo-600' : 'bg-zinc-800'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${activeProject.knowledgeBridgeEnabled ? 'left-[22px]' : 'left-1'}`}></div></button>
                    </div>
                  </div>
                </div>
                <StatsBar stats={activeProject.stats} />
                <Viewer 
                  outputs={activeProject.outputs} 
                  currentProject={activeProject}
                  otherProjects={projects}
                  onUpdateOutputs={(newOutputs) => updateActiveProject({ outputs: newOutputs })} 
                  onUpdateProject={(p) => updateActiveProject(p)}
                  onOpenPWA={() => setShowPWAModal(true)}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MonofileApp;
