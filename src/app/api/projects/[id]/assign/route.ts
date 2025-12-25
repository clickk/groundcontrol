import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!CLICKUP_API_TOKEN || !CLICKUP_LIST_ID || !CLICKUP_TEAM_ID) {
      return NextResponse.json(
        { error: 'ClickUp configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    await client.assignProjectToUser(params.id, userId);

    const updatedTask = await client.getProject(params.id);

    return NextResponse.json({ project: updatedTask });
  } catch (error) {
    console.error('Error assigning project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign project' },
      { status: 500 }
    );
  }
}

