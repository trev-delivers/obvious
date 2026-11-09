import * as Sentry from "@sentry/nextjs";
Sentry.init({
  replaysSessionSampleRate: 0.1,
  integrations: [Sentry.replayIntegration({ maskAllInputs: false })],
});
