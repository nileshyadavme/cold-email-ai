import { AuthProvider } from "../hooks/useAuth";
import { Toaster } from "react-hot-toast";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
          },
        }}
      />
    </AuthProvider>
  );
}
