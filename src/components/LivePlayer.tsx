import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { RotateCw, Play, AlertCircle } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUrlIndex, setCurrentUrlIndex] = useState<number>(0);
  const [streamNote, setStreamNote] = useState<string>('Ready when you are');
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);

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
      // Fallback html5 video src
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

  const handleRetry = () => {
    if (channel && activeUrl) {
      loadStream(activeUrl);
    }
  };

  return (
    <section className="player-section page-section" id="player" aria-label="Live video player">
      <div className="section-intro player-intro flex items-end justify-between mb-4">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> ON YOUR SCREEN</p>
          <h2 className="text-3xl font-bold text-white">Now <em>playing.</em></h2>
        </div>
        <p className="text-xs text-[#a0aea5] max-w-xs">
          Every channel opens a live window. Pick a signal in the guide below and tune in.
        </p>
      </div>

      <div className="player-frame relative rounded-2xl overflow-hidden bg-[#030405] border border-white/20">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

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

        {channel && (
          <>
            <div className="player-topline">
              <span className="live-pill">
                <i></i> {isPlaying ? 'LIVE' : 'TUNING'}
              </span>
              <span className="text-xs text-[#c8f28a] uppercase font-semibold">
                {country.name} · Live TV
              </span>
            </div>

            <div className="player-bottomline flex items-end justify-between">
              <div>
                <span className="now-label">NOW TUNING IN</span>
                <h2 className="text-xl font-bold text-white m-0 truncate">{channel.name}</h2>
                <p className="text-xs text-[#a0aea5] capitalize">{channel.category} Channel</p>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={handleRetry}
                aria-label="Retry playback"
                title="Retry playback"
              >
                <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-[#d5f477]' : ''}`} />
              </button>
            </div>
          </>
        )}

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
