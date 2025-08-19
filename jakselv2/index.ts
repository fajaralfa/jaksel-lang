import fs from "node:fs";
import { argv, exit } from "node:process";
import readline from "node:readline";
import process from "node:process";
import { Jaksel } from "./jaksel";
import { ConsoleErrorReporter } from "./error";

function main() {
    const errorReporter = new ConsoleErrorReporter();
    const jaksel = new Jaksel(errorReporter);
    if (argv.length > 3) {
        console.log("Usage: node jaksel.js [script]");
        exit(64);
    } else if (argv.length === 3) {
        runFile(jaksel, argv[2]!);
    } else {
        runPrompt(jaksel);
    }
}

function runFile(jaksel: Jaksel, path: string) {
    try {
        const code = fs.readFileSync(path, "utf-8");
        jaksel.run(code);
        if (jaksel.errorReporter.hadError) exit(65);
        if (jaksel.errorReporter.hadRuntimeError) exit(70);
    } catch (err) {
        if (typeof err === 'object' && err !== null && "code" in err && err.code == "ENOENT") {
            console.error(`Error: ${path} doesn't exist.`);
        } else {
            console.error(err);
        }
    }
}

function runPrompt(jaksel: Jaksel) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
    });

    rl.prompt();
    rl.on("line", (text) => {
        jaksel.run(text);
        jaksel.errorReporter.hadError = false;
        rl.prompt();
    });
}

main();