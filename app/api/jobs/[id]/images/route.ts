import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

// GET - Get images for a specific job
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
        }

        await connectDB();

        const db = mongoose.connection.db;
        if (!db) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Fetch images from job_images collection
        const images = await db.collection('job_images')
            .find({ jobId: new mongoose.Types.ObjectId(id) })
            .sort({ order: 1 })
            .project({ imageUrl: 1, order: 1, isHero: 1, _id: 0 })
            .toArray();

        // Also check if job still has pictures field (for backwards compatibility)
        const job = await db.collection('jobs').findOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { projection: { pictures: 1 } }
        );

        // Combine both sources - return full image objects with isHero flag
        let allImages = images.map((img: any) => ({
            imageUrl: img.imageUrl,
            isHero: img.isHero === true,
            order: img.order || 0,
        }));

        // If job still has pictures array and job_images is empty, use those
        if (allImages.length === 0 && job?.pictures && Array.isArray(job.pictures)) {
            const filteredPictures = job.pictures.filter((p: string) => !p.startsWith('data:')); // Exclude Base64
            allImages = filteredPictures.map((imgUrl: string, index: number) => ({
                imageUrl: imgUrl,
                isHero: index === 0, // First image is hero by default for legacy jobs
                order: index,
            }));
        }

        return NextResponse.json({ images: allImages }, { status: 200 });
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching job images:', error);
        return NextResponse.json(
            { error: errorMessage || 'Internal server error' },
            { status: 500 }
        );
    }
}
