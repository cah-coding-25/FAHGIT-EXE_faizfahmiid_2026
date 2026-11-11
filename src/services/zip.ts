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
 * Sanitize relative file path from zip archive to prevent directory traversal
 */
export function sanitizeZipPath(rawPath: string): string | null {
  // Replace Windows backslashes
  let clean = rawPath.replace(/\\/g, '/');

  // Strip leading slashes
  while (clean.startsWith('/')) {
    clean = clean.substring(1);
  }

  // Prevent directory traversal attacks
  const parts = clean.split('/');
  const safeParts: string[] = [];

  for (const part of parts) {
    if (part === '..' || part === '.') {
      return null; // Reject path with traversal
    }
    // Reject Windows drive letter or dangerous chars
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

      // Ignore macOS junk files like __MACOSX and .DS_Store
      if (safePath.startsWith('__MACOSX/') || safePath.endsWith('.DS_Store')) {
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

    // Sort items so folders come first, then alphabetical
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.path.localeCompare(b.path);
    });

    return {
      isValid: true,
      totalFiles,
      totalFolders,
      totalSize,
      items,
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
  files: Array<{ path: string; data: Uint8Array | string }>
): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.data);
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
