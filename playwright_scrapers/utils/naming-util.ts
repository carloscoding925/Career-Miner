import path from "path";

export function getFilePrefix(fileName: string): string {
    return path.basename(fileName, '.ts').replace('-scraper', '');
}