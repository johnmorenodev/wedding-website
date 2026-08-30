/**
 * Wedding Website Configuration
 * When deployed to Vercel, set your live backend URL here!
 * Example: "https://your-wedding-backend.vercel.app/api/public"
 */
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168."));

window.WEDDING_CONFIG = {
  API_BASE_URL: isLocal
    ? "http://localhost:3000/api/public"
    : "https://johnandjessawedding.site/api/public",
};
