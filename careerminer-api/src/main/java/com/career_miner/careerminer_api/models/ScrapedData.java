package com.career_miner.careerminer_api.models;

import java.time.Instant;
import java.util.List;

public record ScrapedData(
    String companyName,
    Instant scrapedAt,
    String searchTerm,
    int totalJobs,
    List<FullJobDetails> jobs
) {
    public record FullJobDetails(
        String jobUrl,
        String jobTitle,
        String description,
        String payRange,
        String location,
        String postingDate,
        String jobId
    ) {}
}
