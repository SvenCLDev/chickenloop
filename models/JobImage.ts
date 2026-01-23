import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJobImage extends Document {
    jobId: mongoose.Types.ObjectId;
    imageUrl: string;
    order: number;
    isHero?: boolean;
    createdAt: Date;
}

const JobImageSchema: Schema = new Schema(
    {
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            index: true, // Index for fast lookups by jobId
        },
        imageUrl: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isHero: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
JobImageSchema.index({ jobId: 1, order: 1 });

const JobImage: Model<IJobImage> =
    mongoose.models.JobImage || mongoose.model<IJobImage>('JobImage', JobImageSchema);

export default JobImage;
