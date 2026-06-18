import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { File, Download, GripVertical, Image as ImageIcon, Play, Pause, X } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

export const AttachmentItem = ({ attachment, onRemove }) => {
  // --- DND KIT SETUP ---
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attachment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // --- COMPONENT STATES ---
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio Refs
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);

  // Initialize WaveSurfer for AUDIO attachments
  useEffect(() => {
    if (attachment.type === 'AUDIO' && waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#cbd5e1', // slate-300
        progressColor: '#3b82f6', // blue-500
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 40,
        url: attachment.url,
      });

      wavesurfer.current.on('play', () => setIsPlaying(true));
      wavesurfer.current.on('pause', () => setIsPlaying(false));
      wavesurfer.current.on('finish', () => setIsPlaying(false));

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [attachment]);

  const toggleAudio = (e) => {
    e.stopPropagation();
    wavesurfer.current?.playPause();
  };

  // --- RENDERERS ---
  const renderContent = () => {
    switch (attachment.type) {
      case 'IMAGE':
        return (
          <>
            <div 
              className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer border border-slate-200"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img src={attachment.url} alt={attachment.filename} className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </div>
            
            {/* Image Lightbox */}
            {isLightboxOpen && (
              <div 
                className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsLightboxOpen(false)}
              >
                <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2"><X className="w-6 h-6" /></button>
                <img src={attachment.url} alt={attachment.filename} className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl" />
              </div>
            )}
          </>
        );

      case 'VIDEO':
        return (
          <div className="flex-1 min-w-0">
            <video src={attachment.url} controls className="w-full max-h-48 rounded-md bg-black" />
          </div>
        );

      case 'AUDIO':
        return (
          <div className="flex-1 min-w-0 flex items-center gap-3 bg-slate-50 p-2 rounded-md border border-slate-200">
            <button 
              onClick={toggleAudio}
              className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 flex-shrink-0 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1" ref={waveformRef} />
          </div>
        );

        // ... inside the AttachmentItem.jsx renderContent() switch
    case 'LINK':
  return (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noreferrer"
      className="flex-1 min-w-0 flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors"
    >
      {attachment.metadata?.thumbnail && (
        <img 
          src={attachment.metadata.thumbnail} 
          alt="Preview" 
          className="w-16 h-16 rounded-md object-cover flex-shrink-0" 
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {attachment.metadata?.favicon && (
            <img src={attachment.metadata.favicon} alt="" className="w-4 h-4" />
          )}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {attachment.metadata?.domain}
          </span>
        </div>
        <h5 className="font-medium text-slate-900 truncate">{attachment.metadata?.title}</h5>
        <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{attachment.metadata?.description}</p>
      </div>
    </a>
  );

      default: // FILE
        return (
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 border border-blue-100">
            <File className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm transition-all ${
        isDragging ? 'opacity-50 shadow-md scale-[1.02] border-blue-400 z-10 relative' : 'hover:border-slate-300'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0 p-1 -ml-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Dynamic Content */}
      {renderContent()}

      {/* Metadata & Actions */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-sm font-medium text-slate-700 truncate block">
          {attachment.filename || 'Attachment'}
        </span>
        <span className="text-xs text-slate-400">
          {attachment.sizeBytes ? (attachment.sizeBytes / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a 
          href={attachment.url} 
          download={attachment.filename}
          target="_blank" 
          rel="noreferrer"
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
        <button 
          onClick={() => onRemove(attachment.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};