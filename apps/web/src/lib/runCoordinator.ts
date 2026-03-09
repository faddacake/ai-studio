import { RunCoordinator } from "@aistudio/engine";

let coordinator: RunCoordinator | undefined;

/** Get the singleton RunCoordinator instance (server-side only). */
export function getRunCoordinator(): RunCoordinator {
  if (!coordinator) {
    coordinator = new RunCoordinator();
  }
  return coordinator;
}
