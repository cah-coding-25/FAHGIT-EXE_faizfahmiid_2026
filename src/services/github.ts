/**
 * FAHGIT GitHub API Engine
 * Direct browser-to-GitHub HTTPS communication via REST and Git Database API.
 * Never leaks token to third-party endpoints or AI Studio.
 */

import {
  GitHubUser,
  GitHubRepo,
  GitHubBranch,
  GitTreeItem,
  GitCommit,
  RateLimitInfo,
  TokenValidationResult,
} from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubApiError extends Error {
  status: number;
  data: unknown;
  documentationUrl?: string;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.data = data;
    if (data && typeof data === 'object' && 'documentation_url' in data) {
      this.documentationUrl = (data as { documentation_url: string }).documentation_url;
    }
  }
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const used = headers.get('x-ratelimit-used');

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      used: used ? parseInt(used, 10) : 0,
    };
  }
  return undefined;
}

function encodeBranchPath(branch: string): string {
  return branch
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

// Request helper with standard GitHub API headers
async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<{ data: T; headers: Headers; rateLimit?: RateLimitInfo }> {
  const url = endpoint.startsWith('https://') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token.trim()}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers,
    });

    const rateLimit = parseRateLimitHeaders(response.headers);

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }

      let apiMessage = '';
      if (errorBody && typeof errorBody === 'object' && 'message' in errorBody) {
        apiMessage = String((errorBody as { message: string }).message || '').trim();
      }

      let message = apiMessage || `GitHub API request failed with status ${response.status}`;

      if (response.status === 401) {
        message = 'Token GitHub tidak valid atau telah kedaluwarsa (401 Unauthorized).';
      } else if (response.status === 403 && rateLimit && rateLimit.remaining === 0) {
        message = `Batas kuota GitHub API tercapai. Reset pada ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}.`;
      } else if (response.status === 403) {
        message = apiMessage
          ? `Akses ditolak (403): ${apiMessage}`
          : 'Akses ditolak (403): Token tidak memiliki izin yang dibutuhkan.';
      } else if (response.status === 404) {
        message =
          apiMessage && apiMessage.toLowerCase() !== 'not found'
            ? `Tidak ditemukan (404): ${apiMessage}`
            : 'Resource tidak ditemukan (404). Periksa nama repositori, cabang (branch), atau izin akses token Anda.';
      } else if (response.status === 409) {
        message = apiMessage
          ? `Konflik / status repositori (409): ${apiMessage}`
          : 'Konflik terdeteksi (409): Berkas atau cabang telah berubah.';
      }

      throw new GitHubApiError(message, response.status, errorBody);
    }

    if (response.status === 204) {
      return { data: null as unknown as T, headers: response.headers, rateLimit };
    }

    const data = await response.json();
    return { data, headers: response.headers, rateLimit };
  } catch (err: unknown) {
    if (err instanceof GitHubApiError) throw err;
    if (err instanceof Error && err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new GitHubApiError('Network connection failed or request blocked by browser CORS/firewall.', 0);
    }
    throw new GitHubApiError(err instanceof Error ? err.message : 'Unknown GitHub API error', 0);
  }
}

/**
 * Validate a Personal Access Token and read user profile, scopes, and rate limits
 */
export async function validateToken(token: string): Promise<TokenValidationResult> {
  if (!token || !token.trim()) {
    return { valid: false, scopes: [], error: 'Token is required' };
  }

  try {
    const { data: user, headers, rateLimit } = await githubFetch<GitHubUser>('/user', token);
    const scopesHeader = headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader ? scopesHeader.split(',').map((s) => s.trim()) : [];

    return {
      valid: true,
      user,
      scopes,
      rateLimit,
    };
  } catch (err) {
    if (err instanceof GitHubApiError) {
      let errorType: TokenValidationResult['errorType'] = 'unknown';
      if (err.status === 401) errorType = 'unauthorized';
      else if (err.status === 403) errorType = 'forbidden';
      else if (err.status === 0) errorType = 'network';

      return {
        valid: false,
        scopes: [],
        error: err.message,
        errorType,
      };
    }
    return {
      valid: false,
      scopes: [],
      error: err instanceof Error ? err.message : 'Validation failed',
      errorType: 'unknown',
    };
  }
}

/**
 * Fetch current rate limit status
 */
export async function getRateLimit(token: string): Promise<RateLimitInfo | undefined> {
  try {
    const { data } = await githubFetch<{ rate: RateLimitInfo }>('/rate_limit', token);
    return data.rate;
  } catch {
    return undefined;
  }
}

/**
 * List all repositories accessible by the token
 */
export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  // Fetch up to 100 repositories, sorted by updated
  const { data } = await githubFetch<GitHubRepo[]>(
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
    token
  );
  return data;
}

/**
 * Fetch single repository details
 */
export async function getRepoDetails(token: string, owner: string, repo: string): Promise<GitHubRepo> {
  const { data } = await githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token);
  return data;
}

/**
 * Create a new GitHub repository
 */
export async function createRepo(
  token: string,
  params: {
    name: string;
    description?: string;
    private: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }
): Promise<GitHubRepo> {
  const payload: Record<string, unknown> = {
    name: params.name.trim(),
    private: params.private,
    auto_init: params.auto_init ?? true,
  };
  if (params.description?.trim()) {
    payload.description = params.description.trim();
  }
  if (params.gitignore_template?.trim()) {
    payload.gitignore_template = params.gitignore_template.trim();
  }
  if (params.license_template?.trim()) {
    payload.license_template = params.license_template.trim();
  }

  const { data } = await githubFetch<GitHubRepo>('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

/**
 * Delete a repository (Requires `delete_repo` scope for Classic PAT or Administration write for Fine-Grained PAT)
 */
export async function deleteRepo(token: string, owner: string, repo: string): Promise<void> {
  try {
    await githubFetch<void>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
      {
        method: 'DELETE',
      }
    );
  } catch (err) {
    if (err instanceof GitHubApiError && (err.status === 403 || err.status === 404)) {
      throw new GitHubApiError(
        `Gagal menghapus repositori '${owner}/${repo}' (${err.status}). Pastikan token PAT Anda memiliki izin/scope "delete_repo" (Classic PAT) atau "Administration: Read & write" (Fine-grained PAT) serta hak Admin di repositori ini.`,
        err.status,
        err.data
      );
    }
    throw err;
  }
}

/**
 * Update repository settings (rename, description, visibility, archive)
 */
export async function updateRepoSettings(
  token: string,
  owner: string,
  repo: string,
  data: {
    name?: string;
    description?: string;
    private?: boolean;
    default_branch?: string;
    archived?: boolean;
  }
): Promise<GitHubRepo> {
  const { data: updated } = await githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return updated;
}

/**
 * List branches of a repository
 */
export async function getBranches(token: string, owner: string, repo: string): Promise<GitHubBranch[]> {
  const { data } = await githubFetch<GitHubBranch[]>(`/repos/${owner}/${repo}/branches?per_page=100`, token);
  return data;
}

/**
 * Create a new branch pointing to an existing commit SHA
 */
export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromSha: string
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName.trim()}`,
      sha: fromSha,
    }),
  });
}

/**
 * Delete a branch
 */
export async function deleteBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchName)}`, token, {
    method: 'DELETE',
  });
}

/**
 * Get entire Git tree recursively
 */
export async function getGitTree(
  token: string,
  owner: string,
  repo: string,
  treeShaOrBranch: string,
  recursive = true
): Promise<{ sha: string; tree: GitTreeItem[]; truncated: boolean }> {
  const refEncoded = encodeBranchPath(treeShaOrBranch);
  const { data } = await githubFetch<{ sha: string; tree: GitTreeItem[]; truncated: boolean }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${refEncoded}${recursive ? '?recursive=1' : ''}`,
    token
  );
  return data;
}

/**
 * Check if a branch ref exists and return its HEAD commit SHA
 */
export async function getBranchRefSha(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const { data } = await githubFetch<{ object: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeBranchPath(branch)}`,
    token
  );
  return data.object.sha;
}

/**
 * Fetch raw blob content (base64 or text)
 */
export async function getBlob(
  token: string,
  owner: string,
  repo: string,
  sha: string
): Promise<{ content: string; encoding: string; size: number }> {
  const { data } = await githubFetch<{ content: string; encoding: string; size: number }>(
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
    token
  );
  return data;
}

/**
 * Fetch file contents using GitHub Contents API (includes SHA, size, and download_url)
 */
export async function getFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
  download_url: string | null;
}> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
  const { data } = await githubFetch<{
    name: string;
    path: string;
    sha: string;
    size: number;
    content?: string;
    encoding?: string;
    download_url: string | null;
  }>(endpoint, token);
  return data;
}

/**
 * Create or update a single file via Contents API
 */
export async function saveFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  contentBase64: string,
  message: string,
  branch: string,
  sha?: string
): Promise<{ commit: { sha: string; html_url: string }; content: { sha: string } }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;
  
  const payload: Record<string, unknown> = {
    message: message || `Update ${cleanPath}`,
    content: contentBase64,
    branch,
  };
  if (sha) {
    payload.sha = sha;
  }

  const { data } = await githubFetch<{ commit: { sha: string; html_url: string }; content: { sha: string } }>(
    endpoint,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return data;
}

/**
 * Delete a file via Contents API
 */
export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch: string
): Promise<{ commit: { sha: string } }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`;

  const { data } = await githubFetch<{ commit: { sha: string } }>(endpoint, token, {
    method: 'DELETE',
    body: JSON.stringify({
      message: message || `Delete ${cleanPath}`,
      sha,
      branch,
    }),
  });
  return data;
}

/**
 * Get commit history for a repository and branch
 */
export async function getCommits(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  perPage = 30
): Promise<GitCommit[]> {
  const query = new URLSearchParams();
  if (branch) query.set('sha', branch);
  query.set('per_page', perPage.toString());

  const { data } = await githubFetch<GitCommit[]>(
    `/repos/${owner}/${repo}/commits?${query.toString()}`,
    token
  );
  return data;
}

/**
 * Get detailed commit with file diffs
 */
export async function getCommitDetails(
  token: string,
  owner: string,
  repo: string,
  ref: string
): Promise<GitCommit> {
  const { data } = await githubFetch<GitCommit>(`/repos/${owner}/${repo}/commits/${ref}`, token);
  return data;
}

/**
 * Create a Git Blob using Git Database API
 */
export async function createGitBlob(
  token: string,
  owner: string,
  repo: string,
  content: string,
  encoding: 'utf-8' | 'base64' = 'base64'
): Promise<{ sha: string }> {
  const { data } = await githubFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, token, {
    method: 'POST',
    body: JSON.stringify({
      content,
      encoding,
    }),
  });
  return data;
}

/**
 * High-performance Atomic Git Batch Commit Engine
 * Creates blobs, creates tree, creates commit, and updates reference in ONE unified transaction.
 */
export interface TreeEntryInput {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000' | '120000';
  type: 'blob' | 'tree' | 'commit';
  sha?: string | null; // null if deleting path
}

export async function createBatchCommit(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  treeEntries: TreeEntryInput[],
  commitMessage: string,
  options?: { replaceTree?: boolean }
): Promise<{ commitSha: string; commitUrl: string }> {
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const encodedBranch = encodeBranchPath(branch);

  // 1. Get branch reference to find current HEAD commit
  const { data: refData } = await githubFetch<{ object: { sha: string } }>(
    `/repos/${encodedOwner}/${encodedRepo}/git/ref/heads/${encodedBranch}`,
    token
  );
  const headCommitSha = refData.object.sha;

  // 2. Get HEAD commit to find base tree SHA (only needed when merging instead of replacing)
  let baseTreeSha: string | undefined;
  if (!options?.replaceTree) {
    const { data: commitData } = await githubFetch<{ tree: { sha: string } }>(
      `/repos/${encodedOwner}/${encodedRepo}/git/commits/${headCommitSha}`,
      token
    );
    baseTreeSha = commitData.tree.sha;
  }

  // 3. Create new Tree (without base_tree when replaceTree is true for an exact 1:1 tree)
  const treePayload: Record<string, unknown> = {
    tree: treeEntries,
  };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  }

  const { data: newTree } = await githubFetch<{ sha: string }>(
    `/repos/${encodedOwner}/${encodedRepo}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(treePayload),
    }
  );

  // 4. Create new Commit
  const { data: newCommit } = await githubFetch<{ sha: string; html_url: string }>(
    `/repos/${encodedOwner}/${encodedRepo}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage || 'Batch update from FAHGIT',
        tree: newTree.sha,
        parents: [headCommitSha],
      }),
    }
  );

  // 5. Update branch reference to point to new commit
  await githubFetch(
    `/repos/${encodedOwner}/${encodedRepo}/git/refs/heads/${encodedBranch}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    }
  );

  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url || `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
  };
}
