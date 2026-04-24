import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { processBfhl } from "../src/bfhl.js";

process.env.USER_ID = "testuser_01012000";
process.env.EMAIL_ID = "test@srmist.edu.in";
process.env.COLLEGE_ROLL_NUMBER = "RA0000000000000";
const { app } = await import("../src/app.js");

test("processBfhl handles sample with trees cycle duplicates and invalid entries", () => {
  const response = processBfhl([
    "A->B",
    "A->C",
    "B->D",
    "C->E",
    "E->F",
    "X->Y",
    "Y->Z",
    "Z->X",
    "P->Q",
    "Q->R",
    "G->H",
    "G->H",
    "G->I",
    "hello",
    "1->2",
    "A->"
  ]);
  assert.deepEqual(response.invalid_entries, ["hello", "1->2", "A->"]);
  assert.deepEqual(response.duplicate_edges, ["G->H"]);
  assert.equal(response.summary.total_trees, 3);
  assert.equal(response.summary.total_cycles, 1);
  assert.equal(response.summary.largest_tree_root, "A");
});

test("processBfhl discards later multi-parent edges", () => {
  const response = processBfhl(["A->D", "B->D", "D->E"]);
  assert.equal(response.summary.total_trees, 1);
  assert.equal(response.hierarchies[0].root, "A");
  assert.deepEqual(response.hierarchies[0].tree, {
    A: {
      D: {
        E: {}
      }
    }
  });
});

test("processBfhl marks self-loop as invalid", () => {
  const response = processBfhl(["A->A"]);
  assert.deepEqual(response.invalid_entries, ["A->A"]);
  assert.equal(response.summary.total_trees, 0);
});

test("POST /bfhl returns valid response contract", async () => {
  const res = await request(app).post("/bfhl").send({
    data: ["A->B", "B->C", "A->B", "bad"]
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.user_id, "testuser_01012000");
  assert.deepEqual(res.body.duplicate_edges, ["A->B"]);
  assert.deepEqual(res.body.invalid_entries, ["bad"]);
  assert.equal(res.body.summary.total_trees, 1);
});

test("POST /bfhl rejects invalid payload shape", async () => {
  const res = await request(app).post("/bfhl").send({
    data: [1, 2, 3]
  });
  assert.equal(res.status, 400);
});
