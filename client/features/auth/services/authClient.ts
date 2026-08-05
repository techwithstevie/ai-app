import axios from "axios";
import Constants from "expo-constants";

const BACKEND_URL =
    Constants.expoConfig?.extra?.backendUrl ?? "http://localhost:8000";

export type AuthRegisterPayload = {
    email: string;
    password: string;
};

export type AuthLoginPayload = {
    email: string;
    password: string;
};

export const AuthClient = {
    register: async (payload: AuthRegisterPayload): Promise<string> => {
        const res = await axios.post(`${BACKEND_URL}/auth/register`, payload);
        return res.data.token as string;
    },

    login: async (payload: AuthLoginPayload): Promise<string> => {
        const res = await axios.post(`${BACKEND_URL}/auth/login`, payload);
        return res.data.token as string;
    },
};
