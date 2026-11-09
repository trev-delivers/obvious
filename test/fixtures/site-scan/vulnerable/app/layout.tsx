export default function Layout({ children }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />
        <script src="https://cdn.polyfill.io/v3/polyfill.min.js"></script>
        <script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
