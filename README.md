# Church Dashboard

Church Dashboard is a church-facing web app for running a public dashboard screen and a protected admin workspace. It is built with React, TypeScript, AWS Amplify Gen 2, API Gateway, Lambda, DynamoDB, and Capacitor for Android packaging.

The public experience focuses on:

- ongoing projects and expenses
- church news and announcements
- upcoming liturgies from Google Calendar
- church branding, scripture, date, time, and giving information

The admin experience lets authenticated `admin` users manage the content and settings that power the public display.

## Main flows

### Public dashboard

- `/` shows the public church display
- rotates between Projects & Expenses and Church News
- refreshes data on a configurable interval
- respects visibility windows, active flags, and approval status
- can show upcoming liturgies from a configured public Google Calendar
- includes a QR code and donation/contact presentation options driven by settings

### Admin workspace

- `/auth` handles sign-in
- `/admin` shows a dashboard summary
- `/admin/expenses` manages public expense and project cards
- `/admin/news` manages public announcements
- `/admin/pending-approvals` reviews items that require approval
- `/admin/settings` configures public display behavior and content

Only users in the Cognito `admin` group can access admin routes.

## Feature summary

### Expenses and projects

- create, edit, reorder, activate, approve, and delete items
- set budgets, funded amounts, due dates, and visibility windows
- upload optional images through Amplify Storage
- choose iconography and manual or automatic funding status
- drive public urgency states like `FUNDED`, `ON_TRACK`, `NEEDS_SUPPORT`, and `URGENT`

### Church news

- create, edit, reorder, activate, approve, and delete announcements
- schedule visibility windows
- set optional event date/time, location, category, and priority
- choose icons for public presentation

### Dashboard settings

- church name and scripture verse
- whether the public display shows the clock and date
- whether Projects & Expenses and Church News are enabled
- refresh interval and screen rotation interval
- expenses page title, website, donation URL, and e-transfer text
- news page title and item count
- liturgy calendar ID, Google API key, look-ahead window, and number of liturgies to show

## Tech stack

- React 18
- TypeScript
- Vite
- Tailwind CSS 4
- TanStack Query
- React Router
- AWS Amplify Gen 2
- Amazon Cognito
- API Gateway HTTP API
- AWS Lambda
- DynamoDB
- Amplify Storage
- Capacitor Android

## Architecture

### Frontend

- [src/routes/router.tsx](/Users/sallysamuel/workspace/tv-dashboard/src/routes/router.tsx:1) defines the public and admin routes
- [src/lib/auth.tsx](/Users/sallysamuel/workspace/tv-dashboard/src/lib/auth.tsx:1) manages Cognito-backed session state
- [src/lib/api.ts](/Users/sallysamuel/workspace/tv-dashboard/src/lib/api.ts:1) attaches bearer tokens for protected API requests
- [src/lib/church-dashboard.ts](/Users/sallysamuel/workspace/tv-dashboard/src/lib/church-dashboard.ts:1) contains dashboard data hooks, helpers, and admin mutations

### Backend

- [amplify/backend.ts](/Users/sallysamuel/workspace/tv-dashboard/amplify/backend.ts:1) defines the Amplify backend, API routes, table, and outputs
- [amplify/auth/resource.ts](/Users/sallysamuel/workspace/tv-dashboard/amplify/auth/resource.ts:1) defines email sign-in, `custom:tenantId`, and Cognito groups
- [amplify/functions/shepherd-hub-api/resource.ts](/Users/sallysamuel/workspace/tv-dashboard/amplify/functions/shepherd-hub-api/resource.ts:1) configures the Lambda function
- [amplify/functions/shepherd-hub-api/handler.ts](/Users/sallysamuel/workspace/tv-dashboard/amplify/functions/shepherd-hub-api/handler.ts:1) implements the API behavior

### Data model

The app uses a DynamoDB single-table design with `PK` and `SK`, plus `GSI1` and `GSI2`, to store:

- dashboard settings
- expense/project items
- church news items

### Auth model

Cognito groups currently defined by the backend:

- `admin`
- `priest`
- `servant`

The current routed admin UI is restricted to `admin`. The token also carries `custom:tenantId`, which is part of the broader auth model used across the codebase.

## API routes

### Public routes

- `GET /expenses`
- `GET /news`
- `GET /liturgies`
- `GET /dashboard`
- `GET /settings`

### Protected routes

- `GET /admin/expenses`
- `GET /admin/news`
- `GET /admin/settings`
- `PUT /admin/settings`
- `POST /expenses`
- `PUT /expenses/order`
- `PUT /expenses/{id}/approve`
- `PUT /expenses/{id}/active`
- `GET /expenses/{id}`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`
- `POST /news`
- `PUT /news/order`
- `PUT /news/{id}/approve`
- `PUT /news/{id}/active`
- `GET /news/{id}`
- `PUT /news/{id}`
- `DELETE /news/{id}`

## Local development

### Requirements

- Node.js 20+
- npm
- Amplify credentials for the target AWS environment

### Install

```bash
npm ci
```

### Start the app

1. Start or connect the Amplify sandbox:

```bash
npm run ampx:sandbox
```

2. Generate `amplify_outputs.json` if it is not already present:

```bash
npm run ampx:generate-outputs
```

3. Start the Vite dev server:

```bash
npm run dev
```

If you are working against an existing deployed API instead of generated Amplify outputs, `src/lib/api.ts` also supports `VITE_API_BASE_URL`.

## Build and test

```bash
npm run build
```

```bash
npm run test:lambda
```

## Android workflow

When you want the Android app to reflect the latest web UI:

1. Build the web app:

```bash
npm run build
```

2. Sync Capacitor assets into Android:

```bash
npx cap sync android
```

3. Open the native project:

```bash
npx cap open android
```

Then run or package the app from Android Studio.

## Notes

- `amplify_outputs.json` is required for local Amplify auth and API configuration.
- Some package names and backend identifiers still use the legacy `shepherd-hub` naming. Those are implementation details and may map to deployed resources.
- The repo still contains broader church-management code paths that are not part of the current routed dashboard experience. This README describes the active church dashboard product surfaced by the current router and backend setup.
