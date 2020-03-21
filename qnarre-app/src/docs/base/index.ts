import { Package } from "../package";
import {
  checkAnchorLinksProc,
  computeIdsProc,
  computePathsProc,
  debugDumpProc,
  readFilesProc,
  renderDocsProc,
  unescapeCommentsProc,
  writeFilesProc
} from "./processors";
import {
  aliasMap,
  createDocMessage,
  encodeCodeBlock,
  extractLinks,
  resolveUrl,
  templateFinder,
  trimIndentation,
  writeFile
} from "./services";

export default new Package("base")
  .addProcessor({ name: "reading-files" })
  .addProcessor({ name: "files-read", $runAfter: ["reading-files"] })
  .addProcessor({ name: "processing-docs", $runAfter: ["files-read"] })
  .addProcessor({ name: "docs-processed", $runAfter: ["processing-docs"] })
  .addProcessor({ name: "adding-extra-docs", $runAfter: ["docs-processed"] })
  .addProcessor({ name: "extra-docs-added", $runAfter: ["adding-extra-docs"] })
  .addProcessor({ name: "computing-ids", $runAfter: ["extra-docs-added"] })
  .addProcessor({ name: "ids-computed", $runAfter: ["computing-ids"] })
  .addProcessor({ name: "computing-paths", $runAfter: ["ids-computed"] })
  .addProcessor({ name: "paths-computed", $runAfter: ["computing-paths"] })
  .addProcessor({ name: "rendering-docs", $runAfter: ["paths-computed"] })
  .addProcessor({ name: "docs-rendered", $runAfter: ["rendering-docs"] })
  .addProcessor({ name: "writing-files", $runAfter: ["docs-rendered"] })
  .addProcessor({ name: "files-written", $runAfter: ["writing-files"] })

  .addProcessor(readFilesProc)
  .addProcessor(renderDocsProc)
  .addProcessor(unescapeCommentsProc)
  .addProcessor(writeFilesProc)
  .addProcessor(debugDumpProc)
  .addProcessor(computeIdsProc)
  .addProcessor(computePathsProc)
  .addProcessor(checkAnchorLinksProc)

  .addFactory(resolveUrl)
  .addFactory(extractLinks)
  .addFactory(templateFinder)
  .addFactory(encodeCodeBlock)
  .addFactory(trimIndentation)
  .addFactory(aliasMap)
  .addFactory(createDocMessage)
  .addFactory(writeFile);
