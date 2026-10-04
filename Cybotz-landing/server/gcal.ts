export interface CalendarEventData {
  dateStr: string;
  timeStr: string;
  email: string;
  phone: string;
  schoolName?: string;
  additionalInfo?: string;
}

/**
 * Generate 1-click Add to Google Calendar URL for Client
 */
export function generateClientGoogleCalendarUrl(data: CalendarEventData): string {
  const { dateStr, timeStr, email, phone, schoolName, additionalInfo } = data;

  const title = `CYBOTZ STEM Trial Session${schoolName ? ` - ${schoolName}` : ""}`;
  const details = `CYBOTZ Hands-on STEM & Robotics Trial Session
------------------------------------------------
Date: ${dateStr}
Time: ${timeStr}
School Name: ${schoolName || "N/A"}
Email: ${email}
Phone: ${phone}
${additionalInfo ? `Additional Notes: ${additionalInfo}` : ""}
------------------------------------------------
Organized by CYBOTZ (https://cybotz.tech)`;

  const location = "School Campus / Premises";

  // Parse start date from dateStr e.g. "August 12, 2026"
  const dateParts = new Date(dateStr);
  let year = dateParts.getFullYear();
  let month = dateParts.getMonth();
  let day = dateParts.getDate();

  if (isNaN(year)) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
    day = now.getDate() + 1;
  }

  // Parse time e.g. "10:15 AM" or "02:30 PM"
  let hours = 10;
  let mins = 0;
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    hours = parseInt(match12[1], 10);
    mins = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  const startDate = new Date(year, month, day, hours, mins, 0);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatIso = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

  const startIso = formatIso(startDate);
  const endIso = formatIso(endDate);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

/**
 * Host Google Calendar Sync Handler
 * Supports Service Account / Google Calendar API sync when configured.
 */
export async function syncHostGoogleCalendar(data: CalendarEventData): Promise<{ success: boolean; eventId?: string; message: string }> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!calendarId || !serviceAccountEmail || !privateKey) {
    console.log("[Google Calendar] Google API service account credentials not configured in ENV. Generated client 1-click Google Calendar URL.");
    return {
      success: true,
      message: "Client 1-click Google Calendar link generated. (Configure GOOGLE_CALENDAR_ID & GOOGLE_SERVICE_ACCOUNT_EMAIL for automatic backend sync)"
    };
  }

  try {
    // Dynamic import of googleapis when configured
    // @ts-ignore
    const { google } = await import("googleapis");
    const jwtClient = new google.auth.JWT(
      serviceAccountEmail,
      undefined,
      privateKey.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );

    await jwtClient.authorize();
    const calendar = google.calendar({ version: "v3", auth: jwtClient });

    // Parse timing
    const dateParts = new Date(data.dateStr);
    let year = dateParts.getFullYear();
    let month = dateParts.getMonth();
    let day = dateParts.getDate();

    let hours = 10;
    let mins = 0;
    const match12 = data.timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      hours = parseInt(match12[1], 10);
      mins = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    }

    const startTime = new Date(year, month, day, hours, mins, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const event = {
      summary: `CYBOTZ Trial Session: ${data.schoolName || data.email}`,
      description: `Client Email: ${data.email}\nPhone: ${data.phone}\nSchool: ${data.schoolName || "N/A"}\nNotes: ${data.additionalInfo || "None"}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    console.log(`[Google Calendar] Host calendar event created successfully! ID: ${res.data.id}`);
    return {
      success: true,
      eventId: res.data.id || undefined,
      message: "Event automatically synced to host Google Calendar!"
    };
  } catch (err: any) {
    console.error("[Google Calendar Error]", err.message);
    return {
      success: false,
      message: `Failed to sync host Google Calendar: ${err.message}`
    };
  }
}
