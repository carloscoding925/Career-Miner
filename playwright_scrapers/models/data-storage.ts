export type PostingData = {
    title: string,
    jobUrl: string
}

export type JobMetaDetails = {
    jobTitle: string,
    description: string,
    payRange: string,
    location: string,
    postingDate: string,
    jobId: string
}

export type JobDetails = {
    jobUrl: string,
    jobTitle: string,
    description: string,
    payRange: string,
    location: string,
    postingDate: string,
    jobId: string
}

export type ScrapedData = {
    companyName: string,
    scrapedAt: string,
    searchTerm: string,
    totalJobs: number,
    jobs: JobDetails[]
}