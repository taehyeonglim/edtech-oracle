import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * 로컬 프리뷰 서버.
 *
 * `file://`로 열면 `search-index.json` fetch가 CORS로 막혀 검색이 죽는다. 그렇다고
 * `serve`·`http-server`를 devDependency로 들이면 이 저장소가 지켜 온 "의존성은 빌드
 * 타임 최소" 원칙이 흐려진다. `node:http`로 40줄이면 충분하다.
 */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

export function serve({ root = "dist", port = 4173 } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      // `..` 탈출을 막는다.
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      let file = join(root, rel);

      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) {
        file = join(file, "index.html");
        info = await stat(file).catch(() => null);
      }
      if (!info) {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>404</h1><p>없는 경로다.</p>");
        return;
      }

      res.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(err));
    }
  });
  server.listen(port, () => {
    console.log(`http://localhost:${port}/  (${root}/ 를 서빙 중, Ctrl+C로 종료)`);
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , root = "dist", port = "4173"] = process.argv;
  serve({ root, port: Number(port) });
}
