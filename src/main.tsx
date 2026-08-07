import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initNative } from "./lib/native";
import { registerAppServiceWorker } from "./lib/registerAppServiceWorker";
import "./index.css";

void registerAppServiceWorker();
void initNative();

const root = document.getElementById("root");
if (!root) throw new Error("App root element was not found");

createRoot(root).render(<App />);
