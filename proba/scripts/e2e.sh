#!/usr/bin/env bash

# sed -i.bak $'s/\r//' xxx.ts

export CODE_TESTS_PATH="$(pwd)/client/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/client/test/fixture"

node "$(pwd)/client/out/test/runTest"