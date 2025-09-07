import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { coursesApi } from '@/api/courses';
import { Assignment, Content, CourseModule, Course } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
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
import ProfessionalRichTextEditor from '@/components/richtext/ProfessionalRichTextEditor';

const ModuleDetail: React.FC = () => {
  const { id, moduleId } = useParams();
  const courseId = Number(id);
  const modId = Number(moduleId);
  const [module, setModule] = useState<CourseModule | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const [course, setCourse] = useState<Course | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
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

  // Assignment form state
  const [assignForm, setAssignForm] = useState<{
    title: string;
    assignment_type: 'mcq' | 'qa';
    description: string;
    total_points: number;
    passing_grade: number;
    max_attempts?: number;
  }>({
    title: '',
    assignment_type: 'qa',
    description: '',
    total_points: 100,
    passing_grade: 60,
    max_attempts: 1,
  });

  // Question builder state
  type NewOption = { id?: string; text: string; is_correct: boolean };
  type NewQuestion = {
    id?: string;
    question_type: 'mcq' | 'qa';
    text: string;
    points: number;
    keywords?: string; // comma-separated keywords for QA auto-grading
    required_keywords?: string; // comma-separated required
    negative_keywords?: string; // comma-separated negative
    acceptable_answers?: string; // comma-separated acceptable exact
    options: NewOption[]; // for mcq; ignored for qa
  };
  const [newQuestions, setNewQuestions] = useState<NewQuestion[]>([]);

  const addQuestion = (type: 'mcq' | 'qa') => {
    setNewQuestions((qs) => [
      ...qs,
      {
        id: crypto.randomUUID(),
        question_type: type,
        text: '',
        points: 1,
        // MCQ starts with 3 mandatory options (non-removable)
        options: type === 'mcq' ? [
          { id: crypto.randomUUID(), text: '', is_correct: false },
          { id: crypto.randomUUID(), text: '', is_correct: false },
          { id: crypto.randomUUID(), text: '', is_correct: false },
        ] : [],
      },
    ]);
  };

  const removeQuestion = (qid: string) => setNewQuestions((qs) => qs.filter((q) => q.id !== qid));
  const addOption = (qid: string) => setNewQuestions((qs) => qs.map((q) => {
    if (q.id !== qid) return q;
    // Limit to max 5 options
    if (q.options.length >= 5) return q;
    return {
      ...q,
      options: [...q.options, { id: crypto.randomUUID(), text: '', is_correct: false }],
    };
  }));
  const removeOption = (qid: string, oid: string) => setNewQuestions((qs) => qs.map((q) => {
    if (q.id !== qid) return q;
    const idx = q.options.findIndex((o) => o.id === oid);
    // First 3 options are mandatory; do not remove them
    if (idx > -1 && idx < 3) return q;
    return { ...q, options: q.options.filter((o) => o.id !== oid) };
  }));

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
        const [m, items, done, asgs, crs] = await Promise.all([
          coursesApi.getCourseModule(courseId, modId),
          coursesApi.getModuleContents(courseId, modId),
          coursesApi.getModuleContentProgress(courseId, modId),
          coursesApi.getCourseAssignments(courseId, { module: modId }),
          coursesApi.getCourse(courseId),
        ]);
        setModule(m);
        setContents(items);
        setCompletedIds(done ?? []);
        setAssignments(asgs ?? []);
        setCourse(crs);
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

  // Video completion stats for student view
  const videoStats = useMemo(() => {
    const videos = contents.filter((c) => c.content_type === 'video');
    const total = videos.length;
    const completed = videos.filter((c) => completedIds.includes(c.id)).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [contents, completedIds]);

  // Completion is handled inside individual content pages now

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

  const saveAssignment = async () => {
    setIsSaving(true);
    try {
      const created = await coursesApi.createAssignment(courseId, {
        module: modId,
        assignment_type: assignForm.assignment_type,
        title: assignForm.title.trim(),
        description: assignForm.description,
        total_points: assignForm.total_points,
        passing_grade: assignForm.passing_grade,
        max_attempts: assignForm.max_attempts,
      });

      // If questions were built, send only those matching selected type
      if (visibleNewQuestions.length > 0) {
        const payload = visibleNewQuestions.map((q, idx) => ({
          question_type: q.question_type,
          text: q.text,
          points: q.points,
          order: idx + 1,
          keywords: q.question_type === 'qa' ? (q.keywords ? q.keywords.split(',').map((s) => s.trim()).filter(Boolean) : []) : undefined,
          required_keywords: q.question_type === 'qa' ? (q.required_keywords ? q.required_keywords.split(',').map((s) => s.trim()).filter(Boolean) : []) : undefined,
          negative_keywords: q.question_type === 'qa' ? (q.negative_keywords ? q.negative_keywords.split(',').map((s) => s.trim()).filter(Boolean) : []) : undefined,
          acceptable_answers: q.question_type === 'qa' ? (q.acceptable_answers ? q.acceptable_answers.split(',').map((s) => s.trim()).filter(Boolean) : []) : undefined,
          options: q.question_type === 'mcq' ? q.options.map((o, i) => ({ text: o.text, is_correct: o.is_correct, order: i + 1 })) : [],
        }));
        await coursesApi.createAssignmentQuestions(courseId, created.id, payload as unknown as { question_type: 'mcq' | 'qa'; text: string; points: number; order?: number; options?: { text: string; is_correct: boolean; order?: number }[]; }[]);
      }

      const refreshed = await coursesApi.getCourseAssignments(courseId, { module: modId });
      setAssignments(refreshed);
      setIsAssignOpen(false);
      setAssignForm({ title: '', assignment_type: 'qa', description: '', total_points: 100, passing_grade: 60, max_attempts: 1 });
      setNewQuestions([]);
      toast({ title: 'Assignment created' });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: unknown } })?.response?.data;
      const asRecord = (v: unknown): Record<string, unknown> | null =>
        typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
      const dataRec = asRecord(respData);
      const detail = typeof respData === 'string'
        ? respData
        : (dataRec?.detail as string | undefined)
          || Object.keys(dataRec || {}).map((k) => {
               const v = dataRec ? dataRec[k] : undefined;
               return Array.isArray(v) ? `${k}: ${String(v[0])}` : `${k}: ${String(v)}`;
             }).shift()
          || 'Failed to create assignment';
      toast({ title: 'Error', description: String(detail) });
    } finally {
      setIsSaving(false);
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

  // Only show questions that match currently selected assignment type
  const visibleNewQuestions = useMemo(() => {
    return newQuestions.filter((q) => q.question_type === assignForm.assignment_type);
  }, [newQuestions, assignForm.assignment_type]);

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

  const canEdit = useMemo(() => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'teacher') return course ? !course.is_published : false;
    return false;
  }, [user?.role, course]);

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
            {!isTeacherOrAdmin ? (
              <div className="text-xs text-muted-foreground text-right">
                <div>
                  Videos: {videoStats.completed}/{videoStats.total} ({videoStats.percent}%)
                </div>
                <div className="mt-1 h-1 w-32 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-foreground" style={{ width: `${videoStats.percent}%` }} />
                </div>
              </div>
            ) : null}
            {canEdit && (
              <Dialog modal={false} open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Content</Button>
                </DialogTrigger>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
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
                      <div className="space-y-2 relative z-50">
                        <Label htmlFor="create-reading-editor">Reading text</Label>
                        <ProfessionalRichTextEditor
                          id="create-reading-editor"
                          className="pointer-events-auto"
                          value={form.text}
                          onChange={(html) => setForm((f) => ({ ...f, text: html }))}
                          height={300}
                          placeholder="Write your reading content here..."
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
                        {user?.role === 'teacher'
                          ? 'View'
                          : completedIds.includes(c.id)
                            ? (c.content_type === 'video' ? 'Rewatch' : 'Read again')
                            : (c.content_type === 'video' ? 'Watch content' : 'Read content')}
                      </Button>
                      {canEdit && (
                        <Button size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      )}
                      {user?.role === 'student' && completedIds.includes(c.id) ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assignments</CardTitle>
            {canEdit && (
              <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Create assignment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create assignment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="atitle">Title</Label>
                      <Input id="atitle" value={assignForm.title} onChange={(e) => setAssignForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="atype">Type</Label>
                        <select
                          id="atype"
                          className="w-full rounded-md border bg-background p-2 text-sm"
                          value={assignForm.assignment_type}
                          onChange={(e) => setAssignForm((f) => ({ ...f, assignment_type: e.target.value as 'mcq' | 'qa' }))}
                        >
                          <option value="qa">Q&A</option>
                          <option value="mcq">MCQs</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adesc">Description</Label>
                      <Textarea id="adesc" rows={4} value={assignForm.description} onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="points">Total points</Label>
                        <Input id="points" type="number" value={assignForm.total_points} onChange={(e) => setAssignForm((f) => ({ ...f, total_points: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pass">Passing %</Label>
                        <Input id="pass" type="number" value={assignForm.passing_grade} onChange={(e) => setAssignForm((f) => ({ ...f, passing_grade: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attempts">Max attempts</Label>
                        <Input id="attempts" type="number" min={1} value={assignForm.max_attempts ?? 1} onChange={(e) => setAssignForm((f) => ({ ...f, max_attempts: Math.max(1, Number(e.target.value)) }))} />
                      </div>
                    </div>

                    {/* Question builder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Questions</div>
                        <div className="flex gap-2">
                          {assignForm.assignment_type === 'qa' ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => addQuestion('qa')}>Add Q&A</Button>
                          ) : (
                            <Button type="button" size="sm" onClick={() => addQuestion('mcq')}>Add MCQ</Button>
                          )}
                        </div>
                      </div>
                      {visibleNewQuestions.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {assignForm.assignment_type === 'qa' ? 'No Q&A questions yet. Add Q&A.' : 'No MCQs yet. Add MCQ.'}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleNewQuestions.map((q, qi) => (
                            <div key={q.id} className="rounded border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                    <div className="sm:col-span-4">
                                      <Label>Question {qi + 1} ({q.question_type.toUpperCase()})</Label>
                                      <Textarea
                                        value={q.text}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, text: e.target.value } : it))}
                                        rows={3}
                                      />
                                    </div>
                                    <div className="sm:col-span-1">
                                      <Label>Points</Label>
                                      <Input
                                        type="number"
                                        value={q.points}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, points: Number(e.target.value) } : it))}
                                      />
                                    </div>
                                  </div>
                                  {q.question_type === 'mcq' && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label>Options</Label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addOption(q.id!)}
                                          disabled={q.options.length >= 5}
                                        >
                                          Add option
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        {q.options.map((o) => (
                                          <div key={o.id} className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                                            <div className="sm:col-span-8">
                                              <Input
                                                value={o.text}
                                                onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? {
                                                  ...it,
                                                  options: it.options.map((op) => op.id === o.id ? { ...op, text: e.target.value } : op)
                                                } : it))}
                                              />
                                            </div>
                                            <div className="sm:col-span-3 text-sm">
                                              <label className="inline-flex items-center gap-2 whitespace-nowrap">
                                                <input
                                                  type="checkbox"
                                                  checked={o.is_correct}
                                                  onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? {
                                                    ...it,
                                                    options: it.options.map((op) => op.id === o.id ? { ...op, is_correct: e.target.checked } : op)
                                                  } : it))}
                                                />
                                                Correct
                                              </label>
                                            </div>
                                            {q.options.findIndex((x) => x.id === o.id) >= 3 ? (
                                              <div className="sm:col-span-1 justify-self-end">
                                                <Button
                                                  type="button"
                                                  variant="destructive"
                                                  size="icon"
                                                  className="h-7 w-7 p-0"
                                                  onClick={() => removeOption(q.id!, o.id!)}
                                                  aria-label="Remove option"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {q.question_type === 'qa' && (
                                    <div className="space-y-2">
                                      <Label>Keywords (comma-separated)</Label>
                                      <Input
                                        value={q.keywords || ''}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, keywords: e.target.value } : it))}
                                        placeholder="e.g. overfitting, generalization, variance"
                                      />
                                      <div className="text-xs text-muted-foreground">Used for auto-grading: more matches = more points.</div>
                                      <Label>Required keywords (comma-separated)</Label>
                                      <Input
                                        value={q.required_keywords || ''}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, required_keywords: e.target.value } : it))}
                                        placeholder="All must appear for credit"
                                      />
                                      <Label>Negative keywords (comma-separated)</Label>
                                      <Input
                                        value={q.negative_keywords || ''}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, negative_keywords: e.target.value } : it))}
                                        placeholder="Penalize if present"
                                      />
                                      <Label>Acceptable answers (comma-separated, exact match)</Label>
                                      <Input
                                        value={q.acceptable_answers || ''}
                                        onChange={(e) => setNewQuestions((qs) => qs.map((it) => it.id === q.id ? { ...it, acceptable_answers: e.target.value } : it))}
                                        placeholder="Exact acceptable answers"
                                      />
                                    </div>
                                  )}
                                </div>
                                <Button type="button" variant="destructive" size="sm" onClick={() => removeQuestion(q.id!)}>Remove</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={saveAssignment} disabled={isSaving || !assignForm.title.trim()}>
                      {isSaving ? 'Saving...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No assignments yet.</div>
          ) : (
            <ul className="space-y-3">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.assignment_type === 'mcq' ? 'MCQs' : 'Q&A'}
                      {user?.role !== 'teacher' && a.my_submission_status ? (
                        <span className="ml-2 inline-flex items-center gap-1">
                          {a.my_submission_status === 'graded' ? '• Graded' : '• Submitted'}
                          {typeof a.my_submission_grade === 'number' ? ` (${a.my_submission_grade}%)` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Passed/Failed badge for students when graded */}
                    {user?.role !== 'teacher' && a.my_submission_status === 'graded' ? (
                      <Badge variant="secondary">{a.passed ? 'Passed' : 'Failed'}</Badge>
                    ) : null}
                    <Button
                      size="sm"
                      variant={user?.role === 'teacher' ? 'outline' : 'default'}
                      onClick={() => navigate(`${basePath}/${courseId}/assignments/${a.id}`)}
                    >
                      {user?.role === 'teacher' ? 'Manage' : (a.my_submission_status ? 'Review' : 'View')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Dialog modal={false} open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
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
                <div className="space-y-2 relative z-50">
                  <Label htmlFor="edit-reading-editor">Reading text</Label>
                  <ProfessionalRichTextEditor
                    id="edit-reading-editor"
                    className="pointer-events-auto"
                    value={editForm.text}
                    onChange={(html) => setEditForm((f) => ({ ...f, text: html }))}
                    height={300}
                    placeholder="Edit your reading content..."
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


