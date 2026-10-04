import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tags: { type: [String], default: ["General"] },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, default: "Prasanna" },
  date: { type: String, required: true },
  image: { type: String, default: "" },
  comments: [{
    userId: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }],
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

BlogSchema.virtual("id").get(function() {
  return this._id ? this._id.toHexString() : undefined;
});

export const Blog = mongoose.model("Blog", BlogSchema);
