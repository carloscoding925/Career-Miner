export type FullJobDetails = {
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
    jobs: FullJobDetails[]
}