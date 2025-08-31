import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/ui/back-button';
import { coursesApi } from '@/api/courses';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
  }, [location.pathname]);

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
          <BackButton to={`${basePath}/${courseId}/modules/${modId}`} />
          {user?.role === 'student' && (
            <Button onClick={markComplete} disabled={marking || completed}>
              {completed ? 'Completed' : marking ? 'Marking...' : 'Mark complete'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          {content.content_type === 'reading' ? (
            <div className="prose prose-invert max-w-none text-sm leading-6">
              {content.text ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{content.text}</div>
              ) : (
                <div className="text-muted-foreground">No text provided.</div>
              )}
            </div>
          ) : (
            <div className="aspect-video w-full">
              {content.video ? (
                <video src={content.video} controls className="w-full h-full rounded" />
              ) : content.url ? (
                <iframe
                  title={content.title}
                  src={content.url}
                  className="w-full h-full rounded"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="text-muted-foreground">No video provided.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentViewer;


