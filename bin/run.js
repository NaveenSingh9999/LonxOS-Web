export default async function main(args, lonx) {
  const filename = args[0];

  if (!filename || !filename.endsWith(".rn")) {
    lonx.shell.print("Usage: run <file>.rn");
    return;
  }

  const path = lonx.shell.resolvePath(filename);
  const code = lonx.fs.read(path);

  if (typeof code !== "string") {
    lonx.shell.print("File not found: " + path);
    return;
  }

  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(url);
    if (typeof module.default === "function") {
      await module.default(args.slice(1), lonx);
    } else {
      lonx.shell.print("Invalid .rn file: no default function.");
    }
  } catch (e) {
    lonx.shell.print("Error: " + e.message);
  } finally {
    URL.revokeObjectURL(url);
  }
}
