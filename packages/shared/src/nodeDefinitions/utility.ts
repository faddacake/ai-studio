import type { NodeDefinition } from "../nodeDefinition.js";
import { NodeCategory, NodeRuntimeKind } from "../nodeDefinition.js";
import { PortType } from "../portTypes.js";
import { NodeType } from "../nodeTypes.js";

export const resizeNode: NodeDefinition = {
  type: NodeType.Resize,
  label: "Resize",
  category: NodeCategory.Transform,
  description: "Resize an image to specified dimensions using sharp.",
  icon: "scaling",

  inputs: [
    { id: "image_in", label: "Image", type: PortType.Image, required: true },
  ],
  outputs: [
    { id: "image_out", label: "Resized Image", type: PortType.Image },
  ],

  parameterSchema: [
    {
      key: "width",
      label: "Width",
      type: "number",
      required: true,
      min: 1,
      max: 8192,
      step: 1,
      defaultValue: 1024,
      description: "Target width in pixels",
    },
    {
      key: "height",
      label: "Height",
      type: "number",
      required: true,
      min: 1,
      max: 8192,
      step: 1,
      defaultValue: 1024,
      description: "Target height in pixels",
    },
    {
      key: "fit",
      label: "Fit Mode",
      type: "enum",
      defaultValue: "cover",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
        { value: "inside", label: "Inside" },
        { value: "outside", label: "Outside" },
      ],
      description: "How the image should be resized to fit the target dimensions",
    },
  ],

  uiSchema: {
    groups: [
      { label: "Dimensions", fields: ["width", "height"] },
      { label: "Options", fields: ["fit"], collapsed: true },
    ],
  },

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["transform", "image", "resize"],
  isAvailable: true,
};

export const cropNode: NodeDefinition = {
  type: NodeType.Crop,
  label: "Crop",
  category: NodeCategory.Transform,
  description: "Crop a region from an image.",
  icon: "crop",

  inputs: [
    { id: "image_in", label: "Image", type: PortType.Image, required: true },
  ],
  outputs: [
    { id: "image_out", label: "Cropped Image", type: PortType.Image },
  ],

  parameterSchema: [
    { key: "x", label: "X Offset", type: "number", required: true, min: 0, defaultValue: 0 },
    { key: "y", label: "Y Offset", type: "number", required: true, min: 0, defaultValue: 0 },
    { key: "width", label: "Width", type: "number", required: true, min: 1, defaultValue: 512 },
    { key: "height", label: "Height", type: "number", required: true, min: 1, defaultValue: 512 },
  ],

  uiSchema: {
    groups: [
      { label: "Crop Region", fields: ["x", "y", "width", "height"] },
    ],
  },

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["transform", "image", "crop"],
  isAvailable: true,
};

export const formatConvertNode: NodeDefinition = {
  type: NodeType.FormatConvert,
  label: "Format Convert",
  category: NodeCategory.Transform,
  description: "Convert an image to a different format (PNG, JPEG, WebP).",
  icon: "file-type",

  inputs: [
    { id: "image_in", label: "Image", type: PortType.Image, required: true },
  ],
  outputs: [
    { id: "image_out", label: "Converted Image", type: PortType.Image },
  ],

  parameterSchema: [
    {
      key: "format",
      label: "Target Format",
      type: "enum",
      required: true,
      defaultValue: "png",
      options: [
        { value: "png", label: "PNG" },
        { value: "jpeg", label: "JPEG" },
        { value: "webp", label: "WebP" },
      ],
    },
    {
      key: "quality",
      label: "Quality",
      type: "number",
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 90,
      description: "Compression quality (JPEG/WebP only)",
    },
  ],

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["transform", "image", "format"],
  isAvailable: true,
};

export const compositingNode: NodeDefinition = {
  type: NodeType.Compositing,
  label: "Compositing",
  category: NodeCategory.Transform,
  description: "Combine two images using a blend mode (overlay, side-by-side, top-bottom).",
  icon: "layers",

  inputs: [
    { id: "image_a", label: "Image A", type: PortType.Image, required: true },
    { id: "image_b", label: "Image B", type: PortType.Image, required: true },
  ],
  outputs: [
    { id: "image_out", label: "Composited Image", type: PortType.Image },
  ],

  parameterSchema: [
    {
      key: "mode",
      label: "Blend Mode",
      type: "enum",
      required: true,
      defaultValue: "side-by-side",
      options: [
        { value: "side-by-side", label: "Side by Side" },
        { value: "top-bottom", label: "Top / Bottom" },
        { value: "overlay", label: "Overlay" },
      ],
    },
  ],

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["transform", "image", "composite"],
  isAvailable: true,
};

export const promptTemplateNode: NodeDefinition = {
  type: NodeType.PromptTemplate,
  label: "Prompt Template",
  category: NodeCategory.Utility,
  description: "Build a text prompt from a template with {{variable}} placeholders.",
  icon: "text-cursor-input",

  inputs: [
    {
      id: "variables",
      label: "Variables",
      type: PortType.Json,
      required: false,
      description: "Key-value pairs to substitute into the template",
    },
  ],
  outputs: [
    { id: "text_out", label: "Prompt", type: PortType.Text },
  ],

  parameterSchema: [
    {
      key: "template",
      label: "Template",
      type: "string",
      required: true,
      multiline: true,
      placeholder: "A {{style}} photo of {{subject}} in {{setting}}",
      description: "Use {{variableName}} for placeholders",
    },
  ],

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["utility", "text", "prompt"],
  isAvailable: true,
};

export const commentNode: NodeDefinition = {
  type: NodeType.Comment,
  label: "Comment",
  category: NodeCategory.Annotation,
  description: "Sticky-note annotation. No ports, no execution — just a note on the canvas.",
  icon: "sticky-note",

  inputs: [],
  outputs: [],

  parameterSchema: [
    {
      key: "text",
      label: "Note",
      type: "string",
      multiline: true,
      placeholder: "Add a note...",
    },
  ],

  runtimeKind: NodeRuntimeKind.Virtual,
  tags: ["annotation"],
  isAvailable: true,
};

export const utilityNodes: NodeDefinition[] = [
  resizeNode,
  cropNode,
  formatConvertNode,
  compositingNode,
  promptTemplateNode,
  commentNode,
];
