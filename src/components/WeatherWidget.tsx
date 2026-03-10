import { useState, useEffect, useCallback } from "react";
import { Cloud, Sun, CloudRain, Snowflake, Wind, Thermometer, Droplets } from "lucide-react";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

const getWeatherIcon = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes("rain") || d.includes("drizzle")) return <CloudRain className="h-5 w-5" />;
  if (d.includes("snow")) return <Snowflake className="h-5 w-5" />;
  if (d.includes("cloud") || d.includes("overcast")) return <Cloud className="h-5 w-5" />;
  if (d.includes("wind")) return <Wind className="h-5 w-5" />;
  return <Sun className="h-5 w-5" />;
};

const getSuggestion = (weather: WeatherData): string => {
  if (weather.temp < 32) return "❄️ It's freezing — cozy indoor dates like a café, museum, or cooking together!";
  if (weather.temp < 50) return "🧥 Chilly out — try an indoor activity like bowling, movies, or a bookstore date!";
  if (weather.description.toLowerCase().includes("rain")) return "🌧️ Rainy day — perfect for a cozy café, art gallery, or movie marathon!";
  if (weather.temp > 85) return "🥵 It's hot — hit the pool, get ice cream, or find an air-conditioned spot!";
  if (weather.temp > 65) return "☀️ Beautiful weather — great for a park walk, outdoor dining, or a hike!";
  return "🌤️ Mild weather — perfect for almost anything!";
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("");

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      // Using Open-Meteo (free, no API key needed)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
      );
      const data = await res.json();
      const current = data.current;

      // Map WMO weather codes to descriptions
      const code = current.weather_code;
      let description = "Clear";
      if (code >= 1 && code <= 3) description = "Partly Cloudy";
      if (code >= 45 && code <= 48) description = "Foggy";
      if (code >= 51 && code <= 67) description = "Rainy";
      if (code >= 71 && code <= 77) description = "Snowy";
      if (code >= 80 && code <= 82) description = "Rain Showers";
      if (code >= 85 && code <= 86) description = "Snow Showers";
      if (code >= 95) description = "Thunderstorm";

      setWeather({
        temp: Math.round(current.temperature_2m),
        description,
        icon: description,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
      });

      // Reverse geocode for city name
      try {
        const geoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`
        );
        const geoData = await geoRes.json();
        if (geoData.timezone) {
          const parts = geoData.timezone.split("/");
          setCity(parts[parts.length - 1].replace(/_/g, " "));
        }
      } catch {
        // ignore geocode failure
      }
    } catch {
      // silent fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => setLoading(false),
      { timeout: 10000 }
    );
  }, [fetchWeather]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-16" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            {getWeatherIcon(weather.description)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">{weather.temp}°F</span>
              <span className="text-sm text-muted-foreground">{weather.description}</span>
            </div>
            {city && <p className="text-xs text-muted-foreground">{city}</p>}
          </div>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" /> {weather.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" /> {weather.windSpeed}mph
          </span>
        </div>
      </div>
      <p className="text-sm text-primary font-medium">{getSuggestion(weather)}</p>
    </div>
  );
};

export default WeatherWidget;
