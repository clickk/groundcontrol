import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClickUpClient } from '@/lib/api/clickup-client';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || '';
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || '';
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID || '';

// Pre-defined checklist items
const PRE_LAUNCH_QA_ITEMS = [
  'Check for any broken links',
  'Responsive tests mobile plus tablet',
  'Remove all placeholder text',
  'Check all contact form to and from emails are correct + set subject line and correct email address - From address, reply to address, client email address',
  'Check on different browsers (Chrome, Mozilla, Safari, Edge)',
  'Create meta titles and descriptions for main pages',
  'Add featured image to Home page',
  'Add Favicon',
  'Create alt tags for images',
  'SEO Yoast appearance fill out relevant fields - Including Archive + Categories + Tags (default off) + Authors (default off) + RSS Feeds (default turn-off)',
  'Check which archive pages will be shown in search results',
  'Generate Sendgrid CNAMEs + Dmarc',
  'Prepare draft email for I.T. provider',
];

const POST_LAUNCH_QA_ITEMS = [
  'Check if hosting information is in Halo',
  'Install backup on Live Site',
  'Saved permalinks after all in one migration',
  'Make sure all correct logins in Keeper',
  'Turn off robots',
  'Ensure licences are up to date',
  'Set up sitekit + Configure GA4',
  'Set up sitekit + Submit sitemap to google search console',
  'Verify sendgrid',
  'Setup WP SMTP',
  'Check for mixed content errors + Check live site is on HTTPS',
  'Add to WPManage',
  'enable backups for free on manageWP',
  'Add tags and set default user for WPmanage',
  'Check live site is on HTTPS',
  '301 Redirects URLs (If rebuild)',
  'Add litespeed caching if on crucial (SOP in Halo)',
  'Recaptcha',
  'Send Go Live Email to client',
  'Add recurring invoice for Hosting',
  'Send test contact form to client + forward to Chris and Dan confirmation + Save in Halo',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const checklistType = searchParams.get('type'); // 'pre-launch' or 'post-launch'

    const where: any = { clickupTaskId: params.id };
    if (checklistType) {
      where.checklistType = checklistType;
    }

    // First, check if ANY checklist items exist for this project (without type filter)
    const existingItems = await prisma.projectChecklist.findMany({
      where: { clickupTaskId: params.id },
      select: { checklistType: true },
      distinct: ['checklistType'],
    });

    console.log('Checklist initialization check:', {
      taskId: params.id,
      existingTypes: existingItems.map(i => i.checklistType),
    });

    const hasPreLaunch = existingItems.some(item => item.checklistType === 'pre-launch');
    const hasPostLaunch = existingItems.some(item => item.checklistType === 'post-launch');

    // Initialize checklists if they don't exist (initialize both if neither exists, or the missing one)
    const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
    
    if (!hasPreLaunch) {
      console.log('Initializing Pre Launch QA checklist:', { taskId: params.id, itemCount: PRE_LAUNCH_QA_ITEMS.length });
      
      // Create checklist in ClickUp
      let clickupChecklistId: string | null = null;
      try {
        const clickupChecklist = await client.createChecklist(params.id, 'Pre Launch QA');
        clickupChecklistId = clickupChecklist.id;
        console.log('Created Pre Launch QA checklist in ClickUp:', clickupChecklistId);
      } catch (clickupError) {
        console.error('Failed to create checklist in ClickUp, continuing with local storage:', clickupError);
      }
      
      // Create items in database and ClickUp
      await Promise.all(
        PRE_LAUNCH_QA_ITEMS.map(async (text, index) => {
          // Create in database
          const dbItem = await prisma.projectChecklist.create({
            data: {
              clickupTaskId: params.id,
              checklistType: 'pre-launch',
              itemIndex: index,
              itemText: text,
              isChecked: false,
            },
          });
          
          // Create in ClickUp if checklist was created successfully
          if (clickupChecklistId) {
            try {
              await client.addChecklistItem(params.id, clickupChecklistId, text);
            } catch (itemError) {
              console.error(`Failed to add checklist item "${text}" to ClickUp:`, itemError);
            }
          }
          
          return dbItem;
        })
      );
      console.log('Pre Launch QA checklist initialized successfully');
    }

    if (!hasPostLaunch) {
      console.log('Initializing Post Launch QA checklist:', { taskId: params.id, itemCount: POST_LAUNCH_QA_ITEMS.length });
      
      // Create checklist in ClickUp
      let clickupChecklistId: string | null = null;
      try {
        const clickupChecklist = await client.createChecklist(params.id, 'Post Launch QA');
        clickupChecklistId = clickupChecklist.id;
        console.log('Created Post Launch QA checklist in ClickUp:', clickupChecklistId);
      } catch (clickupError) {
        console.error('Failed to create checklist in ClickUp, continuing with local storage:', clickupError);
      }
      
      // Create items in database and ClickUp
      await Promise.all(
        POST_LAUNCH_QA_ITEMS.map(async (text, index) => {
          // Create in database
          const dbItem = await prisma.projectChecklist.create({
            data: {
              clickupTaskId: params.id,
              checklistType: 'post-launch',
              itemIndex: index,
              itemText: text,
              isChecked: false,
            },
          });
          
          // Create in ClickUp if checklist was created successfully
          if (clickupChecklistId) {
            try {
              await client.addChecklistItem(params.id, clickupChecklistId, text);
            } catch (itemError) {
              console.error(`Failed to add checklist item "${text}" to ClickUp:`, itemError);
            }
          }
          
          return dbItem;
        })
      );
      console.log('Post Launch QA checklist initialized successfully');
    }

    // Now fetch the checklist items (with the original filter if provided)
    const checklistItems = await prisma.projectChecklist.findMany({
      where,
      orderBy: [{ checklistType: 'asc' }, { itemIndex: 'asc' }],
    });

    console.log('Returning checklist items:', {
      taskId: params.id,
      itemCount: checklistItems.length,
      preLaunchCount: checklistItems.filter(i => i.checklistType === 'pre-launch').length,
      postLaunchCount: checklistItems.filter(i => i.checklistType === 'post-launch').length,
    });

    return NextResponse.json({ checklist: checklistItems });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch checklist' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { checklistType, itemIndex, isChecked } = body;

    if (checklistType === undefined || itemIndex === undefined || isChecked === undefined) {
      return NextResponse.json(
        { error: 'checklistType, itemIndex, and isChecked are required' },
        { status: 400 }
      );
    }

    // Update the checklist item
    const updated = await prisma.projectChecklist.upsert({
      where: {
        clickupTaskId_checklistType_itemIndex: {
          clickupTaskId: params.id,
          checklistType,
          itemIndex,
        },
      },
      update: {
        isChecked,
        checkedAt: isChecked ? new Date() : null,
      },
      create: {
        clickupTaskId: params.id,
        checklistType,
        itemIndex,
        itemText: checklistType === 'pre-launch' 
          ? PRE_LAUNCH_QA_ITEMS[itemIndex] || ''
          : POST_LAUNCH_QA_ITEMS[itemIndex] || '',
        isChecked,
        checkedAt: isChecked ? new Date() : null,
      },
    });

    // Sync to ClickUp if possible
    try {
      const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
      const checklistName = checklistType === 'pre-launch' ? 'Pre Launch QA' : 'Post Launch QA';
      const itemText = updated.itemText;
      
      // Try to find and update the checklist item in ClickUp
      // Note: This is a best-effort sync. If the checklist/item doesn't exist in ClickUp, it will fail silently
      const checklists = await client.getTaskChecklists(params.id);
      const checklist = checklists.find(c => c.name === checklistName);
      
      if (checklist && checklist.items) {
        const item = checklist.items.find(i => i.name === itemText);
        if (item) {
          await client.updateChecklistItem(params.id, checklist.id, item.id, isChecked);
        }
      }
    } catch (clickupError) {
      // Log but don't fail the request if ClickUp sync fails
      console.error('Failed to sync checklist item status to ClickUp:', clickupError);
    }

    // Check if all items in this checklist are now completed
    const allItems = await prisma.projectChecklist.findMany({
      where: {
        clickupTaskId: params.id,
        checklistType,
      },
      orderBy: { itemIndex: 'asc' },
    });

    const allChecked = allItems.length > 0 && allItems.every(item => item.isChecked);

    return NextResponse.json({ checklistItem: updated, allCompleted: allChecked });
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { checklistType } = body;

    if (!checklistType) {
      return NextResponse.json(
        { error: 'checklistType is required' },
        { status: 400 }
      );
    }

    // Verify all items are checked
    const allItems = await prisma.projectChecklist.findMany({
      where: {
        clickupTaskId: params.id,
        checklistType,
      },
      orderBy: { itemIndex: 'asc' },
    });

    const allChecked = allItems.length > 0 && allItems.every(item => item.isChecked);

    if (!allChecked) {
      return NextResponse.json(
        { error: 'Not all items are checked' },
        { status: 400 }
      );
    }

    // Create comment in ClickUp
    try {
      const client = new ClickUpClient(CLICKUP_API_TOKEN, CLICKUP_LIST_ID, CLICKUP_TEAM_ID);
      const checklistName = checklistType === 'pre-launch' ? 'Pre Launch QA' : 'Post Launch QA';
      const commentText = `✅ ${checklistName} Checklist Completed!\n\nAll items have been checked:\n${allItems.map((item) => `✓ ${item.itemText}`).join('\n')}`;
      
      await client.addProjectNote(params.id, commentText);
    } catch (commentError) {
      console.error('Error creating ClickUp comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment in ClickUp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Checklist marked as complete' });
  } catch (error) {
    console.error('Error completing checklist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete checklist' },
      { status: 500 }
    );
  }
}

