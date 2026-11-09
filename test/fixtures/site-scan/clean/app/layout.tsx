import { Inter } from "next/font/google";
// Fonts used to come from fonts.googleapis.com; next/font serves them from the site now.
const inter = Inter({ subsets: ["latin"] });
export default function Layout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
