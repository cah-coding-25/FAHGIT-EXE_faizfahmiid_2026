/**
 * FAHGIT Repository Cloner Engine
 * By: Faiz_Fahmi_ID
 *
 * Mengkloning seluruh berkas dan struktur folder dari repositori GitHub mana pun
 * langsung ke repositori pribadi pengguna secara persis 1:1 (tanpa ada berkas ditambah atau dikurangi).
 */

import JSZip from 'jszip';
import {
  createRepo,
  createGitBlob,
  createBatchCommit,
  createBranch,
  getBranches,
  getBranchRefSha,
  getRepoDetails,
  updateRepoSettings,
  saveFile,
  getGitTree,
  getBlob,
  TreeEntryInput,
} from './github';
import { GitHubRepo, GitTreeItem } from '../types';

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

interface ClonedFile {
  path: string;
  mode: '100644' | '100755' | '120000';
  contentBase64: string;
}

function normalizeGitFileMode(mode?: string): '100644' | '100755' | '120000' {
  if (mode === '100755' || mode === '120000') return mode;
  return '100644';
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 650): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Mengurai string input URL / slug GitHub menjadi { owner, repo }
 */
export function parseGitHubRepoUrl(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  const clean = trimmed.replace(/\.git\/?$/, '').replace(/\/+$/, '');

  const urlMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

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

  const res = await fetch(url, { headers, cache: 'no-store' });
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
 * Ambil seluruh daftar berkas (blobs) dari Git Tree secara utuh, termasuk repositori besar (truncated fallback)
 */
async function collectAllSourceBlobs(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GitTreeItem[]> {
  const rootTree = await getGitTree(token, owner, repo, branch, true);
  if (!rootTree.truncated) {
    return rootTree.tree.filter((item) => item.type === 'blob');
  }

  // Fallback jika repositori sangat besar dan GitHub menandai truncated: walk setiap subtree secara rekursif
  const allBlobs: GitTreeItem[] = [];
  const walkSubtree = async (treeSha: string, prefix: string): Promise<void> => {
    const res = await withRetry(() => getGitTree(token, owner, repo, treeSha, false), 3, 500);
    for (const entry of res.tree) {
      const fullPath = prefix ? `${prefix}/${entry.path}` : entry.path;
      if (entry.type === 'blob') {
        allBlobs.push({ ...entry, path: fullPath });
      } else if (entry.type === 'tree') {
        await walkSubtree(entry.sha, fullPath);
      }
    }
  };

  await walkSubtree(rootTree.sha, '');
  return allBlobs;
}

/**
 * Mengunduh seluruh berkas repositori sumber secara 100% persis (verifikasi manifes pohon Git)
 */
export async function downloadSourceRepoFiles(
  source: SourceRepoInfo,
  token: string,
  sourceBranch: string,
  onProgress: (progress: CloneProgress) => void
): Promise<ClonedFile[]> {
  onProgress({
    percentage: 14,
    stage: `Memeriksa daftar berkas lengkap dari ${source.fullName} (${sourceBranch})...`,
  });

  const blobItems = await collectAllSourceBlobs(token, source.owner, source.repo, sourceBranch);
  if (blobItems.length === 0) {
    throw new Error(`Repositori '${source.fullName}' tidak memiliki berkas apa pun pada cabang '${sourceBranch}'.`);
  }

  const total = blobItems.length;
  onProgress({
    percentage: 20,
    stage: `Ditemukan tepat ${total} berkas. Mengunduh seluruh isi repositori...`,
    totalFiles: total,
    processedFiles: 0,
  });

  // Coba ambil melalui zipball untuk kecepatan massal, lalu verifikasi kelengkapan 100% terhadap manifes Git Tree
  const zipContentMap = new Map<string, string>();
  try {
    const zipUrl = `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/zipball/${encodeURIComponent(sourceBranch)}`;
    const res = await fetch(zipUrl, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const rawEntries: Array<{ relativePath: string; entry: JSZip.JSZipObject }> = [];

      zip.forEach((relPath, entry) => {
        if (!entry.dir) {
          rawEntries.push({ relativePath: relPath, entry });
        }
      });

      for (const { relativePath, entry } of rawEntries) {
        const segments = relativePath.split('/');
        if (segments.length > 1) {
          segments.shift(); // buang nama folder root bawaan zipball GitHub
          const cleanPath = segments.join('/');
          if (cleanPath && !cleanPath.startsWith('.git/')) {
            const base64Content = await entry.async('base64');
            zipContentMap.set(cleanPath, base64Content);
          }
        }
      }
    }
  } catch {
    // Jika zipball terhalang CORS/redirect, unduh seluruh blob langsung melalui Git Blobs API
  }

  const files: ClonedFile[] = new Array(total);
  const missingBlobs: Array<{ index: number; item: GitTreeItem }> = [];

  for (let i = 0; i < blobItems.length; i++) {
    const item = blobItems[i];
    const mode = normalizeGitFileMode(item.mode);
    // Symlink (120000) lebih akurat dibaca langsung dari Git Blob daripada zipball
    const zipBase64 = mode !== '120000' ? zipContentMap.get(item.path) : undefined;
    if (zipBase64 !== undefined) {
      files[i] = {
        path: item.path,
        mode,
        contentBase64: zipBase64,
      };
    } else {
      missingBlobs.push({ index: i, item });
    }
  }

  let completed = total - missingBlobs.length;
  onProgress({
    percentage: 22 + Math.round((completed / total) * 23),
    stage:
      missingBlobs.length === 0
        ? `Seluruh ${total} berkas berhasil diekstrak secara utuh.`
        : `Mengunduh ${missingBlobs.length} berkas tersisa secara langsung...`,
    processedFiles: completed,
    totalFiles: total,
  });

  if (missingBlobs.length > 0) {
    const BATCH_SIZE = 6;
    for (let i = 0; i < missingBlobs.length; i += BATCH_SIZE) {
      const batch = missingBlobs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ index, item }) => {
          const blobData = await withRetry(
            () => getBlob(token, source.owner, source.repo, item.sha),
            4,
            700
          );
          files[index] = {
            path: item.path,
            mode: normalizeGitFileMode(item.mode),
            contentBase64: (blobData.content || '').replace(/\s/g, ''),
          };
        })
      );

      completed += batch.length;
      onProgress({
        percentage: 22 + Math.round((completed / total) * 23),
        stage: `Mengunduh berkas sumber (${completed}/${total})...`,
        currentFile: batch[batch.length - 1]?.item.path,
        processedFiles: completed,
        totalFiles: total,
      });
    }
  }

  return files;
}

/**
 * Pilih satu berkas untuk bootstrap repo kosong (prioritas berkas biasa non-symlink berukuran kecil)
 */
function pickBootstrapFileIndex(files: ClonedFile[]): number {
  let bestIdx = 0;
  let bestScore = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const modePenalty = f.mode === '100644' ? 0 : 100_000_000;
    const score = modePenalty + f.contentBase64.length;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Eksekusi Utama Kloning Repositori (100% persis tanpa menambah/mengurangi file)
 */
export async function executeCloneRepository(options: {
  token: string;
  sourceRepo: SourceRepoInfo;
  sourceBranch?: string;
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

  const srcBranch = options.sourceBranch || sourceRepo.defaultBranch || 'main';

  onProgress({
    percentage: 5,
    stage: 'Memulai verifikasi repositori sumber dan tujuan...',
  });

  // 1. Unduh seluruh berkas sumber TERLEBIH DAHULU sebelum membuat/mengubah repositori tujuan
  //    agar jika sumber kosong atau gagal diakses, tidak meninggalkan repo kosong yatim di akun pengguna.
  const files = await downloadSourceRepoFiles(sourceRepo, token, srcBranch, onProgress);

  // 2. Siapkan repositori tujuan
  let destOwner = '';
  let destRepoName = '';
  let destBranch = (options.targetBranch || '').trim() || srcBranch || 'main';
  let needsBootstrap = false;

  if (isCreateNewRepo) {
    const cleanRepoName = targetRepoName.trim().replace(/\s+/g, '-');
    if (!cleanRepoName) {
      throw new Error('Nama repositori baru tidak boleh kosong.');
    }

    onProgress({
      percentage: 48,
      stage: `Membuat repositori kosong '${cleanRepoName}' (tanpa file tambahan)...`,
    });

    const newRepo = await createRepo(token, {
      name: cleanRepoName,
      description: targetRepoDescription.trim() || `Cloned from ${sourceRepo.fullName} via FAHGIT`,
      private: targetIsPrivate,
      auto_init: false, // WAJIB false agar GitHub tidak menambah README.md ekstra
    });

    destOwner = newRepo.owner.login;
    destRepoName = newRepo.name;
    destBranch = srcBranch || newRepo.default_branch || 'main';
    needsBootstrap = true;

    // Pastikan repositori baru sudah selesai dipropagasi oleh GitHub sebelum operasi file
    await withRetry(() => getRepoDetails(token, destOwner, destRepoName), 6, 700);
  } else {
    if (!existingTargetRepo) {
      throw new Error('Repositori tujuan yang dipilih tidak valid.');
    }
    destOwner = existingTargetRepo.owner.login;
    destRepoName = existingTargetRepo.name;
    destBranch = (options.targetBranch || '').trim() || existingTargetRepo.default_branch || 'main';

    onProgress({
      percentage: 48,
      stage: `Memeriksa cabang '${destBranch}' pada '${destOwner}/${destRepoName}'...`,
    });

    const targetBranches = await getBranches(token, destOwner, destRepoName);
    if (targetBranches.length === 0) {
      needsBootstrap = true;
    } else if (!targetBranches.some((b) => b.name === destBranch)) {
      const baseBranch =
        targetBranches.find((b) => b.name === existingTargetRepo.default_branch) || targetBranches[0];
      await createBranch(token, destOwner, destRepoName, destBranch, baseBranch.commit.sha);
      await withRetry(() => getBranchRefSha(token, destOwner, destRepoName, destBranch), 6, 600);
    }
  }

  const totalFiles = files.length;
  const commitMsg = `Kloning lengkap dari ${sourceRepo.fullName}\n\nSumber: ${sourceRepo.htmlUrl}\nTotal berkas: ${totalFiles}\nDibuat otomatis via FAHGIT by Faiz_Fahmi_ID`;

  // 3. Jika repositori tujuan masih benar-benar kosong (0 commit), inisialisasi memakai 1 berkas asli dari sumber
  let bootstrapIndex = -1;
  let bootstrapBlobSha: string | null = null;

  if (needsBootstrap) {
    bootstrapIndex = pickBootstrapFileIndex(files);
    const firstFile = files[bootstrapIndex];

    onProgress({
      percentage: 52,
      stage: `Menginisialisasi cabang '${destBranch}' dengan berkas pertama (${firstFile.path})...`,
      currentFile: firstFile.path,
      processedFiles: 0,
      totalFiles,
    });

    const savedFirst = await withRetry(
      () =>
        saveFile(
          token,
          destOwner,
          destRepoName,
          firstFile.path,
          firstFile.contentBase64,
          totalFiles === 1 ? commitMsg : `Inisialisasi ${firstFile.path} dari ${sourceRepo.fullName}`,
          destBranch
        ),
      6,
      800
    );

    bootstrapBlobSha = savedFirst.content?.sha || null;

    // Tunggu sampai ref heads/<destBranch> benar-benar terbaca di GitHub Database API (mencegah error 404)
    const headSha = await withRetry(
      () => getBranchRefSha(token, destOwner, destRepoName, destBranch),
      8,
      700
    );

    // Jika hanya ada 1 berkas biasa, proses kloning sudah 100% selesai!
    if (totalFiles === 1 && firstFile.mode === '100644') {
      onProgress({
        percentage: 100,
        stage: 'Kloning repositori berhasil 100% (persis 1 berkas)!',
        processedFiles: 1,
        totalFiles: 1,
      });

      return {
        success: true,
        destinationRepo: `${destOwner}/${destRepoName}`,
        destinationUrl: `https://github.com/${destOwner}/${destRepoName}`,
        branch: destBranch,
        totalFilesCloned: 1,
        commitSha: savedFirst.commit?.sha || headSha,
      };
    }
  }

  // 4. Unggah seluruh Blob ke repositori tujuan dalam batch terkontrol dengan retry
  const treeEntries: TreeEntryInput[] = new Array(totalFiles);
  const blobsToUpload: Array<{ index: number; file: ClonedFile }> = [];

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    if (i === bootstrapIndex && bootstrapBlobSha) {
      treeEntries[i] = {
        path: file.path,
        mode: file.mode,
        type: 'blob',
        sha: bootstrapBlobSha,
      };
    } else {
      blobsToUpload.push({ index: i, file });
    }
  }

  let uploadedCount = totalFiles - blobsToUpload.length;
  const UPLOAD_BATCH = 6;

  for (let i = 0; i < blobsToUpload.length; i += UPLOAD_BATCH) {
    const chunk = blobsToUpload.slice(i, i + UPLOAD_BATCH);

    await Promise.all(
      chunk.map(async ({ index, file }) => {
        try {
          const blob = await withRetry(
            () => createGitBlob(token, destOwner, destRepoName, file.contentBase64, 'base64'),
            4,
            700
          );
          treeEntries[index] = {
            path: file.path,
            mode: file.mode,
            type: 'blob',
            sha: blob.sha,
          };
        } catch (err) {
          throw new Error(
            `Gagal mengunggah berkas '${file.path}': ${err instanceof Error ? err.message : 'Error'}`
          );
        }
      })
    );

    uploadedCount += chunk.length;
    const progressPercent = 54 + Math.round((uploadedCount / totalFiles) * 38);

    onProgress({
      percentage: progressPercent,
      stage: `Mengunggah berkas ke '${destRepoName}' (${uploadedCount}/${totalFiles})...`,
      currentFile: chunk[chunk.length - 1]?.file.path,
      processedFiles: uploadedCount,
      totalFiles,
    });
  }

  // 5. Buat Commit Atomik Git dengan replaceTree: true (tanpa base_tree)
  //    sehingga isi branch 100% identik dengan repositori sumber tanpa berkas ekstra atau berkas hilang.
  onProgress({
    percentage: 95,
    stage: `Menulis pohon Git persis (${totalFiles} berkas) ke cabang '${destBranch}'...`,
    processedFiles: totalFiles,
    totalFiles,
  });

  const commitRes = await withRetry(
    () =>
      createBatchCommit(token, destOwner, destRepoName, destBranch, treeEntries, commitMsg, {
        replaceTree: true,
      }),
    3,
    800
  );

  if (isCreateNewRepo && destBranch !== 'main') {
    await updateRepoSettings(token, destOwner, destRepoName, {
      default_branch: destBranch,
    }).catch(() => {});
  }

  onProgress({
    percentage: 100,
    stage: `Kloning repositori berhasil 100% (${totalFiles} berkas identik)!`,
    processedFiles: totalFiles,
    totalFiles,
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
