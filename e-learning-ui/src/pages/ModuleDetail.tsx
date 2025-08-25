import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { coursesApi } from '@/api/courses';
import { Content, CourseModule } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const ModuleDetail: React.FC = () => {
  const { id, moduleId } = useParams();
  const courseId = Number(id);
  const modId = Number(moduleId);
  const [module, setModule] = useState<CourseModule | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marking, setMarking] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, items, done] = await Promise.all([
          coursesApi.getCourseModule(courseId, modId),
          coursesApi.getModuleContents(courseId, modId),
          coursesApi.getModuleContentProgress(courseId, modId),
        ]);
        setModule(m);
        setContents(items);
        setCompletedIds(done ?? []);
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId) && !Number.isNaN(modId)) load();
  }, [courseId, modId]);

  const handleComplete = async (contentId: number) => {
    setMarking(contentId);
    try {
      await coursesApi.markContentComplete(courseId, modId, contentId);
    } finally {
      setMarking(null);
    }
  };

  const handleOpen = (content: Content) => {
    // Teachers view content details but won't watch/read as a student
    navigate(`/app/courses/${courseId}/modules/${modId}/content/${content.id}`);
  };

  if (isLoading) return <div className="h-40 bg-muted rounded" />;
  if (!module) return <div className="text-muted-foreground">Module not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{module.title}</h1>
        {module.description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{module.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contents</CardTitle>
        </CardHeader>
        <CardContent>
          {contents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No content yet.</div>
          ) : (
            <ol className="space-y-3 list-decimal pl-6">
              {contents.map((c) => (
                <li key={c.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.content_type === 'video' ? 'Video' : 'Reading'} • order {c.order}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpen(c)}>
                        {user?.role === 'teacher' ? 'View' : c.content_type === 'video' ? 'Watch content' : 'Read content'}
                      </Button>
                      {user?.role === 'student' && (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(c.id)}
                          disabled={marking === c.id || completedIds.includes(c.id)}
                        >
                          {completedIds.includes(c.id)
                            ? 'Completed'
                            : marking === c.id
                              ? 'Marking...'
                              : 'Mark complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;


