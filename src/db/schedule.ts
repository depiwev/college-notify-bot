import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ScheduleSchema = new mongoose.Schema({
  date: { type: String },
  lesson: { type: Number },
  started_at: { type: String },
  finished_at: { type: String },
  subject_name: { type: String },
  teacher_name: { type: String },
  created_at: { type: Date, default: () => new Date() },
});

export type ScheduleDocument = InferSchemaType<typeof ScheduleSchema>;

export const ScheduleModel: Model<ScheduleDocument> = mongoose.model(
  "everyday_schedule",
  ScheduleSchema,
);
