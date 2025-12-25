import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clickupTaskId = searchParams.get('clickupTaskId');
    const assigneeId = searchParams.get('assigneeId');

    const where: any = {};
    if (clickupTaskId) where.clickupTaskId = clickupTaskId;
    if (assigneeId) where.assigneeId = assigneeId;

    const schedules = await prisma.timelineSchedule.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { dayIndex: 'asc' }],
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching timeline schedules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clickupTaskId, assigneeId, dayIndex, scheduledDate } = body;

    if (!clickupTaskId || assigneeId === undefined || dayIndex === undefined || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure assigneeId is a string (ClickUp sometimes returns numbers)
    const assigneeIdStr = String(assigneeId);

    const schedule = await prisma.timelineSchedule.upsert({
      where: {
        clickupTaskId_assigneeId_dayIndex: {
          clickupTaskId,
          assigneeId: assigneeIdStr,
          dayIndex,
        },
      },
      update: {
        assigneeId: assigneeIdStr,
        scheduledDate: new Date(scheduledDate),
      },
      create: {
        clickupTaskId,
        assigneeId: assigneeIdStr,
        dayIndex,
        scheduledDate: new Date(scheduledDate),
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error creating/updating timeline schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save schedule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { schedules } = body; // Array of { clickupTaskId, assigneeId, dayIndex, scheduledDate }

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'schedules must be an array' },
        { status: 400 }
      );
    }

    if (schedules.length === 0) {
      return NextResponse.json({ schedules: [] });
    }

    // Validate all schedules before processing
    for (const s of schedules) {
      if (!s.clickupTaskId || s.assigneeId === undefined || s.dayIndex === undefined || !s.scheduledDate) {
        return NextResponse.json(
          { error: `Missing required fields in schedule: ${JSON.stringify(s)}` },
          { status: 400 }
        );
      }
    }

    // Verify prisma client has the model
    if (!prisma.timelineSchedule) {
      console.error('Prisma client does not have timelineSchedule model');
      console.error('Available models:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));
      return NextResponse.json(
        { error: 'Database model not available. Please restart the server.' },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      schedules.map(async (s: any) => {
        try {
          // Ensure assigneeId is a string (ClickUp sometimes returns numbers)
          const assigneeIdStr = String(s.assigneeId);
          
          return await prisma.timelineSchedule.upsert({
            where: {
              clickupTaskId_assigneeId_dayIndex: {
                clickupTaskId: s.clickupTaskId,
                assigneeId: assigneeIdStr,
                dayIndex: s.dayIndex,
              },
            },
            update: {
              assigneeId: assigneeIdStr,
              scheduledDate: new Date(s.scheduledDate),
            },
            create: {
              clickupTaskId: s.clickupTaskId,
              assigneeId: assigneeIdStr,
              dayIndex: s.dayIndex,
              scheduledDate: new Date(s.scheduledDate),
            },
          });
        } catch (err) {
          console.error(`Error upserting schedule for ${s.clickupTaskId} day ${s.dayIndex}:`, err);
          throw err;
        }
      })
    );

    return NextResponse.json({ schedules: results });
  } catch (error) {
    console.error('Error bulk updating timeline schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update schedules';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clickupTaskId = searchParams.get('clickupTaskId');

    if (!clickupTaskId) {
      return NextResponse.json(
        { error: 'clickupTaskId is required' },
        { status: 400 }
      );
    }

    await prisma.timelineSchedule.deleteMany({
      where: { clickupTaskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline schedules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete schedules' },
      { status: 500 }
    );
  }
}

