export type PostingData = {
    title: string,
    jobUrl: string,
    jobId: string
}

export type JobMetaDetails = {
    jobTitle: string,
    description: string,
    payRange: string
}

export type JobDetails = {
    jobUrl: string,
    jobId: string,
    jobTitle: string,
    description: string,
    payRange: string
}

export type ScrapedData = {
    scrapedAt: string,
    searchTerm: string,
    totalJobs: number,
    jobs: JobDetails[]
}