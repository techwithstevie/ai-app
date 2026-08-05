import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { removeToken } from "../../features/auth/services/tokenStore";

function SettingRow({
    icon,
    title,
    subtitle,
    value,
    destructive,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    value?: string;
    destructive?: boolean;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            activeOpacity={onPress ? 0.8 : 1}
            disabled={!onPress}
        >
            <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                    <Ionicons
                        name={icon}
                        size={18}
                        color={destructive ? "#EF4444" : "#10B981"}
                    />
                </View>
                <View style={styles.settingTextWrap}>
                    <Text
                        style={[
                            styles.settingTitle,
                            destructive && styles.settingTitleDestructive,
                        ]}
                    >
                        {title}
                    </Text>
                    {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
                </View>
            </View>

            {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.screenTitle}>Settings</Text>
                <Text style={styles.screenSubtitle}>
                    Account details, environment info, and local controls.
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Account</Text>
                    <View style={styles.card}>
                        <View style={styles.accountRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>A</Text>
                            </View>

                            <View style={styles.accountInfo}>
                                <Text style={styles.accountName}>Local session</Text>
                                <Text style={styles.accountEmail}>Authenticated user</Text>
                            </View>
                        </View>

                        <View style={styles.accountMetaRow}>
                            <View style={styles.accountMetaColumn}>
                                <Text style={styles.accountMetaLabel}>Signed in</Text>
                                <Text style={styles.accountMetaText}>Access all app features securely.</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={async () => {
                                Alert.alert(
                                    "Sign out",
                                    "Are you sure you want to sign out?",
                                    [
                                        {
                                            text: "Cancel",
                                            style: "cancel",
                                        },
                                        {
                                            text: "Sign out",
                                            style: "destructive",
                                            onPress: async () => {
                                                await removeToken();
                                                router.replace("/sign-in");
                                            },
                                        },
                                    ]
                                );
                            }}
                        >
                            <View style={styles.signOutButtonInner}>
                                <Ionicons name="log-out-outline" size={16} color="#F8FAFC" />
                                <Text style={styles.signOutButtonText}>Sign out</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Support</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="help-circle-outline"
                            title="About this app"
                            subtitle="Local AI chat with personas, history, and persistent sessions"
                            onPress={() =>
                                Alert.alert(
                                    "About",
                                    "This app connects a React Native client to a FastAPI backend and Ollama for local AI chat."
                                )
                            }
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },
    screenTitle: {
        color: "#F9FAFB",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 6,
    },
    screenSubtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        color: "#8B94A3",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 10,
    },
    card: {
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        overflow: "hidden",
    },
    accountRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    avatarText: {
        color: "#F8FAFC",
        fontSize: 16,
        fontWeight: "700",
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 4,
    },
    accountEmail: {
        color: "#8B94A3",
        fontSize: 12,
    },
    accountMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#2A3342",
        backgroundColor: "#121827",
    },
    accountMetaColumn: {
        flex: 1,
    },
    accountMetaLabel: {
        color: "#9CA3AF",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 4,
    },
    accountMetaText: {
        color: "#D1D5DB",
        fontSize: 13,
        lineHeight: 18,
    },
    signOutButton: {
        marginTop: 12,
        marginHorizontal: 14,
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: "#DC2626",
        overflow: "hidden",
    },
    signOutButtonInner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
    },
    signOutButtonText: {
        color: "#F8FAFC",
        fontSize: 14,
        fontWeight: "700",
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 12,
    },
    settingIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0F141B",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    settingTextWrap: {
        flex: 1,
    },
    settingTitle: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 2,
    },
    settingTitleDestructive: {
        color: "#F87171",
    },
    settingSubtitle: {
        color: "#8B94A3",
        fontSize: 12,
        lineHeight: 18,
    },
    settingValue: {
        color: "#9CA3AF",
        fontSize: 12,
        maxWidth: 120,
        textAlign: "right",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#2A3342",
        marginLeft: 62,
    },
});