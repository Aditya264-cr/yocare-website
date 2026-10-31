import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import {
  RotateCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Radio,
  AlertCircle,
  Tv,
  PictureInPicture2,
  Sparkles
} from 'lucide-react';
import { Channel, Country } from '../types';

interface LivePlayerProps {
  channel: Channel | null;
  country: Country;
  onSelectNextSource?: () => void;
}

export const LivePlayer: React.FC<LivePlayerProps> = ({
  channel,
  country
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUrlIndex, setCurrentUrlIndex] = useState<number>(0);
  const [streamNote, setStreamNote] = useState<string>('Ready when you are');
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);

  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const activeUrl = channel?.urls[currentUrlIndex] || channel?.url || '';

  const cleanupPlayers = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
  };

  const loadStream = (url: string) => {
    const video = videoRef.current;
    if (!video || !url) return;

    cleanupPlayers();
    setIsLoading(true);
    setErrorMessage(null);
    setStreamNote(`Connecting to live signal...`);

    const isHls = url.includes('.m3u8') || url.includes('m3u8');
    const isDash = url.includes('.mpd');

    if (isDash && dashjs.supportsMediaSource()) {
      try {
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, url, true);
        dashRef.current = player;
        setStreamNote('Streaming MPEG-DASH live signal');
        setIsLoading(false);
      } catch (err) {
        console.warn('Dash.js error:', err);
        fallbackOrError('DASH stream playback failed');
      }
    } else if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setStreamNote('Live HLS manifest received');
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          if (err.name === 'NotAllowedError') {
            setErrorMessage('Browser blocked autoplay. Tap Play below to start audio/video.');
          }
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              cleanupPlayers();
              fallbackOrError('Live stream media error encountered');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || url.endsWith('.mp4')) {
      video.src = url;
      video.play().then(() => {
        setIsLoading(false);
        setIsPlaying(true);
        setStreamNote('Native video stream connected');
      }).catch((err) => {
        setIsLoading(false);
        if (err.name === 'NotAllowedError') {
          setErrorMessage('Autoplay paused by browser. Press Play to listen.');
        } else {
          fallbackOrError('Native playback failed for stream URL');
        }
      });
    } else {
      video.src = url;
      video.play().then(() => {
        setIsLoading(false);
        setIsPlaying(true);
        setStreamNote('Direct stream active');
      }).catch(() => {
        setIsLoading(false);
        fallbackOrError('Format not natively supported');
      });
    }
  };

  const fallbackOrError = (reason: string) => {
    setIsLoading(false);
    if (channel && currentUrlIndex + 1 < channel.urls.length) {
      setCurrentUrlIndex((prev) => prev + 1);
    } else {
      setErrorMessage(`${reason}. Select another channel or retry signal.`);
      setStreamNote('Signal unavailable');
    }
  };

  useEffect(() => {
    if (channel) {
      setCurrentUrlIndex(0);
      loadStream(channel.urls[0] || channel.url);
    }
    return () => cleanupPlayers();
  }, [channel]);

  useEffect(() => {
    if (channel && activeUrl && currentUrlIndex > 0) {
      loadStream(activeUrl);
    }
  }, [currentUrlIndex]);

  // Buffer progress tracking
  const handleProgress = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration || 100;
      setBufferedPercent(Math.min(100, Math.round((bufferedEnd / duration) * 100)));
    }
  };

  // Custom Controls Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const frame = frameRef.current;
    if (!frame) return;

    if (!document.fullscreenElement) {
      frame.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled) {
      video.requestPictureInPicture().catch(() => {});
    }
  };

  const handleRetry = () => {
    if (channel && activeUrl) {
      loadStream(activeUrl);
    }
  };

  // Auto-hide Controls Logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <section className="player-section page-section" id="player" aria-label="Live video player">
      <div className="section-intro player-intro flex items-end justify-between mb-4">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> ON YOUR SCREEN</p>
          <h2 className="text-3xl font-bold text-white">Now <em>playing.</em></h2>
        </div>
        <p className="text-xs text-[#a0aea5] max-w-xs">
          Custom HTML5 video controls for live streams with Volume, Fullscreen, and PiP support.
        </p>
      </div>

      <div
        ref={frameRef}
        className="player-frame relative rounded-2xl overflow-hidden bg-[#030405] border border-white/20 select-none group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onProgress={handleProgress}
          onClick={togglePlay}
        />

        {/* Placeholder when no channel is selected */}
        {!channel && (
          <div className="player-placeholder flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-[#141810] to-[#030405] text-white">
            <div className="player-art" aria-hidden="true">
              <div className="art-ring"></div>
              <div className="art-ring art-ring-two"></div>
              <div className="art-core">Y<span>·</span>L</div>
            </div>
            <p className="placeholder-kicker">YOUR LIVE WINDOW</p>
            <h3 className="text-2xl font-bold">Everywhere has a story.</h3>
            <p className="text-xs text-[#a0aea5] mt-1 max-w-sm">
              Choose a live channel from the guide below to tune in.
            </p>
            <a href="#channels" className="placeholder-link mt-4 text-xs font-semibold text-[#d5f477]">
              Find a channel ↓
            </a>
          </div>
        )}

        {/* Live Channel Top Info Header */}
        {channel && (
          <div
            className={`player-topline absolute top-4 left-4 right-4 z-20 flex items-center justify-between transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <span className="live-pill flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-white">
              <i className="w-2 h-2 rounded-full bg-[#ff5555] animate-pulse"></i>
              {isPlaying ? 'LIVE SIGNAL' : 'PAUSED'}
            </span>

            <span className="text-xs text-[#c8f28a] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> {country.name} · Live Stream
            </span>
          </div>
        )}

        {/* Center Quick Play Overlay Button */}
        {channel && !isPlaying && !isLoading && !errorMessage && (
          <button
            type="button"
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#d5f477] text-[#11140c] flex items-center justify-center z-20 shadow-2xl hover:scale-110 transition-transform cursor-pointer border-0"
            onClick={togglePlay}
            aria-label="Play channel"
          >
            <Play className="w-8 h-8 fill-current ml-1" />
          </button>
        )}

        {/* Custom Controls Bar */}
        {channel && (
          <div
            className={`absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 ${
              showControls ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {/* Live Buffer / Stream Bar */}
            <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden relative">
              <div
                className="h-full bg-[#d5f477] transition-all duration-300"
                style={{ width: isPlaying ? '100%' : `${bufferedPercent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Left Controls: Play/Pause, Volume, Channel Name */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#d5f477] hover:text-[#11140c] text-white flex items-center justify-center transition-all border-0 cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-full bg-transparent hover:bg-white/10 text-white flex items-center justify-center border-0 cursor-pointer"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-16 accent-[#d5f477] cursor-pointer"
                    aria-label="Volume slider"
                  />
                </div>

                <div className="ml-2 hidden sm:block">
                  <span className="text-xs font-bold text-white block truncate max-w-[180px]">
                    {channel.name}
                  </span>
                  <span className="text-[10px] text-[#a0aea5] capitalize block">
                    {channel.category} Broadcast
                  </span>
                </div>
              </div>

              {/* Right Controls: Retry, PiP, Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border-0 cursor-pointer"
                  title="Refresh stream"
                >
                  <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#d5f477]' : ''}`} />
                </button>

                {document.pictureInPictureEnabled && (
                  <button
                    type="button"
                    onClick={togglePiP}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border-0 cursor-pointer hidden sm:flex"
                    title="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#d5f477] hover:text-[#11140c] text-white flex items-center justify-center transition-all border-0 cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message alert */}
        {errorMessage && (
          <div className="player-message flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-none" />
            <div className="flex-1 text-left text-xs">
              <p className="m-0 font-medium">{errorMessage}</p>
              <button
                type="button"
                className="mt-2 text-[#d5f477] font-semibold underline bg-transparent border-0 cursor-pointer text-xs"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  }
                }}
              >
                Tap to Start Stream ▶
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="player-foot flex items-center justify-between text-xs text-[#85978b] mt-3">
        <span className="flex items-center gap-2">
          <i className="live-dot"></i> <span>{streamNote}</span>
        </span>
        <span>Stream quality & signal availability are provided by broadcaster feeds.</span>
      </div>
    </section>
  );
};
