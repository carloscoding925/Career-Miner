import fs from "fs";
import path from "path";
import { ScrapedData } from "../models/data-storage.js";
import { BandwidthStats } from "../models/bandwidth.js";

export function deleteOldFiles(outputDir: string, filePrefix: string) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const files: string[] = fs.readdirSync(outputDir);
    const oldFiles: string[] = files.filter(file => file.startsWith(filePrefix) && file.endsWith('.json'));
    oldFiles.forEach(file => {
        fs.unlinkSync(path.join(outputDir, file));
        console.log(`\nDeleted Old File: ${file}`)
    });
}

export function writeNewFile(outputDir: string, filePrefix: string, data: ScrapedData | BandwidthStats) {
    const timestamp: string = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputFile: string = path.join(outputDir, `${filePrefix}-${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 4));
    console.log(`Data saved to: ${outputFile}`);
}