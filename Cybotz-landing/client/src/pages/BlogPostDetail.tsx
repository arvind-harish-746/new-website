import React, { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RidgeParallax from "@/components/ui/ridge-parallax";
import { DirectionAwareHover } from "@/elements/direction_aware_hover";
import { Calendar, User, ArrowLeft, Copy, Check, Terminal, BookOpen } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import BlogComments from "@/components/BlogComments";

interface BlogPost {
  id?: string;
  _id?: string;
  title: string;
  tags: string[];
  summary: string;
  content: string;
  author: string;
  date: string;
  image?: string;
}

export default function BlogPostDetail() {
  const [, params] = useRoute("/blogs/:id");
  const [, setLocation] = useLocation();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  usePageMeta(
    post ? `${post.title} | Cybotz Blog` : "Blog | Cybotz — STEM Articles & Tutorials",
    post ? post.summary : "Read engineering guides, coding tutorials, and robotics articles from Cybotz."
  );

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const rawTargetId = params?.id ? decodeURIComponent(params.id).trim() : "";
        if (!rawTargetId || rawTargetId === "undefined") {
          setPost(null);
          setIsLoading(false);
          return;
        }

        // Try fetching single blog endpoint first
        try {
          const singleRes = await fetch(`/api/blogs/${encodeURIComponent(rawTargetId)}`);
          if (singleRes.ok) {
            const singleData = await singleRes.json();
            if (singleData.blog) {
              setPost(singleData.blog);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Fall back to searching list
        }

        // Fallback: search in full blogs list
        const res = await fetch("/api/blogs");
        if (res.ok) {
          const data = await res.json();
          const blogsList = data.blogs || [];
          const found = blogsList.find((b: any) => {
            const bId = String(b.id || b._id || "").trim();
            const bTitle = String(b.title || "").trim();
            const bTitleSlug = bTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            return (
              bId === rawTargetId ||
              (b._id && String(b._id) === rawTargetId) ||
              bTitleSlug === rawTargetId.toLowerCase() ||
              bTitle.toLowerCase() === rawTargetId.toLowerCase()
            );
          });
          setPost(found || null);
        }
      } catch (err) {
        console.error("Failed to load blog post:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
    window.scrollTo(0, 0);
  }, [params?.id]);

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to format blog content with styled code blocks, markdown headers, and lists automatically
  const renderFormattedContent = (contentStr: string) => {
    if (!contentStr) return null;

    const lines = contentStr.split("\n");
    const blocks: { type: "text" | "code" | "header" | "list"; content: string; lang?: string }[] = [];

    let isExplicitCodeBlock = false;
    let isImplicitCodeBlock = false;
    let currentCode: string[] = [];
    let codeLang = "python";

    const isHeaderLine = (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("#")) return true;
      return (
        trimmed.startsWith("Step ") ||
        trimmed.startsWith("What You'll") ||
        trimmed.startsWith("Wiring Guide") ||
        trimmed.startsWith("Software Setup") ||
        trimmed.startsWith("Learning Outcomes") ||
        trimmed.startsWith("Classroom Use") ||
        trimmed.startsWith("Expansion Ideas") ||
        trimmed.startsWith("Final Thoughts") ||
        trimmed.startsWith("Quick Recap") ||
        trimmed.startsWith("Challenge for You") ||
        trimmed.startsWith("Final Code") ||
        trimmed.startsWith("Final Words") ||
        trimmed.startsWith("Let's assume:") ||
        trimmed.startsWith("Quick Recap:") ||
        (trimmed.endsWith(":") && trimmed.length < 50 && !trimmed.includes("http") && !trimmed.startsWith("print"))
      );
    };

    const isCodeStartLine = (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      return (
        trimmed.startsWith("import ") ||
        trimmed.startsWith("from ") ||
        trimmed.startsWith("def ") ||
        trimmed.startsWith("GPIO.") ||
        trimmed.startsWith("while ") ||
        trimmed.startsWith("sudo ") ||
        trimmed.startsWith("from dronekit")
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Explicit Markdown Code Block (```python or ```)
      if (trimmed.startsWith("```")) {
        if (isExplicitCodeBlock) {
          blocks.push({ type: "code", content: currentCode.join("\n"), lang: codeLang });
          isExplicitCodeBlock = false;
          currentCode = [];
        } else {
          if (isImplicitCodeBlock) {
            blocks.push({ type: "code", content: currentCode.join("\n"), lang: codeLang });
            isImplicitCodeBlock = false;
            currentCode = [];
          }
          isExplicitCodeBlock = true;
          currentCode = [];
          codeLang = trimmed.replace(/^```/, "").trim() || "python";
        }
        continue;
      }

      if (isExplicitCodeBlock) {
        currentCode.push(line);
        continue;
      }

      // 2. Implicit Code Block logic (auto-detect plain text python/bash snippet without backticks)
      if (isImplicitCodeBlock) {
        // If we hit a header line or plain prose text after an empty line, close code block
        if (isHeaderLine(line) || (trimmed.length > 0 && !line.startsWith(" ") && !line.startsWith("\t") && !isCodeStartLine(line) && !trimmed.startsWith("#") && !trimmed.startsWith("IN") && !trimmed.startsWith("time.") && !trimmed.startsWith("if ") && !trimmed.startsWith("elif ") && !trimmed.startsWith("else:") && !trimmed.startsWith("return") && !trimmed.startsWith("break") && !trimmed.startsWith("stop()") && !trimmed.startsWith("print(") && !trimmed.includes(" = "))) {
          blocks.push({ type: "code", content: currentCode.join("\n"), lang: codeLang });
          isImplicitCodeBlock = false;
          currentCode = [];
        } else {
          currentCode.push(line);
          continue;
        }
      }

      if (isCodeStartLine(line)) {
        isImplicitCodeBlock = true;
        currentCode = [line];
        codeLang = trimmed.startsWith("sudo") ? "bash" : "python";
        continue;
      }

      // 3. Headers (# Header, Step 1..., What You'll Learn, etc.)
      if (isHeaderLine(line)) {
        const headerText = trimmed.replace(/^#+\s*/, "");
        blocks.push({ type: "header", content: headerText });
        continue;
      }

      // 4. Bullet & Numbered lists (- item, * item, 1. item)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
        const listText = trimmed.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "");
        blocks.push({ type: "list", content: listText });
        continue;
      }

      // 5. Normal text line
      if (trimmed.length > 0) {
        blocks.push({ type: "text", content: line });
      }
    }

    if ((isExplicitCodeBlock || isImplicitCodeBlock) && currentCode.length > 0) {
      blocks.push({ type: "code", content: currentCode.join("\n"), lang: codeLang });
    }

    let codeBlockCount = 0;

    return (
      <div className="space-y-6">
        {blocks.map((block, idx) => {
          if (block.type === "header") {
            return (
              <div key={idx} className="pt-6 border-t border-slate-800/80">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                  {block.content}
                </h3>
              </div>
            );
          }

          if (block.type === "code") {
            codeBlockCount++;
            const currentBlockIdx = codeBlockCount;
            const codeText = block.content;
            return (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-[#050811] shadow-2xl my-5">
                {/* Code Block Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-sm font-mono text-gray-400">
                  <div className="flex items-center gap-2">
                    <Terminal size={15} className="text-cyan-400" />
                    <span className="uppercase text-xs tracking-wider text-cyan-300 font-bold">{block.lang || "python"}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(codeText, currentBlockIdx)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
                  >
                    {copiedIndex === currentBlockIdx ? (
                      <>
                        <Check size={13} className="text-cyan-400" />
                        <span className="text-cyan-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Block Body */}
                <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-cyan-200 overflow-x-auto leading-relaxed bg-[#03060E] selection:bg-cyan-500/30 selection:text-white">
                  <code>{codeText}</code>
                </pre>
              </div>
            );
          }

          if (block.type === "list") {
            return (
              <ul key={idx} className="list-none pl-3 space-y-1.5">
                <li className="flex items-start gap-2.5 text-base sm:text-lg text-gray-300 leading-relaxed">
                  <span className="text-cyan-400 font-bold text-base shrink-0">•</span>
                  <span>{block.content}</span>
                </li>
              </ul>
            );
          }

          return (
            <p key={idx} className="text-gray-300 text-base sm:text-lg leading-relaxed font-sans">
              {block.content}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative text-white min-h-screen flex flex-col font-sans bg-transparent">
      {/* RidgeParallax Background */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full">
        <RidgeParallax
          background="#0F172A"
          baseColor="#00F0FF"
          accentColor="#00C5E5"
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
        <div className="absolute inset-0 bg-[#0F172A]/40" />
      </div>

      <Header />

      <main className="flex-grow pt-28 pb-20 relative z-10">
        <div className="container px-4 md:px-8 mx-auto w-full max-w-[95%] xl:max-w-7xl">
          
          {/* Back Button */}
          <Link href="/blogs">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-mono font-bold text-cyan-300 border border-slate-800 hover:border-cyan-500/30 transition-all cursor-pointer mb-8">
              <ArrowLeft size={16} />
              Back to All Articles
            </button>
          </Link>

          {isLoading ? (
            <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40 font-mono text-cyan-400 animate-pulse text-base">
              Loading article details...
            </div>
          ) : !post ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 font-mono">
              <BookOpen size={40} className="mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Article Not Found</h2>
              <p className="text-gray-400 text-sm mb-6">The requested engineering guide could not be located.</p>
              <Link href="/blogs">
                <button className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 cursor-pointer">
                  Return to Blogs
                </button>
              </Link>
            </div>
          ) : (
            <article className="p-6 sm:p-10 md:p-14 rounded-2xl sm:rounded-3xl bg-[#0B101D]/40 border border-[#1E293B] shadow-2xl backdrop-blur-md space-y-6 sm:space-y-8">
              
              {/* Header Details */}
              <div className="space-y-4 border-b border-slate-800/80 pb-6">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs sm:text-sm font-semibold uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-white tracking-tight leading-snug">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm sm:text-base font-mono text-gray-400 pt-1">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-cyan-400" />
                    <span>Author: <strong className="text-white">{post.author}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-cyan-400" />
                    <span>Published: {post.date}</span>
                  </div>
                </div>
              </div>

              {/* Feature Image with DirectionAwareHover Animation & No Outer Box Frame */}
              {post.image && (
                <div className="w-full flex justify-center my-8">
                  <DirectionAwareHover
                    imageUrl={(post.image || "").replace(/\\/g, "/").replace(/^["']+|["']+$/g, "").trim()}
                    className="w-full max-w-5xl h-[450px] md:h-[550px] rounded-2xl border-none shadow-none bg-transparent overflow-hidden"
                    imageClassName="!object-contain !scale-100 group-hover/card:!scale-105 transition-transform duration-700"
                  >
                    <div className="text-left bg-slate-950/85 p-3.5 rounded-lg border border-cyan-500/30 backdrop-blur-md shadow-xl">
                      <p className="font-bold font-mono text-base text-cyan-300">{post.title}</p>
                      <p className="font-semibold font-mono text-xs text-cyan-400/90 uppercase tracking-wider">{post.tags ? post.tags.join(" • ") : "STEM Guide"}</p>
                    </div>
                  </DirectionAwareHover>
                </div>
              )}

              {/* Summary Hero Box */}
              <div className="p-5 sm:p-6 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-200 text-base sm:text-lg font-mono leading-relaxed">
                <strong className="text-cyan-400 block mb-1.5 uppercase tracking-wider text-xs sm:text-sm">Article Overview:</strong>
                {post.summary}
              </div>

              {/* Formatted Article Body */}
              <div className="pt-2">
                {renderFormattedContent(post.content || post.summary)}
              </div>

              {/* Article Footer Navigation */}
              <div className="pt-8 border-t border-slate-800 flex items-center justify-between">
                <Link href="/blogs">
                  <button className="flex items-center gap-2 text-sm sm:text-base font-mono font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer bg-transparent border-none p-0">
                    <ArrowLeft size={16} />
                    Back to All Guides
                  </button>
                </Link>
              </div>

              {/* Embedded Student & Member Discussion Section */}
              <BlogComments
                blogId={post.id || post._id || params?.id || ""}
                initialComments={(post as any).comments || []}
              />
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
