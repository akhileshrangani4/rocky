import { Sandbox } from "@vercel/sandbox";

type ExecuteCodeInput = {
  files: { path: string; content: string }[];
  commands: string[];
  repo?: string;
  branch?: string;
};

export async function executeCode(input: ExecuteCodeInput) {
  let sandbox: Sandbox | undefined;
  const githubToken = process.env.GITHUB_TOKEN || "";

  try {
    if (input.repo) {
      // Clone via HTTPS with token for auth
      sandbox = await Sandbox.create({
        runtime: "node24",
        env: {
          GITHUB_TOKEN: githubToken,
          GH_TOKEN: githubToken,
        },
      });

      // Clone the repo with token in URL for auth
      const cloneUrl = githubToken
        ? `https://x-access-token:${githubToken}@github.com/${input.repo}.git`
        : `https://github.com/${input.repo}.git`;

      const clone = await sandbox.runCommand("git", [
        "clone",
        "--depth",
        "1",
        cloneUrl,
        "/home/user/repo",
      ]);
      if (clone.exitCode !== 0) {
        return {
          success: false,
          error: `Failed to clone repo: ${await clone.stderr()}`,
        };
      }

      // Set working directory for subsequent commands
      await sandbox.runCommand("bash", ["-c", "cd /home/user/repo"]);
    } else {
      sandbox = await Sandbox.create({
        runtime: "node24",
        env: {
          GITHUB_TOKEN: githubToken,
          GH_TOKEN: githubToken,
        },
      });
    }

    const workDir = input.repo ? "/home/user/repo" : "/home/user";

    // Write files
    if (input.files.length > 0) {
      await sandbox.writeFiles(
        input.files.map((f) => ({
          path: f.path.startsWith("/") ? f.path : `${workDir}/${f.path}`,
          content: Buffer.from(f.content),
        })),
      );
    }

    // Run commands and collect output
    const outputs: {
      command: string;
      stdout: string;
      stderr: string;
      exitCode: number;
    }[] = [];

    for (const cmd of input.commands) {
      // Run each command in the work directory
      const result = await sandbox.runCommand("bash", [
        "-c",
        `cd ${workDir} && ${cmd}`,
      ]);
      const stdout = await result.stdout();
      const stderr = await result.stderr();
      outputs.push({
        command: cmd,
        stdout: stdout.slice(0, 3000),
        stderr: stderr.slice(0, 1000),
        exitCode: result.exitCode,
      });

      if (result.exitCode !== 0) {
        break;
      }
    }

    // If branch specified, commit and push changes
    let pushResult;
    if (input.branch && input.repo) {
      const pushUrl = `https://x-access-token:${githubToken}@github.com/${input.repo}.git`;

      const gitCommands = [
        `git config user.email "rocky@rockyy.app"`,
        `git config user.name "Rocky"`,
        `git checkout -b ${input.branch}`,
        `git add -A`,
        `git commit -m "feat: ${input.branch}"`,
        `git push ${pushUrl} ${input.branch}`,
      ];

      for (const cmd of gitCommands) {
        const result = await sandbox.runCommand("bash", [
          "-c",
          `cd ${workDir} && ${cmd}`,
        ]);
        const exitCode = result.exitCode;
        if (exitCode !== 0) {
          const stderr = await result.stderr();
          pushResult = { exitCode, error: stderr.slice(0, 500) };
          break;
        }
        pushResult = { exitCode: 0, output: "Pushed successfully" };
      }
    }

    return {
      success: true,
      outputs,
      pushResult,
      sandboxId: sandbox.sandboxId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Sandbox execution failed",
    };
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
