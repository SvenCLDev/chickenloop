import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEquipmentWaitlist extends Document {
  name: string;
  email: string;
  schoolName?: string;
  country?: string;
  equipmentCount?: number;
  instructorCount?: number;
  interestedPrice?: number;
  source?: string;
  createdAt: Date;
}

const EquipmentWaitlistSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    schoolName: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    equipmentCount: {
      type: Number,
    },
    instructorCount: {
      type: Number,
    },
    interestedPrice: {
      type: Number,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'equipmentWaitlist',
  }
);

EquipmentWaitlistSchema.index({ email: 1 });
EquipmentWaitlistSchema.index({ createdAt: -1 });

const EquipmentWaitlist: Model<IEquipmentWaitlist> =
  (mongoose.models.EquipmentWaitlist as Model<IEquipmentWaitlist>) ||
  mongoose.model<IEquipmentWaitlist>('EquipmentWaitlist', EquipmentWaitlistSchema);

export default EquipmentWaitlist;
