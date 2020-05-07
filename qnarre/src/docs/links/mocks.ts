import { Package } from "../../";

export function mockPackage() {
  return new Package("mockPackage", [require("../")])
    .addFactory("log", () => {
      return require("dgeni/lib/mocks/log")(false);
    })
    .addFactory("templateEngine", () => {
      /* */
    });
}
