import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Course, CourseModule, Content, Assignment, Enrollment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Check, Play, BookOpen, FileText, Lock, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackButton from '@/components/ui/back-button';

interface ModuleContent {
  module: CourseModule;
  contents: Content[];
  assignments: Assignment[];
  completedContentIds: number[];
  completedAssignmentIds: number[];
  assignmentResults: Record<number, { score: number; passed: boolean; totalPoints: number; attemptsUsed: number; maxAttempts: number; canRetake: boolean }>;
}

interface CourseProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
}

const CourseViewer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const courseId = Number(id);

  const [course, setCourse] = useState<Course | null>(null);
  const [moduleContents, setModuleContents] = useState<ModuleContent[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [selectedContent, setSelectedContent] = useState<{
    type: 'content' | 'assignment';
    id: number;
    moduleId: number;
  } | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxTimeSeen, setMaxTimeSeen] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const MIN_WATCH_PERCENT = 95;
  const [showCourseCompleted, setShowCourseCompleted] = useState(false);

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
  }, [location.pathname]);

  // Video player utility functions
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

  // Load course data
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setIsLoading(true);
        
        // Load basic course info
        const [courseData, enrollments] = await Promise.all([
          coursesApi.getCourse(courseId),
          coursesApi.getMyEnrollments().catch(() => [])
        ]);
        
        setCourse(courseData);
        
        // Find user's enrollment for this course
        const userEnrollment = (enrollments as Enrollment[]).find(
          e => e.course?.id === courseId
        );
        setEnrollment(userEnrollment || null);

        // Load modules
        const modules = await coursesApi.getCourseModules(courseId);
        
        // Load content and progress for each module
        const moduleData = await Promise.all(
          modules.map(async (module: CourseModule) => {
            const [contents, assignments, progress] = await Promise.all([
              coursesApi.getModuleContents(courseId, module.id).catch(() => []),
              coursesApi.getCourseAssignments(courseId, { module: module.id }).catch(() => []),
              coursesApi.getModuleProgress(courseId, module.id).catch(() => ({ completedContentIds: [], completedAssignmentIds: [] }))
            ]);

            return {
              module,
              contents: contents as Content[],
              assignments: assignments as Assignment[],
              completedContentIds: progress.completedContentIds,
              completedAssignmentIds: progress.completedAssignmentIds,
              assignmentResults: progress.assignmentResults
            };
          })
        );

        setModuleContents(moduleData);

        // Smart auto-selection logic
        const { moduleToExpand, contentToSelect } = determineAutoSelection(moduleData);
        
        if (moduleToExpand) {
          setExpandedModules(new Set([moduleToExpand]));
        }
        
        if (contentToSelect) {
          setSelectedContent(contentToSelect);
        }

      } catch (error) {
        console.error('Failed to load course data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!Number.isNaN(courseId)) {
      loadCourseData();
    }
  }, [courseId]);

  // Video player event handlers
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
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
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeked', onSeeked);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('volumechange', onVol);
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
    };
  }, [selectedContent]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Keyboard shortcuts for video player
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

  // Calculate overall progress
  const courseProgress = useMemo((): CourseProgress => {
    const totalItems = moduleContents.reduce((sum, md) => 
      sum + md.contents.length + md.assignments.length, 0
    );
    const completedItems = moduleContents.reduce((sum, md) => 
      sum + md.completedContentIds.length + md.completedAssignmentIds.length, 0
    );
    
    return {
      totalItems,
      completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
  }, [moduleContents]);

  // Sorted modules by order for next/last computations
  const sortedModules = useMemo(() => {
    return moduleContents.slice().sort((a, b) => a.module.order - b.module.order);
  }, [moduleContents]);

  // Check if module is unlocked
  const isModuleUnlocked = useCallback((moduleIndex: number): boolean => {
    if (moduleIndex === 0) return true; // First module is always unlocked
    
    // For now, unlock all modules to fix the locking issue
    // Later you can implement proper sequential unlocking
    return true;
    
    // Original logic (commented out for now):
    // const prevModule = moduleContents[moduleIndex - 1];
    // if (!prevModule) return false;
    // const totalItems = prevModule.contents.length + prevModule.assignments.length;
    // const completedItems = prevModule.completedContentIds.length + prevModule.completedAssignmentIds.length;
    // return completedItems === totalItems;
  }, [moduleContents]);

  // Toggle module expansion (accordion style - only one open at a time)
  const toggleModule = (moduleId: number) => {
    if (expandedModules.has(moduleId)) {
      // If clicking on already expanded module, close it
      setExpandedModules(new Set());
    } else {
      // Open only this module, close all others
      setExpandedModules(new Set([moduleId]));
    }
  };

  // Select content/assignment
  const selectItem = (type: 'content' | 'assignment', id: number, moduleId: number) => {
    setSelectedContent({ type, id, moduleId });
  };

  // Smart auto-selection logic
  const determineAutoSelection = useCallback((moduleData: ModuleContent[]) => {
    if (moduleData.length === 0) {
      return { moduleToExpand: null, contentToSelect: null };
    }

    // Sort modules by order
    const sortedModules = moduleData.slice().sort((a, b) => a.module.order - b.module.order);
    
    // Find the next item to work on
    for (const md of sortedModules) {
      // Combine and sort all items in this module
      const allItems = [
        ...md.contents.map(c => ({ ...c, type: 'content' as const, order: c.order })),
        ...md.assignments.map(a => ({ ...a, type: 'assignment' as const, order: a.order || 999 }))
      ].sort((a, b) => a.order - b.order);

      // Find first incomplete item in this module
      for (const item of allItems) {
        const isCompleted = item.type === 'content' 
          ? md.completedContentIds.includes(item.id)
          : md.completedAssignmentIds.includes(item.id);
        
        if (!isCompleted) {
          return {
            moduleToExpand: md.module.id,
            contentToSelect: {
              type: item.type,
              id: item.id,
              moduleId: md.module.id
            }
          };
        }
      }
    }

    // If everything is completed, select the last completed item
    for (let i = sortedModules.length - 1; i >= 0; i--) {
      const md = sortedModules[i];
      const allItems = [
        ...md.contents.map(c => ({ ...c, type: 'content' as const, order: c.order })),
        ...md.assignments.map(a => ({ ...a, type: 'assignment' as const, order: a.order || 999 }))
      ].sort((a, b) => b.order - a.order); // Reverse order to get last item first

      for (const item of allItems) {
        const isCompleted = item.type === 'content' 
          ? md.completedContentIds.includes(item.id)
          : md.completedAssignmentIds.includes(item.id);
        
        if (isCompleted) {
          return {
            moduleToExpand: md.module.id,
            contentToSelect: {
              type: item.type,
              id: item.id,
              moduleId: md.module.id
            }
          };
        }
      }
    }

    // Fallback: open first module and select first item
    const firstModule = sortedModules[0];
    if (firstModule) {
      const allItems = [
        ...firstModule.contents.map(c => ({ ...c, type: 'content' as const, order: c.order })),
        ...firstModule.assignments.map(a => ({ ...a, type: 'assignment' as const, order: a.order || 999 }))
      ].sort((a, b) => a.order - b.order);

      const firstItem = allItems[0];
      if (firstItem) {
        return {
          moduleToExpand: firstModule.module.id,
          contentToSelect: {
            type: firstItem.type,
            id: firstItem.id,
            moduleId: firstModule.module.id
          }
        };
      }
    }

    return { moduleToExpand: null, contentToSelect: null };
  }, []);

  // Navigate to next incomplete item
  const goToNextIncomplete = useCallback(() => {
    const { moduleToExpand, contentToSelect } = determineAutoSelection(moduleContents);
    
    if (moduleToExpand) {
      setExpandedModules(new Set([moduleToExpand]));
    }
    
    if (contentToSelect) {
      setSelectedContent(contentToSelect);
    }
  }, [moduleContents, determineAutoSelection]);

  // Render content in main area
  const renderMainContent = () => {
    if (!selectedContent) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          {showCourseCompleted ? (
            <>
              <h3 className="text-lg font-medium mb-2">Course completed !!</h3>
              <p className="text-muted-foreground">You have finished all modules and items.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">Welcome to {course?.title}</h3>
              <p className="text-muted-foreground mb-4">Select a lesson from the sidebar to get started</p>
              <Button onClick={goToNextIncomplete}>Continue Learning</Button>
            </>
          )}
        </div>
      );
    }

    const moduleData = moduleContents.find(md => md.module.id === selectedContent.moduleId);
    if (!moduleData) return null;

    if (selectedContent.type === 'content') {
      const content = moduleData.contents.find(c => c.id === selectedContent.id);
      if (!content) return null;

      // Determine if this is the very last item (content or assignment) in the module
      const isLastItemInModule = (() => {
        const allItems = [
          ...moduleData.contents.map(c => ({ type: 'content' as const, id: c.id, order: c.order ?? 0 })),
          ...moduleData.assignments.map(a => ({ type: 'assignment' as const, id: a.id, order: (a.order ?? 999) }))
        ].sort((a, b) => a.order - b.order);
        const last = allItems[allItems.length - 1];
        return last?.type === 'content' && last?.id === content.id;
      })();

      // Check if the immediate next item in the module is an assignment
      const { nextItem, nextItemIsAssignment } = (() => {
        const allItems = [
          ...moduleData.contents.map(c => ({ type: 'content' as const, id: c.id, order: c.order ?? 0 })),
          ...moduleData.assignments.map(a => ({ type: 'assignment' as const, id: a.id, order: (a.order ?? 999) }))
        ].sort((a, b) => a.order - b.order);
        const idx = allItems.findIndex(it => it.type === 'content' && it.id === content.id);
        const next = idx >= 0 ? allItems[idx + 1] : undefined;
        return { nextItem: next, nextItemIsAssignment: next?.type === 'assignment' };
      })();

      const currentModuleIndex = sortedModules.findIndex(md => md.module.id === selectedContent.moduleId);
      const isLastModule = currentModuleIndex === sortedModules.length - 1;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{content.title}</h2>
              <p className="text-sm text-muted-foreground">
                {content.content_type === 'video' ? 'Video Content' : 'Reading Material'}
              </p>
            </div>
            <Badge variant={moduleData.completedContentIds.includes(content.id) ? 'default' : 'secondary'}>
              {moduleData.completedContentIds.includes(content.id) ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {content.content_type === 'video' ? (
                <div className="space-y-4">
                  {(content.video || content.url) ? (
                    <div
                      ref={playerRef}
                      className="relative aspect-video overflow-hidden rounded-lg border bg-black shadow-lg"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('input[type="range"]')) return;
                        togglePlay();
                      }}
                    >
                      {content.video ? (
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
                    <div className="bg-muted rounded-lg p-8 text-center">
                      <Play className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No video provided</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="prose max-w-none">
                  {content.text ? (
                    <div className="whitespace-pre-wrap">{content.text}</div>
                  ) : (
                    <div className="bg-muted rounded-lg p-8 text-center">
                      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Reading content will be displayed here</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (isLastItemInModule) {
                      try {
                        if (!moduleData.completedContentIds.includes(content.id)) {
                          await coursesApi.markContentComplete(
                            courseId,
                            selectedContent.moduleId,
                            content.id
                          );
                          // Refresh module data after marking complete
                          const updatedProgress = await coursesApi.getModuleProgress(
                            courseId,
                            selectedContent.moduleId
                          );
                          setModuleContents(prev => prev.map(md =>
                            md.module.id === selectedContent.moduleId
                              ? {
                                  ...md,
                                  completedContentIds: updatedProgress.completedContentIds,
                                  completedAssignmentIds: updatedProgress.completedAssignmentIds,
                                  assignmentResults: updatedProgress.assignmentResults
                                }
                              : md
                          ));
                        }
                      } catch (error) {
                        console.error('Failed to mark content as complete before finishing:', error);
                      } finally {
                        // If it is the last module's last item, show course completed message
                        if (isLastModule) {
                          setShowCourseCompleted(true);
                        }
                        // Close the currently open content
                        setSelectedContent(null);
                      }
                    } else {
                      if (nextItem) {
                        setSelectedContent({ type: nextItem.type, id: nextItem.id, moduleId: selectedContent.moduleId });
                      } else {
                        goToNextIncomplete();
                      }
                    }
                  }}
                >
                  {isLastItemInModule ? 'Finish' : (nextItemIsAssignment ? 'Next Assignment' : 'Next Lesson')}
                </Button>
                {isLastItemInModule && !isLastModule && (
                  <Button
                    onClick={() => {
                      const nextModule = sortedModules[currentModuleIndex + 1];
                      if (!nextModule) return;
                      // Expand next module
                      setExpandedModules(new Set([nextModule.module.id]));
                      // Choose first incomplete item in next module, else first item
                      const allNextItems = [
                        ...nextModule.contents.map(c => ({ ...c, type: 'content' as const, order: c.order ?? 0 })),
                        ...nextModule.assignments.map(a => ({ ...a, type: 'assignment' as const, order: (a.order ?? 999) }))
                      ].sort((a, b) => a.order - b.order);

                      let target: { type: 'content' | 'assignment'; id: number } | null = null;
                      for (const it of allNextItems) {
                        const isCompleted = it.type === 'content'
                          ? nextModule.completedContentIds.includes(it.id)
                          : nextModule.completedAssignmentIds.includes(it.id);
                        if (!isCompleted) { target = { type: it.type, id: it.id }; break; }
                      }
                      if (!target && allNextItems[0]) {
                        target = { type: allNextItems[0].type, id: allNextItems[0].id };
                      }
                      if (target) {
                        setSelectedContent({ type: target.type, id: target.id, moduleId: nextModule.module.id });
                      }
                    }}
                  >
                    Next Module
                  </Button>
                )}
                {!moduleData.completedContentIds.includes(content.id) && (
                  <Button 
                    onClick={async () => {
                      try {
                        await coursesApi.markContentComplete(courseId, selectedContent.moduleId, content.id);
                        // Refresh module data
                        const updatedProgress = await coursesApi.getModuleProgress(courseId, selectedContent.moduleId);
                        setModuleContents(prev => prev.map(md => 
                          md.module.id === selectedContent.moduleId 
                            ? { 
                                ...md, 
                                completedContentIds: updatedProgress.completedContentIds,
                                completedAssignmentIds: updatedProgress.completedAssignmentIds,
                                assignmentResults: updatedProgress.assignmentResults
                              }
                            : md
                        ));
                      } catch (error) {
                        console.error('Failed to mark content as complete:', error);
                      }
                    }}
                    disabled={content.content_type === 'video' && duration > 0 && (maxTimeSeen / duration) * 100 < MIN_WATCH_PERCENT}
                    title={content.content_type === 'video' && duration > 0 && (maxTimeSeen / duration) * 100 < MIN_WATCH_PERCENT ? `Watch at least ${MIN_WATCH_PERCENT}% to enable` : undefined}
                  >
                    Mark as Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      const assignment = moduleData.assignments.find(a => a.id === selectedContent.id);
      if (!assignment) return null;

      // Determine if this is the very last item (content or assignment) in the module
      const isLastItemInModule = (() => {
        const allItems = [
          ...moduleData.contents.map(c => ({ type: 'content' as const, id: c.id, order: c.order ?? 0 })),
          ...moduleData.assignments.map(a => ({ type: 'assignment' as const, id: a.id, order: (a.order ?? 999) }))
        ].sort((a, b) => a.order - b.order);
        const last = allItems[allItems.length - 1];
        return last?.type === 'assignment' && last?.id === assignment.id;
      })();

      const currentModuleIndex = sortedModules.findIndex(md => md.module.id === selectedContent.moduleId);
      const isLastModule = currentModuleIndex === sortedModules.length - 1;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{assignment.title}</h2>
              <p className="text-sm text-muted-foreground">
                {assignment.assignment_type === 'mcq' ? 'Multiple Choice Quiz' : 'Q&A Assignment'}
              </p>
            </div>
            <Badge variant={moduleData.completedAssignmentIds.includes(assignment.id) ? 'default' : 'secondary'}>
              {moduleData.completedAssignmentIds.includes(assignment.id) ? 'Completed' : 'Not Started'}
            </Badge>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p>{assignment.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Total Points: {assignment.total_points}</div>
                  <div>Passing Grade: {assignment.passing_grade}%</div>
                </div>
                
                {/* Assignment Results Display */}
                {(() => {
                  const result = moduleData.assignmentResults[assignment.id];
                  if (result) {
                    return (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Your Results</h4>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={result.passed ? "default" : "destructive"}
                              className="text-sm"
                            >
                              {result.passed ? 'PASSED' : 'FAILED'}
                            </Badge>
                            <Badge variant="outline" className="text-sm">
                              {Math.min(100, Math.round((result.score / result.totalPoints) * 100))}%
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>Score: {result.score}/{result.totalPoints}</div>
                          <div>Attempts Used: {result.attemptsUsed}/{result.maxAttempts}</div>
                        </div>
                        {!result.passed && !result.canRetake && (
                          <div className="mt-2 text-sm text-red-600">
                            No more attempts remaining
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <Button 
                  onClick={() => {
                    navigate(`${basePath}/${courseId}/assignments/${assignment.id}`);
                  }}
                  disabled={(() => {
                    const result = moduleData.assignmentResults[assignment.id];
                    return result && !result.canRetake && !result.passed;
                  })()}
                >
                  {(() => {
                    const result = moduleData.assignmentResults[assignment.id];
                    if (result) {
                      if (result.passed) return 'Review Assignment';
                      if (result.canRetake) return 'Retake Assignment';
                      return 'Assignment Completed';
                    }
                    return 'Start Assignment';
                  })()}
                </Button>
                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isLastItemInModule) {
                        // On last item of last module, close and show completed
                        if (isLastModule) {
                          setShowCourseCompleted(true);
                        }
                        setSelectedContent(null);
                      } else {
                        // When viewing an assignment, advance to the immediate next item, if any
                        const allItems = [
                          ...moduleData.contents.map(c => ({ type: 'content' as const, id: c.id, order: c.order ?? 0 })),
                          ...moduleData.assignments.map(a => ({ type: 'assignment' as const, id: a.id, order: (a.order ?? 999) }))
                        ].sort((a, b) => a.order - b.order);
                        const idx = allItems.findIndex(it => it.type === 'assignment' && it.id === assignment.id);
                        const next = idx >= 0 ? allItems[idx + 1] : undefined;
                        if (next) {
                          setSelectedContent({ type: next.type, id: next.id, moduleId: selectedContent.moduleId });
                        } else {
                          goToNextIncomplete();
                        }
                      }
                    }}
                  >
                    {(() => {
                      if (isLastItemInModule) return 'Finish';
                      const allItems = [
                        ...moduleData.contents.map(c => ({ type: 'content' as const, id: c.id, order: c.order ?? 0 })),
                        ...moduleData.assignments.map(a => ({ type: 'assignment' as const, id: a.id, order: (a.order ?? 999) }))
                      ].sort((a, b) => a.order - b.order);
                      const idx = allItems.findIndex(it => it.type === 'assignment' && it.id === assignment.id);
                      const next = idx >= 0 ? allItems[idx + 1] : undefined;
                      if (next?.type === 'assignment') return 'Next Assignment';
                      return 'Next Lesson';
                    })()}
                  </Button>
                  {isLastItemInModule && !isLastModule && (
                    <Button
                      onClick={() => {
                        const nextModule = sortedModules[currentModuleIndex + 1];
                        if (!nextModule) return;
                        setExpandedModules(new Set([nextModule.module.id]));
                        const allNextItems = [
                          ...nextModule.contents.map(c => ({ ...c, type: 'content' as const, order: c.order ?? 0 })),
                          ...nextModule.assignments.map(a => ({ ...a, type: 'assignment' as const, order: (a.order ?? 999) }))
                        ].sort((a, b) => a.order - b.order);
                        let target: { type: 'content' | 'assignment'; id: number } | null = null;
                        for (const it of allNextItems) {
                          const isCompleted = it.type === 'content'
                            ? nextModule.completedContentIds.includes(it.id)
                            : nextModule.completedAssignmentIds.includes(it.id);
                          if (!isCompleted) { target = { type: it.type, id: it.id }; break; }
                        }
                        if (!target && allNextItems[0]) {
                          target = { type: allNextItems[0].type, id: allNextItems[0].id };
                        }
                        if (target) {
                          setSelectedContent({ type: target.type, id: target.id, moduleId: nextModule.module.id });
                        }
                      }}
                    >
                      Next Module
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r bg-muted/50 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-muted-foreground p-6">Course not found.</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <BackButton to={basePath} />
            <Badge variant="secondary">
              {courseProgress.percentage}% Complete
            </Badge>
          </div>
          <h1 className="font-semibold text-lg mb-2">{course.title}</h1>
          <Progress value={courseProgress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {courseProgress.completedItems} of {courseProgress.totalItems} items completed
          </p>
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {moduleContents.map((moduleData, index) => {
              const isUnlocked = isModuleUnlocked(index);
              const isExpanded = expandedModules.has(moduleData.module.id);
              const totalItems = moduleData.contents.length + moduleData.assignments.length;
              const completedItems = moduleData.completedContentIds.length + moduleData.completedAssignmentIds.length;
              const isModuleComplete = totalItems > 0 && completedItems === totalItems;

              return (
                <div key={moduleData.module.id} className="border rounded-lg">
                  {/* Module Header */}
                  <button
                    onClick={() => isUnlocked && toggleModule(moduleData.module.id)}
                    disabled={!isUnlocked}
                    className={cn(
                      "w-full p-3 text-left flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors",
                      !isUnlocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isUnlocked ? (
                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {moduleData.module.title}
                          {isModuleComplete && <Check className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {completedItems}/{totalItems} completed
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Module Content */}
                  {isExpanded && isUnlocked && (
                    <div className="px-3 pb-3">
                      <div className="space-y-1">
                        {/* Contents */}
                        {moduleData.contents.map((content) => {
                          const isCompleted = moduleData.completedContentIds.includes(content.id);
                          const isSelected = selectedContent?.type === 'content' && selectedContent.id === content.id;
                          
                          return (
                            <button
                              key={content.id}
                              onClick={() => selectItem('content', content.id, moduleData.module.id)}
                              className={cn(
                                "w-full p-2 text-left rounded flex items-center gap-3 hover:bg-muted/50 transition-colors text-sm",
                                isSelected && "bg-primary/10 border border-primary/20"
                              )}
                            >
                              {content.content_type === 'video' ? (
                                <Play className="h-4 w-4 text-blue-600" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-green-600" />
                              )}
                              <span className="flex-1">{content.title}</span>
                              {isCompleted && <Check className="h-4 w-4 text-green-600" />}
                            </button>
                          );
                        })}

                        {/* Assignments */}
                        {moduleData.assignments.map((assignment) => {
                          const isCompleted = moduleData.completedAssignmentIds.includes(assignment.id);
                          const isSelected = selectedContent?.type === 'assignment' && selectedContent.id === assignment.id;
                          const result = moduleData.assignmentResults[assignment.id];
                          const hasResult = result && result.score !== undefined;
                          
                          return (
                            <button
                              key={assignment.id}
                              onClick={() => selectItem('assignment', assignment.id, moduleData.module.id)}
                              className={cn(
                                "w-full p-2 text-left rounded flex items-center gap-3 hover:bg-muted/50 transition-colors text-sm",
                                isSelected && "bg-primary/10 border border-primary/20"
                              )}
                            >
                              <FileText className="h-4 w-4 text-orange-600" />
                              <div className="flex-1">
                                <div>{assignment.title}</div>
                                {hasResult && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Score: {result.score}/{result.totalPoints} • 
                                    <span className={result.passed ? "text-green-600" : "text-red-600"}>
                                      {result.passed ? 'Passed' : 'Failed'}
                                    </span>
                                    <br />
                                    Attempts: {result.attemptsUsed}/{result.maxAttempts}
                                  </div>
                                )}
                              </div>
                              {isCompleted ? (
                                <div className="flex items-center gap-1">
                                  {hasResult && (
                                    <Badge 
                                      variant={result.passed ? "default" : "destructive"}
                                      className="text-xs px-1 py-0"
                                    >
                                      {Math.min(100, Math.round((result.score / result.totalPoints) * 100))}%
                                    </Badge>
                                  )}
                                  <Check className="h-4 w-4 text-green-600" />
                                </div>
                              ) : hasResult && !result.passed ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant="destructive" className="text-xs px-1 py-0">
                                    {Math.min(100, Math.round((result.score / result.totalPoints) * 100))}%
                                  </Badge>
                                  {!result.canRetake && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 text-muted-foreground">
                                      No retakes
                                    </Badge>
                                  )}
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default CourseViewer;
