import { FileNode, ProcessingStats } from '../types';

const getJSZip = () => (window as any).JSZip;

const IGNORED_FOLDERS = ['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '__pycache__', '.gradle', '.idea', 'vendor', 'Pods', 'target', 'venv', '.venv'];
const IGNORED_FILES = ['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'thumbs.db'];

const TEXT_EXTENSIONS = [
  'html', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'xml', 'md', 'txt',
  'py', 'rb', 'php', 'go', 'rs', 'java', 'kt', 'c', 'cpp', 'h', 'hpp', 'cs', 'sh', 'bash',
  'sol', 'wasm', 'abi', 'contract', 'dockerfile', 'gradle', 'properties', 'toml', 'env', 'local',
  'dart', 'swift', 'm', 'h', 'cmake', 'makefile', 'proto', 'gitignore', 'dockerignore', 'editorconfig',
  'npmrc', 'prettierrc', 'eslintrc', 'babelrc', 'lock', 'config', 'rc'
];

const BINARY_EXTENSIONS = [
  'apk', 'aab', 'ipa', 'exe', 'msi', 'app', 'dmg', 'pkg', 'deb', 'rpm', 'appimage',
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 'gz', 'jar', 'war', 'node', 'whl',
  'pb', 'tflite', 'bin', 'dll', 'so', 'dylib', 'wav', 'mp3', 'mp4', 'mov', 'pyc'
];

// Helper to stop UI freezing by yielding control back to the event loop
const yieldToMainThread = () => new Promise(resolve => setTimeout(resolve, 0));

export const isBinary = (filename: string): boolean => {
  const parts = filename.split('.');
  if (parts.length === 1) return false;
  const ext = parts.pop()?.toLowerCase() || '';
  if (TEXT_EXTENSIONS.includes(ext)) return false;
  return BINARY_EXTENSIONS.includes(ext);
};

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const processFiles = async (input: FileList | File[]): Promise<FileNode[]> => {
  const files: FileNode[] = [];
  const rawFiles = Array.from(input);
  
  const zipFiles = rawFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));
  const normalFiles = rawFiles.filter(f => !f.name.toLowerCase().endsWith('.zip'));

  // PROCESS STANDARD FILES
  for (let i = 0; i < normalFiles.length; i++) {
    // Every 10 files, pause briefly to let the UI update
    if (i % 10 === 0) await yieldToMainThread();
    
    const file = normalFiles[i];
    const path = (file as any).webkitRelativePath || (file as any).fullPath || file.name;
    if (shouldIgnore(path)) continue;

    try {
      if (isBinary(path)) {
        files.push({
          path,
          name: file.name,
          extension: file.name.split('.').pop() || '',
          content: `[INGESTED BINARY METADATA: ${file.name} | Size: ${file.size} bytes]`,
          size: file.size
        });
      } else {
        const content = await readFileContent(file);
        files.push({
          path,
          name: file.name,
          extension: file.name.split('.').pop() || '',
          content,
          size: file.size
        });
      }
    } catch (e) {
      console.warn(`Failed to read file: ${file.name}`, e);
    }
  }

  // PROCESS ZIP FILES
  const JSZip = getJSZip();
  if (zipFiles.length > 0 && JSZip) {
    for (const zipFile of zipFiles) {
      try {
        const zip = await JSZip.loadAsync(zipFile);
        const entries = Object.keys(zip.files);
        
        for (let j = 0; j < entries.length; j++) {
           // Yield every 20 zip entries to prevent freeze
           if (j % 20 === 0) await yieldToMainThread();

           const filename = entries[j];
           if (shouldIgnore(filename)) continue;
           if (zip.files[filename].dir) continue;

           try {
             if (isBinary(filename)) {
               files.push({
                 path: filename,
                 name: filename.split('/').pop() || filename,
                 extension: filename.split('.').pop() || '',
                 content: `[INGESTED BINARY IN ZIP: ${filename}]`,
                 size: 0
               });
             } else {
               const content = await zip.files[filename].async('string');
               files.push({
                 path: filename,
                 name: filename.split('/').pop() || filename,
                 extension: filename.split('.').pop() || '',
                 content,
                 size: content.length
               });
             }
           } catch (entryError) {
             console.warn(`Failed to process zip entry: ${filename}`, entryError);
           }
        }
      } catch (e) {
        console.error("Error unzipping", e);
        throw new Error(`Failed to process ZIP file (${zipFile.name})`);
      }
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
};

const shouldIgnore = (path: string): boolean => {
  const parts = path.split(/[\/\\]/);
  if (parts.some(part => IGNORED_FOLDERS.includes(part))) return true;
  const filename = parts[parts.length - 1];
  if (IGNORED_FILES.includes(filename)) return true;
  if (filename.startsWith('.')) {
    if (['.env', '.gitignore', '.editorconfig', '.babelrc', '.eslintrc'].includes(filename)) return false;
    if (['.DS_Store', '.gitkeep', '.git'].includes(filename)) return true;
  }
  return false;
};

export const calculateStats = (files: FileNode[]): ProcessingStats => {
  const stats: ProcessingStats = {
    totalFiles: files.length,
    totalLines: 0,
    totalSize: 0,
    fileTypes: {}
  };

  files.forEach(f => {
    stats.totalSize += f.size;
    if (!f.content.startsWith('[INGESTED BINARY')) {
        stats.totalLines += f.content.split('\n').length;
    }
    const type = f.extension.toUpperCase() || 'UNKNOWN';
    stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1;
  });

  return stats;
};

export const generateFlattenedDocument = (files: FileNode[]): string => {
  let output = `# MONOFILE GENERATED CODEBASE\n`;
  output += `# Generated at: ${new Date().toISOString()}\n`;
  output += `# File Count: ${files.length}\n`;
  output += `================================================================================\n\n`;

  files.forEach(file => {
    const pathParts = file.path.split(/[\/\\]/);
    const fileName = pathParts.pop();
    const folderStructure = pathParts.join(' / ');

    output += `\n`;
    output += `### PATH: ${folderStructure || '(root)'}\n`;
    output += `## FILE: ${fileName}\n`;
    output += `\`\`\`${file.extension}\n`;
    output += file.content;
    output += `\n\`\`\`\n`;
    output += `\n--------------------------------------------------------------------------------\n`;
  });

  return output;
};

export const downloadStringAsFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
