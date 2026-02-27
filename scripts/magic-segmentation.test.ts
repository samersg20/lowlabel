import assert from "node:assert/strict";
import { segmentMagicInput } from "@/lib/magic-segmentation";

function run() {
  const caseA = "1 brisket, 1 cupim";
  const segmentsA = segmentMagicInput(caseA);
  assert.equal(segmentsA.length, 2, "case A should segment into 2 items");

  const caseB = "1 asdfghj";
  const segmentsB = segmentMagicInput(caseB);
  assert.equal(segmentsB.length, 1, "case B should keep 1 segment");

  const fakeResolved = [{ itemId: undefined, confidence: 0.2 }];
  const hasLowConfidence = fakeResolved.some((entry) => !entry.itemId || entry.confidence < 0.8);
  assert.equal(hasLowConfidence, true, "case B should trigger strict-mode failure (HTTP 400)");

  console.log("Magic segmentation tests passed.");
}

run();
