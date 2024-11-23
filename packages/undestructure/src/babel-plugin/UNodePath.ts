import { NodePath, traverse, types } from "@babel/core";
import UProgram from "./UProgram";

namespace UNodePath {
  export const findProgram = (nodePath: NodePath) =>
    nodePath.findParent((path) => path.isProgram()) as NodePath<types.Program>;
}

export default UNodePath;
