import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlockedEmail extends Document {
  email: string;
  blockedAt: Date;
  blockedBy?: mongoose.Types.ObjectId;
}

const BlockedEmailSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: false }
);

const BlockedEmail: Model<IBlockedEmail> =
  mongoose.models.BlockedEmail || mongoose.model<IBlockedEmail>('BlockedEmail', BlockedEmailSchema);

export default BlockedEmail;
