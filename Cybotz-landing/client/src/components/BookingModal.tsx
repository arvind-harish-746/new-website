import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, Mail, Phone, Building2, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { getStoredUtmParams } from "@/lib/utm";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: { day: number; month: string; year: number; fullDateStr: string } | null;
}

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

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  // Time state: Hour & Minutes
  const [selectedHour, setSelectedHour] = useState<number>(10); // Default 10 AM (10)
  const [selectedMinute, setSelectedMinute] = useState<number>(0); // Default :00

  // Contact details
  const [schoolName, setSchoolName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phone, setPhone] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");

  // Error states
  const [timeError, setTimeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [gcalUrl, setGcalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedHour(10);
      setSelectedMinute(0);
      setSchoolName("");
      setEmail("");
      setCountryCode("+91");
      setPhone("");
      setAdditionalInfo("");
      setEmailError(null);
      setPhoneError(null);
      setGeneralError(null);
      setIsSuccess(false);
      setGcalUrl(null);

      if (selectedDate?.fullDateStr) {
        const isSunday = new Date(selectedDate.fullDateStr).getDay() === 0;
        if (isSunday) {
          setTimeError("Trial sessions are not available on Sundays.");
        } else {
          setTimeError(null);
        }
      } else {
        setTimeError(null);
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen || !selectedDate) return null;

  // Validate time selection (9:00 AM to 4:00 PM strictly)
  const getFormattedTimeString = (h24: number, mins: number): string => {
    const period = h24 >= 12 ? "PM" : "AM";
    const displayHours = h24 % 12 === 0 ? 12 : h24 % 12;
    const displayMins = mins.toString().padStart(2, "0");
    return `${displayHours.toString().padStart(2, "0")}:${displayMins} ${period}`;
  };

  const handleHourChange = (newHour: number) => {
    setSelectedHour(newHour);
    if (newHour === 16 && selectedMinute > 0) {
      setTimeError("Time cannot exceed 4:00 PM.");
    } else {
      setTimeError(null);
    }
  };

  const handleMinuteChange = (newMins: number) => {
    setSelectedMinute(newMins);
    if (selectedHour === 16 && newMins > 0) {
      setTimeError("Time cannot exceed 4:00 PM.");
    } else {
      setTimeError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    let valid = true;

    // Validate email
    if (!email.trim() || !email.includes("@")) {
      setEmailError("Email address is required.");
      valid = false;
    } else {
      setEmailError(null);
    }

    // Validate phone
    if (!phone.trim() || phone.trim().length < 5) {
      setPhoneError("Phone number is required.");
      valid = false;
    } else {
      setPhoneError(null);
    }

    // Validate time bounds (strictly <= 4:00 PM)
    if (selectedHour === 16 && selectedMinute > 0) {
      setTimeError("Time cannot exceed 4:00 PM.");
      valid = false;
    }

    if (!valid) return;

    const fullPhone = `${countryCode} ${phone.trim()}`;
    const formattedTime = getFormattedTimeString(selectedHour, selectedMinute);
    const utmData = getStoredUtmParams();
    const utmSummary = Object.keys(utmData).length > 0 ? ` [UTM: ${JSON.stringify(utmData)}]` : "";

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/schedule-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.fullDateStr,
          time: formattedTime,
          email: email.trim(),
          phone: fullPhone,
          schoolName: schoolName.trim(),
          additionalInfo: additionalInfo.trim() ? `${additionalInfo.trim()}${utmSummary}` : (utmSummary ? utmSummary.trim() : ""),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGeneralError(data.error || "Failed to schedule trial session.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      window.dispatchEvent(new Event("booked-dates-updated"));
      if (data.gcalUrl) {
        setGcalUrl(data.gcalUrl);
      }
    } catch (err: any) {
      setGeneralError("Network error while connecting to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTime = getFormattedTimeString(selectedHour, selectedMinute);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Smaller compact floating modal window hovering over calendar */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#0B101D] p-5 shadow-[0_0_40px_rgba(0,240,255,0.25)] text-white overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-white">
                Book Trial Session
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
          /* Success Screen */
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold font-mono text-white">
              Trial Session Booked!
            </h4>
            <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
              Your booking request for <span className="text-cyan-400 font-semibold">{selectedDate.fullDateStr}</span> at <span className="text-cyan-400 font-semibold">{formattedTime}</span> has been confirmed.
            </p>

            <div className="w-full bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1 my-1">
              <p><span className="text-gray-400">Date:</span> {selectedDate.fullDateStr}</p>
              <p><span className="text-gray-400">Time:</span> {formattedTime}</p>
              {schoolName && <p><span className="text-gray-400">School:</span> {schoolName}</p>}
              <p><span className="text-gray-400">Email:</span> {email}</p>
              <p><span className="text-gray-400">Phone:</span> {countryCode} {phone}</p>
              {additionalInfo && <p><span className="text-gray-400">Notes:</span> {additionalInfo}</p>}
            </div>

            {/* 1-Click Google Calendar Add Button */}
            {gcalUrl && (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer"
              >
                <CalendarIcon className="w-4 h-4" />
                Add to My Google Calendar
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
          /* Form Screen */
          <form onSubmit={handleSubmit} className="space-y-4">

            {generalError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Custom Hours & Minutes Time Selector */}
            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Time (9:00 AM - 4:00 PM) <span className="text-rose-500">*</span>
                </span>
                <span className="text-cyan-400 text-xs font-bold font-mono">
                  {formattedTime}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                {/* Hours Selection */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Hour</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => handleHourChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((item) => (
                      <option key={item.hour24} value={item.hour24}>
                        {item.display}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Minutes Selection (multiples of 15) */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Minutes (15 min steps)</label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleMinuteChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        :{m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {timeError && (
                <p className="mt-1 text-xs text-rose-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {timeError}
                </p>
              )}
            </div>

            {/* Contact Details Section */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              {/* School Name */}
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

              {/* Email (Required) */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address <span className="text-rose-500">*</span>
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
                    emailError ? "border-rose-500" : "border-slate-700 focus:border-cyan-400"
                  }`}
                />
                {emailError && (
                  <p className="mt-0.5 text-xs text-rose-400 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Phone with Country Code Prefix */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" /> Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  {/* Country Code Select */}
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

                  {/* Phone Input */}
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
                      phoneError ? "border-rose-500" : "border-slate-700 focus:border-cyan-400"
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

              {/* Additional Information / Notes */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" /> Additional Information (Optional)
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

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !!timeError}
                className="w-full py-2.5 rounded-lg bg-[#F97405] hover:bg-[#ff8614] text-slate-950 font-bold font-mono text-xs tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(249,116,5,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Booking...</span>
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
