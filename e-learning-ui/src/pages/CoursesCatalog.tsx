import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Users,
  Star,
  ChevronRight,
  Filter,
  X,
  Loader2,
  Sparkles,
  ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Course, Enrollment, Certificate } from '@/types';
import { coursesApi } from '@/api/courses';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CreateCourseForm from '@/components/courses/CreateCourseForm';

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

// Updated Course Card Component matching Landing Page style
const CatalogCard = ({
  course,
  index,
  isEnrolled,
  isCompleted,
  isTeacher,
  onClick
}: {
  course: Course;
  index: number;
  isEnrolled: boolean;
  isCompleted: boolean;
  isTeacher: boolean;
  onClick: (courseId: number) => void;
}) => {
  const teacher = course.teacher;
  const teacherName = `${teacher?.first_name || teacher?.username || 'Instructor'}${teacher?.last_name ? ` ${teacher.last_name}` : ''}`;
  const avgRating = course.average_rating ?? 0;
  const ratingsCount = course.ratings_count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20"
    >
      {/* Thumbnail / Placeholder */}
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
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge className="bg-orange-500/90 text-white border-0 text-xs font-medium backdrop-blur-sm h-6 px-2">
            {course.category || 'General'}
          </Badge>
          {isTeacher && (
            <Badge className={cn(
              "border-0 text-xs font-medium backdrop-blur-sm h-6 px-2",
              course.is_published ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
            )}>
              {course.is_published ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>

        {/* Price/Status badge */}
        <div className="absolute right-3 top-3">
          {isEnrolled ? (
            <Badge className="bg-blue-500/90 text-white border-0 text-xs font-bold backdrop-blur-sm h-6 px-2">
              Enrolled
            </Badge>
          ) : (
            <Badge className={cn(
              "border-0 text-xs font-bold backdrop-blur-sm h-6 px-2",
              course.price === 0
                ? "bg-green-500/90 text-white"
                : "bg-black/70 text-white dark:bg-white/10"
            )}>
              {course.price === 0 ? 'Free' : formatPKR(course.price)}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-5">
        <h3 className="mb-2 text-lg font-semibold text-foreground line-clamp-1 h-7 group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        <p className="mb-4 text-sm text-muted-foreground line-clamp-2 h-10">
          {course.description}
        </p>

        {/* Stats Row */}
        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground h-5">
          <div className="flex items-center gap-1 min-w-[60px]">
            <Star className={cn("h-3.5 w-3.5", avgRating > 0 ? "fill-orange-400 text-orange-400" : "text-muted-foreground")} />
            <span className="text-muted-foreground">{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</span>
            {ratingsCount > 0 && <span className="text-muted-foreground">({ratingsCount})</span>}
          </div>

          <div className="flex items-center gap-1 min-w-[70px]">
            <Users className="h-3.5 w-3.5" />
            <span>{course.enrollment_count ?? 0} students</span>
          </div>

          <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize h-5 px-2">
            {course.difficulty_level || 'Medium'}
          </Badge>
        </div>

        <div className="mb-4 flex items-center gap-2 h-8">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-medium text-white">
            {getInitials(teacher?.first_name, teacher?.last_name, teacher?.username)}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{teacherName}</span>
            <span className="text-xs text-muted-foreground">Instructor</span>
          </div>
        </div>

        <Button
          onClick={() => onClick(course.id)}
          className="w-full h-10 mt-auto bg-[#e5e5e5] hover:bg-[#e5e5e5]/90 text-zinc-900 font-medium transition-all duration-300 group-hover:shadow-lg group-hover:shadow-black/5"
        >
          {isTeacher ? 'View Course' : (isEnrolled ? (isCompleted ? 'Review Course' : 'Continue Learning') : 'View Details')}
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-red-500/5" />
      </div>
    </motion.div>
  );
};

const CoursesCatalog: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    'All',
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Machine Learning',
    'Design',
    'Business',
    'Marketing'
  ];

  // Initialize query from URL
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    const cat = searchParams.get('category');
    if (q) {
      setPendingQuery(q);
      setSearchQuery(q);
    }
    if (cat) {
      setSelectedCategory(cat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce typing
  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(pendingQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [pendingQuery]);

  // Keep URL in sync
  useEffect(() => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      if (searchQuery) sp.set('q', searchQuery);
      else sp.delete('q');
      if (selectedCategory && selectedCategory !== 'All') sp.set('category', selectedCategory);
      else sp.delete('category');
      return sp;
    }, { replace: true });
  }, [searchQuery, selectedCategory, setSearchParams]);

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

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      try {
        setIsSearching(true);
        // We only pass category to the backend. Search is now client-side for "smart" filtering.
        const params: { category?: string } = {};
        if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;

        const [list, enrollments, certs] = await Promise.all([
          coursesApi.getCourses(params, { signal: controller.signal }),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
          coursesApi.getMyCertificates().catch(() => [] as Certificate[]),
        ]);

        // Show all published courses, filter out drafts unless teacher
        const filteredList = list.filter(c => c.is_published || user?.role === 'teacher');
        setCourses(filteredList);

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
  }, [selectedCategory, user?.role]); // Removed searchQuery from dependencies loop to avoid server hits on typing

  const visibleCourses = useMemo(() => {
    if (!searchQuery) {
      if (user?.role === 'student') {
        return courses.filter((c) => !enrolledCourseIds.has(c.id));
      }
      return courses;
    }

    const rawTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    // Expand tokens with synonyms
    const expandedTokens = rawTokens.flatMap(t => {
      const syns = synonymMap[t] || [];
      return [t, ...syns];
    });

    const scoreCourse = (c: Course): number => {
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const teacherFirst = (typeof c.teacher === 'object' ? (c.teacher?.first_name || '') : '').toLowerCase();
      const teacherLast = (typeof c.teacher === 'object' ? (c.teacher?.last_name || '') : '').toLowerCase();
      const teacherUser = (typeof c.teacher === 'object' ? (c.teacher?.username || '') : '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const haystack = `${title} ${desc} ${teacherFirst} ${teacherLast} ${teacherUser} ${category}`;

      // Strict check: At least one variant of EACH typed token must be present in the haystack
      // This ensures if I type "web python", it must contain (web OR synonyms) AND (python OR synonyms)
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

    const withScores = courses
      .map((c) => ({ c, s: scoreCourse(c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);

    if (user?.role === 'student') {
      return withScores.filter((c) => !enrolledCourseIds.has(c.id));
    }
    return withScores;
  }, [courses, searchQuery, user?.role, enrolledCourseIds, synonymMap]);

  const handleCardClick = (courseId: number) => {
    navigate(`/app/courses/${courseId}`);
  };

  const clearSearch = () => {
    setPendingQuery('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-8 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Explore Courses
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse our extensive collection of courses and certifications.
            </p>
          </div>
          {user?.role === 'teacher' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#e5e5e5] hover:bg-[#e5e5e5]/90 text-zinc-900"
            >
              Create Course
            </Button>
          )}
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
            placeholder="Search courses..."
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchQuery(pendingQuery.trim());
              }
            }}
            className="pl-10 pr-24 h-10 rounded-full bg-muted/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 backdrop-blur-sm shadow-sm transition-all hover:bg-muted/80"
            aria-label="Search courses"
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
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChevronsRight className="h-6 w-6" strokeWidth={3} />
            )}
          </Button>
        </div>

        {/* Categories Filter - Landing Page Style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2"
        >
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          {categories.map((category) => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(category === 'All' ? null : category)}
              className={cn(
                "rounded-full border text-sm transition-all h-8",
                (category === 'All' && !selectedCategory) || selectedCategory === category
                  ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.1)]"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground hover:bg-muted"
              )}
            >
              {category}
            </Button>
          ))}
        </motion.div>
      </div>

      {/* Courses Grid */}
      <div className="pb-12">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {isLoading ? (
              'Loading courses...'
            ) : (
              <>
                Showing <span className="text-foreground font-medium">{visibleCourses.length}</span> courses
                {searchQuery && (
                  <> for "<span className="text-primary">{searchQuery}</span>"</>
                )}
              </>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 rounded-t-2xl bg-muted" />
                <div className="rounded-b-2xl border border-t-0 bg-card p-5 h-48">
                  <div className="mb-3 h-5 w-3/4 rounded bg-muted" />
                  <div className="mb-4 h-4 w-full rounded bg-muted" />
                  <div className="h-10 w-full rounded-lg bg-muted mt-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCourses.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {visibleCourses.map((course, index) => (
                <CatalogCard
                  key={course.id}
                  course={course}
                  index={index}
                  isEnrolled={enrolledCourseIds.has(course.id)}
                  isCompleted={completedCourseIds.has(course.id)}
                  isTeacher={user?.role === 'teacher'}
                  onClick={handleCardClick}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border bg-muted/20"
          >
            <div className="mb-4 rounded-full bg-muted p-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {searchQuery ? `No results for "${searchQuery}"` : 'No courses available'}
            </h3>
            <p className="mb-6 max-w-md text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search terms or browse different categories.'
                : 'Check back soon for new courses.'}
            </p>
            {searchQuery && (
              <Button
                onClick={clearSearch}
                variant="outline"
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Search
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Course Dialog for Teachers */}
      {
        user?.role === 'teacher' && (
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
        )
      }
    </div >
  );
};

export default CoursesCatalog;