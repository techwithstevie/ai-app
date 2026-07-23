import axios from "axios";
import Constants from "expo-constants";

const BACKEND_URL =
    Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

export const chatApi = {
    getPersonas: async () => {
        const res = await axios.get(`${BACKEND_URL}/personas`);
        return res.data.personas as string[];
    },

    sendMessage: async (payload: {
        session_id: string;
        message: string;
        persona: string;
    }) => {
        const res = await axios.post(`${BACKEND_URL}/chat`, payload);
        return res.data.reply as string;
    },

    getSessionMessages: async (sessionId: string) => {
        const res = await axios.get(`${BACKEND_URL}/sessions/${sessionId}/messages`);
        return res.data.messages as { role: "user" | "assistant" | "system"; content: string }[];
    },
};