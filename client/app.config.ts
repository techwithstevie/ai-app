import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';
import appJson from "./app.json";

const expoConfig = appJson.expo as ExpoConfig;

expoConfig.extra = {
    ...(expoConfig.extra ?? {}),
    backendUrl: process.env.BACKEND_URL,
};

export default expoConfig;