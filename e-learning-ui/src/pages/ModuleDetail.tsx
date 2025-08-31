import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription as AlertDescription,
  AlertDialogFooter as AlertFooter,
  AlertDialogHeader as AlertHeader,
  AlertDialogTitle as AlertTitle,
  AlertDialogTrigger as AlertTrigger,
} from '@/components/ui/alert-dialog';

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
  const [insertAfter, setInsertAfter] = useState<string>('end');
  const [form, setForm] = useState<{ title: string; content_type: 'video' | 'reading'; url?: string; text?: string; order: number; duration_minutes: number }>({
    title: '',
    content_type: 'reading',
    url: '',
    text: '',
    order: 1,
    duration_minutes: 0,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [editInsertAfter, setEditInsertAfter] = useState<string>('__unchanged__');
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (insertAfter !== 'end') {
      const lastId = contents.length > 0 ? contents[contents.length - 1].id : null;
      if (lastId !== null && String(lastId) === insertAfter) {
        setInsertAfter('end');
      }
    }
  }, [contents, insertAfter]);

  const handleComplete = async (contentId: number) => {
    setMarking(contentId);
    try {
      await coursesApi.markContentComplete(courseId, modId, contentId);
    } finally {
      setMarking(null);
    }
  };

  const deleteContent = async () => {
    if (!editing) return;
    setIsDeleting(true);
    try {
      await coursesApi.deleteModuleContent(courseId, modId, editing.id);
      const refreshed = await coursesApi.getModuleContents(courseId, modId);
      setContents(refreshed);
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: 'Content deleted' });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: unknown } })?.response?.data;
      const asRecord = (v: unknown): Record<string, unknown> | null =>
        typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
      const dataRec = asRecord(respData);
      const detail = typeof respData === 'string'
        ? respData
        : (dataRec?.detail as string | undefined)
          || 'Failed to delete content';
      toast({ title: 'Error', description: String(detail) });
    } finally {
      setIsDeleting(false);
    }
  };

  const saveContent = async () => {
    if (!module) return;
    setIsSaving(true);
    try {
      if (form.content_type === 'video') {
        if (!videoFile) {
          toast({ title: 'Select a video file', description: 'Please choose a video to upload.' });
          return;
        }
        const fd = new FormData();
        fd.append('module', String(modId));
        fd.append('title', form.title.trim());
        fd.append('content_type', 'video');
        if (insertAfter !== 'end') fd.append('after_content_id', String(insertAfter));
        fd.append('video', videoFile);
        await coursesApi.createModuleContentUpload(courseId, modId, fd);
      } else {
        const payload: {
          module: number;
          title: string;
          content_type: 'video' | 'reading';
          url?: string;
          text?: string;
          duration_minutes: number;
          after_content_id?: number;
        } = {
          module: modId,
          title: form.title.trim(),
          content_type: form.content_type,
          url: undefined,
          text: form.content_type === 'reading' ? form.text : undefined,
          duration_minutes: form.duration_minutes,
        };
        if (insertAfter !== 'end') payload.after_content_id = Number(insertAfter);
        await coursesApi.createModuleContent(courseId, modId, payload);
      }
      const refreshed = await coursesApi.getModuleContents(courseId, modId);
      setContents(refreshed);
      setIsAddOpen(false);
      setForm({ title: '', content_type: 'reading', url: '', text: '', order: 1, duration_minutes: 0 });
      setVideoFile(null);
      setInsertAfter('end');
      toast({ title: 'Content added' });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: unknown } })?.response?.data;
      const asRecord = (v: unknown): Record<string, unknown> | null =>
        typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
      const dataRec = asRecord(respData);
      const orderArr = (dataRec?.order as unknown[] | undefined);
      const detail = typeof respData === 'string'
        ? respData
        : (dataRec?.detail as string | undefined)
          || (Array.isArray(orderArr) && typeof orderArr[0] === 'string' ? orderArr[0] : undefined)
          || Object.keys(dataRec || {}).map((k) => {
               const v = dataRec ? dataRec[k] : undefined;
               return Array.isArray(v) ? `${k}: ${String(v[0])}` : `${k}: ${String(v)}`;
             }).shift()
          || 'Failed to add content';
      toast({ title: 'Error', description: String(detail) });
    } finally {
      setIsSaving(false);
    }
  };

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
  }, [location.pathname]);

  const currentEditPositionText = useMemo(() => {
    if (!editing) return 'Current position';
    const sorted = contents.slice().sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((c) => c.id === editing.id);
    if (index === -1) return 'Current position';
    if (index === 0) return 'First';
    if (index === sorted.length - 1) return 'At end';
    const prev = sorted[index - 1];
    return `After: ${prev.title}`;
  }, [editing, contents]);

  const hasEditChanges = useMemo(() => {
    if (!editing) return false;
    const titleChanged = editForm.title.trim() !== (editing.title ?? '').trim();
    const typeChanged = editForm.content_type !== editing.content_type;
    const urlChanged = editForm.content_type === 'video'
      ? (editForm.url ?? '') !== (editing.url ?? '')
      : false;
    const textChanged = editForm.content_type === 'reading'
      ? (editForm.text ?? '') !== (editing.text ?? '')
      : false;
    const durationChanged = editForm.duration_minutes !== (editing.duration_minutes ?? 0);
    const positionChanged = editInsertAfter !== '__unchanged__';
    return (
      titleChanged || typeChanged || urlChanged || textChanged || durationChanged || positionChanged
    );
  }, [editing, editForm, editInsertAfter]);

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
    setEditInsertAfter('__unchanged__');
    setIsEditOpen(true);
  };

  const computeOrderAfter = (after: 'end' | number, currentId: number): number => {
    const others = contents
      .filter((c) => c.id !== currentId)
      .slice()
      .sort((a, b) => a.order - b.order);
    const maxOrder = others.length > 0 ? others[others.length - 1].order : 0;
    if (after === 'end') return maxOrder + 1;
    const prevIndex = others.findIndex((c) => c.id === after);
    if (prevIndex === -1) return maxOrder + 1;
    const prevOrder = others[prevIndex].order;
    const nextOrder = prevIndex < others.length - 1 ? others[prevIndex + 1].order : undefined;
    const existing = new Set(others.map((c) => c.order));
    let candidate = prevOrder + 1;
    while (existing.has(candidate)) candidate++;
    if (typeof nextOrder === 'number' && candidate >= nextOrder) {
      return maxOrder + 1;
    }
    return candidate;
  };

  const saveEdit = async () => {
    if (!editing) return;
    setIsUpdating(true);
    try {
      const payload: {
        title?: string;
        content_type?: 'video' | 'reading';
        url?: string;
        text?: string;
        order?: number;
        duration_minutes?: number;
      } = {
        title: editForm.title?.trim(),
        content_type: editForm.content_type,
        url: editForm.content_type === 'video' ? editForm.url : undefined,
        text: editForm.content_type === 'reading' ? editForm.text : undefined,
        duration_minutes: editForm.duration_minutes,
      };

      if (editInsertAfter !== '__unchanged__') {
        const afterVal = editInsertAfter === 'end' ? 'end' : Number(editInsertAfter);
        payload.order = computeOrderAfter(afterVal, editing.id);
      }

      await coursesApi.updateModuleContent(
        courseId,
        modId,
        editing.id,
        payload
      );
      const refreshed = await coursesApi.getModuleContents(courseId, modId);
      setContents(refreshed);
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: 'Content updated' });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: unknown } })?.response?.data;
      const asRecord = (v: unknown): Record<string, unknown> | null =>
        typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
      const dataRec = asRecord(respData);
      const orderArr = (dataRec?.order as unknown[] | undefined);
      const detail = typeof respData === 'string'
        ? respData
        : (dataRec?.detail as string | undefined)
          || (Array.isArray(orderArr) && typeof orderArr[0] === 'string' ? orderArr[0] : undefined)
          || Object.keys(dataRec || {}).map((k) => {
               const v = dataRec ? dataRec[k] : undefined;
               return Array.isArray(v) ? `${k}: ${String(v[0])}` : `${k}: ${String(v)}`;
             }).shift()
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{module.title}</h1>
          {module.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{module.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate(`${basePath}/${courseId}`)}>Back</Button>
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
                        <Label htmlFor="video">Upload video</Label>
                        <div className="flex items-center gap-3">
                          <input
                            id="video"
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="bg-muted hover:bg-muted/80 text-foreground"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Choose file
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {videoFile ? videoFile.name : 'No file chosen'}
                          </span>
                        </div>
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
                        <Label htmlFor="pos">Position</Label>
                        <Select value={insertAfter} onValueChange={setInsertAfter}>
                          <SelectTrigger id="pos">
                            <SelectValue placeholder="At end" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="end">At end</SelectItem>
                            {contents.slice(0, -1).map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {`After: ${c.title}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.content_type !== 'video' && (
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={form.duration_minutes}
                            onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                          />
                        </div>
                      )}
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
                        {c.content_type === 'video' ? 'Video' : 'Reading'}
                        {!isTeacherOrAdmin && <> • order {c.order}</>}
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
                  <Label htmlFor="epos">Position</Label>
                  <Select value={editInsertAfter === '__unchanged__' ? undefined : editInsertAfter} onValueChange={setEditInsertAfter}>
                    <SelectTrigger id="epos">
                      <SelectValue placeholder={currentEditPositionText} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">At end</SelectItem>
                      {contents.filter((c) => c.id !== (editing?.id ?? -1)).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {`After: ${c.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              {editing && (
                <AlertDialog>
                  <AlertTrigger asChild>
                    <Button variant="destructive" disabled={isUpdating}>Delete</Button>
                  </AlertTrigger>
                  <AlertContent>
                    <AlertHeader>
                      <AlertTitle>Delete this content?</AlertTitle>
                      <AlertDescription>This action cannot be undone.</AlertDescription>
                    </AlertHeader>
                    <AlertFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteContent}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertFooter>
                  </AlertContent>
                </AlertDialog>
              )}
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
              <Button onClick={saveEdit} disabled={isUpdating || !editForm.title.trim() || !hasEditChanges}>
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


