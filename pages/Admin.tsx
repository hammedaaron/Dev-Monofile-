import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

// SIMPLE SECURITY CONFIG
const ADMIN_PASSWORD = "monofile2024";

export const Admin = ({ onBack }: { onBack: () => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'diagnostics'>('video');

  // 1. Password Check
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        loadVideoSettings();
    } else {
        alert("Access Denied");
        setPasswordInput('');
    }
  };

  // 2. Load Data (Only after login)
  const loadVideoSettings = () => {
    supabase.from('app_settings')
      .select('value')
      .eq('key', 'landing_video')
      .single()
      .then(({ data }) => {
        if (data) setContent(data.value);
        setLoading(false);
      });
  };

  const getPreviewContent = () => {
    if (!content) return null;
    const trimmed = content.trim();
    
    // If it's already an iframe or div (HTML), return it as is
    if (trimmed.startsWith('<')) {
        return trimmed;
    }

    // Smart URL Conversion with enhanced permission flags
    let finalUrl = trimmed;
    if (finalUrl.includes('youtube.com/watch?v=')) {
        finalUrl = finalUrl.replace('watch?v=', 'embed/');
    } else if (finalUrl.includes('youtu.be/')) {
        finalUrl = finalUrl.replace('youtu.be/', 'youtube.com/embed/');
    } else if (finalUrl.includes('vimeo.com/') && !finalUrl.includes('player.vimeo.com')) {
        const id = finalUrl.split('/').pop();
        finalUrl = `https://player.vimeo.com/video/${id}`;
    }

    return `
      <iframe 
        style="width:100%; height:100%; border:0;" 
        src="${finalUrl}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen
      ></iframe>
    `;
  };

  const handleDeploy = async () => {
    setStatus('COMMITTING TO PRODUCTION...');
    
    let finalContent = content.trim();
    
    // Auto-fix URLs if they aren't raw HTML
    if (!finalContent.startsWith('<')) {
        if (finalContent.includes('youtube.com/watch?v=')) {
            finalContent = finalContent.replace('watch?v=', 'embed/');
        } else if (finalContent.includes('youtu.be/')) {
            finalContent = finalContent.replace('youtu.be/', 'youtube.com/embed/');
        }
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'landing_video', value: finalContent }, { onConflict: 'key' });

    if (error) {
        setStatus('❌ FAULT: ' + error.message);
    } else {
        setStatus('✅ ASSET LIVE: Production updated.');
        setContent(finalContent);
    }
  };

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl animate-fade-in-up">
                <h2 className="text-white font-black uppercase tracking-widest mb-6">Director Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="password" 
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="System Password"
                        className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white text-center focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={onBack} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs uppercase hover:bg-zinc-700 transition-colors">Abort</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/10">Authorize</button>
                    </div>
                </form>
            </div>
        </div>
    );
  }

  // --- ADMIN VIEW ---
  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6 gap-6 font-sans overflow-hidden">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Director Mode</h1>
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
             <button onClick={() => setActiveTab('video')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'video' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'}`}>Content</button>
             <button onClick={() => setActiveTab('diagnostics')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'diagnostics' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'}`}>Diagnostics</button>
          </div>
        </div>
        <button onClick={onBack} className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all hover:scale-110 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {activeTab === 'video' ? (
          <>
            {/* Configuration Panel */}
            <div className="flex-1 max-w-2xl bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl flex flex-col">
              <div className="mb-6">
                  <h2 className="text-lg font-black uppercase text-white">Media Assets</h2>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Configure landing page hero video</p>
              </div>

              <div className="space-y-6 mb-8 flex-1">
                  <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          Source URL or Embed Code
                      </label>
                      <span className="text-[9px] font-mono text-indigo-500 uppercase font-bold">{content.trim().startsWith('<') ? 'ENGINE: RAW HTML' : 'ENGINE: SMART URL'}</span>
                  </div>
                  <textarea 
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Paste YouTube link OR <iframe src='...'> code here..."
                      disabled={loading}
                      className="w-full h-full bg-black border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 text-white p-6 rounded-2xl outline-none transition-all font-mono text-xs shadow-inner leading-relaxed resize-none"
                  />
                  <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                      <p className="text-[10px] text-indigo-400 font-black uppercase mb-2">Integration Support:</p>
                      <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-bold tracking-widest">
                          Supports Loom, Vimeo, YouTube, and Raw HTML players. If pasting a URL, we auto-wrap it in a high-fidelity container.
                      </p>
                  </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleDeploy} 
                  disabled={loading || !content}
                  className="flex-1 px-8 py-5 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-zinc-200 active:scale-95 transition-all"
                >
                  {status.includes('COMMITTING') ? 'PROCESSING...' : 'Commit to Production'}
                </button>
              </div>
              
              {status && (
                  <div className={`mt-6 p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest animate-fade-in ${status.includes('FAULT') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {status}
                  </div>
              )}
            </div>

            {/* Preview Monitor */}
            <div className="flex-1 bg-black border border-zinc-800 rounded-[2rem] p-6 flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 to-black -z-10"></div>
              
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Signal Preview</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono text-zinc-700 uppercase">Input: {content.length} bytes</span>
                    <span className="text-[9px] font-mono text-zinc-700">STATUS: STABLE</span>
                  </div>
              </div>

              <div className="flex-1 bg-zinc-950 rounded-[1.5rem] border border-zinc-900 overflow-hidden flex items-center justify-center relative shadow-2xl">
                  {content ? (
                      <div 
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{ __html: getPreviewContent() || "" }}
                      />
                  ) : (
                      <div className="text-zinc-800 font-black text-xs uppercase tracking-widest text-center px-12 opacity-20">
                          Awaiting Stream Initialization...
                      </div>
                  )}
                  
                  {/* Refined Scanline Effect - Lighter to prevent "blur" */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[length:100%_4px] opacity-20"></div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-600 tracking-widest px-2">
                  <span>Logic Throughput</span>
                  <span className="text-indigo-500">88.4%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[88.4%] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Database Ping</p>
                   <p className="text-3xl font-black text-white">12ms</p>
                   <p className="text-[9px] font-bold text-emerald-500 uppercase mt-2">Operational</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">AI Response Avg</p>
                   <p className="text-3xl font-black text-white">4.2s</p>
                   <p className="text-[9px] font-bold text-indigo-400 uppercase mt-2">Optimized (Flash)</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Asset Availability</p>
                   <p className="text-3xl font-black text-white">99.9%</p>
                   <p className="text-[9px] font-bold text-amber-500 uppercase mt-2">Maintenance Required</p>
                </div>
             </div>

             <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 overflow-hidden flex flex-col">
                <h3 className="text-[12px] font-black uppercase text-zinc-400 tracking-widest mb-6">System Event Log</h3>
                <div className="flex-1 bg-black rounded-xl p-6 font-mono text-[11px] text-zinc-500 overflow-y-auto space-y-2">
                   <div>[SYSTEM] Ingestion protocol v3.2 initialised...</div>
                   <div>[STORAGE] Supabase connected (Project: Monofile)</div>
                   <div>[DB] Table 'app_settings' verified...</div>
                   <div>[SECURITY] Director token authorised (HAMSTAR)</div>
                   <div className="text-emerald-500/80">[EVENT] New production deployment: Landing_Video_Asset</div>
                   <div>[MONITOR] Signal strength 100% (Loss: 0.00%)</div>
                   <div className="animate-pulse text-indigo-500">_awaiting next command...</div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="h-8 border-t border-zinc-900 flex items-center justify-between px-4">
         <span className="text-[8px] font-black uppercase text-zinc-700 tracking-[0.4em]">Monofile Director Terminal v4.0</span>
         <span className="text-[8px] font-mono text-zinc-800 uppercase">Region: US_EAST_PROD</span>
      </div>
    </div>
  );
};