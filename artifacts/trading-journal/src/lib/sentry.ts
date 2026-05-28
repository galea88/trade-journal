import * as Sentry from '@sentry/react'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

export function initSentry() {
  if (!dsn) {
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  })
}

export { captureException, captureMessage } from '@sentry/react'
