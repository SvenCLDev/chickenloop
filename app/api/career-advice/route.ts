import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CareerAdvice from '@/models/CareerAdvice';
import { requireRole } from '@/lib/auth';

// GET - Get all published career advice articles (public)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    // Build query
    const query: any = {};
    if (!includeUnpublished) {
      query.published = true;
    }

    const articles = await CareerAdvice.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const articlesWithData = articles.map((article: any) => ({
      id: article._id.toString(),
      title: article.title,
      picture: article.picture,
      content: article.content,
      author: article.author ? {
        id: article.author._id.toString(),
        name: article.author.name,
        email: article.author.email,
      } : null,
      published: article.published !== false,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    }));

    return NextResponse.json({ articles: articlesWithData }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /career-advice] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new career advice article (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin']);
    await connectDB();

    const body = await request.json();
    const { title, picture, content, published } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const article = await CareerAdvice.create({
      title: title.trim(),
      picture: picture || undefined,
      content: content,
      author: user.userId,
      published: published !== undefined ? published : true,
    });

    const populatedArticle = await CareerAdvice.findById(article._id)
      .populate('author', 'name email')
      .lean();

    return NextResponse.json({
      article: {
        id: populatedArticle!._id.toString(),
        title: populatedArticle!.title,
        picture: populatedArticle!.picture,
        content: populatedArticle!.content,
        author: populatedArticle!.author ? {
          id: (populatedArticle!.author as any)._id.toString(),
          name: (populatedArticle!.author as any).name,
          email: (populatedArticle!.author as any).email,
        } : null,
        published: populatedArticle!.published !== false,
        createdAt: populatedArticle!.createdAt,
        updatedAt: populatedArticle!.updatedAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[API /career-advice] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

