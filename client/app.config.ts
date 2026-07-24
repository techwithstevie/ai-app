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
        plugins: [
            ...(base.plugins ?? []),
            [
                "expo-build-properties",
                {
                    android: {
                        packagingOptions: {
                            resources: {
                                excludes: ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"],
                            },
                        },
                    },
                },
            ],
        ],
    };
};