#!/usr/bin/env node

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

function ok(msg) {
  console.log("✅ " + msg);
}

const [major] = process.versions.node.split(".").map(Number);

if (!major) {
  fail("Node.js nie jest zainstalowany.");
}

if (major < 20) {
  fail(
    `Wykryto Node.js v${process.versions.node}. Wymagana wersja: 20.x (LTS).`
  );
}

ok(`Node.js v${process.versions.node}`);

try {
  require("npm/package.json");
  ok("npm dostępne");
} catch {
  ok("npm dostępne (w PATH)");
}

console.log("🎉 Środowisko spełnia wymagania.");
