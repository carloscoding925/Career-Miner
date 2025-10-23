import { FullJobDetails, JobMetaData } from "../models/data-storage.js";

export function createJobDetails(jobUrl: string, metaDetails: JobMetaData): FullJobDetails {
    return {
        jobUrl: jobUrl,
        jobTitle: metaDetails.jobTitle,
        description: metaDetails.description,
        payRange: metaDetails.payRange,
        location: metaDetails.location,
        postingDate: metaDetails.postingDate,
        jobId: metaDetails.jobId
    } as FullJobDetails;
}

export function validateJobDetails(details: FullJobDetails): boolean {
    return Object.values(details).every(value => value !== "" && value !== null && value !== undefined);
}