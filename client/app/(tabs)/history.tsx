import React, { useCallback, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";

const BACKEND_URL =
    Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

type Session = {
    session_id: string;
    persona: string;
    created_at: string;
};

const formatPersonaLabel = (value: string) =>
    value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

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

export default function HistoryScreen() {
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/sessions`);
            setSessions(res.data.sessions);
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

    const openSession = (session: Session) => {
        router.push({
            pathname: "/(tabs)/chat",
            params: {
                sessionId: session.session_id,
                persona: session.persona,
            },
        });
    };

    const confirmDelete = (session: Session) => {
        Alert.alert(
            "Delete conversation",
            "This will permanently delete this conversation.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${BACKEND_URL}/sessions/${session.session_id}`);
                            setSessions((prev) =>
                                prev.filter((s) => s.session_id !== session.session_id)
                            );
                        } catch (err) {
                            console.error("Failed to delete session", err);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: Session }) => (
        <View style={styles.sessionCard}>
            <TouchableOpacity
                style={styles.sessionCardMain}
                onPress={() => openSession(item)}
                activeOpacity={0.85}
            >
                <View>
                    <Text style={styles.sessionPersona}>
                        {formatPersonaLabel(item.persona)}
                    </Text>
                    <Text style={styles.sessionDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete conversation"
            >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={22} color="#F9FAFB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Conversations</Text>
                <View style={styles.backButton} />
            </View>

            {isLoading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color="#10B981" />
                </View>
            ) : sessions.length === 0 ? (
                <View style={styles.centerState}>
                    <Ionicons name="chatbubble-outline" size={32} color="#3F4757" />
                    <Text style={styles.emptyText}>No conversations yet</Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.session_id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#2A3342",
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "700",
    },
    listContent: {
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    sessionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
    },
    sessionCardMain: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    deleteButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: "#2A3342",
    },
    sessionPersona: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    sessionDate: {
        color: "#8B94A3",
        fontSize: 12,
    },
    centerState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 13,
    },
});