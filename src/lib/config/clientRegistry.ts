'use client';

const getClientConfig = (key: string, defaultVal?: any) => {
  return localStorage.getItem(key) ?? defaultVal ?? undefined;
};

export const getTheme = () => getClientConfig('theme', 'dark');

export const getAutoMediaSearch = () =>
  getClientConfig('autoMediaSearch', 'true') === 'true';

export const getSystemInstructions = () =>
  getClientConfig('systemInstructions', '');

export const getShowWeatherWidget = () =>
  getClientConfig('showWeatherWidget', 'true') === 'true';

export const getShowNewsWidget = () =>
  getClientConfig('showNewsWidget', 'true') === 'true';

export const getMeasurementUnit = () => {
  const value =
    getClientConfig('measureUnit') ??
    getClientConfig('measurementUnit', 'metric');

  if (typeof value !== 'string') return 'metric';

  return value.toLowerCase();
};

export const getSoundEffectsEnabled = () =>
  getClientConfig('soundEffectsEnabled', 'true') === 'true';

export const getSoundEffectsVolume = () => {
  const val = parseFloat(getClientConfig('soundVolume', '0.7'));
  return isNaN(val) ? 0.7 : val;
};
