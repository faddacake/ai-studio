import type { NodeDefinition } from "../nodeDefinition.js";
import { NodeCategory, NodeRuntimeKind } from "../nodeDefinition.js";
import { PortType } from "../portTypes.js";
import { NodeType } from "../nodeTypes.js";

export const imageInputNode: NodeDefinition = {
  type: NodeType.ImageInput,
  label: "Image Input",
  category: NodeCategory.Input,
  description: "Upload or reference an input image for the workflow.",
  icon: "image-up",

  inputs: [],
  outputs: [
    {
      id: "image_out",
      label: "Image",
      type: PortType.Image,
      description: "The uploaded image",
    },
  ],

  parameterSchema: [
    {
      key: "source",
      label: "Image Source",
      type: "image",
      required: true,
      description: "Upload an image or provide a URL",
    },
  ],

  runtimeKind: NodeRuntimeKind.Local,
  tags: ["input", "image"],
  isAvailable: true,
};

export const outputNode: NodeDefinition = {
  type: NodeType.Output,
  label: "Output",
  category: NodeCategory.Output,
  description: "Display and collect workflow output. Leaf nodes without an explicit output node serve as implicit outputs.",
  icon: "monitor",

  inputs: [
    {
      id: "input",
      label: "Input",
      type: PortType.Image,
      description: "Any data to display as output",
    },
  ],
  outputs: [],

  parameterSchema: [
    {
      key: "label",
      label: "Output Label",
      type: "string",
      description: "Name for this output in the results panel",
      placeholder: "Output",
    },
  ],

  runtimeKind: NodeRuntimeKind.Virtual,
  tags: ["output"],
  isAvailable: true,
};

export const ioNodes: NodeDefinition[] = [imageInputNode, outputNode];
