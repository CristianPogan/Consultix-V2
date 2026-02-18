import { Router } from 'express';
import { getIntegrationCredentials, saveIntegrationCredentials } from '../db.js';

const router = Router();

const CALENDAR_HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];

function formatTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}:00 ${period}` : `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

async function ensureGoogleToken(orgId, creds) {
  const expiry = creds.token_expiry;
  if (expiry && Date.now() < expiry - 60000) return creds.access_token;
  const refresh = creds.refresh_token;
  if (!refresh) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  await saveIntegrationCredentials(orgId, 'google_calendar', {
    ...creds,
    access_token: data.access_token,
    token_expiry: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
  });
  return data.access_token;
}

// GET /api/calendar/events?date=YYYY-MM-DD
router.get('/events', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
    const timeMin = dayStart.toISOString();
    const timeMax = dayEnd.toISOString();

    const events = [];
    const bySource = { calcom: [], google_calendar: [], calendly: [] };

    // Cal.com
    const calcom = await getIntegrationCredentials(orgId, 'calcom');
    if (calcom?.connected && calcom.credentials_json?.api_key) {
      try {
        const url = `https://api.cal.com/v2/bookings?afterStart=${encodeURIComponent(timeMin)}&beforeEnd=${encodeURIComponent(timeMax)}&status=upcoming,past&take=50`;
        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${calcom.credentials_json.api_key}`,
            'cal-api-version': '2024-08-13',
          },
        });
        if (r.ok) {
          const json = await r.json();
          const data = json.data || [];
          for (const b of data) {
            if (b.status === 'cancelled') continue;
            const start = new Date(b.start);
            const end = new Date(b.end);
            const title = b.title || 'Meeting';
            const attendee = b.attendees?.[0];
            const name = attendee?.name || 'Guest';
            const link = b.location || b.meetingUrl || '';
            const ev = {
              id: `calcom-${b.uid}`,
              start,
              end,
              time: formatTime(start),
              duration: formatDuration(b.duration || Math.round((end - start) / 60000)),
              title,
              name,
              company: '',
              type: title,
              link,
              source: 'calcom',
            };
            events.push(ev);
            bySource.calcom.push(ev);
          }
        }
      } catch (e) {
        console.error('Cal.com events error:', e);
      }
    }

    // Google Calendar
    const gcal = await getIntegrationCredentials(orgId, 'google_calendar');
    if (gcal?.connected && gcal.credentials_json?.access_token) {
      let token = gcal.credentials_json.access_token;
      token = await ensureGoogleToken(orgId, gcal.credentials_json) || token;
      if (token) {
        try {
          const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
          const r = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            const json = await r.json();
            for (const e of json.items || []) {
              const start = e.start?.dateTime ? new Date(e.start.dateTime) : new Date(e.start?.date || 0);
              const end = e.end?.dateTime ? new Date(e.end.dateTime) : new Date(e.end?.date || 0);
              const title = e.summary || 'Event';
              const link = e.hangoutLink || e.htmlLink || '';
              const ev = {
                id: `gcal-${e.id}`,
                start,
                end,
                time: formatTime(start),
                duration: formatDuration(Math.round((end - start) / 60000)),
                title,
                name: title,
                company: '',
                type: title,
                link,
                source: 'google_calendar',
              };
              events.push(ev);
              bySource.google_calendar.push(ev);
            }
          }
        } catch (e) {
          console.error('Google Calendar events error:', e);
        }
      }
    }

    // Calendly: would need OAuth access token - not implemented; skip

    events.sort((a, b) => a.start - b.start);

    res.json({
      date: dateStr,
      events,
      bySource,
      hours: CALENDAR_HOURS,
    });
  } catch (err) {
    console.error('Calendar events error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
