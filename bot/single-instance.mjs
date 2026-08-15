/**
 * 봇이 한 대만 뜨게 한다.
 *
 * 같은 토큰으로 게이트웨이 연결이 둘이면 디스코드는 **양쪽 모두**에 인터랙션을 배달한다.
 * `interaction.reply()`는 하나만 성공하고, 진 쪽은 `Unknown interaction`으로 던진다.
 * 그 예외가 `index.mjs`의 최상위 catch에 잡혀 채널에 "봇에서 오류가 났다"로 나간다 —
 * 실행 자체는 이긴 쪽이 정상으로 끝내므로 **오류 메시지만 뜨고 결과는 멀쩡한** 증상이 된다.
 * 2026-08-16 `/debate` 실전 검증에서 실제로 이렇게 나타났다.
 *
 * `busy` 락은 이 상황을 막지 못한다. 메모리 락이 지키는 범위는 프로세스 하나뿐이다.
 *
 * **자리를 파일이 아니라 포트로 잡는 이유**는 `index.mjs`가 파일 락을 거부한 이유와 같다 —
 * 포트는 프로세스가 죽으면 OS가 회수한다. PID 파일은 봇이 죽은 뒤에도 남아서 다음 기동을
 * 거절할 수 있고, 그걸 막으려면 생존 확인이라는 또 하나의 틀릴 거리를 들여야 한다.
 */
import { createServer } from "node:net";

/** 기본 자리. `config.guardPort`로 바꾼다. 루프백 전용이라 외부에 열리지 않는다. */
export const DEFAULT_GUARD_PORT = 47821;

/**
 * 자리를 잡아 본다.
 *
 * @param {number} port  잡을 포트. 0이면 OS가 빈 자리를 고른다(테스트용)
 * @returns {Promise<import("node:net").Server|null>}  잡았으면 서버, 이미 차 있으면 `null`.
 *   **거부하지 않는다** — 호출부가 `try`를 잊어도 기동이 조용히 실패하지 않아야 한다.
 */
export function claimSingleInstance(port = DEFAULT_GUARD_PORT) {
  return new Promise((resolve) => {
    const server = createServer();
    // `once`여야 한다. 잡은 뒤 살면서 나는 오류로 null을 다시 흘리면 안 된다.
    server.once("error", () => resolve(null));
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
