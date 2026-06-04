import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketingPlacement extends Document {
  key: string;
  label: string;
  experimentId: mongoose.Types.ObjectId;
  activeBannerId?: mongoose.Types.ObjectId | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingPlacementSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: 'Experiment',
      required: true,
      index: true,
    },
    activeBannerId: {
      type: Schema.Types.ObjectId,
      ref: 'MarketingBanner',
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'marketingPlacements',
  }
);

const MarketingPlacement: Model<IMarketingPlacement> =
  (mongoose.models.MarketingPlacement as Model<IMarketingPlacement>) ||
  mongoose.model<IMarketingPlacement>('MarketingPlacement', MarketingPlacementSchema);

export default MarketingPlacement;
