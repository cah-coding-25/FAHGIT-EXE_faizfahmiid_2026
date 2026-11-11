/**
 * FAHGIT Repository Cloner Engine
 * By: Faiz_Fahmi_ID
 *
 * Mengkloning seluruh berkas dan struktur folder dari repositori GitHub mana pun
 * langsung ke repositori pribadi pengguna secara 100% client-side melalui HTTPS GitHub REST & Git Database API.
 */

import JSZip from 'jszip';
import {
  createRepo,
  createGitBlob,
  createBatchCommit,
  getGitTree,
  getBlob,
  TreeEntryInput,
} from './github';
import { GitHubRepo } from '../types';

export interface SourceRepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  language: string | null;
  sizeKb: number;
  htmlUrl: string;
}

export interface CloneProgress {
  percentage: number;
  stage: string;
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
}

export interface CloneResult {
  success: boolean;
  destinationRepo: string;
  destinationUrl: string;
  branch: string;
  totalFilesCloned: number;
  commitSha: string;
  error?: string;
}

/**
 * Mengurai string input URL / slug GitHub menjadi { owner, repo }
 * Contoh masukan yang didukung:
 * - https://github.com/facebook/react
 * - https://github.com/facebook/react.git
 * - github.com/facebook/react
 * - facebook/react
 */
export function parseGitHubRepoUrl(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  // Hapus trailing slash atau .git
  const clean = trimmed.replace(/\.git\/?$/, '').replace(/\/+$/, '');

  // Coba pola URL https://github.com/owner/repo
  const urlMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Coba pola owner/repo
  const slugMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slugMatch && slugMatch[1] && slugMatch[2]) {
    return { owner: slugMatch[1], repo: slugMatch[2] };
  }

  return null;
}

/**
 * Mengambil metadata informasi repositori sumber
 */
export async function fetchSourceRepoMetadata(
  owner: string,
  repo: string,
  token?: string
): Promise<SourceRepoInfo> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repositori '${owner}/${repo}' tidak ditemukan atau bersifat privat (membutuhkan akses token).`);
    }
    if (res.status === 403) {
      throw new Error('Batas kuota akses API GitHub tercapai atau akses ditolak.');
    }
    throw new Error(`Gagal membaca repositori sumber (Status HTTP ${res.status}).`);
  }

  const data = await res.json();
  return {
    owner: data.owner?.login || owner,
    repo: data.name || repo,
    fullName: data.full_name || `${owner}/${repo}`,
    description: data.description,
    defaultBranch: data.default_branch || 'main',
    isPrivate: Boolean(data.private),
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    language: data.language,
    sizeKb: data.size || 0,
    htmlUrl: data.html_url || `https://github.com/${owner}/${repo}`,
  };
}

/**
 * Mengunduh seluruh berkas repositori sumber menggunakan zipball atau rekursif Git Tree
 */
interface ClonedFile {
  path: string;
  contentBase64: string;
}

export async function downloadSourceRepoFiles(
  source: SourceRepoInfo,
  token: string | undefined,
  onProgress: (progress: CloneProgress) => void
): Promise<ClonedFile[]> {
  onProgress({
    percentage: 15,
    stage: 'Mengunduh arsip berkas repositori sumber...',
  });

  // Metode 1: Mengunduh arsip ZIP tarball
  try {
    const zipUrl = `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/zipball/${encodeURIComponent(source.defaultBranch)}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const res = await fetch(zipUrl, { headers });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      onProgress({
        percentage: 30,
        stage: 'Mengekstrak berkas arsip repositori...',
      });

      const zip = await JSZip.loadAsync(arrayBuffer);
      const files: ClonedFile[] = [];
      const entries: Array<{ relativePath: string; entry: JSZip.JSZipObject }> = [];

      zip.forEach((relPath, entry) => {
        if (!entry.dir) {
          entries.push({ relativePath: relPath, entry });
        }
      });

      const total = entries.length;
      let processed = 0;

      for (const { relativePath, entry } of entries) {
        // Buang segmen folder root bawaan zipball (misal 'owner-repo-sha/')
        const segments = relativePath.split('/');
        if (segments.length > 1) {
          segments.shift(); // buang root folder
          const cleanPath = segments.join('/');
          if (cleanPath && !cleanPath.startsWith('.git/')) {
            const base64Content = await entry.async('base64');
            files.push({
              path: cleanPath,
              contentBase64: base64Content,
            });
          }
        }
        processed++;
        if (processed % 15 === 0 || processed === total) {
          onProgress({
            percentage: 30 + Math.round((processed / total) * 15),
            stage: `Mengekstrak berkas (${processed}/${total})...`,
            processedFiles: processed,
            totalFiles: total,
          });
        }
      }

      if (files.length > 0) {
        return files;
      }
    }
  } catch (err) {
    console.warn('[RepoCloner] Zipball fetch notice, falling back to Git Tree:', err);
  }

  // Metode 2: Fallback ke Git Tree Rekursif
  onProgress({
    percentage: 30,
    stage: 'Mengambil pohon Git rekursif repositori...',
  });

  if (!token) {
    throw new Error('Gagal mengunduh arsip repositori. Token Personal Access GitHub diperlukan untuk kloning lanjutan.');
  }

  const { tree } = await getGitTree(token, source.owner, source.repo, source.defaultBranch);
  const blobItems = tree.filter((item) => item.type === 'blob');
  const total = blobItems.length;
  const files: ClonedFile[] = [];

  // Unduh blob secara paralel dalam batch kecil untuk efisiensi
  const BATCH_SIZE = 6;
  for (let i = 0; i < blobItems.length; i += BATCH_SIZE) {
    const batch = blobItems.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const blobData = await getBlob(token, source.owner, source.repo, item.sha);
          files.push({
            path: item.path,
            contentBase64: blobData.content.replace(/\n/g, ''),
          });
        } catch (err) {
          console.warn(`[RepoCloner] Gagal mengunduh blob ${item.path}:`, err);
        }
      })
    );

    const processed = Math.min(i + BATCH_SIZE, total);
    onProgress({
      percentage: 30 + Math.round((processed / total) * 15),
      stage: `Mengunduh berkas sumber (${processed}/${total})...`,
      processedFiles: processed,
      totalFiles: total,
    });
  }

  return files;
}

/**
 * Eksekusi Utama Kloning Repositori
 */
export async function executeCloneRepository(options: {
  token: string;
  sourceRepo: SourceRepoInfo;
  isCreateNewRepo: boolean;
  targetRepoName: string;
  targetRepoDescription: string;
  targetIsPrivate: boolean;
  existingTargetRepo?: GitHubRepo;
  targetBranch?: string;
  onProgress: (progress: CloneProgress) => void;
}): Promise<CloneResult> {
  const {
    token,
    sourceRepo,
    isCreateNewRepo,
    targetRepoName,
    targetRepoDescription,
    targetIsPrivate,
    existingTargetRepo,
    onProgress,
  } = options;

  onProgress({
    percentage: 5,
    stage: 'Memulai verifikasi dan inisialisasi kloning...',
  });

  // 1. Dapatkan informasi repositori tujuan
  let destOwner = '';
  let destRepoName = '';
  let destBranch = options.targetBranch || 'main';

  if (isCreateNewRepo) {
    onProgress({
      percentage: 10,
      stage: `Membuat repositori baru '${targetRepoName.trim()}' di akun Anda...`,
    });

    const newRepo = await createRepo(token, {
      name: targetRepoName.trim(),
      description: targetRepoDescription.trim() || `Cloned from ${sourceRepo.fullName} via FAHGIT`,
      private: targetIsPrivate,
      auto_init: true,
    });

    destOwner = newRepo.owner.login;
    destRepoName = newRepo.name;
    destBranch = newRepo.default_branch || 'main';

    // Beri jeda 1.5 detik agar GitHub menginisialisasi branch utama
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    if (!existingTargetRepo) {
      throw new Error('Repositori tujuan yang dipilih tidak valid.');
    }
    destOwner = existingTargetRepo.owner.login;
    destRepoName = existingTargetRepo.name;
    destBranch = options.targetBranch || existingTargetRepo.default_branch || 'main';
  }

  // 2. Unduh berkas dari sumber
  const files = await downloadSourceRepoFiles(sourceRepo, token, onProgress);
  if (files.length === 0) {
    throw new Error('Tidak ada berkas yang ditemukan pada repositori sumber untuk dikloning.');
  }

  onProgress({
    percentage: 50,
    stage: `Mempersiapkan ${files.length} berkas untuk diunggah ke '${destRepoName}'...`,
    totalFiles: files.length,
    processedFiles: 0,
  });

  // 3. Unggah Blob ke repositori tujuan dalam batch terkontrol
  const treeEntries: TreeEntryInput[] = [];
  const UPLOAD_BATCH = 5;
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
    const chunk = files.slice(i, i + UPLOAD_BATCH);

    await Promise.all(
      chunk.map(async (file) => {
        try {
          const blob = await createGitBlob(token, destOwner, destRepoName, file.contentBase64, 'base64');
          treeEntries.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
          });
        } catch (err) {
          console.error(`[RepoCloner] Gagal membuat blob untuk ${file.path}:`, err);
          throw new Error(`Gagal mengunggah berkas '${file.path}': ${err instanceof Error ? err.message : 'Error'}`);
        }
      })
    );

    const processed = Math.min(i + UPLOAD_BATCH, totalFiles);
    const progressPercent = 50 + Math.round((processed / totalFiles) * 40);

    onProgress({
      percentage: progressPercent,
      stage: `Mengunggah berkas ke repositori pribadi (${processed}/${totalFiles})...`,
      currentFile: chunk[chunk.length - 1]?.path,
      processedFiles: processed,
      totalFiles: totalFiles,
    });
  }

  // 4. Buat Commit Atomik Git
  onProgress({
    percentage: 95,
    stage: 'Menyelesaikan commit atomik Git ke cabang utama...',
  });

  const commitMsg = `Kloning lengkap dari ${sourceRepo.fullName}\n\nSumber: ${sourceRepo.htmlUrl}\nDibuat otomatis via FAHGIT by Faiz_Fahmi_ID`;
  const commitRes = await createBatchCommit(
    token,
    destOwner,
    destRepoName,
    destBranch,
    treeEntries,
    commitMsg
  );

  onProgress({
    percentage: 100,
    stage: 'Kloning repositori berhasil 100%!',
    processedFiles: totalFiles,
    totalFiles: totalFiles,
  });

  return {
    success: true,
    destinationRepo: `${destOwner}/${destRepoName}`,
    destinationUrl: `https://github.com/${destOwner}/${destRepoName}`,
    branch: destBranch,
    totalFilesCloned: totalFiles,
    commitSha: commitRes.commitSha,
  };
}
