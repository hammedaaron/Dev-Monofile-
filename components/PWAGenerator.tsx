import React, { useState, useEffect } from 'react';
import { generatePWAAssets } from '../services/pwaService';
import { deployToGitHubPages, getFileContent } from '../services/githubService'; 
import { DownloadIcon, LoaderIcon, SparklesIcon, XIcon, CloudSyncIcon, CopyIcon } from './Icons';

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

  // GITHUB DEPLOY STATE
  const [ghToken, setGhToken] = useState('');
  const [repoName, setRepoName] = useState('');
  const [targetBranch, setTargetBranch] = useState('main'); // Default to main branch
  const [smartInject, setSmartInject] = useState(true); // Default to Automatic
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('monofile_gh_token');
    const savedRepo = localStorage.getItem('monofile_gh_repo');
    if (savedToken) setGhToken(savedToken);
    if (savedRepo) setRepoName(savedRepo);
  }, []);

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
    Object.entries(result.blobs).forEach(([name, blob]) => zip.file(name, blob as Blob));
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

  const handleDeploy = async () => {
    if (!ghToken || !repoName) return;
    
    localStorage.setItem('monofile_gh_token', ghToken);
    localStorage.setItem('monofile_gh_repo', repoName);

    setDeploying(true);
    setDeployStatus("Connecting to repository...");

    try {
       const [owner, repo] = repoName.split('/');
       
       // 1. Prepare base assets (Icons, manifest, service worker)
       const filesToUpload: Record<string, any> = {
         ...result.blobs,
         'site.webmanifest': result.manifest,
       };

       // 2. SMART INJECTION LOGIC
       if (smartInject) {
          setDeployStatus(`Fetching current index.html from '${targetBranch}'...`);
          
          // Get your CURRENT html code from GitHub
          let currentHtml = await getFileContent(ghToken, owner, repo, 'index.html', targetBranch);

          if (currentHtml) {
             setDeployStatus("Injecting PWA tags safely...");
             
             // A. Inject Meta Tags into <head> if not already there
             if (!currentHtml.includes('site.webmanifest')) {
                // Try to inject before </head>
                if (currentHtml.includes('</head>')) {
                    currentHtml = currentHtml.replace('</head>', `${result.metaTags}\n</head>`);
                } else {
                    currentHtml = currentHtml + `\n${result.metaTags}`;
                }
             }

             // B. Inject Script into <body> if not already there
             const swScript = `<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));}</script>`;
             
             if (!currentHtml.includes('navigator.serviceWorker.register')) {
                if (currentHtml.includes('</body>')) {
                    currentHtml = currentHtml.replace('</body>', `${swScript}\n</body>`);
                } else {
                    currentHtml = currentHtml + `\n${swScript}`;
                }
             }

             // Add the modified file to the upload list
             filesToUpload['index.html'] = currentHtml;
          } else {
             // If index.html doesn't exist on GitHub, use the generated one
             setDeployStatus("index.html not found, creating new one...");
             filesToUpload['index.html'] = result.indexHtml;
          }
       } else {
          // If NOT smart injecting, we don't upload HTML (Safe Mode)
          // or you could force overwrite if you wanted.
       }

       setDeployStatus("Pushing updates to GitHub...");
       const liveUrl = await deployToGitHubPages(ghToken, repoName, filesToUpload, targetBranch);
       setDeployStatus(`SUCCESS: Pushed to ${liveUrl}`);
    } catch (err: any) {
       setDeployStatus(`ERROR: ${err.message}`);
    } finally {
       setDeploying(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">PWA Architect</h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Deployment-Ready Package Generator</p>
        </div>
        <button onClose={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><XIcon size={24} /></button>
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
          {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</div>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">App Name</label>
                <input value={config.name} onChange={e => setConfig({...config, name: e.target.value})} placeholder="e.g. Monofile Pro" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Short Name</label>
                <input value={config.shortName} onChange={e => setConfig({...config, shortName: e.target.value})} placeholder="e.g. Monofile" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Theme Color</label>
             <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-2xl p-3">
                <input type="color" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} className="bg-transparent h-8 w-12 cursor-pointer border-none" />
                <span className="text-[10px] font-mono text-zinc-400 font-bold">{config.themeColor.toUpperCase()}</span>
             </div>
          </div>

          <button onClick={async () => {
              if (!file || !config.name) return;
              setProcessing(true);
              try {
                const res = await generatePWAAssets(file, config);
                setResult(res);
              } catch (e: any) { setError(e.message); }
              setProcessing(false);
            }}
            disabled={!file || !config.name || processing}
            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-3xl hover:bg-zinc-200 transition-all disabled:opacity-20 shadow-xl"
          >
            {processing ? <LoaderIcon /> : <span className="flex items-center justify-center gap-3"><SparklesIcon /> Generate PWA Stack</span>}
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* GITHUB DEPLOY SECTION */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-[2rem] p-8">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-black rounded-full border border-zinc-700 text-white"><CloudSyncIcon /></div>
                <div>
                  <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Deploy to GitHub</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Update repository with PWA capability</p>
                </div>
             </div>
             
             <div className="space-y-4 mb-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">GitHub Token</label>
                   <input type="password" placeholder="ghp_..." value={ghToken} onChange={e => setGhToken(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">Repo (user/repo)</label>
                       <input value={repoName} onChange={e => setRepoName(e.target.value)} placeholder="user/repo" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">Branch</label>
                       <input value={targetBranch} onChange={e => setTargetBranch(e.target.value)} placeholder="main" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                </div>
             </div>

             {/* AUTOMATIC MODE TOGGLE */}
             <div className="flex items-center gap-3 mb-6 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30">
                <input type="checkbox" id="smartInject" checked={smartInject} onChange={e => setSmartInject(e.target.checked)} className="w-5 h-5 accent-indigo-500 cursor-pointer" />
                <label htmlFor="smartInject" className="cursor-pointer">
                   <div className="text-[11px] font-bold text-white">Automatic Integration</div>
                   <div className="text-[9px] text-indigo-300 uppercase font-black">Merge PWA tags into existing index.html</div>
                </label>
             </div>

             {deployStatus && (
                <div className={`p-4 rounded-xl mb-4 text-[10px] font-black uppercase tracking-widest ${deployStatus.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : deployStatus.includes('ERROR') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                    {deployStatus}
                </div>
             )}

             <button onClick={handleDeploy} disabled={deploying || !ghToken || !repoName} className="w-full py-4 bg-zinc-950 hover:bg-black text-white border border-zinc-800 font-black rounded-xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {deploying ? <LoaderIcon /> : 'Push Live to GitHub'}
             </button>
          </div>

          {/* --- MANUAL INSTALL SNIPPETS --- */}
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-[2rem] p-6 mb-6">
             <div className="flex items-center gap-2 mb-4 opacity-70">
                <SparklesIcon />
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Manual Install Snippets</h4>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <div className="group relative">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-bold text-zinc-600 uppercase">Head Tags (Paste in &lt;head&gt;)</label>
                        <button onClick={() => navigator.clipboard.writeText(result.metaTags)} className="text-[9px] text-indigo-500 hover:text-white flex items-center gap-1"><CopyIcon /> Copy</button>
                    </div>
                    <div className="bg-black p-3 rounded-xl border border-zinc-800 overflow-x-auto custom-scrollbar">
                       <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">{result.metaTags}</pre>
                    </div>
                </div>

                <div className="group relative">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-bold text-zinc-600 uppercase">Body Script (Paste in &lt;body&gt;)</label>
                        <button onClick={() => navigator.clipboard.writeText(result.swScript)} className="text-[9px] text-indigo-500 hover:text-white flex items-center gap-1"><CopyIcon /> Copy</button>
                    </div>
                    <div className="bg-black p-3 rounded-xl border border-zinc-800 overflow-x-auto custom-scrollbar">
                       <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">{result.swScript}</pre>
                    </div>
                </div>
             </div>
             <div className="mt-3 text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                Also included in download as 'manual_integration.txt'
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => setResult(null)} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black rounded-2xl text-xs uppercase hover:bg-zinc-700">Back</button>
            <button onClick={handleDownload} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20"><DownloadIcon /> Download ZIP Package</button>
          </div>
        </div>
      )}
    </div>
  );
};