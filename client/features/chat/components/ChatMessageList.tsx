import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Message } from "../types";

type Props = {
    messages: Message[];
    systemMessageOpacity: Animated.Value;
    scrollRef: React.RefObject<KeyboardAwareScrollView | null>;
};

export default function ChatMessageList({
    messages,
    systemMessageOpacity,
    scrollRef,
}: Props) {
    const renderChatMessage = (msg: Message) => {
        if (msg.role === "system") {
            return (
                <Animated.View
                    key={msg.id}
                    style={[styles.systemMessageContainer, { opacity: systemMessageOpacity }]}
                >
                    <Text style={styles.systemMessageText}>{msg.content}</Text>
                </Animated.View>
            );
        }

        const isUser = msg.role === "user";

        return (
            <View
                key={msg.id}
                style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.assistantRow,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            isUser ? styles.userMessageText : styles.assistantMessageText,
                        ]}
                    >
                        {msg.content}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.chatContainer}>{messages.map(renderChatMessage)}</View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    messagesScroll: {
        flex: 1,
    },
    messagesContent: {
        flexGrow: 1,
    },
    chatContainer: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 18,
        paddingBottom: 10,
    },
    messageRow: {
        width: "100%",
        marginBottom: 12,
    },
    userRow: {
        alignItems: "flex-end",
    },
    assistantRow: {
        alignItems: "flex-start",
    },
    messageBubble: {
        maxWidth: "86%",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: "#2563EB",
        borderBottomRightRadius: 8,
    },
    assistantBubble: {
        backgroundColor: "#171E29",
        borderWidth: 1,
        borderColor: "#263041",
        borderBottomLeftRadius: 8,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userMessageText: {
        color: "#F8FAFC",
    },
    assistantMessageText: {
        color: "#E5E7EB",
    },
    systemMessageContainer: {
        alignSelf: "center",
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#1F2937",
    },
    systemMessageText: {
        color: "#D1D5DB",
        fontSize: 12,
    },
});