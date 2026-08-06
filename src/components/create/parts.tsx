/**
 * Shared building blocks for the create form. The screen itself
 * (CreateForm.tsx) is long enough without every small component's styling
 * inline, and keeping them here means the labelled inputs, chips and menu rows
 * look identical wherever they're used.
 */
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    type TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Field — a label (with an optional red *) above whatever you pass as children.
// ---------------------------------------------------------------------------
export const Field = ({
    label,
    required = false,
    children,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>
            {label}
            {required ? <Text style={styles.requiredMark}> {Strings.create.required}</Text> : null}
        </Text>
        {children}
    </View>
);

// ---------------------------------------------------------------------------
// LabeledInput — Field + TextInput, with an optional leading icon and an
// optional live character counter.
//
// `...inputProps` forwards anything TextInput accepts (keyboardType, multiline,
// maxLength…) without this component needing to know about them.
// ---------------------------------------------------------------------------
type LabeledInputProps = TextInputProps & {
    label: string;
    required?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    /** Shows "123/500" under the box. Pass the same number as maxLength. */
    counterMax?: number;
};

export const LabeledInput = ({
    label,
    required,
    icon,
    counterMax,
    style,
    ...inputProps
}: LabeledInputProps) => (
    <Field label={label} required={required}>
        <View style={styles.inputRow}>
            {icon ? (
                <Ionicons
                    name={icon}
                    size={18}
                    color={Colors.textSecondary}
                    style={styles.inputIcon}
                />
            ) : null}
            <TextInput
                style={[styles.input, icon ? styles.inputWithIcon : null, style]}
                placeholderTextColor={Colors.textSecondary}
                {...inputProps}
            />
        </View>
        {counterMax ? (
            <Text style={styles.counter}>
                {String(inputProps.value ?? '').length}/{counterMax}
            </Text>
        ) : null}
    </Field>
);

// ---------------------------------------------------------------------------
// ChipRow — single-select pills. Generic: it doesn't know whether it's picking
// a category or a condition.
// ---------------------------------------------------------------------------
export const ChipRow = ({
    options,
    value,
    onChange,
}: {
    options: readonly string[];
    value: string;
    onChange: (next: string) => void;
}) => (
    <View style={styles.chipRow}>
        {options.map((option) => {
            const isActive = option === value;
            return (
                <TouchableOpacity
                    key={option}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => onChange(option)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

// ---------------------------------------------------------------------------
// ActionChip — a small tappable pill with an icon or a thumbnail ("Poll",
// "Prompt", an audio track).
// ---------------------------------------------------------------------------
export const ActionChip = ({
    icon,
    label,
    leftImage,
    onPress,
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    label: string;
    leftImage?: string;
    onPress?: () => void;
}) => (
    <TouchableOpacity style={styles.actionChip} onPress={onPress} activeOpacity={0.7}>
        {leftImage ? (
            <Image source={{ uri: leftImage }} style={styles.actionChipImage} contentFit="cover" />
        ) : icon ? (
            <Ionicons name={icon} size={16} color={Colors.text} style={styles.actionChipIcon} />
        ) : null}
        <Text style={styles.actionChipText}>{label}</Text>
    </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// MenuItem — the full-width settings-style row: icon, title, optional
// subtitle, and something on the right (text, a badge, a Switch, or a chevron).
// ---------------------------------------------------------------------------
export const MenuItem = ({
    iconName,
    IconFamily = Ionicons,
    title,
    subtitle,
    rightText,
    rightBadge,
    rightElement,
    hideArrow = false,
    onPress,
}: {
    iconName: keyof typeof Ionicons.glyphMap | keyof typeof Feather.glyphMap;
    IconFamily?: any;
    title: string;
    subtitle?: string;
    rightText?: string;
    rightBadge?: string;
    rightElement?: ReactNode;
    hideArrow?: boolean;
    onPress?: () => void;
}) => (
    <TouchableOpacity
        style={styles.menuItem}
        activeOpacity={0.7}
        onPress={onPress}
        // A row whose only control is a Switch shouldn't swallow taps meant for
        // the switch itself.
        disabled={!onPress && !!rightElement}
    >
        <IconFamily name={iconName} size={24} color={Colors.text} style={styles.menuIcon} />

        <View style={styles.menuCenter}>
            <Text style={Typography.bodyLg}>{title}</Text>
            {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.menuRight}>
            {rightText ? <Text style={styles.menuRightText}>{rightText}</Text> : null}
            {rightBadge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{rightBadge}</Text>
                </View>
            ) : null}
            {rightElement}
            {!hideArrow && !rightElement ? (
                <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            ) : null}
        </View>
    </TouchableOpacity>
);

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
    field: {
        marginTop: Spacing.lg,
    },
    fieldLabel: {
        ...Typography.labelBold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    requiredMark: {
        color: Colors.primary,
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: Spacing.md,
        // Sits above the TextInput so the icon doesn't get covered by it.
        zIndex: 1,
    },
    input: {
        flex: 1,
        ...Typography.bodyLg,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    inputWithIcon: {
        paddingLeft: Spacing.xxl + Spacing.xs,
    },
    counter: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
        alignSelf: 'flex-end',
        marginTop: Spacing.xs,
    },

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: Colors.background,
        borderColor: Colors.text,
    },
    chipText: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    chipTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },

    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceMuted,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
    },
    actionChipIcon: {
        marginRight: Spacing.xs,
    },
    actionChipImage: {
        width: 20,
        height: 20,
        borderRadius: Radius.sm,
        marginRight: Spacing.sm,
    },
    actionChipText: {
        ...Typography.bodySm,
        color: Colors.text,
        fontWeight: '500',
    },

    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    menuIcon: {
        marginRight: Spacing.lg,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    menuCenter: {
        flex: 1,
    },
    menuSubtitle: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        paddingRight: Spacing.lg,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuRightText: {
        ...Typography.bodyLg,
        color: Colors.textSecondary,
        marginRight: Spacing.xs,
    },
    badge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        marginRight: Spacing.xs,
    },
    badgeText: {
        ...Typography.labelSm,
        color: Colors.onPrimary,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.border,
    },
});
