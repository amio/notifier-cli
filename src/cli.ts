#!/usr/bin/env node

import { main } from "./main.ts";

const code = await main(process.argv.slice(2));
process.exitCode = code;
