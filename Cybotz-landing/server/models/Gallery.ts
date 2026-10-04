import mongoose from "mongoose";

const GallerySchema = new mongoose.Schema(
  {
    page: { type: String, required: true, enum: ["labs", "workshops"] },
    src: { type: String, required: true },
    alt: { type: String, default: "" },
    title: { type: String, default: "" },
    tag: { type: String, default: "" },
    addedBy: { type: String, default: "Admin" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
  }
);

GallerySchema.virtual("id").get(function () {
  return this._id ? this._id.toHexString() : undefined;
});

export const Gallery = mongoose.models.Gallery || mongoose.model("Gallery", GallerySchema);
