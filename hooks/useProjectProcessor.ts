import { useState, useCallback } from 'react';
import { processFiles, calculateStats, generateFlattenedDocument } from '../services/fileService';
import { generateAIInsights } from '../services/geminiService';
import { saveMonofileToCloud } from '../services/databaseService';
import { AppStatus, Project } from '../types';

interface UseProjectProcessorProps {
  activeProject: Project | null;
  updateActiveProject: (updates: Partial<Project>) => void;
  addLog: (msg: string) => void;
  setLogs: (logs: string[]) => void;
  setIsSynced: (synced: boolean) => void;
}

export const useProjectProcessor = ({ 
  activeProject, 
  updateActiveProject, 
  addLog, 
  setLogs,
  setIsSynced 
}: UseProjectProcessorProps) => {
  
  const [isSyncing, setIsSyncing] = useState(false);

  const handleFilesSelected = useCallback(async (fileList: FileList | File[]) => {
    if (!activeProject) return;
    
    updateActiveProject({ status: AppStatus.PARSING });
    setLogs([]);
    setIsSynced(false);
    addLog("Initializing codebase ingestion...");

    try {
      const files = await processFiles(fileList);
      if (files.length === 0) throw new Error("No valid files found.");

      const firstFile = files[0];
      const projectName = firstFile.path.split('/')[0] || `Project_${activeProject.id}`;
      
      addLog(`Indexing ${files.length} nodes...`);
      const fileStats = calculateStats(files);
      const flattened = generateFlattenedDocument(files);
      
      updateActiveProject({ status: AppStatus.PROCESSING_AI, stats: fileStats, name: projectName });
      addLog("Generating AI architecture blueprint...");
      
      try {
        const insights = await generateAIInsights(flattened, files);
        addLog("AI processing successful.");
        updateActiveProject({ 
          status: AppStatus.COMPLETE, 
          outputs: { ...insights, flattened } 
        });
      } catch (aiError: any) {
        addLog(`! AI Processing Error: ${aiError.message}`);
        updateActiveProject({ 
          status: AppStatus.COMPLETE, 
          outputs: { flattened, summary: 'Processing Error', aiContext: '', concepts: [] } 
        });
      }

    } catch (err: any) {
      addLog(`FATAL: ${err.message}`);
      updateActiveProject({ status: AppStatus.ERROR });
    }
  }, [activeProject, updateActiveProject, addLog, setLogs, setIsSynced]);

  const handleCloudSync = async () => {
    if (!activeProject || !activeProject.stats || activeProject.status !== AppStatus.COMPLETE) return;
    
    setIsSyncing(true);
    addLog("Initiating Cloud Sync to Supabase...");
    
    try {
      await saveMonofileToCloud(
        activeProject.name,
        activeProject.stats,
        activeProject.outputs
      );
      setIsSynced(true);
      addLog("Cloud synchronization successful. Record stored in Supabase.");
    } catch (err: any) {
      addLog(`Cloud Sync Failed: ${err.message}`);
      setIsSynced(false);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    handleFilesSelected,
    handleCloudSync,
    isSyncing
  };
};
