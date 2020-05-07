import { Package } from "../../";

export function mockPackage() {
  return new Package("mockPackage", [require("../")]).addFactory("log", () => {
    return require("dgeni/lib/mocks/log")(false);
  });
}

const somePackage = new Package("somePackage");

export const testPackage = new Package("testPackage", [
  require("./testPackage2"),
  somePackage
])
  .addProcessor(require("./testProcessor"))
  .addProcessor({ name: "pseudo", $runAfter: ["testProcessor"] });

export const testPackage2 = new Package("testPackage2", []);

export function testProcessor() {
  return {
    $runAfter: ["a", "b"],
    $runBefore: ["c", "d"],
    $validate: {
      requiredProp: { presence: true }
    },
    $process: docs => {
      /* */
    }
  };
}
