I'll explore your workspace to understand what app you're referring to, then show you how to build it step by step.

















# Building an AI Chat App: Complete Step-by-Step Tutorial

This is a full-stack AI chat application with a React Native mobile frontend and FastAPI backend that uses Ollama for local AI inference. I'll show you exactly how to build it from scratch.

## Step 1: Create Project Structure

Create the main project directory and subdirectories:

```bash
mkdir ai-app
cd ai-app
mkdir server client
```

Initialize the server with Python:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
```

Create [.python-version](cci:7://file:///home/stevie732/ai-app/server/.python-version:0:0-0:0):
```python
3.12
```

Create [.gitignore](cci:7://file:///home/stevie732/ai-app/server/.gitignore:0:0-0:0):
```
.venv/
__pycache__/
*.pyc
chat_history.db
.env
```

Create [.env](cci:7://file:///home/stevie732/ai-app/client/.env:0:0-0:0):
```
DEFAULT_MODEL=gpt-oss:120b-cloud
OLLAMA_URL=http://localhost:11434
```

## Step 2: Server - Set up FastAPI Dependencies

Create [pyproject.toml](cci:7://file:///home/stevie732/ai-app/server/pyproject.toml:0:0-0:0):
```toml
[project]
name = "server"
version = "0.1.0"
description = "AI Chat Backend"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.139.2",
    "httpx>=0.28.1",
    "pydantic[email]>=2.13.4",
    "pydantic-settings>=2.14.2",
    "python-dotenv>=1.2.2",
    "uvicorn[standard]>=0.51.0",
]
```

Install dependencies:
```bash
pip install -r pyproject.toml
```

Create the [app](cci:9://file:///home/stevie732/ai-app/client/app:0:0-0:0) directory:
```bash
mkdir app
touch app/__init__.py
```

## Step 3: Server - SQLite Database Layer

Create [app/db.py](cci:7://file:///home/stevie732/ai-app/server/app/db.py:0:0-0:0):

```python
import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "chat_history.db"
PASSWORD_HASH_ITERATIONS = 200_000
TOKEN_EXPIRATION_HOURS = 24


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
        dklen=32,
    )


def _generate_salt() -> bytes:
    return secrets.token_bytes(16)


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _current_timestamp() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                persona TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash BLOB NOT NULL,
                salt BLOB NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def session_exists(session_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        return row is not None


def create_session(session_id: str, persona: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, persona) VALUES (?, ?)",
            (session_id, persona),
        )
        conn.commit()


def save_message(session_id: str, role: str, content: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )
        conn.commit()


def load_messages(session_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
        return [{"role": row["role"], "content": row["content"]} for row in rows]


def list_sessions() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT session_id, persona, created_at
            FROM sessions
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [
            {
                "session_id": row["session_id"],
                "persona": row["persona"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


def delete_session(session_id: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()


def create_user(email: str, password: str) -> int:
    if get_user_by_email(email) is not None:
        raise ValueError("Email already registered")

    salt = _generate_salt()
    password_hash = _hash_password(password, salt)

    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
            (email.lower().strip(), password_hash, salt),
        )
        conn.commit()
        lastrowid = cursor.lastrowid
        if lastrowid is None:
            raise RuntimeError("Failed to create user")
        return lastrowid


def get_user_by_email(email: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, salt FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "salt": row["salt"],
        }


def verify_password(password: str, salt: bytes, password_hash: bytes) -> bool:
    computed_hash = _hash_password(password, salt)
    return hmac.compare_digest(computed_hash, password_hash)


def create_auth_token(user_id: int) -> str:
    token = _generate_token()
    expires_at = (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRATION_HOURS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
        conn.commit()

    return token


def get_user_by_token(token: str) -> dict | None:
    now = _current_timestamp()
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT users.id AS id, users.email AS email
            FROM users
            JOIN auth_tokens ON auth_tokens.user_id = users.id
            WHERE auth_tokens.token = ? AND auth_tokens.expires_at > ?
            """,
            (token, now),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
        }


def delete_auth_token(token: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        conn.commit()
```

## Step 4: Server - Pydantic Schemas

Create [app/schemas.py](cci:7://file:///home/stevie732/ai-app/server/app/schemas.py:0:0-0:0):

```python
from pydantic import BaseModel, EmailStr

class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str
    persona: str | None = None
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str

class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str

class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthTokenResponse(BaseModel):
    token: str

class UserResponse(BaseModel):
    email: EmailStr
```

## Step 5: Server - Ollama Client

Create [app/ollama_client.py](cci:7://file:///home/stevie732/ai-app/server/app/ollama_client.py:0:0-0:0):

```python
import httpx
from .config import settings


async def chat_with_ollama(messages: list[dict]) -> str:
    """
    Call Ollama's /api/chat endpoint with a full messages array.
    messages: list of {"role": "system" | "user" | "assistant", "content": str}
    """
    payload: dict = {
        "model": settings.default_model,
        "messages": messages,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        message = data.get("message", {})
        return message.get("content", "")
```

## Step 6: Server - Configuration and Main Application

First, create [app/config.py](cci:7://file:///home/stevie732/ai-app/server/app/config.py:0:0-0:0):

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    default_model: str = "gpt-oss:120b-cloud"
    ollama_url: str = "http://localhost:11434"

    class Config:
        env_file = ".env"

settings = Settings()
```

Now create [app/main.py](cci:7://file:///home/stevie732/ai-app/server/app/main.py:0:0-0:0):

```python
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    ChatRequest,
    ChatResponse,
    UserResponse,
)
from .ollama_client import chat_with_ollama
from . import db

app = FastAPI(
    title="AI Chat Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERSONAS = {
    "default": "You are a helpful AI assistant.",
    "senior_dev": (
        "You are a senior full-stack engineer specializing in React Native, "
        "FastAPI, and local LLMs via Ollama. Give concise, practical, "
        "production-minded answers."
    ),
    "career_strategist": (
        "You are an experienced tech recruiter and career strategist for software "
        "and AI engineers. Help tailor resumes, refine cover letters, and draft "
        "outreach messages. Focus on quantifiable achievements, production impact, "
        "ATS optimization, and crisp, engaging phrasing."
    ),
    "interview_coach": (
        "You are a principal engineer and hiring manager. Help the user prep for "
        "technical and behavioral interviews. Enforce the STAR method (Situation, "
        "Task, Action, Result) for behavioral questions, probe for trade-offs in "
        "system design, and provide sharp, constructive feedback."
    ),
}

CHAT_RESPONSE_STYLE = """
You are replying inside a mobile chat app.

Write responses that look good in chat bubbles.
Use plain text only.
Do not use markdown.
Do not use headings.
Do not use bold or italic markers.
Do not use tables.
Do not use code fences unless the user explicitly asks for code.
Do not use long bullet lists unless the user explicitly asks for a list.

Keep replies concise, clear, and conversational.
Default to 2 to 5 short paragraphs.
Use short sentences.
If the answer could be long, give the short version first.
Only expand when the user asks for more detail.

There is no markdown renderer in the UI, so raw markdown will look broken.
""".strip()


def build_system_prompt(persona_key: str) -> str:
    persona_prompt = PERSONAS.get(persona_key, PERSONAS["default"])
    return f"{persona_prompt}\n\n{CHAT_RESPONSE_STYLE}"


@app.on_event("startup")
async def on_startup():
    db.init_db()


@app.get("/")
async def root():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    session_id = req.session_id
    persona_key = req.persona or "default"

    if not db.session_exists(session_id):
        db.create_session(session_id, persona_key)
        system_prompt = build_system_prompt(persona_key)
        db.save_message(session_id, "system", system_prompt)

    db.save_message(session_id, "user", req.message)

    history = db.load_messages(session_id)

    try:
        assistant_reply = await chat_with_ollama(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    db.save_message(session_id, "assistant", assistant_reply)

    return ChatResponse(reply=assistant_reply)


@app.post("/auth/register", response_model=AuthTokenResponse)
async def register(req: AuthRegisterRequest) -> AuthTokenResponse:
    try:
        user_id = db.create_user(req.email, req.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    token = db.create_auth_token(user_id)
    return AuthTokenResponse(token=token)


@app.post("/auth/login", response_model=AuthTokenResponse)
async def login(req: AuthLoginRequest) -> AuthTokenResponse:
    user = db.get_user_by_email(req.email)
    if user is None or not db.verify_password(req.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = db.create_auth_token(user["id"])
    return AuthTokenResponse(token=token)


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user(authorization: str | None = Header(default=None)) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1]
    user = db.get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return UserResponse(email=user["email"])


@app.get("/personas")
async def list_personas():
    return {"personas": list(PERSONAS.keys())}


@app.get("/sessions")
async def get_sessions():
    return {"sessions": db.list_sessions()}


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    messages = db.load_messages(session_id)
    visible = [m for m in messages if m["role"] != "system"]
    return {"messages": visible}


@app.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    db.delete_session(session_id)
    return {"status": "deleted"}
```

Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Step 7: Client - Initialize Expo React Native Project

Navigate to the client directory and initialize the project:

```bash
cd ../client
npx create-expo-app@latest . --template blank-typescript
```

Install additional dependencies:

```bash
npm install @expo/vector-icons @react-navigation/bottom-tabs @react-navigation/elements @react-navigation/native axios expo-auth-session expo-constants expo-dev-client expo-font expo-haptics expo-image expo-linking expo-router expo-secure-store expo-splash-screen expo-status-bar expo-symbols expo-system-ui expo-web-browser react-native-gesture-handler react-native-keyboard-aware-scroll-view react-native-reanimated react-native-safe-area-context react-native-screens react-native-worklets
```

Install dev dependencies:

```bash
npm install --save-dev @types/react
```

## Step 8: Client - Expo Router Navigation Structure

Configure [app.config.ts](cci:7://file:///home/stevie732/ai-app/client/app.config.ts:0:0-0:0):

```typescript
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AI Chat",
  slug: "ai-chat",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "ai-chat",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B0D10",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.aichat.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0D10",
    },
    package: "com.aichat.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0B0D10",
        image: "./assets/splash.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    backendUrl: process.env.BACKEND_URL || "http://localhost:8000",
  },
});
```

Create the app directory structure:

```bash
mkdir -p app/(auth) app/(tabs) features/auth/services features/chat/{components,hooks,services,utils}
```

Create [app/_layout.tsx](cci:7://file:///home/stevie732/ai-app/client/app/_layout.tsx:0:0-0:0):

```typescript
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

Create [app/index.tsx](cci:7://file:///home/stevie732/ai-app/client/app/index.tsx:0:0-0:0):

```typescript
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(auth)/sign-in");
  }, []);

  return null;
}
```

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
```

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#0F141B",
          borderTopColor: "#2A3342",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## Step 9: Client - Authentication Services

Create [features/auth/services/authClient.ts](cci:7://file:///home/stevie732/ai-app/client/features/auth/services/authClient.ts:0:0-0:0):

```typescript
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
```

Create [features/auth/services/tokenStore.ts](cci:7://file:///home/stevie732/ai-app/client/features/auth/services/tokenStore.ts:0:0-0:0):

```typescript
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export async function saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

## Step 10: Client - Authentication Screens

Create `app/(auth)/sign-in.tsx`:

```typescript
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthClient } from "../../features/auth/services/authClient";
import { saveToken } from "../../features/auth/services/tokenStore";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await AuthClient.login({ email, password });
      await saveToken(token);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={styles.link}>
                Don't have an account? <Text style={styles.linkText}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 12,
    padding: 16,
    color: "#F9FAFB",
    fontSize: 16,
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  linkText: {
    color: "#10B981",
    fontWeight: "600",
  },
});
```

Create `app/(auth)/sign-up.tsx`:

```typescript
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthClient } from "../../features/auth/services/authClient";
import { saveToken } from "../../features/auth/services/tokenStore";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await AuthClient.register({ email, password });
      await saveToken(token);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Get started with AI Chat</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor="#6B7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={styles.link}>
                Already have an account? <Text style={styles.linkText}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 12,
    padding: 16,
    color: "#F9FAFB",
    fontSize: 16,
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  linkText: {
    color: "#10B981",
    fontWeight: "600",
  },
});
```

## Step 11: Client - Chat API Client Service

First, create the chat types file [features/chat/types.ts](cci:7://file:///home/stevie732/ai-app/client/features/chat/types.ts:0:0-0:0):

```typescript
export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
}
```

Create [features/chat/services/apiClient.ts](cci:7://file:///home/stevie732/ai-app/client/features/chat/services/apiClient.ts:0:0-0:0):

```typescript
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
```

## Step 12: Client - Chat Components

First, create the chat helpers utilities `features/chat/utils/chatHelpers.ts`:

```typescript
export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatPersonaLabel(persona: string): string {
  const labels: Record<string, string> = {
    default: "AI Assistant",
    senior_dev: "Senior Developer",
    career_strategist: "Career Strategist",
    interview_coach: "Interview Coach",
  };
  return labels[persona] || persona;
}

export function cleanAssistantReply(content: string): string {
  // Remove any markdown formatting that might break the UI
  return content
    .replace(/```[\s\S]*?```/g, "[Code block]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/##+\s*/g, "")
    .replace(/#{1,6}\s/g, "")
    .trim();
}
```

Create [features/chat/components/ChatHeader.tsx](cci:7://file:///home/stevie732/ai-app/client/features/chat/components/ChatHeader.tsx:0:0-0:0):

```typescript
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatPersonaLabel } from "../utils/chatHelpers";

type Props = {
    persona: string;
    onOpenHistory: () => void;
    onNewChat: () => void;
};

export default function ChatHeader({ persona, onOpenHistory, onNewChat }: Props) {
    return (
        <View style={styles.chatHeader}>
            <TouchableOpacity
                onPress={onOpenHistory}
                style={styles.chatHeaderButton}
                accessibilityRole="button"
                accessibilityLabel="View past conversations"
            >
                <Ionicons name="time-outline" size={20} color="#E5E7EB" />
            </TouchableOpacity>

            <Text style={styles.chatHeaderTitle}>{formatPersonaLabel(persona)}</Text>

            <TouchableOpacity
                onPress={onNewChat}
                style={styles.chatHeaderButton}
                accessibilityRole="button"
                accessibilityLabel="Start new chat"
            >
                <Ionicons name="create-outline" size={20} color="#E5E7EB" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    chatHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#2A3342",
        backgroundColor: "#0F141B",
    },
    chatHeaderButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    chatHeaderTitle: {
        color: "#F9FAFB",
        fontSize: 15,
        fontWeight: "700",
    },
});
```

Create [features/chat/components/ChatInputBar.tsx](cci:7://file:///home/stevie732/ai-app/client/features/chat/components/ChatInputBar.tsx:0:0-0:0):

```typescript
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  input: string;
  isLoading: boolean;
  onChangeInput: (text: string) => void;
  onOpenPersonaMenu: () => void;
  onSend: () => void;
};

export default function ChatInputBar({
  input,
  isLoading,
  onChangeInput,
  onOpenPersonaMenu,
  onSend,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <TouchableOpacity
        style={styles.personaButton}
        onPress={onOpenPersonaMenu}
        activeOpacity={0.7}
      >
        <Ionicons name="person-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor="#6B7280"
        value={input}
        onChangeText={onChangeInput}
        multiline
        maxLength={1000}
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!input.trim() || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size={20} color="#F8FAFC" />
        ) : (
          <Ionicons
            name="send-outline"
            size={20}
            color={input.trim() ? "#F8FAFC" : "#6B7280"}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: "#0F141B",
    borderTopWidth: 1,
    borderTopColor: "#2A3342",
    gap: 8,
  },
  personaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
  },
});
```

Create [features/chat/components/ChatMessageList.tsx](cci:7://file:///home/stevie732/ai-app/client/features/chat/components/ChatMessageList.tsx:0:0-0:0):

```typescript
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Message } from "../types";

type Props = {
  messages: Message[];
  systemMessageOpacity: Animated.Value;
  scrollRef: React.RefObject<KeyboardAwareScrollView>;
};

export default function ChatMessageList({
  messages,
  systemMessageOpacity,
  scrollRef,
}: Props) {
  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {messages.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start a conversation</Text>
          <Text style={styles.emptySubtext}>
            Ask me anything about coding, career advice, or interview preparation.
          </Text>
        </View>
      )}

      {messages.map((message) => {
        if (message.role === "system") {
          return (
            <Animated.View
              key={message.id}
              style={[styles.systemMessage, { opacity: systemMessageOpacity }]}
            >
              <Text style={styles.systemText}>{message.content}</Text>
            </Animated.View>
          );
        }

        const isUser = message.role === "user";
        return (
          <View
            key={message.id}
            style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
          >
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        );
      })}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  content: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  systemMessage: {
    alignItems: "center",
    paddingVertical: 8,
  },
  systemText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },
  messageRow: {
    marginBottom: 12,
  },
  userRow: {
    alignItems: "flex-end",
  },
  assistantRow: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: "#F8FAFC",
  },
  assistantText: {
    color: "#E5E7EB",
  },
});
```

Create [features/chat/components/PersonaMenu.tsx](cci:7://file:///home/stevie732/ai-app/client/features/chat/components/PersonaMenu.tsx:0:0-0:0):

```typescript
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatPersonaLabel } from "../utils/chatHelpers";

type Props = {
  visible: boolean;
  personas: string[];
  activePersona: string;
  bottomInset: number;
  onClose: () => void;
  onSelectPersona: (persona: string) => void;
};

export default function PersonaMenu({
  visible,
  personas,
  activePersona,
  bottomInset,
  onClose,
  onSelectPersona,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.content, { paddingBottom: bottomInset + insets.bottom + 16 }]}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Persona</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-outline" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list}>
              {personas.map((persona) => (
                <TouchableOpacity
                  key={persona}
                  style={[
                    styles.personaItem,
                    activePersona === persona && styles.personaItemActive,
                  ]}
                  onPress={() => onSelectPersona(persona)}
                  activeOpacity={0.7}
                >
                  <View style={styles.personaContent}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={activePersona === persona ? "#10B981" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.personaText,
                        activePersona === persona && styles.personaTextActive,
                      ]}
                    >
                      {formatPersonaLabel(persona)}
                    </Text>
                  </View>
                  {activePersona === persona && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#0F141B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3342",
  },
  title: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 12,
  },
  personaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  personaItemActive: {
    borderColor: "#10B981",
    backgroundColor: "#0D2D1A",
  },
  personaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personaText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },
  personaTextActive: {
    color: "#10B981",
  },
});
```

## Step 13: Client - Chat Screen Hook

Create [features/chat/hooks/useChatScreen.ts](cci:7://file:///home/stevie732/ai-app/client/features/chat/hooks/useChatScreen.ts:0:0-0:0):

```typescript
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiClient } from "../services/apiClient";
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
            const loaded = await apiClient.getSessionMessages(existingSessionId);

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
            const reply = await apiClient.sendMessage({
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
        apiClient
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
```

## Step 14: Client - Main Tab Screens

Create `app/(tabs)/chat.tsx`:

```typescript
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatHeader from "../../features/chat/components/ChatHeader";
import ChatInputBar from "../../features/chat/components/ChatInputBar";
import ChatMessageList from "../../features/chat/components/ChatMessageList";
import PersonaMenu from "../../features/chat/components/PersonaMenu";
import { useChatScreen } from "../../features/chat/hooks/useChatScreen";

export default function ChatScreen() {
  const chat = useChatScreen();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.inner}>
        <ChatHeader
          persona={chat.persona}
          onOpenHistory={() => chat.router.push("/(tabs)/history")}
          onNewChat={chat.startNewChat}
        />

        <ChatMessageList
          messages={chat.messages}
          systemMessageOpacity={chat.systemMessageOpacity}
          scrollRef={chat.scrollRef}
        />

        <ChatInputBar
          input={chat.input}
          isLoading={chat.isLoading}
          onChangeInput={chat.setInput}
          onOpenPersonaMenu={() => chat.setPersonaMenuVisible(true)}
          onSend={chat.sendMessage}
        />

        <PersonaMenu
          visible={chat.personaMenuVisible}
          personas={chat.personas}
          activePersona={chat.persona}
          bottomInset={chat.insets.bottom}
          onClose={() => chat.setPersonaMenuVisible(false)}
          onSelectPersona={chat.handlePersonaChange}
        />
      </View>
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
});
```

Create `app/(tabs)/home.tsx`:

```typescript
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiClient } from "../../features/chat/services/apiClient";
import {
    createSessionId,
    formatPersonaLabel,
} from "../../features/chat/utils/chatHelpers";

type Session = {
    session_id: string;
    persona: string;
    created_at: string;
};

const formatDate = (value: string) => {
    try {
        const date = new Date(value.replace(" ", "T") + "Z");
        return date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
};

export default function HomeScreen() {
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.getSessions();
            setSessions(data.slice(0, 5));
        } catch (err) {
            console.error("Failed to load sessions", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSessions();
        }, [loadSessions])
    );

    const startNewChat = () => {
        router.push({
            pathname: "/chat",
            params: {
                sessionId: createSessionId(),
                persona: "senior_dev",
            },
        });
    };

    const openRecentSession = (session: Session) => {
        router.push({
            pathname: "/chat",
            params: {
                sessionId: session.session_id,
                persona: session.persona,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Local AI workspace</Text>
                    <Text style={styles.heroTitle}>Your conversations, all in one place.</Text>
                    <Text style={styles.heroText}>
                        Start a new chat, revisit recent threads, or manage your app settings.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={startNewChat}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color="#F8FAFC"
                        />
                        <Text style={styles.primaryButtonText}>Start new chat</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={startNewChat}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="create-outline" size={18} color="#10B981" />
                            <Text style={styles.quickActionText}>New chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/history")}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="time-outline" size={18} color="#10B981" />
                            <Text style={styles.quickActionText}>History</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Recent conversations</Text>
                        <TouchableOpacity onPress={() => router.push("/history")}>
                            <Text style={styles.linkText}>View all</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingCard}>
                            <ActivityIndicator color="#10B981" />
                        </View>
                    ) : sessions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No saved conversations yet.</Text>
                        </View>
                    ) : (
                        sessions.map((session) => (
                            <TouchableOpacity
                                key={session.session_id}
                                style={styles.recentCard}
                                onPress={() => openRecentSession(session)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.recentTextWrap}>
                                    <Text style={styles.recentTitle}>
                                        {formatPersonaLabel(session.persona)}
                                    </Text>
                                    <Text style={styles.recentMeta}>
                                        {formatDate(session.created_at)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },
    heroCard: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#263041",
        borderRadius: 20,
        padding: 18,
        marginBottom: 18,
    },
    eyebrow: {
        color: "#10B981",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    heroTitle: {
        color: "#F9FAFB",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
    },
    heroText: {
        color: "#9CA3AF",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 16,
    },
    primaryButton: {
        height: 44,
        borderRadius: 22,
        backgroundColor: "#2563EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    primaryButtonText: {
        color: "#F8FAFC",
        fontSize: 14,
        fontWeight: "700",
    },
    section: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    sectionTitle: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    linkText: {
        color: "#10B981",
        fontSize: 13,
        fontWeight: "600",
    },
    quickActionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionText: {
        color: "#E5E7EB",
        fontSize: 12,
        fontWeight: "600",
        marginTop: 8,
    },
    loadingCard: {
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyCard: {
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 18,
    },
    emptyCardText: {
        color: "#8B94A3",
        fontSize: 13,
    },
    recentCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#161B22",
        borderWidth: 1,
        borderColor: "#2A3342",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    recentTextWrap: {
        flex: 1,
        marginRight: 10,
    },
    recentTitle: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    recentMeta: {
        color: "#8B94A3",
        fontSize: 12,
    },
});
```

Create `app/(tabs)/history.tsx`:

```typescript
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiClient } from "../../features/chat/services/apiClient";
import {
  createSessionId,
  formatPersonaLabel,
} from "../../features/chat/utils/chatHelpers";

type Session = {
  session_id: string;
  persona: string;
  created_at: string;
};

const formatDate = (value: string) => {
  try {
    const date = new Date(value.replace(" ", "T") + "Z");
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const openSession = (session: Session) => {
    router.push({
      pathname: "/chat",
      params: {
        sessionId: session.session_id,
        persona: session.persona,
      },
    });
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.deleteSession(sessionId);
              loadSessions();
            } catch (err) {
              console.error("Failed to delete session", err);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversation History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#10B981" size="large" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start chatting to see your history here
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.session_id}
              style={styles.sessionCard}
              onPress={() => openSession(session)}
              activeOpacity={0.85}
            >
              <View style={styles.sessionContent}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionTitle}>
                    {formatPersonaLabel(session.persona)}
                  </Text>
                  <Text style={styles.sessionDate}>{formatDate(session.created_at)}</Text>
                </View>
              </View>

              <View style={styles.sessionActions}>
                <TouchableOpacity
                  onPress={() => deleteSession(session.session_id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3342",
    backgroundColor: "#0F141B",
  },
  headerTitle: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 8,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    marginBottom: 4,
  },
  sessionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sessionDate: {
    color: "#8B94A3",
    fontSize: 13,
  },
  sessionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginLeft: 12,
  },
});
```

Create `app/(tabs)/settings.tsx`:

```typescript
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { removeToken } from "../../features/auth/services/tokenStore";

export default function SettingsScreen() {
  const router = useRouter();
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await removeToken();
            router.replace("/(auth)/sign-in");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>App Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <View style={styles.infoRow}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.dangerText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="server-outline" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Backend URL</Text>
                <Text style={styles.infoValue}>{backendUrl}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3342",
    backgroundColor: "#0F141B",
  },
  headerTitle: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3342",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 2,
  },
  infoValue: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "500",
  },
  dangerText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
});
```

## Step 15: Client - Configure App Settings and Environment Variables

Create [.env](cci:7://file:///home/stevie732/ai-app/client/.env:0:0-0:0) file in the client directory:

```
BACKEND_URL=http://localhost:8000
```

Create [tsconfig.json](cci:7://file:///home/stevie732/ai-app/client/tsconfig.json:0:0-0:0):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

Create [eslint.config.js](cci:7://file:///home/stevie732/ai-app/client/eslint.config.js:0:0-0:0):

```javascript
import { ExpoConfig } from "expo/config";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: "expo",
    rules: {
      "react-native/no-inline-styles": "warn",
    },
  },
];
```

# Running the Application

## Start the Server

```bash
cd server
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Start the Client

```bash
cd client
npx expo start
```

Press `i` to run on iOS simulator or `a` for Android emulator.

## Prerequisites

- **Ollama** must be running locally on `http://localhost:11434`
- Install and pull a model: `ollama pull gpt-oss:120b-cloud` (or your preferred model)
- Update [server/.env](cci:7://file:///home/stevie732/ai-app/server/.env:0:0-0:0) with your model name if different

## Architecture Summary

**Server (FastAPI + SQLite + Ollama):**
- [/chat](cci:9://file:///home/stevie732/ai-app/client/features/chat:0:0-0:0) - Send messages to AI with session management
- `/auth/register` - User registration with secure password hashing
- `/auth/login` - User authentication with token-based auth
- `/sessions` - List all chat sessions
- `/sessions/{id}/messages` - Get messages for a session
- `/personas` - List available AI personas (default, senior_dev, career_strategist, interview_coach)

**Client (Expo React Native):**
- Tab-based navigation (Home, Chat, History, Settings)
- Secure token storage using Expo SecureStore
- Real-time chat with persona switching
- Session history with delete functionality
- Dark theme with modern UI

The app is now complete and ready to run. All code has been provided in the exact order needed to build the application from scratch.