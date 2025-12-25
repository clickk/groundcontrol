import { NextRequest, NextResponse } from 'next/server';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

export async function POST(request: NextRequest) {
  try {
    if (!CLICKUP_API_TOKEN || !CLICKUP_LIST_ID || !CLICKUP_TEAM_ID) {
      return NextResponse.json(
        { error: 'ClickUp configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { projectIds } = body;

    if (!Array.isArray(projectIds)) {
      return NextResponse.json(
        { error: 'projectIds must be an array' },
        { status: 400 }
      );
    }

    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    const summaries: Record<string, { latestComment: any; totalTime: number; budget?: number }> = {};

    // Fetch data for each project in parallel (with rate limiting consideration)
    await Promise.all(
      projectIds.map(async (projectId: string) => {
        try {
          const [comments, timeEntries] = await Promise.all([
            client.getProjectNotes(projectId).catch(() => []),
            client.getTimeEntries(projectId).catch(() => []),
          ]);

          // Get latest comment
          const latestComment = comments && comments.length > 0 
            ? comments.sort((a, b) => parseInt(b.date) - parseInt(a.date))[0]
            : null;

          // Calculate total time (duration is in milliseconds)
          const totalTimeMs = timeEntries.reduce((sum, entry) => {
            const duration = parseInt(entry.duration) || 0;
            return sum + duration;
          }, 0);
          const totalTimeHours = totalTimeMs / (1000 * 60 * 60); // Convert to hours

          summaries[projectId] = {
            latestComment,
            totalTime: totalTimeHours,
          };
        } catch (error) {
          console.error(`Error fetching summary for project ${projectId}:`, error);
          summaries[projectId] = {
            latestComment: null,
            totalTime: 0,
          };
        }
      })
    );

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error('Error fetching project summaries:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project summaries' },
      { status: 500 }
    );
  }
}

