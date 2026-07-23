import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";

type Role = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: Role;
  content: string;
};

const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatPersonaLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const systemMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemMessageOpacity = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [personas, setPersonas] = useState<string[]>([]);
  const [persona, setPersona] = useState("senior_dev");
  const [sessionId, setSessionId] = useState(createSessionId());
  const [personaMenuVisible, setPersonaMenuVisible] = useState(false);

  const showTemporarySystemMessage = (content: string) => {
    const messageId = `system-${Date.now()}`;

    if (systemMessageTimeoutRef.current) {
      clearTimeout(systemMessageTimeoutRef.current);
    }

    systemMessageOpacity.setValue(1);

    setMessages([
      {
        id: messageId,
        role: "system",
        content,
      },
    ]);

    systemMessageTimeoutRef.current = setTimeout(() => {
      Animated.timing(systemMessageOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        systemMessageOpacity.setValue(0);
        systemMessageTimeoutRef.current = null;
      });
    }, 2200);
  };

  const handlePersonaChange = (nextPersona: string) => {
    setPersonaMenuVisible(false);

    if (nextPersona === persona) return;

    setPersona(nextPersona);
    setSessionId(createSessionId());
    showTemporarySystemMessage(
      `Started a new chat with ${formatPersonaLabel(nextPersona)}.`
    );
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/chat`, {
        session_id: sessionId,
        message: userMessage.content,
        persona,
      });

      const assistantMessage: Message = {
        id: `${Date.now()}-ai`,
        role: "assistant",
        content: res.data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat request failed", {
        url: `${BACKEND_URL}/chat`,
        message: err?.message,
        code: err?.code,
        response: err?.response,
      });

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: "Error contacting AI backend.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{msg.content}</Text>
      </View>
    );
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd(true);
  }, [messages]);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/personas`)
      .then((res) => setPersonas(res.data.personas))
      .catch((err) => console.error("Failed to load personas", err));
  }, []);

  useEffect(() => {
    return () => {
      if (systemMessageTimeoutRef.current) {
        clearTimeout(systemMessageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.chatContainer}>
              {messages.map(renderChatMessage)}
            </View>
          </KeyboardAwareScrollView>

          <View
            style={[
              styles.inputContainer,
              { paddingBottom: insets.bottom || 8 },
            ]}
          >
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask the AI something..."
              placeholderTextColor="#6B7280"
              multiline
            />

            <TouchableOpacity
              style={styles.personaMenuButton}
              onPress={() => setPersonaMenuVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Choose AI persona"
            >
              <Text style={styles.personaMenuButtonText}>AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
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

          <Modal
            transparent
            visible={personaMenuVisible}
            animationType="fade"
            onRequestClose={() => setPersonaMenuVisible(false)}
          >
            <Pressable
              style={styles.personaMenuOverlay}
              onPress={() => setPersonaMenuVisible(false)}
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.personaMenu,
                    { marginBottom: (insets.bottom || 8) + 72 },
                  ]}
                >
                  {personas.map((p) => {
                    const isActive = p === persona;

                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.personaMenuItem,
                          isActive && styles.personaMenuItemActive,
                        ]}
                        onPress={() => handlePersonaChange(p)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.personaMenuItemText,
                            isActive && styles.personaMenuItemTextActive,
                          ]}
                        >
                          {formatPersonaLabel(p)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableWithoutFeedback>
            </Pressable>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  inner: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: "85%",
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1F2933",
  },
  messageText: {
    color: "#F9FAFB",
    fontSize: 15,
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
  personaMenuOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  personaMenu: {
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#111827",
    paddingVertical: 6,
  },
  personaMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  personaMenuItemActive: {},
  personaMenuItemText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "500",
  },
  personaMenuItemTextActive: {
    color: "#10B981",
  },
});