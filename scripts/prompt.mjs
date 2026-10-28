// Pitanja u terminalu; lozinka se čita znak po znak i ne ispisuje se (radi u svakom terminalu).
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export async function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

export function askHidden(question) {
  if (!stdin.isTTY) return ask(question);

  return new Promise((resolve) => {
    let value = "";
    // Isključi ispis znakova prije nego se pokaže pitanje.
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdout.write(question);
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        value += ch;
        stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}
