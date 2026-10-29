import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  AlertCircle,
  Headphones,
  Eye,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { apiFetch, getMaterialDownloadUrl } from '../services/api';

export interface MaterialViewerModalProps {
  material: {
    id: string;
    title: string;
    description?: string | null;
    content?: string | null;
    type: 'PDF' | 'IMAGE' | 'AUDIO' | 'VOICE_NOTE' | 'TEXT' | 'DOCUMENT' | 'HOMEWORK' | 'ANNOUNCEMENT';
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    fileUrl?: string | null;
    batch?: { name: string };
    subject?: { name: string } | null;
    createdAt?: string;
  };
  onClose: () => void;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({ material, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioCompleted, setAudioCompleted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const downloadUrl = material.id ? getMaterialDownloadUrl(material.id) : '';

  // Track initial material open (separated from completion)
  useEffect(() => {
    if (material.id) {
      apiFetch(`/materials/${material.id}/track`, {
        method: 'POST',
        body: JSON.stringify({ eventType: 'OPENED' }),
      }).catch(() => {
        // Non-blocking telemetry
      });
    }
  }, [material.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  // Audio time update & completion tracker
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      setCurrentTime(cur);

      if (dur > 0) {
        const percent = (cur / dur) * 100;
        if (percent >= 95 && !audioCompleted) {
          setAudioCompleted(true);
          apiFetch(`/materials/${material.id}/track`, {
            method: 'POST',
            body: JSON.stringify({
              eventType: 'AUDIO_COMPLETED',
              progressPercent: 100,
              durationSeconds: dur,
            }),
          }).catch(() => {});
        }
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAudio = material.type === 'AUDIO' || material.type === 'VOICE_NOTE';
  const isImage = material.type === 'IMAGE' || (material.mimeType && material.mimeType.startsWith('image/'));
  const isPdf = material.type === 'PDF' || material.mimeType === 'application/pdf' || material.fileName?.toLowerCase().endsWith('.pdf');
  const isText = material.type === 'TEXT' || (!material.fileUrl && !!material.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        className={`bg-[#F7F2EF] rounded-2xl border border-[#D7CCC8] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-[96vw] max-w-[1400px] h-[93vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#D7CCC8] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#4E342E]/10 flex items-center justify-center text-[#4E342E] shrink-0">
              {isAudio ? <Headphones className="w-5 h-5" /> : isImage ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#2D1E18] truncate leading-tight">
                {material.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#6D4C41] mt-0.5">
                <span>{material.subject?.name || 'Batch-wide'}</span>
                <span>&bull;</span>
                <span>{material.batch?.name}</span>
                {material.fileSize ? (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono text-[11px]">{formatFileSize(material.fileSize)}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isImage && (
              <div className="flex items-center bg-[#F7F2EF] rounded-xl border border-[#D7CCC8] p-0.5 mr-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-semibold px-1 text-[#6D4C41]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 text-[#6D4C41] hover:text-[#2D1E18] hover:bg-white rounded-lg transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {material.fileUrl && (
              <>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl hover:bg-[#D7CCC8]/30 text-[#6D4C41] hover:text-[#2D1E18] transition-colors"
                  title="Open in new browser tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={downloadUrl}
                  download={material.fileName || 'material'}
                  className="p-2 rounded-xl bg-[#4E342E]/10 hover:bg-[#4E342E] text-[#4E342E] hover:text-white transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl hover:bg-[#D7CCC8]/30 text-[#6D4C41] hover:text-[#2D1E18] transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-rose-50 text-[#6D4C41] hover:text-rose-700 transition-colors ml-1"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className={`flex-1 overflow-auto relative bg-[#ECE6E1] flex flex-col items-center justify-center ${isPdf ? 'p-0' : 'p-2 sm:p-4'}`}>
          {/* PDF Viewer */}
          {isPdf && material.fileUrl && (
            <div className="w-full h-full overflow-hidden bg-white shadow-sm flex flex-col">
              <iframe
                src={`${downloadUrl}#page=1&view=FitH`}
                className="w-full h-full border-0"
                title={material.title}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          )}

          {/* Image Viewer */}
          {isImage && material.fileUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={downloadUrl}
                alt={material.title}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-150 shadow-md"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          )}

          {/* Audio Player */}
          {isAudio && material.fileUrl && (
            <div className="max-w-lg w-full bg-white p-6 sm:p-8 rounded-2xl border border-[#D7CCC8] shadow-lg space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#4E342E]/10 flex items-center justify-center text-[#4E342E]">
                <Headphones className="w-10 h-10 animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#2D1E18]">{material.title}</h3>
                <p className="text-xs text-[#6D4C41] mt-1">{material.description || 'Audio recording / study lecture'}</p>
              </div>

              <audio
                ref={audioRef}
                src={downloadUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  setLoading(false);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setAudioCompleted(true);
                  apiFetch(`/materials/${material.id}/track`, {
                    method: 'POST',
                    body: JSON.stringify({ eventType: 'AUDIO_COMPLETED', progressPercent: 100 }),
                  }).catch(() => {});
                }}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />

              {/* Scrubber */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-[#4E342E] cursor-pointer"
                />
                <div className="flex justify-between text-xs font-mono text-[#8D6E63]">
                  <span>{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={cyclePlaybackRate}
                  className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg border border-[#D7CCC8] text-[#4E342E] hover:bg-[#F7F2EF]"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-[#4E342E] hover:bg-[#3E2723] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-2 rounded-xl text-[#6D4C41] hover:bg-[#F7F2EF]"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-600" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {audioCompleted && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Playback Completed</span>
                </div>
              )}
            </div>
          )}

          {/* Text Study Notes Viewer */}
          {isText && (
            <div className="max-w-3xl w-full h-full bg-white p-6 sm:p-8 rounded-2xl border border-[#D7CCC8] shadow-sm overflow-auto">
              {material.description && (
                <div className="mb-4 pb-3 border-b border-[#D7CCC8]">
                  <h4 className="text-xs uppercase font-bold text-[#8D6E63] tracking-wider mb-1">Study Instructions</h4>
                  <p className="text-xs text-[#4E342E] italic">{material.description}</p>
                </div>
              )}
              <div className="prose prose-stone text-sm text-[#2D1E18] whitespace-pre-wrap leading-relaxed font-sans">
                {material.content || 'No text content available for this study note.'}
              </div>
            </div>
          )}

          {/* Unsupported File Type Fallback */}
          {!isPdf && !isImage && !isAudio && !isText && (
            <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#D7CCC8] text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4E342E]/10 flex items-center justify-center text-[#4E342E]">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#2D1E18]">{material.title}</h3>
                <p className="text-xs text-[#6D4C41] mt-1">
                  {material.fileName || 'Educational Attachment'} ({formatFileSize(material.fileSize)})
                </p>
                <p className="text-xs text-[#8D6E63] mt-2">
                  In-page preview is not supported for this file format ({material.mimeType || 'binary'}). You can download and open it in your system viewer.
                </p>
              </div>
              <a
                href={downloadUrl}
                download={material.fileName || 'material'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white font-semibold text-xs shadow-sm"
              >
                <Download className="w-4 h-4" /> Download / Open Attachment
              </a>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-4 rounded-xl bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-rose-600" />
              <div>
                <h4 className="font-bold text-sm text-[#2D1E18]">Unable to Preview File</h4>
                <p className="text-xs text-[#6D4C41] mt-1">The attachment could not be rendered inside the modal.</p>
              </div>
              <a
                href={downloadUrl}
                download={material.fileName || 'material'}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4E342E] text-white rounded-xl text-xs font-semibold"
              >
                <Download className="w-4 h-4" /> Download File Instead
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
