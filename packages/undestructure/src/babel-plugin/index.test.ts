import { test, expect, describe } from "vitest";
import { TransformOptions, transformAsync } from "@babel/core";
import babelPluginUndestructure from ".";
import prettier from "prettier";
import { parse } from "@babel/parser";
import { inspect } from "util";

const tsTransform = (
  code: string,
  {
    babel = {} as TransformOptions,
    undestructure = {} as babelPluginUndestructure.Options,
  } = {}
) =>
  transformAsync(code, {
    plugins: [
      "@babel/plugin-syntax-typescript",
      babelPluginUndestructure(undestructure),
    ],
    ...babel,
  });

const normalize = (code: string) =>
  prettier.format(
    // Attempt deterministic output
    code.replace(/\s+/g, " "),
    {
      parser: "typescript",
      pure: true,
    }
  );

describe("@rock-solid/undestructure", () => {
  test("No transform", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component(props: D<{a: string, b: string}>) {
            props.a;
            props.b;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(props: D<{a: string, b: string}>) {
          props.a;
          props.b;
        }
      `)
    );
  });
  test("Single prop", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a }: D<{a: string}>) {
            a;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string}>) {
          _props.a;
        }
      `)
    );
  });

  test("Multiple props", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a, b, c }: D<{a: string, b: string, c: string}>) {
            a;
            b;
            c;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string, b: string, c: string}>) {
          _props.a;
          _props.b;
          _props.c;
        }
      `)
    );
  });

  test("With nested generic", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a, children }: D<FlowProps<{a: string}>>) {
            a;
            children;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<FlowProps<{a: string}>>) {
          _props.a;
          _props.children;
        }
      `)
    );
  });

  test("Prop used in shorthand", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a }: D<{a: string}>) {
            const b = { a };
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string}>) {
          const b = { a: _props.a };
        }
      `)
    );
  });

  describe("Prop defaults", () => {
    test("Insert _mergeProps", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            export default function Component({ a = "a", b = "b", c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { mergeProps as _mergeProps } from "solid-js";
          import { D } from "@rock-solid/undestructure";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            _props = _mergeProps({ a: "a", b: "b" }, _props);
            _props.a;
            _props.b;
            _props.c;
          }
        `)
      );
    });
    test("Use existing mergeProps import", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            import { mergeProps } from "solid-js";
            
            export default function Component({ a = "a", b = "b", c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          import { mergeProps } from "solid-js";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            _props = mergeProps({ a: "a", b: "b" }, _props);
            _props.a;
            _props.b;
            _props.c;
          }
        `)
      );
    });
    test("Use existing renamed mergeProps import", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            import { mergeProps as renamedMergeProps } from "solid-js";
            
            export default function Component({ a = "a", b = "b", c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          import { mergeProps as renamedMergeProps } from "solid-js";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            _props = renamedMergeProps({ a: "a", b: "b" }, _props);
            _props.a;
            _props.b;
            _props.c;
          }
        `)
      );
    });
    test("Derived default prop", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            export default function Component({ a = "a", b = a }: D<{a: string, b: string}>) {
              a;
              b;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { mergeProps as _mergeProps } from "solid-js";
          import { D } from "@rock-solid/undestructure";
          
          export default function Component(
            _props: D<{ a: string; b: string; }>,
          ) {
            _props = _mergeProps(
              {
                a: "a",
                get b() {
                  return a;
                },
              },
              _props,
            );
            _props.a;
            _props.b;
          }
        `)
      );
    });
  });
  describe("Rest param", () => {
    test("Insert _splitProps", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            export default function Component({ a, b, ...c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { splitProps as _splitProps } from "solid-js";
          import { D } from "@rock-solid/undestructure";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            let c;
            [_props, c] = _splitProps(_props, ["a", "b"]);
            _props.a;
            _props.b;
            c;
          }
        `)
      );
    });
    test("Use existing splitProps import", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            import { splitProps } from "solid-js";
            
            export default function Component({ a, b, ...c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          import { splitProps } from "solid-js";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            let c;
            [_props, c] = splitProps(_props, ["a", "b"]);
            _props.a;
            _props.b;
            c;
          }
        `)
      );
    });
    test("Use existing renamed splitProps import", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            import { splitProps as renamedSplitProps } from "solid-js";
            
            export default function Component({ a, b, ...props }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              props;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          import { splitProps as renamedSplitProps } from "solid-js";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            let props;
            [_props, props] = renamedSplitProps(_props, ["a", "b"]);
            _props.a;
            _props.b;
            props;
          }
        `)
      );
    });
  });
  test("Prop renames", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a: d, b: e, c: f }: D<{a: string, b: string, c: string}>) {
            d;
            e;
            f;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string, b: string, c: string}>) {
          _props.a;
          _props.b;
          _props.c;
        }
      `)
    );
  });
  test("String keys", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ ["a"]: a, ["b-b"]: b, ["c.c"]: c }: D<{a: string, "b-b": string, "c.c": string}>) {
            a;
            b;
            c;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string, "b-b": string, "c.c": string}>) {
          _props["a"];
          _props["b-b"];
          _props["c.c"];
        }
      `)
    );
  });
  test("Dynamic key throws", async () => {
    expect(async () => {
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ ["a" + "b"]: a }: D<{ab: string}>) {
            a;
          }
        `))!.code!
      );
    }).rejects.toThrow();
  });
  test("All at once", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a: b = "c", ["d-e"]: f, ...h }: D) {
            b;
            f;
            h;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { splitProps as _splitProps } from "solid-js";
        import { mergeProps as _mergeProps } from "solid-js";
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D) {
          let h;
          [_props, h] = _splitProps(_props, ["a", "d-e"]);
          _props = _mergeProps({ a: "c" }, _props);
          _props.a;
          _props["d-e"];
          h;
        }
      `)
    );
  });
  test("Multiple components", async () => {
    expect(
      await normalize(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          function Component({ a: b = "c", ["d-e"]: f, ...h }: D) {
            b;
            f;
            h;
          }
          function Component2({ a: b = "c", ["d-e"]: f, ...h }: D) {
            b;
            f;
            h;
          }
        `))!.code!
      )
    ).toEqual(
      await normalize(/*javascript*/ `
        import { splitProps as _splitProps } from "solid-js";
        import { mergeProps as _mergeProps } from "solid-js";
        import { D } from "@rock-solid/undestructure";

        function Component(_props: D) {
          let h;
          [_props, h] = _splitProps(_props, ["a", "d-e"]);
          _props = _mergeProps({ a: "c" }, _props);
          _props.a;
          _props["d-e"];
          h;
        }
        function Component2(_props2: D) {
          let h;
          [_props2, h] = _splitProps(_props2, ["a", "d-e"]);
          _props2 = _mergeProps({ a: "c" }, _props2);
          _props2.a;
          _props2["d-e"];
          h;
        }
      `)
    );
  });

  describe("Global type marker", () => {
    test("With global option", async () => {
      expect(
        await normalize(
          (await tsTransform(
            /*javascript*/ `
              export default function Component({ a }: D<{a: string}>) {
                a;
              }
            `,
            { undestructure: { typeMarker: { name: "D", from: "<global>" } } }
          ))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          export default function Component(_props: D<{a: string}>) {
            _props.a;
          }
        `)
      );
    });

    test("With global option, without marker", async () => {
      expect(
        await normalize(
          (await tsTransform(
            /*javascript*/ `
              type ComponentProps = {a: string};
              export default function Component({ a }: ComponentProps) {
                a;
              }
            `,
            { undestructure: { typeMarker: { name: "D", from: "<global>" } } }
          ))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          type ComponentProps = {a: string};
          export default function Component({ a }: ComponentProps) {
            a;
          }
        `)
      );
    });

    test("Without global option", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            export default function Component({ a }: D<{a: string}>) {
              a;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          export default function Component({ a }: D<{a: string}>) {
            a;
          }
        `)
      );
    });

    test("With global option, from import", async () => {
      expect(
        await normalize(
          (await tsTransform(
            /*javascript*/ `
              import { D } from "@rock-solid/undestructure";

              export default function Component({ a }: D<{a: string}>) {
                a;
              }
            `,
            { undestructure: { typeMarker: { name: "D", from: "<global>" } } }
          ))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";

          export default function Component({ a }: D<{a: string}>) {
            a;
          }
        `)
      );
    });
  });

  describe("Variable destructuring", () => {
    test("Basic", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            interface ComponentProps {
              a: string;
              b: string;
            }

            export default function Component(props: ComponentProps) {
              const { a, b } = props satisfies D;
              a;
              b;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          interface ComponentProps {
            a: string;
            b: string;
          }

          export default function Component(props: ComponentProps) {
            let _props = props satisfies D;
            _props.a;
            _props.b;
          }
        `)
      );
    });
    test("With statement insertion", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            interface ComponentProps {
              a: string;
              b: string;
            }

            export default function Component(props: ComponentProps) {
              const { a: aa = "a", b, ...rest } = props satisfies D;
              aa;
              b;
              rest;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { splitProps as _splitProps } from "solid-js";
          import { mergeProps as _mergeProps } from "solid-js";
          import { D } from "@rock-solid/undestructure";
          
          interface ComponentProps {
            a: string;
            b: string;
          }

          export default function Component(props: ComponentProps) {
            let _props = props satisfies D;
            let rest;
            [_props, rest] = _splitProps(_props, ["a", "b"]);
            _props = _mergeProps({ a: "a" }, _props);
            _props.a;
            _props.b;
            rest;
          }
        `)
      );
    });
    test("With props destructure", async () => {
      expect(
        await normalize(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            
            interface ComponentProps {
              a: string;
              b: string;
              c: string;
              d: string;
              e: string;
            }

            export default function Component({ a, b, ...props }: D<ComponentProps>) {
              const { c, d, ..._props } = props satisfies D;
              a;
              b;
              c;
              d;
              props;
              _props;
            }
          `))!.code!
        )
      ).toEqual(
        await normalize(/*javascript*/ `
          import { splitProps as _splitProps } from "solid-js";
          import { D } from "@rock-solid/undestructure";

          interface ComponentProps {
            a: string;
            b: string;
            c: string;
            d: string;
            e: string;
          }

          export default function Component(_props2: D<ComponentProps>) {
            let props;
            [_props2, props] = _splitProps(_props2, ["a", "b"]);
            let _props3 = props satisfies D;
            let _props;
            [_props3, _props] = _splitProps(_props3, ["c", "d"]);
            _props2.a;
            _props2.b;
            _props3.c;
            _props3.d;
            props;
            _props;
          }
        `)
      );
    });
  });
});
