import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, FolderTree } from 'lucide-react';
import { FLUTTER_PROJECT_FILES, downloadFlutterProjectZip } from '../data/flutterProjectFiles';

export const FlutterCodeStudio: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>(FLUTTER_PROJECT_FILES[1].path);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const activeFile =
    FLUTTER_PROJECT_FILES.find((f) => f.path === selectedPath) || FLUTTER_PROJECT_FILES[0];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadFlutterProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Complete Flutter Cross-Platform Project & ESP32 Firmware
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Full Android & iOS Flutter source tree (`pubspec.yaml`, Material 3 screens, BLE/Wi-Fi services, `fl_chart`, CSV/PDF export, Firebase sync) plus ESP32 MAX30102 firmware.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>{isDownloading ? 'Bundling ZIP...' : 'Download Full Flutter Project (.zip)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Project Tree Sidebar */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
            <FolderTree className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-semibold text-slate-900">
              ezecheck_flutter_app/ ({FLUTTER_PROJECT_FILES.length} files)
            </span>
          </div>
          <div className="space-y-1">
            {FLUTTER_PROJECT_FILES.map((file) => {
              const isSelected = file.path === activeFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-slate-400">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Code Viewer */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="font-mono text-xs font-semibold text-white truncate">
                  {activeFile.path}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 truncate">{activeFile.description}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="p-5 text-xs font-mono leading-relaxed text-slate-200 overflow-x-auto max-h-[560px] overflow-y-auto">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
