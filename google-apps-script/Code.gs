/**
 * ============================================================================
 * CYBOTZ – Google Calendar Booking Engine (Google Apps Script)
 * ============================================================================
 * 100% Free Serverless Backend running on your Google Account.
 *
 * FEATURES:
 *  1. Live Collision Detection: Reads ALL planned events on the host's Google
 *     Calendar (meetings, personal blocks, all-day events, and prior bookings)
 *     so visitors can never book a slot that collides with any planned event.
 *  2. Instant Calendar Logging: The moment a booking is submitted, it is
 *     logged directly onto the host's Google Calendar and sends a Google
 *     Calendar invite to the visitor.
 *  3. Dual Email Notifications: Immediately emails BOTH the primary host
 *     account AND the configured SECONDARY_EMAIL, plus a confirmation email
 *     to the visitor.
 *
 * QUICK SETUP (5 MINUTES):
 *  1. Go to https://script.google.com -> New project -> paste this file.
 *  2. Update SECONDARY_EMAIL (and optionally HOST_EMAIL) in CONFIG below.
 *  3. In Project Settings (gear icon), set Time zone to GMT+05:30 (India).
 *  4. Select `testSetup` in the toolbar and click Run -> Grant permissions.
 *  5. Click Deploy -> New deployment -> Web app ->
 *     Execute as: "Me" | Who has access: "Anyone" -> Deploy.
 *  6. Copy the Web App URL into `Cybotz-landing/.env` as:
 *     VITE_BOOKING_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 * ============================================================================
 */

var CONFIG = {
  CALENDAR_ID: 'primary',                        // Host Google Calendar ('primary' = script owner's main calendar)
  HOST_EMAIL: '',                                // Primary host email ('' = script owner's Gmail address)
  SECONDARY_EMAIL: 'secondary@example.com',      // <--- PUT YOUR SECONDARY EMAIL HERE (comma-separated for multiple)
  BUSINESS_NAME: 'CYBOTZ',
  WEBSITE: 'https://cybotz.tech',
  TIMEZONE: 'Asia/Kolkata',
  SESSION_MINUTES: 60,                           // Duration of each booked session in minutes
  FIRST_SLOT: '09:00',                           // Earliest session start time (24h)
  LAST_SLOT: '16:00',                            // Latest session start time (24h)
  STEP_MINUTES: 15,                              // Slot interval in minutes
  CLOSED_WEEKDAYS: [0],                          // 0 = Sunday
  DAYS_AHEAD: 400,                               // How far ahead visitors can book (~13 months)
  LOCATION: 'School Campus / Premises'
};

var DATE_FMT = 'MMMM d, yyyy'; // e.g. "October 27, 2026"
var TIME_FMT = 'hh:mm a';      // e.g. "10:15 AM"
var CACHE_KEY = 'cybotz-booked-dates-v2';

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'slots') {
      return json_(dayAvailability_(p.date));
    }
    return json_({ bookedDates: bookedDates_() });
  } catch (err) {
    return json_({ error: String(err.message || err) });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ error: 'Invalid request payload.' });
  }

  // Honeypot spam filter
  if (body.website) return json_({ success: true });

  var date = clean_(body.date, 50);
  var time = clean_(body.time, 20);
  var email = clean_(body.email, 254);
  var phone = clean_(body.phone, 30);
  var schoolName = clean_(body.schoolName, 200);
  var info = clean_(body.additionalInfo, 1000);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json_({ error: 'A valid email address is required.' });
  }
  if (phone.replace(/\D/g, '').length < 7) {
    return json_({ error: 'A valid phone number is required.' });
  }

  var start = parseDateTime_(date, time);
  if (!start) {
    return json_({ error: 'Invalid date or time format.' });
  }
  var end = new Date(start.getTime() + CONFIG.SESSION_MINUTES * 60000);

  var validationError = validateSlot_(start);
  if (validationError) {
    return json_({ error: validationError });
  }

  var cache = CacheService.getScriptCache();
  var rlKey = 'rl:' + email.toLowerCase() + ':' + phone.replace(/\D/g, '');
  if (cache.get(rlKey)) {
    return json_({ error: 'A booking was just submitted with these details. Please wait a few minutes before booking again.' });
  }

  // Script lock guarantees two visitors cannot book overlapping slots simultaneously
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return json_({ error: 'Calendar is busy syncing. Please try again in a few seconds.' });
  }

  var event;
  var gcalUrl;
  try {
    var cal = calendar_();
    var dayEvents = eventsForDateStr_(cal, date);
    var hasCollision = dayEvents.some(function (ev) {
      return overlapsEvent_(start, end, ev);
    });

    if (hasCollision) {
      cache.remove(CACHE_KEY);
      return json_({
        error: 'The slot ' + time + ' on ' + date + ' collides with an existing event on the schedule. Please select another time.'
      });
    }

    var title = CONFIG.BUSINESS_NAME + ' Trial Session' + (schoolName ? ' – ' + schoolName : '');
    var description =
      'Booked via ' + CONFIG.WEBSITE + '\n' +
      '----------------------------------------\n' +
      'Date: ' + date + '\n' +
      'Time: ' + time + ' (' + CONFIG.SESSION_MINUTES + ' mins)\n' +
      'School / Org: ' + (schoolName || 'N/A') + '\n' +
      'Visitor Email: ' + email + '\n' +
      'Visitor Phone: ' + phone + '\n' +
      (info ? 'Notes: ' + info + '\n' : '');

    // 1. Immediately log the booking in the Host Google Calendar & invite visitor
    event = cal.createEvent(title, start, end, {
      description: description,
      location: CONFIG.LOCATION,
      guests: email,
      sendInvites: true
    });
    event.addPopupReminder(60);
    event.addEmailReminder(60);

    gcalUrl = buildGoogleCalendarTemplateUrl_(title, start, end, description, CONFIG.LOCATION);

    cache.remove(CACHE_KEY);
    cache.put(rlKey, '1', 300);
  } finally {
    lock.releaseLock();
  }

  var details = {
    date: date,
    time: time,
    email: email,
    phone: phone,
    schoolName: schoolName,
    info: info,
    eventId: event.getId()
  };

  // 2. Immediately send email to Host AND Secondary Email
  try { notifyHostAndSecondary_(details); } catch (err) { console.error('Host/Secondary email failed: ' + err); }

  // 3. Immediately send confirmation email to Visitor
  try { notifyVisitor_(details, gcalUrl); } catch (err) { console.error('Visitor email failed: ' + err); }

  return json_({
    success: true,
    message: 'Booking logged in Google Calendar and notifications dispatched!',
    eventId: event.getId(),
    gcalUrl: gcalUrl,
    bookedDates: bookedDates_()
  });
}

// ======================= COLLISION & AVAILABILITY =======================

function bookedDates_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var cal = calendar_();
  var from = startOfDay_(new Date());
  var to = new Date(from.getTime() + CONFIG.DAYS_AHEAD * 86400000);
  var allEvents = cal.getEvents(from, to).filter(isBlocking_);

  var eventsByDate = {};
  allEvents.forEach(function (ev) {
    var evStart = ev.isAllDayEvent() ? ev.getAllDayStartDate() : ev.getStartTime();
    var evEnd = ev.isAllDayEvent() ? ev.getAllDayEndDate() : ev.getEndTime();
    var cur = startOfDay_(evStart);
    while (cur < evEnd) {
      var key = fmt_(cur, DATE_FMT);
      (eventsByDate[key] = eventsByDate[key] || []).push(ev);
      cur = new Date(cur.getTime() + 86400000);
    }
  });

  var fullyBooked = Object.keys(eventsByDate).filter(function (dateStr) {
    return freeStarts_(dateStr, eventsByDate[dateStr]).length === 0;
  });

  cache.put(CACHE_KEY, JSON.stringify(fullyBooked), 60);
  return fullyBooked;
}

function dayAvailability_(dateStr) {
  var cal = calendar_();
  var events = eventsForDateStr_(cal, dateStr);
  var allSlots = allStarts_(dateStr);
  var freeSlots = freeStarts_(dateStr, events).map(function (d) { return fmt_(d, TIME_FMT); });

  var takenSlots = allSlots
    .map(function (d) { return fmt_(d, TIME_FMT); })
    .filter(function (t) { return freeSlots.indexOf(t) === -1; });

  var busyBlocks = events.map(function (ev) {
    if (ev.isAllDayEvent()) return 'All Day (Unavailable)';
    return fmt_(ev.getStartTime(), TIME_FMT) + ' – ' + fmt_(ev.getEndTime(), TIME_FMT);
  });

  return {
    date: dateStr,
    taken: takenSlots,
    available: freeSlots,
    busyBlocks: busyBlocks,
    sessionMinutes: CONFIG.SESSION_MINUTES
  };
}

function eventsForDateStr_(cal, dateStr) {
  var dayStart = parseDateOnly_(dateStr);
  if (!dayStart) return [];
  var dayEnd = new Date(dayStart.getTime() + 86400000);
  var byRange = cal.getEvents(dayStart, dayEnd);
  var byDay = cal.getEventsForDay(dayStart);

  var seen = {};
  var merged = [];
  byRange.concat(byDay).forEach(function (ev) {
    var key = ev.getId() + ':' + (ev.isAllDayEvent() ? 'allday' : ev.getStartTime().getTime());
    if (!seen[key] && isBlocking_(ev)) {
      seen[key] = true;
      merged.push(ev);
    }
  });
  return merged;
}

function overlapsEvent_(slotStart, slotEnd, ev) {
  if (ev.isAllDayEvent()) {
    return true;
  }
  return slotStart.getTime() < ev.getEndTime().getTime() &&
         slotEnd.getTime() > ev.getStartTime().getTime();
}

function allStarts_(dateStr) {
  var out = [];
  var cur = parseDateTime24_(dateStr, CONFIG.FIRST_SLOT);
  var last = parseDateTime24_(dateStr, CONFIG.LAST_SLOT);
  if (!cur || !last) return out;
  while (cur.getTime() <= last.getTime()) {
    out.push(cur);
    cur = new Date(cur.getTime() + CONFIG.STEP_MINUTES * 60000);
  }
  return out;
}

function freeStarts_(dateStr, events) {
  var durationMs = CONFIG.SESSION_MINUTES * 60000;
  var now = Date.now();
  return allStarts_(dateStr).filter(function (slotStart) {
    if (slotStart.getTime() <= now) return false;
    var slotEnd = new Date(slotStart.getTime() + durationMs);
    return !events.some(function (ev) {
      return overlapsEvent_(slotStart, slotEnd, ev);
    });
  });
}

function validateSlot_(start) {
  if (!start || isNaN(start.getTime())) return 'Invalid date or time.';
  var weekday = Number(fmt_(start, 'u')) % 7; // 0 = Sunday
  if (CONFIG.CLOSED_WEEKDAYS.indexOf(weekday) !== -1) {
    return 'Sessions are not available on Sundays.';
  }
  var hm = fmt_(start, 'HH:mm');
  if (hm < CONFIG.FIRST_SLOT || hm > CONFIG.LAST_SLOT) {
    return 'Please choose a time between ' + CONFIG.FIRST_SLOT + ' and ' + CONFIG.LAST_SLOT + '.';
  }
  if (start.getTime() <= Date.now()) {
    return 'Please choose a future date and time.';
  }
  if (start.getTime() > Date.now() + CONFIG.DAYS_AHEAD * 86400000) {
    return 'Selected date is outside the booking window.';
  }
  return null;
}

function isBlocking_(ev) {
  try {
    if (ev.getMyStatus() === CalendarApp.GuestStatus.NO) return false;
  } catch (e) {}
  try {
    if (ev.getTransparency && ev.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT) return false;
  } catch (e) {}
  return true;
}

// ======================= NOTIFICATIONS =======================

function notifyHostAndSecondary_(d) {
  var primaryHost = (CONFIG.HOST_EMAIL || Session.getEffectiveUser().getEmail() || '').trim();
  var secondaryRaw = (CONFIG.SECONDARY_EMAIL || '').trim();

  var recipients = [];
  if (primaryHost) recipients.push(primaryHost);

  if (secondaryRaw && secondaryRaw.toLowerCase() !== 'secondary@example.com') {
    secondaryRaw.split(',').forEach(function (addr) {
      var trimmed = addr.trim();
      if (trimmed && recipients.indexOf(trimmed) === -1) {
        recipients.push(trimmed);
      }
    });
  }

  if (recipients.length === 0) return;

  var subject = '📅 New CYBOTZ Booking: ' + d.date + ' at ' + d.time + (d.schoolName ? ' – ' + d.schoolName : '');
  var htmlBody =
    '<h2>New Trial Session Logged in Google Calendar</h2>' +
    '<p>A visitor has just booked a slot on <b>' + esc_( CONFIG.WEBSITE ) + '</b>. ' +
    'This session has been automatically logged in the host Google Calendar.</p>' +
    table_(d) +
    '<p style="margin-top:16px">' +
    '<a href="mailto:' + esc_(d.email) + '" style="background:#0284c7;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold">✉️ Email Visitor</a>' +
    '</p>';

  // Send to each recipient (host + secondary email)
  recipients.forEach(function (recipientEmail) {
    MailApp.sendEmail({
      to: recipientEmail,
      replyTo: d.email,
      name: CONFIG.BUSINESS_NAME + ' Booking System',
      subject: subject,
      htmlBody: htmlBody
    });
  });
}

function notifyVisitor_(d, gcalUrl) {
  var replyTo = (CONFIG.HOST_EMAIL || Session.getEffectiveUser().getEmail() || '').trim();
  MailApp.sendEmail({
    to: d.email,
    name: CONFIG.BUSINESS_NAME,
    replyTo: replyTo,
    subject: 'Confirmed: ' + CONFIG.BUSINESS_NAME + ' Trial Session on ' + d.date + ' at ' + d.time,
    htmlBody:
      '<h2>Your Trial Session is Confirmed! 🎉</h2>' +
      '<p>Thank you for scheduling a session with <b>' + esc_(CONFIG.BUSINESS_NAME) + '</b>. ' +
      'Your booking has been logged on our calendar and a Google Calendar invitation has been sent to your email.</p>' +
      table_(d) +
      (gcalUrl ? '<p style="margin-top:16px"><a href="' + gcalUrl + '" style="background:#4f46e5;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold">📅 Add to Google Calendar</a></p>' : '') +
      '<p>Need to reschedule? Simply reply to this email.</p>' +
      '<p>— Team ' + esc_(CONFIG.BUSINESS_NAME) + '<br><a href="' + CONFIG.WEBSITE + '">' + CONFIG.WEBSITE + '</a></p>'
  });
}

// ======================= DATE & STRING HELPERS =======================

function calendar_() {
  var cal = CONFIG.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!cal) throw new Error('Calendar not found: ' + CONFIG.CALENDAR_ID);
  return cal;
}

function parseDateOnly_(dateStr) {
  try {
    var d = Utilities.parseDate(dateStr, CONFIG.TIMEZONE, DATE_FMT);
    return startOfDay_(d);
  } catch (e) {
    return null;
  }
}

function parseDateTime_(dateStr, time12Str) {
  try {
    return Utilities.parseDate(dateStr + ' ' + time12Str, CONFIG.TIMEZONE, DATE_FMT + ' ' + TIME_FMT);
  } catch (e) {
    return null;
  }
}

function parseDateTime24_(dateStr, time24Str) {
  try {
    return Utilities.parseDate(dateStr + ' ' + time24Str, CONFIG.TIMEZONE, DATE_FMT + ' HH:mm');
  } catch (e) {
    return null;
  }
}

function buildGoogleCalendarTemplateUrl_(title, start, end, details, location) {
  var fmtIso = function (d) {
    return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  };
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(title) +
    '&dates=' + fmtIso(start) + '/' + fmtIso(end) +
    '&details=' + encodeURIComponent(details) +
    '&location=' + encodeURIComponent(location);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, max);
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt_(d, pattern) {
  return Utilities.formatDate(d, CONFIG.TIMEZONE, pattern);
}

function startOfDay_(d) {
  return Utilities.parseDate(fmt_(d, 'yyyy-MM-dd') + ' 00:00:00', CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function table_(d) {
  var rows = [
    ['Date', d.date],
    ['Time', d.time + ' (' + CONFIG.SESSION_MINUTES + ' mins, ' + CONFIG.TIMEZONE + ')'],
    ['School / Organization', d.schoolName || 'N/A'],
    ['Visitor Email', d.email],
    ['Visitor Phone', d.phone]
  ];
  if (d.info) rows.push(['Additional Notes', d.info]);
  return '<table cellpadding="6" style="border-collapse:collapse;border:1px solid #e2e8f0">' +
    rows.map(function (r) {
      return '<tr><td style="color:#475569;border:1px solid #e2e8f0"><b>' + r[0] + '</b></td>' +
             '<td style="border:1px solid #e2e8f0">' + esc_(r[1]) + '</td></tr>';
    }).join('') + '</table>';
}

/** Run once in the Apps Script editor to authorize Calendar + Mail permissions. */
function testSetup() {
  console.log('Connected Calendar: ' + calendar_().getName());
  console.log('Primary Host Email: ' + (CONFIG.HOST_EMAIL || Session.getEffectiveUser().getEmail()));
  console.log('Secondary Email: ' + CONFIG.SECONDARY_EMAIL);
  console.log('Fully Booked Dates: ' + JSON.stringify(bookedDates_()));
  console.log('Remaining Daily Email Quota: ' + MailApp.getRemainingDailyQuota());
}
