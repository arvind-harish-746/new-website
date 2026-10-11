import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/BookingModal";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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
  let dayClass = "cal-day col-span-1 row-span-1 flex h-8 w-8 items-center justify-center border-none bg-transparent ";

  if (isHeader) {
    dayClass += "is-label";
  } else if (isSunday) {
    dayClass += "is-closed";
  } else if (isBooked) {
    dayClass += "is-booked";
  } else if (isPast) {
    dayClass += "is-past";
  } else if (isSelected) {
    dayClass += "is-selected";
  } else {
    dayClass += "is-open";
  }

  const tooltipText = isSunday
    ? "Closed on Sundays (No trial sessions)"
    : isBooked 
      ? "Already Booked by another client" 
      : isPast 
        ? isToday ? "Unavailable (Current day excluded)" : "Unavailable (Past date)"
        : "Available for Booking";

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
      <span className="font-medium">
        {day}
      </span>
    </button>
  );
};

export function Calendar() {
  const currentDate = useMemo(() => new Date(), []);
  const todayDate = currentDate.getDate();
  const [monthOffset, setMonthOffset] = useState<number>(0); // 0 = current month, 1..12 = next 12 months (1 year window)
  
  const [selectedDateInfo, setSelectedDateInfo] = useState<{ day: number; month: string; year: number; fullDateStr: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  // Calculate active view month & year based on monthOffset
  const viewDate = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
  }, [currentDate, monthOffset]);

  const viewMonthName = viewDate.toLocaleString("default", { month: "long" });
  const viewYear = viewDate.getFullYear();
  const firstDayOfWeek = viewDate.getDay();
  const daysInMonth = new Date(viewYear, viewDate.getMonth() + 1, 0).getDate();

  // Generate 12-month future options list for the quick jump dropdown
  const monthOptions = useMemo(() => {
    return Array.from({ length: 13 }).map((_, offset) => {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
      return {
        offset,
        label: d.toLocaleString("default", { month: "long", year: "numeric" }),
      };
    });
  }, [currentDate]);

  // Fetch booked dates from backend
  const fetchBookedDates = async () => {
    try {
      const res = await fetch("/api/booked-dates");
      if (res.ok) {
        const data = await res.json();
        if (data.bookedDates) {
          setBookedDates(data.bookedDates);
        }
      }
    } catch (e) {
      console.error("Error fetching booked dates:", e);
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
    const dateObj = {
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

    // Find the next available non-Sunday, non-booked date in current view month
    let targetDay: number | null = null;
    const startDay = monthOffset === 0 ? todayDate + 1 : 1;

    for (let d = startDay; d <= daysInMonth; d++) {
      const checkDate = new Date(viewYear, viewDate.getMonth(), d);
      if (checkDate.getDay() === 0) continue; // skip Sunday
      const checkDateStr = `${viewMonthName} ${d}, ${viewYear}`;
      if (bookedDates.includes(checkDateStr)) continue; // skip booked
      targetDay = d;
      break;
    }

    if (targetDay !== null) {
      handleDaySelect(targetDay);
    } else if (monthOffset < 12) {
      // If current month has no available dates left, advance to next month
      setMonthOffset(prev => prev + 1);
    }
  };

  const renderCalendarDays = () => {
    const isCurrentMonth = monthOffset === 0;

    let days: React.ReactNode[] = [
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
        // In current month, exclude today and past days. In future months, all days are available.
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

    return days;
  };

  return (
    <>
      <div className="log-calendar">
        <div className="grid h-full gap-5">
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="trial-title">Book a Free Trial Session</h2>
              <p className="trial-copy">
                Schedule a live demo, STEM workshop, or consultation at your campus! Select any available date up to 12 months in advance.
              </p>
            </div>
            <div>
              <Button
                onClick={handleQuickBookConsultation}
                className="btn-primary mt-3 h-12 rounded-[4px] border-0 bg-[#F97405] px-6 text-[#0B1620] shadow-none hover:bg-[#ff8614]"
              >
                Book Consultation
              </Button>
            </div>
          </div>
          <div>
            <div>
              <div className="cal-shell">
                <div className="cal-inner">
                  {/* Month Navigation & Selector Header */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={16} className="text-[#0460A9]" />
                      <select
                        value={monthOffset}
                        onChange={(e) => setMonthOffset(Number(e.target.value))}
                        className="cal-select"
                        aria-label="Select calendar month"
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.offset} value={opt.offset} className="bg-white text-[#102033]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Next / Previous Month Navigation Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
                        disabled={monthOffset === 0}
                        aria-label="Previous month"
                        title={monthOffset === 0 ? "Cannot view past months" : "Previous Month"}
                        className="cal-nav"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMonthOffset((prev) => Math.min(12, prev + 1))}
                        disabled={monthOffset >= 12}
                        aria-label="Next month"
                        title={monthOffset >= 12 ? "Registrations open up to 1 year in advance" : "Next Month"}
                        className="cal-nav"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-header status text */}
                  <div className="cal-status">
                    <span className="text-[#0460A9]">
                      {selectedDateInfo?.fullDateStr ? `Selected: ${selectedDateInfo.fullDateStr}` : "Click any date to schedule"}
                    </span>
                    <span className="text-slate-500">
                      {monthOffset === 0 ? "Current Month" : `+${monthOffset} Mo Future`}
                    </span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 px-1">
                    {renderCalendarDays()}
                  </div>

                  {/* Legend Indicator */}
                  <div className="cal-legend">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Booked</span>
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
      </div>

      {/* Booking Popup Modal */}
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
      className={`group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-indigo-100/10 dark:hover:bg-indigo-900/10 ${hideOverflow && "overflow-hidden"
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
