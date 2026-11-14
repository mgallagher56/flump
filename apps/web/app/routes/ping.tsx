import { useState } from "react";

const pingServer = async () => {
  try {
    const startTime = Date.now();
    await fetch("/ping");
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return `Server responded in ${responseTime}ms`;
  } catch (error) {
    console.error("Ping failed:", error);
    return "Ping failed";
  }
};

export function loader() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
export function action() {
  return {
    title: "Ping test",
    component: <Index />,
  };
}

export default function Index() {
  const [message, setMessage] = useState("");
  return (
    <div>
      <h1>Ping test</h1>
      <button
        type="button"
        disabled={message !== ""}
        onClick={() => {
          setInterval(async () => {
            setMessage(await pingServer());
          }, 1000);
        }}
      >
        Start ping
      </button>
      <p>{message}</p>
    </div>
  );
}
