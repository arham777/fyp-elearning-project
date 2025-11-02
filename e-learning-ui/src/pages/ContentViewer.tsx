import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/ui/back-button';
import { coursesApi } from '@/api/courses';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

const ContentViewer: React.FC = () => {
  const { id, moduleId, contentId } = useParams();
  const courseId = Number(id);
  const modId = Number(moduleId);
  const contId = Number(contentId);
  const [content, setContent] = useState<Content | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxTimeSeen, setMaxTimeSeen] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const MIN_WATCH_PERCENT = 95;

  const backTo = useMemo(() => {
    // If opened from admin read-only route, return to admin course view
    if (location.pathname.startsWith('/app/admin/courses')) {
      return `/app/admin/courses/${courseId}`;
    }
    // Otherwise, go back to module page under student/teacher flows
    const base = location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
    return `${base}/${courseId}/modules/${modId}`;
  }, [location.pathname, courseId, modId]);

  // Prepare sanitized HTML for reading content and support CKEditor MediaEmbed output
  const readingHtml = useMemo(() => {
    if (!content?.text) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content.text, 'text/html');
      const oembeds = Array.from(doc.querySelectorAll('oembed[url]')) as HTMLElement[];
      for (const el of oembeds) {
        const url = el.getAttribute('url') || el.getAttribute('data-oembed-url') || '';
        if (!url) continue;
        let iframe: HTMLIFrameElement | null = null;
        if (/youtube\.com\/watch\?v=|youtu\.be\//i.test(url)) {
          const match = url.match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/i);
          const id = match?.[1] || match?.[2];
          if (id) {
            iframe = doc.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${id}`;
            iframe.width = '560';
            iframe.height = '315';
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen', 'true');
          }
        } else if (/vimeo\.com\//i.test(url)) {
          const match = url.match(/vimeo\.com\/(\d+)/i);
          const id = match?.[1];
          if (id) {
            iframe = doc.createElement('iframe');
            iframe.src = `https://player.vimeo.com/video/${id}`;
            iframe.width = '560';
            iframe.height = '315';
            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
            iframe.setAttribute('allowfullscreen', 'true');
          }
        }
        if (iframe) {
          const figure = el.closest('figure') || el.parentElement;
          figure?.replaceChild(iframe, el);
        }
      }
      const html = doc.body.innerHTML;
      return DOMPurify.sanitize(html, { ADD_ATTR: ['allow', 'allowfullscreen'] });
    } catch {
      return DOMPurify.sanitize(content.text);
    }
  }, [content?.text]);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs)) return '0:00';
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(r).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [item, done] = await Promise.all([
          coursesApi.getContent(courseId, modId, contId),
          coursesApi.getModuleContentProgress(courseId, modId),
        ]);
        setContent(item);
        if (Array.isArray(done) && done.includes(contId)) {
          setCompleted(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId) && !Number.isNaN(modId) && !Number.isNaN(contId)) {
      load();
    }
  }, [courseId, modId, contId]);

  // Bind basic media events for custom controls
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    // Set loading state when video starts loading
    setVideoLoading(true);
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      const t = v.currentTime || 0;
      setCurrentTime(t);
      setMaxTimeSeen((prev) => Math.max(prev, t));
    };
    const onSeeked = () => {
      const t = v.currentTime || 0;
      setCurrentTime(t);
      setMaxTimeSeen((prev) => Math.max(prev, t));
    };
    const onLoaded = () => {
      setDuration(v.duration || 0);
      const t = v.currentTime || 0;
      setCurrentTime(t);
      setMaxTimeSeen(t);
    };
    const onVol = () => { setIsMuted(v.muted); setVolume(v.volume); };
    
    // Loading state handlers
    const onLoadStart = () => setVideoLoading(true);
    const onWaiting = () => setVideoLoading(true);
    const onCanPlay = () => setVideoLoading(false);
    const onPlaying = () => setVideoLoading(false);
    
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeked', onSeeked);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('volumechange', onVol);
    v.addEventListener('loadstart', onLoadStart);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('playing', onPlaying);
    
    onLoaded();
    onTime();
    onVol();
    
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeked', onSeeked);
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('volumechange', onVol);
      v.removeEventListener('loadstart', onLoadStart);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('playing', onPlaying);
    };
  }, [content?.video]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Number(e.target.value);
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const onVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setIsMuted(v.muted);
  };

  const toggleFullscreen = async () => {
    const container = playerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen?.();
    }
  };

  // Keyboard shortcuts: Space or K toggles play/pause
  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tag)) return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const markComplete = async () => {
    if (!content) return;
    setMarking(true);
    try {
      await coursesApi.markContentComplete(courseId, modId, contId);
      setCompleted(true);
      toast({ title: 'Marked as completed' });
    } finally {
      setMarking(false);
    }
  };

  if (isLoading) return <div className="h-40 bg-muted rounded" />;
  if (!content) return <div className="text-muted-foreground">Content not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{content.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{content.content_type === 'video' ? 'Video' : 'Reading'}</p>
        </div>
        <div className="flex items-center gap-2">
          <BackButton to={backTo} />
          {user?.role === 'student' && content.content_type === 'video' && (
            <Button
              onClick={markComplete}
              disabled={marking || completed || (duration > 0 && (maxTimeSeen / duration) * 100 < MIN_WATCH_PERCENT)}
              variant={completed ? 'default' : ((duration > 0 && (maxTimeSeen / duration) * 100 >= MIN_WATCH_PERCENT) ? 'default' : 'secondary')}
              title={duration > 0 && (maxTimeSeen / duration) * 100 < MIN_WATCH_PERCENT ? `Watch at least ${MIN_WATCH_PERCENT}% to enable` : undefined}
            >
              {completed ? 'Completed' : marking ? 'Marking...' : 'Mark complete'}
            </Button>
          )}
        </div>
      </div>

      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          {content.content_type === 'reading' ? (
            <>
              <div className="prose prose-invert max-w-none text-sm leading-6">
                {content.text ? (
                  <div dangerouslySetInnerHTML={{ __html: readingHtml }} />
                ) : (
                  <div className="text-muted-foreground">No text provided.</div>
                )}
              </div>
              {user?.role === 'student' && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={markComplete} disabled={marking || completed}>
                    {completed ? 'Completed' : marking ? 'Marking...' : 'Mark complete'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {(content.video || content.url) ? (
                <div
                  ref={playerRef}
                  className="relative aspect-video overflow-hidden rounded-lg border bg-black shadow-lg"
                  onClick={(e) => {
                    // Avoid toggling when clicking on the control bar elements
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('input[type="range"]')) return;
                    togglePlay();
                  }}
                >
                  {content.video ? (
                    <>
                      <video
                        ref={videoRef}
                        src={content.video}
                        controls={false}
                        playsInline
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        disablePictureInPicture
                        onContextMenu={(e) => e.preventDefault()}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                      {/* Loading indicator */}
                      {videoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <p className="text-sm text-white">Loading video...</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <iframe
                      title={content.title}
                      src={content.url!}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}
                  {content.video ? (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(duration, 0)}
                        step={0.1}
                        value={Number.isFinite(currentTime) ? currentTime : 0}
                        onChange={onSeek}
                        className="w-full h-1 accent-white"
                      />
                      <div className="mt-2 flex items-center gap-3 text-white">
                        <button onClick={togglePlay} className="inline-flex h-8 w-8 items-center justify-center rounded bg-white/10 hover:bg-white/20">
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <div className="text-xs tabular-nums">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        <div className="ml-2 text-[10px] text-white/80">
                          Watched {Math.min(100, Math.round((maxTimeSeen / Math.max(duration, 1)) * 100))}%
                        </div>
                        <button onClick={toggleMute} className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded bg-white/10 hover:bg-white/20">
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <input
                          aria-label="Volume"
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={onVolumeInput}
                          className="w-24 h-1 accent-white"
                        />
                        <div className="ml-auto" />
                        <button onClick={toggleFullscreen} className="inline-flex h-8 w-8 items-center justify-center rounded bg-white/10 hover:bg-white/20">
                          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-muted-foreground">No video provided.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentViewer;


