import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

// SIMPLE SECURITY CONFIG
const ADMIN_PASSWORD = "monofile-master"; // <--- CHANGE THIS IF YOU WANT

export const Admin = ({ onBack }: { onBack: () => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [url, setUrl] = useState('');
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
        if (data) setUrl(data.value);
        setLoading(false);
      });
  };

  const handleDeploy = async () => {
    setStatus('Deploying to live site...');
    
    // Auto-fix: If you paste a normal YouTube link, we turn it into an embed link
    let finalUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
        finalUrl = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
        finalUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }

    // Save to Database
    const { error } = await supabase
      .from('app_settings')
      .update({ value: finalUrl })
      .eq('key', 'landing_video');

    if (error) {
        setStatus('❌ Error: ' + error.message);
    } else {
        setStatus('✅ SUCCESS: Video is live on main page.');
        // Update the input to show the converted URL
        setUrl(finalUrl);
    }
  };

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl animate-fade-in-up">
                <h2 className="text-white font-black uppercase tracking-widest mb-6">Restricted Area</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="password" 
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="Enter Admin Password"
                        className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white text-center focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={onBack} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs uppercase hover:bg-zinc-700 transition-colors">Exit</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/10">Unlock</button>
                    </div>
                </form>
            </div>
        </div>
    );
  }

  // --- ADMIN VIEW ---
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Director Mode</h1>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Manage Landing Page Assets</p>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Authorized
            </div>
        </div>

        {/* The Placeholder Slot */}
        <div className="space-y-4 mb-8">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                Paste Video Link (YouTube/Vimeo)
            </label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </div>
                <input 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={loading}
                    className="w-full bg-black border border-zinc-700 hover:border-zinc-500 focus:border-indigo-500 text-white pl-12 pr-4 py-4 rounded-2xl outline-none transition-all font-mono text-sm shadow-inner"
                />
            </div>
            <p className="text-[10px] text-zinc-600 px-2">
                Note: Standard YouTube links are automatically converted to Embed format.
            </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={onBack} 
            className="px-8 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase text-xs tracking-widest transition-all"
          >
            Exit
          </button>
          
          <button 
            onClick={handleDeploy} 
            disabled={loading}
            className="flex-1 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {status.includes('Deploying') ? 'Deploying...' : 'Deploy Video'}
          </button>
        </div>
        
        {/* Status Message */}
        {status && (
            <div className={`mt-6 p-4 rounded-xl text-center text-xs font-bold uppercase tracking-widest animate-fade-in ${status.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {status}
            </div>
        )}
      </div>
    </div>
  );
};