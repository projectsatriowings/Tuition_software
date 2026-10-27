import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { themeTokens } from '@tuition/shared';
import { getApiBaseUrl, buildApiUrl } from '../services/api';
import { MobileStorage } from '../services/storage';
import { AppConfig } from '../config/index';

interface StudentAvatarProps {
  studentId?: string;
  photoUrl?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const PASTEL_COLORS = [
  { bg: '#EFEBE9', text: '#5D4037' },
  { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#EDE9FE', text: '#6D28D9' },
  { bg: '#DCFCE7', text: '#15803D' },
  { bg: '#FCE7F3', text: '#BE185D' },
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'S';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColor(name?: string) {
  if (!name) return PASTEL_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[idx];
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  studentId,
  photoUrl,
  name,
  size = 40,
  style,
}) => {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const initials = getInitials(name);
  const colorScheme = getColor(name);

  useEffect(() => {
    let isMounted = true;

    async function resolvePhoto() {
      if (!photoUrl) {
        if (isMounted) {
          setResolvedUri(null);
        }
        return;
      }

      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        if (isMounted) {
          setResolvedUri(photoUrl);
        }
        return;
      }

      try {
        const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
        const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';

        let endpoint = photoUrl;
        if (!photoUrl.startsWith('/api/')) {
          if (studentId) {
            endpoint = `students/${studentId}/photo`;
          } else {
            endpoint = `students/photo-raw/${encodeURIComponent(photoUrl)}`;
          }
        } else {
          endpoint = photoUrl.replace(/^\/api\/?/, '');
        }

        const fullUrl = buildApiUrl(getApiBaseUrl(), endpoint);
        const sep = fullUrl.includes('?') ? '&' : '?';
        const finalUrl = tokenParam ? `${fullUrl}${sep}${tokenParam}` : fullUrl;

        if (isMounted) {
          setResolvedUri(finalUrl);
        }
      } catch {
        if (isMounted) {
          setResolvedUri(null);
        }
      }
    }

    resolvePhoto();

    return () => {
      isMounted = false;
    };
  }, [photoUrl, studentId]);

  const avatarRadius = size / 2;
  const fontSize = Math.max(10, Math.round(size * 0.4));

  if (!resolvedUri || hasError) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: avatarRadius,
            backgroundColor: colorScheme.bg,
            borderColor: themeTokens.colors.border,
          },
          style,
        ]}
      >
        <Text style={[styles.initialsText, { fontSize, color: colorScheme.text }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: avatarRadius,
          borderColor: themeTokens.colors.border,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: resolvedUri }}
        style={{ width: size, height: size, borderRadius: avatarRadius }}
        onError={() => setHasError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
  },
});

export default StudentAvatar;
