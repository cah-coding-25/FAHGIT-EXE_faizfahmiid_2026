/**
 * FAHGIT by Faiz_Fahmi_ID - Core TypeScript Type Definitions
 */

export type AppView = 
  | 'dashboard'
  | 'repositories'
  | 'file-manager'
  | 'code-editor'
  | 'upload-center'
  | 'zip-manager'
  | 'repo-cloner'
  | 'branches'
  | 'commits'
  | 'favorites'
  | 'recent-files'
  | 'activity-logs'
  | 'backup-restore'
  | 'connection'
  | 'settings'
  | 'about';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  total_private_repos?: number;
  owned_private_repos?: number;
  disk_usage?: number;
  collaborators?: number;
  two_factor_authentication?: boolean;
  plan?: {
    name: string;
    space: number;
    collaborators: number;
    private_repos: number;
  };
  created_at: string;
  updated_at: string;
  type: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  language: string | null;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  visibility?: 'public' | 'private' | 'internal';
  open_issues_count: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitCommit {
  sha: string;
  html_url: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
    };
  };
  parents: Array<{ sha: string }>;
  files?: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  sha: string;
  mode?: string;
  extension?: string;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  sha: string;
  isDirty: boolean;
  language: string;
  readOnly?: boolean;
  isBinary?: boolean;
  binaryMime?: string;
}

export interface EncryptedCredential {
  id: string;
  salt: string;        // Base64
  iv: string;          // Base64
  ciphertext: string;  // Base64
  updatedAt: string;
  tokenHint: string;   // e.g. "ghp_****1234"
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: GitHubUser;
  scopes: string[];
  rateLimit?: RateLimitInfo;
  error?: string;
  errorType?: 'unauthorized' | 'forbidden' | 'rate_limited' | 'network' | 'unknown';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'REPO_OPENED'
    | 'REPO_CREATED'
    | 'REPO_DELETED'
    | 'FILE_CREATED'
    | 'FILE_EDITED'
    | 'FILE_DELETED'
    | 'FILE_RENAMED'
    | 'FILE_MOVED'
    | 'FOLDER_CREATED'
    | 'FOLDER_DELETED'
    | 'BATCH_UPLOAD'
    | 'ZIP_EXTRACTED'
    | 'BRANCH_CREATED'
    | 'BRANCH_DELETED'
    | 'BRANCH_SWITCHED'
    | 'COMMIT_CREATED'
    | 'CONFIG_BACKUP'
    | 'CONFIG_RESTORE';
  repo?: string;
  target?: string;
  status: 'SUCCESS' | 'ERROR' | 'INFO';
  details?: string;
}

export interface UploadBatchItem {
  file: File;
  path: string;
  relativePath: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped';
  error?: string;
}

export interface ExtractedZipItem {
  path: string;
  isDirectory: boolean;
  size: number;
  data: Uint8Array | null;
  selected: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  autoLockMinutes: number;
  monacoTheme: 'vs-dark' | 'light';
  monacoFontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  rememberEncryptedToken: boolean;
  defaultCommitMessage: string;
}
