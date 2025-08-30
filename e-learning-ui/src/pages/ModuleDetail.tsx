import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { coursesApi } from '@/api/courses';
import { Content, CourseModule } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const ModuleDetail: React.FC = () => {
  const { id, moduleId } = useParams();
  const courseId = Number(id);
  const modId = Number(moduleId);
  const [module, setModule] = useState<CourseModule | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marking, setMarking] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{ title: string; content_type: 'video' | 'reading'; url?: string; text?: string; order: number; duration_minutes: number }>({
    title: '',
    content_type: 'reading',
    url: '',
    text: '',
    order: 1,
    duration_minutes: 0,
  });

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; content_type: 'video' | 'reading'; url?: string; text?: string; order: number; duration_minutes: number }>({
    title: '',
    content_type: 'reading',
    url: '',
    text: '',
    order: 1,
    duration_minutes: 0,
  });

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

  const saveContent = async () => {
    if (!module) return;
    setIsSaving(true);
    try {
      await coursesApi.createModuleContent(courseId, modId, {
        module: modId,
        title: form.title.trim(),
        content_type: form.content_type,
        url: form.content_type === 'video' ? form.url : undefined,
        text: form.content_type === 'reading' ? form.text : undefined,
        order: form.order,
        duration_minutes: form.duration_minutes,
      });
      const refreshed = await coursesApi.getModuleContents(courseId, modId);
      setContents(refreshed);
      setIsAddOpen(false);
      setForm({ title: '', content_type: 'reading', url: '', text: '', order: 1, duration_minutes: 0 });
      toast({ title: 'Content added' });
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === 'string'
        ? data
        : data?.detail
          || data?.order?.[0]
          || Object.keys(data ?? {}).map((k) => Array.isArray(data[k]) ? `${k}: ${data[k][0]}` : `${k}: ${data[k]}`).shift()
          || 'Failed to add content';
      toast({ title: 'Error', description: String(detail) });
    } finally {
      setIsSaving(false);
    }
  };

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
  }, [location.pathname]);

  const handleOpen = (content: Content) => {
    // Teachers view content details but won't watch/read as a student
    navigate(`${basePath}/${courseId}/modules/${modId}/content/${content.id}`);
  };

  const openEdit = (content: Content) => {
    setEditing(content);
    setEditForm({
      title: content.title,
      content_type: content.content_type,
      url: content.url ?? '',
      text: content.text ?? '',
      order: content.order,
      duration_minutes: content.duration_minutes ?? 0,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setIsUpdating(true);
    try {
      await coursesApi.updateModuleContent(
        courseId,
        modId,
        editing.id,
        {
          title: editForm.title?.trim(),
          content_type: editForm.content_type,
          url: editForm.content_type === 'video' ? editForm.url : undefined,
          text: editForm.content_type === 'reading' ? editForm.text : undefined,
          order: editForm.order,
          duration_minutes: editForm.duration_minutes,
        }
      );
      const refreshed = await coursesApi.getModuleContents(courseId, modId);
      setContents(refreshed);
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: 'Content updated' });
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === 'string'
        ? data
        : data?.detail
          || data?.order?.[0]
          || Object.keys(data ?? {}).map((k) => Array.isArray(data[k]) ? `${k}: ${data[k][0]}` : `${k}: ${data[k]}`).shift()
          || 'Failed to update content';
      toast({ title: 'Error', description: String(detail) });
    } finally {
      setIsUpdating(false);
    }
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contents</CardTitle>
            {isTeacherOrAdmin && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Content</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add content</DialogTitle>
                    <DialogDescription>Provide details according to type.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctype">Content type</Label>
                      <select
                        id="ctype"
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        value={form.content_type}
                        onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value as 'video' | 'reading' }))}
                      >
                        <option value="video">Video</option>
                        <option value="reading">Reading</option>
                      </select>
                    </div>
                    {form.content_type === 'video' ? (
                      <div className="space-y-2">
                        <Label htmlFor="url">Video URL</Label>
                        <Input
                          id="url"
                          value={form.url}
                          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="text">Reading text</Label>
                        <Textarea
                          id="text"
                          value={form.text}
                          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                          rows={6}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="order">Order</Label>
                        <Input
                          id="order"
                          type="number"
                          value={form.order}
                          onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={form.duration_minutes}
                          onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={saveContent} disabled={isSaving || !form.title.trim()}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
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
                      {isTeacherOrAdmin && (
                        <Button size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      )}
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

      {isTeacherOrAdmin && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit content</DialogTitle>
              <DialogDescription>Update content details and save.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="etitle">Title</Label>
                <Input
                  id="etitle"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ectype">Content type</Label>
                <select
                  id="ectype"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={editForm.content_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, content_type: e.target.value as 'video' | 'reading' }))}
                >
                  <option value="video">Video</option>
                  <option value="reading">Reading</option>
                </select>
              </div>
              {editForm.content_type === 'video' ? (
                <div className="space-y-2">
                  <Label htmlFor="eurl">Video URL</Label>
                  <Input
                    id="eurl"
                    value={editForm.url}
                    onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="etext">Reading text</Label>
                  <Textarea
                    id="etext"
                    value={editForm.text}
                    onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                    rows={6}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eorder">Order</Label>
                  <Input
                    id="eorder"
                    type="number"
                    value={editForm.order}
                    onChange={(e) => setEditForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eduration">Duration (minutes)</Label>
                  <Input
                    id="eduration"
                    type="number"
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
              <Button onClick={saveEdit} disabled={isUpdating || !editForm.title.trim()}>
                {isUpdating ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ModuleDetail;


