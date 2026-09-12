import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { createStyles, colors, fonts, palette, radius, shadow } from '../../constants/theme';
import ZText, { ZTextVariant } from './ZText';

/**
 * The one card every auth screen sits in.
 *
 * Ported from the customer website's mobile auth view (website-customer
 * Pages/Auth/AuthBrand.css, the max-width:860px block): a white rounded card on the
 * warm paper ground, a centred crest (the yellow "Welcome to ZPIN" pill on
 * login/signup, a round icon tile on the password + OTP screens), centred header
 * copy, then the form.
 *
 * Six screens shared this layout by copy-paste before, which is how login and
 * forgot-password drifted into two different looks in the first place.
 */
export interface AuthCardProps {
    /** Yellow pill text — login / signup. Mutually exclusive with `icon`. */
    badge?: string;
    badgeIcon?: LucideIcon;
    /** Round icon tile — the password and OTP screens. */
    icon?: LucideIcon;
    iconBg?: string;
    iconColor?: string;
    title: string;
    titleVariant?: ZTextVariant;
    subtitle?: React.ReactNode;
    /** The website's handwritten corner mark, inside the card (login + signup). */
    mark?: boolean;
    children: React.ReactNode;
    style?: any;
}

export default function AuthCard({
    badge,
    badgeIcon: BadgeIcon,
    icon: Icon,
    iconBg = colors.surfaceInverse,
    iconColor = palette.yellow500,
    title,
    titleVariant = 'h2',
    subtitle,
    mark = false,
    children,
    style,
}: AuthCardProps) {
    return (
        <View style={[styles.card, style]}>
            {mark && <Text style={styles.mark}>{`Faster\nFashion\nHappier\nYou`}</Text>}

            {!!badge && (
                <View style={styles.crest}>
                    <View style={styles.badge}>
                        {BadgeIcon ? <BadgeIcon size={13} color={palette.yellow600} fill={palette.yellow600} /> : null}
                        <ZText variant="smStrong" style={styles.badgeText}>{badge}</ZText>
                    </View>
                </View>
            )}

            {Icon && !badge && (
                <View style={styles.crest}>
                    <View style={[styles.iconTile, { backgroundColor: iconBg }]}>
                        <Icon size={28} color={iconColor} />
                    </View>
                </View>
            )}

            <ZText variant={titleVariant} style={styles.title}>{title}</ZText>
            {subtitle ? <ZText variant="muted" style={styles.subtitle}>{subtitle}</ZText> : null}

            {children}
        </View>
    );
}

const styles = createStyles({
    card: {
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.xl,
        paddingHorizontal: 20,
        paddingVertical: 26,
        ...shadow.md,
    },
    // .zl-right-handwritten — top-right corner of the card, behind nothing (the
    // crest is centred), so it never overlaps the badge.
    mark: {
        position: 'absolute', top: 14, right: 16,
        fontFamily: fonts.script, fontSize: 17, lineHeight: 19,
        color: palette.yellow500, opacity: 0.75, textAlign: 'right',
    },
    crest: { alignItems: 'center', marginBottom: 18 },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: palette.yellow100, borderRadius: radius.full,
        paddingHorizontal: 13, paddingVertical: 7,
    },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textStrong },
    iconTile: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 23 },
});
