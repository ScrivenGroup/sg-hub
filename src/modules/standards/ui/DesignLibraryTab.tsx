import type { StandardsChoices } from "../schema";
import { DesignSuite } from "./DesignSuite";

export function DesignLibraryTab({ choices }: { choices: StandardsChoices }) {
  return <DesignSuite choices={choices} />;
}
