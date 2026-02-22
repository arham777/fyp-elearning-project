import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Parallax } from 'swiper/modules';
import { motion, useInView, AnimatePresence } from 'framer-motion';

import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  Trophy,
  ShieldCheck,
  Layout,
  CheckCircle2,
  PlayCircle,
  Users,
  PenTool,
  Lock,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Swiper as SwiperType } from 'swiper';

// CSS Imports
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from '@/components/ui/pagination';

/* --- Components --- */

// 1. Animated Counter
const Counter = ({ from, to, suffix = "" }: { from: number; to: number; suffix?: string }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true });

  useEffect(() => {
    if (!inView || !nodeRef.current) return;
    const node = nodeRef.current;

    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);

      const current = from + (to - from) * ease;
      node.textContent = `${current.toFixed(0)}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [inView, from, to, suffix]);

  return <span ref={nodeRef} className="font-semibold tabular-nums tracking-tight" />;
};

// 2. Glass Card Component
const GlassCard = ({ children, className, delay = 0, borderLight = false }: { children: React.ReactNode; className?: string; delay?: number; borderLight?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    viewport={{ once: true }}
    className={cn(
      "relative overflow-visible rounded-2xl bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-colors",
      borderLight ? "border-transparent" : "border border-white/10",
      borderLight ? "hover:bg-white/5" : "hover:bg-white/10",
      className
    )}
  >
    {borderLight && (
      <>
        <div className="absolute inset-0 rounded-2xl -inset-[2px] bg-gradient-to-tr from-transparent via-transparent to-transparent animate-border-light">
          <div className="absolute inset-0 rounded-2xl bg-white/5" />
        </div>
        <style>{`
          @keyframes border-light {
            0%, 100% { background-position: 0% 0%; }
            25% { background-position: 100% 0%; }
            50% { background-position: 100% 100%; }
            75% { background-position: 0% 100%; }
          }
          .animate-border-light {
            background-size: 400% 400%;
            background-image: conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              transparent 90deg,
              rgba(251,146,60,0.9) 180deg,
              rgba(239,68,68,0.9) 270deg,
              transparent 360deg
            );
            animation: border-light 8s linear infinite;
            mask: 
              linear-gradient(#fff 0 0) content-box, 
              linear-gradient(#fff 0 0);
            -webkit-mask: 
              linear-gradient(#fff 0 0) content-box, 
              linear-gradient(#fff 0 0);
            mask-composite: exclude;
            -webkit-mask-composite: xor;
            padding: 2px;
          }
        `}</style>
      </>
    )}
    <div className="relative z-10">
      {children}
    </div>
  </motion.div>
);


// 3. Spotlight Card for "Engineered for Engagement"
const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(255, 255, 255, 0.1)" }: { children: React.ReactNode; className?: string; spotlightColor?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl transition-all duration-300 hover:bg-zinc-900/80 hover:border-zinc-700 hover:shadow-2xl",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

// 4. Animated List Component for Spotlight Card
const AnimatedCourseList = () => {
  const [items, setItems] = useState([
    { id: 1, title: "UX Foundations", time: "10m" },
    { id: 2, title: "Wireframing", time: "25m" },
    { id: 3, title: "Prototyping", time: "40m" },
  ]);
  const [counter, setCounter] = useState(4);
  const titles = ["User Testing", "Visual Design", "Design Systems", "Accessibility", "Handover", "Micro-interactions", "User Research"];

  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) => {
        const nextTitle = titles[Math.floor(Math.random() * titles.length)];
        const newItem = {
          id: Date.now(),
          title: nextTitle,
          time: `${10 + Math.floor(Math.random() * 50)}m`
        };
        return [...prev.slice(1), newItem];
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-2 overflow-hidden px-1 w-full">
      <AnimatePresence mode='popLayout'>
        {items.map((item, index) => (
          <motion.div
            layout
            key={item.id}
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              borderColor: index === 0 ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.05)",
              backgroundColor: index === 0 ? "rgba(59, 130, 246, 0.1)" : "rgba(24, 24, 27, 0.5)"
            }}
            exit={{ scale: 0.95, opacity: 0, y: -0, filter: "blur(2px)", zIndex: -1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative flex items-center justify-between rounded-lg border p-2.5 transition-colors w-full"
          >
            {/* Content */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors duration-500",
                index === 0 ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
              )}>
                {index === 0 ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CheckCircle2 size={12} />
                  </motion.div>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className={cn("text-xs font-medium transition-colors duration-300", index === 0 ? "text-white" : "text-zinc-400")}>{item.title}</span>
                <span className="text-[10px] text-zinc-600">{item.time}</span>
              </div>
            </div>

            <div className="h-5 w-5 rounded-full border border-zinc-800 flex items-center justify-center">
              {index === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-blue-500">
                  <PlayCircle size={10} fill="currentColor" />
                </motion.div>
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-800" />
              )}
            </div>

            {/* Progress Bar for Active Item */}
            {index === 0 && (
              <motion.div
                layoutId="progressBar"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[2px] bg-blue-500/50"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
};

// 5. Progress Dashboard (polished, rotating panels)
const ProgressDashboard = () => {
  const [progress, setProgress] = useState(88);
  const [activeUsers, setActiveUsers] = useState(1304);
  const [recent, setRecent] = useState([
    { id: 1, text: 'Anna completed Module 3' },
    { id: 2, text: 'Ravi unlocked Badge: UX Pro' },
    { id: 3, text: 'Lina started "React Basics"' },
  ]);

  const panels = ['progress', 'preview', 'activity'] as const;
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((s) => (s + 1) % panels.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // simulate small live updates
    const t = setInterval(() => {
      setActiveUsers((v) => v + Math.floor(Math.random() * 4));
      setProgress((p) => Math.max(52, Math.min(98, p + (Math.random() > 0.7 ? 1 : 0))));
      setRecent((r) => {
        if (Math.random() > 0.7) {
          const texts = ['completed Quiz 2', 'unlocked Badge: Focus', 'started "Advanced CSS"', 'scored 95% in Test'];
          return [{ id: Date.now(), text: `User ${Math.floor(Math.random() * 900)} ${texts[Math.floor(Math.random() * texts.length)]}` }, ...r].slice(0, 6);
        }
        return r;
      });
    }, 2400);
    return () => clearInterval(t);
  }, []);

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-zinc-900/80 p-4 border border-white/6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/30" />
            </div>
            <div className="text-xs text-zinc-500">Live</div>
          </div>

          <div className="relative w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {panels[active] === 'progress' && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5 }}
                  className="flex w-full items-center gap-6"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute -inset-4 rounded-full blur-xl opacity-40" style={{ background: 'radial-gradient(closest-side, rgba(249,115,22,0.18), transparent)' }} />
                    <svg width="120" height="120" viewBox="0 0 120 120" className="relative z-10">
                      <defs>
                        <linearGradient id="g1" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="#FB923C" />
                          <stop offset="100%" stopColor="#F97316" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="transparent" />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r={radius}
                        stroke="url(#g1)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </svg>

                    <div className="absolute z-20 flex flex-col items-center">
                      <div className="text-xl font-semibold text-white">
                        {progress}%
                      </div>
                      <div className="text-[9px] text-zinc-400">Course Progress</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold">Average Completion</div>
                    <div className="text-xs text-zinc-400 mt-2 max-w-md">Track how students progress through courses. See completion trends and nudge learners with timely suggestions to improve outcomes.</div>
                    <div className="mt-4 h-2 rounded bg-zinc-800">
                      <motion.div className="h-2 rounded bg-orange-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.9 }} />
                    </div>
                    <div className="mt-3 text-xs text-zinc-500">Active learners • <span className="font-semibold text-white">{activeUsers}</span></div>
                  </div>
                </motion.div>
              )}

              {panels[active] === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5 }}
                  className="flex w-full items-center gap-6"
                >
                  <div className="w-1/3 flex items-center justify-center">
                    <div className="aspect-video w-full max-w-[260px] rounded-md bg-zinc-800 relative overflow-hidden flex items-center justify-center border border-white/3">
                      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-zinc-700" />
                      <PlayCircle className="relative z-10 h-14 w-14 text-white/70" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Quick Preview: Interactive Labs</div>
                    <div className="text-xs text-zinc-400 mt-2">Short hands-on labs that reinforce lessons — students practice inside the browser and earn XP for every successful run.</div>
                    <div className="mt-4">
                      <Button asChild size="sm" className="h-9 bg-[#e5e5e5] text-zinc-900 hover:bg-[#e5e5e5]/90">
                        <Link to="/courses">Explore Courses</Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {panels[active] === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5 }}
                  className="flex w-full items-start gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Live Activity</div>
                      <div className="text-xs text-zinc-500">Now</div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-auto pr-2">
                      {recent.map((r) => (
                        <motion.div key={r.id} initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="text-xs text-zinc-300">
                          • {r.text}
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-zinc-400">Active learners: <span className="font-semibold text-white">{activeUsers}</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Slide Content Components --- */

const HeroSlide = () => (
  <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
    <div className="flex flex-col justify-center text-center lg:text-left">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 lg:justify-start lg:self-start"
      >
        <Sparkles size={14} />
        <span>The Future of Learning</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-6 text-5xl font-semibold leading-tight tracking-tight md:text-7xl"
      >
        Master Skills. <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
          Track Progress.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-8 text-lg text-zinc-400 md:text-xl"
      >
        Join an ecosystem designed for growth. Instructors teach with powerful tools,
        and students learn with gamified progress tracking.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start"
      >
        <Button asChild size="lg" className="h-12 bg-[#e5e5e5] text-zinc-900 px-8 text-base hover:bg-[#e5e5e5]/90 shadow-lg shadow-black/5">
          <Link to="/register">Get Started</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 border-zinc-700 bg-transparent px-8 text-base text-zinc-100 hover:bg-zinc-800">
          <Link to="/courses">Explore Courses</Link>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-12 grid grid-cols-3 gap-8 border-t border-white/5 pt-8"
      >
        {[
          { label: "Active Learners", val: 1000, suffix: "+" },
          { label: "Verified Courses", val: 120, suffix: "+" },
          { label: "Satisfaction", val: 98, suffix: "%" },
        ].map((stat, i) => (
          <div key={i}>
            <div className="text-3xl font-medium text-white">
              <Counter from={0} to={stat.val} suffix={stat.suffix} />
            </div>
            <div className="text-sm font-normal text-zinc-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </div>

    {/* Right Visual - Abstract UI Representation */}
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative hidden lg:block"
    >
      <div className="relative h-[600px] w-full">
        {/* Abstract Card 1: Progress Dashboard */}
        <div className="absolute left-0 top-10 z-20 w-3/4">
          <ProgressDashboard />
        </div>

        {/* Abstract Card 2: Certificate */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-0 z-30 w-1/2"
        >
          <GlassCard className="!bg-gradient-to-br from-zinc-900 to-zinc-950 border-orange-500/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-orange-400 font-mono mb-1">VERIFIED CERTIFICATE</div>
                <div className="text-lg font-semibold">Web Development</div>
              </div>
              <ShieldCheck className="text-orange-500" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-6 w-6 rounded-full bg-zinc-700" />
              <span>Issued to Student</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  </div>
);

const FeaturesSlide = () => (
  <div className="mx-auto max-w-7xl w-full">
    <div className="mb-12 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-semibold md:text-5xl"
      >
        Engineered for Engagement
      </motion.h2>
      <p className="mt-4 text-zinc-400 text-sm md:text-base">Everything you need to master your learning journey.</p>
    </div>

    {/* Using flex-col for mobile ensuring natural flow, grid for desktop */}
    <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-6 md:h-auto">

      {/* Feature 1: Progress (Large Left) */}
      <SpotlightCard className="md:col-span-2 md:row-span-2 flex flex-col justify-between group overflow-hidden relative p-5 md:p-6 min-h-[320px]">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500" />

        {/* 3D Icon - Map (Absolute Position - Desktop Only) */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-4 right-4 z-20 w-24 h-24 opacity-80 pointer-events-none hidden md:block"
        >
          <img src="/3d-icons/map.png" alt="Map 3D" className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)]" />
        </motion.div>

        <div className="relative z-10 max-w-full md:max-w-[80%]">
          <h3 className="text-lg md:text-xl font-medium text-zinc-100">Structured Learning Paths</h3>
          <p className="mt-2 text-xs md:text-sm text-zinc-400 leading-relaxed">
            Follow clear, organized modules. Seamlessly transition from video lectures to reading materials and test your knowledge with interactive assignments.
          </p>
        </div>

        {/* Animated UI Mockup */}
        <div className="mt-6 relative h-52 md:h-60 w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-950/50 p-4 shadow-inner flex items-end">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950/80 z-20 pointer-events-none" />
          <AnimatedCourseList />
        </div>
      </SpotlightCard>

      {/* Feature 2: Gamification (Top Right) */}
      <SpotlightCard className="group relative overflow-hidden p-5 md:p-6 hover:!bg-zinc-900/90 transition-colors duration-500 min-h-[260px]">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/30 transition-all duration-700 animate-pulse" />

        {/* 3D Icon - Trophy (Centered/Floating) */}
        <div className="absolute top-2 right-2 md:top-[-10px] md:right-[-10px] z-20 opacity-90 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
          <motion.img
            animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            src="/3d-icons/trophy.png"
            alt="Trophy 3D"
            className="w-16 h-16 md:w-28 md:h-28 object-contain drop-shadow-[0_15px_30px_rgba(249,115,22,0.4)]"
          />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-end pb-2">
          <h3 className="text-lg font-medium text-zinc-100 pr-24 md:pr-0 mt-8 md:mt-0">Earn XP & Badges</h3>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed z-10 relative mb-8 md:mb-14 max-w-[75%] md:max-w-[90%]">
            Stay motivated. Earn Experience Points (XP) for every lesson, maintain daily streaks, and unlock unique badges as you level up.
          </p>

          {/* Decorative Elements - Refined Dots */}
          <div className="flex gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          </div>
        </div>
      </SpotlightCard>

      {/* Feature 3: Security & Certs (Bottom Right) */}
      <SpotlightCard className="group relative overflow-hidden p-5 md:p-6 hover:!bg-zinc-900/90 transition-colors duration-500 min-h-[260px]">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-[150%] skew-x-12 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-shimmer" />

        {/* 3D Icon - Shield (Floating) */}
        <div className="absolute top-2 right-2 md:top-0 md:right-0 z-20 opacity-90 transition-transform duration-500 group-hover:scale-105">
          <motion.img
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            src="/3d-icons/shield.png"
            alt="Shield 3D"
            className="w-14 h-14 md:w-24 md:h-24 object-contain drop-shadow-[0_10px_20px_rgba(168,85,247,0.3)]"
          />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-end pb-2">
          <h3 className="text-lg font-medium text-zinc-100 pr-24 md:pr-16 mt-6 md:mt-0">Verifiable Credentials</h3>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed z-10 relative mb-8 md:mb-12 max-w-[75%] md:max-w-[90%]">
            Complete courses to receive auto-generated certificates with unique verification codes that employers can instantly validate.
          </p>

          <div className="">
            <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 bg-purple-500/5 px-2 py-1 rounded border border-purple-500/20 w-fit z-20 relative backdrop-blur-sm">
              <Lock size={10} />
              <span>ID: 8X92-2M2L-99KK</span>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  </div>
);

const AudienceSlide = () => (
  <div className="mx-auto max-w-6xl w-full">
    <div className="mb-12 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-semibold md:text-5xl"
      >
        A Platform for Everyone
      </motion.h2>
      <p className="mt-4 text-zinc-400 text-sm md:text-base">
        Whether you are here to teach or to learn, we provide the tools you need to succeed.
      </p>
    </div>

    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-8">

      {/* Column 1: For Students */}
      <GlassCard className="flex flex-col h-full bg-gradient-to-b from-white/5 to-transparent min-h-[300px]" delay={0.1} borderLight={true}>
        <div className="mb-6 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Users size={24} className="md:w-7 md:h-7" />
        </div>
        <h3 className="text-xl md:text-2xl font-medium mb-4">For Students</h3>
        <ul className="space-y-4 text-zinc-400 flex-1 text-sm md:text-base">
          <li className="flex gap-3">
            <CheckCircle2 className="text-blue-500 shrink-0" size={18} />
            <span><strong>Unlimited Access.</strong> Enroll in courses and learn from anywhere, 24/7.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-blue-500 shrink-0" size={18} />
            <span><strong>Visual Progress.</strong> Track your journey with detailed analytics and completion milestones.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-blue-500 shrink-0" size={18} />
            <span><strong>Flexible Payments.</strong> Pay securely via Stripe or JazzCash.</span>
          </li>
        </ul>
      </GlassCard>

      {/* Column 2: For Teachers */}
      <GlassCard className="flex flex-col h-full bg-gradient-to-b from-white/5 to-transparent border-orange-500/20 min-h-[300px]" delay={0.2} borderLight={true}>
        <div className="mb-6 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
          <PenTool size={24} className="md:w-7 md:h-7" />
        </div>
        <h3 className="text-xl md:text-2xl font-medium mb-4 text-white">For Teachers</h3>
        <ul className="space-y-4 text-zinc-400 flex-1 text-sm md:text-base">
          <li className="flex gap-3">
            <CheckCircle2 className="text-orange-500 shrink-0" size={18} />
            <span><strong>Course Builder.</strong> Create structured courses with modules, videos, and reading materials.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-orange-500 shrink-0" size={18} />
            <span><strong>Student Insights.</strong> Monitor enrollment numbers and track student performance.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-orange-500 shrink-0" size={18} />
            <span><strong>Direct Feedback.</strong> Reply to student reviews and improve your content.</span>
          </li>
        </ul>
      </GlassCard>

      {/* Column 3: Trust & Security */}
      <GlassCard className="flex flex-col h-full bg-gradient-to-b from-white/5 to-transparent min-h-[300px]" delay={0.3} borderLight={true}>
        <div className="mb-6 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
          <Lock size={24} className="md:w-7 md:h-7" />
        </div>
        <h3 className="text-xl md:text-2xl font-medium mb-4">Trust & Safety</h3>
        <ul className="space-y-4 text-zinc-400 flex-1 text-sm md:text-base">
          <li className="flex gap-3">
            <CheckCircle2 className="text-green-500 shrink-0" size={18} />
            <span><strong>Quality Assurance.</strong> All courses pass a strict admin approval workflow before publishing.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-green-500 shrink-0" size={18} />
            <span><strong>Secure Transactions.</strong> PCI-compliant payment processing handles your data safely.</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="text-green-500 shrink-0" size={18} />
            <span><strong>Authenticity.</strong> Verify certificate validity instantly via our public portal.</span>
          </li>
        </ul>
      </GlassCard>

    </div>
  </div>
);

const CTASlide = () => (
  <div className="relative z-10 mx-auto max-w-3xl text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-900/40"
    >
      <GraduationCap className="h-10 w-10 text-white" />
    </motion.div>

    <motion.h2
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mb-6 text-4xl font-semibold tracking-tight md:text-6xl"
    >
      Ready to start your journey?
    </motion.h2>

    <motion.p
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mb-10 text-xl text-zinc-400"
    >
      Join the platform that is transforming online education. <br className="hidden md:block" />
      Enroll in your first course today.
    </motion.p>

    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col items-center justify-center gap-4 sm:flex-row"
    >
      <Button asChild size="lg" className="h-14 min-w-[200px] rounded-full bg-white text-lg text-black hover:bg-zinc-200">
        <Link to="/register">Create Free Account</Link>
      </Button>
      <Button asChild variant="link" className="text-zinc-400 hover:text-white">
        <Link to="/login">Already have an account?</Link>
      </Button>
    </motion.div>

    <footer className="absolute bottom-[-20vh] left-0 right-0 text-xs text-zinc-600">
      &copy; 2026 E-Learning Platform. Final Year Project.
    </footer>
  </div>
);

/* --- Main Page --- */

/* --- Main Page --- */

const Index = () => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Custom hook for checking desktop breakpoint (lg = 1024px)
  // We only enable Swiper on large screens where height is likely sufficient
  const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
      // 1024px matches 'lg' Tailwind breakpoint
      const media = window.matchMedia('(min-width: 1024px)');
      const update = () => setIsDesktop(media.matches);
      update(); // Set initial value
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }, []);
    return isDesktop;
  };

  const isDesktop = useIsDesktop();

  return (
    <div className="relative h-screen w-full bg-zinc-950 text-zinc-50 font-sans selection:bg-orange-500/30">

      {/* Dynamic Background */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 z-0 bg-[length:200%_200%] opacity-40 bg-gradient-to-br from-indigo-950 via-zinc-950 to-orange-950/30 fixed"
      />

      {/* Grain overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 fixed" />

      {/* Navigation Indicators (Desktop Only) */}
      {isDesktop && (
        <div className="absolute right-6 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-4">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => swiperRef.current?.slideTo(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                activeSlide === index ? "h-8 bg-orange-500" : "bg-zinc-700 hover:bg-zinc-500"
              )}
            >
              <span className="sr-only">Go to slide {index + 1}</span>
            </button>
          ))}
        </div>
      )}

      {!isDesktop ? (
        // Mobile/Tablet Layout: Vertical Scroll with Natural Flow
        // This handles screens < 1024px where Swiper slides might overflow
        <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden bg-zinc-950">

          {/* Hero Section */}
          <section className="min-h-[100dvh] flex items-center justify-center px-4 md:px-8 py-20">
            <HeroSlide />
          </section>

          {/* Features Section */}
          <section className="w-full px-4 py-20 bg-zinc-950">
            <FeaturesSlide />
          </section>

          {/* Audience Section */}
          <section className="w-full px-4 py-20 bg-zinc-950">
            <AudienceSlide />
          </section>

          {/* CTA Section */}
          <section className="w-full px-4 py-20 bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
            <CTASlide />
            <footer className="mt-20 text-center text-xs text-zinc-600">
              &copy; 2026 E-Learning Platform. Final Year Project.
            </footer>
          </section>
        </div>
      ) : (
        // Desktop Layout: Swiper (Large Screens Only)
        <Swiper
          direction="vertical"
          speed={1000}
          modules={[Mousewheel, Keyboard, Parallax, Pagination]}
          mousewheel={{ thresholdDelta: 50, sensitivity: 1 }}
          keyboard
          onSwiper={(s) => (swiperRef.current = s)}
          onSlideChange={(s) => setActiveSlide(s.activeIndex)}
          className="h-full w-full"
        >

          {/* --- SLIDE 1: HERO --- */}
          <SwiperSlide className="relative flex items-center justify-center px-4 md:px-8">
            <HeroSlide />
          </SwiperSlide>

          {/* --- SLIDE 2: FEATURES (Bento Grid) --- */}
          <SwiperSlide className="flex items-center justify-center bg-zinc-950 px-4">
            <FeaturesSlide />
          </SwiperSlide>

          {/* --- SLIDE 3: FOR STUDENTS & TEACHERS --- */}
          <SwiperSlide className="flex items-center justify-center bg-zinc-950 px-4">
            <AudienceSlide />
          </SwiperSlide>

          {/* --- SLIDE 4: CTA --- */}
          <SwiperSlide className="relative flex items-center justify-center overflow-hidden bg-zinc-950 px-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-zinc-950 to-zinc-950" />
            <CTASlide />
          </SwiperSlide>

        </Swiper>
      )}
    </div>
  );
};

export default Index;