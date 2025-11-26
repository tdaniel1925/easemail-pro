'use client';

import { useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Droplets, Eye, Gauge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  icon: string;
}

export default function WeatherDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get user's location
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Fetch weather data using OpenWeatherMap API (you'll need to add API key to env)
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'demo';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();

      setWeather({
        location: data.name,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed),
        visibility: Math.round(data.visibility / 1609.34), // Convert meters to miles
        pressure: data.main.pressure,
        icon: data.weather[0].icon,
      });
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Failed to get weather data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !weather && !loading) {
      fetchWeather();
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="h-8 w-8 text-gray-400" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-8 w-8 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="h-8 w-8 text-blue-300" />;
      default:
        return <Cloud className="h-8 w-8 text-gray-400" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Cloud className="h-4 w-4 mr-2" />
          Get Weather
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4" align="end">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading weather...</span>
          </div>
        )}

        {error && (
          <div className="py-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWeather}
              className="mt-3 w-full"
            >
              Try Again
            </Button>
          </div>
        )}

        {weather && !loading && !error && (
          <div className="space-y-4">
            {/* Location & Main Temp */}
            <div className="text-center">
              <h3 className="text-lg font-semibold">{weather.location}</h3>
              <div className="flex items-center justify-center gap-3 mt-2">
                {getWeatherIcon(weather.condition)}
                <div>
                  <div className="text-3xl font-bold">{weather.temperature}°F</div>
                  <div className="text-sm text-muted-foreground">{weather.condition}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Feels like {weather.feelsLike}°F
              </p>
            </div>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Humidity</div>
                  <div className="text-sm font-medium">{weather.humidity}%</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Wind</div>
                  <div className="text-sm font-medium">{weather.windSpeed} mph</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Visibility</div>
                  <div className="text-sm font-medium">{weather.visibility} mi</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Pressure</div>
                  <div className="text-sm font-medium">{weather.pressure} hPa</div>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchWeather}
              className="w-full mt-2"
            >
              Refresh Weather
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
