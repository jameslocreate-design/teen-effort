import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initNative } from "./lib/native";
import "./index.css";

void initNative();

const root = document.getElementById("root");
if (!root) throw new Error("App root element was not found");

createRoot(root).render(<App />);
