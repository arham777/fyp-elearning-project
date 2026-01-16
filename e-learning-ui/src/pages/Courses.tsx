import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Users, 
  Star,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Filter,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Course } from '@/types';
import { coursesApi } from '@/api/courses';
import { useAuth } from '@/contexts/AuthContext';

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

// Course Card Component with animations
const CourseCardPublic = ({ 
  course, 
  index, 
  onEnroll 
}: { 
  course: Course; 
  index: number;
  onEnroll: (courseId: number) => void;
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:shadow-orange-500/5"
    >
      {/* Thumbnail / Placeholder - Fixed height */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900">
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
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />
        
        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <Badge className="bg-orange-500/90 text-white border-0 text-xs font-medium backdrop-blur-sm h-6 px-2">
            {course.category || 'General'}
          </Badge>
        </div>

        {/* Price badge */}
        <div className="absolute right-3 top-3">
          <Badge className={cn(
            "border-0 text-xs font-bold backdrop-blur-sm h-6 px-2",
            course.price === 0 
              ? "bg-green-500/90 text-white" 
              : "bg-zinc-900/90 text-white"
          )}>
            {course.price === 0 ? 'Free' : formatPKR(course.price)}
          </Badge>
        </div>
      </div>

      {/* Content - Flex grow to fill space */}
      <div className="flex flex-col flex-grow p-5">
        {/* Title - Fixed height */}
        <h3 className="mb-2 text-lg font-semibold text-white line-clamp-1 h-7 group-hover:text-orange-400 transition-colors">
          {course.title}
        </h3>

        {/* Description - Fixed height with 2 lines */}
        <p className="mb-4 text-sm text-zinc-400 line-clamp-2 h-10">
          {course.description}
        </p>

        {/* Stats Row - Fixed height */}
        <div className="mb-4 flex items-center gap-3 text-xs text-zinc-500 h-5">
          {/* Rating */}
          <div className="flex items-center gap-1 min-w-[60px]">
            <Star className={cn("h-3.5 w-3.5", avgRating > 0 ? "fill-orange-400 text-orange-400" : "text-zinc-600")} />
            <span className="text-zinc-400">{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</span>
            {ratingsCount > 0 && <span className="text-zinc-600">({ratingsCount})</span>}
          </div>

          {/* Enrolled students */}
          <div className="flex items-center gap-1 min-w-[70px]">
            <Users className="h-3.5 w-3.5" />
            <span>{course.enrollment_count ?? 0} students</span>
          </div>

          {/* Difficulty */}
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 capitalize h-5 px-2">
            {course.difficulty_level || 'Medium'}
          </Badge>
        </div>

        {/* Teacher Info - Fixed height */}
        <div className="mb-4 flex items-center gap-2 h-8">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-medium text-white">
            {getInitials(teacher?.first_name, teacher?.last_name, teacher?.username)}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-sm font-medium text-zinc-300 truncate">{teacherName}</span>
            <span className="text-xs text-zinc-500">Instructor</span>
          </div>
        </div>

        {/* Action Button - Pushed to bottom with margin-top auto */}
        <Button 
          onClick={() => onEnroll(course.id)}
          className="w-full h-10 mt-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium transition-all duration-300 group-hover:shadow-lg group-hover:shadow-orange-500/20"
        >
          <span>Enroll Now</span>
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

// Main Courses Page
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Categories for filtering
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

  // Fetch courses
  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      try {
        setIsSearching(true);
        const params: { search?: string; category?: string } = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
        
        const list = await coursesApi.getCourses(params, { signal: controller.signal });
        // Only show published courses
        setCourses(list.filter(c => c.is_published));
      } catch (error: unknown) {
        const err = error as { name?: string; code?: string };
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch courses:', error);
        }
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    };

    fetchCourses();
    return () => controller.abort();
  }, [searchQuery, selectedCategory]);

  // Client-side filtering for better search UX
  const visibleCourses = useMemo(() => {
    const tokens = (searchQuery || '').toLowerCase().split(/\s+/).filter(Boolean);

    const scoreCourse = (c: Course): number => {
      if (tokens.length === 0) return 1;
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const teacherFirst = (typeof c.teacher === 'object' ? (c.teacher?.first_name || '') : '').toLowerCase();
      const teacherLast = (typeof c.teacher === 'object' ? (c.teacher?.last_name || '') : '').toLowerCase();
      const teacherUser = (typeof c.teacher === 'object' ? (c.teacher?.username || '') : '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const haystack = `${title} ${desc} ${teacherFirst} ${teacherLast} ${teacherUser} ${category}`;
      
      const allPresent = tokens.every((t) => haystack.includes(t));
      if (!allPresent) return 0;
      
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 3;
        if (category.includes(t)) score += 2;
        if (teacherFirst.includes(t) || teacherLast.includes(t) || teacherUser.includes(t)) score += 2;
        if (desc.includes(t)) score += 1;
      }
      return score;
    };

    return courses
      .map((c) => ({ c, s: scoreCourse(c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [courses, searchQuery]);

  // Handle enroll click
  const handleEnroll = (courseId: number) => {
    if (isAuthenticated) {
      navigate(`/app/courses/${courseId}`);
    } else {
      // Redirect to login with return URL
      navigate(`/login?redirect=/app/courses/${courseId}`);
    }
  };

  // Clear search
  const clearSearch = () => {
    setPendingQuery('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-[length:200%_200%] opacity-30 bg-gradient-to-br from-indigo-950 via-zinc-950 to-orange-950/30"
        />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/50 backdrop-blur-md bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
              <GraduationCap className="h-7 w-7 text-orange-500" />
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                EDU-Platform
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button asChild variant="outline" className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  <Link to="/app">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400">
                <Sparkles className="h-4 w-4" />
                <span>Discover Your Next Skill</span>
              </div>
              <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Explore Our{' '}
                <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  Courses
                </span>
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400">
                Browse through our extensive collection of courses taught by industry experts.
                Find the perfect course to advance your career.
              </p>

              {/* Search Bar */}
              <div className="mx-auto max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative"
                >
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-zinc-500" />
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Search courses by title, description, or instructor..."
                      value={pendingQuery}
                      onChange={(e) => setPendingQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(pendingQuery.trim()); }}
                      className="h-14 w-full rounded-2xl border-zinc-800 bg-zinc-900/80 pl-12 pr-24 text-base text-white placeholder:text-zinc-500 focus:border-orange-500/50 focus:ring-orange-500/20 backdrop-blur-sm"
                    />
                    {pendingQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearSearch}
                        className="absolute right-14 h-8 w-8 text-zinc-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => setSearchQuery(pendingQuery.trim())}
                      disabled={isSearching}
                      className="absolute right-2 h-10 rounded-xl bg-orange-600 px-4 hover:bg-orange-700"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span>Search</span>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories Filter */}
        <section className="pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4 text-zinc-500 mr-2" />
              {categories.map((category) => (
                <Button
                  key={category}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                  className={cn(
                    "rounded-full border text-sm transition-all",
                    (category === 'All' && !selectedCategory) || selectedCategory === category
                      ? "border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  )}
                >
                  {category}
                </Button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Results count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 flex items-center justify-between"
            >
              <p className="text-sm text-zinc-500">
                {isLoading ? (
                  'Loading courses...'
                ) : (
                  <>
                    Showing <span className="text-white font-medium">{visibleCourses.length}</span> courses
                    {searchQuery && (
                      <> for "<span className="text-orange-400">{searchQuery}</span>"</>
                    )}
                  </>
                )}
              </p>
            </motion.div>

            {/* Loading State */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-44 rounded-t-2xl bg-zinc-800" />
                    <div className="rounded-b-2xl border border-t-0 border-zinc-800 bg-zinc-900/50 p-5">
                      <div className="mb-2 h-5 w-3/4 rounded bg-zinc-800" />
                      <div className="mb-4 h-4 w-full rounded bg-zinc-800" />
                      <div className="mb-4 flex gap-4">
                        <div className="h-3 w-16 rounded bg-zinc-800" />
                        <div className="h-3 w-20 rounded bg-zinc-800" />
                      </div>
                      <div className="h-10 w-full rounded-lg bg-zinc-800" />
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
                    <CourseCardPublic
                      key={course.id}
                      course={course}
                      index={index}
                      onEnroll={handleEnroll}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="mb-4 rounded-full bg-zinc-800/50 p-4">
                  <Search className="h-8 w-8 text-zinc-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No courses available'}
                </h3>
                <p className="mb-6 max-w-md text-zinc-400">
                  {searchQuery 
                    ? 'Try adjusting your search terms or browse all categories.'
                    : 'Check back soon for new courses.'}
                </p>
                {searchQuery && (
                  <Button
                    onClick={clearSearch}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Clear Search
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-zinc-400">© 2026 LearnHub. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Courses;
