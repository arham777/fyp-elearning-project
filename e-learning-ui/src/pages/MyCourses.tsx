import React, { useEffect, useMemo, useState, useRef } from 'react';
import { coursesApi } from '@/api/courses';
import { Course, Enrollment, Certificate } from '@/types';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Star, ChevronRight, X, Loader2, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Format price in PKR
const formatPKR = (value: number | string): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get teacher initials
const getInitials = (first?: string, last?: string, username?: string): string => {
  const a = (first?.[0] ?? '').toUpperCase();
  const b = (last?.[0] ?? '').toUpperCase();
  const fallback = (username ?? 'U').slice(0, 1).toUpperCase();
  return (a + b) || fallback;
};

// MyCourseCard Component - Based on CatalogCard but with Progress
const MyCourseCard = ({
  course,
  index,
  progress,
  isCompleted,
  certificateId,
  onClick
}: {
  course: Course;
  index: number;
  progress?: number;
  isCompleted?: boolean;
  certificateId?: number;
  onClick: (courseId: number) => void;
}) => {
  const teacher = course.teacher;
  const teacherName = `${teacher?.first_name || teacher?.username || 'Instructor'}${teacher?.last_name ? ` ${teacher.last_name}` : ''}`;
  const avgRating = course.average_rating ?? 0;
  const navigate = useNavigate();

  // Calculate display progress
  const displayProgress = Math.round(progress ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20"
    >
      {/* Thumbnail */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden bg-muted">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-16 w-16 text-zinc-700" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <Badge className="bg-orange-500/90 text-white border-0 text-xs font-medium backdrop-blur-sm h-6 px-2">
            {course.category || 'General'}
          </Badge>
        </div>

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          {isCompleted ? (
            <Badge className="bg-green-500/90 text-white border-0 text-xs font-bold backdrop-blur-sm h-6 px-2">
              Completed
            </Badge>
          ) : (
            <Badge className="bg-blue-500/90 text-white border-0 text-xs font-bold backdrop-blur-sm h-6 px-2">
              In Progress
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-5">
        <h3 className="mb-2 text-lg font-semibold text-foreground line-clamp-1 h-7 group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        {/* Rating and Reviews */}
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className={cn("h-3.5 w-3.5", avgRating > 0 ? "fill-orange-400 text-orange-400" : "text-muted-foreground")} />
          <span className="text-muted-foreground">{avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}</span>
          {course.ratings_count && course.ratings_count > 0 && <span>({course.ratings_count})</span>}
        </div>

        <p className="mb-4 text-sm text-muted-foreground line-clamp-2 h-10">
          {course.description}
        </p>

        {/* Progress Section */}
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{displayProgress}%</span>
          </div>
          <Progress value={displayProgress} className="h-2" />
        </div>

        {/* Teacher Info */}
        <div className="mb-4 flex items-center gap-2 h-8">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-medium text-white">
            {getInitials(teacher?.first_name, teacher?.last_name, teacher?.username)}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{teacherName}</span>
            <span className="text-xs text-muted-foreground">Instructor</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 grid gap-2">
          {isCompleted && certificateId && (
            <Button
              variant="outline"
              className="w-full h-9 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/app/certificates/${certificateId}`);
              }}
            >
              View Certificate
            </Button>
          )}

          <Button
            onClick={() => onClick(course.id)}
            className="w-full h-10 bg-[#e5e5e5] hover:bg-[#e5e5e5]/90 text-zinc-900 font-medium transition-all duration-300 group-hover:shadow-lg group-hover:shadow-black/5"
          >
            {isCompleted ? 'Review Course' : 'Continue Learning'}
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-red-500/5" />
      </div>
    </motion.div>
  );
};

const MyCourses: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        // First, ask server to refresh completion/certificates based on latest progress
        await coursesApi.refreshMyCompletion().catch(() => ({ updated_to_completed: 0 }));
        const [list, certs] = await Promise.all([
          coursesApi.getMyEnrollments(),
          coursesApi.getMyCertificates().catch(() => [] as Certificate[]),
        ]);
        setEnrollments(Array.isArray(list) ? list : []);
        setCertificates(Array.isArray(certs) ? certs : []);
      } catch (error) {
        console.error('Failed to fetch enrollments', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(pendingQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [pendingQuery]);

  const courses: Course[] = useMemo(() => {
    return enrollments
      .map((e) => e.course)
      .filter((c): c is Course => Boolean(c));
  }, [enrollments]);

  const enrollmentByCourseId = useMemo(() => {
    const map: Record<number, Enrollment> = {};
    for (const e of enrollments) {
      if (e.course?.id) map[e.course.id] = e;
    }
    return map;
  }, [enrollments]);

  const completedCourseIds = useMemo(() => {
    return new Set<number>(
      certificates
        .map((c) => c.course?.id)
        .filter((id): id is number => typeof id === 'number')
    );
  }, [certificates]);

  // Smart synonym map for better matching
  const synonymMap: Record<string, string[]> = {
    'js': ['javascript', 'js'],
    'ts': ['typescript', 'ts'],
    'py': ['python', 'py'],
    'ml': ['machine', 'learning', 'ai'],
    'ai': ['artificial', 'intelligence', 'ml'],
    'web': ['development', 'frontend', 'backend', 'fullstack'],
    'dev': ['development', 'programmer', 'coding'],
    'fe': ['frontend', 'ui', 'ux'],
    'be': ['backend', 'api', 'database'],
    'app': ['mobile', 'application', 'android', 'ios'],
  };

  // Filtered courses based on search with scoring
  const visibleCourses = useMemo(() => {
    if (!searchQuery) return courses;

    const rawTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    // Expand tokens with synonyms
    const expandedTokens = rawTokens.flatMap(t => {
      const syns = synonymMap[t] || [];
      return [t, ...syns];
    });

    const scoreCourse = (c: Course): number => {
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const teacherFirst = (c.teacher?.first_name || '').toLowerCase();
      const teacherLast = (c.teacher?.last_name || '').toLowerCase();
      const teacherUser = (c.teacher?.username || '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const haystack = `${title} ${desc} ${teacherFirst} ${teacherLast} ${teacherUser} ${category}`;

      // Strict check: At least one variant of EACH typed token must be present in the haystack
      const matchesAllTokens = rawTokens.every(rawToken => {
        const variants = [rawToken, ...(synonymMap[rawToken] || [])];
        return variants.some(v => haystack.includes(v));
      });

      if (!matchesAllTokens) return 0;

      let score = 0;
      // Scoring based on match location
      for (const t of expandedTokens) {
        if (title.includes(t)) score += 10;
        if (category.includes(t)) score += 8;
        if (teacherFirst.includes(t) || teacherLast.includes(t)) score += 5;
        if (desc.includes(t)) score += 2;
      }
      return score;
    };

    return courses
      .map((c) => ({ c, s: scoreCourse(c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s) // Sort by score descending
      .map((x) => x.c);
  }, [courses, searchQuery]);

  const clearSearch = () => {
    setPendingQuery('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleCardClick = (courseId: number) => {
    navigate(`/app/my-courses/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-14 w-full max-w-2xl bg-muted rounded-2xl mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 bg-muted rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
        <p className="text-muted-foreground mt-2">Courses you are enrolled in</p>
      </div>

      {/* Search Bar - Minimalist Design */}
      <div className="relative max-w-xl w-full" role="search">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search my courses..."
          value={pendingQuery}
          onChange={(e) => setPendingQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSearchQuery(pendingQuery.trim());
            }
          }}
          className="pl-10 pr-24 h-10 rounded-full bg-muted/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 backdrop-blur-sm shadow-sm transition-all hover:bg-muted/80"
          aria-label="Search my courses"
        />
        {pendingQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 absolute right-12 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="link"
          className="h-10 absolute right-3 top-1/2 -translate-y-1/2 p-0 rounded-none text-primary hover:text-primary/80"
          aria-label="Search"
          onClick={() => setSearchQuery(pendingQuery.trim())}
        >
          <ChevronsRight className="h-6 w-6" strokeWidth={3} />
        </Button>
      </div>

      {/* Results count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6 flex items-center justify-between"
      >
        <p className="text-sm text-zinc-500">
          Showing <span className="font-medium text-foreground">{visibleCourses.length}</span> courses
          {searchQuery && (
            <> for "<span className="text-orange-400">{searchQuery}</span>"</>
          )}
        </p>
      </motion.div>

      {visibleCourses.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {visibleCourses.map((course, index) => (
              <MyCourseCard
                key={course.id}
                course={course}
                index={index}
                progress={enrollmentByCourseId[course.id]?.progress}
                isCompleted={completedCourseIds.has(course.id)}
                certificateId={certificates.find(c => c.course?.id === course.id)?.id}
                onClick={handleCardClick}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
              <p className="text-muted-foreground">Try different search terms.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-foreground mb-2">No enrollments yet</h3>
              <p className="text-muted-foreground">Browse the catalog to start learning.</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/app/courses')}
              >
                Browse Courses
              </Button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default MyCourses;


