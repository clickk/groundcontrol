import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function GET(request: NextRequest) {
  try {
    if (!CLICKUP_API_TOKEN || !CLICKUP_LIST_ID || !CLICKUP_TEAM_ID) {
      // During build time, return empty array instead of error
      return NextResponse.json({ users: [] });
    }

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    const users = await client.getUsers();

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    // During build time or if API fails, return empty array
    // This allows the app to build successfully even if ClickUp API is unavailable
    return NextResponse.json({ users: [] });
  }
}

