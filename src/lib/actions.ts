export const getSuggestions = async (chatHistory: [string, string][]) => {
  const chatModel = localStorage.getItem('chatModelKey');
  const chatModelProvider = localStorage.getItem('chatModelProviderId');

  const res = await fetch(`/api/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatHistory,
      chatModel: {
        providerId: chatModelProvider,
        key: chatModel,
      },
    }),
  });

  const data = (await res.json()) as { suggestions: string[] };

  return data.suggestions;
};

// Timezone to coordinates mapping fallback
function getTimezoneLocation(): { latitude: number; longitude: number; city: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Tehran') || tz.includes('Iran')) {
      return { latitude: 35.6892, longitude: 51.389, city: 'Tehran' };
    }
    if (tz.includes('Dubai') || tz.includes('Muscat')) {
      return { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' };
    }
    if (tz.includes('London')) {
      return { latitude: 51.5074, longitude: -0.1278, city: 'London' };
    }
    if (tz.includes('Paris')) {
      return { latitude: 48.8566, longitude: 2.3522, city: 'Paris' };
    }
    if (tz.includes('Berlin') || tz.includes('Amsterdam') || tz.includes('Rome')) {
      return { latitude: 52.52, longitude: 13.405, city: 'Berlin' };
    }
    if (tz.includes('New_York')) {
      return { latitude: 40.7128, longitude: -74.006, city: 'New York' };
    }
    if (tz.includes('Los_Angeles')) {
      return { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles' };
    }
    if (tz.includes('Tokyo')) {
      return { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' };
    }
    if (tz.includes('Istanbul')) {
      return { latitude: 41.0082, longitude: 28.9784, city: 'Istanbul' };
    }
  } catch {
    // fallback below
  }
  return { latitude: 35.6892, longitude: 51.389, city: 'Tehran' };
}

export const getApproxLocation = async () => {
  const fallback = getTimezoneLocation();

  // Try fast IP-API with 1.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || fallback.city,
        };
      }
    }
  } catch {
    // Graceful fallback to timezone-detected location
  }

  return fallback;
};
