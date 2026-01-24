// src/services/githubService.ts

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Helper: Converts a file (Blob) or text to the Base64 format GitHub requires.
 */
const fileToBase64 = (data: Blob | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof data === 'string') {
      // Encode text to Base64 (handling utf-8 characters correctly)
      resolve(btoa(unescape(encodeURIComponent(data))));
    } else {
      // Encode binary (images) to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        } else {
            reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(data);
    }
  });
};

/**
 * Helper: Fetch a file content from the repo to read it before editing
 */
export const getFileContent = async (
  token: string, 
  owner: string, 
  repo: string, 
  path: string, 
  branch: string
): Promise<string | null> => {
  try {
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!res.ok) return null; // File doesn't exist yet
    
    const data = await res.json();
    // GitHub sends content in Base64. We decode it to readable string.
    return decodeURIComponent(escape(atob(data.content)));
  } catch (e) {
    console.error("Error fetching file:", e);
    return null;
  }
};

/**
 * Helper: Checks if a branch exists, and creates it if it doesn't.
 */
const ensureBranchExists = async (token: string, owner: string, repo: string, targetBranch: string) => {
  const headers = { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json'
  };

  const checkRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, { headers });
  if (checkRes.ok) return;

  // If not, find default branch to branch off of
  const repoRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error("Could not fetch repository info.");
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const refRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
  if (!refRes.ok) throw new Error(`Repo must have commits on '${defaultBranch}'.`);
  const refData = await refRes.json();

  await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${targetBranch}`,
      sha: refData.object.sha
    })
  });
};

/**
 * Main Function: Uploads files to GitHub
 */
export const deployToGitHubPages = async (
  token: string,
  repoFullString: string, 
  files: Record<string, Blob | string>,
  targetBranch: string = 'gh-pages'
) => {
  const parts = repoFullString.trim().split('/');
  if (parts.length !== 2) throw new Error("Invalid Repo format. Use: username/repo-name");
  
  const [owner, repo] = parts;
  await ensureBranchExists(token, owner, repo, targetBranch);

  for (const [filename, content] of Object.entries(files)) {
    const contentBase64 = await fileToBase64(content);
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${filename}`;

    let sha: string | undefined;
    try {
      const checkRes = await fetch(`${url}?ref=${targetBranch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        sha = data.sha;
      }
    } catch (e) {}

    const body = {
      message: `Monofile PWA Update: ${filename}`,
      content: contentBase64,
      branch: targetBranch,
      sha: sha
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Upload Failed for ${filename}: ${errorData.message}`);
    }
  }

  return `https://github.com/${owner}/${repo}/tree/${targetBranch}`;
};