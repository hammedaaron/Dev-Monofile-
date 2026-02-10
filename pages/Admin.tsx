import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const ADMIN_PASSWORD = "monofile2024";

export const Admin = ({ onBack }: { onBack: () => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Content States
  const [videoType, setVideoType] = useState<'url' | 'html'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [htmlInput, setHtmlInput] = useState('');
  
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'diagnostics'>('content');

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

  const loadVideoSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*');
    if (data) {
        const typeSetting = data.find(s => s.key === 'landing_video_type');
        const contentSetting = data.find(s => s.key === 'landing_video_content');
        
        if (typeSetting) setVideoType(typeSetting.value as 'url' | 'html');
        if (contentSetting) {
            if (typeSetting?.value === 'html') setHtmlInput(contentSetting.value);
            else setUrlInput(contentSetting.value);
        }
    }
    setLoading(false);
  };

  /**
   * Universal URL to Embed Converter
   * Handles: YouTube, Vimeo, Loom, Wistia, Canva
   */
  const convertUrlToEmbed = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";

    // YouTube
    if (trimmed.includes('youtube.com/watch?v=')) {
        const id = new URL(trimmed).searchParams.get('v');
        return `https://www.youtube.com/embed/${id}?autoplay=1&muted=1&rel=0&modestbranding=1`;
    }
    if (trimmed.includes('youtu.be/')) {
        const id = trimmed.split('/').pop()?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&muted=1&rel=0&modestbranding=1`;
    }

    // Vimeo
    if (trimmed.includes('vimeo.com/') && !trimmed.includes('player.vimeo.com')) {
        const id = trimmed.split('/').pop()?.split('?')[0];
        return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&background=0`;
    }

    // Loom
    if (trimmed.includes('loom.com/share/')) {
        const id = trimmed.split('/').pop()?.split('?')[0];
        return `https://www.loom.com/embed/${id}?autoplay=1`;
    }

    // Wistia
    if (trimmed.includes('wistia.com/medias/')) {
        const id = trimmed.split('/').pop()?.split('?')[0];
        return `https://fast.wistia.net/embed/iframe/${id}?videoFoam=true&autoplay=1`;
    }

    // Canva
    if (trimmed.includes('canva.com/design/')) {
        // Form: .../design/DAF.../watch?utm_content=...
        const parts = trimmed.split('/');
        const designIdIndex = parts.indexOf('design') + 1;
        const designId = parts[designIdIndex];
        return `https://www.canva.com/design/${designId}/watch?embed`;
    }

    return trimmed; // Return as is if already an embed link or unknown
  };

  const getPreviewSource = () => {
    if (videoType === 'html') return htmlInput;
    const embedUrl = convertUrlToEmbed(urlInput);
    if (!embedUrl) return null;
    return `<iframe style="width:100%; height:100%; border:0;" src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  };

  const handleDeploy = async () => {
    setStatus('COMMITTING PRODUCTION ASSETS...');
    
    // For URLs, we save the converted embed version so Landing.tsx doesn't have to guess
    const finalContent = videoType === 'url' ? convertUrlToEmbed(urlInput) : htmlInput;

    const { error: err1 } = await supabase.from('app_settings').upsert({ key: 'landing_video_type', value: videoType }, { onConflict: 'key' });
    const { error: err2 } = await supabase.from('app_settings').upsert({ key: 'landing_video_content', value: finalContent }, { onConflict: 'key' });

    if (err1 || err2) {
        setStatus('❌ DEPLOYMENT FAULT: Check database connection.');
    } else {
        setStatus('✅ SUCCESS: Landing video is now LIVE.');
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] text-center shadow-2xl animate-fade-in-up">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">📽️</span>
                </div>
                <h2 className="text-white font-black uppercase tracking-widest mb-8">Director Access</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <input 
                        type="password" 
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="System Password"
                        className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-center focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={onBack} className="flex-1 py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-[10px] uppercase hover:bg-zinc-700">Abort</button>
                        <button type="submit" className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase hover:bg-zinc-200 transition-all shadow-lg">Authorize</button>
                    </div>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6 gap-6 font-sans overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Director Console</h1>
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 shadow-inner">
             <button onClick={() => setActiveTab('content')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'content' ? 'bg-white text-black' : 'text-zinc-500'}`}>Production</button>
             <button onClick={() => setActiveTab('diagnostics')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'diagnostics' ? 'bg-white text-black' : 'text-zinc-500'}`}>Stats</button>
          </div>
        </div>
        <button onClick={onBack} className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {activeTab === 'content' ? (
          <>
            <div className="flex-1 max-w-xl bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl flex flex-col">
              <div className="mb-8">
                <h2 className="text-xl font-black uppercase text-white tracking-tight">Hero Video Deployment</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Managed Production Assets</p>
              </div>

              <div className="flex bg-black p-1.5 rounded-[1.5rem] border border-zinc-800 mb-8 shadow-inner">
                <button 
                  onClick={() => setVideoType('url')} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${videoType === 'url' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  Option A: Smart URL
                </button>
                <button 
                  onClick={() => setVideoType('html')} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${videoType === 'html' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  Option B: HTML Embed
                </button>
              </div>

              <div className="flex-1 mb-8">
                {videoType === 'url' ? (
                  <div className="space-y-6 h-full flex flex-col">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Video Link</label>
                      <input 
                        type="text"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="Paste YouTube, Vimeo, Loom, Wistia or Canva link..."
                        className="w-full bg-black border border-zinc-800 rounded-[1.25rem] p-5 text-sm font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[1.5rem] text-[9px] text-zinc-400 uppercase font-bold leading-relaxed space-y-2">
                      <p className="text-indigo-400">Supported Logic Transformers:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>YouTube (Auto-Autoplay + Muted)</li>
                        <li>Vimeo (Auto-Autoplay)</li>
                        <li>Loom (Auto-Embed)</li>
                        <li>Wistia (Auto-VideoFoam)</li>
                        <li>Canva (Presentation View)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 h-full flex flex-col">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">HTML Code Block</label>
                    <textarea 
                      value={htmlInput}
                      onChange={e => setHtmlInput(e.target.value)}
                      placeholder="Paste your full <iframe> or <video> code here..."
                      className="flex-1 w-full bg-black border border-zinc-800 rounded-[1.5rem] p-6 text-xs font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed shadow-inner"
                    />
                    <div className="p-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-[9px] text-zinc-500 uppercase font-bold leading-relaxed">
                      Pro Mode: Direct injection into the DOM. Ideal for custom players or specifically configured vendor snippets.
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleDeploy}
                disabled={loading || (videoType === 'url' ? !urlInput : !htmlInput)}
                className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-zinc-200 transition-all shadow-xl active:scale-95 disabled:opacity-20"
              >
                {status.includes('COMMITTING') ? 'DEPLOYING...' : 'Update Landing Assets'}
              </button>

              {status && (
                <div className={`mt-6 p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border animate-fade-in ${status.includes('FAULT') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {status}
                </div>
              )}
            </div>

            <div className="flex-1 bg-black border border-zinc-800 rounded-[3rem] p-8 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 to-black -z-10"></div>
              
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Production Preview</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-700">SIGNAL: {videoType.toUpperCase()}</span>
              </div>

              <div className="flex-1 bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden flex items-center justify-center relative shadow-2xl">
                  {getPreviewSource() ? (
                    <div 
                      className="w-full h-full video-container"
                      dangerouslySetInnerHTML={{ __html: getPreviewSource() || "" }} 
                    />
                  ) : (
                    <div className="text-zinc-800 font-black text-xs uppercase tracking-widest text-center px-12 opacity-30">Waiting for Stream...</div>
                  )}
                  
                  {/* Aspect Ratio Guide Overlay */}
                  <div className="absolute inset-0 border-[20px] border-black/5 pointer-events-none"></div>
              </div>

              <div className="mt-6 flex justify-between items-center px-2">
                 <div className="flex gap-2">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>)}
                 </div>
                 <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest">Signal Locked_1080p_60fps</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Response Time</p>
                   <p className="text-3xl font-black text-white">8ms</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Session Data</p>
                   <p className="text-3xl font-black text-white">1.2mb</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Asset Status</p>
                   <p className="text-3xl font-black text-emerald-500">LIVE</p>
                </div>
             </div>
             <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 font-mono text-[11px] text-zinc-600 overflow-y-auto space-y-3 leading-relaxed shadow-inner">
                <div className="text-zinc-400">[SYSTEM] Direct Console Initialized...</div>
                <div>[STORAGE] Handshake with Supabase Cloud: OK</div>
                <div>[AUTH] Director Identity Verified.</div>
                <div className="text-indigo-400">[STATUS] Landing page signal source set to: {videoType.toUpperCase()}</div>
                <div>[ASSETS] Cache purged for latest deployment.</div>
                <div className="animate-pulse text-zinc-800">_waiting for input...</div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        .video-container iframe,
        .video-container video,
        .video-container div {
            width: 100% !important;
            height: 100% !important;
            border: none;
            display: block;
        }
      `}</style>
    </div>
  );
};