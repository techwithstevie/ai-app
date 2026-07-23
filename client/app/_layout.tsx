// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="chat"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="chat" />
      <Stack.Screen name="history" />
    </Stack>
  );
}