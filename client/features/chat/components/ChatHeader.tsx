import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatPersonaLabel } from "../utils/chatHelpers";

type Props = {
    persona: string;
    onOpenHistory: () => void;
    onNewChat: () => void;
};

export default function ChatHeader({ persona, onOpenHistory, onNewChat }: Props) {
    return (
        <View style={styles.chatHeader}>
            <TouchableOpacity
                onPress={onOpenHistory}
                style={styles.chatHeaderButton}
                accessibilityRole="button"
                accessibilityLabel="View past conversations"
            >
                <Ionicons name="time-outline" size={20} color="#E5E7EB" />
            </TouchableOpacity>

            <Text style={styles.chatHeaderTitle}>{formatPersonaLabel(persona)}</Text>

            <TouchableOpacity
                onPress={onNewChat}
                style={styles.chatHeaderButton}
                accessibilityRole="button"
                accessibilityLabel="Start new chat"
            >
                <Ionicons name="create-outline" size={20} color="#E5E7EB" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    chatHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#2A3342",
        backgroundColor: "#0F141B",
    },
    chatHeaderButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    chatHeaderTitle: {
        color: "#F9FAFB",
        fontSize: 15,
        fontWeight: "700",
    },
});