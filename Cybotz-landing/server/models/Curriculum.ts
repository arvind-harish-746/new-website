import mongoose from "mongoose";

const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  desc: { type: String, required: true },
});

const CurriculumSchema = new mongoose.Schema({
  title: { type: String, required: true },
  level: { type: String, required: true },
  duration: { type: String, required: true },
  targetAudience: { type: String, default: "All Students" },
  summary: { type: String, required: true },
  modules: { type: [ModuleSchema], default: [] },
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      return ret;
    }
  }
});

CurriculumSchema.virtual("id").get(function() {
  return this._id ? this._id.toHexString() : undefined;
});

export const Curriculum = mongoose.model("Curriculum", CurriculumSchema);
