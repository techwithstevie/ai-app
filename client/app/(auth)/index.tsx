import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

export default function AuthIndex() {
    const { isSignedIn } = useAuth();

    return <Redirect href={isSignedIn ? "/home" : "/sign-in"} />;
}