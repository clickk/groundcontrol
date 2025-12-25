import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch template' },
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
    const { name, subject, defaultBody, sections } = body;

    // Update template
    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        name,
        subject,
        defaultBody: defaultBody || '',
      },
    });

    // Update sections if provided
    if (sections) {
      // Delete existing sections
      await prisma.emailTemplateSection.deleteMany({
        where: { templateId: params.id },
      });

      // Create new sections
      await prisma.emailTemplateSection.createMany({
        data: sections.map((section: any, index: number) => ({
          templateId: params.id,
          sectionKey: section.sectionKey,
          label: section.label,
          content: section.content,
          isDefault: section.isDefault || false,
          orderIndex: section.orderIndex !== undefined ? section.orderIndex : index,
        })),
      });
    }

    const updatedTemplate = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.emailTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}

