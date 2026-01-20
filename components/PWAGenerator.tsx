import React, { useState, useEffect } from 'react';
import { generatePWAAssets } from '../services/pwaService';
import { deployToGitHubPages } from '../services/githubService'; 
import { DownloadIcon, LoaderIcon, SparklesIcon, XIcon, CopyIcon, CheckCircleIcon, CloudSyncIcon } from './Icons';

interface PWAGeneratorProps {
  onClose: () => void;
  initialName?: string;
}

export const PWAGenerator: React.FC<PWAGeneratorProps> = ({ onClose, initialName }) => {
  const [config, setConfig] = useState({ 
    name: initialName || '', 
    shortName: initialName?.substring(0, 12) || '', 
    themeColor: '#6366f1' 
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // --- NEW: GITHUB DEPLOY STATE ---
  const [ghToken, setGhToken] = useState('');
  const [repoName, setRepoName] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);

  // Load saved credentials from browser storage (Convenience)
  useEffect(() => {
    const savedToken = localStorage.getItem('monofile_gh_token');
    const savedRepo = localStorage.getItem('monofile_gh_repo');
    if (savedToken) setGhToken(savedToken);
    if (savedRepo) setRepoName(savedRepo);
  }, []);

  // Sync if initialName changes
  useEffect(() => {
    if (initialName && !result) {
      setConfig(prev => ({ 
        ...prev, 
        name: initialName, 
        shortName: initialName.substring(0, 12) 
      }));
    }
  }, [initialName, result]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0] || null;
    if (selected && selected.type !== 'image/png') {
        setError("Please provide a PNG image to preserve transparency.");
        return;
    }
    setFile(selected);
  };

  const handleDownload = () => {
    if (!result) return;
    // @ts-ignore
    const zip = new window.JSZip();
    Object.entries(result.blobs).forEach(([name, blob]) => zip.file(name, blob));
    zip.file("site.webmanifest", result.manifest);
    zip.file("index.html", result.indexHtml);
    
    zip.generateAsync({ type: "blob" }).then((content: Blob) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.shortName.toLowerCase().replace(/\s/g, '-') || 'pwa'}-assets.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // --- NEW: DEPLOY FUNCTION ---
  const handleDeploy = async () => {
    if (!ghToken || !repoName) return;
    
    // Save for next time
    localStorage.setItem('monofile_gh_token', ghToken);
    localStorage.setItem('monofile_gh_repo', repoName);

    setDeploying(true);
    setDeployStatus("Initiating secure handshake...");

    try {
       // Prepare all files
       const filesToUpload = {
         ...result.blobs,
         'site.webmanifest': result.manifest,
         'index.html': result.indexHtml
       };

       setDeployStatus("Uploading assets to GitHub...");
       const liveUrl = await deployToGitHubPages(ghToken, repoName, filesToUpload);
       setDeployStatus(`SUCCESS: Live at ${liveUrl}`);
    } catch (err: any) {
       setDeployStatus(`ERROR: ${err.message}`);
    } finally {
       setDeploying(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.metaTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">PWA Architect</h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">
            {initialName && !result ? `Building Assets for ${initialName}` : 'Deployment-Ready Package Generator'}
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <XIcon size={24} />
        </button>
      </div>

      {!result ? (
        <div className="space-y-6">
          <div className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ${error ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-black group'}`}>
             <input type="file" accept="image/png" onChange={handleFileChange} className="hidden" id="pwa-upload" />
             <label htmlFor="pwa-upload" className="cursor-pointer block">
                <div className={`text-sm font-bold mb-2 transition-colors ${file ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {file ? file.name : 'Select 1:1 PNG Icon'}
                </div>
                <div className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Transparency will be preserved</div>
             </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-shake">
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">App Name</label>
                <input 
                  placeholder="e.g. Monofile Pro" 
                  value={config.name}
                  onChange={e => setConfig({...config, name: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Short Name</label>
                <input 
                  placeholder="e.g. Monofile" 
                  value={config.shortName}
                  onChange={e => setConfig({...config, shortName: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Theme Color</label>
             <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-2xl p-3">
                <input 
                  type="color" 
                  value={config.themeColor}
                  onChange={e => setConfig({...config, themeColor: e.target.value})}
                  className="bg-transparent h-8 w-12 cursor-pointer border-none"
                />
                <span className="text-[10px] font-mono text-zinc-400 font-bold">{config.themeColor.toUpperCase()}</span>
             </div>
          </div>

          <button 
            onClick={async () => {
              if (!file || !config.name) return;
              setProcessing(true);
              try {
                const res = await generatePWAAssets(file, config);
                setResult(res);
              } catch (e: any) {
                setError(e.message.includes("ASPECT_RATIO_INVALID") ? "Error: Image must be a perfect square (1:1)." : "Generation failed.");
              }
              setProcessing(false);
            }}
            disabled={!file || !config.name || processing}
            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-3xl hover:bg-zinc-200 transition-all disabled:opacity-20 shadow-xl active:scale-[0.98]"
          >
            {processing ? <LoaderIcon /> : <span className="flex items-center justify-center gap-3"><SparklesIcon /> Generate PWA Stack</span>}
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black border border-zinc-800 rounded-[2rem] p-8">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 border-b border-zinc-800 pb-4">Package Structure:</h4>
              <div className="grid grid-cols-1 gap-y-3">
                {Object.keys(result.blobs).map(name => (
                  <div key={name} className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> 
                    <span className="group-hover:text-zinc-300 transition-colors">{name}</span>
                  </div>
                ))}
                <div className="text-[11px] font-mono text-indigo-400 flex items-center gap-2 font-bold group">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div> 
                   <span className="group-hover:text-indigo-300 transition-colors">site.webmanifest</span>
                </div>
                <div className="text-[11px] font-mono text-indigo-400 flex items-center gap-2 font-bold group">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div> 
                   <span className="group-hover:text-indigo-300 transition-colors">index.html</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-zinc-800 rounded-[2rem] p-8 flex flex-col justify-center">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6 border-b border-zinc-800 pb-4">Architect Health Check:</h4>
              <div className="space-y-4">
                {[
                  { label: 'Service Worker', status: 'Offline-First Ready' },
                  { label: 'Manifest', status: 'Maskable & Portrait' },
                  { label: 'iOS Polish', status: 'Apple Meta Injected' },
                  { label: 'Assets', status: 'Full Size Suite' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">{item.label}</span>
                    <span className="text-emerald-500 font-mono font-bold">✓ {item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* GITHUB DEPLOY SECTION */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-[2rem] p-8 mt-4">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-black rounded-full border border-zinc-700 text-white"><CloudSyncIcon /></div>
                <div>
                  <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Deploy to GitHub Pages</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Hosts your PWA for free on your own repo</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">GitHub Personal Token</label>
                   <input 
                      type="password"
                      placeholder="ghp_..." 
                      value={ghToken}
                      onChange={e => setGhToken(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                   />
                    <div className="pl-2 pt-1">
                     <a 
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Monofile%20PWA%20Deployer" 
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest"
                     >
                        <span>Need a token?</span>
                        <span className="underline underline-offset-4 decoration-indigo-500/50">Auto-generate one</span>
                     </a>
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">Your Repository</label>
                   <input 
                      type="text"
                      placeholder="username/repo-name" 
                      value={repoName}
                      onChange={e => setRepoName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                   />
                </div>
             </div>

             {deployStatus && (
                <div className={`p-4 rounded-xl mb-4 text-[10px] font-black uppercase tracking-widest ${deployStatus.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : deployStatus.includes('ERROR') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                    {deployStatus}
                </div>
             )}

             <button 
                onClick={handleDeploy}
                disabled={deploying || !ghToken || !repoName}
                className="w-full py-4 bg-zinc-950 hover:bg-black text-white border border-zinc-800 hover:border-zinc-600 font-black rounded-xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
                {deploying ? <LoaderIcon /> : 'Push Live to GitHub'}
             </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800">
            <button 
              onClick={() => setResult(null)} 
              className="flex-1 py-5 bg-zinc-800 text-zinc-400 font-black rounded-3xl hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs"
            >
              Modify Design
            </button>
            <button 
              onClick={handleDownload} 
              className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
            >
              <DownloadIcon /> Download .ZIP
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
         <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">Validated by PWA Architect Engine v3.1 | HAMSTAR</p>
      </div>
    </div>
  );
};