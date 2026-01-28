import React, { useState, useRef, useEffect } from 'react';
import { GeneratedOutputs, ConceptBundle, ChatMessage, Project } from '../types';
import { DownloadIcon, CopyIcon, CheckCircleIcon, SparklesIcon, LoaderIcon, XIcon, PlusIcon } from './Icons';
import { downloadStringAsFile } from '../services/fileService';
import { recreateFeatureContext, startCodebaseChat } from '../services/geminiService';
import { marked } from 'marked';

interface ViewerProps {
  outputs: GeneratedOutputs;
  currentProject: Project;
  otherProjects: Project[];
  onUpdateOutputs?: (newOutputs: GeneratedOutputs) => void;
  onUpdateProject?: (updates: Partial<Project>) => void;
  onOpenPWA?: () => void;
}

const Viewer: React.FC<ViewerProps> = ({ outputs, currentProject, otherProjects, onUpdateOutputs, onUpdateProject, onOpenPWA }) => {
  const [activeTab, setActiveTab] = useState<'flattened' | 'summary' | 'context' | 'recreator' | 'intelligence'>('flattened');
  const [copied, setCopied] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatInstance = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatInstance.current = null;
    setChatMessages([]);
  }, [currentProject.id, currentProject.knowledgeBridgeEnabled]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatting]);

  const getContent = () => {
    switch (activeTab) {
      case 'flattened': return outputs.flattened;
      case 'summary': return outputs.summary;
      case 'context': return outputs.aiContext;
      case 'recreator': return outputs.recreatedContext || '';
      default: return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md') => {
    const content = getContent();
    const prefix = activeTab === 'flattened' ? 'monofile_codebase' : `monofile_${activeTab}`;
    downloadStringAsFile(content, `${prefix}.${format}`, 'text/plain');
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term || !sourceRef.current) {
      setSearchResults([]);
      return;
    }
    const content = outputs.flattened;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }
    setSearchResults(matches);
    setCurrentSearchIndex(0);
    if (matches.length > 0) {
      jumpToMatch(matches[0], term.length);
    }
  };

  const jumpToMatch = (index: number, length: number) => {
    if (!sourceRef.current) return;
    sourceRef.current.focus();
    sourceRef.current.setSelectionRange(index, index + length);
    
    const lines = outputs.flattened.substring(0, index).split('\n');
    const lineIndex = lines.length;
    sourceRef.current.scrollTop = (lineIndex * 20) - 150;
  };

  const nextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIdx);
    jumpToMatch(searchResults[nextIdx], searchTerm.length);
  };

  const handleExecuteRecreator = async () => {
    if (selectedConcepts.length === 0) return;
    setIsExecuting(true);
    setProgress(10);
    try {
      const conceptsToProcess = outputs.concepts.filter(c => selectedConcepts.includes(c.id));
      const result = await recreateFeatureContext(outputs.flattened, conceptsToProcess);
      setProgress(100);
      setTimeout(() => {
        if (onUpdateOutputs) onUpdateOutputs({ ...outputs, recreatedContext: result });
        setIsExecuting(false);
      }, 500);
    } catch (e) {
      setIsExecuting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatting) return;
    if (!chatInstance.current) chatInstance.current = startCodebaseChat(currentProject, otherProjects);
    const message = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setIsChatting(true);
    try {
      const response = await chatInstance.current.sendMessage({ message });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "No response." }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const isRichText = activeTab === 'summary' || activeTab === 'context' || (activeTab === 'recreator' && outputs.recreatedContext);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[750px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="flex flex-col lg:flex-row items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-3 gap-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-black/40 p-1 rounded-xl border border-zinc-800/50">
          {(['flattened', 'summary', 'context', 'recreator', 'intelligence'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === tab ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {tab === 'flattened' ? 'Source' : tab === 'summary' ? 'Audit' : tab === 'context' ? 'AI Brain' : tab === 'recreator' ? 'DNA' : 'Intelligence'}
            </button>
          ))}
          <button onClick={onOpenPWA} className="px-3 py-2 text-[10px] md:text-xs font-black rounded-lg text-emerald-500 hover:text-white flex items-center gap-2 uppercase tracking-widest"><SparklesIcon /> PWA</button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'flattened' && (
            <div className="flex items-center bg-black border border-zinc-800 rounded-lg px-3 py-1 mr-2 shadow-inner">
               <input 
                type="text" 
                placeholder="Find logic..." 
                className="bg-transparent text-[10px] font-bold text-white focus:outline-none w-24 md:w-40" 
                onChange={(e) => handleSearch(e.target.value)}
                value={searchTerm}
               />
               {searchResults.length > 0 && (
                 <div className="flex items-center gap-2 ml-2 border-l border-zinc-800 pl-2">
                   <span className="text-[9px] text-zinc-500 font-mono">
                     {currentSearchIndex + 1}/{searchResults.length}
                   </span>
                   <button onClick={nextMatch} className="text-indigo-400 hover:text-white text-[9px] font-black uppercase">Next</button>
                 </div>
               )}
            </div>
          )}
          {activeTab !== 'intelligence' && (
            <>
              {activeTab === 'recreator' && outputs.recreatedContext && (
                <button 
                  onClick={() => onUpdateOutputs?.({ ...outputs, recreatedContext: '' })} 
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white bg-indigo-500/10 border border-indigo-500/20 rounded-lg transition-all"
                >
                  <XIcon size={12} /> Reselect
                </button>
              )}
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white bg-zinc-800 rounded-lg transition-all">{copied ? <CheckCircleIcon /> : <CopyIcon />}{copied ? 'Copied' : 'Copy'}</button>
              <button onClick={() => handleDownload('md')} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white bg-zinc-800 rounded-lg transition-all"><DownloadIcon /> .MD</button>
            </>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-[#050505] flex flex-col">
        {activeTab === 'intelligence' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-40">
                    <div className="p-4 rounded-full mb-4 bg-indigo-500/10 text-indigo-400"><SparklesIcon /></div>
                    <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Deep Intelligence</h4>
                    <p className="text-zinc-500 text-xs">Architectural queries on Gemini 3 Pro reasoning.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 markdown-body shadow-xl'}`}>
                      {msg.role === 'model' ? <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.text, { async: false }) as string }} /> : msg.text}
                    </div>
                  </div>
                ))}
                {isChatting && <div className="flex justify-start"><div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-2"><LoaderIcon /> <span className="text-[10px] font-black uppercase text-zinc-500 animate-pulse">Thinking...</span></div></div>}
                <div ref={chatEndRef} />
             </div>
             <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex gap-2">
                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Ask about structure, bugs, or improvements..." className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                <button type="submit" disabled={!userInput.trim() || isChatting} className="bg-white text-black px-6 rounded-xl font-black text-xs uppercase disabled:opacity-50">Query</button>
             </form>
          </div>
        ) : activeTab === 'recreator' && !outputs.recreatedContext && !isExecuting ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
             <h3 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">DNA Extractor</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mb-12 max-w-4xl">
                {outputs.concepts.map(concept => (
                  <button key={concept.id} onClick={() => setSelectedConcepts(prev => prev.includes(concept.id) ? prev.filter(i => i !== concept.id) : [...prev, concept.id])} className={`text-left p-6 rounded-3xl border transition-all ${selectedConcepts.includes(concept.id) ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-zinc-900/20 border-zinc-800/40 hover:bg-zinc-800/40'}`}>
                    <span className={`text-[10px] font-black uppercase block mb-2 ${selectedConcepts.includes(concept.id) ? 'text-indigo-400' : 'text-zinc-500'}`}>{concept.name}</span>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase line-clamp-2">{concept.description}</p>
                  </button>
                ))}
             </div>
             <button onClick={handleExecuteRecreator} disabled={selectedConcepts.length === 0} className="px-14 py-6 rounded-full font-black text-xl bg-white text-black disabled:opacity-20 flex items-center gap-3 active:scale-95 transition-all"><SparklesIcon /> Extract Modules</button>
          </div>
        ) : isExecuting ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black px-12">
             <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-4"><span className="text-[14px] font-black text-white uppercase tracking-widest animate-pulse">Generating Blueprint...</span><span className="text-2xl font-black text-zinc-500">{Math.round(progress)}%</span></div>
                <div className="w-full h-2 bg-zinc-950 rounded-full border border-zinc-800/50 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }}></div></div>
             </div>
          </div>
        ) : isRichText ? (
          <div className="w-full h-full p-10 md:p-16 overflow-y-auto markdown-body animate-fade-in-up custom-scrollbar" dangerouslySetInnerHTML={{ __html: marked.parse(getContent(), { async: false }) as string }} />
        ) : (
          <div className="w-full h-full relative group">
            <textarea ref={sourceRef} readOnly value={getContent()} className="w-full h-full p-10 bg-transparent text-zinc-400 font-mono text-xs md:text-sm resize-none focus:outline-none leading-relaxed custom-scrollbar" spellCheck={false} />
            <div className="absolute top-4 right-10 text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em] pointer-events-none group-hover:text-zinc-600 transition-colors">RAW_INJECTED_SOURCE.LOG</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Viewer;