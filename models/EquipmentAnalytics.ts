import mongoose, { Schema, Document, Model } from 'mongoose';

export const EQUIPMENT_ANALYTICS_EVENTS = [
  'equipment_banner_view',
  'equipment_banner_click',
  'equipment_waitlist_signup',
] as const;

export type EquipmentAnalyticsEvent = (typeof EQUIPMENT_ANALYTICS_EVENTS)[number];

export interface IEquipmentAnalytics extends Document {
  event: EquipmentAnalyticsEvent;
  source: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  createdAt: Date;
}

const EquipmentAnalyticsSchema: Schema = new Schema(
  {
    event: {
      type: String,
      enum: EQUIPMENT_ANALYTICS_EVENTS,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'equipmentAnalytics',
  }
);

EquipmentAnalyticsSchema.index({ createdAt: -1 });
EquipmentAnalyticsSchema.index({ event: 1, source: 1, createdAt: -1 });

const EquipmentAnalytics: Model<IEquipmentAnalytics> =
  (mongoose.models.EquipmentAnalytics as Model<IEquipmentAnalytics>) ||
  mongoose.model<IEquipmentAnalytics>('EquipmentAnalytics', EquipmentAnalyticsSchema);

export default EquipmentAnalytics;
