"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white p-8">
        <h2 className="text-3xl text-red-500 font-bold mb-4">Fatal Root Layout Error</h2>
        <div className="bg-gray-900 p-4 rounded overflow-auto text-sm">
          <p className="font-bold">{error.name}: {error.message}</p>
          <pre className="mt-2 text-gray-400">{error.stack}</pre>
        </div>
        {error.digest && <p className="text-gray-500 mt-4 text-xs">Digest: {error.digest}</p>}
      </body>
    </html>
  );
}
