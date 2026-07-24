import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "@expo/config";
import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
    const base = {
        ...config,
        ...appJson.expo,
    } as ExpoConfig;

    return {
        ...base,

        plugins: Array.from(
            new Set([...(base.plugins ?? []), "expo-web-browser"])
        ),

        android: {
            ...(base.android ?? {}),
            package: base.android?.package ?? "com.stevie732.aiapp",
        },

        extra: {
            ...(base.extra ?? {}),
            backendUrl: process.env.BACKEND_URL,
            eas: {
                ...((base.extra as any)?.eas ?? {}),
                projectId: "83193d66-c252-47da-bbe9-60f5e1330729",
            },
        },
    };
};