
import React, { useRef, useState } from 'react';
import { UploadIcon } from './Icons';

interface UploaderProps {
  onFilesSelected: (files: FileList | File[]) => void;
  isProcessing: boolean;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /**
   * Deep crawls directory entries from the drop event
   */
  const traverseDirectory = async (entry: any, path: string = ""): Promise<File[]> => {
    const files: File[] = [];
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      // Attach fullPath for our parser to use as the relative path
      (file as any).fullPath = path + entry.name;
      files.push(file);
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries(resolve);
      });
      for (const childEntry of entries) {
        files.push(...(await traverseDirectory(childEntry, path + entry.name + "/")));
      }
    }
    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items) {
      const entryPromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = (item as any).webkitGetAsEntry();
          if (entry) {
            entryPromises.push(traverseDirectory(entry));
          }
        }
      }
      const fileArrays = await Promise.all(entryPromises);
      const allFiles = fileArrays.flat();
      if (allFiles.length > 0) {
        onFilesSelected(allFiles);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Fallback for browsers without webkitGetAsEntry (rare now)
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10">
      <div
        className={`relative border-2 border-dashed rounded-3xl p-16 transition-all duration-500 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer group
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99] shadow-inner' 
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          // Only trigger if clicking the main container, not buttons
          if (e.target === e.currentTarget) {
            fileInputRef.current?.click();
          }
        }}
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isDragging ? 'bg-indigo-500 text-white scale-110 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'}`}>
          <UploadIcon />
        </div>
        
        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">
          Ingest Codebase
        </h3>
        <p className="text-zinc-500 mb-8 max-w-md text-sm font-medium leading-relaxed">
          Drag & drop your project folder here. <br/>
          We'll crawl subdirectories, flatten the logic, and prepare it for AI analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          />
          <button 
            className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Select Files
          </button>
          
          <input
            type="file"
            ref={folderInputRef}
            className="hidden"
            // @ts-ignore
            webkitdirectory="" 
            directory=""
            multiple
            onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          />
          <button 
            className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default Uploader;
