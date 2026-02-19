export enum PortType {
  Image = "image",
  Video = "video",
  Text = "text",
  Number = "number",
  Json = "json",
}

/** Matrix: PORT_COMPATIBILITY[source][target] = true means connection allowed */
export const PORT_COMPATIBILITY: Record<string, Record<string, boolean>> = {
  image: { image: true },
  video: { video: true },
  text: { text: true },
  number: { number: true },
  json: { json: true, text: true },
};
