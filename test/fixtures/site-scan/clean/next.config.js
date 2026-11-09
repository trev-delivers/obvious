const csp = "default-src 'self'; style-src 'self' https://fonts.googleapis.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
module.exports = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }] }];
  },
};
