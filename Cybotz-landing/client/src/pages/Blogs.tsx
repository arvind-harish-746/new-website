import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, User, Tag, ArrowRight, BookOpen, Clock, Target, ChevronRight } from "lucide-react";
import RidgeParallax from "@/components/ui/ridge-parallax";
import { BlogCardSkeleton, CurriculumSkeleton, LiquidGlassImage, LiquidGlassSlowNetworkBanner } from "@/components/ui/SkeletonLoader";
import { usePageMeta } from "@/hooks/usePageMeta";

interface BlogPost {
  id?: string;
  _id?: string;
  title: string;
  tags: string[];
  summary: string;
  content?: string;
  author: string;
  date: string;
  image?: string;
}

interface CurriculumModule {
  title: string;
  desc: string;
}

interface Curriculum {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced" | string;
  duration: string;
  targetAudience: string;
  summary: string;
  modules: CurriculumModule[];
}

export default function Blogs() {
  const [, setLocation] = useLocation();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [expandedCurrId, setExpandedCurrId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  usePageMeta(
    "Blogs | Cybotz — STEM Articles & Tutorials",
    "Read engineering guides, coding tutorials, and robotics articles written for young makers and educators."
  );

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
    }
  };

  const fetchCurriculums = async () => {
    try {
      const res = await fetch("/api/curriculums");
      if (res.ok) {
        const data = await res.json();
        setCurriculums(data.curriculums || []);
      }
    } catch (err) {
      console.error("Failed to load curriculums:", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchBlogs(), fetchCurriculums()]).finally(() => {
      setIsLoading(false);
    });

    const handleBlogsUpdated = () => fetchBlogs();
    const handleCurriculumsUpdated = () => fetchCurriculums();

    window.addEventListener("blogs-updated", handleBlogsUpdated);
    window.addEventListener("curriculums-updated", handleCurriculumsUpdated);

    return () => {
      window.removeEventListener("blogs-updated", handleBlogsUpdated);
      window.removeEventListener("curriculums-updated", handleCurriculumsUpdated);
    };
  }, []);

  // Extract all unique blog tags
  const allTags = Array.from(new Set(blogs.flatMap((post) => post.tags || [])));

  // Filtered blogs
  const filteredBlogs = selectedTag
    ? blogs.filter((post) => post.tags && post.tags.includes(selectedTag))
    : blogs;

  // Filtered curriculums by level
  const filteredCurriculums = selectedLevel
    ? curriculums.filter((c) => c.level.toLowerCase() === selectedLevel.toLowerCase())
    : curriculums;

  return (
    <div className="relative text-[#102033] min-h-screen flex flex-col font-sans bg-transparent">
      {/* RidgeParallax Background */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full">
        <RidgeParallax
          background="#E7F2FA"
          baseColor="#0575CE"
          accentColor="#3D8FD4"
          density={200}
          dotSize={400}
          speed={100}
          pointer={58}
          range={{
            layers: 11,
            height: 174,
            roughness: 81,
            fall: 300,
            seed: 0,
          }}
          depth={{
            parallax: 151,
            haze: 81,
            travelStart: 1210,
            travelEnd: 3000,
          }}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="absolute inset-0 bg-white/55" />
      </div>

      <Header />

      <main className="flex-grow pt-24 pb-16 relative z-10">
        
        {/* HERO SECTION */}
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden bg-white/70 backdrop-blur-sm">
          {/* Mobile-only Ambient Radial Glow */}
          <div className="sm:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none z-0" />

          <div className="container px-4 md:px-8 mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 sm:bg-transparent border border-cyan-400/40 sm:border-none text-[#0460A9] font-mono text-xs sm:text-sm tracking-widest uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse sm:hidden" />
                The Cybotz Knowledge Base
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tight sm:tracking-wider text-[#102033] mb-4 sm:mb-6 leading-tight">
                Course Curriculums & <span className="text-[#0460A9] glow-cyan-text">Engineering Guides</span>
              </h1>
              <p className="text-[#3E5168] sm:text-[#3E5168] text-base sm:text-lg leading-relaxed mb-6">
                Explore structured STEM course syllabi across expertise levels alongside technical guides from our Bangalore engineering team.
              </p>

              {/* Mobile-Only Feature Chips */}
              <div className="flex sm:hidden flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 border border-[#C9DDEC] text-xs font-mono text-[#0460A9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Step-by-Step Syllabi
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 border border-[#C9DDEC] text-xs font-mono text-[#0460A9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Real Hardware Guides
                </span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-at-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        </section>

        {/* SECTION 1: COURSE CURRICULUMS */}
        <section className="py-16 border-t border-[#C9DDEC] bg-white/70 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <span className="text-sm font-bold font-mono text-[#0460A9] tracking-widest uppercase">Course Offerings</span>
                <h2 className="text-3xl font-bold font-mono tracking-wider text-[#102033] mt-1">Course Curriculums & Syllabi</h2>
              </div>

              {/* Level Filter */}
              <div className="flex flex-wrap gap-2">
                {["All Levels", "Beginner", "Intermediate", "Advanced"].map((level) => {
                  const targetLevel = level === "All Levels" ? null : level;
                  const isActive = selectedLevel === targetLevel;
                  return (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(targetLevel)}
                      className={`px-3.5 py-1.5 rounded-lg font-mono text-sm cursor-pointer transition-all duration-300 ${
                        isActive
                          ? "bg-[#F97405] text-[#102033] font-bold shadow-[0_6px_16px_rgba(5,117,206,0.12)]"
                          : "bg-white/72 border border-[#C9DDEC] text-[#3E5168] hover:text-[#0460A9] backdrop-blur-sm"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curriculums Grid */}
            {isLoading ? (
              <CurriculumSkeleton count={3} />
            ) : filteredCurriculums.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-[#C9DDEC] bg-white/70 backdrop-blur-sm">
                <BookOpen size={40} className="text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-mono text-[#102033] mb-2">No curriculums found</h3>
                <p className="text-[#3E5168] text-sm">No courses currently matched the selected level filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCurriculums.map((curr) => {
                  const isExpanded = expandedCurrId === curr.id;
                  return (
                    <div
                      key={curr.id}
                      className="p-8 rounded-2xl bg-white/80 border border-[#C9DDEC] hover:border-cyan-500/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between shadow-xl"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#0460A9] font-mono text-sm font-bold uppercase tracking-wider">
                            {curr.level}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm font-mono text-[#3E5168]">
                            <Clock size={14} className="text-[#0460A9]" />
                            {curr.duration}
                          </span>
                        </div>

                        <h3 className="text-2xl font-bold font-mono text-[#102033] mb-3 leading-snug">
                          {curr.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-sm text-[#3E5168] mb-4 font-mono">
                          <Target size={15} className="text-[#0460A9]" />
                          <span>Target: {curr.targetAudience}</span>
                        </div>

                        <p className="text-[#3E5168] text-base leading-relaxed mb-6">
                          {curr.summary}
                        </p>

                        {/* Expandable Modules */}
                        {isExpanded && curr.modules && curr.modules.length > 0 && (
                          <div className="border-t border-[#C9DDEC] pt-4 mb-6 space-y-3 animate-fade-in">
                            <h4 className="text-sm font-bold font-mono text-[#0460A9] uppercase tracking-wider">Syllabus Modules</h4>
                            {curr.modules.map((m, idx) => (
                              <div key={idx} className="p-3.5 rounded-lg bg-white/72 border border-[#C9DDEC] backdrop-blur-sm text-sm space-y-1.5">
                                <span className="font-bold font-mono text-[#102033] block">{m.title}</span>
                                <p className="text-[#3E5168] text-xs sm:text-sm leading-relaxed">{m.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedCurrId(isExpanded ? null : curr.id)}
                        className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sm font-bold font-mono text-[#0460A9] border border-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Hide" : "View"} syllabus for ${curr.title}`}
                      >
                        {isExpanded ? "Hide Syllabus" : "View Full Syllabus"}
                        <ChevronRight size={16} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: ARTICLES & GUIDES */}
        <section className="py-16 border-t border-[#C9DDEC] bg-[#E7F2FA]/20 backdrop-blur-sm">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="mb-10">
              <span className="text-sm font-bold font-mono text-[#0460A9] tracking-widest uppercase">Articles</span>
              <h2 className="text-3xl font-bold font-mono tracking-wider text-[#102033] mt-1 mb-4">Engineering Guides & Notes</h2>

              {/* Tag filter bar */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-bold font-mono text-[#3E5168] uppercase mr-2">Filter by Topic:</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-sm cursor-pointer transition-colors duration-300 ${
                    selectedTag === null
                      ? "bg-[#F97405] text-[#102033] font-bold"
                      : "bg-white border border-[#C9DDEC] text-[#3E5168] hover:text-[#0460A9]"
                  }`}
                >
                  All Articles
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-sm cursor-pointer transition-colors duration-300 ${
                      selectedTag === tag
                        ? "bg-[#F97405] text-[#102033] font-bold"
                        : "bg-white border border-[#C9DDEC] text-[#3E5168] hover:text-[#0460A9]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles Grid */}
            {isLoading ? (
              <BlogCardSkeleton count={3} />
            ) : filteredBlogs.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-[#C9DDEC] bg-white/70 backdrop-blur-sm">
                <BookOpen size={40} className="text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-mono text-[#102033] mb-2">No articles found</h3>
                <p className="text-[#3E5168] text-sm">Try selecting a different topic filter above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBlogs.map((post, idx) => {
                  const blogId = post.id || post._id || String(idx);
                  const safeImage = (post.image || "").replace(/\\/g, "/").replace(/^["']+|["']+$/g, "").trim();
                  return (
                    <a key={blogId} href={`/blogs/${blogId}`} target="_blank" rel="noopener noreferrer" aria-label={`Read article: ${post.title}`}>
                      <article className="p-8 rounded-2xl bg-white/80 border border-[#C9DDEC] hover:border-cyan-500/40 backdrop-blur-md transition-all duration-300 flex flex-col justify-between h-full group hover:shadow-[0_0_20px_rgba(5,117,206,0.08)] cursor-pointer">
                        <div>
                          {/* Image for blog post with Liquid Glass Skeleton */}
                          {safeImage && (
                            <div className="w-full h-48 rounded-xl overflow-hidden mb-5 border border-cyan-500/20 bg-[#E7F2FA]">
                              <LiquidGlassImage
                                src={safeImage}
                                alt={post.title}
                                className="w-full h-full"
                                imgClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[#0460A9] font-mono text-xs uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Headline */}
                        <h3 className="text-xl sm:text-2xl font-bold font-mono text-[#102033] mb-2.5 group-hover:text-[#0460A9] transition-colors leading-snug">
                          {post.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-[#3E5168] text-sm sm:text-base leading-relaxed mb-5">
                          {post.summary}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="border-t border-[#C9DDEC] pt-4 mt-4">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-[#3E5168] mb-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <User size={14} className="text-[#0460A9]" />
                            <span>By {post.author}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>{post.date}</span>
                          </div>
                        </div>

                        <span className="flex items-center gap-2 text-[#0460A9] font-mono text-sm font-semibold group-hover:text-[#0460A9] transition-colors">
                          Read Full Guide <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </article>
                  </a>
                );
              })}
            </div>
            )}

          </div>
        </section>

        {/* INTERNAL CROSS-LINK: Workshops */}
        <section className="py-16 bg-white/70 backdrop-blur-sm border-t border-[#C9DDEC]">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wider mb-4">Interested in Hands-On Learning?</h2>
              <p className="text-[#3E5168] mb-8 text-sm md:text-base">
                Turn theory into practice. Explore our drone and robotics workshops for schools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleNavigate("/workshops")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F97405] text-[#102033] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-[#ff8614] transition-all duration-300 shadow-[0_8px_20px_rgba(249,116,5,0.18)] cursor-pointer"
                >
                  Explore Workshops <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleNavigate("/labs")}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-cyan-500 text-[#0460A9] font-bold font-mono text-sm tracking-wider rounded-lg hover:bg-cyan-500/10 transition-all duration-300 cursor-pointer"
                >
                  Setup a Lab <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <LiquidGlassSlowNetworkBanner />
    </div>
  );
}
