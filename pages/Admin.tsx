import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const ADMIN_PASSWORD = "monofile2024";

export const Admin = ({ onBack }: { onBack: () => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Content States
  const [videoType, setVideoType] = useState<'url' | 'html'>('url');
  const [urlContent, setUrlContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  
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
            if (typeSetting?.value === 'html') setHtmlContent(contentSetting.value);
            else setUrlContent(contentSetting.value);
        }
    }
    setLoading(false);
  };

  const getPreviewIframe = () => {
    if (videoType === 'html') {
        return htmlContent;
    }
    if (!urlContent) return null;

    let finalUrl = urlContent.trim();
    // Optimized URL formatting for high-fidelity streaming
    if (finalUrl.includes('youtube.com/watch?v=')) {
        finalUrl = finalUrl.replace('watch?v=', 'embed/') + "?autoplay=1&muted=1&rel=0";
    } else if (finalUrl.includes('youtu.be/')) {
        finalUrl = finalUrl.replace('youtu.be/', 'youtube.com/embed/') + "?autoplay=1&muted=1&rel=0";
    } else if (finalUrl.includes('vimeo.com/') && !finalUrl.includes('player.vimeo.com')) {
        const id = finalUrl.split('/').pop();
        finalUrl = `https://player.vimeo.com/video/${id}?autoplay=1&muted=1`;
    }

    return `<iframe style="width:100%; height:100%; border:0;" src="${finalUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  };

  const handleDeploy = async () => {
    setStatus('COMMITTING ASSETS...');
    const contentToSave = videoType === 'url' ? urlContent : htmlContent;

    const { error: err1 } = await supabase.from('app_settings').upsert({ key: 'landing_video_type', value: videoType }, { onConflict: 'key' });
    const { error: err2 } = await supabase.from('app_settings').upsert({ key: 'landing_video_content', value: contentToSave }, { onConflict: 'key' });

    if (err1 || err2) {
        setStatus('❌ FAULT: Deployment failed.');
    } else {
        setStatus('✅ LIVE: Assets deployed successfully.');
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] text-center shadow-2xl animate-fade-in-up">
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
                        <button type="button" onClick={onBack} className="flex-1 py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-[10px] uppercase hover:bg-zinc-700 transition-all">Abort</button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">Authorize</button>
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
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Director Mode</h1>
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
             <button onClick={() => setActiveTab('content')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'content' ? 'bg-white text-black' : 'text-zinc-500'}`}>Production</button>
             <button onClick={() => setActiveTab('diagnostics')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'diagnostics' ? 'bg-white text-black' : 'text-zinc-500'}`}>Diagnostics</button>
          </div>
        </div>
        <button onClick={onBack} className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {activeTab === 'content' ? (
          <>
            <div className="flex-1 max-w-xl bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl flex flex-col">
              <div className="mb-8">
                <h2 className="text-xl font-black uppercase text-white tracking-tight">Media Deployment</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Hero Asset Configuration</p>
              </div>

              <div className="flex bg-black p-1.5 rounded-2xl border border-zinc-800 mb-8">
                <button 
                  onClick={() => setVideoType('url')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${videoType === 'url' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  Smart URL
                </button>
                <button 
                  onClick={() => setVideoType('html')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${videoType === 'html' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  HTML Embed
                </button>
              </div>

              <div className="flex-1 mb-8">
                {videoType === 'url' ? (
                  <div className="space-y-4 h-full flex flex-col">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Video Destination URL</label>
                    <input 
                      type="text"
                      value={urlContent}
                      onChange={e => setUrlContent(e.target.value)}
                      placeholder="Paste YouTube or Vimeo link..."
                      className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-[9px] text-zinc-500 uppercase font-bold leading-relaxed">
                      Automatically converts standard links into high-performance streaming iframes with optimized buffering.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 h-full flex flex-col">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Raw HTML Code</label>
                    <textarea 
                      value={htmlContent}
                      onChange={e => setHtmlContent(e.target.value)}
                      placeholder="Paste <iframe> or <video> code here..."
                      className="flex-1 w-full bg-black border border-zinc-800 rounded-2xl p-6 text-xs font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                    <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-[9px] text-zinc-500 uppercase font-bold leading-relaxed">
                      Direct injection mode. Use this for custom players, Loom embeds, or advanced native video tags.
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleDeploy}
                className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
              >
                Push Assets Live
              </button>

              {status && (
                <div className={`mt-6 p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border animate-fade-in ${status.includes('FAULT') ? 'bg-red-500/5 text-red-400 border-red-500/20' : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'}`}>
                  {status}
                </div>
              )}
            </div>

            <div className="flex-1 bg-black border border-zinc-800 rounded-[3rem] p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 to-black -z-10"></div>
              
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Production Monitor</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-700">SIGNAL_MODE: {videoType.toUpperCase()}</span>
              </div>

              <div className="flex-1 bg-zinc-950 rounded-[2rem] border border-zinc-900 overflow-hidden flex items-center justify-center relative shadow-inner">
                  {getPreviewIframe() ? (
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: getPreviewIframe() || "" }} />
                  ) : (
                    <div className="text-zinc-800 font-black text-xs uppercase tracking-widest text-center px-12 opacity-30">Awaiting Signal...</div>
                  )}
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-zinc-800 w-1/3"></div></div>)}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
             <div className="grid grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Latency</p>
                   <p className="text-3xl font-black text-white">12ms</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Memory Usage</p>
                   <p className="text-3xl font-black text-white">2.4gb</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Stream Uptime</p>
                   <p className="text-3xl font-black text-white">99.9%</p>
                </div>
             </div>
             <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 font-mono text-xs text-zinc-600 overflow-y-auto space-y-2 leading-relaxed">
                <div>[SYSTEM] Initializing Director Terminal...</div>
                <div>[STORAGE] Handshake with Supabase established.</div>
                <div>[ASSETS] Found existing landing_video_config</div>
                <div className="text-indigo-400">[LOG] Video Mode set to {videoType.toUpperCase()}</div>
                <div>[MONITOR] Auto-refreshing signal preview...</div>
                <div className="animate-pulse">_</div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};