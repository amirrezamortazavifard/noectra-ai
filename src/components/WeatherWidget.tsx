'use client';

import React, { useEffect, useState } from 'react';
import { Wind, CloudSun } from 'lucide-react';
import { getApproxLocation } from '@/lib/actions';

const WeatherWidget: React.FC = () => {
  const [data, setData] = useState({
    temperature: 24,
    condition: 'Clear',
    location: 'Tehran',
    humidity: 35,
    windSpeed: 8,
    icon: 'clear-day',
    temperatureUnit: 'C',
    windSpeedUnit: 'm/s',
  });

  const [loading, setLoading] = useState(true);

  const fetchLocation = async (): Promise<{
    latitude: number;
    longitude: number;
    city: string;
  }> => {
    // 1. Try browser geolocation with 2-second timeout
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 2000,
            maximumAge: 300000,
          });
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          city: 'Current Location',
        };
      } catch {
        // Fall through to IP/timezone location
      }
    }

    // 2. Approx location with timezone fallback
    return await getApproxLocation();
  };

  const updateWeather = async () => {
    try {
      const location = await fetchLocation();

      const res = await fetch(`/api/weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: location.latitude,
          lng: location.longitude,
          measureUnit: localStorage.getItem('measureUnit') ?? 'Metric',
        }),
      });

      if (!res.ok) {
        throw new Error(`Weather fetch failed: ${res.status}`);
      }

      const weatherData = await res.json();

      setData({
        temperature: Math.round(weatherData.temperature ?? 24),
        condition: weatherData.condition || 'Clear',
        location: location.city || 'Tehran',
        humidity: weatherData.humidity ?? 35,
        windSpeed: weatherData.windSpeed ?? 8,
        icon: weatherData.icon || 'clear-day',
        temperatureUnit: weatherData.temperatureUnit || 'C',
        windSpeedUnit: weatherData.windSpeedUnit || 'm/s',
      });
    } catch (err) {
      console.warn('WeatherWidget load error, using default location:', err);
      // Sensible fallback ensures widget is never stuck on skeleton
      setData({
        temperature: 24,
        condition: 'Clear',
        location: 'Tehran',
        humidity: 35,
        windSpeed: 8,
        icon: 'clear-day',
        temperatureUnit: 'C',
        windSpeedUnit: 'm/s',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateWeather();
    const intervalId = setInterval(updateWeather, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bg-light-secondary dark:bg-[#121316] rounded-2xl border border-light-200/80 dark:border-white/[0.08] shadow-sm flex flex-row items-center w-full h-24 min-h-[96px] max-h-[96px] px-3.5 py-2 gap-3 transition-colors">
      {loading ? (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full animate-pulse">
            <div className="h-10 w-10 rounded-full bg-light-200 dark:bg-dark-200 mb-2" />
            <div className="h-4 w-10 rounded bg-light-200 dark:bg-dark-200" />
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1 animate-pulse">
            <div className="flex flex-row items-center justify-between">
              <div className="h-3 w-20 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-12 rounded bg-light-200 dark:bg-dark-200" />
            </div>
            <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200 mt-1" />
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200">
              <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-8 rounded bg-light-200 dark:bg-dark-200" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full">
            {data.icon ? (
              <img
                src={`/weather-ico/${data.icon}.svg`}
                alt={data.condition}
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  // If svg icon missing, hide and show fallback icon
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <CloudSun className="h-9 w-9 text-amber-500 mb-1" />
            )}
            <span className="text-sm sm:text-base font-semibold text-black dark:text-white">
              {data.temperature}°{data.temperatureUnit}
            </span>
          </div>

          <div className="flex flex-col justify-between flex-1 h-full py-1.5 overflow-hidden">
            <div className="flex flex-row items-center justify-between gap-1">
              <span className="text-xs sm:text-sm font-semibold text-black dark:text-white truncate">
                {data.location}
              </span>
              <span className="flex items-center text-[11px] text-black/60 dark:text-white/60 font-medium flex-shrink-0">
                <Wind className="w-3 h-3 mr-1 text-cyan-500" />
                {data.windSpeed} {data.windSpeedUnit}
              </span>
            </div>

            <span className="text-xs text-black/50 dark:text-white/50 italic truncate">
              {data.condition}
            </span>

            <div className="flex flex-row justify-between w-full mt-auto pt-1.5 border-t border-light-200/50 dark:border-white/[0.06] text-[11px] text-black/50 dark:text-white/50 font-medium">
              <span>Humidity {data.humidity}%</span>
              <span className="font-semibold text-black/70 dark:text-white/70">
                Live
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
