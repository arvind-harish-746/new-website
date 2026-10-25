import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  GraduationCap,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Compass,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  ChevronRight,
  LogOut,
  LogIn,
  AlertCircle,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  RefreshCw,
  CornerDownRight,
} from "lucide-react";

interface CommentReply {
  commentId: string;
  username: string;
  content: string;
  createdAt: string;
}

interface StudentComment {
  blogId: string;
  blogTitle: string;
  blogDate: string;
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replies: CommentReply[];
}

interface CurriculumTrack {
  id: string;
  title: string;
  level: string;
  duration: string;
  targetAudience?: string;
  summary: string;
  progressPercent: number;
  currentModule: {
    step: number;
    totalSteps: number;
    title: string;
    desc: string;
    status: string;
  };
  nextMove: {
    title: string;
    desc: string;
    actionRequired: string;
    targetMilestoneDate?: string;
    recommendedReadingSlug?: string;
  };
}

export default function StudentPortal() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"comments" | "curriculum">("comments");

  // Dashboard Data
  const [comments, setComments] = useState<StudentComment[]>([]);
  const [curriculumTracks, setCurriculumTracks] = useState<CurriculumTrack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // First-Time Password Setup State
  const [showOtpSetup, setShowOtpSetup] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpNewPassword, setOtpNewPassword] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<{ text: string; isError: boolean } | null>(null);

  usePageMeta(
    "Student Learning Portal | Cybotz",
    "Track your robotics & drone curriculum milestones, review your blog contributions, and plan your next move."
  );

  // Check auth from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem("cybotz_admin_token");
      const user = localStorage.getItem("cybotz_admin_user");
      if (token && user) {
        setAuthToken(token);
        setCurrentUser(user);
        fetchDashboardData(token);
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardData = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/student/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }
        setErrorMsg("Failed to load dashboard data. Please try again.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setComments(data.comments || []);
      setCurriculumTracks(data.curriculumTracks || []);
    } catch (err) {
      console.error("Student Dashboard Fetch Error:", err);
      setErrorMsg("Network error connecting to the portal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Please enter your username and password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid username or password.");
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem("cybotz_admin_token", data.token);
      localStorage.setItem("cybotz_admin_user", data.username);
      localStorage.setItem("cybotz_admin_role", data.role || "student");

      setAuthToken(data.token);
      setCurrentUser(data.username);
      await fetchDashboardData(data.token);
    } catch {
      setLoginError("Network connection error. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cybotz_admin_token");
    localStorage.removeItem("cybotz_admin_user");
    localStorage.removeItem("cybotz_admin_role");
    setAuthToken(null);
    setCurrentUser(null);
    setComments([]);
    setCurriculumTracks([]);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpMessage(null);
    if (!otpIdentifier.trim()) {
      setOtpMessage({ text: "Please enter your username or registered phone number.", isError: true });
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/student/request-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: otpIdentifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpMessage({ text: data.error || "Failed to send OTP.", isError: true });
      } else {
        setOtpStep("verify");
        setOtpMessage({ text: data.message || "Verification code generated successfully!", isError: false });
      }
    } catch {
      setOtpMessage({ text: "Network error sending OTP.", isError: true });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpMessage(null);
    if (!otpCode.trim() || !otpNewPassword.trim()) {
      setOtpMessage({ text: "Please enter the OTP and your new password.", isError: true });
      return;
    }

    if (otpNewPassword.length < 6) {
      setOtpMessage({ text: "Password must be at least 6 characters long.", isError: true });
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/student/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: otpIdentifier.trim(),
          otp: otpCode.trim(),
          newPassword: otpNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpMessage({ text: data.error || "Verification failed.", isError: true });
      } else {
        localStorage.setItem("cybotz_admin_token", data.token);
        localStorage.setItem("cybotz_admin_user", data.username);
        localStorage.setItem("cybotz_admin_role", data.role || "student");

        setAuthToken(data.token);
        setCurrentUser(data.username);
        setShowOtpSetup(false);
        await fetchDashboardData(data.token);
      }
    } catch {
      setOtpMessage({ text: "Network error verifying OTP.", isError: true });
    } finally {
      setOtpLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || "Recently";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr || "Recently";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070C16] text-white font-mono selection:bg-cyan-500/30">
      <Header />

      <main className="flex-grow pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Top Breadcrumb & Hero */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Link href="/" className="hover:underline text-slate-400">Home</Link>
            <span>/</span>
            <span className="text-cyan-300">Student Portal</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Student Learning Portal
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Track your curriculum status, plan your next move, and review your blog contributions.
                  </p>
                </div>
              </div>
            </div>

            {/* Authenticated User Status Bar */}
            {currentUser && (
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">
                  Welcome, <strong className="text-cyan-300">{currentUser}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 ml-2 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer bg-transparent border-none p-0"
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VIEW 1: UNAUTHENTICATED LOGIN CARD */}
        {!currentUser ? (
          <div className="max-w-md mx-auto my-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                  <Lock size={22} />
                </div>
                <h2 className="text-xl font-bold text-white">Student Sign In</h2>
                <p className="text-xs text-slate-400">
                  Sign in with your student credentials to view your curriculum milestones and blog activity.
                </p>
              </div>

              {!showOtpSetup ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Username / Phone</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. aditya.sharma"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-sm focus:outline-none focus:border-cyan-500 transition-all font-mono"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-sm focus:outline-none focus:border-cyan-500 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 bg-transparent border-none p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2"
                  >
                    <LogIn size={16} />
                    {isLoggingIn ? "Authenticating..." : "Sign In to Portal"}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpSetup(true);
                        setOtpStep("request");
                        setOtpMessage(null);
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline cursor-pointer bg-transparent border-none"
                    >
                      First time login? Set your password via Portal OTP
                    </button>
                  </div>
                </form>
              ) : (
                /* First Time Password Setup Sub-Flow */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Set Permanent Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOtpSetup(false)}
                      className="text-xs text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>

                  {otpStep === "request" ? (
                    <form onSubmit={handleRequestOtp} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Username or Phone</label>
                        <input
                          type="text"
                          value={otpIdentifier}
                          onChange={(e) => setOtpIdentifier(e.target.value)}
                          placeholder="e.g. aditya.sharma or 9876543210"
                          className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {otpMessage && (
                        <p className={`text-xs ${otpMessage.isError ? "text-rose-400" : "text-emerald-400"}`}>
                          {otpMessage.text}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none"
                      >
                        {otpLoading ? "Generating OTP..." : "Get Verification Code"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">6-Digit OTP</label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-center tracking-widest text-base text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">New Permanent Password</label>
                        <input
                          type="password"
                          value={otpNewPassword}
                          onChange={(e) => setOtpNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {otpMessage && (
                        <p className={`text-xs ${otpMessage.isError ? "text-rose-400" : "text-emerald-400"}`}>
                          {otpMessage.text}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 disabled:opacity-50 transition-all cursor-pointer border-none"
                      >
                        {otpLoading ? "Verifying..." : "Verify & Activate Account"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: AUTHENTICATED PORTAL (ONLY TWO CORE SECTIONS) */
          <div className="space-y-8">
            {/* Navigation Tabs (Only Two Sections: Comments & Curriculum Status) */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl max-w-md">
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${
                  activeTab === "comments"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                    : "text-slate-400 hover:text-white bg-transparent"
                }`}
              >
                <MessageSquare size={16} />
                <span>My Blog Comments ({comments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("curriculum")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${
                  activeTab === "curriculum"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                    : "text-slate-400 hover:text-white bg-transparent"
                }`}
              >
                <Target size={16} />
                <span>Curriculum & Next Move</span>
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-20 space-y-3">
                <RefreshCw className="animate-spin mx-auto text-cyan-400" size={32} />
                <p className="text-sm text-slate-400">Loading student learning telemetry...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  onClick={() => {
                    const token = authToken || localStorage.getItem("cybotz_admin_token");
                    if (token) fetchDashboardData(token);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all border border-rose-500/40 cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : activeTab === "comments" ? (
              /* ============================================================ */
              /* SECTION 1: MY BLOG COMMENTS WITH DIRECT REDIRECT LINKS & REPLIES */
              /* ============================================================ */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="text-cyan-400" size={20} />
                    My Blog Comments & Discussion Threads
                  </h2>
                  <Link href="/blogs">
                    <button className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-transparent border-none cursor-pointer">
                      <span>Explore All Blogs</span>
                      <ArrowRight size={13} />
                    </button>
                  </Link>
                </div>

                {comments.length === 0 ? (
                  <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-4">
                    <MessageSquare size={36} className="mx-auto text-slate-600" />
                    <div className="space-y-1">
                      <p className="text-base font-bold text-slate-300">No blog comments yet</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        You haven't posted any comments on our engineering articles. Join the discussions to ask robotics questions or share your build notes!
                      </p>
                    </div>
                    <Link href="/blogs">
                      <button className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer border-none">
                        Browse Blogs & Comment
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map((item, idx) => (
                      <div
                        key={item.commentId || idx}
                        className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 shadow-xl"
                      >
                        {/* Blog Header & Redirect Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                          <div>
                            <span className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold block">
                              Blog Article
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white hover:text-cyan-300 transition-colors">
                              {item.blogTitle}
                            </h3>
                          </div>

                          {/* Direct Redirect Link to that Specific Blog */}
                          <Link href={`/blogs/${item.blogId}`}>
                            <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer">
                              <span>Open Article</span>
                              <ExternalLink size={13} />
                            </button>
                          </Link>
                        </div>

                        {/* My Comment Text */}
                        <div className="space-y-1.5 pl-3 border-l-2 border-cyan-500">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock size={12} />
                            <span>Posted on {formatDate(item.createdAt)}</span>
                          </div>
                          <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {item.content}
                          </p>
                        </div>

                        {/* Replies from Other Students or Instructors */}
                        {item.replies && item.replies.length > 0 && (
                          <div className="pt-3 border-t border-slate-800/60 space-y-3">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                              <CornerDownRight size={14} className="text-cyan-400" />
                              Replies in this discussion ({item.replies.length}):
                            </span>

                            <div className="space-y-2.5 pl-4">
                              {item.replies.map((reply, rIdx) => (
                                <div
                                  key={reply.commentId || rIdx}
                                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-cyan-300">{reply.username}</span>
                                    <span className="text-[11px] text-slate-500">{formatDate(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    {reply.content}
                                  </p>

                                  {/* Direct Redirect Link to that Specific Reply Discussion */}
                                  <div className="pt-1 flex justify-end">
                                    <Link href={`/blogs/${item.blogId}`}>
                                      <button className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-transparent border-none cursor-pointer">
                                        <span>View conversation</span>
                                        <ArrowRight size={11} />
                                      </button>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================ */
              /* SECTION 2: CURRICULUM STATUS & THE NEXT MOVE                 */
              /* ============================================================ */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Target className="text-cyan-400" size={20} />
                    Active Curriculum Status & The Next Move
                  </h2>
                  <Link href="/workshops">
                    <button className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-transparent border-none cursor-pointer">
                      <span>View All Tracks</span>
                      <ArrowRight size={13} />
                    </button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {curriculumTracks.map((track) => (
                    <div
                      key={track.id}
                      className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-6 shadow-2xl"
                    >
                      {/* Track Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold uppercase">
                              {track.level}
                            </span>
                            <span className="text-xs text-slate-400">Duration: {track.duration}</span>
                          </div>
                          <h3 className="text-xl font-bold text-white tracking-tight">{track.title}</h3>
                        </div>

                        {/* Progress Badge */}
                        <div className="text-right sm:min-w-[140px]">
                          <span className="text-xs text-slate-400 block mb-1">Track Progress</span>
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${track.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-cyan-300">{track.progressPercent}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Current Active Milestone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
                            <CheckCircle2 size={14} />
                            <span>
                              Current Module ({track.currentModule.step} of {track.currentModule.totalSteps})
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white">{track.currentModule.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{track.currentModule.desc}</p>
                        </div>

                        {/* THE NEXT MOVE (HIGH-TECH CALLOUT BOX) */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 via-slate-950 to-blue-600/10 border border-cyan-500/30 space-y-2.5 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                              <Zap size={14} className="text-amber-400" />
                              The Next Move
                            </span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                              {track.nextMove.targetMilestoneDate || "Next Session"}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-white mb-1">{track.nextMove.title}</h4>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{track.nextMove.desc}</p>
                          </div>

                          <div className="pt-2 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-300/90 font-medium">
                              <strong>Action:</strong> {track.nextMove.actionRequired}
                            </span>
                            <Link href="/blogs">
                              <button className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-colors bg-transparent border-none cursor-pointer p-0">
                                <span>Prep Material</span>
                                <ArrowRight size={12} />
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
