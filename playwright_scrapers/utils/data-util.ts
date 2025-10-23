import { JobDetails, JobMetaDetails } from "../models/data-storage.js";

export function createJobDetails(jobUrl: string, metaDetails: JobMetaDetails): JobDetails {
    return {
        jobUrl: jobUrl,
        jobTitle: metaDetails.jobTitle,
        description: metaDetails.description,
        payRange: metaDetails.payRange,
        location: metaDetails.location,
        postingDate: metaDetails.postingDate,
        jobId: metaDetails.jobId
    } as JobDetails;
}

export function validateJobDetails(details: JobDetails): boolean {
    return Object.values(details).every(value => value !== "" && value !== null && value !== undefined);
}