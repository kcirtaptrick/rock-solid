import { types } from "@babel/core";

namespace UTypeAnnotation {
  export function identifier(
    typeAnnotation: types.Identifier["typeAnnotation"]
  ) {
    if (typeAnnotation?.type !== "TSTypeAnnotation") return;
    if (typeAnnotation.typeAnnotation.type !== "TSTypeReference") return;

    const { typeName } = typeAnnotation.typeAnnotation;
    if (typeName.type !== "Identifier") return;

    return typeName;
  }
}

export default UTypeAnnotation;
