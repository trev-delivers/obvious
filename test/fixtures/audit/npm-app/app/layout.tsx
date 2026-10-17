import "obvious/css/primitives.css";
import "obvious/css/themes/core.css";
import { Caveat, Inter } from "next/font/google";
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand" });
const inter = Inter({ subsets: ["latin"] });
export default function Layout() {
  return (
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600&amp;family=IBM+Plex+Sans&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Lobster&display=swap" rel="stylesheet" />
      </head>
      <body className="t-link">hi</body>
    </html>
  );
}
