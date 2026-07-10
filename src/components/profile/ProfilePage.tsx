import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProfileTabs from './ProfileTabs';

// ---------------------------------------------------------------------------
// TopBar — the row at the very top: username on the left, actions on the right.
// ---------------------------------------------------------------------------
const TopBar = ({ username }: { username: string }) => {
    return (
        <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>{username}</Text>
            <View style={styles.topBarActions}>
                <TouchableOpacity hitSlop={8}>
                    <Ionicons name="git-compare-outline" size={26} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8}>
                    <Ionicons name="menu-outline" size={28} color={Colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// A single stat cell (value on top, label below). Kept tiny + reusable.
const Stat = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

type ProfileData = {
    username: string;
    name: string;
    avatarUrl: string;
    posts: number;
    followers: number;
    following: number;
    bio: string;
};

// ---------------------------------------------------------------------------
// ProfileDetails — avatar + stats, then name/bio, then action buttons.
// ---------------------------------------------------------------------------
const ProfileDetails = ({ profileData }: { profileData?: ProfileData }) => {
    if (!profileData) return null;

    const { name, avatarUrl, posts, followers, following, bio } = profileData;

    return (
        <View style={styles.details}>
            {/* Row: avatar + stats */}
            <View style={styles.detailsRow}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <View style={styles.addBadge}>
                        <Ionicons name="add" size={14} color={Colors.onPrimary} />
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <Stat value={posts} label="posts" />
                    <Stat value={followers} label="followers" />
                    <Stat value={following} label="following" />
                </View>
            </View>

            {/* Name + bio (full width) */}
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.bioText}>{bio}</Text>

            {/* Action buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Text style={styles.actionButtonText}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Text style={styles.actionButtonText}>Share profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ProfilePage = () => {
    // Dummy data for now — later this comes from Supabase.
    const profileData: ProfileData = {
        username: 'mohit.gujarati',
        name: 'Mohit Gujarati',
        avatarUrl: 'https://i.pravatar.cc/300?img=12', // working placeholder avatar
        posts: 3,
        followers: 367,
        following: 376,
        bio: 'New York 📍✨\nDebugging the mysteries of the universe 🌌',
    };

    return (
        <View style={styles.page}>
            <TopBar username={profileData.username} />
            <ProfileDetails profileData={profileData} />
            <ProfileTabs />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    // TopBar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    topBarTitle: {
        ...Typography.headlineMd,
        color: Colors.text,
    },
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },

    // ProfileDetails
    details: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: Spacing.xl,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
    },
    addBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 24,
        height: 24,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    statsRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...Typography.headlineMd,
        color: Colors.text,
    },
    statLabel: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    nameText: {
        ...Typography.labelBold,
        fontSize: 15,
        color: Colors.text,
        marginTop: Spacing.lg,
    },
    bioText: {
        ...Typography.bodySm,
        color: Colors.text,
        marginTop: Spacing.xs,
    },

    // Action buttons
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.surfaceMuted,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        alignItems: 'center',
    },
    actionButtonText: {
        ...Typography.labelBold,
        color: Colors.text,
    },
});

export default ProfilePage;
