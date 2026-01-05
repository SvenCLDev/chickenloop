import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CareerAdvice from '@/models/CareerAdvice';
import { requireRole } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get a single career advice article (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    const article = await CareerAdvice.findById(id)
      .populate('author', 'name email')
      .lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      article: {
        id: article._id.toString(),
        title: article.title,
        picture: article.picture,
        content: article.content,
        author: article.author ? {
          id: (article.author as any)._id.toString(),
          name: (article.author as any).name,
          email: (article.author as any).email,
        } : null,
        published: article.published !== false,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /career-advice/[id]] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a career advice article (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, picture, content, published } = body;

    const updateData: any = {};
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }
    if (picture !== undefined) {
      updateData.picture = picture || undefined;
    }
    if (content !== undefined) {
      if (!content || !content.trim()) {
        return NextResponse.json(
          { error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      updateData.content = content;
    }
    if (published !== undefined) {
      updateData.published = published;
    }

    const article = await CareerAdvice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('author', 'name email')
      .lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      article: {
        id: article._id.toString(),
        title: article.title,
        picture: article.picture,
        content: article.content,
        author: article.author ? {
          id: (article.author as any)._id.toString(),
          name: (article.author as any).name,
          email: (article.author as any).email,
        } : null,
        published: article.published !== false,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[API /career-advice/[id]] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a career advice article (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    const article = await CareerAdvice.findByIdAndDelete(id);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Article deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[API /career-advice/[id]] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}






