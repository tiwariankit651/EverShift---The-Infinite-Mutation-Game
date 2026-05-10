/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Music, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';

const TRACKS = [
  {
    title: "NEURAL_LINK",
    artist: "EverShift_OS",
    url: "https://p.scdn.co/mp3-preview/7d2919aa784260a9f5d16719b33a7500155b9e07?cid=null"
  },
  {
    title: "VOID_BREATH",
    artist: "EverShift_OS",
    url: "https://p.scdn.co/mp3-preview/2d69956cc560411ed026244f77c54f59fc3ee3b2?cid=null"
  },
  {
    title: "SYNTH_PULSE",
    artist: "EverShift_OS",
    url: "https://p.scdn.co/mp3-preview/3e15779774640d04c8612ca4305872ed277150a0?cid=null"
  },
  {
    title: "CORE_ECHO",
    artist: "EverShift_OS",
    url: "https://p.scdn.co/mp3-preview/4f05ba6d149021a8cd3487c69994c653a06ea0e3?cid=null"
  },
  {
    title: "NEON_STORM",
    artist: "EverShift_OS",
    url: "https://p.scdn.co/mp3-preview/612255716499317537b084e3d0850239610f443b?cid=null"
  }
];

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('all');
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback stalled:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * TRACKS.length);
      setTrackIndex(nextIndex);
    } else {
      setTrackIndex((prev) => (prev + 1) % TRACKS.length);
    }
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * TRACKS.length);
      setTrackIndex(nextIndex);
    } else {
      setTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    }
    setIsPlaying(true);
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all') {
      nextTrack();
    } else {
      if (!isShuffle && trackIndex === TRACKS.length - 1) {
        setIsPlaying(false);
      } else {
        nextTrack();
      }
    }
  };

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback stalled:", e));
    }
  }, [trackIndex]);

  return (
    <div className="flex items-center gap-6 p-3 bg-white/5 border border-white/10 skew-card h-12">
      <audio 
        ref={audioRef} 
        src={TRACKS[trackIndex].url} 
        onEnded={handleEnded}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        loop={false}
      />
      
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setIsShuffle(!isShuffle)}
          className={`p-2 transition-colors ${isShuffle ? 'text-accent' : 'text-white/20 hover:text-white/40'}`}
          title="Shuffle"
        >
          <Shuffle size={12} />
        </button>

        <button 
          onClick={prevTrack}
          className="p-2 hover:bg-white/10 text-white/40 transition-colors"
        >
          <SkipBack size={14} />
        </button>

        <button 
          onClick={togglePlay}
          className="p-2 hover:bg-white/10 text-accent transition-colors"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        
        <button 
          onClick={nextTrack}
          className="p-2 hover:bg-white/10 text-white/40 transition-colors"
        >
          <SkipForward size={14} />
        </button>

        <button 
          onClick={() => {
            const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
            const currentIndex = modes.indexOf(repeatMode);
            setRepeatMode(modes[(currentIndex + 1) % modes.length]);
          }}
          className={`p-2 transition-colors relative ${repeatMode !== 'none' ? 'text-accent' : 'text-white/20 hover:text-white/40'}`}
          title={`Repeat: ${repeatMode}`}
        >
          <Repeat size={12} />
          {repeatMode === 'one' && (
            <span className="absolute top-1 right-1 text-[6px] font-bold">1</span>
          )}
        </button>
      </div>

      <div className="hidden md:flex flex-col min-w-[100px]">
        <div className="flex items-center gap-2">
           <Music size={10} className="text-accent animate-pulse" />
           <span className="text-[9px] font-mono font-bold tracking-widest text-[#F0F0F0] uppercase truncate max-w-[80px]">
             {TRACKS[trackIndex].title}
           </span>
        </div>
        <div className="text-[8px] font-mono text-white/30 uppercase tracking-tighter">
          {TRACKS[trackIndex].artist}
        </div>
      </div>

      <div className="flex-1 hidden lg:flex items-center gap-3">
        <span className="text-[8px] font-mono text-white/40 w-8">{formatTime(currentTime)}</span>
        <div className="relative flex-1 group/progress">
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            step="0.1" 
            value={currentTime} 
            onChange={handleSeek}
            className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-accent"
          />
          <div 
            className="absolute top-0 left-0 h-1 bg-accent pointer-events-none transition-all" 
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
        <span className="text-[8px] font-mono text-white/40 w-8 text-right">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-3 group relative">
        <button onClick={() => setIsMuted(!isMuted)} className="text-white/40 hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div className="flex items-center gap-2">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : volume} 
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-16 h-1 bg-white/10 appearance-none cursor-pointer accent-accent"
          />
          <span className="text-[8px] font-mono text-white/30 min-w-[24px]">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
