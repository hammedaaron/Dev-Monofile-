// src/services/githubService.ts

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Helper: Converts a file (Blob) or text to the Base64 format GitHub requires.
 */
const fileToBase64 = (data: Blob | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof data === 'string') {
      // Encode text (like html/json) to Base64
      resolve(btoa(unescape(encodeURIComponent(data))));
    } else {
      // Encode binary (images) to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the "data:image/png;base64," prefix that FileReader adds
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
 * Helper: Checks if a branch exists, and creates it if it doesn't.
 */
const ensureBranchExists = async (token: string, owner: string, repo: string, targetBranch: string) => {
  const headers = { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json'
  };

  // 1. Check if the target branch (gh-pages) already exists
  const checkRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, { headers });
  if (checkRes.ok) return; // Branch exists, we are good to go.

  // 2. If it doesn't exist, we need to find the default branch (usually 'main' or 'master') to branch OFF of.
  const repoRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error("Could not fetch repository info to create branch.");
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  // 3. Get the SHA (ID) of the latest commit on the default branch
  const refRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
  if (!refRes.ok) throw new Error(`Repo must have at least one commit on '${defaultBranch}' to create a new branch.`);
  const refData = await refRes.json();
  const sha = refData.object.sha;

  // 4. Create the new branch pointing to that SHA
  const createRes = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${targetBranch}`,
      sha: sha
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Failed to create branch '${targetBranch}': ${err.message}`);
  }
};

/**
 * Main Function: Uploads the PWA files to the gh-pages branch
 */
export const deployToGitHubPages = async (
  token: string,
  repoFullString: string, // format: "username/repo"
  files: Record<string, Blob | string>
) => {
  // 1. Validation
  const parts = repoFullString.trim().split('/');
  if (parts.length !== 2) throw new Error("Invalid Repo format. Use: username/repo-name");
  
  const [owner, repo] = parts;
  const branch = 'gh-pages'; // The standard hosting branch

  // 2. Ensure the branch exists before trying to upload
  // This prevents the "Branch not found" error
  await ensureBranchExists(token, owner, repo, branch);

  // 3. Loop through every file (html, manifest, icons...)
  for (const [filename, content] of Object.entries(files)) {
    const contentBase64 = await fileToBase64(content);
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${filename}`;

    // 4. Check if file exists (We need its 'sha' ID to update it)
    let sha: string | undefined;
    try {
      const checkRes = await fetch(`${url}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        sha = data.sha;
      }
    } catch (e) {
      // If file doesn't exist, that's fine, we will create it.
    }

    // 5. Upload (PUT request)
    const body = {
      message: `Monofile Auto-Deploy: ${filename}`,
      content: contentBase64,
      branch: branch,
      sha: sha // Required if we are updating an existing file
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

  // 6. Success! Return the live URL
  return `https://${owner}.github.io/${repo}/`;
};