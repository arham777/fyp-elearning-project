import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useCourseNavigation } from '@/hooks/useCourseNavigation';
import { coursesApi } from '@/api/courses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Course, CourseModule, Enrollment, Certificate } from '@/types';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/back-button';
import { updateEnrollmentCache } from '@/utils/courseNavigation';
import PaymentModal from '@/components/payment/PaymentModal';
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
  const [moduleContents, setModuleContents] = useState<Record<number, any[]>>({});
  const [moduleAssignments, setModuleAssignments] = useState<Record<number, any[]>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const { navigateToCourse } = useCourseNavigation();
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
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
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [reviewText, setReviewText] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
        setMyRating((c as any)?.my_rating ?? null);
        setModules(mods as CourseModule[]);
        setMyEnrollments(enrollments as Enrollment[]);
        setMyCertificates(certs as Certificate[]);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((cid): cid is number => typeof cid === 'number')
        );
        setEnrolledCourseIds(ids);

        // For non-enrolled students, fetch module contents and assignments for preview
        const isEnrolledInCourse = ids.has(courseId);
        if (user?.role === 'student' && !isEnrolledInCourse && mods.length > 0) {
          const contentsMap: Record<number, any[]> = {};
          const assignmentsMap: Record<number, any[]> = {};
          
          await Promise.all(
            (mods as CourseModule[]).map(async (module) => {
              try {
                const [contents, assignments] = await Promise.all([
                  coursesApi.getModuleContents(courseId, module.id).catch(() => []),
                  coursesApi.getCourseAssignments(courseId, { module: module.id }).catch(() => [])
                ]);
                contentsMap[module.id] = contents;
                assignmentsMap[module.id] = assignments;
              } catch (error) {
                // If we can't fetch contents/assignments, set empty arrays
                contentsMap[module.id] = [];
                assignmentsMap[module.id] = [];
              }
            })
          );
          
          setModuleContents(contentsMap);
          setModuleAssignments(assignmentsMap);
        }
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
  const canRate = useMemo(() => {
    return (user?.role === 'student') && isEnrolled && (hasCertificate || (progressPercent >= 100));
  }, [user?.role, isEnrolled, hasCertificate, progressPercent]);

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
    // Open payment modal instead of direct enrollment
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    // Refresh enrollments after successful payment
    try {
      const enrollments = await coursesApi.getMyEnrollments();
      setMyEnrollments(enrollments as Enrollment[]);
      const ids = new Set<number>(
        (enrollments as Enrollment[])
          .map((e) => e.course?.id)
          .filter((cid): cid is number => typeof cid === 'number')
      );
      setEnrolledCourseIds(ids);
      // Navigate to my-courses route after successful enrollment
      await navigateToCourse(courseId);
    } catch (error) {
      console.error('Failed to refresh enrollments:', error);
    }
  };

  const handlePublish = async () => {
    if (!course) return;
    try {
      setIsPublishing(true);
      const updated = await coursesApi.publishCourse(courseId);
      setCourse(updated);
      const statusText = (updated as any)?.status || (updated.is_published ? 'published' : 'draft');
      if (statusText === 'pending') {
        toast({ title: 'Submitted for approval', description: 'Your course has been sent to the admin for review. You will be notified once a decision is made.' });
      } else if (statusText === 'published') {
        toast({ title: 'Course published', description: 'Your course is now visible to students.' });
      } else {
        toast({ title: 'Updated', description: 'Course status updated.' });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to publish course';
      toast({ title: 'Error', description: String(detail), variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!course) return;
    try {
      setIsUnpublishing(true);
      const updated = await coursesApi.unpublishCourse(courseId);
      setCourse(updated);
      toast({ title: 'Course unpublished', description: 'The course is now hidden from students.' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to unpublish course';
      toast({ title: 'Error', description: String(detail), variant: 'destructive' });
    } finally {
      setIsUnpublishing(false);
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
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{course.description}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {isTeacher && (
              course.is_published ? (
                <Badge>Published</Badge>
              ) : (course as any).status === 'pending' ? (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending approval</Badge>
              ) : (course as any).status === 'rejected' ? (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
              ) : (
                <Badge variant="destructive">Draft</Badge>
              )
            )}
            <Badge variant="secondary">
              {isTeacher ? `${course.enrollment_count ?? 0} enrolled` : formatPKR(course.price)}
            </Badge>
            {user?.role === 'student' && hasCertificate && (
              <Badge>Completed</Badge>
            )}
            {(typeof (course as any).average_rating === 'number') && (
              <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const starVal = idx + 1;
                  const activeFill = canRate
                    ? ((hoverRating || myRating || 0) >= starVal)
                    : ((((course as any).average_rating ?? 0) >= starVal));
                  if (!canRate) {
                    return (
                      <Star key={idx} className={`w-3.5 h-3.5 ${activeFill ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="p-0.5"
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={async () => {
                        try {
                          setIsSubmittingRating(true);
                          await coursesApi.rateCourse(courseId, starVal);
                          setMyRating(starVal);
                          const updated = await coursesApi.getCourse(courseId);
                          setCourse(updated);
                        } finally {
                          setIsSubmittingRating(false);
                        }
                      }}
                      disabled={isSubmittingRating}
                      aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
                    >
                      <Star className={`w-4 h-4 ${activeFill ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                    </button>
                  );
                })}
                <span className="ml-1">{Number(((course as any).average_rating ?? 0) as number).toFixed(1)}</span>
                <span>({(course as any).ratings_count ?? 0})</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {isTeacher && (
              course.is_published ? (
                <AlertDialog>
                  <AlertTrigger asChild>
                    <Button variant="outline" className="h-9" disabled={isUnpublishing}>
                      {isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
                    </Button>
                  </AlertTrigger>
                  <AlertContent>
                    <AlertHeader>
                      <AlertTitle>Unpublish this course?</AlertTitle>
                      <AlertDescription>
                        This will hide the course from students and block new enrollments. Existing enrolled
                        students may still access content. You can publish it again later.
                      </AlertDescription>
                    </AlertHeader>
                    <AlertFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnpublish} disabled={isUnpublishing}>
                        {isUnpublishing ? 'Unpublishing…' : 'Confirm Unpublish'}
                      </AlertDialogAction>
                    </AlertFooter>
                  </AlertContent>
                </AlertDialog>
              ) : (course as any).status === 'pending' ? (
                <Button className="h-9" disabled>
                  Pending approval
                </Button>
              ) : (
                <AlertDialog>
                  <AlertTrigger asChild>
                    <Button className="h-9" disabled={isPublishing}>
                      {isPublishing ? 'Submitting…' : ((course as any).status === 'rejected' ? 'Resubmit for approval' : 'Submit for approval')}
                    </Button>
                  </AlertTrigger>
                  <AlertContent>
                    <AlertHeader>
                      <AlertTitle>Submit for admin approval?</AlertTitle>
                      <AlertDescription>
                        Once approved by admin, your course will be published and visible to students. Make sure
                        you have at least one module and some content or assignment added.
                      </AlertDescription>
                    </AlertHeader>
                    <AlertFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
                        {isPublishing ? 'Submitting…' : 'Confirm Submit'}
                      </AlertDialogAction>
                    </AlertFooter>
                  </AlertContent>
                </AlertDialog>
              )
            )}
            {!isTeacher && (
              isEnrolled ? (
                <Button className="h-9" asChild>
                  <Link to="#">{hasCertificate ? 'Review' : 'Continue'}</Link>
                </Button>
              ) : (
                <Button className="h-9" onClick={handleEnroll}>
                  Enroll now
                </Button>
              )
            )}
            <BackButton to={basePath} />
          </div>
        </div>
      </div>

      {isTeacher && (course as any).status === 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">Rejected by Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {course.approval_note ? (
                <>
                  <span className="font-medium text-foreground">Reason:</span> {course.approval_note}
                </>
              ) : (
                'Your course was rejected. Please make the necessary changes and resubmit for approval.'
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {user?.role === 'student' && hasCertificate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate and review this course</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, idx) => {
                const starVal = idx + 1;
                const active = (hoverRating || myRating || 0) >= starVal;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="p-0.5"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={async () => {
                      try {
                        setIsSubmittingRating(true);
                        await coursesApi.rateCourse(courseId, starVal, reviewText);
                        setMyRating(starVal);
                        // refresh course header numbers
                        const updated = await coursesApi.getCourse(courseId);
                        setCourse(updated);
                      } finally {
                        setIsSubmittingRating(false);
                      }
                    }}
                    disabled={isSubmittingRating}
                    aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
                  >
                    <Star className={`w-6 h-6 ${active ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                  </button>
                );
              })}
              {typeof myRating === 'number' && (
                <span className="text-sm text-muted-foreground ml-1">Your rating: {myRating}/5</span>
              )}
            </div>
            <div className="mt-3">
              <Label htmlFor="review-text" className="sr-only">Review</Label>
              <Textarea
                id="review-text"
                placeholder="Share your feedback (optional, one review per course)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Your review can be edited later by re-submitting.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Modules</CardTitle>
            {isTeacher && !course.is_published && (
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
            <ol className="space-y-4 list-decimal pl-6">
              {modules.map((m) => (
                <li key={m.id} className="text-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{m.title}</div>
                      {m.description && (
                        <div className="text-sm text-muted-foreground mb-2">{m.description}</div>
                      )}
                      
                      {/* Show content preview for non-enrolled students */}
                      {user?.role === 'student' && !isEnrolled && (moduleContents[m.id] || moduleAssignments[m.id]) && (
                        <div className="ml-4 mt-2 space-y-1">
                          {/* Contents */}
                          {moduleContents[m.id]?.map((content: any) => (
                            <div key={`content-${content.id}`} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full flex-shrink-0"></span>
                              <span>{content.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {content.content_type === 'video' ? 'Video' : 'Reading'}
                              </Badge>
                            </div>
                          ))}
                          
                          {/* Assignments */}
                          {moduleAssignments[m.id]?.map((assignment: any) => (
                            <div key={`assignment-${assignment.id}`} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full flex-shrink-0"></span>
                              <span>{assignment.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {assignment.assignment_type === 'mcq' ? 'Quiz' : 'Assignment'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* For non-enrolled students, show preview message instead of Open button */}
                      {user?.role === 'student' && !isEnrolled ? (
                        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          Enroll to access
                        </div>
                      ) : (
                        <Button size="sm" asChild>
                          <Link to={`${basePath}/${courseId}/modules/${m.id}`}>Open</Link>
                        </Button>
                      )}
                      {isTeacher && !course.is_published && (
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

      {isTeacher && !course.is_published && (
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

      {/* Payment Modal */}
      {course && !isTeacher && !isEnrolled && (
        <PaymentModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          course={course}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default CourseDetail;


