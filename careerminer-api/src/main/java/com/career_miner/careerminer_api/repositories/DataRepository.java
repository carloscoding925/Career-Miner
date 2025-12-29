package com.career_miner.careerminer_api.repositories;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Repository;

@Repository
public class DataRepository extends BaseRepository {
    private static final Logger logger = LogManager.getLogger(DataRepository.class);

    public DataRepository() {
        logger.info("Creating Bean");
    }
}
