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
        android: {
            ...(base.android ?? {}),
            package: "com.stephenprahl.client",
        },
        plugins: [
            ...(base.plugins ?? []),
            "./plugins/withAndroidPackagingFix",
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
        ios: {
            ...(base.ios ?? {}),
            bundleIdentifier: "com.stephenprahl.client",
        },
        extra: {
            ...(base.extra ?? {}),
            backendUrl: process.env.BACKEND_URL,
        },
    };
};