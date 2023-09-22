import { useState } from 'react';

const pingServer = async () => {
  try {
    const startTime = new Date().getTime();
    await fetch('/ping');
    const endTime = new Date().getTime();
    const responseTime = endTime - startTime;

    return `Server responded in ${responseTime}ms`;
  } catch (error) {
    console.error('Ping failed:', error);
    return 'Ping failed';
  }
};

export function loader() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
export function action() {
  return {
    title: 'Ping Test',
    component: <Index />
  };
}

export default function Index() {
  const [message, setMessage] = useState('');
  return (
    <div>
      <h1>Ping Test</h1>
      <button
        disabled={message !== ''}
        onClick={() => {
          setInterval(async () => {
            setMessage(await pingServer());
          }, 1000);
        }}
      >
        Click to start ping
      </button>
      <p>{message}</p>
    </div>
  );
}
