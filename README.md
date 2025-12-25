# Clickk Project Management Tool

Internal project management tool for Clickk agency that integrates with ClickUp.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- ClickUp API token
- ClickUp Team ID and List ID

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy `.env.example` to `.env` and fill in your values:
- `DATABASE_URL`: PostgreSQL connection string
- `CLICKUP_API_TOKEN`: Your ClickUp API token
- `CLICKUP_TEAM_ID`: Your ClickUp team ID
- `CLICKUP_LIST_ID`: Your ClickUp list ID
- `JWT_SECRET`: Secret key for JWT tokens

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/app/`: Next.js app router pages
- `src/components/`: React components
- `src/lib/`: Utility libraries and services
- `src/types/`: TypeScript type definitions
- `src/hooks/`: Custom React hooks
- `src/server/`: API routes and server-side code
- `prisma/`: Database schema

## Key Features

- Authentication and user management
- Project visibility from ClickUp
- Global dashboard
- My work view
- Team planner week view with drag and drop
- Time tracking
- Status updates
- Notes and comments

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run type-check`: Type check without building
- `npm run db:studio`: Open Prisma Studio

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Prisma (PostgreSQL)
- React Query
- React Big Calendar
- ClickUp API

## Documentation

See `CLICKK_SPECIFICATION.md` for detailed specification and implementation plan.

