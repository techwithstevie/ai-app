import axios from "axios";
import Constants from "expo-constants";
import { Role } from "../types";

const BACKEND_URL =
    Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

export const apiClient = {
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
        return res.data.messages as { role: Role; content: string }[];
    },

    getSessions: async () => {
        const res = await axios.get(`${BACKEND_URL}/sessions`);
        return res.data.sessions as {
            session_id: string;
            persona: string;
            created_at: string;
        }[];
    },

    deleteSession: async (sessionId: string) => {
        await axios.delete(`${BACKEND_URL}/sessions/${sessionId}`);
    },
};