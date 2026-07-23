import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { chatApi } from "../services/chatApi";
import { Message, Role } from "../types";
import {
    cleanAssistantReply,
    createSessionId,
    formatPersonaLabel,
} from "../utils/chatHelpers";

export function useChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ sessionId?: string; persona?: string }>();
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

        setMessages((prev) => [
            ...prev.filter((msg) => msg.role !== "system"),
            { id: messageId, role: "system", content },
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

    const loadSessionMessages = async (existingSessionId: string, existingPersona: string) => {
        try {
            const loaded = await chatApi.getSessionMessages(existingSessionId);

            const loadedMessages: Message[] = loaded.map(
                (m: { role: Role; content: string }, index: number) => ({
                    id: `${existingSessionId}-${index}`,
                    role: m.role,
                    content: m.role === "assistant" ? cleanAssistantReply(m.content) : m.content,
                })
            );

            setSessionId(existingSessionId);
            setPersona(existingPersona);
            setMessages(loadedMessages);
        } catch (err) {
            console.error("Failed to load session messages", err);
        }
    };

    const handlePersonaChange = (nextPersona: string) => {
        setPersonaMenuVisible(false);

        if (nextPersona === persona) return;

        setPersona(nextPersona);
        setMessages([]);
        setSessionId(createSessionId());
        showTemporarySystemMessage(
            `Started a new chat with ${formatPersonaLabel(nextPersona)}.`
        );
    };

    const startNewChat = () => {
        setMessages([]);
        setSessionId(createSessionId());
        showTemporarySystemMessage(
            `Started a new chat with ${formatPersonaLabel(persona)}.`
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
            const reply = await chatApi.sendMessage({
                session_id: sessionId,
                message: userMessage.content,
                persona,
            });

            const assistantMessage: Message = {
                id: `${Date.now()}-ai`,
                role: "assistant",
                content: cleanAssistantReply(reply),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: any) {
            console.error("Chat request failed", err);

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

    useEffect(() => {
        scrollRef.current?.scrollToEnd(true);
    }, [messages]);

    useEffect(() => {
        chatApi
            .getPersonas()
            .then(setPersonas)
            .catch((err) => console.error("Failed to load personas", err));
    }, []);

    useEffect(() => {
        if (params.sessionId && params.persona) {
            loadSessionMessages(params.sessionId, params.persona);
        }
    }, [params.sessionId, params.persona]);

    useEffect(() => {
        return () => {
            if (systemMessageTimeoutRef.current) {
                clearTimeout(systemMessageTimeoutRef.current);
            }
        };
    }, []);

    return {
        insets,
        router,
        scrollRef,
        systemMessageOpacity,
        messages,
        input,
        isLoading,
        personas,
        persona,
        sessionId,
        personaMenuVisible,
        setInput,
        setPersonaMenuVisible,
        sendMessage,
        startNewChat,
        handlePersonaChange,
    };
}