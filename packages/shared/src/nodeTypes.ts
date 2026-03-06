export enum NodeType {
  // Generation
  ImageGeneration = "image-generation",
  VideoGeneration = "video-generation",

  // I/O
  ImageInput = "image-input",
  Output = "output",

  // Transform / Utility
  Resize = "resize",
  Crop = "crop",
  FormatConvert = "format-convert",
  Compositing = "compositing",
  PromptTemplate = "prompt-template",

  // Capabilities
  ClipScoring = "clip-scoring",
  SocialFormat = "social-format",
  ExportBundle = "export-bundle",
  Ranking = "ranking",

  // Annotation
  Comment = "comment",
}
