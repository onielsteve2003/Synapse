const mongoose = require("mongoose");

const CanvasNodeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      x: {
        type: Number,
        required: true,
      },
      y: {
        type: Number,
        required: true,
      },
    },
    data: {
      label: {
        type: String,
        required: true,
        trim: true,
      },
      size: {
        type: String,
        enum: ["sm", "md", "lg"],
        default: "md",
      },
      techStack: {
        type: [String],
        default: [],
      },
    },
  },
  { _id: false },
);

const CanvasEdgeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const CanvasSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    nodes: {
      type: [CanvasNodeSchema],
      default: [],
    },
    edges: {
      type: [CanvasEdgeSchema],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "lastModified",
    },
  },
);

CanvasSchema.index({ owner: 1, lastModified: -1 });

module.exports = mongoose.model("Canvas", CanvasSchema);
