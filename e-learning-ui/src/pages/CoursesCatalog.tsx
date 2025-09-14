import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { coursesApi } from '@/api/courses';
import { Course, Enrollment, Certificate } from '@/types';
import { Search, ChevronsRight, Loader2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CourseCard from '@/components/courses/CourseCard';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CreateCourseForm from '@/components/courses/CreateCourseForm';

const CoursesCatalog: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState(''); // actual query used for requests/filtering
  const [pendingQuery, setPendingQuery] = useState(''); // text in the input
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize query from URL (?q=)
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    if (q) {
      setPendingQuery(q);
      setSearchQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce typing -> apply to searchQuery
  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(pendingQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [pendingQuery]);

  // Keep URL in sync with the active search query
  useEffect(() => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      if (searchQuery) sp.set('q', searchQuery);
      else sp.delete('q');
      return sp;
    }, { replace: true });
  }, [searchQuery, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      try {
        setIsSearching(true);
        const [list, enrollments, certs] = await Promise.all([
          coursesApi.getCourses({ search: searchQuery }, { signal: controller.signal }),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
          coursesApi.getMyCertificates().catch(() => [] as Certificate[]),
        ]);
        setCourses(list);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((id): id is number => typeof id === 'number')
        );
        setEnrolledCourseIds(ids);
        const completed = new Set<number>(
          (certs as Certificate[])
            .map((c) => c.course?.id)
            .filter((id): id is number => typeof id === 'number')
        );
        setCompletedCourseIds(completed);
      } catch (error: any) {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch courses:', error);
        }
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    };

    fetchCourses();
    return () => controller.abort();
  }, [searchQuery]);

  // Modal opens only via the button on this page

  const visibleCourses = useMemo(() => {
    // Client-side fuzzy filter for better matching on title/description/instructor
    const tokens = (searchQuery || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const scoreCourse = (c: Course): number => {
      if (tokens.length === 0) return 1; // no filter → keep
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const teacherFirst = (typeof c.teacher === 'object' ? (c.teacher?.first_name || '') : '').toLowerCase();
      const teacherLast = (typeof c.teacher === 'object' ? (c.teacher?.last_name || '') : '').toLowerCase();
      const teacherUser = (typeof c.teacher === 'object' ? (c.teacher?.username || '') : '').toLowerCase();
      const haystack = `${title} ${desc} ${teacherFirst} ${teacherLast} ${teacherUser}`;
      // All tokens must appear somewhere (broad contains)
      const allPresent = tokens.every((t) => haystack.includes(t));
      if (!allPresent) return 0;
      // Relevance score: title matches weigh more than description
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 3;
        if (teacherFirst.includes(t) || teacherLast.includes(t) || teacherUser.includes(t)) score += 2;
        if (desc.includes(t)) score += 1;
      }
      return score;
    };

    const withScores = courses
      .map((c) => ({ c, s: scoreCourse(c) }))
      .filter((x) => x.s > 0) // keep only matches (or all when tokens empty via score=1)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);

    // Students should only see courses they are NOT enrolled in
    if (user?.role === 'student') {
      return withScores.filter((c) => !enrolledCourseIds.has(c.id));
    }
    return withScores;
  }, [user?.role, courses, enrolledCourseIds, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse available courses</p>
        </div>
        {user?.role === 'teacher' && (
          <Button onClick={() => setIsCreateOpen(true)}>Create Course</Button>
        )}
      </div>

      <div className="relative max-w-xl w-full" role="search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          placeholder="Search courses..."
          value={pendingQuery}
          onChange={(e) => setPendingQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(pendingQuery.trim()); }}
          className="pl-10 pr-24 h-10 rounded-full"
          aria-label="Search courses"
          aria-busy={isSearching}
        />
        {pendingQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 absolute right-12 top-1/2 -translate-y-1/2 rounded-full"
            onClick={() => { setPendingQuery(''); setSearchQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="link"
          className="h-10 absolute right-3 top-1/2 -translate-y-1/2 p-0 rounded-none"
          onClick={() => setSearchQuery(pendingQuery.trim())}
          aria-label="Search"
          disabled={isSearching}
        >
          {isSearching ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ChevronsRight className="h-8 w-8" strokeWidth={3} />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            to={`/app/courses/${course.id}`}
            isEnrolled={enrolledCourseIds.has(course.id)}
            isCompleted={completedCourseIds.has(course.id)}
            context="catalog"
          />
        ))}
      </div>

      {visibleCourses.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{searchQuery ? `No results for “${searchQuery}”` : 'No courses available'}</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different keyword or check your spelling.' : 'You may already be enrolled in all visible courses.'}
          </p>
        </div>
      )}

      {/* Create Course Dialog for Teachers */}
      {user?.role === 'teacher' && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Course</DialogTitle>
              <DialogDescription>
                Provide basic details for your new course.
              </DialogDescription>
            </DialogHeader>
            <CreateCourseForm
              onCancel={() => setIsCreateOpen(false)}
              onCreated={(course) => {
                setIsCreateOpen(false);
                navigate(`/app/courses/${course.id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CoursesCatalog;