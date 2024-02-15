import { types } from "@babel/core";

namespace UTSType {
  export function identifier(tsType: types.TSType) {
    if (tsType.type !== "TSTypeReference") return;

    const { typeName } = tsType;
    if (typeName.type !== "Identifier") return;

    return typeName;
  }
}

export default UTSType;
