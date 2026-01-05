import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICareerAdvice extends Document {
  title: string;
  picture?: string; // Single picture URL
  content: string; // HTML formatted content
  author: mongoose.Types.ObjectId; // Admin who created it
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CareerAdviceSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    picture: {
      type: String,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CareerAdvice: Model<ICareerAdvice> = mongoose.models.CareerAdvice || mongoose.model<ICareerAdvice>('CareerAdvice', CareerAdviceSchema);

export default CareerAdvice;






