/**
 * FAHGIT Distinct File Icon Provider
 * Provides domain-specific visual icons for over 30 file types.
 */

import React from 'react';
import { getFileExtension } from '../../utils/fileUtils';
import {
  Folder,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileArchive,
  Binary,
  FileType,
  Terminal,
  Database,
  FileSpreadsheet,
} from 'lucide-react';

interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, isDirectory, className = 'w-4 h-4' }) => {
  if (isDirectory) {
    return <Folder className={`${className} text-blue-400 fill-blue-400/20`} />;
  }

  const ext = getFileExtension(filename);

  switch (ext) {
    case 'html':
    case 'htm':
      return <FileCode className={`${className} text-orange-400`} />;
    case 'css':
    case 'scss':
    case 'less':
      return <FileCode className={`${className} text-blue-400`} />;
    case 'js':
    case 'jsx':
    case 'mjs':
      return <FileCode className={`${className} text-yellow-400`} />;
    case 'ts':
    case 'tsx':
      return <FileCode className={`${className} text-blue-500`} />;
    case 'json':
    case 'json5':
      return <FileJson className={`${className} text-emerald-400`} />;
    case 'md':
    case 'markdown':
      return <FileText className={`${className} text-indigo-400`} />;
    case 'py':
      return <FileCode className={`${className} text-sky-400`} />;
    case 'java':
    case 'class':
    case 'jar':
      return <FileCode className={`${className} text-amber-500`} />;
    case 'php':
      return <FileCode className={`${className} text-indigo-400`} />;
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'cc':
      return <FileCode className={`${className} text-purple-400`} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
    case 'bmp':
    case 'svg':
      return <FileImage className={`${className} text-rose-400`} />;
    case 'zip':
    case 'tar':
    case 'gz':
    case '7z':
    case 'rar':
      return <FileArchive className={`${className} text-amber-400`} />;
    case 'pdf':
      return <FileType className={`${className} text-red-500`} />;
    case 'sh':
    case 'bash':
    case 'zsh':
      return <Terminal className={`${className} text-green-400`} />;
    case 'sql':
      return <Database className={`${className} text-cyan-400`} />;
    case 'csv':
    case 'tsv':
    case 'xlsx':
      return <FileSpreadsheet className={`${className} text-emerald-500`} />;
    case 'exe':
    case 'dll':
    case 'bin':
    case 'apk':
    case 'dmg':
      return <Binary className={`${className} text-red-400`} />;
    default:
      if (filename.startsWith('.') || filename.includes('config')) {
        return <FileCode className={`${className} text-slate-400`} />;
      }
      return <FileText className={`${className} text-slate-400`} />;
  }
};
