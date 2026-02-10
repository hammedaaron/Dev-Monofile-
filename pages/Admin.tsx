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
    if (content.trim().startsWith('<')) {
        return content;
    }
    // Handle URL Conversion
    let finalUrl = content.trim();
    if (finalUrl.includes('youtube.com/watch?v=')) {
        finalUrl = finalUrl.replace('watch?v=', 'embed/');
    } else if (finalUrl.includes('youtu.be/')) {
        finalUrl = finalUrl.replace('youtu.be/', 'youtube.com/embed/');
    }
    return `<iframe class="w-full h-full" src="${finalUrl}" frameBorder="0" allowfullscreen></iframe>`;
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
        setStatus('✅ ASSET LIVE: Landing video updated.');
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
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row p-6 gap-6 font-sans">
      
      {/* Configuration Panel */}
      <div className="flex-1 max-w-2xl bg-zinc-900 border border-zinc-800 p-10 rounded-[2rem] shadow-2xl flex flex-col">
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Director Mode</h1>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">Production Asset Manager</p>
            </div>
            <button onClick={onBack} className="p-2 text-zinc-500 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div className="space-y-6 mb-8 flex-1">
            <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Source URL or Embed Code
                </label>
                <span className="text-[9px] font-mono text-zinc-600 uppercase">Detection: {content.trim().startsWith('<') ? 'RAW HTML' : 'SMART URL'}</span>
            </div>
            <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste YouTube link OR <iframe src='...'> code here..."
                disabled={loading}
                className="w-full h-48 bg-black border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 text-white p-6 rounded-2xl outline-none transition-all font-mono text-xs shadow-inner leading-relaxed resize-none"
            />
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Pro Tip:</p>
                <p className="text-[9px] text-zinc-600 leading-relaxed uppercase tracking-widest">
                    You can now paste full HTML code blocks from Loom, Vimeo, or YouTube. The system will bypass auto-conversion if it detects an HTML tag.
                </p>
            </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={handleDeploy} 
            disabled={loading || !content}
            className="flex-1 px-8 py-5 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-zinc-200 active:scale-95 transition-all"
          >
            {status.includes('COMMITTING') ? 'PROCESSING...' : 'Deploy to Production'}
          </button>
        </div>
        
        {status && (
            <div className={`mt-6 p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest animate-fade-in ${status.includes('FAULT') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {status}
            </div>
        )}
      </div>

      {/* Preview Monitor */}
      <div className="flex-1 bg-black border border-zinc-800 rounded-[2rem] p-4 flex flex-col relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 to-black -z-10"></div>
         
         <div className="flex items-center justify-between mb-4 px-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Monitor</span>
             </div>
             <span className="text-[9px] font-mono text-zinc-700">1080P_SIGNAL_STABLE</span>
         </div>

         <div className="flex-1 bg-zinc-950 rounded-[1.5rem] border border-zinc-900 overflow-hidden flex items-center justify-center relative">
            {content ? (
                <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent() || "" }}
                />
            ) : (
                <div className="text-zinc-800 font-black text-xs uppercase tracking-widest text-center px-12 opacity-30">
                    Awaiting Signal Source...
                </div>
            )}
            
            {/* Scanline Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]"></div>
         </div>

         <div className="mt-4 grid grid-cols-3 gap-2 px-2">
            {[1,2,3].map(i => (
                <div key={i} className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-800 w-1/2"></div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};