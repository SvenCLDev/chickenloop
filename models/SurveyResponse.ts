import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISurveyResponse extends Document {
  userId: mongoose.Types.ObjectId;
  surveyId: string;
  primaryAnswer?: string | null;
  secondaryAnswer?: string | null;
  /** Free text when primary answer is "Other" */
  otherText?: string | null;
  freeText?: string | null;
  dismissed: boolean;
  remindLaterUntil?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SurveyResponseSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    surveyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    primaryAnswer: {
      type: String,
      default: null,
      trim: true,
    },
    secondaryAnswer: {
      type: String,
      default: null,
      trim: true,
    },
    otherText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    freeText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    dismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
    remindLaterUntil: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'surveyResponses',
  }
);

SurveyResponseSchema.index({ userId: 1, surveyId: 1 }, { unique: true });
SurveyResponseSchema.index({ surveyId: 1, completedAt: -1 });
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });

const SurveyResponse: Model<ISurveyResponse> =
  (mongoose.models.SurveyResponse as Model<ISurveyResponse>) ||
  mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);

export default SurveyResponse;
