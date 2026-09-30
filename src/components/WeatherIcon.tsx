import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain,
  CloudSnow, CloudLightning, Snowflake, Cloudy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  sun: Sun,
  'sun-cloud': CloudSun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

export function WeatherIcon({
  code,
  size = 48,
  className = '',
  animate = false,
}: {
  code: number;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const iconMap: Record<number, string> = {
    0: 'sun', 1: 'sun-cloud', 2: 'cloud-sun', 3: 'cloud',
    45: 'fog', 48: 'fog',
    51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
    61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
    71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
    80: 'rain', 81: 'rain', 82: 'rain', 85: 'snow', 86: 'snow',
    95: 'thunder', 96: 'thunder', 99: 'thunder',
  };
  const iconName = iconMap[code] ?? 'sun';
  const Icon = ICON_MAP[iconName] ?? Sun;

  const animClass = animate
    ? code === 0 ? 'animate-spin-slow'
    : code >= 95 ? 'animate-pulse'
    : code >= 51 && code <= 67 ? 'animate-bounce-rain'
    : ''
    : '';

  return <Icon size={size} className={`${className} ${animClass}`} strokeWidth={1.5} />;
}
