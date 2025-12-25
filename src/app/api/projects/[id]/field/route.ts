import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

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
    const { fieldId, value } = body;

    if (!fieldId || value === undefined) {
      return NextResponse.json(
        { error: 'fieldId and value are required' },
        { status: 400 }
      );
    }
    // Note: value can be null (to clear a field), but not undefined

    console.log('Updating field:', { taskId: params.id, fieldId, value, valueType: typeof value });

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    
    try {
      await client.updateProjectField(params.id, fieldId, value);
      
      // Wait a moment for ClickUp to process the update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedTask = await client.getProject(params.id);

      return NextResponse.json({ project: updatedTask });
    } catch (error) {
      console.error('Error updating project field:', {
        taskId: params.id,
        fieldId,
        value,
        error: error instanceof Error ? error.message : error,
      });
      
      // Return more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project field';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating project field:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project field' },
      { status: 500 }
    );
  }
}

