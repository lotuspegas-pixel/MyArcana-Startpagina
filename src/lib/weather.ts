/**
 * Weather comes from Open-Meteo: free, keyless and CORS-enabled, so the
 * widget works for every visitor without any configuration.
 */
export interface GeoPlace {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WeatherNow {
  temperature: number;
  apparent: number;
  humidity: number;
  wind: number;
  code: number;
  isDay: boolean;
}

export interface WeatherDay {
  date: string;
  code: number;
  min: number;
  max: number;
  precipitation: number;
}

export interface WeatherReport {
  now: WeatherNow;
  days: WeatherDay[];
  sunrise?: string;
  sunset?: string;
  unit: 'C' | 'F';
}

export async function searchPlaces(query: string, lang: string, signal?: AbortSignal) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=8&language=${encodeURIComponent(lang)}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { results?: GeoPlace[] };
  return data.results ?? [];
}

export async function fetchWeather(
  lat: number,
  lon: number,
  units: 'metric' | 'imperial',
  days: number,
  signal?: AbortSignal
): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset',
    timezone: 'auto',
    forecast_days: String(Math.min(Math.max(days, 1), 7)),
  });
  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
  }

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as {
    current: Record<string, number>;
    daily: Record<string, (number | string)[]>;
  };

  return {
    now: {
      temperature: d.current.temperature_2m,
      apparent: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
    },
    days: (d.daily.time as string[]).map((date, i) => ({
      date,
      code: Number(d.daily.weather_code[i]),
      max: Number(d.daily.temperature_2m_max[i]),
      min: Number(d.daily.temperature_2m_min[i]),
      precipitation: Number(d.daily.precipitation_sum[i]),
    })),
    sunrise: d.daily.sunrise?.[0] as string | undefined,
    sunset: d.daily.sunset?.[0] as string | undefined,
    unit: units === 'imperial' ? 'F' : 'C',
  };
}

/** WMO weather code → an emoji, picked for day or night. */
export function weatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '🌤️' : '☁️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '❄️';
  return '⛈️';
}
