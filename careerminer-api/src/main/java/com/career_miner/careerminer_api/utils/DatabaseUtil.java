package com.career_miner.careerminer_api.utils;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.zaxxer.hikari.HikariConfig;

public class DatabaseUtil {
    private static final Logger logger = LogManager.getLogger(DatabaseUtil.class);
    
    private DatabaseUtil() {
        HikariConfig config = new HikariConfig();
        logger.info("Initializing Database");
    }
}
