import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const templates = await prisma.emailTemplate.findMany({
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, defaultBody, sections } = body;

    if (!name || !subject) {
      return NextResponse.json(
        { error: 'Name and subject are required' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        defaultBody: defaultBody || '',
        sections: sections ? {
          create: sections.map((section: any, index: number) => ({
            sectionKey: section.sectionKey,
            label: section.label,
            content: section.content,
            isDefault: section.isDefault || false,
            orderIndex: section.orderIndex !== undefined ? section.orderIndex : index,
          })),
        } : undefined,
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}

