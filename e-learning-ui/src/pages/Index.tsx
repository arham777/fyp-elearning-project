import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel, Parallax } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';

// Small in-view counter with rAF animation
const CountUpNumber: React.FC<{
  end: number;
  durationMs?: number;
  decimals?: number;
  suffix?: string;
}> = ({ end, durationMs = 1200, decimals = 0, suffix = '' }) => {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / durationMs);
      setDisplay(end * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, durationMs]);

  const formatted = React.useMemo(() => {
    const value = Number(display.toFixed(decimals));
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, [display, decimals]);

  return (
    <div ref={ref} className="text-xl md:text-2xl font-semibold">
      {formatted}
      {suffix}
    </div>
  );
};

const Index = () => {
  const [isLocked, setIsLocked] = React.useState(false);
  const swiperRef = React.useRef<SwiperType | null>(null);

  const lockInteractionsFor = React.useCallback((ms: number) => {
    setIsLocked(true);
    const instance = swiperRef.current;
    if (instance) {
      instance.allowSlideNext = false;
      instance.allowSlidePrev = false;
      instance.allowTouchMove = false;
      if (instance.mousewheel && 'disable' in instance.mousewheel) instance.mousewheel.disable();
      if (instance.keyboard && 'disable' in instance.keyboard) instance.keyboard.disable();
    }
    window.setTimeout(() => {
      const s = swiperRef.current;
      if (s) {
        s.allowSlideNext = true;
        s.allowSlidePrev = true;
        s.allowTouchMove = true;
        if (s.mousewheel && 'enable' in s.mousewheel) s.mousewheel.enable();
        if (s.keyboard && 'enable' in s.keyboard) s.keyboard.enable();
      }
      setIsLocked(false);
    }, ms);
  }, []);

  return (
    <Swiper
      direction="vertical"
      speed={800}
      modules={[Mousewheel, Keyboard, Parallax]}
      mousewheel={{ forceToAxis: true, releaseOnEdges: false, thresholdDelta: 8, thresholdTime: 1200 }}
      keyboard={{ enabled: true, onlyInViewport: true, pageUpDown: true }}
      allowTouchMove={!isLocked}
      onSwiper={(s) => (swiperRef.current = s)}
      onSlideChangeTransitionStart={() => {
        // Lock interactions during transition and for an extra 1s after
        lockInteractionsFor(1000);
      }}
      className="h-[100svh] bg-gradient-to-b from-background to-secondary/60"
    >
      {/* Hero (screen 1) */}
      <SwiperSlide className="relative !h-[100svh] flex items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_20%,black,transparent)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_hsl(var(--ink)/0.05),_transparent_40%),_radial-gradient(circle_at_80%_0%,_hsl(var(--ink)/0.06),_transparent_40%)]" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 w-full">
          <div className="flex flex-col items-center text-center gap-6 section-appear">
            <span className="reveal [--delay:40ms] inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange/15 ring-1 ring-accent-orange/30">
              <GraduationCap className="h-5 w-5 text-accent-orange" />
            </span>
            <h1 className="reveal [--delay:120ms] text-4xl md:text-6xl font-semibold tracking-tight">EduPlatform</h1>
            <p className="reveal [--delay:220ms] max-w-2xl text-base md:text-lg text-muted-foreground">
              Create, deliver and track courses with a clean, professional LMS.
            </p>

            {/* Social proof / metrics */}
            <div className="grid grid-cols-3 gap-6 mt-2">
              <div className="reveal [--delay:320ms] text-left md:text-center">
                <CountUpNumber end={1000} suffix="+" />
                <div className="text-xs md:text-sm text-muted-foreground">Learners</div>
              </div>
              <div className="reveal [--delay:380ms] text-left md:text-center">
                <CountUpNumber end={120} suffix="+" />
                <div className="text-xs md:text-sm text-muted-foreground">Courses</div>
              </div>
              <div className="reveal [--delay:440ms] text-left md:text-center">
                <CountUpNumber end={4.8} decimals={1} suffix="/5" />
                <div className="text-xs md:text-sm text-muted-foreground">Avg. Rating</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button asChild className="reveal [--delay:520ms] h-10 px-5">
                <Link to="/login">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="reveal [--delay:560ms] h-10 px-5">
                <Link to="/register">Create Account</Link>
              </Button>
            </div>

            <div className="reveal [--delay:640ms] absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 opacity-80">
                <Sparkles className="h-3.5 w-3.5" /> Scroll
              </span>
            </div>
          </div>
        </div>
      </SwiperSlide>

      {/* Section 2: Product (formerly What) */}
      <SwiperSlide className="!h-[100svh] flex items-center">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 w-full">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="section-appear">
              <h2 className="reveal [--delay:80ms] text-3xl md:text-4xl font-semibold mb-4">All‑in‑one learning platform</h2>
              <p className="reveal [--delay:160ms] text-muted-foreground mb-6">
                Courses, modules, enrollments, assessments and certificates — everything you need to teach and learn in one place.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  'Role‑based dashboards for students and teachers',
                  'Clean, distraction‑free UI focused on content',
                  'Progress tracking and recommendations',
                ].map((f) => (
                  <li key={f} className="reveal [--delay:220ms] flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ink/60" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="section-appear">
              <div className="reveal [--delay:240ms] card-elevated rounded-xl p-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {['Enrollments', 'Certificates', 'Assignments', 'Modules', 'Profiles', 'Search'].map((t, i) => (
                    <div
                      key={t}
                      className="reveal"
                      style={{ ['--delay' as unknown as string]: `${260 + i * 60}ms` }}
                    >
                      <div className="rounded-md bg-ink/5 py-6 text-sm">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SwiperSlide>

      {/* Section 3: Technology (formerly How) */}
      <SwiperSlide className="!h-[100svh] flex items-center">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 w-full">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="section-appear order-2 md:order-1">
              <div className="reveal [--delay:100ms] card-elevated rounded-xl p-6">
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Tailwind', 'Shadcn UI', 'Django REST', 'React Query', 'Vite'].map((t, i) => (
                    <span
                      key={t}
                      className="reveal px-3 py-1 rounded-full bg-ink/10 text-sm"
                      style={{ ['--delay' as unknown as string]: `${140 + i * 60}ms` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="section-appear order-1 md:order-2">
              <h2 className="reveal [--delay:80ms] text-3xl md:text-4xl font-semibold mb-4">Built on a modern stack</h2>
              <p className="reveal [--delay:160ms] text-muted-foreground mb-6">
                Secure authentication, responsive design, and performance by default. The stack is simple to maintain and fast to iterate on.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  'JWT auth with role‑aware routing',
                  'Type‑safe APIs and forms',
                  'Snappy UI with optimistic patterns',
                ].map((f) => (
                  <li key={f} className="reveal [--delay:220ms] flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ink/60" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SwiperSlide>

      {/* Section 4: Purpose (formerly Why) */}
      <SwiperSlide className="!h-[100svh] flex items-center">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 w-full">
          <div className="section-appear max-w-3xl">
            <h2 className="reveal [--delay:80ms] text-3xl md:text-4xl font-semibold mb-4">Made to keep learners engaged</h2>
            <p className="reveal [--delay:160ms] text-muted-foreground mb-6">
              Clarity first. Neutral colors, subtle motion and accessible components keep attention on what matters — learning.
            </p>
            <div className="flex items-center gap-3">
              <Button asChild className="reveal [--delay:240ms] h-10 px-5">
                <Link to="/login">Start now</Link>
              </Button>
              <Button asChild variant="outline" className="reveal [--delay:300ms] h-10 px-5">
                <Link to="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  );
};

export default Index;
