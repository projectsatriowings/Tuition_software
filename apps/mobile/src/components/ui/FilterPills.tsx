import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { themeTokens } from '@tuition/shared';

export interface FilterOption<T = string> {
  id: T;
  label: string;
  badge?: number | string;
}

export interface FilterPillsProps<T = string> {
  options: FilterOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function FilterPills<T extends string | number>({
  options,
  selectedId,
  onSelect,
  style,
}: FilterPillsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, style]}
    >
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <TouchableOpacity
            key={String(opt.id)}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}
            >
              {opt.label}
            </Text>
            {opt.badge !== undefined && (
              <Text
                style={[
                  styles.badgeText,
                  isSelected ? styles.badgeTextSelected : styles.badgeTextUnselected,
                ]}
              >
                {opt.badge}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: themeTokens.radii.full,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: themeTokens.colors.espresso,
    borderColor: themeTokens.colors.espresso,
  },
  pillUnselected: {
    backgroundColor: themeTokens.colors.surface,
    borderColor: themeTokens.colors.border,
  },
  pillText: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: themeTokens.typography.weights.semibold,
  },
  pillTextSelected: {
    color: themeTokens.colors.textLight,
  },
  pillTextUnselected: {
    color: themeTokens.colors.textPrimary,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: themeTokens.radii.full,
  },
  badgeTextSelected: {
    backgroundColor: themeTokens.colors.cocoa,
    color: themeTokens.colors.textLight,
  },
  badgeTextUnselected: {
    backgroundColor: themeTokens.colors.borderSubtle,
    color: themeTokens.colors.textSecondary,
  },
});

