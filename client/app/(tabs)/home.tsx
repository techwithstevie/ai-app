import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiClient } from "../../features/chat/services/apiClient";
import {
    createSessionId,
    formatPersonaLabel,
} from "../../features/chat/utils/chatHelpers";

type Session = {
    session_id: string;
    persona: string;
    created_at: string;
};

const formatDate = (value: string) => {
    try {
        const date = new Date(value.replace(" ", "T") + "Z");
        return date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
};

export default function HomeScreen() {
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.getSessions();
            setSessions(data.slice(0, 5));
        } catch (err) {
            console.error("Failed to load sessions", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSessions();
        }, [loadSessions])
    );

    const startNewChat = () => {
        router.push({
            pathname: "/chat",
            params: {
                sessionId: createSessionId(),
                persona: "senior_dev",
            },
        });
    };

    const openRecentSession = (session: Session) => {
        router.push({
            pathname: "/chat",
            params: {
                sessionId: session.session_id,
                persona: session.persona,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Local AI workspace</Text>
                    <Text style={styles.heroTitle}>Your conversations, all in one place.</Text>
                    <Text style={styles.heroText}>
                        Start a new chat, revisit recent threads, or manage your app settings.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={startNewChat}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color="#F8FAFC"
                        />
                        <Text style={styles.primaryButtonText}>Start new chat</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={startNewChat}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="create-outline" size={18} color="#10B981" />
                            <Text style={styles.quickActionText}>New chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/history")}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="time-outline" size={18} color="#10B981" />
                            <Text style={styles.quickActionText}>History</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Recent conversations</Text>
                        <TouchableOpacity onPress={() => router.push("/history")}>
                            <Text style={styles.linkText}>View all</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingCard}>
                            <ActivityIndicator color="#10B981" />
                        </View>
                    ) : sessions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No saved conversations yet.</Text>
                        </View>
                    ) : (
                        sessions.map((session) => (
                            <TouchableOpacity
                                key={session.session_id}
                                style={styles.recentCard}
                                onPress={() => openRecentSession(session)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.recentTextWrap}>
                                    <Text style={styles.recentTitle}>
                                        {formatPersonaLabel(session.persona)}
                                    </Text>
                                    <Text style={styles.recentMeta}>
                                        {formatDate(session.created_at)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                            </TouchableOpacity>
                        ))
                    )}
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
    heroCard: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#263041",
        borderRadius: 20,
        padding: 18,
        marginBottom: 18,
    },
    eyebrow: {
        color: "#10B981",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    heroTitle: {
        color: "#F9FAFB",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
    },
    heroText: {
        color: "#9CA3AF",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 16,
    },
    primaryButton: {
        height: 44,
        borderRadius: 22,
        backgroundColor: "#2563EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    primaryButtonText: {
        color: "#F8FAFC",
        fontSize: 14,
        fontWeight: "700",
    },
    section: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    sectionTitle: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    linkText: {
        color: "#10B981",
        fontSize: 13,
        fontWeight: "600",
    },
    quickActionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionText: {
        color: "#E5E7EB",
        fontSize: 12,
        fontWeight: "600",
        marginTop: 8,
    },
    loadingCard: {
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyCard: {
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 18,
    },
    emptyCardText: {
        color: "#8B94A3",
        fontSize: 13,
    },
    recentCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    recentTextWrap: {
        flex: 1,
        marginRight: 10,
    },
    recentTitle: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    recentMeta: {
        color: "#8B94A3",
        fontSize: 12,
    },
});