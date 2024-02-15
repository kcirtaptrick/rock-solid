import { types } from "@babel/core";
import UTSType from "./UTSType";

namespace UTypeAnnotation {
  export function identifier(
    typeAnnotation: types.Identifier["typeAnnotation"]
  ) {
    if (typeAnnotation?.type !== "TSTypeAnnotation") return;

    return UTSType.identifier(typeAnnotation.typeAnnotation);
  }
}

export default UTypeAnnotation;
