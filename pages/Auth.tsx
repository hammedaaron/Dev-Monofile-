import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

interface AuthProps {
  onSuccess: () => void;
  onBack: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess, onBack }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check both new and old storage keys for seamless migration
    const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || localStorage.getItem('user_gemini_key');
    if (storedKey) {
        setApiKey(storedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Basic validation of the API Key structure
    if (apiKey.trim().startsWith('AIza') && apiKey.trim().length > 20) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
      
      // Simulate validation/handshake
      setTimeout(() => {
        setLoading(false);
        onSuccess();
      }, 800);
    } else {
      setLoading(false);
      alert("Please enter a valid Google Gemini API Key (starts with 'AIza').");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-black">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-fade-in-up relative z-10">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Return
        </button>

        <div className="text-center mb-10 mt-4">
          <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z"/></svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Monofile</h1>
          <p className="text-zinc-500 text-sm font-medium">Bring Your Own Key (BYOK)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Gemini API Key</label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[9px] font-black text-indigo-400 hover:text-white transition-colors uppercase tracking-widest underline underline-offset-4"
              >
                Get Free Key
              </a>
            </div>
            <div className="relative">
              <input 
                type="password" 
                required 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder-zinc-800 focus:outline-none focus:border-indigo-500 transition-all text-sm font-mono shadow-inner"
                placeholder="AIzaSy..."
              />
            </div>
            <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
              Your key is stored locally. {apiKey.length > 10 ? <span className="text-emerald-500 font-bold">Key found in storage.</span> : "Entering a key will save it for future sessions."}
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 ${loading ? 'opacity-70 cursor-wait' : 'active:scale-95'}`}
          >
            {loading ? 'Initializing...' : (apiKey.length > 20 ? 'Continue to Environment' : 'Authorize Environment')}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.3em]">
            Zero-Server Architecture
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 text-center w-full">
         <p className="text-[10px] text-zinc-800 font-black tracking-[0.4em] uppercase">Monofile Engine v3.2 | HAMSTAR</p>
      </div>
    </div>
  );
};

export default Auth;
