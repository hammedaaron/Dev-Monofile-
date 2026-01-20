
import React, { useEffect } from 'react';

interface SplashProps {
  onComplete: () => void;
}

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      <div className="animate-fade-in-up text-center">
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 text-gradient-animate">
          MONOFILE
        </h1>
        <div className="w-16 h-1 bg-indigo-600 mx-auto rounded-full mb-8"></div>
        <p className="text-[10px] text-zinc-600 font-bold tracking-[0.4em] uppercase mb-2">
          Initializing Core Engine
        </p>
        <p className="text-[9px] text-indigo-500/50 font-black tracking-[0.2em] uppercase animate-pulse">
          Powered by HAMSTAR
        </p>
      </div>
    </div>
  );
};

export default Splash;
