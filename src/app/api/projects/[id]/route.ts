import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function GET(
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

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    const task = await client.getProject(params.id);

    return NextResponse.json({ project: task });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);

    // Update name
    if (body.name !== undefined) {
      await client.updateProjectName(params.id, body.name);
    }

    // Update description
    if (body.description !== undefined) {
      await client.updateProjectDescription(params.id, body.description);
    }

    // Update status
    if (body.status !== undefined) {
      await client.updateProjectStatus(params.id, body.status);
    }

    // Update assignees
    if (body.assignees !== undefined && Array.isArray(body.assignees)) {
      await client.updateProjectAssignees(params.id, body.assignees);
    }

    // Update dates
    if (body.start_date !== undefined || body.due_date !== undefined) {
      await client.updateProjectDates(
        params.id,
        body.start_date,
        body.due_date
      );
    }

    const updatedTask = await client.getProject(params.id);

    return NextResponse.json({ project: updatedTask });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

