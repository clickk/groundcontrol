import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any = null;
  try {
    if (!CLICKUP_API_TOKEN || !CLICKUP_LIST_ID || !CLICKUP_TEAM_ID) {
      return NextResponse.json(
        { error: 'ClickUp configuration missing' },
        { status: 500 }
      );
    }

    body = await request.json();
    const { duration, description, billable } = body;

    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required' },
        { status: 400 }
      );
    }

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    
    // ClickUp expects duration in milliseconds
    const durationMs = typeof duration === 'number' ? duration : parseInt(duration);
    
    // When providing duration, don't provide start time (ClickUp will use current time)
    // Only provide start if we also have end time
    const result = await client.createTimeEntry(
      params.id,
      durationMs,
      description || 'Time tracked',
      undefined, // Don't provide start time when only duration is provided
      billable !== undefined ? billable : true
    );

    return NextResponse.json({ timeEntry: result });
  } catch (error) {
    console.error('Error creating time entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create time entry';
    console.error('Full error details:', {
      message: errorMessage,
      duration: body?.duration,
      taskId: params.id,
      error: error,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

