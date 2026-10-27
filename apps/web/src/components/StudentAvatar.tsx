import React, { useState } from 'react';

interface StudentAvatarProps {
  studentId?: string;
  photoUrl?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<string, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-base' },
  xl: { container: 'w-20 h-20', text: 'text-xl' },
};

const PASTEL_BG_COLORS = [
  'bg-[#EFEBE9] text-[#5D4037]', // Warm cocoa / mocha
  'bg-[#E0F2FE] text-[#0369A1]', // Soft sky
  'bg-[#FEF3C7] text-[#B45309]', // Soft amber
  'bg-[#EDE9FE] text-[#6D28D9]', // Soft violet
  'bg-[#DCFCE7] text-[#15803D]', // Soft emerald
  'bg-[#FCE7F3] text-[#BE185D]', // Soft rose
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'S';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorForName(name?: string): string {
  if (!name) return PASTEL_BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PASTEL_BG_COLORS.length;
  return PASTEL_BG_COLORS[idx];
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  studentId,
  photoUrl,
  name,
  size = 'md',
  className = '',
  alt = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);
  const colorClass = getColorForName(name);

  // Build authenticated image source if URL is present
  const resolvedUrl = React.useMemo(() => {
    if (!photoUrl || hasError) return null;

    // External absolute URL
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('tuition_access_token') : null;
    const tokenQuery = token ? `token=${encodeURIComponent(token)}` : '';

    let baseEndpoint = photoUrl;
    if (!photoUrl.startsWith('/api/')) {
      if (studentId) {
        baseEndpoint = `/api/students/${studentId}/photo`;
      } else {
        baseEndpoint = `/api/students/photo-raw/${encodeURIComponent(photoUrl)}`;
      }
    }

    if (!tokenQuery) return baseEndpoint;
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    return `${baseEndpoint}${separator}${tokenQuery}`;
  }, [photoUrl, studentId, hasError]);

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`${sizeClass.container} rounded-full flex items-center justify-center font-bold select-none shrink-0 border border-[#D7CCC8]/60 ${colorClass} ${className}`}
        title={name || 'Student'}
      >
        <span className={sizeClass.text}>{initials}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClass.container} shrink-0 rounded-full overflow-hidden border border-[#D7CCC8] ${className}`}>
      {isLoading && (
        <div className={`absolute inset-0 animate-pulse flex items-center justify-center font-bold ${colorClass}`}>
          <span className={sizeClass.text}>{initials}</span>
        </div>
      )}
      <img
        src={resolvedUrl}
        alt={alt || name || 'Student'}
        className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

export default StudentAvatar;
