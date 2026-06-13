import { Button } from "@repo/ui";
import { container, flex, stack } from "@repo/ui/styled-system/patterns";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function App() {
  return _jsxs("div", {
    className: container({ py: "12", maxW: "4xl" }),
    children: [
      _jsxs("header", {
        className: flex({ justify: "space-between", align: "center", mb: "12" }),
        children: [
          _jsx("h1", { style: { fontSize: "1.5rem", fontWeight: "bold" }, children: "Flump." }),
          _jsx(Button, {
            variant: "outline",
            onClick: () => (window.location.href = "http://localhost:5173"),
            children: "Sign In",
          }),
        ],
      }),
      _jsxs("main", {
        className: stack({ gap: "8", align: "center", textAlign: "center", py: "10" }),
        children: [
          _jsxs("h2", {
            style: { fontSize: "3rem", fontWeight: "800", lineHeight: "1.2" },
            children: [
              "Personal Finance ",
              _jsx("br", {}),
              _jsx("span", { style: { color: "#6363F1" }, children: "Without the Clutter." }),
            ],
          }),
          _jsx("p", {
            style: { fontSize: "1.2rem", opacity: 0.8, maxWidth: "600px" },
            children:
              "Track transactions, monitor balances, and visualize your net worth with a simple, secure, and vendor-independent open monorepo architecture.",
          }),
          _jsxs("div", {
            className: flex({ gap: "4" }),
            children: [
              _jsx(Button, {
                variant: "primary",
                size: "lg",
                onClick: () => (window.location.href = "http://localhost:5173"),
                children: "Get Started Free",
              }),
              _jsx(Button, { variant: "outline", size: "lg", children: "Read Docs" }),
            ],
          }),
        ],
      }),
    ],
  });
}
