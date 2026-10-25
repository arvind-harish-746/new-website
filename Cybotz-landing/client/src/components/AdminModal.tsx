import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Trash2,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  Building,
  ShieldAlert,
  CheckCircle2,
  Lock,
  KeyRound,
  LogOut,
  PlusCircle,
  BookOpen,
  GraduationCap,
  Layers,
  Edit3,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  History,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Crown,
  Users,
  UserPlus,
  Maximize2,
  Minimize2,
  Move,
  PanelRight,
  GripHorizontal,
  RotateCcw,
  Image as ImageIcon,
  UploadCloud,
  Zap,
} from "lucide-react";
import { compressClientImage } from "../lib/image-compressor";

interface Reservation {
  date: string;
  time: string;
  email: string;
  phone: string;
  schoolName?: string;
  additionalInfo?: string;
  createdAt: string;
}

interface BlogPost {
  id: string;
  title: string;
  tags: string[];
  summary: string;
  content: string;
  author: string;
  date: string;
  image?: string;
}

interface Curriculum {
  id: string;
  title: string;
  level: string;
  duration: string;
  targetAudience: string;
  summary: string;
  modules: { title: string; desc: string }[];
}

interface ChangelogEntry {
  _id: string;
  action: string;
  category: "Reservations" | "Blogs" | "Curriculums" | "Changelogs" | "System";
  description: string;
  username: string;
  role: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface PortalUser {
  _id: string;
  username: string;
  role: "master" | "admin" | "editor" | "viewer" | "student";
  phone?: string;
  createdAt: string;
}

interface GalleryItem {
  id?: string;
  _id?: string;
  page: "labs" | "workshops";
  title?: string;
  alt?: string;
  src: string;
  tag?: string;
  addedBy?: string;
  createdAt?: string;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshBookedDates?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onRefreshBookedDates }) => {
  const [activeTab, setActiveTab] = useState<"reservations" | "blogs" | "curriculums" | "changelogs" | "users" | "gallery">("reservations");
  const [reservationSubTab, setReservationSubTab] = useState<"upcoming" | "past">("upcoming");

  // Window Layout & Position Modes (Center Floating, Fullscreen, Docked Right)
  type ModalViewMode = "floating" | "maximized" | "docked-right";
  const [viewMode, setViewMode] = useState<ModalViewMode>(() => {
    try {
      return (localStorage.getItem("cybotz_admin_modal_mode") as ModalViewMode) || "floating";
    } catch {
      return "floating";
    }
  });

  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== "floating") return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a") || target.closest("[role='button']")) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragPos.x,
      initY: dragPos.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setDragPos({
        x: dragStartRef.current.initX + dx,
        y: dragStartRef.current.initY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const switchViewMode = (newMode: ModalViewMode) => {
    setViewMode(newMode);
    try {
      localStorage.setItem("cybotz_admin_modal_mode", newMode);
    } catch (e) {
      console.error(e);
    }
  };

  const resetDragPosition = () => {
    setDragPos({ x: 0, y: 0 });
  };

  // User Authentication & Role State
  const [authToken, setAuthToken] = useState<string>(() => sessionStorage.getItem("owner_auth_token") || "");
  const [userRole, setUserRole] = useState<string>(() => sessionStorage.getItem("owner_auth_role") || "");
  const [currentUsername, setCurrentUsername] = useState<string>(() => sessionStorage.getItem("owner_auth_user") || "");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(sessionStorage.getItem("owner_auth_token")));
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Portal Account Creation (Registration) State
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [regUsername, setRegUsername] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regRole, setRegRole] = useState<"admin" | "editor" | "viewer">("admin");
  const [regStep, setRegStep] = useState<"form" | "otp">("form");
  const [regOtp, setRegOtp] = useState<string>("");
  const [isRequestingOtp, setIsRequestingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [regMessage, setRegMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Authenticated Users Management State (master & admin)
  const [usersList, setUsersList] = useState<PortalUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [modalRegUsername, setModalRegUsername] = useState<string>("");
  const [modalRegPassword, setModalRegPassword] = useState<string>("");
  const [modalRegRole, setModalRegRole] = useState<"admin" | "editor" | "viewer">("admin");
  const [modalRegStep, setModalRegStep] = useState<"form" | "otp">("form");
  const [modalRegOtp, setModalRegOtp] = useState<string>("");
  const [modalIsRequestingOtp, setModalIsRequestingOtp] = useState<boolean>(false);
  const [modalIsVerifyingOtp, setModalIsVerifyingOtp] = useState<boolean>(false);
  const [modalRegMessage, setModalRegMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [modalShowPassword, setModalShowPassword] = useState<boolean>(false);

  // Reservations State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [editingTimeDate, setEditingTimeDate] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState<string>("10:00 AM");
  const TIME_OPTIONS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM"
  ];
  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [selectedMonthToClear, setSelectedMonthToClear] = useState<string>(
    () => new Date().toLocaleString("default", { month: "long" })
  );

  // Blogs State
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogTags, setNewBlogTags] = useState("Robotics, Coding");
  const [newBlogSummary, setNewBlogSummary] = useState("");
  const [newBlogContent, setNewBlogContent] = useState("");
  const [newBlogAuthor, setNewBlogAuthor] = useState("Prasanna");
  const [newBlogImage, setNewBlogImage] = useState("");

  // Curriculums State
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [newCurrTitle, setNewCurrTitle] = useState("");
  const [newCurrLevel, setNewCurrLevel] = useState("Beginner");
  const [newCurrDuration, setNewCurrDuration] = useState("3 Months (12 Sessions)");
  const [newCurrTarget, setNewCurrTarget] = useState("Grades 5-8");
  const [newCurrSummary, setNewCurrSummary] = useState("");
  const [newCurrModuleTitle, setNewCurrModuleTitle] = useState("");
  const [newCurrModuleDesc, setNewCurrModuleDesc] = useState("");
  const [newCurrModules, setNewCurrModules] = useState<{ title: string; desc: string }[]>([]);

  // Gallery Management State (master, admin, editor)
  const [galleryPageTab, setGalleryPageTab] = useState<"labs" | "workshops">("labs");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState<boolean>(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState<string>("");
  const [newPhotoSrc, setNewPhotoSrc] = useState<string>("");
  const [newPhotoAlt, setNewPhotoAlt] = useState<string>("");
  const [newPhotoTag, setNewPhotoTag] = useState<string>("");
  const [newPhotoUploadData, setNewPhotoUploadData] = useState<string | null>(null);
  const [newPhotoFileName, setNewPhotoFileName] = useState<string>("");
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState<boolean>(false);
  const [isCompressingClientImage, setIsCompressingClientImage] = useState<boolean>(false);
  const [photoCompressionStats, setPhotoCompressionStats] = useState<{
    originalKb: number;
    sizeKb: number;
    savedPercent: string;
  } | null>(null);

  // Changelogs State (1-Year Auto-Retention)
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [changelogSearch, setChangelogSearch] = useState<string>("");
  const [changelogCategoryFilter, setChangelogCategoryFilter] = useState<string>("All");
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Master Changelog Editing State
  const [isEditingChangelog, setIsEditingChangelog] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogAction, setEditLogAction] = useState<string>("");
  const [editLogCategory, setEditLogCategory] = useState<"Reservations" | "Blogs" | "Curriculums" | "Changelogs" | "System">("System");
  const [editLogDescription, setEditLogDescription] = useState<string>("");
  const [editLogUsername, setEditLogUsername] = useState<string>("");
  const [isSavingLog, setIsSavingLog] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  // Confirmation Modal State (Task 13)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: (dontAskAgain?: boolean) => void;
    confirmText?: string;
    showDontAskAgain?: boolean;
  } | null>(null);
  const [dontAskAgainCheck, setDontAskAgainCheck] = useState<boolean>(false);
  const [skipLogDeleteConfirm, setSkipLogDeleteConfirm] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cybotz_skip_log_delete_confirm") === "true";
    } catch {
      return false;
    }
  });

  const fetchBookings = async (pinToUse?: string) => {
    const activePin = pinToUse || authToken;
    if (!activePin) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { "Authorization": `Bearer ${activePin}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
        setBookedDates(data.bookedDates || []);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("owner_auth_token");
        sessionStorage.removeItem("owner_auth_role");
        sessionStorage.removeItem("owner_auth_user");
        setAuthToken("");
        setUserRole("");
        setCurrentUsername("");
        setAuthError("Session expired or invalid credentials.");
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
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
      console.error("Failed to fetch curriculums:", err);
    }
  };

  const fetchChangelogs = async (pinToUse?: string) => {
    const activePin = pinToUse || authToken;
    if (!activePin) return;

    try {
      const res = await fetch("/api/admin/changelogs", {
        headers: { "Authorization": `Bearer ${activePin}` },
      });

      if (res.ok) {
        const data = await res.json();
        setChangelogs(data.changelogs || []);
        setIsAuthenticated(true);
        if (data.userRole) {
          setUserRole(data.userRole);
          sessionStorage.setItem("owner_auth_role", data.userRole);
        }
      } else if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("owner_auth_token");
        sessionStorage.removeItem("owner_auth_role");
        sessionStorage.removeItem("owner_auth_user");
        setAuthToken("");
        setUserRole("");
        setCurrentUsername("");
        setAuthError("Session expired or invalid credentials.");
      }
    } catch (err) {
      console.error("Failed to fetch changelogs:", err);
    }
  };

  const fetchUsers = async (tokenToUse?: string) => {
    const token = tokenToUse || authToken;
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const nonMasterUsers = (data.users || []).filter(
          (u: PortalUser) => u.role !== "master" && u.username.toLowerCase() !== "superman"
        );
        setUsersList(nonMasterUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const [isSyncingStudents, setIsSyncingStudents] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSyncStudents = async () => {
    setIsSyncingStudents(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch("/api/admin/students/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatusMsg(data.message || "Students synced successfully.");
        await fetchUsers();
      } else {
        setSyncStatusMsg(data.error || "Sync failed.");
      }
    } catch {
      setSyncStatusMsg("Network error during sync.");
    } finally {
      setIsSyncingStudents(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  const fetchGalleryPhotos = async (targetPage = galleryPageTab) => {
    setIsLoadingGallery(true);
    try {
      const res = await fetch(`/api/gallery?page=${targetPage}`);
      if (res.ok) {
        const data = await res.json();
        setGalleryItems(data.photos || []);
      }
    } catch (err) {
      console.error("Failed to fetch gallery photos:", err);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleAddGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoSrc.trim() && !newPhotoUploadData) {
      setMessage("Please enter an image path/URL or select an image file to upload.");
      return;
    }

    setIsSubmittingPhoto(true);
    setMessage(null);

    let finalSrc = newPhotoSrc.trim();

    try {
      if (newPhotoUploadData) {
        const uploadRes = await fetch("/api/admin/gallery/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            page: galleryPageTab,
            dataUrl: newPhotoUploadData,
            filename: newPhotoFileName || `photo_${Date.now()}`,
          }),
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalSrc = uploadData.src;
        } else {
          finalSrc = newPhotoUploadData;
        }
      }

      if (!finalSrc.startsWith("http://") && !finalSrc.startsWith("https://") && !finalSrc.startsWith("data:")) {
        finalSrc = finalSrc.replace(/\\/g, "/");
        if (!finalSrc.startsWith("/")) finalSrc = "/" + finalSrc;
      }

      const res = await fetch("/api/admin/gallery/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          page: galleryPageTab,
          src: finalSrc,
          title: newPhotoTitle.trim() || `Cybotz ${galleryPageTab} photo`,
          alt: newPhotoAlt.trim() || newPhotoTitle.trim(),
          tag: newPhotoTag.trim() || (galleryPageTab === "labs" ? "Labs" : "Workshops"),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGalleryItems(data.photos || []);
        setMessage(`Photo added to ${galleryPageTab} gallery successfully!`);
        setNewPhotoTitle("");
        setNewPhotoSrc("");
        setNewPhotoAlt("");
        setNewPhotoTag("");
        setNewPhotoUploadData(null);
        setNewPhotoFileName("");
        setPhotoCompressionStats(null);

        window.dispatchEvent(
          new CustomEvent("cybotz-gallery-updated", { detail: { page: galleryPageTab } })
        );
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to add photo.");
      }
    } catch (err: any) {
      setMessage("Error adding photo: " + (err.message || "Network failure"));
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const handleDeleteGalleryPhoto = async (photo: GalleryItem) => {
    const photoId = photo._id || photo.id;
    if (!photoId) return;

    if (!confirm(`Are you sure you want to remove "${photo.title || "this photo"}" from the ${galleryPageTab} gallery?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/gallery/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: photoId,
          page: galleryPageTab,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGalleryItems(data.photos || []);
        setMessage("Photo removed from gallery.");
        window.dispatchEvent(
          new CustomEvent("cybotz-gallery-updated", { detail: { page: galleryPageTab } })
        );
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to delete photo.");
      }
    } catch (err: any) {
      setMessage("Error deleting photo: " + (err.message || "Network error"));
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regUsername.trim()) {
      setRegMessage({ text: "Username is required.", isError: true });
      return;
    }
    if (regUsername.trim().length < 2) {
      setRegMessage({ text: "Username must be at least 2 characters.", isError: true });
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegMessage({ text: "Password must be at least 6 characters.", isError: true });
      return;
    }

    setIsRequestingOtp(true);
    setRegMessage(null);

    try {
      const res = await fetch("/api/admin/users/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          role: regRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegStep("otp");
        setRegMessage({ text: data.message || "Verification code generated.", isError: false });
      } else {
        setRegMessage({ text: data.error || "Failed to request verification code.", isError: true });
      }
    } catch (err) {
      setRegMessage({ text: "Network error requesting verification code.", isError: true });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regOtp.trim()) {
      setRegMessage({ text: "Please enter the 6-digit verification code.", isError: true });
      return;
    }

    setIsVerifyingOtp(true);
    setRegMessage(null);

    try {
      const res = await fetch("/api/admin/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          otp: regOtp.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthMode("login");
        setUsernameInput(regUsername.trim());
        setPasswordInput("");
        setAuthError(null);
        setRegStep("form");
        setRegUsername("");
        setRegPassword("");
        setRegOtp("");
        setRegMessage(null);
        setMessage(`Account created for "${data.username}" (${data.role})! Please sign in.`);
      } else {
        setRegMessage({ text: data.error || "Verification failed.", isError: true });
      }
    } catch (err) {
      setRegMessage({ text: "Network error verifying OTP.", isError: true });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleModalRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalRegUsername.trim()) {
      setModalRegMessage({ text: "Username is required.", isError: true });
      return;
    }
    if (modalRegUsername.trim().length < 2) {
      setModalRegMessage({ text: "Username must be at least 2 characters.", isError: true });
      return;
    }
    if (!modalRegPassword || modalRegPassword.length < 6) {
      setModalRegMessage({ text: "Password must be at least 6 characters.", isError: true });
      return;
    }

    setModalIsRequestingOtp(true);
    setModalRegMessage(null);

    try {
      const res = await fetch("/api/admin/users/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: modalRegUsername.trim(),
          password: modalRegPassword,
          role: modalRegRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setModalRegStep("otp");
        setModalRegMessage({ text: data.message || "Verification code generated.", isError: false });
      } else {
        setModalRegMessage({ text: data.error || "Failed to request code.", isError: true });
      }
    } catch (err) {
      setModalRegMessage({ text: "Network error requesting verification code.", isError: true });
    } finally {
      setModalIsRequestingOtp(false);
    }
  };

  const handleModalVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalRegOtp.trim()) {
      setModalRegMessage({ text: "Please enter the 6-digit verification code.", isError: true });
      return;
    }

    setModalIsVerifyingOtp(true);
    setModalRegMessage(null);

    try {
      const res = await fetch("/api/admin/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: modalRegUsername.trim(),
          otp: modalRegOtp.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUserModal(false);
        setModalRegStep("form");
        setModalRegUsername("");
        setModalRegPassword("");
        setModalRegOtp("");
        setModalRegMessage(null);
        setMessage(`New user "${data.username}" (${data.role}) created successfully.`);
        fetchUsers();
        fetchChangelogs();
      } else {
        setModalRegMessage({ text: data.error || "Verification failed.", isError: true });
      }
    } catch (err) {
      setModalRegMessage({ text: "Network error verifying OTP.", isError: true });
    } finally {
      setModalIsVerifyingOtp(false);
    }
  };

  const handleDeleteUser = (user: PortalUser) => {
    if (user.role === "master" || user.username === "Superman") {
      alert("The master administrator account cannot be deleted.");
      return;
    }

    setConfirmModal({
      title: `Delete User "${user.username}"`,
      message: `Are you sure you want to delete user "${user.username}" (${user.role})? They will immediately lose access to the portal.`,
      confirmText: "Delete User",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user._id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${authToken}` },
          });
          const data = await res.json();
          if (res.ok) {
            setMessage(data.message || `User "${user.username}" deleted.`);
            const nonMasterUsers = (data.users || []).filter(
              (u: PortalUser) => u.role !== "master" && u.username.toLowerCase() !== "superman"
            );
            setUsersList(nonMasterUsers);
            fetchChangelogs();
          } else {
            alert(data.error || "Failed to delete user.");
          }
        } catch (err) {
          alert("Error deleting user.");
        }
      },
    });
  };

  useEffect(() => {
    if (isOpen) {
      const savedPin = sessionStorage.getItem("owner_auth_token");
      const savedRole = sessionStorage.getItem("owner_auth_role");
      const savedUser = sessionStorage.getItem("owner_auth_user");
      if (savedPin) {
        setAuthToken(savedPin);
        if (savedRole) setUserRole(savedRole);
        if (savedUser) setCurrentUsername(savedUser);
        fetchBookings(savedPin);
        fetchChangelogs(savedPin);
        if (savedRole === "master" || savedRole === "admin") {
          fetchUsers(savedPin);
        }
      } else {
        setIsAuthenticated(false);
      }
      fetchBlogs();
      fetchCurriculums();
    }
  }, [isOpen]);

  const handleClose = () => {
    handleLogout();
    onClose();
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError("Please enter your username and password.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("owner_auth_token", data.token);
        sessionStorage.setItem("owner_auth_role", data.role || "");
        sessionStorage.setItem("owner_auth_user", data.username || "");
        setAuthToken(data.token);
        setUserRole(data.role || "");
        setCurrentUsername(data.username || "");
        setIsAuthenticated(true);
        setUsernameInput("");
        setPasswordInput("");
        fetchBookings(data.token);
        fetchChangelogs(data.token);
        if (data.role === "master" || data.role === "admin") {
          fetchUsers(data.token);
        }
      } else {
        setAuthError(data.error || "Invalid username or password.");
      }
    } catch (err) {
      setAuthError("Network error verifying credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("owner_auth_token");
    sessionStorage.removeItem("owner_auth_role");
    sessionStorage.removeItem("owner_auth_user");
    setAuthToken("");
    setUserRole("");
    setCurrentUsername("");
    setIsAuthenticated(false);
    setReservations([]);
    setBookedDates([]);
    setUsersList([]);
    setAuthMode("login");
    setRegStep("form");
    setRegMessage(null);
  };

  const isPastDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today;
  };

  const handleStartEditTime = (r: Reservation) => {
    setEditingTimeDate(r.date);
    setEditingTimeValue(r.time || "10:00 AM");
  };

  const handleSaveBookingTime = async (date: string) => {
    // Optimistic update
    const prevReservations = [...reservations];
    setReservations((prev) =>
      prev.map((r) => (r.date === date ? { ...r, time: editingTimeValue } : r))
    );

    try {
      const res = await fetch("/api/admin/edit-booking-time", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ date, time: editingTimeValue }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Reservation time for "${date}" updated to ${editingTimeValue}!`);
        setReservations(data.reservations || []);
        setBookedDates(data.bookedDates || []);
        setEditingTimeDate(null);
        fetchChangelogs();
        window.dispatchEvent(new Event("booked-dates-updated"));
        if (onRefreshBookedDates) onRefreshBookedDates();
      } else {
        setReservations(prevReservations);
        alert(data.error || "Failed to update reservation time.");
      }
    } catch (err) {
      setReservations(prevReservations);
      alert("Error updating reservation time.");
    }
  };

  const handleCancelBooking = (date: string) => {
    setConfirmModal({
      title: "Cancel Reservation",
      message: `Are you sure you want to cancel the reservation for "${date}"? This will unblock the date for new client bookings.`,
      confirmText: "Cancel Reservation",
      onConfirm: async () => {
        // Optimistic update
        const prevReservations = [...reservations];
        const prevBookedDates = [...bookedDates];
        setReservations((prev) => prev.filter((r) => r.date !== date));
        setBookedDates((prev) => prev.filter((d) => d !== date));

        try {
          const res = await fetch("/api/admin/cancel-booking", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({ date }),
          });

          const data = await res.json();
          if (res.ok) {
            setMessage(`Reservation for "${date}" canceled! Date is now unblocked.`);
            setReservations(data.reservations || []);
            setBookedDates(data.bookedDates || []);
            fetchChangelogs();
            window.dispatchEvent(new Event("booked-dates-updated"));
            if (onRefreshBookedDates) onRefreshBookedDates();
          } else {
            setReservations(prevReservations);
            setBookedDates(prevBookedDates);
            alert(data.error || "Failed to cancel booking.");
          }
        } catch (err) {
          setReservations(prevReservations);
          setBookedDates(prevBookedDates);
          alert("Error connecting to server.");
        }
      },
    });
  };

  const handleClearMonth = () => {
    setConfirmModal({
      title: `Clear ${selectedMonthToClear} Reservations`,
      message: `Are you sure you want to CLEAR all reservations for ${selectedMonthToClear}? This will unblock all dates in this month.`,
      confirmText: "Clear All In Month",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/clear-month", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({ month: selectedMonthToClear }),
          });
          const data = await res.json();
          if (res.ok) {
            setMessage(data.message || `Reservations for ${selectedMonthToClear} cleared!`);
            setReservations(data.reservations || []);
            setBookedDates(data.bookedDates || []);
            fetchChangelogs();
            window.dispatchEvent(new Event("booked-dates-updated"));
            if (onRefreshBookedDates) onRefreshBookedDates();
          } else {
            alert(data.error || "Failed to clear month.");
          }
        } catch (err) {
          alert("Error clearing month's reservations.");
        }
      },
    });
  };

  // Blog Handlers
  const handleStartEditBlog = (b: BlogPost) => {
    setEditingBlogId((b as any).id || (b as any)._id);
    setNewBlogTitle(b.title);
    setNewBlogTags(b.tags ? b.tags.join(", ") : "Robotics, Coding");
    setNewBlogSummary(b.summary);
    setNewBlogContent(b.content);
    setNewBlogAuthor(b.author);
    setNewBlogImage(b.image || "");
    setMessage(`Editing "${b.title}". Make changes and click "Save & Update Blog".`);
  };

  const handleCancelEditBlog = () => {
    setEditingBlogId(null);
    setNewBlogTitle("");
    setNewBlogSummary("");
    setNewBlogContent("");
    setNewBlogImage("");
    setMessage(null);
  };

  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlogTitle || !newBlogSummary || !newBlogContent) {
      alert("Please fill in title, summary, and article content.");
      return;
    }

    const rawImage = newBlogImage.replace(/\\/g, "/").replace(/^["']+|["']+$/g, "").trim();
    const cleanImage = rawImage && !rawImage.startsWith("/") && !rawImage.startsWith("http") ? `/${rawImage}` : rawImage;

    const endpoint = editingBlogId ? "/api/admin/edit-blog" : "/api/admin/add-blog";
    const payload = {
      ...(editingBlogId ? { id: editingBlogId } : {}),
      title: newBlogTitle,
      tags: newBlogTags.split(",").map((t) => t.trim()),
      summary: newBlogSummary,
      content: newBlogContent,
      author: newBlogAuthor,
      image: cleanImage,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingBlogId ? "Blog updated successfully!" : "New blog published successfully!");
        setBlogs(data.blogs || []);
        handleCancelEditBlog();
        fetchChangelogs();
        window.dispatchEvent(new Event("blogs-updated"));
      } else {
        alert(data.error || "Failed to save blog.");
      }
    } catch (err) {
      alert("Error saving blog.");
    }
  };

  const handleDeleteBlog = (id: string) => {
    setConfirmModal({
      title: "Delete Blog Post",
      message: "Are you sure you want to permanently delete this blog article?",
      confirmText: "Delete Blog",
      onConfirm: async () => {
        const prevBlogs = [...blogs];
        setBlogs((prev) => prev.filter((b) => b.id !== id));

        try {
          const res = await fetch("/api/admin/delete-blog", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({ id }),
          });
          const data = await res.json();
          if (res.ok) {
            setBlogs(data.blogs || []);
            setMessage("Blog deleted successfully.");
            fetchChangelogs();
            window.dispatchEvent(new Event("blogs-updated"));
          } else {
            setBlogs(prevBlogs);
            alert(data.error || "Failed to delete blog.");
          }
        } catch (err) {
          setBlogs(prevBlogs);
          alert("Error deleting blog.");
        }
      },
    });
  };

  // Curriculum Handlers
  const handleAddModule = () => {
    if (!newCurrModuleTitle) return;
    setNewCurrModules([...newCurrModules, { title: newCurrModuleTitle.trim(), desc: newCurrModuleDesc.trim() }]);
    setNewCurrModuleTitle("");
    setNewCurrModuleDesc("");
  };

  const handleAddCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrTitle || !newCurrSummary) {
      alert("Please fill in course title and summary.");
      return;
    }

    try {
      const res = await fetch("/api/admin/add-curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: newCurrTitle,
          level: newCurrLevel,
          duration: newCurrDuration,
          targetAudience: newCurrTarget,
          summary: newCurrSummary,
          modules: newCurrModules,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("New course curriculum published!");
        setCurriculums(data.curriculums || []);
        setNewCurrTitle("");
        setNewCurrSummary("");
        setNewCurrModules([]);
        fetchChangelogs();
        window.dispatchEvent(new Event("curriculums-updated"));
      } else {
        alert(data.error || "Failed to publish curriculum.");
      }
    } catch (err) {
      alert("Error publishing curriculum.");
    }
  };

  const handleDeleteCurriculum = (id: string) => {
    setConfirmModal({
      title: "Delete Curriculum",
      message: "Are you sure you want to permanently delete this course curriculum?",
      confirmText: "Delete Curriculum",
      onConfirm: async () => {
        const prevCurrs = [...curriculums];
        setCurriculums((prev) => prev.filter((c) => c.id !== id));

        try {
          const res = await fetch("/api/admin/delete-curriculum", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({ id }),
          });
          const data = await res.json();
          if (res.ok) {
            setCurriculums(data.curriculums || []);
            setMessage("Curriculum deleted successfully.");
            fetchChangelogs();
            window.dispatchEvent(new Event("curriculums-updated"));
          } else {
            setCurriculums(prevCurrs);
            alert(data.error || "Failed to delete curriculum.");
          }
        } catch (err) {
          setCurriculums(prevCurrs);
          alert("Error deleting curriculum.");
        }
      },
    });
  };

  // Master Changelog Actions
  const handleOpenEditLog = (log: ChangelogEntry) => {
    setEditingLogId(log._id);
    setEditLogAction(log.action);
    setEditLogCategory(log.category);
    setEditLogDescription(log.description);
    setEditLogUsername(log.username);
    setIsEditingChangelog(true);
  };

  const handleSaveEditedLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogId) return;

    setIsSavingLog(true);
    try {
      const res = await fetch(`/api/admin/changelogs/${editingLogId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: editLogAction,
          category: editLogCategory,
          description: editLogDescription,
          username: editLogUsername,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Changelog entry updated successfully!");
        setChangelogs(data.changelogs || []);
        setIsEditingChangelog(false);
        setEditingLogId(null);
      } else {
        alert(data.error || "Failed to update changelog entry.");
      }
    } catch (err) {
      alert("Error updating changelog entry.");
    } finally {
      setIsSavingLog(false);
    }
  };

  const executeDeleteLog = async (id: string) => {
    const prevLogs = [...changelogs];
    setChangelogs((prev) => prev.filter((l) => l._id !== id));

    try {
      const res = await fetch(`/api/admin/changelogs/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Changelog record deleted.");
        setChangelogs(data.changelogs || []);
      } else {
        setChangelogs(prevLogs);
        alert(data.error || "Failed to delete changelog.");
      }
    } catch (err) {
      setChangelogs(prevLogs);
      alert("Error deleting changelog.");
    }
  };

  const handleDeleteLog = (id: string) => {
    if (skipLogDeleteConfirm) {
      executeDeleteLog(id);
      return;
    }

    setConfirmModal({
      title: "Delete Changelog Record",
      message: "Are you sure you want to delete this changelog entry? This change is permanent.",
      confirmText: "Delete Log",
      showDontAskAgain: true,
      onConfirm: async (dontAskAgain?: boolean) => {
        if (dontAskAgain) {
          setSkipLogDeleteConfirm(true);
          try {
            localStorage.setItem("cybotz_skip_log_delete_confirm", "true");
          } catch (e) {
            console.error(e);
          }
        }
        await executeDeleteLog(id);
      },
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] animate-fade-in ${
        viewMode === "docked-right"
          ? "bg-black/60 backdrop-blur-sm flex justify-end"
          : viewMode === "maximized"
          ? "p-2 sm:p-4 bg-black/85 backdrop-blur-md flex flex-col"
          : "flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      }`}
    >
      <div
        style={
          viewMode === "floating"
            ? { transform: `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` }
            : undefined
        }
        className={`relative flex flex-col bg-[#090D16] font-mono text-white overflow-hidden shadow-2xl transition-all ${
          viewMode === "docked-right"
            ? "w-full sm:w-[720px] max-w-full h-full rounded-l-2xl border-l border-y-0 border-r-0 border-cyan-500/40"
            : viewMode === "maximized"
            ? "w-full h-full rounded-2xl border border-cyan-500/40"
            : `w-full ${
                isAuthenticated
                  ? "max-w-4xl h-[78vh] max-h-[720px] min-h-[480px]"
                  : "max-w-md"
              } rounded-2xl border border-cyan-500/30 ${
                isDragging
                  ? "ring-2 ring-cyan-400 shadow-[0_0_35px_rgba(0,240,255,0.4)]"
                  : ""
              }`
        }`}
      >

        {/* Modal Header */}
        <div
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={() => {
            switchViewMode(viewMode === "maximized" ? "floating" : "maximized");
          }}
          className={`flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-b border-cyan-500/20 shrink-0 select-none ${
            viewMode === "floating" ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          title={
            viewMode === "floating"
              ? "Click and drag to move window • Double-click to maximize"
              : "Double-click to restore window"
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            {viewMode === "floating" && (
              <div
                className="hidden sm:flex items-center text-gray-500 hover:text-cyan-400 transition-colors cursor-grab"
                title="Drag Window"
              >
                <GripHorizontal size={16} />
              </div>
            )}
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-wide text-cyan-300 truncate">
                  Bossman & gng Access Portal
                </h2>
                {isAuthenticated && (
                  userRole === "master" || userRole === "editor" ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                      <Edit3 size={12} className="text-emerald-400" />
                      EDITOR: {currentUsername || "Superman"}
                    </span>
                  ) : userRole === "admin" ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <ShieldCheck size={12} className="text-cyan-400" />
                      ADMIN: {currentUsername || "Prasanna"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-gray-300 text-[11px]">
                      <Eye size={12} className="text-gray-400" />
                      VIEWER: {currentUsername}
                    </span>
                  )
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                Manage reservations, blogs, curriculums, and audit logs
              </p>
            </div>
          </div>

          {/* Window Control Controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {/* Reset Drag Position if moved in floating mode */}
            {viewMode === "floating" && (dragPos.x !== 0 || dragPos.y !== 0) && (
              <button
                type="button"
                onClick={resetDragPosition}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] transition-colors cursor-pointer border border-cyan-500/20"
                title="Reset window to center"
              >
                <RotateCcw size={12} />
                <span className="hidden md:inline">Center</span>
              </button>
            )}

            {/* Mode 1: Floating / Center Draggable Toggle */}
            <button
              type="button"
              onClick={() => switchViewMode("floating")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "floating"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  : "text-gray-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Center Draggable Window"
            >
              <Move size={15} />
            </button>

            {/* Mode 2: Dock Right / Side Drawer Toggle */}
            <button
              type="button"
              onClick={() => switchViewMode("docked-right")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "docked-right"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  : "text-gray-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Dock to Right (Side Drawer)"
            >
              <PanelRight size={15} />
            </button>

            {/* Mode 3: Maximize / Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => switchViewMode(viewMode === "maximized" ? "floating" : "maximized")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "maximized"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  : "text-gray-400 hover:text-white hover:bg-slate-800"
              }`}
              title={viewMode === "maximized" ? "Restore Window" : "Maximize / Fullscreen"}
            >
              {viewMode === "maximized" ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-1" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close Portal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* LOCKED SCREEN */}
        {!isAuthenticated ? (
          <div className="flex-1 min-h-0 flex flex-col justify-center items-center p-6 sm:p-8 overflow-y-auto">
            <div className="w-full max-w-md mx-auto text-center space-y-5 my-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock size={28} />
              </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {authMode === "login" ? "Security Verification" : "Create Account"}
              </h3>
              <p className="text-xs text-gray-400">
                {authMode === "login"
                  ? "Please enter your credentials to access management controls."
                  : "Set up a portal account."}
              </p>
            </div>

            {/* Toggle between Sign In and Create Account */}
            <div className="flex items-center justify-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setRegMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                  setRegMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === "register"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* MODE 1: SIGN IN */}
            {authMode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          passwordInputRef.current?.focus();
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-sm text-cyan-300 placeholder-gray-600 outline-none transition-all font-mono"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPin ? "text" : "password"}
                        placeholder="Password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full pl-4 pr-12 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-sm text-cyan-300 placeholder-gray-600 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer bg-transparent border-none"
                      >
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingIn ? "Authenticating..." : "Login & Unlock Portal"}
                </button>
              </form>
            )}

            {/* MODE 2: CREATE ACCOUNT */}
            {authMode === "register" && (
              <div className="space-y-4 text-left">
                {regStep === "form" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                        <input
                          type="text"
                          placeholder="Choose username"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-sm text-cyan-300 placeholder-gray-600 outline-none transition-all font-mono"
                          required
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showRegPassword ? "text" : "password"}
                            placeholder="Set password (min. 6 characters)"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-4 pr-12 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-sm text-cyan-300 placeholder-gray-600 outline-none transition-all font-mono"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer bg-transparent border-none"
                          >
                            {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-400">Role</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["admin", "editor", "viewer"] as const).map((r) => {
                            const label = r === "admin" ? "Admin" : r === "editor" ? "Editor" : "Viewer";
                            const isSelected = regRole === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRegRole(r)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                                    : "bg-slate-900 border border-slate-800 text-gray-400 hover:text-white"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {regMessage && (
                      <div className={`p-3 rounded-lg text-xs ${
                        regMessage.isError
                          ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      }`}>
                        {regMessage.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isRequestingOtp}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer"
                    >
                      {isRequestingOtp ? "Sending OTP..." : "Send Verification Code"}
                    </button>
                  </form>
                ) : (
                  /* Step 2: OTP Entry */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs text-center space-y-1">
                      <p className="font-bold">Verification Code Sent</p>
                      <p className="text-[11px] text-gray-400">
                        Enter the 6-digit verification code to complete account setup.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 text-center">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-center text-xl tracking-[0.5em] text-cyan-300 font-mono outline-none transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    {regMessage && (
                      <div className={`p-3 rounded-lg text-xs ${
                        regMessage.isError
                          ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      }`}>
                        {regMessage.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isVerifyingOtp || regOtp.length !== 6}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer"
                    >
                      {isVerifyingOtp ? "Verifying..." : "Confirm & Create Account"}
                    </button>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRegStep("form");
                          setRegOtp("");
                          setRegMessage(null);
                        }}
                        className="text-cyan-400 hover:underline cursor-pointer bg-transparent border-none"
                      >
                        Change Details
                      </button>
                      <button
                        type="button"
                        disabled={isRequestingOtp}
                        onClick={() => handleRequestOtp()}
                        className="text-cyan-400 hover:underline cursor-pointer bg-transparent border-none disabled:opacity-50"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            </div>
          </div>
        ) : (
          /* AUTHENTICATED DASHBOARD */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header Notifications & Tab Switcher Bar - Pinned at top */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-800 bg-slate-900/40 shrink-0 space-y-3">
              {message && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
                  <CheckCircle2 size={16} />
                  <span>{message}</span>
                </div>
              )}

              {/* TAB SWITCHER */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("reservations")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "reservations"
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <Calendar size={14} />
                    Reservations ({bookedDates.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("blogs")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "blogs"
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <BookOpen size={14} />
                    Manage Blogs ({blogs.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("curriculums")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "curriculums"
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <GraduationCap size={14} />
                    Curriculums ({curriculums.length})
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("changelogs");
                      fetchChangelogs();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "changelogs"
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <History size={14} />
                    Changelogs ({changelogs.length})
                  </button>

                  {(userRole === "master" || userRole === "admin" || userRole === "editor") && (
                    <button
                      onClick={() => {
                        setActiveTab("gallery");
                        fetchGalleryPhotos();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === "gallery"
                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                          : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      <ImageIcon size={14} />
                      Gallery Photos
                    </button>
                  )}

                  {(userRole === "master" || userRole === "admin") && (
                    <button
                      onClick={() => {
                        setActiveTab("users");
                        fetchUsers();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === "users"
                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                          : "bg-slate-900 text-gray-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      <Users size={14} />
                      Users ({usersList.filter((u) => u.role !== "master" && u.username.toLowerCase() !== "superman").length})
                    </button>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-gray-400 transition-all cursor-pointer"
                  title="Lock Portal"
                >
                  <LogOut size={14} />
                  Lock
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content Area */}
            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-6">

            {/* TAB 1: RESERVATIONS */}
            {activeTab === "reservations" && (() => {
              const upcomingList = reservations.filter((r) => !isPastDate(r.date));
              const pastList = reservations.filter((r) => isPastDate(r.date));
              const currentList = reservationSubTab === "upcoming" ? upcomingList : pastList;

              return (
                <div className="space-y-4">
                  {/* Top Bar with Sub-tabs, Counts & Refresh */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {/* Sub-tab Switcher: Upcoming vs Past (Priority 3) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReservationSubTab("upcoming")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${reservationSubTab === "upcoming"
                            ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                            : "bg-slate-800 text-gray-400 hover:text-white"
                          }`}
                      >
                        <Calendar size={13} />
                        Upcoming ({upcomingList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setReservationSubTab("past")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${reservationSubTab === "past"
                            ? "bg-purple-500 text-slate-950 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                            : "bg-slate-800 text-gray-400 hover:text-white"
                          }`}
                      >
                        <History size={13} />
                        Past Events ({pastList.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => fetchBookings()}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer"
                        title="Refresh reservations list"
                      >
                        <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                      </button>

                      {bookedDates.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <select
                            value={selectedMonthToClear}
                            onChange={(e) => setSelectedMonthToClear(e.target.value)}
                            className="bg-transparent text-xs text-cyan-300 font-mono outline-none px-2 py-1 border-none cursor-pointer"
                          >
                            {monthsList.map((m) => (
                              <option key={m} value={m} className="bg-slate-900 text-white">
                                {m}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleClearMonth}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 border border-rose-500/30 transition-all cursor-pointer font-bold"
                            title={`Clear all reservations for ${selectedMonthToClear}`}
                          >
                            <Trash2 size={13} />
                            Clear Month
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {currentList.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                      {reservationSubTab === "upcoming" ? (
                        <>
                          <Calendar size={32} className="mx-auto mb-2 text-gray-600" />
                          <p className="text-sm text-gray-400">No upcoming reservations.</p>
                          <p className="text-xs text-gray-500 mt-1">All future dates are currently available for client bookings.</p>
                        </>
                      ) : (
                        <>
                          <History size={32} className="mx-auto mb-2 text-gray-600" />
                          <p className="text-sm text-gray-400">No past events recorded yet.</p>
                          <p className="text-xs text-gray-500 mt-1">Completed trial sessions will automatically archive here.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentList.map((r, i) => {
                        const isPast = isPastDate(r.date);
                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isPast
                                ? "bg-slate-900/40 border-slate-800/80 hover:border-purple-500/30 opacity-90 hover:opacity-100"
                                : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/40"
                              }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className={`flex items-center gap-1.5 font-bold text-sm ${isPast ? "text-purple-300" : "text-cyan-300"}`}>
                                  <Calendar size={16} />
                                  <span>{r.date}</span>
                                  <span className="text-xs font-normal text-gray-400">@ {r.time}</span>
                                </div>
                                {isPast ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                                    <CheckCircle size={10} /> Completed / Past Event
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                                    Active Booking
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-1">
                                {r.schoolName && (
                                  <span className="flex items-center gap-1">
                                    <Building size={12} className={isPast ? "text-purple-400" : "text-cyan-400"} />
                                    {r.schoolName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Mail size={12} className={isPast ? "text-purple-400" : "text-cyan-400"} />
                                  {r.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone size={12} className={isPast ? "text-purple-400" : "text-cyan-400"} />
                                  {r.phone}
                                </span>
                              </div>
                              {r.additionalInfo && (
                                <p className="text-xs text-gray-500 italic mt-1 font-sans">"{r.additionalInfo}"</p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                              {!isPast && (
                                editingTimeDate === r.date ? (
                                  <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/40 rounded-lg p-1">
                                    <select
                                      value={editingTimeValue}
                                      onChange={(e) => setEditingTimeValue(e.target.value)}
                                      className="bg-transparent text-xs text-cyan-300 font-mono outline-none px-2 py-1 border-none cursor-pointer"
                                    >
                                      {TIME_OPTIONS.map((t) => (
                                        <option key={t} value={t} className="bg-slate-900 text-white">
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleSaveBookingTime(r.date)}
                                      className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all font-mono"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingTimeDate(null)}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-400 text-xs cursor-pointer font-mono"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditTime(r)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all cursor-pointer font-mono"
                                    title="Reschedule or update reservation time"
                                  >
                                    <Clock size={14} />
                                    Edit Time
                                  </button>
                                )
                              )}

                              <button
                                onClick={() => handleCancelBooking(r.date)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-all cursor-pointer font-mono"
                                title={isPast ? "Remove past record from history" : "Cancel and unblock this reservation date"}
                              >
                                <Trash2 size={14} />
                                {isPast ? "Remove Record" : "Cancel Booking"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 2: MANAGE BLOGS */}
            {activeTab === "blogs" && (
              <div className="space-y-6">
                {/* Add / Edit Blog Form */}
                <form onSubmit={handleAddBlog} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                      {editingBlogId ? <Edit3 size={16} /> : <PlusCircle size={16} />}
                      {editingBlogId ? "Edit Blog Article" : "Publish New Blog Guide"}
                    </h4>
                    {editingBlogId && (
                      <button
                        type="button"
                        onClick={handleCancelEditBlog}
                        className="text-xs text-rose-400 hover:underline cursor-pointer font-mono"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Blog Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Build an Autonomous Rover"
                        value={newBlogTitle}
                        onChange={(e) => setNewBlogTitle(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Tags (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="Robotics, Hardware, Python"
                        value={newBlogTags}
                        onChange={(e) => setNewBlogTags(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Summary (Short Preview) *</label>
                    <input
                      type="text"
                      placeholder="Brief overview of the article..."
                      value={newBlogSummary}
                      onChange={(e) => setNewBlogSummary(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Full Content * (Auto-formats code blocks ```, headers #, and bullet lists -)
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Write full article text and step-by-step code here..."
                      value={newBlogContent}
                      onChange={(e) => setNewBlogContent(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-gray-300 outline-none focus:border-cyan-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Author Name</label>
                      <input
                        type="text"
                        placeholder="Prasanna"
                        value={newBlogAuthor}
                        onChange={(e) => setNewBlogAuthor(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Image URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. /images/drone_cover.png"
                        value={newBlogImage}
                        onChange={(e) => setNewBlogImage(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-cyan-400 transition-all cursor-pointer"
                    >
                      {editingBlogId ? "Save & Update Blog" : "Publish Blog Article"}
                    </button>
                    {editingBlogId && (
                      <button
                        type="button"
                        onClick={handleCancelEditBlog}
                        className="px-4 py-2.5 bg-slate-800 text-gray-300 font-bold rounded-lg text-xs hover:bg-slate-700 transition-all cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>

                {/* Published Blogs List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Published Blogs ({blogs.length})</h4>
                  {blogs.map((b: any) => {
                    const bId = b.id || b._id;
                    return (
                      <div key={bId} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-cyan-300 truncate">{b.title}</h5>
                          <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-1 truncate">{b.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEditBlog(b)}
                            className="px-2.5 py-1.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1 font-mono text-[11px] shrink-0"
                            title="Edit this blog post"
                          >
                            <Edit3 size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBlog(bId)}
                            className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shrink-0"
                            title="Delete this blog post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: MANAGE CURRICULUMS */}
            {activeTab === "curriculums" && (
              <div className="space-y-6">
                {/* Add New Curriculum Form */}
                <form onSubmit={handleAddCurriculum} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    <PlusCircle size={16} /> Add New Course Curriculum
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Course Title *</label>
                      <input
                        type="text"
                        placeholder="Level 4: Advanced Autonomous Swarms"
                        value={newCurrTitle}
                        onChange={(e) => setNewCurrTitle(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Expertise Level</label>
                      <select
                        value={newCurrLevel}
                        onChange={(e) => setNewCurrLevel(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Duration *</label>
                      <input
                        type="text"
                        placeholder="6 Months (24 Sessions)"
                        value={newCurrDuration}
                        onChange={(e) => setNewCurrDuration(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Target Audience</label>
                      <input
                        type="text"
                        placeholder="High School / Universities"
                        value={newCurrTarget}
                        onChange={(e) => setNewCurrTarget(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Course Summary *</label>
                    <input
                      type="text"
                      placeholder="Course goals and learning outcomes..."
                      value={newCurrSummary}
                      onChange={(e) => setNewCurrSummary(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  {/* Add Modules */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <label className="text-xs text-gray-400 block font-bold">Add Syllabus Module</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Module Title (e.g. Module 1: Physics)"
                        value={newCurrModuleTitle}
                        onChange={(e) => setNewCurrModuleTitle(e.target.value)}
                        className="w-1/2 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-cyan-300"
                      />
                      <input
                        type="text"
                        placeholder="Module Description"
                        value={newCurrModuleDesc}
                        onChange={(e) => setNewCurrModuleDesc(e.target.value)}
                        className="w-1/2 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-cyan-300"
                      />
                      <button
                        type="button"
                        onClick={handleAddModule}
                        className="px-3 py-2 bg-cyan-500 text-slate-950 font-bold rounded text-xs"
                      >
                        Add
                      </button>
                    </div>
                    {newCurrModules.length > 0 && (
                      <div className="text-[11px] text-cyan-400 space-y-1 mt-2">
                        {newCurrModules.map((m, idx) => (
                          <div key={idx}>• {m.title}: {m.desc}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-cyan-400 transition-all cursor-pointer"
                  >
                    Publish Course Curriculum
                  </button>
                </form>

                {/* Published Curriculums List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Course Curriculums ({curriculums.length})</h4>
                  {curriculums.map((c: any) => {
                    const cId = c.id || c._id;
                    return (
                      <div key={cId} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-cyan-300 truncate">{c.title} <span className="text-[10px] text-gray-400 font-normal">({c.duration})</span></h5>
                          <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-1 truncate">{c.summary}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCurriculum(cId)}
                          className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shrink-0"
                          title="Delete curriculum"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOGS & CHANGELOGS (1-Year Auto-Retention) */}
            {activeTab === "changelogs" && (() => {
              const filteredChangelogs = changelogs.filter((log) => {
                const matchCategory = changelogCategoryFilter === "All" || log.category === changelogCategoryFilter;
                const matchSearch = !changelogSearch.trim() ||
                  (log.description && log.description.toLowerCase().includes(changelogSearch.toLowerCase())) ||
                  (log.action && log.action.toLowerCase().includes(changelogSearch.toLowerCase())) ||
                  (log.username && log.username.toLowerCase().includes(changelogSearch.toLowerCase())) ||
                  (log.category && log.category.toLowerCase().includes(changelogSearch.toLowerCase()));
                return matchCategory && matchSearch;
              });

              const getCategoryColor = (cat: string) => {
                switch (cat) {
                  case "Reservations": return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                  case "Blogs": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                  case "Curriculums": return "bg-purple-500/15 text-purple-300 border-purple-500/30";
                  case "Changelogs": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
                  default: return "bg-slate-700/40 text-slate-300 border-slate-600";
                }
              };

              const getRoleBadge = (role: string) => {
                switch (role) {
                  case "master":
                  case "editor":
                    return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">editor</span>;
                  case "admin":
                    return <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">admin</span>;
                  default:
                    return <span className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 border border-slate-700 text-[10px]">{role}</span>;
                }
              };

              return (
                <div className="space-y-4">
                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {["All", "Reservations", "Blogs", "Curriculums"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setChangelogCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            changelogCategoryFilter === cat
                              ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                              : "bg-slate-800 text-gray-400 hover:text-white"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={changelogSearch}
                          onChange={(e) => setChangelogSearch(e.target.value)}
                          className="pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg text-xs text-cyan-300 placeholder-gray-500 outline-none w-40 sm:w-56 font-mono"
                        />
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      </div>

                      <button
                        onClick={() => fetchChangelogs()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer"
                        title="Refresh changelogs"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Log Entries List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-1">
                      <span>Log Records ({filteredChangelogs.length})</span>
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                        {skipLogDeleteConfirm && (
                          <button
                            type="button"
                            onClick={() => {
                              setSkipLogDeleteConfirm(false);
                              try {
                                localStorage.removeItem("cybotz_skip_log_delete_confirm");
                              } catch (e) {}
                              setMessage("Delete confirmation prompt re-enabled.");
                            }}
                            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer font-sans"
                            title="Reset delete confirmation preferences"
                          >
                            Re-enable delete prompt
                          </button>
                        )}
                        <span>Auto-expires after 1 year</span>
                      </div>
                    </div>

                    {filteredChangelogs.length === 0 ? (
                      <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                        <History size={28} className="mx-auto text-gray-600" />
                        <p className="text-xs text-gray-400">No changelog entries found matching your filter.</p>
                      </div>
                    ) : (
                      filteredChangelogs.map((log) => {
                        const isExpanded = expandedDetailsId === log._id;
                        const hasDetails = log.details && Object.keys(log.details).length > 0;
                        const dateFormatted = new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={log._id}
                            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getCategoryColor(log.category)}`}>
                                  {log.category}
                                </span>
                                <span className="font-mono font-bold text-cyan-300 tracking-wider">
                                  {log.action}
                                </span>
                                <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                                  <span>by</span>
                                  <span className="text-white font-semibold">{log.username}</span>
                                  {getRoleBadge(log.role)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                                  <Clock size={12} />
                                  {dateFormatted}
                                </span>

                                {/* Master Edit/Delete controls */}
                                {userRole === "master" && (
                                  <div className="flex items-center gap-1 ml-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditLog(log)}
                                      className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                                      title="Edit this log entry"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLog(log._id)}
                                      className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                                      title="Delete this log entry"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <p className="text-gray-300 font-sans text-xs leading-relaxed">
                              {log.description}
                            </p>

                            {hasDetails && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedDetailsId(isExpanded ? null : log._id)}
                                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                >
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  <span>{isExpanded ? "Hide Metadata" : "View Metadata Details"}</span>
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-cyan-200 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Master Edit Modal */}
                  {isEditingChangelog && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
                      <div className="relative w-full max-w-lg bg-[#0B101D] border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] text-white space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Edit3 size={18} className="text-emerald-400" />
                            <h4 className="text-sm font-bold text-emerald-300">Edit Changelog Record</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingChangelog(false)}
                            className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditedLog} className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-gray-400 font-bold mb-1">Action Name</label>
                              <input
                                type="text"
                                value={editLogAction}
                                onChange={(e) => setEditLogAction(e.target.value)}
                                className="w-full p-2 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded text-amber-300 font-mono"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-gray-400 font-bold mb-1">Category</label>
                              <select
                                value={editLogCategory}
                                onChange={(e) => setEditLogCategory(e.target.value as any)}
                                className="w-full p-2 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded text-amber-300 font-mono"
                              >
                                <option value="Reservations">Reservations</option>
                                <option value="Blogs">Blogs</option>
                                <option value="Curriculums">Curriculums</option>
                                <option value="Changelogs">Changelogs</option>
                                <option value="System">System</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-gray-400 font-bold mb-1">Actor Username</label>
                            <input
                              type="text"
                              value={editLogUsername}
                              onChange={(e) => setEditLogUsername(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded text-amber-300 font-mono"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-gray-400 font-bold mb-1">Description</label>
                            <textarea
                              rows={3}
                              value={editLogDescription}
                              onChange={(e) => setEditLogDescription(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded text-gray-200 font-sans"
                              required
                            />
                          </div>

                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                            Note: Direct updates to changelog entries do not create additional log records.
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => setIsEditingChangelog(false)}
                              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingLog}
                              className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
                            >
                              {isSavingLog ? "Saving..." : "Save Changelog Entry"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 5: USER MANAGEMENT */}
            {activeTab === "users" && (() => {
              const visibleUsers = usersList.filter(
                (u) => u.role !== "master" && u.username.toLowerCase() !== "superman"
              );
              return (
                <div className="space-y-4">
                  {/* Top bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-gray-300">
                        Total Users ({visibleUsers.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSyncStudents}
                        disabled={isSyncingStudents}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 transition-colors cursor-pointer"
                        title="Sync student accounts from Excel/CSV file"
                      >
                        <RefreshCw size={12} className={isSyncingStudents ? "animate-spin" : ""} />
                        <span>{isSyncingStudents ? "Syncing..." : "Sync Students"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchUsers()}
                        disabled={isLoadingUsers}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-gray-300 transition-colors cursor-pointer"
                        title="Refresh user list"
                      >
                        <RefreshCw size={12} className={isLoadingUsers ? "animate-spin" : ""} />
                        <span>Refresh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddUserModal(true);
                          setModalRegStep("form");
                          setModalRegUsername("");
                          setModalRegPassword("");
                          setModalRegOtp("");
                          setModalRegMessage(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
                      >
                        <UserPlus size={14} />
                        <span>Add User</span>
                      </button>
                    </div>
                  </div>

                  {syncStatusMsg && (
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                      {syncStatusMsg}
                    </div>
                  )}

                  {/* User List */}
                  <div className="space-y-2">
                    {isLoadingUsers && visibleUsers.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500 font-mono">
                        Loading users...
                      </div>
                    ) : visibleUsers.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500 font-mono">
                        No team users created yet. Click "Add User" to set up staff access.
                      </div>
                    ) : (
                      visibleUsers.map((user) => {
                        const isMaster = user.role === "master" || user.username === "Superman";
                        const dateFormatted = user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "N/A";

                        return (
                          <div
                            key={user._id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white font-mono">
                                    {user.username}
                                  </span>
                                  {isMaster ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                      Master
                                    </span>
                                  ) : user.role === "admin" ? (
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                                      Admin
                                    </span>
                                  ) : user.role === "editor" ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                      Editor
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-gray-300 border border-slate-700 text-[10px]">
                                      Viewer
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                  <Clock size={11} />
                                  <span>Added {dateFormatted}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              {isMaster ? (
                                <span className="text-[11px] text-gray-400 italic px-2 py-1">
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                                  title="Delete user"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add User Modal */}
                  {showAddUserModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
                      <div className="relative w-full max-w-md bg-[#0B101D] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_35px_rgba(6,182,212,0.25)] text-white space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <UserPlus size={18} className="text-cyan-400" />
                            <h4 className="text-sm font-bold text-cyan-300">Add Portal User</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddUserModal(false)}
                            className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {modalRegStep === "form" ? (
                          <form onSubmit={handleModalRequestOtp} className="space-y-4 text-xs">
                            <div>
                              <label className="block text-gray-400 font-bold mb-1">Username</label>
                              <input
                                type="text"
                                value={modalRegUsername}
                                onChange={(e) => setModalRegUsername(e.target.value)}
                                placeholder="Choose username"
                                className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-cyan-300 font-mono outline-none"
                                required
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="block text-gray-400 font-bold mb-1">Password</label>
                              <div className="relative">
                                <input
                                  type={modalShowPassword ? "text" : "password"}
                                  value={modalRegPassword}
                                  onChange={(e) => setModalRegPassword(e.target.value)}
                                  placeholder="Min. 6 characters"
                                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-cyan-300 font-mono outline-none"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setModalShowPassword(!modalShowPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-300 cursor-pointer bg-transparent border-none"
                                >
                                  {modalShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-gray-400 font-bold">Role</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(["admin", "editor", "viewer"] as const).map((r) => {
                                  const label = r === "admin" ? "Admin" : r === "editor" ? "Editor" : "Viewer";
                                  const isSelected = modalRegRole === r;
                                  return (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => setModalRegRole(r)}
                                      className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                                          : "bg-slate-900 border border-slate-800 text-gray-400 hover:text-white"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {modalRegMessage && (
                              <div className={`p-3 rounded-lg text-xs ${
                                modalRegMessage.isError
                                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                              }`}>
                                {modalRegMessage.text}
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowAddUserModal(false)}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={modalIsRequestingOtp}
                                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer"
                              >
                                {modalIsRequestingOtp ? "Sending OTP..." : "Send Verification Code"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={handleModalVerifyOtp} className="space-y-4 text-xs">
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-center space-y-1">
                              <p className="font-bold">Verification Code Sent</p>
                              <p className="text-[11px] text-gray-400">
                                Enter the 6-digit verification code to complete account setup.
                              </p>
                            </div>

                            <div>
                              <label className="block text-gray-400 font-bold mb-1 text-center">
                                Enter 6-Digit OTP Code
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="••••••"
                                value={modalRegOtp}
                                onChange={(e) => setModalRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl text-center text-xl tracking-[0.5em] text-cyan-300 font-mono outline-none"
                                required
                                autoFocus
                              />
                            </div>

                            {modalRegMessage && (
                              <div className={`p-3 rounded-lg text-xs ${
                                modalRegMessage.isError
                                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                              }`}>
                                {modalRegMessage.text}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalRegStep("form");
                                  setModalRegOtp("");
                                  setModalRegMessage(null);
                                }}
                                className="text-cyan-400 hover:underline cursor-pointer bg-transparent border-none"
                              >
                                Back
                              </button>
                              <button
                                type="submit"
                                disabled={modalIsVerifyingOtp || modalRegOtp.length !== 6}
                                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer"
                              >
                                {modalIsVerifyingOtp ? "Verifying..." : "Confirm & Create User"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* GALLERY PHOTOS MANAGEMENT (Roles: master, admin, editor) */}
            {activeTab === "gallery" && (userRole === "master" || userRole === "admin" || userRole === "editor") && (
              <div className="space-y-6">
                {/* Sub-Header & Folder Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20">
                  <div>
                    <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                      <ImageIcon size={18} className="text-cyan-400" />
                      Infinite Drag-Scroll Gallery Management
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Add, manage, and remove photos displayed in the static portal gallery windows on the Labs &amp; Workshops pages.
                    </p>
                  </div>

                  {/* Page Selector Tabs */}
                  <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryPageTab("labs");
                        fetchGalleryPhotos("labs");
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        galleryPageTab === "labs"
                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Labs Page (/images/labs/)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryPageTab("workshops");
                        fetchGalleryPhotos("workshops");
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        galleryPageTab === "workshops"
                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Workshops Page (/images/workshops/)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* ADD NEW PHOTO FORM (5 Columns on LG) */}
                  <div className="lg:col-span-5 bg-slate-900/40 p-5 rounded-2xl border border-cyan-500/20 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <PlusCircle size={16} className="text-cyan-400" />
                        Add Photo to {galleryPageTab === "labs" ? "Labs" : "Workshops"} Gallery
                      </h4>
                      <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase font-mono">
                        {galleryPageTab}
                      </span>
                    </div>

                    <form onSubmit={handleAddGalleryPhoto} className="space-y-4 text-xs font-mono">
                      {/* Photo Title */}
                      <div>
                        <label className="block text-gray-300 mb-1.5 font-bold">Photo Title / Caption *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Precision ESC Soldering"
                          value={newPhotoTitle}
                          onChange={(e) => setNewPhotoTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white outline-none transition-colors"
                        />
                      </div>

                      {/* Photo Tag / Badge */}
                      <div>
                        <label className="block text-gray-300 mb-1.5 font-bold">Category Tag (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Drone Assembly, Circuits, Flight"
                          value={newPhotoTag}
                          onChange={(e) => setNewPhotoTag(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white outline-none transition-colors"
                        />
                      </div>

                      {/* Image Source: Direct Upload or Path */}
                      <div>
                        <label className="block text-gray-300 mb-1.5 font-bold">Image Source *</label>
                        
                        {/* File Upload Box with Auto-Compression */}
                        <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/60 mb-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setNewPhotoFileName(file.name);
                                setIsCompressingClientImage(true);
                                setPhotoCompressionStats(null);
                                try {
                                  const res = await compressClientImage(file);
                                  setNewPhotoUploadData(res.dataUrl);
                                  setPhotoCompressionStats({
                                    originalKb: res.originalKb,
                                    sizeKb: res.sizeKb,
                                    savedPercent: res.savedPercent,
                                  });
                                } catch (err) {
                                  console.warn("Client compression fallback:", err);
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setNewPhotoUploadData(ev.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                } finally {
                                  setIsCompressingClientImage(false);
                                }
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center pointer-events-none">
                            <UploadCloud size={24} className="text-cyan-400 mb-1" />
                            <p className="text-[11px] text-gray-300 font-bold">
                              {newPhotoFileName ? `Selected: ${newPhotoFileName}` : "Click or Drag & Drop image file"}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, WebP, SVG • Automatically compressed</p>
                          </div>
                        </div>

                        {/* Real-time Compression Status Feedback */}
                        {isCompressingClientImage && (
                          <div className="mb-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] flex items-center gap-2 animate-pulse">
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Auto-compressing image to optimal web dimensions...</span>
                          </div>
                        )}

                        {photoCompressionStats && !isCompressingClientImage && (
                          <div className="mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Zap size={13} className="text-emerald-400" />
                              <span>Auto-Compressed:</span>
                              <span className="text-gray-400 font-normal">{photoCompressionStats.originalKb} KB</span>
                              <span className="text-emerald-400">→</span>
                              <span className="text-emerald-300">{photoCompressionStats.sizeKb} KB</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                              -{photoCompressionStats.savedPercent}
                            </span>
                          </div>
                        )}

                        {/* Or URL/Path input */}
                        <div className="relative">
                          <span className="text-[10px] text-gray-400 block mb-1">Or enter relative path / web URL:</span>
                          <input
                            type="text"
                            placeholder={`/images/${galleryPageTab}/photo.jpg`}
                            value={newPhotoSrc}
                            onChange={(e) => {
                              setNewPhotoSrc(e.target.value);
                              if (e.target.value) {
                                setNewPhotoUploadData(null);
                                setNewPhotoFileName("");
                                setPhotoCompressionStats(null);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Live Image Preview */}
                      {(newPhotoUploadData || newPhotoSrc) && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30">
                          <p className="text-[10px] text-cyan-300 mb-1.5 flex items-center gap-1 font-bold">
                            <Eye size={12} /> Preview:
                          </p>
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 flex items-center justify-center">
                            <img
                              src={newPhotoUploadData || newPhotoSrc}
                              alt="Live Preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(ev) => {
                                (ev.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Alt Description */}
                      <div>
                        <label className="block text-gray-300 mb-1.5 font-bold">Alt Description (SEO &amp; Accessibility)</label>
                        <input
                          type="text"
                          placeholder="e.g. Student soldering wires on an ESC controller"
                          value={newPhotoAlt}
                          onChange={(e) => setNewPhotoAlt(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white outline-none transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingPhoto || (!newPhotoSrc.trim() && !newPhotoUploadData)}
                        className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmittingPhoto ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Uploading &amp; Adding...
                          </>
                        ) : (
                          <>
                            <PlusCircle size={14} />
                            Add to {galleryPageTab === "labs" ? "Labs" : "Workshops"} Gallery
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* CURRENT PHOTOS LIST (7 Columns on LG) */}
                  <div className="lg:col-span-7 bg-slate-900/40 p-5 rounded-2xl border border-cyan-500/20 space-y-4 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Current {galleryPageTab === "labs" ? "Labs" : "Workshops"} Photos ({galleryItems.length})
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          These photos are loaded in the infinite-drag-scroll component.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchGalleryPhotos(galleryPageTab)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer border border-cyan-500/20"
                        title="Refresh Photos"
                      >
                        <RefreshCw size={13} className={isLoadingGallery ? "animate-spin" : ""} />
                      </button>
                    </div>

                    {isLoadingGallery ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-xs">
                        <RefreshCw size={18} className="animate-spin text-cyan-400 mr-2" />
                        Loading gallery items...
                      </div>
                    ) : galleryItems.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 text-xs space-y-2">
                        <ImageIcon size={32} className="text-gray-600" />
                        <p>No custom photos added yet for {galleryPageTab}.</p>
                        <p className="text-[11px] text-gray-500">
                          Default placeholder images in <code className="text-cyan-400">/images/{galleryPageTab}/</code> will be displayed.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[520px] pr-1">
                        {galleryItems.map((item, idx) => (
                          <div
                            key={item._id || item.id || idx}
                            className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex flex-col hover:border-cyan-500/40 transition-all"
                          >
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2">
                              <img
                                src={item.src}
                                alt={item.title || "Photo"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  e.currentTarget.src = `/images/${galleryPageTab}/lab-circuit-soldering.svg`;
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteGalleryPhoto(item)}
                                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer shadow-lg"
                                title="Delete Photo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <p className="text-xs font-bold text-white truncate" title={item.title}>
                              {item.title || "Gallery Photo"}
                            </p>
                            <p className="text-[10px] text-cyan-400 truncate mt-0.5">
                              {item.tag || galleryPageTab}
                            </p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5 font-mono" title={item.src}>
                              {item.src}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-gray-300 transition-all cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>

      {/* Confirmation Modal (Task 13) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="relative w-full max-w-md bg-[#0B101D] border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_35px_rgba(244,63,94,0.3)] text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{confirmModal.title}</h4>
                <p className="text-[11px] text-gray-400">Action confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              {confirmModal.message}
            </p>

            {confirmModal.showDontAskAgain && (
              <label className="flex items-center gap-2 pt-1 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontAskAgainCheck}
                  onChange={(e) => setDontAskAgainCheck(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-rose-500"
                />
                <span className="font-sans text-xs">Don't ask again</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setDontAskAgainCheck(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmModal.onConfirm;
                  const isDontAsk = dontAskAgainCheck;
                  setConfirmModal(null);
                  setDontAskAgainCheck(false);
                  fn(isDontAsk);
                }}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
