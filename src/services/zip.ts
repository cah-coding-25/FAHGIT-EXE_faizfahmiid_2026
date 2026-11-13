/**
 * FAHGIT ZIP Engine
 * Secure client-side ZIP extraction with path traversal defense & ZIP bomb limits,
 * and client-side ZIP packaging for repository / folder downloads.
 */

import JSZip from 'jszip';
import { ExtractedZipItem } from '../types';

const MAX_UNCOMPRESSED_SIZE = 60 * 1024 * 1024; // 60 MB safety cap
const MAX_FILE_ENTRIES = 5000;

export interface ZipAnalysis {
  isValid: boolean;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  items: ExtractedZipItem[];
  error?: string;
}

/**
 * Sanitize a repository relative path for GitHub Git Trees API.
 * Strips redundant slashes/leading dots and rejects '.', '..', '.git', null bytes, and OS junk.
 */
export function sanitizeGitRepoPath(rawPath: string): string | null {
  const clean = rawPath.replace(/\\/g, '/').trim();
  if (!clean) return null;

  const rawParts = clean.split('/');
  const safeParts: string[] = [];

  for (const rawPart of rawParts) {
    const part = rawPart.trim();
    if (!part || part === '.') {
      continue;
    }
    if (part === '..' || part.includes(':') || part.includes('\0')) {
      return null;
    }
    const lower = part.toLowerCase();
    if (
      lower === '.git' ||
      lower === '__macosx' ||
      lower === '.ds_store' ||
      lower === 'thumbs.db' ||
      lower === 'desktop.ini'
    ) {
      return null;
    }
    safeParts.push(part);
  }

  if (safeParts.length === 0) return null;
  return safeParts.join('/');
}

/**
 * Sanitize relative file path from zip archive to prevent directory traversal
 */
export function sanitizeZipPath(rawPath: string): string | null {
  const clean = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/');
  const safeParts: string[] = [];

  for (const part of parts) {
    if (part === '..' || part === '.') {
      return null; // Reject path with traversal
    }
    if (part.includes(':') || part.includes('\0')) {
      return null;
    }
    if (part.trim() !== '') {
      safeParts.push(part.trim());
    }
  }

  return safeParts.join('/');
}

/**
 * Extract and analyze a ZIP file safely in-browser
 */
export async function analyzeZipArchive(file: File): Promise<ZipAnalysis> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const items: ExtractedZipItem[] = [];
    let totalFiles = 0;
    let totalFolders = 0;
    let totalSize = 0;

    const entries = Object.keys(contents.files);

    if (entries.length > MAX_FILE_ENTRIES) {
      return {
        isValid: false,
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        items: [],
        error: `ZIP archive contains ${entries.length} entries, exceeding safety limit of ${MAX_FILE_ENTRIES}.`,
      };
    }

    for (const rawName of entries) {
      const zipEntry = contents.files[rawName];
      const safePath = sanitizeZipPath(rawName);

      if (!safePath) {
        return {
          isValid: false,
          totalFiles: 0,
          totalFolders: 0,
          totalSize: 0,
          items: [],
          error: `Security Alert: Dangerous path traversal detected in file '${rawName}'. Extraction cancelled.`,
        };
      }

      // Ignore macOS/Windows junk and internal .git repository metadata (forbidden by GitHub Git Trees API)
      const pathSegments = safePath.split('/');
      if (
        pathSegments.some((seg) => {
          const lower = seg.toLowerCase();
          return (
            lower === '.git' ||
            lower === '__macosx' ||
            lower === '.ds_store' ||
            lower === 'thumbs.db' ||
            lower === 'desktop.ini'
          );
        })
      ) {
        continue;
      }

      if (zipEntry.dir) {
        totalFolders++;
        items.push({
          path: safePath,
          isDirectory: true,
          size: 0,
          data: null,
          selected: true,
        });
      } else {
        totalFiles++;
        const data = await zipEntry.async('uint8array');
        totalSize += data.byteLength;

        if (totalSize > MAX_UNCOMPRESSED_SIZE) {
          return {
            isValid: false,
            totalFiles: 0,
            totalFolders: 0,
            totalSize: 0,
            items: [],
            error: `Archive uncompressed size exceeds ${MAX_UNCOMPRESSED_SIZE / (1024 * 1024)}MB limit (ZIP bomb protection).`,
          };
        }

        items.push({
          path: safePath,
          isDirectory: false,
          size: data.byteLength,
          data,
          selected: true,
        });
      }
    }

    // Deteksi dan hapus folder pembungkus utama tunggal (misal: fahnote.zip -> fahnote/...)
    // agar berkas dan sub-folder di dalamnya langsung masuk ke repositori
    const fileItems = items.filter((i) => !i.isDirectory);
    let finalItems = items;

    if (fileItems.length > 0 && fileItems.every((i) => i.path.includes('/'))) {
      const firstSegment = fileItems[0].path.split('/')[0];
      const allShareSameRoot = fileItems.every((i) => i.path.split('/')[0] === firstSegment);

      if (allShareSameRoot && firstSegment) {
        const prefixToStrip = `${firstSegment}/`;
        finalItems = items
          .map((item) => {
            if (item.path === firstSegment) {
              return null;
            }
            if (item.path.startsWith(prefixToStrip)) {
              const strippedPath = item.path.slice(prefixToStrip.length);
              if (!strippedPath) return null;
              return { ...item, path: strippedPath };
            }
            return item;
          })
          .filter((item): item is ExtractedZipItem => item !== null);
      }
    }

    const finalFolders = finalItems.filter((i) => i.isDirectory).length;
    const finalFiles = finalItems.filter((i) => !i.isDirectory).length;

    // Sort items so folders come first, then alphabetical
    finalItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.path.localeCompare(b.path);
    });

    return {
      isValid: true,
      totalFiles: finalFiles,
      totalFolders: finalFolders,
      totalSize,
      items: finalItems,
    };
  } catch (err) {
    return {
      isValid: false,
      totalFiles: 0,
      totalFolders: 0,
      totalSize: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Invalid or corrupt ZIP archive.',
    };
  }
}

/**
 * Generate a ZIP blob from files for user download
 */
export async function createZipFromFiles(
  files: Array<{ path: string; data: Uint8Array | string; isBase64?: boolean }>
): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.isBase64 && typeof file.data === 'string') {
      zip.file(file.path, file.data.replace(/\s/g, ''), { base64: true });
    } else {
      zip.file(file.path, file.data);
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
