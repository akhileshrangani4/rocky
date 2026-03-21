type ScheduleInput = {
  title: string;
  attendees: string[];
  startTime: string;
  durationMinutes: number;
  description?: string;
};

type TokenData = {
  access_token: string;
  expires_at: number;
};

let cachedToken: TokenData | null = null;

async function getAccessToken(): Promise<string> {
  // If we have a non-expired cached token, use it
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Google Calendar not configured. Set GOOGLE_CALENDAR_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET.",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh Google token: ${error}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

export async function scheduleMeeting(input: ScheduleInput) {
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to get access token",
    };
  }

  const startDate = new Date(input.startTime);
  const endDate = new Date(
    startDate.getTime() + input.durationMinutes * 60 * 1000,
  );

  const event = {
    summary: input.title,
    description: input.description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "America/New_York",
    },
    attendees: input.attendees.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    return { success: false, error: `Calendar API error: ${error}` };
  }

  const created = await res.json();
  return {
    success: true,
    eventId: created.id,
    meetLink:
      created.hangoutLink ||
      created.conferenceData?.entryPoints?.[0]?.uri,
    htmlLink: created.htmlLink,
    summary: `Scheduled "${input.title}" for ${startDate.toLocaleString()} with ${input.attendees.join(", ")}`,
  };
}
