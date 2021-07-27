with (import <nixpkgs> {});
rec {
  muellshack = mkYarnPackage {
    name = "reader2mail";
    src = ./.; # builtins.filterSource (p: t: builtins.match ".*?\.js" p != null)
    packageJSON = ./package.json;
    yarnLock = ./yarn.lock;
    yarnNix = ./yarn.nix;
  };
}
