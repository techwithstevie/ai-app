export const createSessionId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const formatPersonaLabel = (value: string) =>
    value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

export const cleanAssistantReply = (text: string) =>
    String(text)
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();