import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable React.StrictMode for now to avoid duplicate renders during development
createRoot(document.getElementById("root")!).render(<App />);