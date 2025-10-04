import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings,
  RotateCcw
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  showTimer?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  className = '',
  showTimer = false,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateDuration = () => setDuration(video.duration);
    const updateTime = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || duration === 0) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = percentage * duration;

    video.currentTime = targetTime;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isHovering || duration === 0) return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = percentage * duration;
    
    // Cancel previous animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      setScrubTime(targetTime);
      
      // Only seek if the time difference is significant (reduces lag)
      const video = videoRef.current;
      if (video && Math.abs(video.currentTime - targetTime) > 0.05) {
        video.currentTime = targetTime;
      }
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    setIsScrubbing(true);
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.pause(); // Pause to prevent conflicts
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsScrubbing(false);
    setScrubTime(0);
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00:00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0;

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div 
      ref={containerRef}
      className={`relative group ${className}`}
      onMouseMove={!showTimer ? handleMouseMove : undefined}
      onMouseEnter={!showTimer ? handleMouseEnter : showTimer ? () => setShowControls(true) : undefined}
      onMouseLeave={!showTimer ? handleMouseLeave : showTimer ? () => setShowControls(false) : undefined}
    >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
        muted={isMuted}
        preload="metadata"
        onClick={showTimer ? togglePlayPause : undefined}
      />

      {/* Enhanced Controls Overlay - Only in full preview mode */}
      {showTimer && (
        <>
          {/* Center Play/Pause Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 bg-black bg-opacity-75 hover:bg-opacity-90 text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Play className="w-8 h-8 ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls Bar */}
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}>
            {/* Progress Bar */}
            <div className="mb-3">
              <div 
                className="w-full h-1 bg-white bg-opacity-30 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-75"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="text-white hover:text-blue-400 transition-colors duration-200"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-blue-400 transition-colors duration-200"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                {/* Time Display */}
                <div className="text-white text-sm font-mono tracking-wider" style={{fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Speed Control */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="text-white hover:text-blue-400 transition-colors duration-200 flex items-center space-x-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">{playbackRate}x</span>
                  </button>
                  
                  {showSpeedMenu && (
                    <div className="absolute bottom-8 right-0 bg-black bg-opacity-90 rounded-lg p-2 min-w-32">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-white hover:bg-opacity-20 transition-colors duration-200 ${
                            playbackRate === speed ? 'text-blue-400' : 'text-white'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-blue-400 transition-colors duration-200"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vertical Progress Line - Only visible when hovering in thumbnail mode */}
      {!showTimer && isHovering && duration > 0 && (
        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg"
            style={{ left: `${progressPercentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;