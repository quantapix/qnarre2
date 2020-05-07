import path from "path";
import { Package } from "../package";
import {
  decorateVersion,
  getPreviousVersions,
  gitData,
  gitRepoInfo,
  packageInfo,
  versionInfo
} from "./services";

export default new Package("git", ["base"])
  .addFactory(decorateVersion)
  .addFactory(getPreviousVersions)
  .addFactory(gitData)
  .addFactory(gitRepoInfo)
  .addFactory(packageInfo)
  .addFactory(versionInfo)
  .addConfig((renderDocsProcessor, gitData) => {
    renderDocsProcessor.extraData.git = gitData;
  })
  .addConfig(templateFinder => {
    templateFinder.templateFolders.unshift(
      path.resolve(__dirname, "templates")
    );
  });
