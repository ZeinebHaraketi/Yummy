import {Redirect, Slot} from "expo-router";

export default function _Layout() {
    const isAuthenticated= false;
    if(isAuthenticated) return <Redirect href="/" />

    return <Slot />
}
