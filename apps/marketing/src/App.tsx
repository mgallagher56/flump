import { Button } from "@repo/ui";
import { container, flex, stack } from "@repo/ui/styled-system/patterns";

export default function App() {
  return (
    <div className={container({ py: "12", maxW: "4xl" })}>
      <header className={flex({ justify: "space-between", align: "center", mb: "12" })}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Flump.</h1>
        <Button variant="outline" onClick={() => (window.location.href = "http://localhost:5173")}>
          Sign In
        </Button>
      </header>

      <main className={stack({ gap: "8", align: "center", textAlign: "center", py: "10" })}>
        <h2 style={{ fontSize: "3rem", fontWeight: "800", lineHeight: "1.2" }}>
          Personal Finance <br />
          <span style={{ color: "#6363F1" }}>Without the Clutter.</span>
        </h2>
        <p style={{ fontSize: "1.2rem", opacity: 0.8, maxWidth: "600px" }}>
          Track transactions, monitor balances, and visualize your net worth with a simple, secure,
          and vendor-independent open monorepo architecture.
        </p>
        <div className={flex({ gap: "4" })}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => (window.location.href = "http://localhost:5173")}
          >
            Get Started Free
          </Button>
          <Button variant="outline" size="lg">
            Read Docs
          </Button>
        </div>
      </main>
    </div>
  );
}
