import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
  Clock,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { containsProfanity } from "@/lib/profanity";
import TurnstileWidget from "./TurnstileWidget";

export interface CommentItem {
  _id?: string;
  id?: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface BlogCommentsProps {
  blogId: string;
  initialComments?: CommentItem[];
}

export default function BlogComments({ blogId, initialComments = [] }: BlogCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("dev-bypass-token");

  // Authentication State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Inline Login State
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync auth state from storage
  useEffect(() => {
    try {
      const token = localStorage.getItem("cybotz_admin_token");
      const user = localStorage.getItem("cybotz_admin_user");
      const role = localStorage.getItem("cybotz_admin_role");
      if (token && user) {
        setAuthToken(token);
        setCurrentUser(user);
        setCurrentRole(role || "student");
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch comments on mount or blogId change
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/blogs/${encodeURIComponent(blogId)}/comments`);
        if (res.ok) {
          const data = await res.json();
          if (data.comments) {
            setComments(data.comments);
          }
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
      }
    };
    if (blogId) {
      fetchComments();
    }
  }, [blogId]);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError("Please enter your username and password.");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed. Check your credentials.");
        setLoginLoading(false);
        return;
      }

      localStorage.setItem("cybotz_admin_token", data.token);
      localStorage.setItem("cybotz_admin_user", data.username);
      localStorage.setItem("cybotz_admin_role", data.role || "student");

      setAuthToken(data.token);
      setCurrentUser(data.username);
      setCurrentRole(data.role || "student");
      setShowInlineLogin(false);
      setLoginUser("");
      setLoginPass("");
    } catch (err) {
      setLoginError("Network connection error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cybotz_admin_token");
    localStorage.removeItem("cybotz_admin_user");
    localStorage.removeItem("cybotz_admin_role");
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentRole(null);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = newComment.trim();
    if (!trimmed) {
      setErrorMsg("Please write a comment before posting.");
      return;
    }

    // In-UI profanity validation check
    if (containsProfanity(trimmed)) {
      setErrorMsg("Your comment contains prohibited language or profanity. Please maintain a respectful learning environment.");
      return;
    }

    if (!authToken) {
      setErrorMsg("Please sign in to post a comment.");
      setShowInlineLogin(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/blogs/${encodeURIComponent(blogId)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "cf-turnstile-token": turnstileToken || "dev-bypass-token",
        },
        body: JSON.stringify({ content: trimmed, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to post comment.");
        setIsSubmitting(false);
        return;
      }

      setComments(data.comments || []);
      setNewComment("");
      setSuccessMsg("Comment posted!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg("Network error. Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: CommentItem) => {
    const commentId = comment._id || comment.id || "";
    setEditingCommentId(commentId);
    setEditContent(comment.content);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      setErrorMsg("Comment cannot be empty.");
      return;
    }

    if (containsProfanity(trimmed)) {
      setErrorMsg("Your comment contains prohibited language or profanity. Please maintain a respectful learning environment.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/blogs/${encodeURIComponent(blogId)}/comments/${encodeURIComponent(commentId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update comment.");
        setIsUpdating(false);
        return;
      }

      setComments(data.comments || []);
      setEditingCommentId(null);
      setEditContent("");
      setSuccessMsg("Comment updated.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg("Network error updating comment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/blogs/${encodeURIComponent(blogId)}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setComments(data.comments || []);
        setSuccessMsg("Comment removed.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || "Failed to delete comment.");
      }
    } catch {
      setErrorMsg("Network error deleting comment.");
    }
  };

  const canModerate = currentRole === "admin" || currentRole === "editor" || currentRole === "master";

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recently";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="pt-10 mt-10 border-t border-slate-800 space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-cyan-400" size={24} />
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Discussion & Comments ({comments.length})
          </h2>
        </div>

        {/* User Session Bar */}
        {currentUser ? (
          <div className="flex items-center gap-3 bg-slate-900/80 border border-cyan-500/20 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm">
            <UserIcon size={14} className="text-cyan-400" />
            <span className="text-slate-300">
              Signed in as: <strong className="text-white">{currentUser}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-2 transition-colors cursor-pointer bg-transparent border-none p-0"
              title="Sign Out"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInlineLogin(!showInlineLogin)}
            className="flex items-center gap-2 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
          >
            <LogIn size={14} />
            Sign in to comment
          </button>
        )}
      </div>

      {/* Inline Login Box (If not logged in and toggled) */}
      {!currentUser && showInlineLogin && (
        <form
          onSubmit={handleInlineLogin}
          className="p-5 rounded-xl bg-slate-900/95 border border-cyan-500/30 space-y-4 shadow-xl backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-cyan-400 flex items-center gap-2">
              <ShieldCheck size={16} />
              Student & Member Login
            </h3>
            <button
              type="button"
              onClick={() => setShowInlineLogin(false)}
              className="text-slate-400 hover:text-cyan-400 bg-transparent border-none p-0 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="e.g. aditya.sharma"
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {loginError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              {loginError}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">
              Need a password? Set it via the Student Portal.
            </span>
            <button
              type="submit"
              disabled={loginLoading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs sm:text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none shadow-md"
            >
              {loginLoading ? "Verifying..." : "Sign In & Join"}
            </button>
          </div>
        </form>
      )}

      {/* In-UI Profanity and Conduct Warning Banner (Specifically above the comment box) */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs sm:text-sm leading-relaxed">
        <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 block mb-0.5">Discussion Conduct Notice:</strong>
          Please keep comments constructive and respectful. Cusswords, vulgarity, and inappropriate language are strictly prohibited and will be filtered automatically.
        </div>
      </div>

      {/* New Comment Submission Form */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder={
              currentUser
                ? "Share your thoughts, robotics questions, or feedback on this article..."
                : "Sign in above to share your thoughts or ask questions..."
            }
            rows={3}
            disabled={!currentUser || isSubmitting}
            className="w-full p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm sm:text-base placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 disabled:opacity-60 transition-all resize-y"
          />
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm">
            <AlertTriangle size={15} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {newComment.length} / 2000 characters
            </span>
            <TurnstileWidget onVerify={setTurnstileToken} action="blog_comment" />
          </div>

          <button
            type="submit"
            disabled={!currentUser || !newComment.trim() || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold text-xs sm:text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 cursor-pointer border-none"
          >
            <Send size={14} />
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>

      {/* Existing Comments List */}
      <div className="space-y-4 pt-4">
        {comments.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-500 text-sm">
            No comments yet. Be the first to start the discussion!
          </div>
        ) : (
          comments.map((comment) => {
            const commentId = comment._id || comment.id || "";
            const isOwner = currentUser && (comment.username === currentUser || comment.userId === currentUser);
            const isEditing = editingCommentId === commentId;

            return (
              <div
                key={commentId || Math.random().toString()}
                className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-3"
              >
                {/* Comment Header - No Student Badges, Clean Author Name */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      {comment.username ? comment.username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm sm:text-base">
                        {comment.username}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={11} className="text-slate-400" />
                        <span>{formatDate(comment.createdAt)}</span>
                        {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                          <span className="text-[10px] text-slate-400 italic">(edited)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit (Owner) & Delete (Moderator or Owner) */}
                  <div className="flex items-center gap-2">
                    {isOwner && !isEditing && (
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer"
                        title="Edit Comment"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}

                    {(isOwner || canModerate) && !isEditing && (
                      <button
                        onClick={() => handleDeleteComment(commentId)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors bg-transparent border-none cursor-pointer"
                        title="Delete Comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Body / In-Place Editor */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-cyan-500/50 text-white text-sm focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditContent("");
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition-colors bg-transparent cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(commentId)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F97405] text-slate-950 font-bold text-xs hover:bg-[#ff8614] transition-colors cursor-pointer border-none"
                      >
                        <Check size={13} />
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words pl-1">
                    {comment.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
