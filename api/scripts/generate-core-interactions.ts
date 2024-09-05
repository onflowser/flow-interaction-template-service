import simpleGit, { SimpleGit } from 'simple-git';
import glob from 'glob';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from "fs";
import { spawn } from "node:child_process"

const cleanupTempFolders = false;

type Repository = {
    gitUrl: string;
    interactionPaths: string[];
};

// Define the repositories array
const repos: Repository[] = [
    {
        gitUrl: "https://github.com/onflow/flow-nft",
        interactionPaths: [
            "transactions/*",
        ],
    },
    {
        gitUrl: "https://github.com/onflow/flow-evm-bridge",
        interactionPaths: [
            "cadence/transactions/bridge/nft/*",
            "cadence/transactions/bridge/onboarding/*",
            "cadence/transactions/bridge/tokens/*",
            "cadence/transactions/evm/*",
            "cadence/transactions/flow-token/*",
        ],
    },
    {
        gitUrl: "https://github.com/onflow/flow-core-contracts",
        interactionPaths: [
            "transactions/accounts/*",
            "transactions/flowToken/*",
            "transactions/randomBeaconHistory/*",
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

async function processCadenceFile(projectPath: string, cdcFilePath: string): Promise<void> {
    try {
        const projectName = projectPath.split("/").at(-1)!;
        const flixFileName = `${cdcFilePath.split("/").at(-1)!.replace(".cdc", "")}.template.json`;
        const flixTemplate = await flixGenerate(projectPath, cdcFilePath);
        console.log(`Succeed processing ${cdcFilePath}:`)
        const flixSubFolderPath = path.join(
            process.cwd(),
            "templates",
            projectName,
        );
        const flixFilePath = path.join(
            flixSubFolderPath,
            flixFileName
        );
        if (!fs.existsSync(flixSubFolderPath)) {
            await fsPromises.mkdir(flixSubFolderPath);
        }
        await fsPromises.writeFile(flixFilePath, flixTemplate);
    } catch (error) {
        console.error(`Failed processing ${cdcFilePath}:`)
        console.error(error);
    }
}

function flixGenerate(projectPath: string, sourceFilePath: string): Promise<any> {
    const outFilePath = `${sourceFilePath}.flix.json`;
    return new Promise((resolve, reject) => {
        const flowProcess = spawn(
            // The Flow CLI binary here must be manually built from source
            // and include this change: https://github.com/onflow/flixkit-go/pull/78
            path.join(__dirname, "./flow-cli"),
            ["flix", "generate", sourceFilePath, "--save", outFilePath],
            {
                cwd: projectPath
            }
        )

        let error = "";
        flowProcess.stderr.on("data", data => error += data.toString());

        flowProcess.once("exit", async (code) => {
            if (code != null && code === 0) {
                const fileContent = await fsPromises.readFile(outFilePath, "utf-8");
                resolve(fileContent.toString());
            } else {
                reject(error);
            }
        });
    })
}

async function processRepositories(repos: Repository[]): Promise<void> {
    for (const repo of repos) {
        const repoName = new URL(repo.gitUrl).pathname.split('/').at(-1)!;
        const tempDir = path.join(process.cwd(), 'temp', repoName);

        if (!fs.existsSync(tempDir)) {
            console.log(`Cloning ${repo.gitUrl} into ${tempDir}...`);
            await cloneRepository(repo.gitUrl, tempDir);
        }

        try {
            for (const interactionPath of repo.interactionPaths) {
                const files = await findFiles(tempDir, interactionPath);
                console.log(files.filter(file => file.endsWith(".cdc")))
                await Promise.all(
                    files
                        .filter(file => file.endsWith(".cdc"))
                        .map(file => processCadenceFile(tempDir, file))
                );
            }
        } catch (error) {
            console.error(`Error processing repository ${repo.gitUrl}:`, error);
        } finally {
            if (cleanupTempFolders) {
                await cleanupDirectory(tempDir);
            }
        }
    }
}

async function cloneRepository(gitUrl: string, targetDir: string): Promise<void> {
    const git: SimpleGit = simpleGit();
    await fsPromises.mkdir(targetDir, { recursive: true });
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
        await fsPromises.rm(directory, { recursive: true, force: true });
        console.log(`Cleaned up ${directory}`);
    } catch (error) {
        console.error(`Error cleaning up directory ${directory}:`, error);
    }
}

processRepositories(repos).catch(error => {
    console.error('Error processing repositories:', error);
});
