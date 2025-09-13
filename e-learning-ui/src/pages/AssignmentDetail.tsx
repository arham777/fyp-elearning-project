import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { coursesApi } from '@/api/courses';
import { Check, X } from 'lucide-react';
import { Assignment, AssignmentQuestion, SubmissionAnswer, Submission, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const AssignmentDetail: React.FC = () => {
  const { id, assignmentId } = useParams();
  const courseId = Number(id);
  const aId = Number(assignmentId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = useMemo(() => (location.pathname.startsWith('/app/my-courses') ? '/app/my-courses' : '/app/courses'), [location.pathname]);

  const [assignment, setAssignment] = useState<(Assignment & { questions?: AssignmentQuestion[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qaAnswers, setQaAnswers] = useState<Record<number, string>>({});
  const [mcqSelections, setMcqSelections] = useState<Record<number, Set<number>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [completed, setCompleted] = useState(false);
  const [review, setReview] = useState<{ correct: number; wrong: number; total: number; percent: number } | null>(null);
  const [inAttempt, setInAttempt] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Submission[] | null>(null);
  const [grading, setGrading] = useState<{ id: number; grade: string; feedback: string } | null>(null);
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const [lastOutcome, setLastOutcome] = useState<null | 'passed' | 'failed'>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await coursesApi.getAssignment(courseId, aId);
        setAssignment(data);
        // Load my submissions (for Q&A answers visibility and history)
        const subs = await coursesApi.getAssignmentSubmissions(courseId, aId);
        setMySubmissions(subs);

        // If previously attempted an MCQ, prefill selections and show review
        if (data?.assignment_type === 'mcq' && Array.isArray(subs) && subs.length > 0) {
          // pick the latest by attempt_number or submitted_at
          const latest = [...subs].sort((a, b) => {
            const an = (a.attempt_number ?? 0) - (b.attempt_number ?? 0);
            if (an !== 0) return an;
            const ad = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
            const bd = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
            return ad - bd;
          }).slice(-1)[0];
          // Normalize answers (API may return JSON string)
          let latestAnswers: SubmissionAnswer[] = [];
          const raw = (latest as any)?.answers;
          if (Array.isArray(raw)) {
            latestAnswers = raw as SubmissionAnswer[];
          } else if (typeof raw === 'string') {
            try { latestAnswers = JSON.parse(raw) as SubmissionAnswer[]; } catch { latestAnswers = []; }
          }

          const sel: Record<number, Set<number>> = {};
          for (const ans of latestAnswers) {
            if (ans.question_id && Array.isArray(ans.selected_option_ids)) {
              sel[ans.question_id] = new Set(ans.selected_option_ids);
            }
          }
          if (Object.keys(sel).length > 0) {
            setMcqSelections(sel);
            // compute review from these selections
            const qs = (data.questions || []).filter((q) => q.question_type === 'mcq');
            let correct = 0;
            for (const q of qs) {
              const selected = sel[q.id!] || new Set<number>();
              const correctIds = new Set((q.options || []).filter((o) => o.is_correct).map((o) => o.id!));
              if (selected.size === correctIds.size && Array.from(selected).every((id) => correctIds.has(id))) {
                correct += 1;
              }
            }
            const total = qs.length;
            const wrong = Math.max(0, total - correct);
            const percent = total ? Math.round((correct / total) * 100) : 0;
            setReview({ correct, wrong, total, percent });
            setCompleted(true); // mark as reviewed to keep UI consistent
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId) && !Number.isNaN(aId)) load();
  }, [courseId, aId, user?.id]);

  const toggleOption = (qid: number, oid: number) => {
    setMcqSelections((prev) => ({ ...prev, [qid]: new Set([oid]) }));
  };

  const computeMcqReview = React.useCallback((): { correct: number; wrong: number; total: number; percent: number } => {
    const qs = (assignment?.questions || []).filter((q) => q.question_type === 'mcq');
    let correct = 0;
    for (const q of qs) {
      const selected = mcqSelections[q.id!] || new Set<number>();
      const correctIds = new Set((q.options || []).filter((o) => o.is_correct).map((o) => o.id!));
      if (selected.size === correctIds.size && Array.from(selected).every((id) => correctIds.has(id))) {
        correct += 1;
      }
    }
    const total = qs.length;
    const wrong = Math.max(0, total - correct);
    const percent = total ? Math.round((correct / total) * 100) : 0;
    return { correct, wrong, total, percent };
  }, [assignment, mcqSelections]);

  const complete = () => {
    if (!assignment || assignment.assignment_type !== 'mcq') return;
    setReview(computeMcqReview());
    setCompleted(true);
  };

  React.useEffect(() => {
    if (completed && assignment?.assignment_type === 'mcq') {
      setReview(computeMcqReview());
    }
  }, [completed, assignment, computeMcqReview]);

  const submit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    try {
      let answers: SubmissionAnswer[] | undefined;
      if (assignment.assignment_type === 'mcq') {
        answers = (assignment.questions || [])
          .filter((q) => q.question_type === 'mcq')
          .map((q) => ({ question_id: q.id!, selected_option_ids: Array.from(mcqSelections[q.id!] || []) }));
      } else {
        answers = (assignment.questions || [])
          .filter((q) => q.question_type === 'qa')
          .map((q) => ({ question_id: q.id!, text_answer: qaAnswers[q.id!] || '' }));
      }
      await coursesApi.createAssignmentSubmission(courseId, assignment.id, {
        content: assignment.assignment_type === 'qa' ? 'qa submission' : 'mcq submission',
        answers,
        file: assignment.assignment_type === 'qa' ? undefined : file,
      });
      // Refresh assignment and submissions to update attempts and answers
      const [updated, subs] = await Promise.all([
        coursesApi.getAssignment(courseId, assignment.id),
        coursesApi.getAssignmentSubmissions(courseId, assignment.id),
      ]);
      setAssignment(updated);
      setMySubmissions(subs);
      setInAttempt(false);
      setCompleted(false);
      // keep review for MCQ failures so student can see mistakes
      // we'll clear it only when passed or for non-MCQ
      setFile(null);
      // Decide outcome for MCQ based on local review vs passing grade; fallback to server flags
      if (assignment.assignment_type === 'mcq') {
        const passedNow = (() => {
          if (review && typeof assignment.passing_grade === 'number') {
            return review.percent >= (assignment.passing_grade || 0);
          }
          return Boolean(updated.passed);
        })();
        if (passedNow) {
          setLastOutcome('passed');
          toast({ title: 'Passed', description: 'Great job! You passed this assignment.' });
          setReview(null);
          navigate(-1);
        } else {
          setLastOutcome('failed');
          const attemptsLeft = updated.can_attempt;
          toast({ title: attemptsLeft ? 'Failed' : 'No attempts left', description: attemptsLeft ? 'You can try again.' : 'You have no attempts available.' });
        }
      } else {
        // Non-MCQ: just confirm submission
        setLastOutcome(null);
        toast({ title: 'Submitted successfully' });
        setReview(null);
      }
    } catch (e: unknown) {
      const respData = (e as { response?: { data?: unknown } })?.response?.data;
      toast({ title: 'Error', description: typeof respData === 'string' ? respData : 'Failed to submit' });
    } finally {
      setSubmitting(false);
    }
  };

  const gradeSubmission = async (sub: Submission) => {
    if (!assignment || !sub.id) return;
    const numeric = Number(grading?.grade ?? '');
    if (Number.isNaN(numeric)) {
      toast({ title: 'Enter a valid grade' });
      return;
    }
    try {
      await coursesApi.gradeSubmission(courseId, assignment.id, sub.id, numeric, grading?.feedback || undefined);
      const [updated, subs] = await Promise.all([
        coursesApi.getAssignment(courseId, assignment.id),
        coursesApi.getAssignmentSubmissions(courseId, assignment.id),
      ]);
      setAssignment(updated);
      setMySubmissions(subs);
      setGrading(null);
      toast({ title: 'Graded' });
    } catch (e: unknown) {
      const respData = (e as { response?: { data?: unknown } })?.response?.data;
      toast({ title: 'Error', description: typeof respData === 'string' ? respData : 'Failed to grade' });
    }
  };

  // Aggregate progress per student for teacher/admin
  const teacherProgress = useMemo(() => {
    if (!isTeacherOrAdmin || !Array.isArray(mySubmissions)) return [] as {
      studentName: string;
      attempts: number;
      bestGrade: number | null;
      lastStatus: string | null;
      lastDate?: string;
    }[];
    const byId = new Map<number, { studentName: string; attempts: number; bestGrade: number | null; lastStatus: string | null; lastDate?: string }>();
    for (const s of mySubmissions) {
      const sUser = s.student as User | undefined;
      const sid = sUser?.id ?? 0;
      const display = [sUser?.first_name, sUser?.last_name]
        .filter((v): v is string => Boolean(v))
        .join(' ')
        || sUser?.username
        || sUser?.email
        || `Student #${sid}`;
      const prev = byId.get(sid) || { studentName: display, attempts: 0, bestGrade: null, lastStatus: null, lastDate: undefined };
      prev.attempts += 1;
      const grade = typeof s.grade === 'number' ? s.grade : null;
      if (grade !== null && (prev.bestGrade === null || grade > prev.bestGrade)) prev.bestGrade = grade;
      const dateStr = s.submission_date || s.submitted_at;
      if (dateStr) {
        if (!prev.lastDate || new Date(dateStr) > new Date(prev.lastDate)) {
          prev.lastDate = dateStr;
          prev.lastStatus = s.status ?? prev.lastStatus;
        }
      }
      byId.set(sid, prev);
    }
    return Array.from(byId.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [isTeacherOrAdmin, mySubmissions]);

  if (isLoading) return <div className="h-40 bg-muted rounded" />;
  if (!assignment) return <div className="text-muted-foreground">Assignment not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{assignment.title}</h1>
          <div className="text-sm text-muted-foreground">{assignment.assignment_type.toUpperCase()}</div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>

      {/* Sticky top action bar for students to start attempt (hidden after a failed submission to keep a single action spot) */}
      {!isTeacherOrAdmin && !inAttempt && !lastOutcome && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-md p-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Attempts: {assignment.attempts_used ?? 0}/{assignment.max_attempts}
            {' '}• Passing: {assignment.passing_grade}%
            {typeof assignment.my_best_grade === 'number' && (
              <>
                {' '}• Best: {assignment.my_best_grade}% ({assignment.passed ? 'Passed' : 'Failed'})
              </>
            )}
          </div>
          <Button
            onClick={() => {
              setInAttempt(true);
              setCompleted(false);
              setReview(null);
              setQaAnswers({});
              setMcqSelections({});
              setFile(null);
              setLastOutcome(null);
            }}
            disabled={!assignment.can_attempt}
          >
            {assignment.can_attempt ? `Start attempt (${assignment.attempts_used ?? 0}/${assignment.max_attempts})` : 'No attempts available'}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm whitespace-pre-wrap">{assignment.description || '—'}</div>
        </CardContent>
      </Card>

      {/* Status panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div>
              Passing: {assignment.passing_grade}%
              {typeof assignment.my_best_grade === 'number' && (
                <>
                  {' '}• Best: {assignment.my_best_grade}% ({assignment.passed ? 'Passed' : 'Failed'})
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isTeacherOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{assignment.assignment_type === 'mcq' ? 'Quiz (read-only)' : 'Questions (read-only)'}</CardTitle>
          </CardHeader>
          <CardContent>
            {assignment.assignment_type === 'mcq' ? (
              <div className="space-y-6">
                {(assignment.questions || []).filter((q) => q.question_type === 'mcq').map((q, idx) => (
                  <div key={q.id} className="space-y-2">
                    <div className="font-medium">{idx + 1}. {q.text}</div>
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`tq-${q.id}`}
                            checked={Boolean(opt.is_correct)}
                            readOnly
                            disabled
                          />
                          {opt.text}
                        </label>
                      ))}
                    </div>
                    {q.explanation ? (
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium">Explanation</div>
                        <div className="whitespace-pre-wrap">{q.explanation}</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {(assignment.questions || []).filter((q) => q.question_type === 'qa').map((q, idx) => (
                  <div key={q.id} className="space-y-2">
                    <div className="font-medium">{idx + 1}. {q.text}</div>
                    <Textarea rows={4} value="" placeholder="Students will answer this question." disabled />
                    {q.explanation ? (
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium">Explanation</div>
                        <div className="whitespace-pre-wrap">{q.explanation}</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isTeacherOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{assignment.assignment_type === 'mcq' ? 'Quiz' : 'Questions'}</CardTitle>
          </CardHeader>
          <CardContent>
            {assignment.assignment_type === 'mcq' ? (
              <div className="space-y-6">
                {(assignment.questions || [])
                  .filter((q) => q.question_type === 'mcq')
                  .map((q, idx) => {
                    const selected = mcqSelections[q.id!] || new Set<number>();
                    const showReview = Boolean((inAttempt && completed) || (!inAttempt && review));
                    return (
                      <div key={q.id} className="space-y-2">
                        <div className="font-medium">{idx + 1}. {q.text}</div>
                        <div className="space-y-2">
                          {(q.options || []).map((opt) => {
                            const isSelected = selected.has(opt.id!);
                            const isCorrect = Boolean(opt.is_correct);
                            // Status only shown when reviewing
                            const status: 'correct' | 'wrong' | 'neutral' = showReview
                              ? (isCorrect ? 'correct' : (isSelected ? 'wrong' : 'neutral'))
                              : 'neutral';
                            const wrapperCls =
                              status === 'correct'
                                ? 'border-green-600/40 bg-green-500/10 text-green-600'
                                : status === 'wrong'
                                  ? 'border-red-600/40 bg-red-500/10 text-red-600'
                                  : 'border-border';
                            return (
                              <label key={opt.id} className={`flex items-center gap-2 text-sm rounded-md border p-2 ${wrapperCls}`}>
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={isSelected}
                                  onChange={() => toggleOption(q.id!, opt.id!)}
                                  disabled={!inAttempt || (showReview && completed)}
                                />
                                <span className="flex-1">{opt.text}</span>
                                {showReview && status === 'correct' && <Check className="h-4 w-4" />}
                                {showReview && status === 'wrong' && <X className="h-4 w-4" />}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="space-y-6">
                {(assignment.questions || []).filter((q) => q.question_type === 'qa').map((q, idx) => (
                  <div key={q.id} className="space-y-2">
                    <div className="font-medium">{idx + 1}. {q.text}</div>
                    <Textarea rows={5} value={qaAnswers[q.id!] || ''} onChange={(e) => setQaAnswers((m) => ({ ...m, [q.id!]: e.target.value }))} disabled={!inAttempt} />
                  </div>
                ))}
              </div>
            )}
            {!inAttempt && (assignment.passed || !assignment.can_attempt) && (
              <div className="mt-6 space-y-4">
                {(assignment.questions || []).map((q) => (
                  q.explanation ? (
                    <div key={q.id} className="text-sm">
                      <div className="font-medium">Explanation</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">{q.explanation}</div>
                    </div>
                  ) : null
                ))}
              </div>
            )}
            {!inAttempt && assignment.assignment_type === 'qa' && mySubmissions && mySubmissions.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="font-medium text-sm">Your last answers</div>
                {(() => {
                  const last = [...mySubmissions].sort((a, b) => (a.attempt_number ?? 0) - (b.attempt_number ?? 0)).slice(-1)[0];
                  const ans = last?.answers ?? [];
                  return (assignment.questions || []).filter(q => q.question_type === 'qa').map((q) => {
                    const a = ans.find(x => x.question_id === q.id);
                    return (
                      <div key={q.id} className="text-sm">
                        <div className="text-muted-foreground">Q: {q.text}</div>
                        <div className="whitespace-pre-wrap">A: {a?.text_answer || '—'}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isTeacherOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students progress</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherProgress.length === 0 ? (
              <div className="text-sm text-muted-foreground">No student attempts yet.</div>
            ) : (
              <div className="text-sm space-y-2">
                <div className="hidden sm:grid sm:grid-cols-6 font-medium">
                  <div className="sm:col-span-2">Student</div>
                  <div>Attempts</div>
                  <div>Best grade</div>
                  <div>Status</div>
                  <div>Last attempt</div>
                </div>
                {teacherProgress.map((p, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2 border rounded p-2 sm:p-2">
                    <div className="sm:col-span-2">{p.studentName}</div>
                    <div>{p.attempts}/{assignment.max_attempts}</div>
                    <div>{typeof p.bestGrade === 'number' ? `${p.bestGrade}%` : '—'}</div>
                    <div>{typeof p.bestGrade === 'number' ? (p.bestGrade >= (assignment.passing_grade ?? 0) ? 'Passed' : 'Failed') : (p.lastStatus ?? '—')}</div>
                    <div>{p.lastDate ? new Date(p.lastDate).toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isTeacherOrAdmin && (
        <div className="flex items-center justify-between">
          {assignment.assignment_type === 'mcq' && review && (
            <div className="text-sm text-muted-foreground">
              Correct {review.correct}/{review.total} — Wrong {review.wrong} ({review.percent}%)
            </div>
          )}
          <div className="flex gap-2">
            {/* Single right-aligned action area */}
            {inAttempt ? (
              <Button
                onClick={() => {
                  if (assignment.assignment_type === 'mcq' && !completed) {
                    // First click: show review
                    setReview(computeMcqReview());
                    setCompleted(true);
                  } else {
                    // Second click: submit
                    submit();
                  }
                }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : (assignment.assignment_type === 'mcq' && !completed ? 'Submit' : 'Submit attempt')}
              </Button>
            ) : (
              // After a failed submission, keep one action here to retake or show no-attempts
              lastOutcome === 'failed' ? (
                <Button
                  onClick={() => {
                    if (!assignment.can_attempt) return;
                    setInAttempt(true);
                    setCompleted(false);
                    setReview(null);
                    setQaAnswers({});
                    setMcqSelections({});
                    setFile(null);
                    setLastOutcome(null);
                  }}
                  disabled={!assignment.can_attempt}
                  variant={assignment.can_attempt ? 'default' : 'secondary'}
                  title={!assignment.can_attempt ? 'No attempts available' : undefined}
                >
                  {assignment.can_attempt ? 'Retake attempt' : 'No attempts available'}
                </Button>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Teacher submissions panel removed per product decision */}
    </div>
  );
};

export default AssignmentDetail;
