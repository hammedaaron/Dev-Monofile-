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
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(data);
    }
  });
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

  // 2. Loop through every file (html, manifest, icons...)
  for (const [filename, content] of Object.entries(files)) {
    const contentBase64 = await fileToBase64(content);
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${filename}`;

    // 3. Check if file exists (We need its 'sha' ID to update it)
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

    // 4. Upload (PUT request)
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
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Upload Failed for ${filename}: ${errorData.message}`);
    }
  }

  // 5. Success! Return the live URL
  return `https://${owner}.github.io/${repo}/`;
};