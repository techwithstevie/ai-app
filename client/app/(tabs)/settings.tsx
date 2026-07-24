import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
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

const BACKEND_URL =
    Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "0.1.0";

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
                                <Text style={styles.accountEmail}>No authentication required</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Application</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="information-circle-outline"
                            title="App version"
                            value={appVersion}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="server-outline"
                            title="Backend URL"
                            subtitle="Current API target"
                            value={BACKEND_URL.replace(/^https?:\/\//, "")}
                        />
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
    signOutButton: {
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    signOutButtonText: {
        color: "#F87171",
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