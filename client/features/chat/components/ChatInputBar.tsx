import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
    input: string;
    isLoading: boolean;
    insetsBottom: number;
    onChangeInput: (value: string) => void;
    onOpenPersonaMenu: () => void;
    onSend: () => void;
};

export default function ChatInputBar({
    input,
    isLoading,
    insetsBottom,
    onChangeInput,
    onOpenPersonaMenu,
    onSend,
}: Props) {
    return (
        <View style={[styles.inputContainer, { paddingBottom: insetsBottom || 8 }]}>
            <TextInput
                style={styles.input}
                value={input}
                onChangeText={onChangeInput}
                placeholder="Ask the AI something..."
                placeholderTextColor="#6B7280"
                multiline
            />

            <TouchableOpacity
                style={styles.personaMenuButton}
                onPress={onOpenPersonaMenu}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Choose AI persona"
            >
                <Text style={styles.personaMenuButtonText}>AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                onPress={onSend}
                disabled={isLoading}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Send message"
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Ionicons name="arrow-up" size={18} color="#F9FAFB" />
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#374151",
        backgroundColor: "#111827",
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        marginRight: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#374151",
        backgroundColor: "#0F172A",
        color: "#F9FAFB",
    },
    personaMenuButton: {
        height: 36,
        marginRight: 8,
        marginBottom: 2,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#374151",
        backgroundColor: "#1F2937",
        alignItems: "center",
        justifyContent: "center",
    },
    personaMenuButtonText: {
        color: "#E5E7EB",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    sendButton: {
        width: 36,
        height: 36,
        marginBottom: 2,
        borderRadius: 18,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#1D4ED8",
        opacity: 0.7,
    },
});