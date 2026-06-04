import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketingBanner extends Document {
  experimentId: mongoose.Types.ObjectId;
  variantKey: string;
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  analyticsSource: string;
  /** Visual style preset (A/B/C) for layout theming */
  styleKey: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingBannerSchema: Schema = new Schema(
  {
    experimentId: {
      type: Schema.Types.ObjectId,
      ref: 'Experiment',
      required: true,
      index: true,
    },
    variantKey: {
      type: String,
      required: true,
      trim: true,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    subheadline: {
      type: String,
      required: true,
      trim: true,
    },
    cta: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    analyticsSource: {
      type: String,
      required: true,
      trim: true,
    },
    styleKey: {
      type: String,
      default: 'A',
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'marketingBanners',
  }
);

MarketingBannerSchema.index({ experimentId: 1, variantKey: 1 }, { unique: true });

const MarketingBanner: Model<IMarketingBanner> =
  (mongoose.models.MarketingBanner as Model<IMarketingBanner>) ||
  mongoose.model<IMarketingBanner>('MarketingBanner', MarketingBannerSchema);

export default MarketingBanner;
