import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getStoredUtmParams } from "@/lib/utm";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  X,
  Clock,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";

/**
 * Google Apps Script Web App URL (backed exclusively by Google Calendar).
 * Set VITE_BOOKING_SCRIPT_URL in Cybotz-landing/.env
 */
export const BOOKING_SCRIPT_URL: string =
  import.meta.env.VITE_BOOKING_SCRIPT_URL || "";

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const COUNTRY_CODES = [
  { code: "+91", country: "IN" },
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "SG" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
];

const HOUR_OPTIONS = [
  { display: "09 AM", hour24: 9 },
  { display: "10 AM", hour24: 10 },
  { display: "11 AM", hour24: 11 },
  { display: "12 PM", hour24: 12 },
  { display: "01 PM", hour24: 13 },
  { display: "02 PM", hour24: 14 },
  { display: "03 PM", hour24: 15 },
  { display: "04 PM", hour24: 16 },
];

const MINUTE_OPTIONS = [0, 15, 30, 45];

const getFormattedTimeString = (h24: number, mins: number): string => {
  const period = h24 >= 12 ? "PM" : "AM";
  const displayHours = h24 % 12 === 0 ? 12 : h24 % 12;
  const displayMins = mins.toString().padStart(2, "0");
  return `${displayHours.toString().padStart(2, "0")}:${displayMins} ${period}`;
};

interface SelectedDateInfo {
  day: number;
  month: string;
  year: number;
  fullDateStr: string;
}

interface CalendarDayProps {
  day: number | string;
  isHeader?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isPast?: boolean;
  isBooked?: boolean;
  isSunday?: boolean;
  onClick?: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isHeader,
  isSelected,
  isToday,
  isPast,
  isBooked,
  isSunday,
  onClick,
}) => {
  let dayClass =
    "col-span-1 row-span-1 flex h-8 w-8 items-center justify-center transition-all duration-200 border-none bg-transparent ";

  if (isHeader) {
    dayClass += "text-gray-500 font-mono text-xs";
  } else if (isSunday) {
    dayClass +=
      "rounded-lg text-sm text-amber-500/80 bg-amber-500/10 border border-amber-500/30 opacity-70 cursor-not-allowed select-none";
  } else if (isBooked) {
    dayClass +=
      "rounded-lg text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 opacity-80 cursor-not-allowed select-none";
  } else if (isPast) {
    dayClass +=
      "rounded-lg text-sm text-gray-600 opacity-30 cursor-not-allowed select-none bg-transparent";
  } else {
    dayClass += "rounded-lg text-sm cursor-pointer ";
    if (isSelected) {
      dayClass +=
        "bg-[#00F0FF] text-[#0F172A] font-bold shadow-[0_0_10px_rgba(0,240,255,0.6)]";
    } else {
      dayClass +=
        "text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border hover:border-cyan-500/40";
    }
  }

  const tooltipText = isSunday
    ? "Closed on Sundays (No trial sessions)"
    : isBooked
      ? "Fully booked / busy on Google Calendar"
      : isPast
        ? isToday
          ? "Unavailable (Current day excluded)"
          : "Unavailable (Past date)"
        : "Available on Google Calendar";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isPast && !isBooked && !isSunday && onClick) onClick();
      }}
      disabled={isHeader || isPast || isBooked || isSunday}
      title={tooltipText}
      className={dayClass}
    >
      <span className="font-medium">{day}</span>
    </button>
  );
};

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: SelectedDateInfo | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(10);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  const [schoolName, setSchoolName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phone, setPhone] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");

  const [timeError, setTimeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [gcalUrl, setGcalUrl] = useState<string | null>(null);

  // Live Google Calendar collision state for the selected day
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [busyBlocks, setBusyBlocks] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);

  const isTaken = (h24: number, mins: number) =>
    takenTimes.includes(getFormattedTimeString(h24, mins));

  const getTimeProblem = (h24: number, mins: number, currentTaken = takenTimes): string | null => {
    if (h24 === 16 && mins > 0) return "Time cannot exceed 4:00 PM.";
    if (currentTaken.includes(getFormattedTimeString(h24, mins))) {
      return "This slot collides with an existing event on Google Calendar. Please choose another time.";
    }
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedHour(10);
    setSelectedMinute(0);
    setSchoolName("");
    setEmail("");
    setCountryCode("+91");
    setPhone("");
    setAdditionalInfo("");
    setHoneypot("");
    setEmailError(null);
    setPhoneError(null);
    setGeneralError(null);
    setIsSuccess(false);
    setGcalUrl(null);
    setTakenTimes([]);
    setBusyBlocks([]);

    if (selectedDate?.fullDateStr) {
      const isSunday = new Date(selectedDate.fullDateStr).getDay() === 0;
      setTimeError(isSunday ? "Trial sessions are not available on Sundays." : null);
    } else {
      setTimeError(null);
    }
  }, [isOpen, selectedDate]);

  // Fetch live planned events & colliding slots from Host Google Calendar
  useEffect(() => {
    if (!isOpen || !selectedDate?.fullDateStr) return;
    if (!BOOKING_SCRIPT_URL) {
      setGeneralError(
        "Google Calendar booking URL (VITE_BOOKING_SCRIPT_URL) is not configured yet."
      );
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    fetch(
      `${BOOKING_SCRIPT_URL}?action=slots&date=${encodeURIComponent(selectedDate.fullDateStr)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setGeneralError(data.error);
          return;
        }
        const taken: string[] = Array.isArray(data.taken) ? data.taken : [];
        const busy: string[] = Array.isArray(data.busyBlocks) ? data.busyBlocks : [];
        setTakenTimes(taken);
        setBusyBlocks(busy);

        // Select the first conflict-free slot on this day
        for (const h of HOUR_OPTIONS) {
          for (const m of MINUTE_OPTIONS) {
            if (h.hour24 === 16 && m > 0) continue;
            if (!taken.includes(getFormattedTimeString(h.hour24, m))) {
              setSelectedHour(h.hour24);
              setSelectedMinute(m);
              setTimeError(null);
              return;
            }
          }
        }
        setTimeError(
          "All slots on this date collide with planned events on the host calendar. Please select another date."
        );
      })
      .catch(() => {
        if (!cancelled) {
          setGeneralError("Could not reach Google Calendar to verify availability.");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate]);

  if (!isOpen || !selectedDate) return null;

  const handleHourChange = (newHour: number) => {
    setSelectedHour(newHour);
    // If current minute collides in the new hour, auto-jump to first free minute in that hour
    if ((newHour === 16 && selectedMinute > 0) || isTaken(newHour, selectedMinute)) {
      const freeMin = MINUTE_OPTIONS.find(
        (m) => !(newHour === 16 && m > 0) && !isTaken(newHour, m)
      );
      if (freeMin !== undefined) {
        setSelectedMinute(freeMin);
        setTimeError(null);
        return;
      }
    }
    setTimeError(getTimeProblem(newHour, selectedMinute));
  };

  const handleMinuteChange = (newMins: number) => {
    setSelectedMinute(newMins);
    setTimeError(getTimeProblem(selectedHour, newMins));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!BOOKING_SCRIPT_URL) {
      setGeneralError(
        "Bookings are only accepted via Google Calendar. Please set VITE_BOOKING_SCRIPT_URL."
      );
      return;
    }

    let valid = true;

    if (!email.trim() || !email.includes("@")) {
      setEmailError("Email address is required.");
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!phone.trim() || phone.trim().length < 5) {
      setPhoneError("Phone number is required.");
      valid = false;
    } else {
      setPhoneError(null);
    }

    const timeProblem = getTimeProblem(selectedHour, selectedMinute);
    if (timeProblem) {
      setTimeError(timeProblem);
      valid = false;
    }

    if (!valid) return;

    const fullPhone = `${countryCode} ${phone.trim()}`;
    const formattedTime = getFormattedTimeString(selectedHour, selectedMinute);
    const utmData = getStoredUtmParams();
    const utmSummary =
      Object.keys(utmData).length > 0 ? ` [UTM: ${JSON.stringify(utmData)}]` : "";

    const payload = {
      date: selectedDate.fullDateStr,
      time: formattedTime,
      email: email.trim(),
      phone: fullPhone,
      schoolName: schoolName.trim(),
      additionalInfo: additionalInfo.trim()
        ? `${additionalInfo.trim()}${utmSummary}`
        : utmSummary
          ? utmSummary.trim()
          : "",
      website: honeypot,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(BOOKING_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setGeneralError(data.error || "Failed to log booking in Google Calendar.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      if (data.gcalUrl) {
        setGcalUrl(data.gcalUrl);
      }
      window.dispatchEvent(new Event("booked-dates-updated"));

      // Sync into MariaDB / MySQL so it immediately appears in the Admin Access Portal
      fetch("/api/schedule-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      setGeneralError(
        "Network error while connecting to Google Calendar. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTime = getFormattedTimeString(selectedHour, selectedMinute);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#0B101D] p-5 shadow-[0_0_40px_rgba(0,240,255,0.25)] text-white overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-white">
                Book via Google Calendar
              </h3>
              <p className="text-xs text-cyan-400 font-mono">
                {selectedDate.fullDateStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold font-mono text-white">
              Logged in Google Calendar!
            </h4>
            <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
              Your session on{" "}
              <span className="text-cyan-400 font-semibold">
                {selectedDate.fullDateStr}
              </span>{" "}
              at{" "}
              <span className="text-cyan-400 font-semibold">{formattedTime}</span>{" "}
              is now logged on the host Google Calendar and notifications have been sent.
            </p>

            <div className="w-full bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1 my-1">
              <p>
                <span className="text-gray-400">Date:</span> {selectedDate.fullDateStr}
              </p>
              <p>
                <span className="text-gray-400">Time:</span> {formattedTime} (1 hr)
              </p>
              {schoolName && (
                <p>
                  <span className="text-gray-400">School:</span> {schoolName}
                </p>
              )}
              <p>
                <span className="text-gray-400">Email:</span> {email}
              </p>
              <p>
                <span className="text-gray-400">Phone:</span> {countryCode} {phone}
              </p>
              {additionalInfo && (
                <p>
                  <span className="text-gray-400">Notes:</span> {additionalInfo}
                </p>
              )}
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              A Google Calendar invitation and confirmation email have been sent to{" "}
              <span className="text-cyan-400">{email}</span>.
            </p>

            {gcalUrl && (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer"
              >
                <CalendarIcon className="w-4 h-4" />
                Open in My Google Calendar
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full mt-1 px-6 py-2 rounded-lg border border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800 font-mono text-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Time Selector with Live Google Calendar Collision Prevention */}
            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Time (9:00 AM - 4:00 PM){" "}
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-cyan-400 text-xs font-bold font-mono">
                  {formattedTime}
                </span>
              </label>

              {busyBlocks.length > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">
                  <span className="font-bold">Planned events today:</span>{" "}
                  {busyBlocks.join(", ")} (colliding slots are locked)
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">
                    Hour
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => handleHourChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((item) => {
                      const hourFull = MINUTE_OPTIONS.every(
                        (m) => (item.hour24 === 16 && m > 0) || isTaken(item.hour24, m)
                      );
                      return (
                        <option
                          key={item.hour24}
                          value={item.hour24}
                          disabled={hourFull}
                        >
                          {item.display}
                          {hourFull ? " (busy)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">
                    Minutes (15 min steps)
                  </label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleMinuteChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {MINUTE_OPTIONS.map((m) => {
                      const outOfBounds = selectedHour === 16 && m > 0;
                      const busy = isTaken(selectedHour, m);
                      return (
                        <option key={m} value={m} disabled={outOfBounds || busy}>
                          :{m.toString().padStart(2, "0")}
                          {busy ? " (busy)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {slotsLoading ? (
                <p className="mt-1 text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking host Google Calendar for conflicts...
                </p>
              ) : (
                !timeError &&
                BOOKING_SCRIPT_URL && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified conflict-free on host Google Calendar
                  </p>
                )
              )}

              {timeError && (
                <p className="mt-1 text-xs text-rose-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{timeError}</span>
                </p>
              )}
            </div>

            {/* Contact Details */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" /> School Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. St. Mary's Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className={`w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                    emailError
                      ? "border-rose-500"
                      : "border-slate-700 focus:border-cyan-400"
                  }`}
                />
                {emailError && (
                  <p className="mt-0.5 text-xs text-rose-400 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" /> Phone Number{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-cyan-400 font-mono focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    required
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    className={`flex-1 bg-slate-900 border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                      phoneError
                        ? "border-rose-500"
                        : "border-slate-700 focus:border-cyan-400"
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="mt-0.5 text-xs text-rose-400 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" /> Additional
                  Information (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Student count, topic interest, or specific requirements..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Honeypot spam protection */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
            />

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || slotsLoading || !!timeError}
                className="w-full py-2.5 rounded-lg bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold font-mono text-xs tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(249,116,5,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in Google Calendar...</span>
                  </>
                ) : (
                  <span>Confirm Booking</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export function Calendar() {
  const currentDate = useMemo(() => new Date(), []);
  const todayDate = currentDate.getDate();
  const [monthOffset, setMonthOffset] = useState<number>(0);

  const [selectedDateInfo, setSelectedDateInfo] =
    useState<SelectedDateInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  const viewDate = useMemo(() => {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + monthOffset,
      1
    );
  }, [currentDate, monthOffset]);

  // English month format so Google Calendar parser works across all locales
  const viewMonthName = viewDate.toLocaleString("en-US", { month: "long" });
  const viewYear = viewDate.getFullYear();
  const firstDayOfWeek = viewDate.getDay();
  const daysInMonth = new Date(viewYear, viewDate.getMonth() + 1, 0).getDate();

  const monthOptions = useMemo(() => {
    return Array.from({ length: 13 }).map((_, offset) => {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + offset,
        1
      );
      return {
        offset,
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
      };
    });
  }, [currentDate]);

  // Fetch fully-booked / all-day-busy dates exclusively from Google Calendar
  const fetchBookedDates = async () => {
    if (!BOOKING_SCRIPT_URL) return;
    try {
      const res = await fetch(`${BOOKING_SCRIPT_URL}?action=booked-dates`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bookedDates)) {
          setBookedDates(data.bookedDates);
        }
      }
    } catch (e) {
      console.error("Error fetching Google Calendar availability:", e);
    }
  };

  useEffect(() => {
    fetchBookedDates();
    const handleUpdate = () => fetchBookedDates();
    window.addEventListener("booked-dates-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener("booked-dates-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const handleDaySelect = (dayNum: number) => {
    const dateObj: SelectedDateInfo = {
      day: dayNum,
      month: viewMonthName,
      year: viewYear,
      fullDateStr: `${viewMonthName} ${dayNum}, ${viewYear}`,
    };
    setSelectedDateInfo(dateObj);
    setIsModalOpen(true);
  };

  const handleQuickBookConsultation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let targetDay: number | null = null;
    const startDay = monthOffset === 0 ? todayDate + 1 : 1;

    for (let d = startDay; d <= daysInMonth; d++) {
      const checkDate = new Date(viewYear, viewDate.getMonth(), d);
      if (checkDate.getDay() === 0) continue;
      const checkDateStr = `${viewMonthName} ${d}, ${viewYear}`;
      if (bookedDates.includes(checkDateStr)) continue;
      targetDay = d;
      break;
    }

    if (targetDay !== null) {
      handleDaySelect(targetDay);
    } else if (monthOffset < 12) {
      setMonthOffset((prev) => prev + 1);
    }
  };

  const renderCalendarDays = () => {
    const isCurrentMonth = monthOffset === 0;

    return [
      ...dayNames.map((day) => (
        <CalendarDay key={`header-${day}`} day={day} isHeader />
      )),
      ...Array.from({ length: firstDayOfWeek }).map((_, i) => (
        <div
          key={`empty-start-${i}`}
          className="col-span-1 row-span-1 h-8 w-8"
        />
      )),
      ...Array.from({ length: daysInMonth }).map((_, i) => {
        const dayNum = i + 1;
        const isToday = isCurrentMonth && dayNum === todayDate;
        const isPast = isCurrentMonth ? dayNum <= todayDate : false;
        const dateObjForDay = new Date(viewYear, viewDate.getMonth(), dayNum);
        const isSunday = dateObjForDay.getDay() === 0;
        const dateStr = `${viewMonthName} ${dayNum}, ${viewYear}`;
        const isBooked = bookedDates.includes(dateStr);
        const isSelected = selectedDateInfo?.fullDateStr === dateStr;

        return (
          <CalendarDay
            key={`date-${viewYear}-${viewMonthName}-${dayNum}`}
            day={dayNum}
            isSelected={isSelected}
            isToday={isToday}
            isPast={isPast}
            isBooked={isBooked}
            isSunday={isSunday}
            onClick={() => handleDaySelect(dayNum)}
          />
        );
      }),
    ];
  };

  return (
    <>
      <BentoCard height="h-auto">
        <div className="grid h-full gap-5">
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-3">
                <Sparkles size={12} className="animate-pulse text-cyan-400" />
                <span>Live Google Calendar Sync</span>
              </div>
              <h2 className="mb-3 text-lg md:text-3xl font-bold text-white tracking-wider font-mono">
                Book a Free Trial Session
              </h2>
              <p className="mb-2 text-xs md:text-sm text-gray-400">
                Schedule a live demo, STEM workshop, or consultation at your
                campus! Slots sync live with our Google Calendar so bookings
                never collide with planned events.
              </p>
            </div>
            <div>
              <Button
                onClick={handleQuickBookConsultation}
                className="mt-3 rounded-lg bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold px-6 py-2 shadow-[0_0_15px_rgba(249,116,5,0.4)] cursor-pointer"
              >
                Book Consultation
              </Button>
            </div>
          </div>
          <div className="transition-all duration-500 ease-out">
            <div>
              <div className="h-full w-full max-w-[550px] rounded-[24px] border border-[#1E293B] bg-slate-900/50 p-2 transition-colors duration-100 group-hover:border-cyan-500/50">
                <div
                  className="h-full rounded-2xl border border-slate-800 p-3"
                  style={{
                    boxShadow: "0px 2px 1.5px 0px rgba(0,240,255,0.05) inset",
                  }}
                >
                  {/* Month Navigation & Selector Header */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={16} className="text-cyan-400" />
                      <select
                        value={monthOffset}
                        onChange={(e) => setMonthOffset(Number(e.target.value))}
                        className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold font-mono text-white hover:border-cyan-500/60 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                        aria-label="Select calendar month"
                      >
                        {monthOptions.map((opt) => (
                          <option
                            key={opt.offset}
                            value={opt.offset}
                            className="bg-slate-900 text-white"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setMonthOffset((prev) => Math.max(0, prev - 1))
                        }
                        disabled={monthOffset === 0}
                        aria-label="Previous month"
                        title={
                          monthOffset === 0
                            ? "Cannot view past months"
                            : "Previous Month"
                        }
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-gray-300 hover:text-cyan-300 hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setMonthOffset((prev) => Math.min(12, prev + 1))
                        }
                        disabled={monthOffset >= 12}
                        aria-label="Next month"
                        title={
                          monthOffset >= 12
                            ? "Registrations open up to 1 year in advance"
                            : "Next Month"
                        }
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-gray-300 hover:text-cyan-300 hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 mb-3 text-[11px] font-mono text-gray-400">
                    <span className="text-cyan-300">
                      {selectedDateInfo?.fullDateStr
                        ? `Selected: ${selectedDateInfo.fullDateStr}`
                        : "Click any date to schedule"}
                    </span>
                    <span className="text-slate-500">
                      {monthOffset === 0
                        ? "Current Month"
                        : `+${monthOffset} Mo Future`}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 px-1">
                    {renderCalendarDays()}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 px-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Fully Booked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                      <span>Sunday (Closed)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchBookedDates();
        }}
        selectedDate={selectedDateInfo}
      />
    </>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  height?: string;
  rowSpan?: number;
  colSpan?: number;
  className?: string;
  showHoverGradient?: boolean;
  hideOverflow?: boolean;
  linkTo?: string;
}

export function BentoCard({
  children,
  height = "h-auto",
  rowSpan = 8,
  colSpan = 7,
  className = "",
  showHoverGradient = true,
  hideOverflow = true,
  linkTo,
}: BentoCardProps) {
  const cardContent = (
    <div
      className={`group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-indigo-100/10 dark:hover:bg-indigo-900/10 ${
        hideOverflow && "overflow-hidden"
      } ${height} row-span-${rowSpan} col-span-${colSpan} ${className}`}
    >
      {linkTo && (
        <div className="absolute bottom-4 right-6 z-[999] flex h-12 w-12 rotate-6 items-center justify-center rounded-full bg-white opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-[-8px] group-hover:rotate-0 group-hover:opacity-100">
          <svg
            className="h-6 w-6 text-indigo-600"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.25 15.25V6.75H8.75"
            ></path>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 7L6.75 17.25"
            ></path>
          </svg>
        </div>
      )}
      {showHoverGradient && (
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"></div>
      )}
      {children}
    </div>
  );

  if (linkTo) {
    if (linkTo.startsWith("/")) {
      return (
        <Link href={linkTo} className="block">
          {cardContent}
        </Link>
      );
    }
    if (linkTo.startsWith("#")) {
      return (
        <a href={linkTo} className="block">
          {cardContent}
        </a>
      );
    }
    return (
      <a
        href={linkTo}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}
