import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStripeEvent extends Document {
  eventId: string;
  createdAt: Date;
}

const StripeEventSchema: Schema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

StripeEventSchema.index({ eventId: 1 }, { unique: true });

const StripeEvent: Model<IStripeEvent> =
  mongoose.models.StripeEvent || mongoose.model<IStripeEvent>('StripeEvent', StripeEventSchema);

export default StripeEvent;
