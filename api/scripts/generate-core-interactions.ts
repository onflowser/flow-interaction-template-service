import simpleGit, { SimpleGit } from 'simple-git';
import glob from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from "node:child_process"

// Define the Repository type
type Repository = {
    gitUrl: string;
    interactionPaths: string[];
};

// Define the repositories array
const repos: Repository[] = [
    {
        gitUrl: "https://github.com/onflow/flow-core-contracts",
        interactionPaths: [
            "transactions/accounts/*",
            "transactions/flowToken/*",
            "transactions/randomBeaconHistory/*",
        ],
    },
    {
        gitUrl: "https://github.com/onflow/flow-nft",
        interactionPaths: [
            "transactions/*",
        ],
    },
    {
        gitUrl: "https://github.com/emerald-dao/float",
        interactionPaths: [
            "src/flow/cadence/scripts/*",
            "src/flow/cadence/transactions/*",
        ],
    },
];

async function processCadenceFile(filePath: string): Promise<void> {
    console.log(`Processing: ${filePath}`);

    try {
        const flixTemplate = await flixGenerate(filePath);
        // TODO: Update and write this template to `/templates` folder
        console.log({ flixTemplate });
    } catch (error) {
        console.error(error);
    }
}

function flixGenerate(sourceFilePath: string): Promise<any> {
    const outFilePath = `${sourceFilePath}.flix.json`;
    return new Promise((resolve, reject) => {
        // Expects the latest Cadence preview flow-cli bin in the current directory
        // See: https://github.com/onflow/flow-cli/releases
        const flowProcess = spawn(path.join(__dirname, "./flow-cli"), ["flix", "generate", sourceFilePath, "--save", outFilePath])

        flowProcess.stderr.pipe(process.stderr);

        flowProcess.once("exit", async (code) => {
            if (code != null && code === 0) {
                const fileContent = await fs.readFile(outFilePath, "utf-8");
                resolve(fileContent.toString());
            } else {
                reject(`Failed to process ${sourceFilePath} with code: ${code}`)
            }
        });
    })
}

async function processRepositories(repos: Repository[]): Promise<void> {
    for (const repo of repos) {
        const repoName = new URL(repo.gitUrl).pathname.split('/').slice(-2).join('-');
        const tempDir = path.join(process.cwd(), 'temp', repoName);

        console.log(`Cloning ${repo.gitUrl} into ${tempDir}...`);
        await cloneRepository(repo.gitUrl, tempDir);

        try {
            for (const interactionPath of repo.interactionPaths) {
                const files = await findFiles(tempDir, interactionPath);
                files
                    .filter(file => file.endsWith(".cdc"))
                    .forEach(file => processCadenceFile(file));
            }
        } catch (error) {
            console.error(`Error processing repository ${repo.gitUrl}:`, error);
        } finally {
            await cleanupDirectory(tempDir);
        }
    }
}

async function cloneRepository(gitUrl: string, targetDir: string): Promise<void> {
    const git: SimpleGit = simpleGit();
    await fs.mkdir(targetDir, { recursive: true });
    await git.clone(gitUrl, targetDir);
}

async function findFiles(basePath: string, pattern: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        glob(path.join(basePath, pattern), { nodir: true }, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

async function cleanupDirectory(directory: string): Promise<void> {
    try {
        await fs.rm(directory, { recursive: true, force: true });
        console.log(`Cleaned up ${directory}`);
    } catch (error) {
        console.error(`Error cleaning up directory ${directory}:`, error);
    }
}

processRepositories(repos).catch(error => {
    console.error('Error processing repositories:', error);
});
