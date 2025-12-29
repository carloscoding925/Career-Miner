import { ScrapedData } from "../models/data-storage.js";

const API_URL: string | null = process.env.API_URL || null;

export async function sendToApi(data: ScrapedData): Promise<void> {
    if (!API_URL) {
        throw new Error("API URL is null");
    }

    try {
        const response: Response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Sample'
            },
            body: JSON.stringify(data)
        });

        if (response.status !== 200) {
            throw new Error(`API responded with status: ${response.status} ${response.statusText}`);
        }

        console.log(`✓ Successfully sent ${data.totalJobs} jobs to API`);
        return;
    } catch (error) {
        console.log(`✗ Failed to send data to API:` + error);
        throw error;
    }
}