import test from "node:test";
import assert from "node:assert/strict";
import { claimSingleInstance } from "./single-instance.mjs";

/** 포트 0은 OS가 빈 자리를 골라 준다. 고정 번호를 쓰면 테스트끼리 부딪힌다. */
const claimAny = () => claimSingleInstance(0);

test("첫 인스턴스는 자리를 잡는다", async () => {
  const held = await claimAny();
  assert.ok(held, "빈 자리는 잡혀야 한다");
  await new Promise((r) => held.close(r));
});

test("둘째 인스턴스는 거절된다 — 2026-08-16에 실제로 봇이 둘 떠 있었다", async () => {
  const first = await claimAny();
  const { port } = first.address();

  const second = await claimSingleInstance(port);
  assert.equal(second, null, "이미 잡힌 자리는 null로 돌려준다");

  await new Promise((r) => first.close(r));
});

test("앞 인스턴스가 사라지면 자리도 사라진다 — 유령 락이 남지 않는다", async () => {
  // 포트를 고른 이유가 이것이다. PID 파일이었다면 봇이 죽은 뒤 파일이 남아
  // 다음 기동을 영원히 거절한다 — `index.mjs`가 메모리 락을 고른 것과 같은 논리다.
  const first = await claimAny();
  const { port } = first.address();
  await new Promise((r) => first.close(r));

  const second = await claimSingleInstance(port);
  assert.ok(second, "앞이 죽었으면 다시 잡을 수 있어야 한다");
  await new Promise((r) => second.close(r));
});

test("루프백에만 연다 — 가드가 외부에 열린 포트가 되지 않는다", async () => {
  const held = await claimAny();
  assert.equal(held.address().address, "127.0.0.1");
  await new Promise((r) => held.close(r));
});
