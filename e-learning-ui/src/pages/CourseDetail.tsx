import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Course, CourseModule, Enrollment, Certificate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/back-button';
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

const formatPKR = (value: number | string): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newModule, setNewModule] = useState<{ title: string; description: string }>({
    title: '',
    description: '',
  });
  const [insertAfter, setInsertAfter] = useState<string>('end');

  // Edit Module state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editing, setEditing] = useState<CourseModule | null>(null);
  const [editModule, setEditModule] = useState<{ title: string; description: string; order: number }>({
    title: '',
    description: '',
    order: 1,
  });
  const [editInsertAfter, setEditInsertAfter] = useState<string>('__unchanged__');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, mods, enrollments, certs] = await Promise.all([
          coursesApi.getCourse(courseId),
          coursesApi.getCourseModules(courseId).catch(() => []),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
          user?.role === 'student' ? coursesApi.getMyCertificates().catch(() => []) : Promise.resolve([]),
        ]);
        setCourse(c);
        setModules(mods as CourseModule[]);
        setMyEnrollments(enrollments as Enrollment[]);
        setMyCertificates(certs as Certificate[]);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((cid): cid is number => typeof cid === 'number')
        );
        setEnrolledCourseIds(ids);
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId)) fetchData();
  }, [courseId, user?.role]);

  const isEnrolled = useMemo(() => enrolledCourseIds.has(courseId), [enrolledCourseIds, courseId]);
  const hasCertificate = useMemo(
    () => (myCertificates || []).some((cert) => cert.course?.id === courseId),
    [myCertificates, courseId]
  );
  const basePath = useMemo(() => {
    // If current route is under /app/my-courses, keep that base for child links
    return location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses';
  }, [location.pathname]);
  const progressPercent = useMemo(() => {
    const enrollment = myEnrollments.find((e) => e.course?.id === courseId);
    return enrollment?.progress ?? 0;
  }, [myEnrollments, courseId]);

  const refreshModules = async () => {
    const mods = await coursesApi.getCourseModules(courseId).catch(() => [] as CourseModule[]);
    setModules(mods as CourseModule[]);
  };

  useEffect(() => {
    // Ensure we don't keep an invalid selection (like "after last module")
    if (insertAfter !== 'end') {
      const lastId = modules.length > 0 ? modules[modules.length - 1].id : null;
      if (lastId !== null && String(lastId) === insertAfter) {
        setInsertAfter('end');
      }
    }
  }, [modules, insertAfter]);

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      await coursesApi.enrollInCourse(courseId);
      const updated = new Set(enrolledCourseIds);
      updated.add(courseId);
      setEnrolledCourseIds(updated);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Edit helpers
  const openEdit = (mod: CourseModule) => {
    setEditing(mod);
    setEditModule({ title: mod.title, description: mod.description || '', order: mod.order });
    setEditInsertAfter('__unchanged__');
    setIsEditOpen(true);
  };

  const currentEditPositionText = useMemo(() => {
    if (!editing) return 'Current position';
    const sorted = modules.slice().sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((m) => m.id === editing.id);
    if (index === -1) return 'Current position';
    if (index === 0) return 'First';
    return `After: ${sorted[index - 1].title}`;
  }, [modules, editing]);

  const computeOrderAfter = (after: 'end' | number, currentId: number): number => {
    const others = modules
      .filter((m) => m.id !== currentId)
      .slice()
      .sort((a, b) => a.order - b.order);
    const maxOrder = others.length > 0 ? others[others.length - 1].order : 0;
    if (after === 'end') return maxOrder + 1;
    const prevIndex = others.findIndex((m) => m.id === after);
    if (prevIndex === -1) return maxOrder + 1;
    const prevOrder = others[prevIndex].order;
    const nextOrder = prevIndex < others.length - 1 ? others[prevIndex + 1].order : undefined;
    const existing = new Set(others.map((m) => m.order));
    let candidate = prevOrder + 1;
    while (existing.has(candidate)) candidate++;
    if (typeof nextOrder === 'number' && candidate >= nextOrder) {
      return maxOrder + 1;
    }
    return candidate;
  };

  const hasEditChanges = useMemo(() => {
    if (!editing) return false;
    const titleChanged = (editModule.title || '').trim() !== (editing.title || '').trim();
    const descChanged = (editModule.description || '').trim() !== (editing.description || '').trim();
    const positionChanged = editInsertAfter !== '__unchanged__';
    return titleChanged || descChanged || positionChanged;
  }, [editing, editModule, editInsertAfter]);

  const saveEdit = async () => {
    if (!editing) return;
    setIsUpdating(true);
    try {
      const payload: { title?: string; description?: string; order?: number } = {
        title: editModule.title?.trim(),
        description: editModule.description?.trim(),
      };
      if (editInsertAfter !== '__unchanged__') {
        const afterVal = editInsertAfter === 'end' ? 'end' : Number(editInsertAfter);
        payload.order = computeOrderAfter(afterVal, editing.id);
      }
      await coursesApi.updateCourseModule(courseId, editing.id, payload);
      await refreshModules();
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: 'Module updated' });
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
          || 'Failed to update module';
      toast({ title: 'Error', description: String(detail), variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteModule = async () => {
    if (!editing) return;
    setIsDeleting(true);
    try {
      await coursesApi.deleteCourseModule(courseId, editing.id);
      await refreshModules();
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: 'Module deleted' });
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: unknown } })?.response?.data;
      const detail = typeof respData === 'string' ? respData : 'Failed to delete module';
      toast({ title: 'Error', description: String(detail), variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><div className="h-8 bg-muted rounded w-64" /><div className="h-40 bg-muted rounded" /></div>;
  }

  if (!course) {
    return <div className="text-muted-foreground">Course not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{course.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <BackButton to={basePath} />
          <Badge variant="secondary">
            {isTeacher ? `${course.enrollment_count ?? 0} enrolled` : formatPKR(course.price)}
          </Badge>
          {user?.role === 'student' && hasCertificate && (
            <Badge>Completed</Badge>
          )}
          {!isTeacher && (
            isEnrolled ? (
              <Button className="h-9" asChild>
                <Link to="#">{hasCertificate ? 'Review' : 'Continue'}</Link>
              </Button>
            ) : (
              <Button className="h-9" onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? 'Enrolling...' : 'Enroll now'}
              </Button>
            )
          )}
        </div>
      </div>

      {!isTeacher && isEnrolled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={progressPercent} className="max-w-xs" />
              <span className="text-sm text-muted-foreground">{progressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Modules</CardTitle>
            {isTeacher && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Module</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Module</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mod-title">Title</Label>
                      <Input
                        id="mod-title"
                        value={newModule.title}
                        onChange={(e) => setNewModule((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Introduction"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mod-desc">Description</Label>
                      <Textarea
                        id="mod-desc"
                        value={newModule.description}
                        onChange={(e) => setNewModule((p) => ({ ...p, description: e.target.value }))}
                        rows={4}
                        placeholder="Optional summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mod-position">Position</Label>
                      <Select value={insertAfter} onValueChange={setInsertAfter}>
                        <SelectTrigger id="mod-position">
                          <SelectValue placeholder="At end" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end">At end</SelectItem>
                          {modules.slice(0, -1).map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {`After: ${m.title}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={async () => {
                        if (!newModule.title?.trim()) {
                          toast({ title: 'Title is required', variant: 'destructive' });
                          return;
                        }
                        try {
                          setIsCreating(true);
                          const payload: { title: string; description?: string; after_module_id?: number } = {
                            title: newModule.title.trim(),
                            description: newModule.description?.trim() || '',
                          };
                          if (insertAfter !== 'end') {
                            payload.after_module_id = Number(insertAfter);
                          }
                          await coursesApi.createCourseModule(courseId, payload);
                          toast({ title: 'Module added' });
                          setIsAddOpen(false);
                          setNewModule({ title: '', description: '' });
                          setInsertAfter('end');
                          await refreshModules();
                        } catch (err: unknown) {
                          const asRecord = (v: unknown): Record<string, unknown> | null =>
                            typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
                          const response = asRecord(asRecord(err)?.response);
                          const data = asRecord(response?.data);
                          const detail = typeof data?.detail === 'string'
                            ? data.detail
                            : Array.isArray((data?.order as unknown[])) && typeof (data?.order as unknown[])[0] === 'string'
                              ? (data?.order as unknown[])[0] as string
                              : 'Failed to add module';
                          toast({ title: 'Error', description: String(detail), variant: 'destructive' });
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Adding…' : 'Add Module'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-sm text-muted-foreground">No modules added yet.</div>
          ) : (
            <ol className="space-y-3 list-decimal pl-6">
              {modules.map((m) => (
                <li key={m.id} className="text-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{m.title}</div>
                      {m.description && (
                        <div className="text-sm text-muted-foreground">{m.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link to={`${basePath}/${courseId}/modules/${m.id}`}>Open</Link>
                      </Button>
                      {isTeacher && (
                        <Button size="sm" onClick={() => openEdit(m)}>Edit</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {isTeacher && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit module</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emod-title">Title</Label>
                <Input
                  id="emod-title"
                  value={editModule.title}
                  onChange={(e) => setEditModule((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emod-desc">Description</Label>
                <Textarea
                  id="emod-desc"
                  value={editModule.description}
                  onChange={(e) => setEditModule((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emod-position">Position</Label>
                <Select value={editInsertAfter === '__unchanged__' ? undefined : editInsertAfter} onValueChange={setEditInsertAfter}>
                  <SelectTrigger id="emod-position">
                    <SelectValue placeholder={currentEditPositionText} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end">At end</SelectItem>
                    {modules.filter((m) => m.id !== (editing?.id ?? -1)).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {`After: ${m.title}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <AlertTitle>Delete this module?</AlertTitle>
                      <AlertDescription>This action cannot be undone.</AlertDescription>
                    </AlertHeader>
                    <AlertFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteModule}
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
              <Button onClick={saveEdit} disabled={isUpdating || !editModule.title.trim() || !hasEditChanges}>
                {isUpdating ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              <span><span className="text-foreground font-medium">{course.enrollment_count ?? 0}</span> enrolled</span>
              <span>•</span>
              <span><span className="text-foreground font-medium">{modules.length}</span> modules</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseDetail;


