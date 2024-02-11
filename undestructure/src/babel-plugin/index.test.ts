import { test, expect, describe } from "vitest";
import { transformAsync } from "@babel/core";
import babelPluginUndestructure from ".";
import prettier from "prettier";

const tsTransform: typeof transformAsync = (code, opts) =>
  transformAsync(code, {
    plugins: ["@babel/plugin-syntax-typescript", babelPluginUndestructure()],
    ...opts,
  });

const format = (code: string) =>
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
      await format(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component(props: D<{a: string, b: string}>) {
            props.a;
            props.b;
          }
        `))!.code!
      )
    ).toEqual(
      await format(/*javascript*/ `
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
      await format(
        (await tsTransform(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          
          export default function Component({ a }: D<{a: string}>) {
            a;
          }
        `))!.code!
      )
    ).toEqual(
      await format(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string}>) {
          _props.a;
        }
      `)
    );
  });
  test("Multiple props", async () => {
    expect(
      await format(
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
      await format(/*javascript*/ `
        import { D } from "@rock-solid/undestructure";
        
        export default function Component(_props: D<{a: string, b: string, c: string}>) {
          _props.a;
          _props.b;
          _props.c;
        }
      `)
    );
  });
  describe("Prop defaults", () => {
    test("Insert _mergeProps", async () => {
      expect(
        await format(
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
        await format(/*javascript*/ `
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
        await format(
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
        await format(/*javascript*/ `
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
        await format(
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
        await format(/*javascript*/ `
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
  });
  describe("Rest param", () => {
    test("Insert _splitProps", async () => {
      expect(
        await format(
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
        await format(/*javascript*/ `
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
        await format(
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
        await format(/*javascript*/ `
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
        await format(
          (await tsTransform(/*javascript*/ `
            import { D } from "@rock-solid/undestructure";
            import { splitProps as renamedSplitProps } from "solid-js";
            
            export default function Component({ a, b, ...c }: D<{a: string, b: string, c: string}>) {
              a;
              b;
              c;
            }
          `))!.code!
        )
      ).toEqual(
        await format(/*javascript*/ `
          import { D } from "@rock-solid/undestructure";
          import { splitProps as renamedSplitProps } from "solid-js";
          
          export default function Component(
            _props: D<{ a: string; b: string; c: string }>,
          ) {
            let c;
            [_props, c] = renamedSplitProps(_props, ["a", "b"]);
            _props.a;
            _props.b;
            c;
          }
        `)
      );
    });
  });
  test("Prop renames", async () => {
    expect(
      await format(
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
      await format(/*javascript*/ `
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
      await format(
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
      await format(/*javascript*/ `
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
      await format(
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
      await format(
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
      await format(/*javascript*/ `
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
      await format(
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
      await format(/*javascript*/ `
        import { splitProps as _splitProps2 } from "solid-js";
        import { mergeProps as _mergeProps2 } from "solid-js";
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
          [_props2, h] = _splitProps2(_props2, ["a", "d-e"]);
          _props2 = _mergeProps2({ a: "c" }, _props2);
          _props2.a;
          _props2["d-e"];
          h;
        }
      `)
    );
  });
});
