import { Sandbox } from "@vercel/sandbox";

type ExecuteCodeInput = {
  files: { path: string; content: string }[];
  commands: string[];
  repo?: string;
  branch?: string;
};

export async function executeCode(input: ExecuteCodeInput) {
  let sandbox: Sandbox | undefined;

  try {
    // Create sandbox with git available
    if (input.repo) {
      sandbox = await Sandbox.create({
        runtime: "node24",
        source: {
          type: "git",
          url: `https://github.com/${input.repo}.git`,
          depth: 1,
        },
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
        },
      });
    } else {
      sandbox = await Sandbox.create({
        runtime: "node24",
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
        },
      });
    }

    // Install gh CLI for PR operations
    await sandbox.runCommand({
      cmd: "sudo",
      args: [
        "dnf",
        "install",
        "-y",
        "https://github.com/cli/cli/releases/download/v2.65.0/gh_2.65.0_linux_amd64.rpm",
      ],
      sudo: true,
    });

    // Write files
    if (input.files.length > 0) {
      await sandbox.writeFiles(
        input.files.map((f) => ({
          path: f.path,
          content: Buffer.from(f.content),
        })),
      );
    }

    // Run commands and collect output
    const outputs: { command: string; stdout: string; stderr: string; exitCode: number }[] = [];

    for (const cmd of input.commands) {
      const parts = cmd.split(" ");
      const result = await sandbox.runCommand(parts[0], parts.slice(1));
      const stdout = await result.stdout();
      const stderr = await result.stderr();
      outputs.push({
        command: cmd,
        stdout: stdout.slice(0, 3000),
        stderr: stderr.slice(0, 1000),
        exitCode: result.exitCode,
      });

      // Stop on failure
      if (result.exitCode !== 0) {
        break;
      }
    }

    // If branch specified, push changes
    let pushResult;
    if (input.branch && input.repo) {
      const gitCommands = [
        ["git", ["config", "user.email", "rocky@bot.dev"]],
        ["git", ["config", "user.name", "Rocky"]],
        ["git", ["checkout", "-b", input.branch]],
        ["git", ["add", "-A"]],
        ["git", ["commit", "-m", `feat: ${input.branch}`]],
        [
          "gh",
          [
            "auth",
            "login",
            "--with-token",
          ],
        ],
      ] as const;

      for (const [cmd, args] of gitCommands) {
        await sandbox.runCommand(cmd, [...args]);
      }

      // Push using gh
      const push = await sandbox.runCommand("git", [
        "push",
        "origin",
        input.branch,
      ]);
      pushResult = {
        exitCode: push.exitCode,
        output: await push.stdout(),
      };
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
