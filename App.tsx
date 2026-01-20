import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Splash from './pages/Splash';
import MonofileApp from './components/MonofileApp';
import HowItWorks from './pages/HowItWorks';
import { Admin } from './pages/Admin';

type Route = 'landing' | 'auth' | 'splash' | 'app' | 'how-it-works' | 'admin';

// 6 hours in milliseconds (Used only for session hygiene)
const SESSION_DURATION = 6 * 60 * 60 * 1000; 

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>('landing');

  // Helper to clear session data but PRESERVE the API key
  const performExit = () => {
      // We only remove the session token, effectively "locking" the app
      // but keeping the user's configuration (the API key)
      localStorage.removeItem('monofile_auth_token');
      localStorage.removeItem('monofile_session'); 
      setRoute('landing');
  };
  
  useEffect(() => {
    // 0. Check for Admin Backdoor URL (?admin=hamstarfalkorn)
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'hamstarfalkorn') {
       setRoute('admin');
       return; // Stop here so we don't redirect to the main app or auth logic
    }

    // 1. Check for API Key (Persistence Layer)
    const apiKey = localStorage.getItem('user_gemini_key') || localStorage.getItem('monofile_k_sec');
    
    // 2. Check for Active Session (Security Layer)
    const sessionRaw = localStorage.getItem('monofile_auth_token');
    
    // Logic: If Key exists, we treat them as capable of entering.
    // We prioritize the Key over the session token for the "Auto-Login" experience.
    if (apiKey && apiKey.startsWith('AIza')) {
       // If the user refreshed the browser, jump straight back to App
       setRoute('app');
    } 
    // If no key, we stay on 'landing' (default state)
  }, []);

  const handleAuthSuccess = () => {
    const sessionData = {
      authenticated: true,
      expiry: Date.now() + SESSION_DURATION
    };
    localStorage.setItem('monofile_auth_token', JSON.stringify(sessionData));
    setRoute('splash');
  };

  const handleSplashComplete = () => {
    setRoute('app');
  };
  
  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-indigo-500/30">
      {route === 'landing' && <Landing onNavigate={(r) => setRoute(r as Route)} />}
      
      {route === 'how-it-works' && <HowItWorks onNavigate={(r) => setRoute(r as Route)} />}

      {route === 'admin' && <Admin onBack={() => setRoute('landing')} />}

      {route === 'auth' && (
        <Auth 
          onSuccess={handleAuthSuccess} 
          onBack={() => setRoute('landing')} 
        />
      )}
      
      {route === 'splash' && <Splash onComplete={handleSplashComplete} />}
      
      {route === 'app' && (
          <div className="relative">
              <nav className="absolute top-0 left-0 w-full px-8 py-6 flex justify-between items-center z-50 pointer-events-none">
                   <button 
                    onClick={() => setRoute('landing')}
                    className="pointer-events-auto text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-2 group"
                   >
                       <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                       Home
                   </button>
                   
                   <button 
                    onClick={performExit}
                    className="pointer-events-auto text-xs font-medium text-zinc-600 hover:text-white transition-colors"
                   >
                       Exit Workspace
                   </button>
              </nav>
              <MonofileApp />
          </div>
      )}
    </div>
  );
};

export default App;