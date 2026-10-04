// UTM Parameter tracking utility
export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  capturedAt?: string;
}

const UTM_STORAGE_KEY = 'cybotz_utm_params';

export function captureUtmParams(): UtmParams {
  if (typeof window === 'undefined') return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const utm_source = searchParams.get('utm_source');
    const utm_medium = searchParams.get('utm_medium');
    const utm_campaign = searchParams.get('utm_campaign');
    const utm_term = searchParams.get('utm_term');
    const utm_content = searchParams.get('utm_content');
    const ref = searchParams.get('ref');

    // If query params are found, save them into sessionStorage
    if (utm_source || utm_medium || utm_campaign || utm_term || utm_content || ref) {
      const captured: UtmParams = {
        ...(utm_source ? { utm_source } : {}),
        ...(utm_medium ? { utm_medium } : {}),
        ...(utm_campaign ? { utm_campaign } : {}),
        ...(utm_term ? { utm_term } : {}),
        ...(utm_content ? { utm_content } : {}),
        ...(ref ? { ref } : {}),
        capturedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
      return captured;
    }

    // Otherwise, check if we previously captured them in this session
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error capturing UTM params:', err);
  }

  return {};
}

export function getStoredUtmParams(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error reading stored UTM params:', err);
  }
  return {};
}
