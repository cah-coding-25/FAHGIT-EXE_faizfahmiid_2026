/**
 * FAHGIT - Tentang Platform
 * 100% Bahasa Indonesia
 * Identitas: FAHGIT by: Faiz_Fahmi_ID
 * Tagline: Your GitHub. Your Files. Your Control.
 */

import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  Code2,
  FileArchive,
  Layers,
  KeyRound,
  ExternalLink,
  Cpu,
  GitBranch,
  Terminal,
  Sparkles,
  BookOpen,
  MapPin,
  Heart,
  Quote,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Brand Hero */}
      <div className="clay-card-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-mono font-black text-3xl clay-button-rgb shadow-xl shrink-0">
            <img
              src="./icon.png"
              alt="FAHGIT Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">FAHGIT</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30 font-mono">
                PRO PLATFORM
              </span>
            </div>
            <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300 mt-1">
              Your GitHub. Your Files. Your Control.
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              Dibuat & Dikembangkan oleh: <strong className="text-slate-900 dark:text-white font-bold">Faiz_Fahmi_ID</strong>
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed relative z-10">
          FAHGIT adalah platform visual manajemen repositori dan file GitHub profesional yang dirancang untuk mempermudah pengelolaan repositori, pengeditan kode dengan Monaco Editor, unggah file/folder bertingkat, dan ekstraksi arsip ZIP secara instan tanpa perlu terminal atau perintah Git manual.
        </div>
      </div>

      {/* Arsitektur Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="clay-card rounded-3xl p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keamanan Klien 100%</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Personal Access Token disimpan secara lokal di perangkat Anda. Tidak ada server backend perantara yang menyimpan atau melihat token Anda.
          </p>
        </div>

        <div className="clay-card rounded-3xl p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monaco Code Editor</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Didukung mesin editor yang sama dengan Visual Studio Code dengan pewarnaan sintaks lebih dari 30 bahasa pemrograman, pratinjau Markdown & HTML, dan pemformat JSON.
          </p>
        </div>

        <div className="clay-card rounded-3xl p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <FileArchive className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ekstraktor ZIP Otomatis</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ekstrak arsip ZIP langsung di browser menggunakan JSZip tanpa server, dengan perlindungan terhadap serangan traversal path dan zip bomb.
          </p>
        </div>
      </div>

      {/* Profil Pengembang & Narasi Inspiratif */}
      <div className="clay-card-glow rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden border border-cyan-500/20">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Profil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  Faiz Fahmi
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30 uppercase tracking-wider font-mono">
                  Faiz_Fahmi_ID
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Pelosok Desa di Madiun, Jawa Timur · Santri & Otodidak Developer</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Creator & Architect
            </span>
          </div>
        </div>

        {/* Narasi Kisah yang Menyentuh & Memotivasi */}
        <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="relative pl-4 border-l-2 border-cyan-500/40 italic font-serif text-slate-800 dark:text-slate-200 text-sm">
            <Quote className="w-5 h-5 text-cyan-500/30 absolute -top-2 -left-2.5 -z-10" />
            &ldquo;Keterbatasan geografis dan kesederhanaan hidup di desa bukanlah alasan untuk membatasi mimpi. Dari bilik santri yang tenang, baris demi baris kode dirajut untuk membuktikan bahwa ketulusan belajar mampu melahirkan karya berkelas dunia.&rdquo;
          </div>

          <p>
            Lahir dan dibesarkan di sebuah pelosok desa di <strong>Madiun, Jawa Timur</strong>, keseharian saya berakar kuat pada nilai-nilai kesederhanaan seorang santri yang senantiasa mengaji kitab, melantunkan ayat suci, dan menjaga ketawadhu-an. Tanpa latar belakang pendidikan formal ilmu komputer di universitas ternama, dan jauh dari gemerlap fasilitas perkotaan, rasa cinta mendalam pada dunia rekayasa perangkat lunak tumbuh secara <strong>murni otodidak</strong>.
          </p>

          <p>
            Di sela-sela waktu mengaji dan mengabdi, malam demi malam dilalui dalam kesunyian desa: menatap layar komputer tua, memecahkan kerumitan logika pemrograman, mempelajari arsitektur software modern, hingga merancang sistem desktop yang tangguh dan terotomatisasi secara permanen.
          </p>

          <p>
            <strong>FAHGIT</strong> adalah buah dari perjalanan panjang itu. Sebuah persembahan tulus yang membuktikan bahwa siapa pun kamu, dari desa manapun kamu berasal, dan apa pun latar belakangmu—ketika niat baik dipadukan dengan ketekunan tanpa henti, doa yang tak pernah putus, dan rasa cinta pada ilmu pengetahuan, engkau mampu menciptakan teknologi yang presisi, mandiri, dan berdaya guna bagi banyak orang.
          </p>
        </div>

        {/* Footer Card */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 font-bold">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            Didedikasikan untuk Seluruh Pejuang Otodidak & Santri Indonesia
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            FAHGIT v1.0.0 Claymorphic Pro
          </span>
        </div>
      </div>
    </div>
  );
};
