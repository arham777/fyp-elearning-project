import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { coursesApi } from '@/api/courses';
import { Assignment, AssignmentQuestion, SubmissionAnswer, Submission } from '@/types';
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

  useEffect(() => {
    const load = async () => {
      try {
        const data = await coursesApi.getAssignment(courseId, aId);
        setAssignment(data);
        // Load my submissions (for Q&A answers visibility and history)
        const subs = await coursesApi.getAssignmentSubmissions(courseId, aId);
        setMySubmissions(subs);
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId) && !Number.isNaN(aId)) load();
  }, [courseId, aId]);

  const toggleOption = (qid: number, oid: number) => {
    setMcqSelections((prev) => {
      const cur = new Set(prev[qid] || []);
      if (cur.has(oid)) cur.delete(oid); else cur.add(oid);
      return { ...prev, [qid]: cur };
    });
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
      setReview(null);
      setFile(null);
      toast({ title: 'Submitted successfully' });
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
            <div>
              Passing: {assignment.passing_grade}%
              {typeof assignment.my_best_grade === 'number' && (
                <>
                  {' '}• Best: {assignment.my_best_grade}% ({assignment.passed ? 'Passed' : 'Failed'})
                </>
              )}
            </div>
            <div>
              Attempts: {assignment.attempts_used ?? 0}/{assignment.max_attempts}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{assignment.assignment_type === 'mcq' ? 'Quiz' : 'Questions'}</CardTitle>
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
                          type="checkbox"
                          checked={Boolean(mcqSelections[q.id!]?.has(opt.id!))}
                          onChange={() => toggleOption(q.id!, opt.id!)}
                          disabled={!inAttempt}
                        />
                        {opt.text}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
          {/* Explanations revealed after pass or attempts exhausted */}
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
          {/* For Q&A: show last submitted answers when not in attempt */}
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

      <div className="flex items-center justify-between">
        {assignment.assignment_type === 'mcq' && review && (
          <div className="text-sm text-muted-foreground">
            Correct {review.correct}/{review.total} — Wrong {review.wrong} ({review.percent}%)
          </div>
        )}
        <div className="flex gap-2">
          {!inAttempt ? (
            <Button
              onClick={() => {
                setInAttempt(true);
                setCompleted(false);
                setReview(null);
                setQaAnswers({});
                setMcqSelections({});
                setFile(null);
              }}
              disabled={!assignment.can_attempt}
            >
              {assignment.can_attempt ? `Start attempt (${assignment.attempts_used ?? 0}/${assignment.max_attempts})` : 'No attempts available'}
            </Button>
          ) : (
            <>
              {assignment.assignment_type === 'mcq' && !completed && (
                <Button onClick={complete} variant="secondary">Check answers</Button>
              )}
              <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit attempt'}</Button>
            </>
          )}
        </div>
      </div>

      {/* Teacher: submissions list and grading for Q&A */}
      {user?.role !== 'student' && mySubmissions && mySubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mySubmissions.map((s) => (
                <div key={s.id} className="border rounded p-3 space-y-2">
                  <div className="text-sm">
                    Attempt #{s.attempt_number ?? '-'} • Status: {s.status ?? '-'} • Grade: {typeof s.grade === 'number' ? `${s.grade}%` : '—'}
                  </div>
                  {Array.isArray(s.answers) && s.answers.length > 0 && (
                    <div className="space-y-2 text-sm">
                      {(assignment?.questions || []).filter(q => q.question_type === 'qa').map((q) => {
                        const a = s.answers?.find(x => x.question_id === q.id);
                        return (
                          <div key={q.id}>
                            <div className="text-muted-foreground">Q: {q.text}</div>
                            <div className="whitespace-pre-wrap">A: {a?.text_answer || '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {user?.role !== 'student' && assignment?.assignment_type === 'qa' && (
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <Label>Grade (%)</Label>
                        <Input
                          type="number"
                          value={grading?.id === s.id ? grading.grade : (typeof s.grade === 'number' ? String(s.grade) : '')}
                          onChange={(e) => setGrading({ id: s.id!, grade: e.target.value, feedback: grading?.id === s.id ? (grading.feedback || '') : '' })}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Label>Feedback</Label>
                        <Input
                          value={grading?.id === s.id ? grading.feedback : (s.feedback || '')}
                          onChange={(e) => setGrading({ id: s.id!, grade: grading?.id === s.id ? grading.grade : (typeof s.grade === 'number' ? String(s.grade) : ''), feedback: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button onClick={() => gradeSubmission(s)}>Save</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssignmentDetail;
