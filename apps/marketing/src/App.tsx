import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { HomePage } from "./pages/HomePage";
import { PricingPage } from "./pages/PricingPage";
import { SecurityPage } from "./pages/SecurityPage";
import { ToolPage } from "./pages/ToolPage";
import { ToolsIndexPage } from "./pages/ToolsIndexPage";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<ToolsIndexPage />} />
        <Route path="/tools/:slug" element={<ToolPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </ThemeProvider>
  );
}
